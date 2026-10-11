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
    const select = document.getElementById('themePreference');
    if (select) select.value = preference;
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
    document.getElementById('themePreference').addEventListener('change', event => setPreference(event.target.value));
    apply();
  });
})();
