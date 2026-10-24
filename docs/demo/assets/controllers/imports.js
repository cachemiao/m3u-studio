/* Imports: explicit context dependencies; no implicit application-state globals. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else (root.M3UStudio ??= {}).createImports = factory;
})(globalThis, function (ctx) {
  "use strict";
  function openImport(create = false) {
    ctx.model.importContext = {
      create,
      listId: ctx.model.selected,
      fingerprint: ctx.core.fingerprint(ctx.model.state),
    };
    ctx.$("#importForm").reset();
    ctx.$("#playlistUrl").value = "";
    ctx.$("#importForm button.primary").disabled = false;
    ctx.$("#importListNameLabel").hidden = !create;
    ctx.$("#importListName").disabled = !create;
    ctx.$("#importListName").required = create;
    const name = ctx.current()?.name || "";
    window.M3UI18n.setText(
      ctx.$("#importTitle"),
      window.M3UI18n.dynamic(() =>
        create ? ctx.t("m376") : ctx.t("m379", { p0: name }),
      ),
    );
    updateImportScope();
    setImportMode("url");
    ctx.$("#playlistFileName").textContent = "";
    ctx.$("#importDialog").showModal();
  }
  function updateImportScope() {
    window.M3UI18n.setText(
      ctx.$("#importScope"),
      window.M3UI18n.dynamic(() =>
        ctx.t(ctx.model.importContext?.create ? "m380" : "m382"),
      ),
    );
  }
  function showImportReport(report) {
    window.M3UI18n.setText(
      ctx.$("#importReportSummary"),
      window.M3UI18n.dynamic(() =>
        ctx.t("m350", {
          p0: report.imported,
          p1: report.repaired,
          p2: report.skipped,
        }),
      ),
    );
    ctx.$("#importReportDetails").replaceChildren();
    for (const issue of report.issues) {
      const row = ctx.el("div", undefined, "preview-row");
      window.M3UI18n.setText(
        row,
        window.M3UI18n.dynamic(() =>
          ctx.t("m351", {
            p0: issue.line,
            p1: issue.name || "—",
            p2: ctx.t(issue.action === "skipped" ? "m352" : "m353"),
            p3: issue.reason,
          }),
        ),
      );
      ctx.$("#importReportDetails").append(row);
    }
    if (report.omitted)
      ctx
        .$("#importReportDetails")
        .append(ctx.el("p", ctx.t("m354", { p0: report.omitted }), "hint"));
    ctx.$("#importReportDialog").showModal();
  }
  function importInputFingerprint() {
    const file = ctx.$("#playlistFile").files[0];
    return JSON.stringify({
      name: ctx.$("#importListName").value,
      text: ctx.$("#playlistText").value,
      url: ctx.$("#playlistUrl").value,
      file: file ? [file.name, file.size, file.lastModified] : null,
    });
  }
  function setImportMode(mode) {
    const modes = ["url", "file", "paste"];
    for (const name of modes) {
      const active = name === mode,
        tab = ctx.$("#importTab-" + name);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      ctx.$("#importPanel-" + name).hidden = !active;
    }
    ctx.$("#playlistUrl").required = mode === "url";
    if (mode !== "url") ctx.$("#playlistUrl").value = "";
  }
  const playlistDrop = ctx.$("#playlistDrop");
  return {
    openImport,
    updateImportScope,
    showImportReport,
    importInputFingerprint,
    setImportMode,
    install() {
      ctx.$("#import").onclick = () => ctx.openImport();
      ctx.$("#importNewList").onclick = () => ctx.openImport(true);
      ctx.$("#playlistFile").onchange = async (e) => {
        const file = e.target.files[0],
          context = ctx.model.importContext;
        if (file) {
          const text = await file.text();
          if (
            context === ctx.model.importContext &&
            e.target.files[0] === file
          ) {
            ctx.$("#playlistText").value = text;
            ctx.$("#playlistUrl").value = "";
          }
        }
      };
      ctx.$("#importForm").onsubmit = async (e) => {
        e.preventDefault();
        const submit = ctx.$("#importForm button.primary"),
          context = ctx.model.importContext,
          input = ctx.importInputFingerprint();
        submit.disabled = true;
        try {
          const options = {
            create: context.create,
            listId: context.listId,
            id: context.create ? ctx.uid() : undefined,
            name: ctx.$("#importListName").value,
          };
          const link = ctx.$("#playlistUrl").value.trim();
          const parsed = await ctx.api(
            link ? "/api/import/url" : "/api/import",
            ctx.json(
              "POST",
              link ? { url: link } : { text: ctx.$("#playlistText").value },
            ),
          );
          if (
            !ctx.$("#importDialog").open ||
            ctx.model.importContext !== context
          )
            return;
          if (
            ctx.core.fingerprint(ctx.model.state) !== context.fingerprint ||
            ctx.importInputFingerprint() !== input
          )
            throw Error(ctx.t("m383"));
          if (parsed.channels.length) {
            const result = ctx.core.importChannels(
                ctx.model.state,
                parsed,
                options,
              ),
              checked = await ctx.api(
                "/api/validate",
                ctx.json("POST", result.draft),
              );
            if (
              !ctx.$("#importDialog").open ||
              ctx.model.importContext !== context
            )
              return;
            if (
              ctx.core.fingerprint(ctx.model.state) !== context.fingerprint ||
              ctx.importInputFingerprint() !== input
            )
              throw Error(ctx.t("m383"));
            ctx.model.state.lists = checked.lists;
            ctx.model.state.epg = checked.epg;
            ctx.model.selected = result.listId;
            ctx.model.group = "";
            ctx.changed();
          }
          ctx.$("#importDialog").close();
          if (
            parsed.report &&
            (parsed.report.issues.length || parsed.report.skipped)
          )
            ctx.showImportReport(parsed.report);
          else ctx.toast(ctx.t("m36", { p0: parsed.channels.length }));
        } catch (err) {
          if (ctx.model.importContext === context)
            ctx.toast(window.M3UI18n.error(err.message));
        } finally {
          if (ctx.model.importContext === context) submit.disabled = false;
        }
      };
      for (const tab of document.querySelectorAll("[data-import-mode]")) {
        tab.onclick = () => ctx.setImportMode(tab.dataset.importMode);
        tab.onkeydown = (e) => {
          const modes = ["url", "file", "paste"],
            index = modes.indexOf(tab.dataset.importMode);
          let next;
          if (e.key === "ArrowRight") next = (index + 1) % 3;
          else if (e.key === "ArrowLeft") next = (index + 2) % 3;
          else if (e.key === "Home") next = 0;
          else if (e.key === "End") next = 2;
          else return;
          e.preventDefault();
          ctx.setImportMode(modes[next]);
          ctx.$("#importTab-" + modes[next]).focus();
        };
      }
      playlistDrop.onclick = () => ctx.$("#playlistFile").click();
      playlistDrop.ondragover = (e) => {
        e.preventDefault();
        playlistDrop.classList.add("is-dragover");
      };
      playlistDrop.ondragleave = () =>
        playlistDrop.classList.remove("is-dragover");
      playlistDrop.ondrop = (e) => {
        e.preventDefault();
        playlistDrop.classList.remove("is-dragover");
        const file = e.dataTransfer.files[0];
        if (!file) return;
        const transfer = new DataTransfer();
        transfer.items.add(file);
        ctx.$("#playlistFile").files = transfer.files;
        ctx
          .$("#playlistFile")
          .dispatchEvent(new Event("change", { bubbles: true }));
      };
      ctx.$("#playlistFile").addEventListener("change", () => {
        ctx.$("#playlistFileName").textContent =
          ctx.$("#playlistFile").files[0]?.name || "";
      });
    },
  };
});
