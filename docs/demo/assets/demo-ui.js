/* Demo-only presentation and entry points. The production app is unchanged. */
window.M3UDemo.installUI = function (ctx) {
  const $ = (s) => document.querySelector(s),
    text = (n, key) => M3UI18n.setText(n, M3UI18n.t(key));
  let sampleContext = null;
  const requestedLanguage = new URLSearchParams(location.search).get("lang");
  if (["zh", "en"].includes(requestedLanguage))
    M3UI18n.setLanguage(requestedLanguage);
  function openSamples(create = false) {
    sampleContext = {
      create,
      listId: ctx.model.selected,
      fingerprint: ctx.core.fingerprint(ctx.model.state),
    };
    $("#demoSampleChoice").value = "0";
    $("#demoSampleApply").disabled = false;
    text($("#demoSampleApply"), create ? "demoSampleNew" : "demoSampleAdd");
    $("#demoSampleDialog").showModal();
  }
  $("#import").onclick = () => openSamples(false);
  $("#importNewList").onclick = () => openSamples(true);
  $("#demoSampleApply").onclick = async () => {
    const context = sampleContext,
      button = $("#demoSampleApply");
    button.disabled = true;
    try {
      if (ctx.core.fingerprint(ctx.model.state) !== context.fingerprint)
        throw Error(ctx.t("m383"));
      const sample = M3UDemo.sample(Number($("#demoSampleChoice").value));
      const result = ctx.core.importChannels(ctx.model.state, sample, {
        create: context.create,
        listId: context.listId,
        id: context.create ? ctx.uid() : undefined,
        name: sample.name,
      });
      const checked = await M3UDemo.api(
        "/api/validate",
        ctx.json("POST", result.draft),
      );
      if (ctx.core.fingerprint(ctx.model.state) !== context.fingerprint)
        throw Error(ctx.t("m383"));
      ctx.model.state.lists = checked.lists;
      ctx.model.state.epg = checked.epg;
      ctx.model.selected = result.listId;
      ctx.model.group = "";
      ctx.changed();
      $("#demoSampleDialog").close();
      ctx.toast(ctx.t("m36", { p0: sample.channels.length }));
    } catch (error) {
      ctx.toast(error.message);
    } finally {
      button.disabled = false;
    }
  };
  $("#demoSampleCancel").onclick = $("#demoSampleCancelFooter").onclick = () =>
    $("#demoSampleDialog").close();
  $("#demoReset").onclick = () => location.reload();
  const disabled = [
    "backup",
    "backupArchive",
    "headerVersion",
    "exportLogos",
    "restore",
    "restoreFile",
    "playlistFile",
    "logoFile",
    "managerLogoFile",
    "replaceLogoFile",
    "userMenuButton",
    "accountSettings",
    "userAccountSettings",
    "logout",
    "managerUpload",
    "uploadLogoButton",
    "tabUpload",
    "tabLink",
    "playlistDrop",
  ];
  for (const id of disabled) {
    const n = $("#" + id);
    if (!n) continue;
    n.disabled = true;
    n.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };
  }
  for (const n of document.querySelectorAll('input[type="file"]')) {
    n.disabled = true;
    n.hidden = true;
  }
  for (const n of document.querySelectorAll(
    "#authScreen input,#accountDialog input",
  )) {
    n.disabled = true;
    n.autocomplete = "off";
  }
  for (const id of ["playlistText", "playlistUrl", "logoLink"])
    $("#" + id).disabled = true;
  for (const id of ["importForm", "logoLinkForm", "accountForm"])
    $("#" + id).onsubmit = (event) => {
      event.preventDefault();
      ctx.toast(ctx.t("demoNoExternal"));
    };
  const blockFiles = (event) => {
    if (event.dataTransfer?.files?.length) {
      event.preventDefault();
      event.stopImmediatePropagation();
      ctx.toast(ctx.t("demoNoExternal"));
    }
  };
  document.addEventListener("drop", blockFiles, true);
  document.addEventListener(
    "dragover",
    (event) => {
      if (event.dataTransfer?.types.includes("Files")) event.preventDefault();
    },
    true,
  );
  const originalSettings = $("#settings").onclick;
  $("#settings").onclick = () => {
    originalSettings();
    $("#settingsDialog h2").removeAttribute("data-i18n");
    M3UI18n.setText(
      $("#settingsDialog h2"),
      M3UI18n.dynamic(() => ctx.t("demoLinksTitle")),
    );
  };
  for (const id of ["channelForm", "batchForm"])
    $("#" + id).autocomplete = "off";
  $('#channelForm [name="logo"]').readOnly = true;
  const linksHint = $("#settingsDialog .hint");
  linksHint.dataset.i18n = "demoLinksHint";
  text(linksHint, "demoLinksHint");
  const prefHint = $("#preferencesDialog > .hint");
  prefHint.dataset.i18n = "demoPrefHint";
  text(prefHint, "demoPrefHint");
  function labels() {
    document.title =
      M3UI18n.language === "zh"
        ? "M3U Studio · 在线体验"
        : "M3U Studio · Live demo";
    for (const id of ["import", "importNewList"])
      M3UI18n.setText(
        $("#" + id),
        M3UI18n.dynamic(() => ctx.t("demoSamples")),
      );
    for (const node of document.querySelectorAll("[data-demo-i18n]"))
      text(node, node.dataset.demoI18n);
    const selects = $("#demoSampleChoice").options;
    selects[0].text = ctx.t("demoSampleOne");
    selects[1].text = ctx.t("demoSampleTwo");
  }
  labels();
  document.addEventListener("DOMContentLoaded", labels);
  window.addEventListener("m3u-language-change", labels);
  function measure() {
    const height =
      $("#demoBanner").getBoundingClientRect().height +
      $("#demoTip").getBoundingClientRect().height;
    document.documentElement.style.setProperty(
      "--demo-top-height",
      height + "px",
    );
  }
  const size = new ResizeObserver(measure);
  size.observe($("#demoBanner"));
  size.observe($("#demoTip"));
  measure();
};
window.M3UDemo.installUI(window.M3UWorkspace);
