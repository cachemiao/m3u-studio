/* Logos: explicit context dependencies; no implicit application-state globals. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else (root.M3UStudio ??= {}).createLogos = factory;
})(globalThis, function (ctx) {
  "use strict";
  async function loadLogos() {
    ctx.model.logoLibrary = await ctx.api("/api/logos");
    return ctx.model.logoLibrary;
  }
  function libraryPaths() {
    return ctx.model.logoLibrary.logos;
  }
  function selectLogoTab(kind) {
    for (const [id, panel, key] of [
      ["tabBuiltin", "logoCatalogPanel", "builtin"],
      ["tabLink", "logoLinkPanel", "link"],
      ["tabUpload", "logoUploadPanel", "upload"],
    ]) {
      const active = key === kind;
      ctx.$("#" + id).setAttribute("aria-selected", String(active));
      ctx.$("#" + panel).hidden = !active;
    }
  }
  async function openLogoPicker(context, channel) {
    ctx.model.logoPickerContext = context;
    ctx.model.logoPickerChannel = channel;
    window.M3UI18n.setText(
      ctx.$("#logoPickerTitle"),
      window.M3UI18n.dynamic(() =>
        ctx.t("m81", { p0: channel.name || ctx.t("m80") }),
      ),
    );
    ctx.$("#logoSearch").value = "";
    ctx.$("#logoLink").value = channel.logo?.startsWith("http")
      ? channel.logo
      : "";
    ctx.$("#logoGrid").replaceChildren();
    window.M3UI18n.setText(
      ctx.$("#logoCount"),
      window.M3UI18n.dynamic(() => ctx.t("m82")),
    );
    updateLogoPreview(channel.logo, channel.name);
    selectLogoTab("builtin");
    ctx.$("#logosDialog").showModal();
    try {
      await loadLogos();
      if (
        ctx.model.logoPickerContext !== context ||
        !ctx.$("#logosDialog").open
      )
        return;
      renderLogoPicker();
    } catch (err) {
      window.M3UI18n.setText(
        ctx.$("#logoCount"),
        window.M3UI18n.dynamic(() => window.M3UI18n.error(err.message)),
      );
    }
  }
  function applyLogoChoice(path, target = ctx.model.logoPickerContext) {
    if (!ctx.isLogoAllowed(path)) return ctx.toast(ctx.t("demoLogoOnly"));
    if (!target) return;
    if (target.editor) {
      if (!ctx.$("#editor").open) return;
      ctx.$("#channelForm").elements.logo.value = path;
    } else {
      const ch = ctx.model.state.lists
        .find((l) => l.id === target.listId)
        ?.channels.find((c) => c.id === target.channelId);
      if (!ch) return ctx.toast(ctx.t("m83"));
      if (ch.logo !== path) {
        ch.logo = path;
        ctx.changed();
      }
    }
    ctx.$("#logosDialog").close();
    ctx.toast(ctx.t("m84"));
  }
  function renderLogoPicker() {
    if (!ctx.model.logoLibrary || !ctx.model.logoPickerChannel) return;
    const query = ctx.core.normalizeName(ctx.$("#logoSearch").value),
      paths = libraryPaths(),
      suggestion = ctx.core.matchLogo(
        ctx.model.logoPickerChannel,
        paths,
        ctx.model.logoLibrary.aliases,
      );
    const filtered = paths
      .filter((path) =>
        ctx.core.normalizeName(ctx.core.logoName(path)).includes(query),
      )
      .sort((a, b) =>
        a === suggestion
          ? -1
          : b === suggestion
            ? 1
            : ctx.core
                .logoName(a)
                .localeCompare(ctx.core.logoName(b), window.M3UI18n.locale, {
                  numeric: true,
                }),
      );
    ctx.$("#logoGrid").replaceChildren();
    window.M3UI18n.setText(
      ctx.$("#logoCount"),
      window.M3UI18n.dynamic(() =>
        filtered.length
          ? ctx.t("m87", {
              p0: filtered.length,
              p1: suggestion ? ctx.t("m85") : "",
              p2: filtered.length > 300 ? ctx.t("m86") : "",
            })
          : ctx.t("m88"),
      ),
    );
    filtered.slice(0, 300).forEach((path) => {
      const name = ctx.core.logoName(path),
        b = ctx.button("", () => applyLogoChoice(path)),
        img = ctx.el("img");
      img.src = path;
      img.alt = name;
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      window.M3UI18n.setAttribute(b, "title", name);
      b.onmouseenter = () => updateLogoPreview(path, name, true);
      b.onfocus = () => updateLogoPreview(path, name, true);
      b.append(img, ctx.el("small", name));
      if (path === suggestion)
        b.append(ctx.el("small", ctx.t("m89"), "logo-recommend"));
      ctx.$("#logoGrid").append(b);
    });
  }
  function confirmLogoReplace(name, users = []) {
    return new Promise((resolve) => {
      const dialog = ctx.$("#logoConflictDialog");
      window.M3UI18n.setText(
        ctx.$("#logoConflictMessage"),
        window.M3UI18n.dynamic(() =>
          ctx.t("m92", {
            p0: name,
            p1: users.length ? ctx.t("m91", { p0: users.length }) : "",
          }),
        ),
      );
      let replaced = false;
      ctx.$("#logoConflictReplace").onclick = () => {
        replaced = true;
        dialog.close();
      };
      ctx.$("#logoConflictStop").onclick = () => dialog.close();
      dialog.addEventListener("close", () => resolve(replaced), { once: true });
      dialog.showModal();
    });
  }
  async function uploadLibraryLogo(file, name = null) {
    const send = (replace) => {
      const data = new FormData();
      data.append("file", file, name || file.name);
      if (replace) data.append("replace", "1");
      return ctx.api("/api/logos", { method: "POST", body: data });
    };
    try {
      return await send(false);
    } catch (err) {
      if (!err.data?.conflict) throw err;
      if (!(await ctx.confirmLogoReplace(err.data.name, err.data.users)))
        return null;
      return send(true);
    }
  }
  async function refreshLogoLibrary() {
    await loadLogos();
    if (ctx.$("#logoManagerDialog").open) renderLogoManager();
    if (ctx.$("#logosDialog").open) renderLogoPicker();
  }
  async function openLogoManager() {
    ctx.$("#managerLogoSearch").value = "";
    ctx.$("#managerLogoGrid").replaceChildren();
    window.M3UI18n.setText(
      ctx.$("#managerLogoStatus"),
      window.M3UI18n.dynamic(() => ctx.t("m93")),
    );
    ctx.$("#logoManagerDialog").showModal();
    try {
      await loadLogos();
      renderLogoManager();
    } catch (err) {
      window.M3UI18n.setText(
        ctx.$("#managerLogoStatus"),
        window.M3UI18n.dynamic(() => window.M3UI18n.error(err.message)),
      );
    }
  }
  function draftLogoUsers(path) {
    return (ctx.model.state?.lists || []).flatMap((list) =>
      list.channels
        .filter((ch) => {
          try {
            const url = new URL(ch.logo, location.origin);
            return (
              url.origin === location.origin &&
              "/logo/" +
                (ctx.model.logoLibrary.aliases[
                  decodeURIComponent(url.pathname).slice(6)
                ] || decodeURIComponent(url.pathname).slice(6)) ===
                path
            );
          } catch {
            return false;
          }
        })
        .map((ch) => ({ list: list.name, name: ch.name })),
    );
  }
  function usageText(users) {
    return (
      users
        .slice(0, 12)
        .map((u) => `${u.list} / ${u.name}`)
        .join(window.M3UI18n.language === "zh" ? "、" : ", ") +
      (users.length > 12 ? ctx.t("m94", { p0: users.length }) : "")
    );
  }
  async function removeLibraryLogo(entry) {
    const users = [...entry.users, ...draftLogoUsers(entry.path)],
      warning = users.length
        ? ctx.t("m95", { p0: usageText(users) })
        : ctx.t("m96");
    if (!(await ctx.uiConfirm(ctx.t("m97", { p0: entry.name, p1: warning }))))
      return;
    const path = "/api/logos/" + encodeURIComponent(entry.name);
    try {
      await ctx.api(path, { method: "DELETE" });
    } catch (err) {
      if (!err.data?.in_use) throw err;
      if (
        !(await ctx.uiConfirm(ctx.t("m98", { p0: usageText(err.data.users) })))
      )
        return;
      await ctx.api(path + "?confirm=1", { method: "DELETE" });
    }
    await refreshLogoLibrary();
    ctx.render();
    ctx.toast(ctx.t("m99"));
  }
  function renderLogoManager() {
    if (!ctx.model.logoLibrary) return;
    const query = ctx.core.normalizeName(ctx.$("#managerLogoSearch").value),
      entries = ctx.model.logoLibrary.entries
        .filter((e) =>
          ctx.core.normalizeName(ctx.core.logoName(e.path)).includes(query),
        )
        .sort((a, b) =>
          a.name.localeCompare(b.name, window.M3UI18n.locale, {
            numeric: true,
          }),
        );
    ctx.$("#managerLogoGrid").replaceChildren();
    window.M3UI18n.setText(
      ctx.$("#managerLogoStatus"),
      window.M3UI18n.dynamic(() =>
        ctx.t("m101", {
          p0: ctx.model.logoLibrary.entries.length,
          p1: entries.length,
          p2: entries.length > 300 ? ctx.t("m100") : "",
        }),
      ),
    );
    for (const entry of entries.slice(0, 300)) {
      const row = ctx.el("section", undefined, "library-logo-card"),
        img = ctx.el("img");
      img.src = entry.path;
      img.alt = ctx.core.logoName(entry.path);
      img.loading = "lazy";
      row.append(
        img,
        ctx.el("strong", ctx.core.logoName(entry.path)),
        ctx.el(
          "small",
          ctx.t("m104", {
            p0: entry.uploaded ? ctx.t("m102") : ctx.t("m103"),
            p1: entry.users.length,
          }),
        ),
      );
      const actions = ctx.el("div", undefined, "library-logo-actions"),
        replace = ctx.button(ctx.t("m105"), () => {
          ctx.model.replacementLogoName = entry.name;
          ctx.$("#replaceLogoFile").click();
        }),
        remove = ctx.button(
          ctx.t("m22"),
          async () => {
            remove.disabled = true;
            try {
              await removeLibraryLogo(entry);
            } catch (err) {
              ctx.toast(window.M3UI18n.error(err.message));
            } finally {
              remove.disabled = false;
            }
          },
          "danger",
        );
      replace.disabled = remove.disabled = ctx.model.managerUploadBusy;
      actions.append(replace, remove);
      row.append(actions);
      ctx.$("#managerLogoGrid").append(row);
    }
  }
  async function uploadManagerFiles(files, name = null) {
    if (ctx.model.managerUploadBusy) return;
    ctx.model.managerUploadBusy = true;
    ctx.$("#managerUpload").disabled = true;
    renderLogoManager();
    let count = 0,
      stopped = false;
    try {
      for (const file of files) {
        window.M3UI18n.setText(
          ctx.$("#managerLogoStatus"),
          window.M3UI18n.dynamic(() => ctx.t("m106", { p0: file.name })),
        );
        const result = await uploadLibraryLogo(file, name);
        if (!result) {
          stopped = true;
          break;
        }
        count++;
      }
    } catch (err) {
      ctx.toast(window.M3UI18n.error(err.message));
    } finally {
      ctx.model.managerUploadBusy = false;
      ctx.$("#managerUpload").disabled = false;
      try {
        await refreshLogoLibrary();
        ctx.render();
        window.M3UI18n.setText(
          ctx.$("#managerLogoStatus"),
          window.M3UI18n.dynamic(
            () =>
              ctx.t("m101", {
                p0: ctx.model.logoLibrary.entries.length,
                p1: ctx.model.logoLibrary.entries.filter((e) =>
                  ctx.core
                    .normalizeName(ctx.core.logoName(e.path))
                    .includes(
                      ctx.core.normalizeName(ctx.$("#managerLogoSearch").value),
                    ),
                ).length,
                p2: "",
              }) +
              ctx.t("m108", { p0: count, p1: stopped ? ctx.t("m107") : "" }),
          ),
        );
      } catch (err) {
        ctx.toast(window.M3UI18n.error(err.message));
      }
    }
  }
  function renderAutoLogos() {
    const list = ctx.model.state.lists.find(
        (l) => l.id === ctx.model.logoContext.listId,
      ),
      paths = libraryPaths(),
      ids = new Set(ctx.model.logoContext.ids);
    ctx.model.logoMatches = [];
    let missing = 0,
      kept = 0,
      same = 0;
    ctx.$("#autoLogoPreview").replaceChildren();
    list.channels
      .filter((ch) => ids.has(ch.id))
      .forEach((ch) => {
        if (ch.logo && !ctx.$("#replaceLogos").checked) {
          kept++;
          return;
        }
        const path = ctx.core.matchLogo(
          ch,
          paths,
          ctx.model.logoLibrary.aliases,
        );
        if (!path) {
          missing++;
          return;
        }
        if (ch.logo === path) {
          same++;
          return;
        }
        ctx.model.logoMatches.push({ id: ch.id, path });
        if (ctx.model.logoMatches.length <= 100) {
          const row = ctx.previewRow(
              ch.name,
              `${ch.logo ? ctx.t("m113") : ctx.t("m114")} → ${ctx.core.logoName(path)}`,
            ),
            img = ctx.el("img");
          img.src = path;
          img.alt = ctx.core.logoName(path);
          row.prepend(img);
          ctx.$("#autoLogoPreview").append(row);
        }
      });
    window.M3UI18n.setText(
      ctx.$("#autoLogoSummary"),
      window.M3UI18n.dynamic(() =>
        ctx.t("m116", {
          p0: ctx.model.logoMatches.length,
          p1: kept,
          p2: same,
          p3: missing,
          p4: ctx.model.logoMatches.length > 100 ? ctx.t("m115") : "",
        }),
      ),
    );
    ctx.$("#autoLogoApply").disabled = !ctx.model.logoMatches.length;
  }
  function updateLogoPreview(
    path,
    name = ctx.model.logoPickerChannel?.name || "",
    candidate = false,
  ) {
    if (!ctx.isLogoAllowed(path)) path = "";
    const stage = ctx.$("#logoPreviewStage");
    stage.replaceChildren();
    window.M3UI18n.setText(
      ctx.$("#logoPreviewLabel"),
      ctx.t(candidate ? "uiLogoPreview" : "uiCurrentLogo"),
    );
    ctx.$("#logoPreviewName").textContent = name;
    const source = ctx.$("#logoPreviewSource");
    source.replaceChildren();
    if (!path) source.append(ctx.el("span", ctx.t("uiLogoPreviewEmpty")));
    else {
      let local = false;
      try {
        const u = new URL(path, location.href);
        local = u.origin === location.origin && u.pathname.startsWith("/logo/");
      } catch {}
      if (candidate || local)
        source.append(ctx.el("span", ctx.t("uiLogoInLibrary")));
      else if (/^https?:\/\//i.test(path))
        source.append(
          ctx.el("span", ctx.t("uiLogoFromLink")),
          ctx.el("span", path, "logo-source-url"),
        );
      else source.append(ctx.el("span", ctx.t("uiLogoLocal")));
    }
    const empty = ctx.el(
      "span",
      ctx.t(path ? "uiLogoPreviewError" : "uiLogoPreviewEmpty"),
      "logo-preview-empty",
    );
    if (!path) {
      stage.append(empty);
      return;
    }
    const image = ctx.el("img");
    image.alt = name;
    image.referrerPolicy = "no-referrer";
    image.onerror = () => {
      image.remove();
      stage.append(empty);
    };
    image.src = path;
    stage.append(image);
  }
  return {
    loadLogos,
    libraryPaths,
    selectLogoTab,
    openLogoPicker,
    applyLogoChoice,
    renderLogoPicker,
    confirmLogoReplace,
    uploadLibraryLogo,
    refreshLogoLibrary,
    openLogoManager,
    draftLogoUsers,
    usageText,
    removeLibraryLogo,
    renderLogoManager,
    uploadManagerFiles,
    renderAutoLogos,
    updateLogoPreview,
    install() {
      ctx.$("#pickLogo").onclick = () =>
        ctx.openLogoPicker(
          { editor: true },
          {
            name: ctx.$("#channelForm").elements.name.value,
            epg_id: ctx.$("#channelForm").elements.epg_id.value,
            logo: ctx.$("#channelForm").elements.logo.value,
          },
        );
      ctx.$("#logoFile").onchange = async (e) => {
        const file = e.target.files[0],
          target = ctx.model.logoPickerContext;
        if (!file || !target) return;
        ctx.$("#uploadLogoButton").disabled = true;
        try {
          const result = await ctx.uploadLibraryLogo(file);
          if (result) {
            await ctx.refreshLogoLibrary();
            ctx.render();
            if (
              ctx.$("#logosDialog").open &&
              ctx.model.logoPickerContext === target
            ) {
              ctx.applyLogoChoice(result.path, target);
              ctx.toast(ctx.t("m37"));
            }
          }
        } catch (err) {
          ctx.toast(window.M3UI18n.error(err.message));
        } finally {
          ctx.$("#uploadLogoButton").disabled = false;
          e.target.value = "";
        }
      };
      ctx.$("#tabBuiltin").onclick = () => ctx.selectLogoTab("builtin");
      ctx.$("#tabLink").onclick = () => ctx.selectLogoTab("link");
      ctx.$("#tabUpload").onclick = () => ctx.selectLogoTab("upload");
      ctx.$(".logo-tabs").onkeydown = (e) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
        e.preventDefault();
        const tabs = [
            ctx.$("#tabBuiltin"),
            ctx.$("#tabUpload"),
            ctx.$("#tabLink"),
          ],
          i = tabs.indexOf(document.activeElement),
          next =
            e.key === "Home"
              ? 0
              : e.key === "End"
                ? 2
                : (i + (e.key === "ArrowRight" ? 1 : 2)) % 3;
        tabs[next].click();
        tabs[next].focus();
      };
      ctx.$("#uploadLogoButton").onclick = () => ctx.$("#logoFile").click();
      ctx.$("#logoLinkForm").onsubmit = (e) => {
        e.preventDefault();
        const value = ctx.$("#logoLink").value.trim();
        try {
          const u = new URL(value);
          if (
            !["http:", "https:"].includes(u.protocol) ||
            u.username ||
            u.password
          )
            throw Error();
          ctx.applyLogoChoice(value);
        } catch {
          ctx.toast(ctx.t("m90"));
        }
      };
      ctx.$("#manageLogos").onclick = ctx.openLogoManager;
      ctx.$("#exportLogos").onclick = async (event) => {
        const button = event.currentTarget;
        button.disabled = true;
        try {
          await ctx.downloadArchive(
            "/api/logos/export",
            {},
            "m3u-studio-logos.zip",
          );
        } catch (error) {
          ctx.toast(window.M3UI18n.error(error.message));
        } finally {
          button.disabled = false;
        }
      };
      ctx.$("#pickerManageLogos").onclick = ctx.openLogoManager;
      ctx.$("#managerLogoSearch").oninput = ctx.renderLogoManager;
      ctx.$("#managerUpload").onclick = () => ctx.$("#managerLogoFile").click();
      ctx.$("#managerLogoFile").onchange = async (e) => {
        const files = [...e.target.files];
        e.target.value = "";
        await ctx.uploadManagerFiles(files);
      };
      ctx.$("#replaceLogoFile").onchange = async (e) => {
        const file = e.target.files[0],
          name = ctx.model.replacementLogoName;
        e.target.value = "";
        if (file && name) await ctx.uploadManagerFiles([file], name);
      };
      ctx.$("#logoSearch").oninput = ctx.renderLogoPicker;
      ctx.$("#autoLogo").onclick = async () => {
        const list = ctx.current(),
          ids = ctx.model.selectedChannels.size
            ? [...ctx.model.selectedChannels]
            : ctx.model.visibleChannels.map((c) => c.id);
        ctx.model.logoContext = {
          listId: ctx.model.selected,
          ids,
          fingerprint: ctx.core.fingerprint(ctx.model.state),
        };
        try {
          await ctx.loadLogos();
          if (
            ctx.core.fingerprint(ctx.model.state) !==
            ctx.model.logoContext.fingerprint
          )
            return ctx.toast(ctx.t("m109"));
          ctx.$("#replaceLogos").checked = false;
          window.M3UI18n.setText(
            ctx.$("#autoLogoScope"),
            window.M3UI18n.dynamic(() =>
              ctx.t("m112", {
                p0: list.name,
                p1: ctx.model.selectedChannels.size
                  ? ctx.t("m110")
                  : ctx.t("m111"),
                p2: ids.length,
              }),
            ),
          );
          ctx.renderAutoLogos();
          ctx.$("#autoLogoDialog").showModal();
        } catch (err) {
          ctx.toast(window.M3UI18n.error(err.message));
        }
      };
      ctx.$("#replaceLogos").onchange = ctx.renderAutoLogos;
      ctx.$("#autoLogoApply").onclick = () => {
        if (
          ctx.core.fingerprint(ctx.model.state) !==
          ctx.model.logoContext.fingerprint
        )
          return ctx.toast(ctx.t("m109"));
        const list = ctx.model.state.lists.find(
          (l) => l.id === ctx.model.logoContext.listId,
        );
        const paths = new Map(ctx.model.logoMatches.map((m) => [m.id, m.path]));
        list.channels.forEach((ch) => {
          if (paths.has(ch.id)) ch.logo = paths.get(ch.id);
        });
        ctx.$("#autoLogoDialog").close();
        ctx.changed();
        ctx.toast(ctx.t("m117", { p0: ctx.model.logoMatches.length }), true);
      };
      ctx
        .$("#logoGrid")
        .addEventListener("mouseleave", () =>
          ctx.updateLogoPreview(
            ctx.model.logoPickerChannel?.logo,
            ctx.model.logoPickerChannel?.name,
          ),
        );
      ctx.$("#logoGrid").addEventListener("focusout", (e) => {
        if (!ctx.$("#logoGrid").contains(e.relatedTarget))
          ctx.updateLogoPreview(
            ctx.model.logoPickerChannel?.logo,
            ctx.model.logoPickerChannel?.name,
          );
      });
    },
  };
});
