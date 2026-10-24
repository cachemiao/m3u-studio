/* SourceChecks: explicit context dependencies; no implicit application-state globals. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else (root.M3UStudio ??= {}).createSourceChecks = factory;
})(globalThis, function (ctx) {
  "use strict";
  const sourceResultKey = (listId, ch) =>
    JSON.stringify([listId, ch.id, ch.url]);
  const sourceItem = (listId, ch) => ({
    listId,
    id: ch.id,
    name: ch.name,
    url: ch.url,
    key: sourceResultKey(listId, ch),
  });
  const sourceDisplayResult = (key) =>
    ctx.model.sourceSingleRuns.has(key)
      ? { status: "checking" }
      : ctx.model.sourceCheckResults.get(key);
  function sourceBadge(result, item = null) {
    result = result || { status: "idle" };
    const text = result.blocked ? ctx.t("uiSourceBlocked") :
      result.status === "idle"
        ? "—"
        : result.status === "ok"
          ? `${result.ms}ms`
          : ctx.t(
              {
                checking: "m341",
                timeout: "m332",
                unavailable: "m333",
                unsupported: "m334",
              }[result.status] || "m333",
            );
    const badge = item
      ? ctx.button(text, () => checkSingleSource(item))
      : ctx.el("span", text);
    badge.className =
      "source-latency " +
      M3USourceCheck.color(result) +
      (result.status === "idle" ? " source-idle" : "");
    if (item) {
      badge.disabled =
        !!ctx.model.sourceRun ||
        ctx.model.sourceSingleRuns.has(item.key) ||
        ctx.model.sourceSingleRuns.size >= 4;
      window.M3UI18n.setAttribute(
        badge,
        "title",
        window.M3UI18n.dynamic(() => result.blocked ? ctx.t("uiSourceBlockedHint") : ctx.t("m343", { p0: item.name })),
      );
      window.M3UI18n.setAttribute(
        badge,
        "aria-label",
        window.M3UI18n.dynamic(() => result.blocked ? ctx.t("uiSourceBlockedHint") : ctx.t("m343", { p0: item.name })),
      );
    }
    return badge;
  }
  async function checkSingleSource(item) {
    if (ctx.model.sourceRun || ctx.model.sourceSingleRuns.has(item.key)) return;
    if (ctx.model.sourceSingleRuns.size >= 4) return ctx.toast(ctx.t("m344"));
    const controller = new AbortController();
    ctx.model.sourceSingleRuns.set(item.key, controller);
    ctx.model.sourceCheckResults.delete(item.key);
    updateSourceBadges();
    ctx.updateSelection();
    try {
      const result = await probeSource(item, controller.signal);
      if (!controller.signal.aborted)
        ctx.model.sourceCheckResults.set(item.key, result);
    } catch {
      if (!controller.signal.aborted)
        ctx.model.sourceCheckResults.set(item.key, { status: "unavailable" });
    } finally {
      if (ctx.model.sourceSingleRuns.get(item.key) === controller)
        ctx.model.sourceSingleRuns.delete(item.key);
      updateSourceBadges();
      ctx.updateSelection();
    }
  }
  function stopSingleChecks() {
    for (const controller of ctx.model.sourceSingleRuns.values())
      controller.abort();
    ctx.model.sourceSingleRuns.clear();
  }
  function updateSourceBadges() {
    const channels = new Map(
      (ctx.current()?.channels || []).map((ch) => [ch.id, ch]),
    );
    for (const row of ctx.$("#channels").children) {
      const cell = row.querySelector(".channel-status"),
        ch = channels.get(row.dataset.id);
      if (!cell || !ch) continue;
      const result = sourceDisplayResult(
        sourceResultKey(ctx.model.selected, ch),
      );
      cell.replaceChildren(
        sourceBadge(result, sourceItem(ctx.model.selected, ch)),
      );
    }
  }
  function renderSourceResults() {
    ctx.$("#sourceCheckResults").replaceChildren();
    let failures = 0;
    for (const item of ctx.model.sourceItems) {
      const result = ctx.model.sourceCheckResults.get(item.key);
      if (result && M3USourceCheck.failed(result)) failures++;
      if (
        ctx.$("#sourceCheckFailed").checked &&
        (!result || !M3USourceCheck.failed(result))
      )
        continue;
      const row = ctx.el("div", undefined, "source-check-row");
      row.append(
        ctx.el("span", item.name),
        result
          ? sourceBadge(result)
          : ctx.el(
              "span",
              ctx.model.sourceCancelled ? ctx.t("m335") : ctx.t("m336"),
              "muted",
            ),
      );
      ctx.$("#sourceCheckResults").append(row);
    }
    ctx.$("#sourceCheckProgress").max = Math.max(1, ctx.model.sourceTotal);
    ctx.$("#sourceCheckProgress").value = ctx.model.sourceDone;
    window.M3UI18n.setText(
      ctx.$("#sourceCheckStatus"),
      window.M3UI18n.dynamic(() =>
        ctx.t(
          !ctx.model.sourceStarted
            ? "m346"
            : ctx.model.sourceRun
              ? "m337"
              : ctx.model.sourceCancelled
                ? "m338"
                : "m339",
          { p0: ctx.model.sourceDone, p1: ctx.model.sourceTotal, p2: failures },
        ),
      ),
    );
    window.M3UI18n.setText(
      ctx.$("#sourceCheckAgain"),
      window.M3UI18n.dynamic(() =>
        ctx.t(ctx.model.sourceStarted ? "m342" : "m345"),
      ),
    );
    ctx.$("#sourceCheckAgain").disabled =
      !!ctx.model.sourceRun || !ctx.model.sourceItems.length;
    ctx.$("#sourceCheckRetry").disabled =
      !ctx.model.sourceStarted || !!ctx.model.sourceRun || !failures;
    ctx.$("#sourceCheckCancel").disabled = !ctx.model.sourceRun;
  }
  async function probeSource(item, signal) {
    while (!signal.aborted) {
      const response = await ctx.request("/api/source-check", {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json", "X-IPTV-Request": "1" },
        body: JSON.stringify({ url: item.url }),
      });
      if (response.status === 429) {
        await new Promise((resolve) => {
          const timer = setTimeout(done, 250);
          function done() {
            clearTimeout(timer);
            signal.removeEventListener("abort", done);
            resolve();
          }
          signal.addEventListener("abort", done, { once: true });
        });
        continue;
      }
      if (response.status === 401) {
        stopSourceCheck();
        ctx.showAuth(false);
        return { status: "unavailable" };
      }
      if (!response.ok) return { status: "unavailable" };
      return response.json();
    }
    throw new DOMException("Cancelled", "AbortError");
  }
  async function runSourceCheck(items) {
    if (ctx.model.sourceRun || ctx.model.sourceSingleRuns.size) return;
    const controller = new AbortController();
    ctx.model.sourceRun = controller;
    ctx.model.sourceStarted = true;
    ctx.model.sourceCancelled = false;
    ctx.model.sourceDone = 0;
    ctx.model.sourceTotal = items.length;
    for (const item of items) ctx.model.sourceCheckResults.delete(item.key);
    renderSourceResults();
    ctx.render();
    try {
      await M3USourceCheck.run(
        items,
        probeSource,
        (item, result) => {
          ctx.model.sourceCheckResults.set(item.key, result);
          ctx.model.sourceDone++;
          renderSourceResults();
          updateSourceBadges();
        },
        controller.signal,
      );
    } finally {
      if (ctx.model.sourceRun === controller) {
        ctx.model.sourceRun = null;
        renderSourceResults();
        ctx.render();
      }
    }
  }
  function stopSourceCheck() {
    if (ctx.model.sourceRun) {
      ctx.model.sourceCancelled = true;
      ctx.model.sourceRun.abort();
      renderSourceResults();
    }
  }
  return {
    sourceResultKey,
    sourceItem,
    sourceDisplayResult,
    sourceBadge,
    checkSingleSource,
    stopSingleChecks,
    updateSourceBadges,
    renderSourceResults,
    probeSource,
    runSourceCheck,
    stopSourceCheck,
    install() {
      ctx.$("#checkSources").onclick = () => {
        if (ctx.model.sourceRun) {
          ctx.$("#sourceCheckDialog").showModal();
          return;
        }
        const list = ctx.current();
        if (!list) return;
        const ids = ctx.model.selectedChannels.size
          ? new Set(ctx.model.selectedChannels)
          : null;
        ctx.model.sourceItems = list.channels
          .filter((ch) => !ids || ids.has(ch.id))
          .map((ch) => ctx.sourceItem(list.id, ch));
        ctx.$("#sourceCheckFailed").checked = false;
        window.M3UI18n.setText(
          ctx.$("#sourceCheckScope"),
          window.M3UI18n.dynamic(() =>
            ctx.t("m340", { p0: list.name, p1: ctx.model.sourceItems.length }),
          ),
        );
        ctx.model.sourceStarted = false;
        ctx.model.sourceCancelled = false;
        ctx.model.sourceDone = 0;
        ctx.model.sourceTotal = ctx.model.sourceItems.length;
        ctx.renderSourceResults();
        ctx.$("#sourceCheckDialog").showModal();
      };
      ctx.$("#sourceCheckAgain").onclick = () => {
        ctx.$("#sourceCheckFailed").checked = false;
        ctx.runSourceCheck(ctx.model.sourceItems);
      };
      ctx.$("#sourceCheckCancel").onclick = ctx.stopSourceCheck;
      ctx
        .$("#sourceCheckDialog")
        .addEventListener("close", ctx.stopSourceCheck);
      ctx.$("#sourceCheckFailed").onchange = ctx.renderSourceResults;
      ctx.$("#sourceCheckRetry").onclick = () =>
        ctx.runSourceCheck(
          ctx.model.sourceItems.filter((item) =>
            M3USourceCheck.failed(
              ctx.model.sourceCheckResults.get(item.key) || {},
            ),
          ),
        );
      window.addEventListener("m3u-language-change", () => {
        if (ctx.$("#sourceCheckDialog").open) ctx.renderSourceResults();
      });
    },
  };
});
