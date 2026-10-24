"use strict";
const ctx = { model: M3UStudio.createModel() };
const $ = (s) => document.querySelector(s),
  el = (tag, text, cls) => {
    const n = document.createElement(tag);
    if (text !== undefined) window.M3UI18n.setText(n, text);
    if (cls) n.className = cls;
    return n;
  };
const core = AliceEditorCore,
  draftHistory = core.createHistory();
const uiPrompt = (options) => M3UDialogs.requestText(options),
  uiConfirm = (message, options = {}) =>
    M3UDialogs.requestConfirm({ message, ...options });

const current = () =>
    ctx.model.state?.lists.find((x) => x.id === ctx.model.selected),
  uid = () =>
    crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2);
function toast(message, undo = false) {
  window.M3UI18n.setText($("#toast"), message);
  if (undo)
    $("#toast").append(
      button(ctx.t("m324"), () => $("#undo").click(), "small"),
    );
  $("#toast").style.display = "block";
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ($("#toast").style.display = "none"), 5000);
}
function api(path, options = {}) {
  return ctx.transport.api(path, options);
}
const json = (method, data) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});
function changed() {
  draftHistory.record(ctx.model.state);
  syncDirty();
  render();
}
function persistDraft() {
  if (!ctx.model.draftStore || !ctx.model.state) return;
  try {
    if (ctx.model.dirty)
      ctx.model.draftStore.save(
        ctx.model.state,
        ctx.model.publishedFingerprint,
      );
    else ctx.model.draftStore.clear();
  } catch {
    if (!ctx.model.draftStorageWarned) {
      ctx.model.draftStorageWarned = true;
      toast(ctx.t("m320"));
    }
  }
}
function renderSaveStatus() {
  const status = $("#status");
  status.dataset.saveState = ctx.model.dirty ? "dirty" : "saved";
  window.M3UI18n.setAttribute(
    status,
    "title",
    window.M3UI18n.dynamic(() => (ctx.model.dirty ? ctx.t("m2") : ctx.t("m3"))),
  );
  window.M3UI18n.setText(
    status,
    window.M3UI18n.dynamic(() => (ctx.model.dirty ? ctx.t("m2") : ctx.t("m3"))),
  );
}
function syncDirty() {
  ctx.model.dirty =
    core.fingerprint(ctx.model.state) !== ctx.model.publishedFingerprint;
  persistDraft();
  renderSaveStatus();
  $("#undo").disabled = !draftHistory.canUndo;
  $("#redo").disabled = !draftHistory.canRedo;
}
function applyContent(content) {
  ctx.model.state.lists = content.lists;
  ctx.model.state.epg = content.epg;
  if (!current()) ctx.model.selected = ctx.model.state.lists[0]?.id;
  if (!current()?.groups.includes(ctx.model.group)) ctx.model.group = "";
  syncDirty();
  render();
}
function button(text, action, cls) {
  const n = el("button", text, cls);
  n.type = "button";
  n.onclick = action;
  return n;
}
function render() {
  if (!ctx.model.state) return;
  const list = current();
  $("#lists").replaceChildren();
  ctx.model.state.lists.forEach((x) => {
    const row = el(
      "div",
      undefined,
      "nav-item" + (x.id === ctx.model.selected ? " active" : ""),
    );
    row.append(
      button(x.name, () => {
        ctx.model.selected = x.id;
        ctx.model.group = "";
        render();
      }),
    );
    const settings = button(
      "",
      () => ctx.openListSettings(x.id),
      "list-settings-trigger",
    );
    if (x.id === ctx.model.selected) settings.id = "listSettings";
    window.M3UI18n.setAttribute(
      settings,
      "title",
      window.M3UI18n.dynamic(() => ctx.t("m167") + " · " + x.name),
    );
    window.M3UI18n.setAttribute(
      settings,
      "aria-label",
      window.M3UI18n.dynamic(() => ctx.t("m167") + " · " + x.name),
    );
    row.append(settings);
    ctx.bindSidebarDrag(row, "list", x.id);
    $("#lists").append(row);
  });
  $("#groups").replaceChildren();
  if (list) {
    const all = el(
      "div",
      undefined,
      "nav-item" + (!ctx.model.group ? " active" : ""),
    );
    all.append(
      button(ctx.t("m4"), () => {
        ctx.model.group = "";
        render();
      }),
      el("span", String(list.channels.length), "group-count"),
    );
    $("#groups").append(all);
    list.groups.forEach((g) => {
      const row = el(
        "div",
        undefined,
        "nav-item" + (ctx.model.group === g ? " active" : ""),
      );
      row.dataset.group = g;
      row.append(
        button(g, () => {
          ctx.model.group = g;
          render();
        }),
        button(
          "✎",
          async () => {
            const name = await uiPrompt({
              title: ctx.t("m5"),
              value: g,
              trim: false,
              confirmLabel: ctx.t("uiSave"),
              validate: (value) =>
                !value
                  ? ctx.t("uiNameRequired")
                  : value !== g && list.groups.includes(value)
                    ? ctx.t("m6")
                    : null,
            });
            if (!name || name === g) return;
            if (list.groups.includes(name)) return toast(ctx.t("m6"));
            list.groups[list.groups.indexOf(g)] = name;
            list.channels.forEach((ch) => {
              if (ch.group === g) ch.group = name;
            });
            if (ctx.model.group === g) ctx.model.group = name;
            changed();
          },
          "small",
        ),
        button(
          "×",
          async () => {
            if (list.channels.some((c) => c.group === g))
              return toast(ctx.t("m7"));
            if (
              !(await uiConfirm(
                ctx.t("m8") +
                  g +
                  (window.M3UI18n.language === "zh" ? "？" : "?"),
              ))
            )
              return;
            list.groups = list.groups.filter((x) => x !== g);
            ctx.model.group = "";
            changed();
          },
          "small",
        ),
      );
      row.insertBefore(
        el(
          "span",
          String(list.channels.filter((ch) => ch.group === g).length),
          "group-count",
        ),
        row.querySelector(".small"),
      );
      ctx.bindSidebarDrag(row, "group", g);
      $("#groups").append(row);
    });
  }
  window.M3UI18n.setText(
    $("#title"),
    window.M3UI18n.dynamic(() => (list ? list.name : ctx.t("m9"))),
  );
  window.M3UI18n.setText(
    $("#count"),
    window.M3UI18n.dynamic(() =>
      list
        ? ctx.t("m10", { p0: list.channels.length, p1: list.groups.length })
        : "",
    ),
  );
  for (const id of ["#add", "#import", "#newGroup"]) $(id).disabled = !list;
  $("#channels").replaceChildren();
  const query = $("#search").value.trim().toLowerCase();
  let channels = list
    ? list.groups.flatMap((g) => list.channels.filter((c) => c.group === g))
    : [];
  channels = channels.filter(
    (c) =>
      (!ctx.model.group || c.group === ctx.model.group) &&
      [c.name, c.url, c.epg_id].some((x) => x.toLowerCase().includes(query)),
  );
  $("#empty").hidden = !!channels.length;
  window.M3UI18n.setText(
    $("#empty"),
    window.M3UI18n.dynamic(() =>
      query ? ctx.t("m11") : ctx.model.group ? ctx.t("m12") : ctx.t("m13"),
    ),
  );
  if (!channels.length) {
    if (query)
      $("#empty").append(
        button(
          ctx.t("studioClearSearch"),
          () => {
            $("#search").value = "";
            render();
          },
          "empty-action",
        ),
      );
    else if (!list)
      $("#empty").append(
        button(ctx.t("m376"), () => ctx.openImport(true), "empty-action"),
      );
    else
      $("#empty").append(
        button(ctx.t("m28"), () => ctx.openEditor(), "empty-action"),
      );
  }
  ctx.model.visibleChannels = channels;
  if (ctx.model.selectionList !== ctx.model.selected) {
    ctx.model.selectedChannels.clear();
    ctx.model.selectionList = ctx.model.selected;
  }
  const existing = new Set(list?.channels.map((c) => c.id) || []);
  ctx.model.selectedChannels = new Set(
    [...ctx.model.selectedChannels].filter((id) => existing.has(id)),
  );
  updateSelection();
  channels.forEach((ch) => {
    const row = el("article", undefined, "channel");
    row.dataset.id = ch.id;
    const check = el("input");
    check.type = "checkbox";
    check.className = "channel-select";
    window.M3UI18n.setAttribute(
      check,
      "aria-label",
      window.M3UI18n.dynamic(() => ctx.t("m14") + ch.name),
    );
    check.checked = ctx.model.selectedChannels.has(ch.id);
    check.onchange = () => {
      if (check.checked) ctx.model.selectedChannels.add(ch.id);
      else ctx.model.selectedChannels.delete(ch.id);
      updateSelection();
    };
    const handle = el("span", "⠿", "handle");
    handle.draggable = !query;
    window.M3UI18n.setAttribute(
      handle,
      "title",
      window.M3UI18n.dynamic(() => (query ? ctx.t("m15") : ctx.t("m16"))),
    );
    handle.ondragstart = (e) => {
      ctx.beginChannelDrag(ch.id, e);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", ch.id);
      const blank = document.createElement("canvas");
      blank.width = blank.height = 1;
      e.dataTransfer.setDragImage(blank, 0, 0);
    };
    handle.ondragend = ctx.finishChannelDrag;
    ctx.bindTouchDrag(handle, ch.id, !query);

    const logo = button(
      "",
      () => {
        ctx.openLogoPicker(
          { listId: ctx.model.selected, channelId: ch.id },
          ch,
        );
      },
      "logo",
    );
    window.M3UI18n.setAttribute(
      logo,
      "title",
      window.M3UI18n.dynamic(() => ctx.t("m17")),
    );
    window.M3UI18n.setAttribute(
      logo,
      "aria-label",
      window.M3UI18n.dynamic(() => ctx.t("m18") + ch.name),
    );
    if (ch.logo) {
      const img = el("img");
      img.src = ch.logo;
      img.alt = ch.name;
      img.onerror = () => {
        img.hidden = true;
        logo.append(el("small", ctx.t("m19")));
      };
      logo.append(img);
    } else window.M3UI18n.setText(logo, "＋Logo");
    const info = el("div", undefined, "channel-info");
    const title = el("div", undefined, "channel-title");
    title.append(el("span", ch.name, "channel-name"));
    const features = el("div", undefined, "channel-features");
    for (const [enabled, cls, label] of [
      [ch.catchup_url, "replay", ctx.t("m20")],
      [ch.fcc_url, "fcc", ctx.t("studioFcc")],
    ]) {
      if (enabled) {
        const feature = el("span", undefined, "channel-feature " + cls);
        feature.tabIndex = 0;
        feature.setAttribute("role", "img");
        window.M3UI18n.setAttribute(feature, "aria-label", label);
        features.append(feature);
      } else {
        const slot = el("span", undefined, "channel-feature-slot " + cls);
        slot.setAttribute("aria-hidden", "true");
        features.append(slot);
      }
    }
    const checkItem = ctx.sourceItem(ctx.model.selected, ch),
      checkedSource = ctx.sourceDisplayResult(checkItem.key);
    const status = el("div", undefined, "channel-status");
    window.M3UI18n.setAttribute(
      status,
      "aria-label",
      ctx.t("studioSourceStatus"),
    );
    status.append(ctx.sourceBadge(checkedSource, checkItem));
    const stream = ctx.createCopyableStream(ch.url);
    info.append(title, stream);
    const actions = el("div", undefined, "actions");
    actions.append(
      button(ctx.t("m21"), () => ctx.openEditor(ch)),
      button(
        ctx.t("m22"),
        async () => {
          if (
            await uiConfirm(
              ctx.t("m23") +
                ch.name +
                (window.M3UI18n.language === "zh" ? "？" : "?"),
            )
          ) {
            list.channels = list.channels.filter((c) => c.id !== ch.id);
            changed();
          }
        },
        "danger",
      ),
    );
    const epg = el("div", undefined, "channel-epg");
    epg.append(el("span", ch.epg_id || "—", "epg-value"));
    epg.title =
      (ch.epg_id || ch.name) +
      (ch.epg || list.epg || ctx.model.state.epg
        ? " · " + (ch.epg || list.epg || ctx.model.state.epg)
        : "");
    const groupCell = el("div", ch.group, "channel-group");
    groupCell.title = ch.group;
    row.append(
      check,
      handle,
      logo,
      info,
      features,
      status,
      groupCell,
      epg,
      actions,
    );
    $("#channels").append(row);
  });
}
function updateSelection() {
  const hasSelection = ctx.model.selectedChannels.size > 0;
  $(".bulk-actions").hidden = !hasSelection;
  $(".bulk-toolbar").classList.toggle("has-selection", hasSelection);
  const all =
    ctx.model.visibleChannels.length > 0 &&
    ctx.model.visibleChannels.every((ch) =>
      ctx.model.selectedChannels.has(ch.id),
    );
  $("#selectVisible").checked = all;
  $("#selectVisible").indeterminate =
    !all &&
    ctx.model.visibleChannels.some((ch) =>
      ctx.model.selectedChannels.has(ch.id),
    );
  $("#selectVisible").disabled = !ctx.model.visibleChannels.length;
  window.M3UI18n.setText(
    $("#selectionCount"),
    window.M3UI18n.dynamic(() =>
      ctx.t("m64", { p0: ctx.model.selectedChannels.size }),
    ),
  );
  $("#clearSelection").disabled = !ctx.model.selectedChannels.size;
  $("#batchEdit").disabled = !ctx.model.selectedChannels.size;
  $("#batchDelete").disabled = !ctx.model.selectedChannels.size;
  $("#checkSources").disabled =
    !current()?.channels.length || !!ctx.model.sourceSingleRuns.size;
  $("#autoLogo").disabled = !(
    ctx.model.selectedChannels.size || ctx.model.visibleChannels.length
  );
  $("#undo").disabled = !draftHistory.canUndo;
  $("#redo").disabled = !draftHistory.canRedo;
}
$("#selectVisible").onchange = (e) => {
  ctx.model.visibleChannels.forEach((ch) => {
    if (e.target.checked) ctx.model.selectedChannels.add(ch.id);
    else ctx.model.selectedChannels.delete(ch.id);
  });
  render();
};
$("#clearSelection").onclick = () => {
  ctx.model.selectedChannels.clear();
  render();
};
$("#undo").onclick = () => {
  const content = draftHistory.undo();
  if (content) {
    applyContent(content);
    toast(ctx.t("m65"));
  }
};
$("#redo").onclick = () => {
  const content = draftHistory.redo();
  if (content) applyContent(content);
};
window.addEventListener("keydown", (e) => {
  if (
    !(e.ctrlKey || e.metaKey) ||
    e.altKey ||
    e.target.closest("input,textarea,select,[contenteditable]") ||
    document.querySelector("dialog[open]") ||
    !ctx.model.state ||
    $("#appShell").hidden
  )
    return;
  if (e.key.toLowerCase() === "z") {
    e.preventDefault();
    (e.shiftKey ? $("#redo") : $("#undo")).click();
  }
});
function previewRow(name, description) {
  const row = el("div", undefined, "preview-row");
  row.append(el("strong", name), el("p", description, "hint"));
  return row;
}
const maskUrl = (value) =>
  (value || "").replace(/(\w+:\/\/)[^/@\s]+@/g, "$1••••@");
window.addEventListener("m3u-language-change", () => {
  if (ctx.model.state) {
    render();
    if (ctx.model.logoLibrary && $("#logoManagerDialog").open)
      ctx.renderLogoManager();
    if (ctx.model.logoLibrary && $("#logosDialog").open) ctx.renderLogoPicker();
    if (ctx.model.logoContext && $("#autoLogoDialog").open)
      ctx.renderAutoLogos();
  }
});

$("#batchDelete").onclick = async () => {
  const list = current();
  if (!list) return;
  const ids = new Set(
    list.channels
      .filter((ch) => ctx.model.selectedChannels.has(ch.id))
      .map((ch) => ch.id),
  );
  if (
    !ids.size ||
    !(await uiConfirm(ctx.t("studioDeleteConfirm", { p0: ids.size })))
  )
    return;
  list.channels = list.channels.filter((ch) => !ids.has(ch.id));
  ctx.model.selectedChannels.clear();
  changed();
  toast(ctx.t("studioDeleted", { p0: ids.size }), true);
};

Object.assign(ctx, {
  $,
  el,
  t,
  core,
  draftHistory,
  uiPrompt,
  uiConfirm,
  current,
  uid,
  toast,
  api,
  json,
  changed,
  persistDraft,
  renderSaveStatus,
  syncDirty,
  applyContent,
  button,
  render,
  updateSelection,
  previewRow,
  maskUrl,
});
ctx.isDemo = !!window.M3UDemo;
ctx.createDraftStore =
  window.M3UDemo?.createDraftStore ||
  ((name) =>
    core.createDraftStore(window.localStorage, "m3u-studio-draft:" + name));
ctx.isLogoAllowed = window.M3UDemo?.isLogo || (() => true);
ctx.transport =
  window.M3UDemo ||
  M3UStudio.createTransport({
    request: window.fetch.bind(window),
    locale: () => window.M3UI18n.locale,
    onUnauthorized: () => ctx.showAuth(false),
    errorLabel: () => String(t("m1")),
  });
ctx.request = window.M3UDemo?.fetch || window.fetch.bind(window);
const controllers = [
  M3UStudio.createTooltips(ctx),
  M3UStudio.createDragging(ctx),
  M3UStudio.createEditor(ctx),
  M3UStudio.createImports(ctx),
  M3UStudio.createSettings(ctx),
  M3UStudio.createSession(ctx),
  M3UStudio.createBatch(ctx),
  M3UStudio.createLogos(ctx),
  M3UStudio.createClipboard(ctx),
  M3UStudio.createSourceChecks(ctx),
];
for (const controller of controllers) Object.assign(ctx, controller);
window.M3UWorkspace = ctx;
for (const controller of controllers) controller.install();
