/* Apply before CSS to avoid a light flash when a dark preference is saved. */
(() => {
  'use strict';
  const key = 'alicetv-theme';
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const valid = value => ['light', 'dark', 'system'].includes(value);
  let preference = 'dark';
  try { const saved = localStorage.getItem(key); if (valid(saved)) preference = saved; } catch {}
  function apply() {
    const dark = preference === 'dark' || (preference === 'system' && media.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.querySelectorAll('[data-theme-icon]').forEach(icon=>icon.toggleAttribute('hidden',icon.dataset.themeIcon!==(dark?'dark':'light')));
    document.querySelectorAll('[data-theme-choice]').forEach(node=>node.setAttribute('aria-checked',String(node.dataset.themeChoice===preference)));
  }
  function setPreference(value) {
    if (!valid(value)) return;
    preference = value;
    try { localStorage.setItem(key, value); } catch {}
    apply();
  }
  window.addEventListener('m3u-language-change',apply);
  apply();
  media.addEventListener('change', () => { if (preference === 'system') apply(); });
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    preference = valid(event.newValue) ? event.newValue : 'dark';
    apply();
  });
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-theme-choice]').forEach(node=>node.addEventListener('click',()=>setPreference(node.dataset.themeChoice)));
    apply();
  });
})();

/* Accent colors are browser preferences, independent of channel drafts. */
(() => {
 'use strict';
 const key='m3u-studio-accent';
 const colors=['purple','pink','blue','yellow','green','cyan'];
 const valid=value=>colors.includes(value);
 let preference='pink';
 try { const saved=localStorage.getItem(key); if(valid(saved))preference=saved; } catch {}
 function apply(){
  document.documentElement.dataset.accent=preference;
  document.querySelectorAll('[data-accent-choice]').forEach(node=>node.setAttribute('aria-checked',String(node.dataset.accentChoice===preference)));

 }
 function set(value){if(!valid(value))return;preference=value;try{localStorage.setItem(key,value)}catch{}apply();}
 apply();
 window.addEventListener('storage',event=>{if(event.key!==key&&event.key!==null)return;preference=valid(event.newValue)?event.newValue:'pink';apply();});
 document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('[data-accent-choice]').forEach(node=>node.addEventListener('click',()=>set(node.dataset.accentChoice)));
  document.querySelector('#appearanceSettings').addEventListener('click',()=>document.querySelector('#appearanceDialog').showModal());
  document.querySelector('#appearanceDone').addEventListener('click',()=>document.querySelector('#appearanceDialog').close());
  document.querySelector('#resetAccent').addEventListener('click',()=>set('pink'));
  document.querySelectorAll('#appearanceDialog [role="radiogroup"]').forEach(group=>group.addEventListener('keydown',event=>{
   const items=[...group.querySelectorAll('[role="radio"]')],index=items.indexOf(document.activeElement);let next;
   if(['ArrowRight','ArrowDown'].includes(event.key))next=(index+1)%items.length;
   if(['ArrowLeft','ArrowUp'].includes(event.key))next=(index+items.length-1)%items.length;
   if(event.key==='Home')next=0;if(event.key==='End')next=items.length-1;
   if(next!==undefined){event.preventDefault();items[next].focus();items[next].click();}
  }));
  apply();
 });
})();
