/* Update notifications never modify playlist state, drafts or publishing. */
window.M3UUpdates = (() => {
  const node = (id) => document.getElementById(id);
  let current = "",
    available = false,
    busy = false,
    lastPoll = 0,
    noticeTimer;
  function render() {
    node("headerVersion").textContent = current ? "v " + current : "v —";
    node("headerUpdate").hidden = !available;
  }
  function notice(key) {
    const message = node("versionNotice");
    window.M3UI18n.setText(
      message,
      window.M3UI18n.dynamic(() => window.M3UI18n.t(key)),
    );
    message.hidden = false;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => {
      message.hidden = true;
    }, 4000);
  }
  async function check(manual = false) {
    if (
      busy ||
      node("appShell").hidden ||
      (!manual && Date.now() - lastPoll < 3600000)
    )
      return;
    // Automatic polling remains hourly with a daily server cache. Manual checks
    // use an authenticated POST and a short server cooldown to prevent hammering GitHub.
    lastPoll = Date.now();
    busy = true;
    node("headerVersion").disabled = true;
    node("headerVersion").setAttribute("aria-busy", "true");
    try {
      const response = await fetch(
        manual ? "/api/version/check" : "/api/version",
        {
          method: manual ? "POST" : "GET",
          headers: { "X-IPTV-Request": "1" },
          signal: AbortSignal.timeout(12000),
        },
      );
      if (!response.ok) throw Error("Version check failed");
      const data = await response.json();
      if (!/^\d+\.\d+\.\d+$/.test(data.current_version))
        throw Error("Invalid version");
      current = data.current_version;
      // Preserve an existing update indicator if a new request failed.
      if (!data.check_failed || data.update_available === true)
        available = data.update_available === true;
      render();
      if (manual)
        notice(
          data.check_failed
            ? "updateCheckFailed"
            : available
              ? "updateAvailableMeow"
              : "updateLatestMeow",
        );
    } catch {
      if (manual) notice("updateCheckFailed");
    } finally {
      busy = false;
      node("headerVersion").disabled = false;
      node("headerVersion").removeAttribute("aria-busy");
    }
  }
  node("headerVersion").addEventListener("click", () => check(true));
  window.addEventListener("m3u-workspace-ready", () => check());
  window.addEventListener("focus", () => check());
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) check();
  });
  setInterval(() => {
    if (!document.hidden) check();
  }, 3600000);
  render();
  return {
    setCurrentVersion(version) {
      if (/^\d+\.\d+\.\d+$/.test(version || "")) {
        current = version;
        render();
      }
    },
  };
})();
