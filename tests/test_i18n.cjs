const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'../app/static');
function boot({browser='zh-CN',saved,blocked=false}={}){
 const listeners={},nodes=[];
 const document={documentElement:{lang:''},title:'',addEventListener(){},querySelectorAll(selector){return nodes.filter(node=>node.selectors?.includes(selector));}};
 const storage=new Map(saved?[['m3u-studio-language',saved]]:[]);
 const window={addEventListener(name,fn){listeners[name]=fn},dispatchEvent(){}};
 const context=vm.createContext({window,document,queueMicrotask,navigator:{languages:[browser]},localStorage:{getItem(key){if(blocked)throw Error('blocked');return storage.get(key)},setItem(key,value){if(blocked)throw Error('blocked');storage.set(key,value)}},Event:class{constructor(type){this.type=type}}});
 for(const file of ['translations.js','i18n.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
 return {i18n:window.M3UI18n,messages:window.M3UTranslations,document,nodes,listeners,storage};
}
const node=()=>({textContent:'',value:'草稿',isConnected:true,attributes:{},setAttribute(key,value){this.attributes[key]=value},getAttribute(key){return this.attributes[key]}});
test('browser language, saved preference and unavailable storage',()=>{
 assert.equal(boot().i18n.language,'zh');assert.equal(boot({browser:'en-US'}).i18n.language,'en');
 assert.equal(boot({browser:'zh-CN',saved:'en'}).i18n.language,'en');
 assert.equal(boot({browser:'en',saved:'invalid'}).i18n.language,'en');
 const {i18n}=boot({blocked:true});i18n.setLanguage('en');assert.equal(i18n.language,'en');i18n.setLanguage('invalid');assert.equal(i18n.language,'en');
});
test('every translated message preserves all placeholders and page keys exist',()=>{
 const {messages}=boot();
 for(const [key,row] of Object.entries(messages)){
  assert.ok(row.zh&&row.en,key);assert.ok(!/\p{Script=Han}/u.test(row.en),key);
  const params=value=>Array.from(value.matchAll(/\{p\d+\}/g),m=>m[0]).sort();
  assert.deepEqual(params(row.zh),params(row.en),key);
 }
 for(const file of ['index.html','app.js','theme.js']){
  const text=fs.readFileSync(path.join(root,file),'utf8');
  for(const match of text.matchAll(/(?:data-i18n(?:-[\w-]+)?="|\bt\(['"])(m\d+)/g))assert.ok(messages[match[1]],file+':'+match[1]);
 }
});
test('switch updates live text, attributes and static labels, preserving form and user data',()=>{
 const {i18n,messages,document,nodes,storage}=boot();
 const key=Object.keys(messages).find(key=>messages[key].zh==='有未保存更改');
 const bound=node(),user=node(),staticLabel=node(),select=node();
 staticLabel.dataset={i18n:key};staticLabel.selectors=['[data-i18n]'];select.selectors=['[data-language-select]'];nodes.push(staticLabel,select);
 i18n.setAttribute(bound,'title',i18n.t(key));i18n.setText(bound,i18n.dynamic(()=>i18n.t(key)+' · 2'));
 i18n.setText(user,'内蒙古联通');i18n.setLanguage('en');
 assert.equal(bound.textContent,'Unsaved changes · 2');assert.equal(bound.attributes.title,'Unsaved changes');assert.equal(staticLabel.textContent,'Unsaved changes');
 assert.equal(user.textContent,'内蒙古联通');assert.equal(bound.value,'草稿');assert.equal(select.value,'en');assert.equal(document.documentElement.lang,'en');assert.equal(storage.get('m3u-studio-language'),'en');
 i18n.setLanguage('zh');assert.equal(bound.textContent,'有未保存更改 · 2');
 bound.isConnected=false;i18n.setLanguage('en');assert.equal(bound.textContent,'有未保存更改 · 2');
});
test('API errors, user suffixes and cross-tab language updates',()=>{
 const {i18n,listeners}=boot();
 const exact=i18n.error('请求失败'),prefix=i18n.error('链接格式无效：http://测试'),unknown=i18n.error('用户自定义文本');
 i18n.setLanguage('en');assert.equal(String(exact),'Request failed');assert.ok(String(prefix).endsWith('http://测试'));assert.ok(!String(prefix).startsWith('链接'));assert.equal(unknown,'用户自定义文本');
 listeners.storage({key:'m3u-studio-language',newValue:'zh'});assert.equal(String(exact),'请求失败');
 listeners.storage({key:'other',newValue:'en'});assert.equal(i18n.language,'zh');
});
