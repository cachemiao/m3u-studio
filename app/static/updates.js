/* Update notifications never modify playlist state, drafts or publishing. */
window.M3UUpdates = (() => {
  const node = id => document.getElementById(id);
  let current = '', available = false, busy = false, lastPoll = 0;
  function render() {
    node('headerVersion').textContent = current ? 'v ' + current : 'v —';
    node('headerUpdate').hidden = !available;
  }
  async function check() {
    if (busy || node('appShell').hidden || Date.now() - lastPoll < 3600000) return;
    // This local cache read runs hourly; the server queries GitHub at most once a day.
    lastPoll = Date.now(); busy = true;
    try {
      const response = await fetch('/api/version', {signal: AbortSignal.timeout(12000)});
      if (!response.ok) return;
      const data = await response.json();
      if (!/^\d+\.\d+\.\d+$/.test(data.current_version)) return;
      current = data.current_version;
      available = data.update_available === true;
      render();
    } catch {
      // Keep the previous indicator when offline, without interrupting the editor.
    } finally {
      busy = false;
    }
  }
  window.addEventListener('m3u-workspace-ready', check);
  window.addEventListener('focus', check);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  setInterval(() => { if (!document.hidden) check(); }, 3600000);
  render();
  return {setCurrentVersion(version) {
    if (/^\d+\.\d+\.\d+$/.test(version || '')) { current = version; render(); }
  }};
})();
