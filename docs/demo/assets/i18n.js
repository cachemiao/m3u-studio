/* Language belongs to this browser, never to playlist data. */
window.M3UI18n = (() => {
  'use strict';
  const messages = window.M3UTranslations;
  const storageKey = 'm3u-studio-language';
  const valid = value => value === 'zh' || value === 'en';
  const preferred = () => (navigator.languages?.[0] || navigator.language || 'en').toLowerCase().startsWith('zh') ? 'zh' : 'en';
  let language = preferred();
  try { const saved = localStorage.getItem(storageKey); if (valid(saved)) language = saved; } catch {}
  const bindings = new Map();
  let cleanupQueued=false;
  function cleanupBindings() {
    if(cleanupQueued)return;
    cleanupQueued=true;
    queueMicrotask(()=>{
      cleanupQueued=false;
      for(const node of bindings.keys())if(!node.isConnected)bindings.delete(node);
    });
  }
  const sourceKeys = new Map(Object.entries(messages).flatMap(([key,value])=>[[value.zh,key],[value.en,key]]));
  class Message {
    constructor(key, params={}) { this.key=key; this.params=params; }
    toString() {
      const row=messages[this.key];
      const value=row?.[language] ?? row?.zh ?? this.key;
      return value.replace(/\{(p\d+)\}/g, (match,key)=>Object.hasOwn(this.params,key)?String(this.params[key]):match);
    }
    [Symbol.toPrimitive]() { return this.toString(); }
  }
  class LiveMessage extends Message {
    constructor(read) { super(''); this.read=read; }
    toString() { return String(this.read()); }
  }
  const dynamic = read => new LiveMessage(read);
  const t = (key,params) => new Message(key,params);
  function setText(node, value) {
    const old=bindings.get(node)||{};
    if(value instanceof Message) old.value=value; else delete old.value;
    if(old.value || Object.keys(old.attributes||{}).length)bindings.set(node,old);else bindings.delete(node);
    node.textContent = String(value ?? '');
    cleanupBindings();
  }
  function setAttribute(node, name, value) {
    const old=bindings.get(node)||{};
    old.attributes ||= {};
    if(value instanceof Message) old.attributes[name]=value; else delete old.attributes[name];
    bindings.set(node,old); node.setAttribute(name,String(value));cleanupBindings();
  }
  function error(value) {
    const text=String(value);
    if(sourceKeys.has(text)) return t(sourceKeys.get(text));
    for(const prefix of ['链接格式无效：','无法解析此行：']) if(text.startsWith(prefix)) {
      const translated=t(sourceKeys.get(prefix));
      return dynamic(()=>String(translated)+text.slice(prefix.length));
    }
    return text;
  }
  function apply() {
    document.documentElement.lang=language==='zh'?'zh-CN':'en';
    document.title=language==='zh'?'M3U Studio · 频道编辑器':'M3U Studio · Channel Editor';
    document.querySelectorAll('[data-i18n]').forEach(node=>node.textContent=String(t(node.dataset.i18n)));
    for(const name of ['placeholder','aria-label','title']) document.querySelectorAll(`[data-i18n-${name}]`).forEach(node=>node.setAttribute(name,String(t(node.getAttribute(`data-i18n-${name}`)))));
    for(const [node,binding] of bindings) {
      if(!node.isConnected){bindings.delete(node);continue;}
      if(binding.value)node.textContent=String(binding.value);
      for(const [name,value] of Object.entries(binding.attributes||{}))node.setAttribute(name,String(value));
    }
    document.querySelectorAll('[data-language-select]').forEach(node=>node.value=language);
    document.querySelectorAll('[data-language-choice]').forEach(node=>node.setAttribute('aria-checked',String(node.dataset.languageChoice===language)));
  }
  function setLanguage(value) {
    if(!valid(value))return;
    language=value;try{localStorage.setItem(storageKey,value)}catch{}
    apply();window.dispatchEvent(new Event('m3u-language-change'));
  }
  document.documentElement.lang=language==='zh'?'zh-CN':'en';
  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('[data-language-select]').forEach(node=>node.addEventListener('change',event=>setLanguage(event.target.value)));
    document.querySelectorAll('[data-language-choice]').forEach(node=>node.addEventListener('click',()=>setLanguage(node.dataset.languageChoice)));
    apply();
  });
  window.addEventListener('storage',event=>{
    if(event.key!==storageKey && event.key!==null)return;
    language=valid(event.newValue)?event.newValue:preferred();apply();window.dispatchEvent(new Event('m3u-language-change'));
  });
  return {t,dynamic,setText,setAttribute,error,apply,setLanguage,get language(){return language},get locale(){return language==='zh'?'zh-CN':'en'}};
})();
const t = window.M3UI18n.t;
