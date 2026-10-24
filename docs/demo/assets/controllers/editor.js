/* Editor: explicit context dependencies; no implicit application-state globals. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else (root.M3UStudio ??= {}).createEditor = factory;
})(globalThis, function (ctx) {
  "use strict";
  function openEditor(ch) {
    const list = ctx.current();
    if (!list.groups.length) return ctx.toast(ctx.t("m26"));
    ctx.model.editing = ch?.id || null;
    window.M3UI18n.setText(
      ctx.$("#editorTitle"),
      window.M3UI18n.dynamic(() => (ch ? ctx.t("m27") : ctx.t("m28"))),
    );
    const form = ctx.$("#channelForm");
    form.reset();
    form.elements.group.replaceChildren(
      ...list.groups.map((g) => {
        const o = ctx.el("option", g);
        o.value = g;
        return o;
      }),
    );
    const values = ch || {
      group: ctx.model.group || list.groups[0],
      days: 7,
      catchup: "default",
    };
    for (const key of [
      "name",
      "group",
      "logo",
      "url",
      "fcc_url",
      "catchup_url",
      "catchup",
      "days",
      "epg_id",
      "epg",
    ])
      form.elements[key].value = values[key] ?? "";
    ctx.$("#editor").showModal();
  }
  return {
    openEditor,
    install() {
      ctx.$("#channelForm").onsubmit = (e) => {
        e.preventDefault();
        const ch = Object.fromEntries(new FormData(e.target));
        if (!ctx.isLogoAllowed(ch.logo)) {
          ctx.toast(ctx.t("demoLogoOnly"));
          return;
        }
        ch.id = ctx.model.editing || ctx.uid();
        ch.days = Number(ch.days);
        const list = ctx.current();
        if (ctx.model.editing)
          list.channels[
            list.channels.findIndex((c) => c.id === ctx.model.editing)
          ] = ch;
        else list.channels.push(ch);
        ctx.$("#editor").close();
        ctx.changed();
      };
      ctx.$("#newEmptyList").onclick = async () => {
        const name = await ctx.uiPrompt({
          title: ctx.t("uiNewList"),
          label: ctx.t("m29"),
          confirmLabel: ctx.t("uiCreate"),
          validate: (value) => (!value.trim() ? ctx.t("uiNameRequired") : null),
        });
        if (!name?.trim()) return;
        const list = {
          id: ctx.uid(),
          name: name.trim(),
          enabled: true,
          epg: "",
          groups: [String(ctx.t("m30")), String(ctx.t("m31"))],
          channels: [],
        };
        ctx.model.state.lists.push(list);
        ctx.model.selected = list.id;
        ctx.model.group = "";
        ctx.changed();
      };
      ctx.$("#newGroup").onclick = async () => {
        const list = ctx.current();
        if (!list) return;
        const name = await ctx.uiPrompt({
          title: ctx.t("uiNewGroup"),
          label: ctx.t("uiGroupName"),
          confirmLabel: ctx.t("uiCreate"),
          validate: (value) =>
            !value.trim()
              ? ctx.t("uiNameRequired")
              : list.groups.includes(value.trim())
                ? ctx.t("m6")
                : null,
        });
        if (name === null) return;
        list.groups.push(name);
        ctx.changed();
      };
      ctx.$("#add").onclick = () => ctx.openEditor();
      ctx.$("#search").oninput = ctx.render;
      ctx.$("#search").addEventListener("focus", () => {
        const node = ctx.$("#search");
        node.dataset.i18nPlaceholder = "uiSearchHint";
        window.M3UI18n.setAttribute(
          node,
          "placeholder",
          window.M3UI18n.dynamic(() => ctx.t("uiSearchHint")),
        );
      });
      ctx.$("#search").addEventListener("blur", () => {
        const node = ctx.$("#search");
        node.dataset.i18nPlaceholder = "uiSearchCompact";
        window.M3UI18n.setAttribute(
          node,
          "placeholder",
          window.M3UI18n.dynamic(() => ctx.t("uiSearchCompact")),
        );
      });
      ctx.$("#search").addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          ctx.$("#search").value = "";
          ctx.render();
          ctx.$("#search").blur();
        }
      });
      ctx.$("#save").onclick = async () => {
        const btn = ctx.$("#save");
        btn.disabled = true;
        const submitted = ctx.core.clone(ctx.model.state),
          sent = ctx.core.fingerprint(submitted);
        try {
          const result = await ctx.api(
            "/api/state",
            ctx.json("PUT", submitted),
          );
          ctx.model.state.revision = result.revision;
          ctx.model.publishedFingerprint = ctx.core.fingerprint(result.state);
          if (ctx.core.fingerprint(ctx.model.state) === sent) {
            ctx.model.state.lists = result.state.lists;
            ctx.model.state.epg = result.state.epg;
            ctx.draftHistory.record(ctx.model.state);
          }
          ctx.syncDirty();
          ctx.render();
          ctx.toast(ctx.model.dirty ? ctx.t("m33") : ctx.t("m34"));
        } catch (err) {
          ctx.toast(window.M3UI18n.error(err.message));
        } finally {
          btn.disabled = false;
        }
      };
    },
  };
});
