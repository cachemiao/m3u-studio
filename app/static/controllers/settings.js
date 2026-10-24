/* Settings: explicit context dependencies; no implicit application-state globals. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else (root.M3UStudio ??= {}).createSettings = factory;
})(globalThis, function (ctx) {
  "use strict";
  function openListSettings(listId = ctx.model.selected) {
    if (listId !== ctx.model.selected) {
      ctx.model.selected = listId;
      ctx.model.group = "";
      ctx.render();
    }
    const list = ctx.current();
    if (!list) return;
    ctx.$("#listName").value = list.name;
    ctx.$("#listSlug").value = list.slug || "";
    ctx.$("#listEpg").value = list.epg;
    ctx.$("#listEnabled").checked = list.enabled;
    window.M3UI18n.setText(
      ctx.$("#listId"),
      window.M3UI18n.dynamic(() => ctx.t("m45") + list.id + ctx.t("m46")),
    );
    ctx.$("#listDialog").showModal();
  }
  async function downloadArchive(path, options, filename) {
    const response = await ctx.request(path, {
      ...options,
      headers: {
        "X-IPTV-Request": "1",
        "Accept-Language": window.M3UI18n.locale,
        ...options?.headers,
      },
    });
    if (!response.ok) {
      const data = await response.json();
      throw Error(data.error || ctx.t("archiveFailed"));
    }
    const address = URL.createObjectURL(await response.blob());
    const link = ctx.el("a");
    link.href = address;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(address), 1000);
  }
  return {
    downloadArchive,
    openListSettings,
    install() {
      ctx.$("#settings").onclick = () => {
        ctx.$("#globalEpg").value = ctx.model.state.epg;
        ctx.$("#links").replaceChildren();
        const add = (label, path) => {
          const a = ctx.el("input");
          a.type = "text";
          a.readOnly = true;
          a.value = ctx.model.state.base_url + path;
          window.M3UI18n.setAttribute(a, "aria-label", label);
          const row = ctx.el("div", undefined, "subscription-row"),
            copy = ctx.button(ctx.t("m38"), () =>
              ctx.copySubscription(a.value, copy),
            );
          window.M3UI18n.setAttribute(
            copy,
            "aria-label",
            window.M3UI18n.dynamic(() => ctx.t("m39") + label + ctx.t("m40")),
          );
          row.append(a, copy);
          ctx.$("#links").append(ctx.el("strong", label), row);
        };
        add(ctx.t("m41"), "/tv.m3u");
        add(ctx.t("m42"), "/tv.txt");
        ctx.model.state.lists.forEach((list) => {
          add(
            window.M3UI18n.dynamic(
              () => list.name + ctx.t("m43", { p0: list.channels.length }),
            ),
            list.slug ? `/${list.slug}.m3u` : `/lists/${list.id}/tv.m3u`,
          );
          add(
            window.M3UI18n.dynamic(
              () => list.name + ctx.t("m44", { p0: list.channels.length }),
            ),
            list.slug ? `/${list.slug}.txt` : `/lists/${list.id}/tv.txt`,
          );
        });
        ctx.$("#settingsDialog").showModal();
      };
      ctx.$("#settingsForm").onsubmit = (e) => {
        e.preventDefault();
        ctx.model.state.epg = ctx.$("#globalEpg").value.trim();
        ctx.$("#settingsDialog").close();
        ctx.changed();
      };
      ctx.$("#listForm").onsubmit = (e) => {
        e.preventDefault();
        const slug = ctx.$("#listSlug").value.trim().toLowerCase();
        if (
          slug &&
          (!/^[a-z0-9][a-z0-9_-]{0,23}$/.test(slug) ||
            ["tv", "api", "static", "logo", "lists", "healthz"].includes(slug))
        )
          return ctx.toast(ctx.t("m47"));
        if (
          slug &&
          ctx.model.state.lists.some(
            (list) =>
              list.id !== ctx.model.selected &&
              (list.slug || "").toLowerCase() === slug,
          )
        )
          return ctx.toast(ctx.t("m48"));
        Object.assign(ctx.current(), {
          slug,
          name: ctx.$("#listName").value.trim(),
          epg: ctx.$("#listEpg").value.trim(),
          enabled: ctx.$("#listEnabled").checked,
        });
        ctx.$("#listDialog").close();
        ctx.changed();
      };
      ctx.$("#deleteList").onclick = async () => {
        if (!(await ctx.uiConfirm(ctx.t("m49")))) return;
        ctx.model.state.lists = ctx.model.state.lists.filter(
          (l) => l.id !== ctx.model.selected,
        );
        ctx.model.selected = ctx.model.state.lists[0]?.id;
        ctx.model.group = "";
        ctx.$("#listDialog").close();
        ctx.changed();
      };
      ctx.$("#backup").onclick = () => {
        const blob = new Blob([JSON.stringify(ctx.model.state, null, 2)], {
            type: "application/json",
          }),
          a = ctx.el("a");
        a.href = URL.createObjectURL(blob);
        a.download = "iptv-backup.json";
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        ctx.toast(ctx.t("m50"));
      };
      ctx.$("#restore").onclick = () => ctx.$("#restoreFile").click();
      ctx.$("#backupArchive").onclick = async (event) => {
        const button = event.currentTarget;
        button.disabled = true;
        try {
          await downloadArchive(
            "/api/backup/archive",
            ctx.json("POST", ctx.model.state),
            "m3u-studio-backup.zip",
          );
        } catch (error) {
          ctx.toast(window.M3UI18n.error(error.message));
        } finally {
          button.disabled = false;
        }
      };
      ctx.$("#restoreFile").onchange = async (e) => {
        const button = ctx.$("#restore");
        try {
          const file = e.target.files[0];
          if (!file) return;
          const zipped = file.name.toLowerCase().endsWith(".zip");
          if (file.size > (zipped ? 64 : 8) * 1024 * 1024)
            throw Error(ctx.t("archiveTooLarge"));
          if (
            !(await ctx.uiConfirm(
              ctx.t(zipped ? "archiveRestoreConfirm" : "m52"),
              {
                title: ctx.t("uiConfirmAction"),
                confirmLabel: ctx.t("m125"),
              },
            ))
          )
            return;
          button.disabled = true;
          const owner = ctx.model.workspaceOwner;
          const fingerprint = ctx.core.fingerprint(ctx.model.state);
          const revision = ctx.model.state.revision;
          let raw, report;
          if (zipped) {
            const form = new FormData();
            form.append("file", file);
            report = await ctx.api("/api/backup/restore", {
              method: "POST",
              body: form,
            });
            raw = report.state;
            ctx.model.logoLibrary = null;
          } else {
            raw = await ctx.api(
              "/api/validate",
              ctx.json("POST", JSON.parse(await file.text())),
            );
          }
          if (
            ctx.model.workspaceOwner !== owner ||
            ctx.model.state?.revision !== revision ||
            ctx.core.fingerprint(ctx.model.state) !== fingerprint
          ) {
            ctx.toast(ctx.t("archiveWorkspaceChanged"));
            return;
          }
          ctx.model.state.lists = raw.lists;
          ctx.model.state.epg = raw.epg || "";
          ctx.model.selected = ctx.model.state.lists[0]?.id;
          ctx.model.group = "";
          ctx.$("#preferencesDialog").close();
          ctx.changed();
          if (report)
            ctx.toast(
              ctx.t("archiveRestored", {
                p0: report.imported,
                p1: report.renamed,
                p2: report.missing,
              }),
            );
        } catch (err) {
          ctx.toast(window.M3UI18n.error(err.message));
        } finally {
          button.disabled = false;
          e.target.value = "";
        }
      };
      document
        .querySelectorAll(".close")
        .forEach((b) => (b.onclick = () => b.closest("dialog").close()));
      document
        .querySelectorAll("dialog.fixed-action-dialog")
        .forEach((dialog) =>
          new MutationObserver(() => {
            if (dialog.open)
              dialog.querySelector(".dialog-scroll-body").scrollTop = 0;
          }).observe(dialog, { attributes: true, attributeFilter: ["open"] }),
        );
      ctx.$("#history").onclick = async () => {
        ctx.$("#historyEntries").replaceChildren();
        window.M3UI18n.setText(
          ctx.$("#historyStatus"),
          window.M3UI18n.dynamic(() => ctx.t("m120")),
        );
        ctx.$("#historyDialog").showModal();
        try {
          const data = await ctx.api("/api/history");
          if (!ctx.$("#historyDialog").open) return;
          window.M3UI18n.setText(
            ctx.$("#historyStatus"),
            window.M3UI18n.dynamic(() =>
              ctx.t("m121", { p0: data.revision, p1: data.entries.length }),
            ),
          );
          if (!data.entries.length)
            ctx.$("#historyEntries").append(ctx.el("p", ctx.t("m122"), "hint"));
          data.entries.forEach((entry) => {
            const row = ctx.previewRow(
                window.M3UI18n.dynamic(
                  () =>
                    `v${entry.revision}${entry.revision === data.revision - 1 ? ctx.t("m123") : ""}`,
                ),
                window.M3UI18n.dynamic(() =>
                  ctx.t("m124", {
                    p0: new Date(entry.created_at).toLocaleString(
                      window.M3UI18n.locale,
                    ),
                    p1: entry.lists,
                    p2: entry.channels,
                  }),
                ),
              ),
              restore = ctx.button(ctx.t("m125"), async () => {
                if (
                  !(await ctx.uiConfirm(
                    ctx.t("m127", {
                      p0: entry.revision,
                      p1: ctx.model.dirty ? ctx.t("m126") : "",
                    }),
                    { danger: false, confirmLabel: ctx.t("m125") },
                  ))
                )
                  return;
                restore.disabled = true;
                try {
                  const snapshot = await ctx.api(
                    "/api/history/" + entry.revision,
                  );
                  ctx.model.state.lists = snapshot.state.lists;
                  ctx.model.state.epg = snapshot.state.epg;
                  ctx.model.selected = ctx.model.state.lists[0]?.id;
                  ctx.model.group = "";
                  ctx.model.selectedChannels.clear();
                  ctx.$("#historyDialog").close();
                  ctx.$("#preferencesDialog").close();
                  ctx.changed();
                  ctx.toast(ctx.t("m128", { p0: entry.revision }));
                } catch (err) {
                  ctx.toast(window.M3UI18n.error(err.message));
                } finally {
                  restore.disabled = false;
                }
              });
            row.append(restore);
            ctx.$("#historyEntries").append(row);
          });
        } catch (err) {
          window.M3UI18n.setText(
            ctx.$("#historyStatus"),
            window.M3UI18n.dynamic(() => window.M3UI18n.error(err.message)),
          );
        }
      };
    },
  };
});
