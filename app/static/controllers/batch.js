/* Batch: explicit context dependencies; no implicit application-state globals. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else (root.M3UStudio ??= {}).createBatch = factory;
})(globalThis, function (ctx) {
  "use strict";
  function invalidateBatch() {
    ctx.model.batchCandidate = null;
    ctx.model.batchStats = null;
    ctx.$("#batchApply").disabled = true;
    ctx.$("#batchPreview").replaceChildren();
    syncTransferPresentation();
    window.M3UI18n.setText(
      ctx.$("#batchMessage"),
      window.M3UI18n.dynamic(() => ctx.t("m66")),
    );
  }
  function batchInputFingerprint() {
    return JSON.stringify({
      transferMode: ctx.$("#batchTransferMode").value,
      targetList: ctx.$("#batchTargetList").value,
      targetGroup: ctx.$("#batchTargetGroup").value,
      newGroup: ctx.$("#batchNewGroup").value,
      group: ctx.$("#batchGroup").value,
      epg: ctx.$("#batchEpg").value,
      fcc: ctx.$("#batchFcc").value,
      from: ctx.$("#replaceFrom").value,
      to: ctx.$("#replaceTo").value,
      toggles: batchControls.map(([id]) => ctx.$("#" + id).checked),
      live: ctx.$("#replaceLive").checked,
      catchup: ctx.$("#replaceCatchup").checked,
    });
  }
  const batchControls = [
    [
      "changeTransfer",
      ["batchTransferMode", "batchTargetList", "batchTargetGroup"],
    ],
    ["changeGroup", ["batchGroup"]],
    ["changeEpg", ["batchEpg"]],
    ["changeFcc", ["batchFcc"]],
    [
      "changeReplace",
      ["replaceFrom", "replaceTo", "replaceLive", "replaceCatchup"],
    ],
  ];
  function syncTransferPresentation() {
    const active = ctx.$("#changeTransfer").checked,
      move = ctx.$("#batchTransferMode").value === "move";
    for (const [id] of batchControls) {
      const input = ctx.$("#" + id);
      input
        .closest("section")
        .classList.toggle("is-selected", input.checked && !input.disabled);
    }
    ctx.$("#batchTransferNotice").hidden = !active;
    ctx
      .$("#batchTransferNotice")
      .closest("section")
      .classList.toggle("is-move", active && move);
    window.M3UI18n.setText(
      ctx.$("#batchTransferNotice"),
      window.M3UI18n.dynamic(() => ctx.t(move ? "m371" : "m370")),
    );
    window.M3UI18n.setText(
      ctx.$("#batchApply"),
      window.M3UI18n.dynamic(() => ctx.t("m233")),
    );
  }
  function syncTransferFields() {
    const active = ctx.$("#changeTransfer").checked;
    ctx.$("#batchNewGroupLabel").hidden =
      ctx.$("#batchTargetGroup").value !== "new";
    ctx.$("#batchNewGroup").disabled =
      !active || ctx.$("#batchTargetGroup").value !== "new";
    ctx.$("#changeGroup").disabled = active;
    ctx.$("#batchGroup").disabled = active || !ctx.$("#changeGroup").checked;
  }
  function populateTargetGroups() {
    const target = ctx.model.state.lists.find(
      (l) => l.id === ctx.$("#batchTargetList").value,
    );
    const option = (value, text) => {
      const o = ctx.el("option", text);
      o.value = value;
      return o;
    };
    ctx.$("#batchTargetGroup").replaceChildren(
      option(
        "keep",
        window.M3UI18n.dynamic(() => ctx.t("m364")),
      ),
      ...(target?.groups || []).map((g) => option("group:" + g, g)),
      option(
        "new",
        window.M3UI18n.dynamic(() => ctx.t("m365")),
      ),
    );
    ctx.$("#batchNewGroup").value = "";
    syncTransferFields();
    invalidateBatch();
  }
  return {
    invalidateBatch,
    batchInputFingerprint,
    syncTransferPresentation,
    syncTransferFields,
    populateTargetGroups,
    install() {
      for (const [toggle, fields] of batchControls)
        ctx.$("#" + toggle).onchange = () => {
          fields.forEach(
            (id) => (ctx.$("#" + id).disabled = !ctx.$("#" + toggle).checked),
          );
          ctx.syncTransferFields();
          ctx.invalidateBatch();
        };
      ctx.$("#batchTransferMode").onchange = () => {
        ctx.invalidateBatch();
      };
      ctx.$("#batchTargetList").onchange = ctx.populateTargetGroups;
      ctx.$("#batchTargetGroup").onchange = () => {
        ctx.syncTransferFields();
        ctx.invalidateBatch();
      };
      ctx.$("#batchForm").addEventListener("input", ctx.invalidateBatch);
      ctx.$("#batchEdit").onclick = () => {
        ctx.model.batchContext = {
          listId: ctx.model.selected,
          ids: [...ctx.model.selectedChannels],
          fingerprint: ctx.core.fingerprint(ctx.model.state),
        };
        ctx.$("#batchForm").reset();
        batchControls.forEach(([toggle, fields]) =>
          fields.forEach((id) => (ctx.$("#" + id).disabled = true)),
        );
        ctx.$("#batchTargetList").replaceChildren(
          ...ctx.model.state.lists
            .filter((l) => l.id !== ctx.model.selected)
            .map((l) => {
              const o = ctx.el("option", l.name);
              o.value = l.id;
              return o;
            }),
        );
        ctx.populateTargetGroups();
        ctx.$("#batchGroup").replaceChildren(
          ...ctx.current().groups.map((g) => {
            const o = ctx.el("option", g);
            o.value = g;
            return o;
          }),
        );
        window.M3UI18n.setText(
          ctx.$("#batchScope"),
          window.M3UI18n.dynamic(() =>
            ctx.t("m67", {
              p0: ctx.current().name,
              p1: ctx.model.batchContext.ids.length,
            }),
          ),
        );
        ctx.invalidateBatch();
        ctx.$("#batchDialog").showModal();
      };
      ctx.$("#batchForm").onsubmit = async (e) => {
        e.preventDefault();
        ctx.invalidateBatch();
        const changes = {},
          inputFingerprint = ctx.batchInputFingerprint(),
          context = ctx.model.batchContext;
        if (ctx.$("#changeTransfer").checked) {
          if (!ctx.$("#batchTargetList").value) return ctx.toast(ctx.t("m361"));
          changes.transfer = {
            mode: ctx.$("#batchTransferMode").value,
            listId: ctx.$("#batchTargetList").value,
          };
          const targetGroup = ctx.$("#batchTargetGroup").value;
          if (targetGroup !== "keep") {
            const name =
              targetGroup === "new"
                ? ctx.$("#batchNewGroup").value.trim()
                : targetGroup.slice(6);
            if (!name || name.length > 200 || /[,"\r\n]/.test(name))
              return ctx.toast(ctx.t("m367"));
            changes.transfer.group = name;
          }
        }

        if (!changes.transfer && ctx.$("#changeGroup").checked)
          changes.group = ctx.$("#batchGroup").value;
        if (ctx.$("#changeEpg").checked)
          changes.epg = ctx.$("#batchEpg").value.trim();
        if (ctx.$("#changeFcc").checked)
          changes.fcc_url = ctx.$("#batchFcc").value.trim();
        if (ctx.$("#changeReplace").checked) {
          const fields = [];
          if (ctx.$("#replaceLive").checked) fields.push("url");
          if (ctx.$("#replaceCatchup").checked) fields.push("catchup_url");
          if (fields.length !== 1) return ctx.toast(ctx.t("m68"));
          changes.replace = {
            from: ctx.$("#replaceFrom").value,
            to: ctx.$("#replaceTo").value,
            fields,
          };
        }
        if (!Object.keys(changes).length) return ctx.toast(ctx.t("m69"));
        const btn = ctx.$("#batchPreviewButton");
        btn.disabled = true;
        try {
          if (
            ctx.core.fingerprint(ctx.model.state) !==
            ctx.model.batchContext.fingerprint
          )
            throw Error(ctx.t("m70"));
          const { draft, count, total, skipped, transfers } =
            ctx.core.batchEdit(
              ctx.model.state,
              ctx.model.batchContext.listId,
              ctx.model.batchContext.ids,
              changes,
            );
          if (!count) {
            window.M3UI18n.setText(
              ctx.$("#batchMessage"),
              ctx.t("m322", { p0: total, p1: 0, p2: skipped, p3: "" }),
            );
            return;
          }
          const checked = await ctx.api(
            "/api/validate",
            ctx.json("POST", draft),
          );
          if (!ctx.$("#batchDialog").open || ctx.model.batchContext !== context)
            return;
          // Form input while validation was pending makes the returned preview stale.
          if (inputFingerprint !== ctx.batchInputFingerprint()) {
            ctx.toast(ctx.t("m72"));
            return;
          }
          ctx.model.batchCandidate = checked;
          ctx.model.batchStats = { count, total, skipped };
          const before = ctx.current(),
            beforeById = new Map(before.channels.map((ch) => [ch.id, ch])),
            ids = new Set(ctx.model.batchContext.ids),
            after = checked.lists.find(
              (l) => l.id === ctx.model.batchContext.listId,
            );
          let displayed = 0;
          if (changes.transfer) {
            const target = checked.lists.find(
                (l) => l.id === changes.transfer.listId,
              ),
              targetById = new Map(target.channels.map((ch) => [ch.id, ch]));
            for (const pair of transfers) {
              if (displayed++ >= 100) continue;
              const ch = targetById.get(pair.targetId);
              ctx.$("#batchPreview").append(
                ctx.previewRow(
                  ch.name,
                  window.M3UI18n.dynamic(() =>
                    ctx.t("m362", {
                      p0:
                        changes.transfer.mode === "move"
                          ? ctx.t("m357")
                          : ctx.t("m358"),
                      p1: before.name,
                      p2: target.name,
                      p3: ch.group,
                    }),
                  ),
                ),
              );
            }
          }
          for (const ch of changes.transfer ? [] : after.channels) {
            const old = beforeById.get(ch.id);
            if (
              !ids.has(ch.id) ||
              !["group", "epg", "fcc_url", "url", "catchup_url"].some(
                (key) => old[key] !== ch[key],
              )
            )
              continue;
            if (displayed++ >= 100) continue;
            const descriptions = () => {
              const lines = [];
              for (const key of [
                "group",
                "epg",
                "fcc_url",
                "url",
                "catchup_url",
              ])
                if (old[key] !== ch[key])
                  lines.push(
                    `${{ group: ctx.t("m73"), epg: "EPG", fcc_url: "FCC", url: ctx.t("m74"), catchup_url: ctx.t("m20") }[key]}${window.M3UI18n.language === "zh" ? "：" : ": "}${ctx.maskUrl(old[key]) || ctx.t("m75")} → ${ctx.maskUrl(ch[key]) || ctx.t("m75")}`,
                  );
              return lines.join("\n");
            };
            ctx
              .$("#batchPreview")
              .append(
                ctx.previewRow(ch.name, window.M3UI18n.dynamic(descriptions)),
              );
          }
          window.M3UI18n.setText(
            ctx.$("#batchMessage"),
            window.M3UI18n.dynamic(() =>
              ctx.t("m322", {
                p0: total,
                p1: count,
                p2: skipped,
                p3: displayed > 100 ? ctx.t("m76") : "",
              }),
            ),
          );
          ctx.$("#batchApply").disabled = false;
        } catch (err) {
          ctx.toast(window.M3UI18n.error(err.message));
        } finally {
          btn.disabled = false;
        }
      };
      ctx.$("#batchApply").onclick = () => {
        if (!ctx.model.batchCandidate) return;
        if (
          ctx.core.fingerprint(ctx.model.state) !==
          ctx.model.batchContext.fingerprint
        )
          return ctx.toast(ctx.t("m78"));
        ctx.model.state.lists = ctx.model.batchCandidate.lists;
        ctx.model.state.epg = ctx.model.batchCandidate.epg;
        const remainingIds = new Set(ctx.current().channels.map((ch) => ch.id));
        ctx.model.selectedChannels = new Set(
          [...ctx.model.selectedChannels].filter((id) => remainingIds.has(id)),
        );
        ctx.$("#batchDialog").close();
        ctx.changed();
        ctx.toast(
          ctx.t("m323", {
            p0: ctx.model.batchStats.count,
            p1: ctx.model.batchStats.skipped,
          }),
          true,
        );
      };
    },
  };
});
