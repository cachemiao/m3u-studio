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
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
      toggle.textContent = dark ? '☀ 浅色' : '☾ 暗色';
      toggle.setAttribute('aria-label', dark ? '切换为浅色主题' : '切换为暗色主题');
      toggle.title = '切换主题；可在设置中选择跟随系统';
    }
  }
  function setPreference(value) {
    if (!valid(value)) return;
    preference = value;
    try { localStorage.setItem(key, value); } catch {}
    apply();
  }
  apply();
  media.addEventListener('change', () => { if (preference === 'system') apply(); });
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    preference = valid(event.newValue) ? event.newValue : 'dark';
    apply();
  });
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('themeToggle').addEventListener('click', () => {
      setPreference(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    });
    document.getElementById('themePreference').addEventListener('change', event => setPreference(event.target.value));
    apply();
  });
})();
