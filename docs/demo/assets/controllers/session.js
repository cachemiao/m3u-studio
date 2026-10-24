/* Session: explicit context dependencies; no implicit application-state globals. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else (root.M3UStudio ??= {}).createSession = factory;
})(globalThis, function (ctx) {
  "use strict";
  const formBaselines = new WeakMap();
  const formFingerprint = (form) =>
    JSON.stringify(
      [...new FormData(form)].map(([key, value]) => [
        key,
        value instanceof File
          ? [value.name, value.size, value.name ? value.lastModified : 0]
          : value,
      ]),
    );
  function pendingFormChanges() {
    return ["channelForm", "importForm", "settingsForm", "listForm"].some(
      (id) => {
        const form = ctx.$("#" + id);
        return (
          form.closest("dialog").open &&
          formBaselines.has(form) &&
          formFingerprint(form) !== formBaselines.get(form)
        );
      },
    );
  }
  function showAuth(setup) {
    ctx.stopSourceCheck();
    ctx.stopSingleChecks();
    if (ctx.$("#sourceCheckDialog").open) ctx.$("#sourceCheckDialog").close();
    ctx.model.authMode = setup ? "setup" : "login";
    ctx.$("#appShell").hidden = true;
    ctx.$("#authScreen").hidden = false;
    window.M3UI18n.setText(
      ctx.$("#authTitle"),
      window.M3UI18n.dynamic(() => (setup ? ctx.t("m53") : ctx.t("m54"))),
    );
    window.M3UI18n.setText(
      ctx.$("#authHint"),
      window.M3UI18n.dynamic(() => (setup ? ctx.t("m55") : ctx.t("m56"))),
    );
    window.M3UI18n.setText(
      ctx.$("#authSubmit"),
      window.M3UI18n.dynamic(() => (setup ? ctx.t("m57") : ctx.t("m58"))),
    );
    ctx.$("#confirmLabel").hidden = !setup;
    const fields = ctx.$("#authForm").elements;
    fields.password.minLength = setup ? 8 : 0;
    fields.password.autocomplete = setup ? "new-password" : "current-password";
    fields.confirm_password.required = setup;
    fields.password.value = "";
    fields.confirm_password.value = "";
    window.M3UI18n.setText(ctx.$("#authError"), "");
  }
  function renderUserMenu() {
    window.M3UI18n.setText(
      ctx.$("#currentUserName"),
      window.M3UI18n.dynamic(() => ctx.model.username || ""),
    );
  }
  async function loadWorkspace() {
    renderUserMenu();
    if (
      !ctx.model.dirty ||
      !ctx.model.state ||
      ctx.model.workspaceOwner !== ctx.model.username
    ) {
      if (ctx.model.state && ctx.model.dirty) ctx.persistDraft();
      ctx.model.dirty = false;
      ctx.model.workspaceOwner = ctx.model.username;
      ctx.model.state = await ctx.api("/api/state");
      ctx.model.publishedFingerprint = ctx.core.fingerprint(ctx.model.state);
      ctx.draftHistory.reset(ctx.model.state);
      ctx.model.selectedChannels.clear();
      ctx.model.selected = ctx.model.state.lists[0]?.id;
      ctx.model.group = "";
      try {
        ctx.model.draftStore = ctx.createDraftStore(ctx.model.username);
        const saved = ctx.model.draftStore?.read() || null;
        if (saved) {
          if (
            ctx.core.fingerprint(saved.content) ===
            ctx.model.publishedFingerprint
          )
            ctx.model.draftStore.clear();
          else if (
            await ctx.uiConfirm(
              ctx.t("m318", {
                p0: new Date(saved.savedAt).toLocaleString(
                  window.M3UI18n.locale,
                ),
                p1:
                  saved.baseline === ctx.model.publishedFingerprint
                    ? ""
                    : ctx.t("m319"),
              }),
              { danger: false, confirmLabel: ctx.t("m125") },
            )
          ) {
            const checked = await ctx.api(
              "/api/validate",
              ctx.json("POST", saved.content),
            );
            ctx.model.state.lists = checked.lists;
            ctx.model.state.epg = checked.epg;
            ctx.model.selected = ctx.model.state.lists[0]?.id;
            ctx.draftHistory.record(ctx.model.state);
            ctx.syncDirty();
            ctx.toast(ctx.t("m321"));
          } else ctx.model.draftStore.clear();
        }
      } catch {
        ctx.toast(ctx.t("m320"));
      }
    }
    ctx.$("#authScreen").hidden = true;
    ctx.$("#appShell").hidden = false;
    ctx.renderSaveStatus();
    ctx.render();
    window.dispatchEvent(new Event("m3u-workspace-ready"));
  }
  return {
    formFingerprint,
    pendingFormChanges,
    showAuth,
    renderUserMenu,
    loadWorkspace,
    install() {
      for (const id of [
        "channelForm",
        "importForm",
        "settingsForm",
        "listForm",
      ]) {
        const form = ctx.$("#" + id),
          dialog = form.closest("dialog");
        new MutationObserver(() => {
          if (dialog.open) formBaselines.set(form, ctx.formFingerprint(form));
          else formBaselines.delete(form);
        }).observe(dialog, { attributes: true, attributeFilter: ["open"] });
      }
      window.addEventListener("beforeunload", (e) => {
        if (ctx.model.dirty || ctx.pendingFormChanges()) {
          e.preventDefault();
          e.returnValue = "";
        }
      });
      ctx.$("#authForm").onsubmit = async (e) => {
        e.preventDefault();
        const f = e.target.elements;
        if (
          ctx.model.authMode === "setup" &&
          f.password.value !== f.confirm_password.value
        ) {
          window.M3UI18n.setText(
            ctx.$("#authError"),
            window.M3UI18n.dynamic(() => ctx.t("m60")),
          );
          return;
        }
        ctx.$("#authSubmit").disabled = true;
        try {
          const result = await ctx.api(
            "/api/auth/" + ctx.model.authMode,
            ctx.json("POST", {
              username: f.username.value,
              password: f.password.value,
            }),
          );
          ctx.model.username = result.username;
          f.password.value = "";
          f.confirm_password.value = "";
          await ctx.loadWorkspace();
        } catch (err) {
          window.M3UI18n.setText(
            ctx.$("#authError"),
            window.M3UI18n.dynamic(() => window.M3UI18n.error(err.message)),
          );
        } finally {
          ctx.$("#authSubmit").disabled = false;
        }
      };
      ctx.$("#logout").onclick = async () => {
        if (
          ctx.model.dirty &&
          !(await ctx.uiConfirm(ctx.t("m61"), {
            danger: false,
            confirmLabel: ctx.t("m159"),
          }))
        )
          return;
        try {
          await ctx.api("/api/auth/logout", ctx.json("POST", {}));
          ctx.stopSourceCheck();
          ctx.stopSingleChecks();
          ctx.model.sourceCheckResults.clear();
          ctx.persistDraft();
          ctx.model.state = null;
          ctx.model.dirty = false;
          ctx.model.draftStore = null;
          ctx.model.selectedChannels.clear();
          ctx.model.publishedFingerprint = "";
          ctx.showAuth(false);
        } catch (err) {
          ctx.toast(window.M3UI18n.error(err.message));
        }
      };
      ctx.$("#preferences").onclick = () =>
        ctx.$("#preferencesDialog").showModal();
      ctx.$("#userAccountSettings").onclick = () =>
        ctx.$("#accountSettings").click();
      ctx.$("#accountSettings").onclick = () => {
        const form = ctx.$("#accountForm");
        form.reset();
        form.elements.username.value = ctx.model.username;
        ctx.$("#accountDialog").showModal();
      };
      ctx.$("#accountForm").onsubmit = async (e) => {
        e.preventDefault();
        const form = e.target;
        if (
          form.elements.password.value !== form.elements.confirm_password.value
        )
          return ctx.toast(ctx.t("m62"));
        try {
          const result = await ctx.api(
            "/api/auth/account",
            ctx.json("PUT", Object.fromEntries(new FormData(form))),
          );
          ctx.model.username = result.username;
          ctx.renderUserMenu();
          form.reset();
          ctx.$("#accountDialog").close();
          ctx.toast(ctx.t("m63"));
        } catch (err) {
          ctx.toast(window.M3UI18n.error(err.message));
        }
      };
      ctx
        .api("/api/auth/status")
        .then(async (data) => {
          window.M3UUpdates.setCurrentVersion(data.version);
          ctx.model.username = data.username;
          if (data.authenticated) await ctx.loadWorkspace();
          else ctx.showAuth(!data.initialized);
        })
        .catch((err) => {
          ctx.showAuth(false);
          window.M3UI18n.setText(
            ctx.$("#authError"),
            window.M3UI18n.dynamic(() => window.M3UI18n.error(err.message)),
          );
        });
    },
  };
});
