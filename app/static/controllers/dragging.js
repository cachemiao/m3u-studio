/* Dragging: explicit context dependencies; no implicit application-state globals. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else (root.M3UStudio ??= {}).createDragging = factory;
})(globalThis, function (ctx) {
  "use strict";
  function clearDragMarks() {
    document
      .querySelectorAll(".dragover,.touch-dragging")
      .forEach((n) => n.classList.remove("dragover", "touch-dragging"));
  }
  function finishChannelDrag() {
    if (ctx.model.channelDrag) {
      cancelAnimationFrame(ctx.model.channelDrag.frame);
      ctx.model.channelDrag.ghost.remove();
      ctx.model.channelDrag = null;
    }
    ctx.model.dragId = null;
    document
      .querySelectorAll(
        ".channel.drag-source,.channel.drop-before,.channel.drop-after",
      )
      .forEach((n) =>
        n.classList.remove("drag-source", "drop-before", "drop-after"),
      );
    clearDragMarks();
  }
  function beginChannelDrag(id, event) {
    finishChannelDrag();
    ctx.hideFeatureTooltip();
    ctx.model.sidebarDrag = null;
    ctx.model.dragId = id;
    const list = ctx.current(),
      ids = ctx.model.selectedChannels.has(id)
        ? list.groups.flatMap((g) =>
            list.channels
              .filter(
                (c) => c.group === g && ctx.model.selectedChannels.has(c.id),
              )
              .map((c) => c.id),
          )
        : [id];
    const ghost = ctx.el("div", undefined, "channel-drag-bundle");
    ghost.setAttribute("aria-hidden", "true");
    ghost.append(
      ctx.el("strong", ctx.t("uiDraggingChannels", { p0: ids.length })),
    );
    const moved = new Set(ids);
    for (const ch of ids
      .slice(0, 3)
      .map((id) => list.channels.find((c) => c.id === id)))
      ghost.append(ctx.el("div", ch.name, "drag-bundle-name"));
    if (ids.length > 3)
      ghost.append(
        ctx.el("small", ctx.t("uiMoreDraggedChannels", { p0: ids.length - 3 })),
      );
    document.body.append(ghost);
    document
      .querySelectorAll("#channels .channel")
      .forEach((row) =>
        row.classList.toggle("drag-source", moved.has(row.dataset.id)),
      );
    ctx.model.channelDrag = {
      ids,
      moved,
      listId: ctx.model.selected,
      ghost,
      x: event.clientX,
      y: event.clientY,
      target: null,
      frame: 0,
      time: 0,
    };
    updateChannelDrag(event.clientX, event.clientY);
    ctx.model.channelDrag.frame = requestAnimationFrame(scrollChannelDrag);
  }
  function updateChannelDrag(x, y) {
    const drag = ctx.model.channelDrag;
    if (!drag) return;
    drag.x = x;
    drag.y = y;
    drag.ghost.style.left =
      Math.max(8, Math.min(innerWidth - drag.ghost.offsetWidth - 8, x + 18)) +
      "px";
    drag.ghost.style.top =
      Math.max(8, Math.min(innerHeight - drag.ghost.offsetHeight - 8, y + 18)) +
      "px";
    document
      .querySelectorAll(".channel.drop-before,.channel.drop-after")
      .forEach((n) => n.classList.remove("drop-before", "drop-after"));
    drag.target = null;
    const scroller = ctx.$("#channelScroll"),
      box = scroller.getBoundingClientRect(),
      head = ctx.$(".channel-table-head").getBoundingClientRect();
    if (x < box.left || x > box.right || y < box.top || y > box.bottom) return;
    const hitY = Math.max(
      Math.min(box.bottom - 2, y),
      Math.min(box.bottom - 2, head.bottom + 2),
    );
    let hit = document.elementFromPoint(x, hitY)?.closest(".channel");
    if (!hit) {
      const rows = [...ctx.$("#channels").children].filter((n) => {
        const r = n.getBoundingClientRect();
        return r.bottom > head.bottom && r.top < box.bottom;
      });
      hit = y < box.top + box.height / 2 ? rows[0] : rows.at(-1);
    }
    if (!hit || drag.moved.has(hit.dataset.id)) return;
    const r = hit.getBoundingClientRect(),
      after = hitY > r.top + r.height / 2;
    drag.target = { id: hit.dataset.id, after };
    hit.classList.add(after ? "drop-after" : "drop-before");
  }
  function scrollChannelDrag(time) {
    const drag = ctx.model.channelDrag;
    if (!drag) return;
    const box = ctx.$("#channelScroll").getBoundingClientRect(),
      head = ctx.$(".channel-table-head").getBoundingClientRect(),
      edge = 56,
      top = Math.max(box.top, head.bottom);
    if (
      drag.x >= box.left &&
      drag.x <= box.right &&
      drag.y >= box.top - 24 &&
      drag.y <= box.bottom + 24
    ) {
      const direction =
        drag.y < top + edge
          ? -Math.min(1, (top + edge - drag.y) / edge)
          : drag.y > box.bottom - edge
            ? Math.min(1, (drag.y - box.bottom + edge) / edge)
            : 0;
      const elapsed = drag.time ? Math.min(32, time - drag.time) : 16;
      ctx.$("#channelScroll").scrollTop += (direction * 700 * elapsed) / 1000;
      updateChannelDrag(drag.x, drag.y);
    }
    drag.time = time;
    drag.frame = requestAnimationFrame(scrollChannelDrag);
  }
  function relocate(id, targetId, targetGroup, after = false) {
    const list = ctx.current(),
      ids =
        ctx.model.channelDrag?.ids.includes(id) &&
        ctx.model.channelDrag.listId === ctx.model.selected
          ? ctx.model.channelDrag.ids
          : [id],
      movedIds = new Set(ids);
    const moved = ids
      .map((key) => list?.channels.find((c) => c.id === key))
      .filter(Boolean);
    if (!moved.length || movedIds.has(targetId)) return;
    const target = list.channels.find((c) => c.id === targetId);
    if (!target && !list.groups.includes(targetGroup)) return;
    const destination = target ? target.group : targetGroup,
      remaining = list.channels.filter((c) => !movedIds.has(c.id));
    const index = target
      ? remaining.indexOf(target) + (after ? 1 : 0)
      : remaining.length;
    remaining.splice(index, 0, ...moved);
    if (
      remaining.every((ch, i) => ch === list.channels[i]) &&
      moved.every((ch) => ch.group === destination)
    )
      return;
    moved.forEach((ch) => (ch.group = destination));
    list.channels = remaining;
    ctx.changed();
  }
  function bindTouchDrag(handle, id, enabled) {
    let active = false;
    const stop = () => {
      if (!active) return;
      active = false;
      finishChannelDrag();
    };
    handle.onpointerdown = (e) => {
      if (!enabled || e.pointerType === "mouse") return;
      e.preventDefault();
      active = true;
      handle.setPointerCapture?.(e.pointerId);
      beginChannelDrag(id, e);
    };
    handle.onpointermove = (e) => {
      if (!active || !ctx.model.channelDrag) return;
      e.preventDefault();
      updateChannelDrag(e.clientX, e.clientY);
      document
        .querySelectorAll("#groups .dragover")
        .forEach((n) => n.classList.remove("dragover"));
      const hit = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest("#groups .nav-item[data-group]");
      if (hit) {
        ctx.model.channelDrag.target = { group: hit.dataset.group };
        hit.classList.add("dragover");
      }
    };
    handle.onpointerup = (e) => {
      if (!active || !ctx.model.channelDrag) return;
      e.preventDefault();
      const target = ctx.model.channelDrag.target;
      if (target) relocate(id, target.id, target.group, target.after);
      stop();
    };
    handle.onpointercancel = stop;
    handle.onlostpointercapture = () => {
      if (active) stop();
    };
  }
  function reorderSidebar(kind, id, targetId, after = false) {
    const items =
      kind === "list" ? ctx.model.state.lists : ctx.current()?.groups;
    if (!items || id === targetId) return;
    const key = (item) => (kind === "list" ? item.id : item);
    const from = items.findIndex((item) => key(item) === id);
    if (from < 0 || !items.some((item) => key(item) === targetId)) return;
    const [moved] = items.splice(from, 1);
    const to = items.findIndex((item) => key(item) === targetId);
    items.splice(to + (after ? 1 : 0), 0, moved);
    ctx.changed();
  }
  function sidebarAfter(row, x, y) {
    const box = row.getBoundingClientRect();
    return matchMedia("(max-width:800px)").matches
      ? x > box.left + box.width / 2
      : y > box.top + box.height / 2;
  }
  function bindSidebarDrag(row, kind, id) {
    row.dataset.kind = kind;
    row.dataset.key = id;
    const handle = ctx.el("span", "⠿", "nav-handle");
    window.M3UI18n.setAttribute(
      handle,
      "title",
      window.M3UI18n.dynamic(() =>
        kind === "list" ? ctx.t("m24") : ctx.t("m25"),
      ),
    );
    handle.draggable = true;
    row.prepend(handle);
    handle.ondragstart = (e) => {
      ctx.model.dragId = null;
      ctx.model.sidebarDrag = { kind, id };
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", id);
    };
    handle.ondragend = () => {
      ctx.model.sidebarDrag = null;
      clearDragMarks();
    };
    row.ondragover = (e) => {
      if (
        ctx.model.sidebarDrag?.kind === kind ||
        (ctx.model.dragId && kind === "group")
      ) {
        e.preventDefault();
        row.classList.add("dragover");
      }
    };
    row.ondragleave = () => row.classList.remove("dragover");
    row.ondrop = (e) => {
      e.preventDefault();
      const nav = ctx.model.sidebarDrag,
        channel = ctx.model.dragId;
      ctx.model.sidebarDrag = null;
      clearDragMarks();
      if (nav?.kind === kind)
        reorderSidebar(
          kind,
          nav.id,
          id,
          sidebarAfter(row, e.clientX, e.clientY),
        );
      else if (channel && kind === "group") relocate(channel, null, id);
      finishChannelDrag();
    };
    let active = false,
      target = null,
      frame = null,
      lastX = 0,
      lastY = 0;
    const scroller = kind === "list" ? ctx.$("#lists") : ctx.$("#groups");
    const stop = () => {
      active = false;
      cancelAnimationFrame(frame);
      clearDragMarks();
    };
    const autoScroll = () => {
      if (!active) return;
      const box = scroller.getBoundingClientRect();
      if (matchMedia("(max-width:800px)").matches)
        scroller.scrollLeft +=
          lastX < box.left + 30 ? -8 : lastX > box.right - 30 ? 8 : 0;
      else
        scroller.scrollTop +=
          lastY < box.top + 30 ? -8 : lastY > box.bottom - 30 ? 8 : 0;
      frame = requestAnimationFrame(autoScroll);
    };
    handle.onpointerdown = (e) => {
      if (e.pointerType === "mouse") return;
      e.preventDefault();
      active = true;
      target = null;
      lastX = e.clientX;
      lastY = e.clientY;
      handle.setPointerCapture?.(e.pointerId);
      row.classList.add("touch-dragging");
      frame = requestAnimationFrame(autoScroll);
    };
    handle.onpointermove = (e) => {
      if (!active) return;
      e.preventDefault();
      lastX = e.clientX;
      lastY = e.clientY;
      clearDragMarks();
      row.classList.add("touch-dragging");
      target = null;
      const hit = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest(".nav-item");
      if (hit?.dataset.kind === kind && hit.dataset.key !== id) {
        target = {
          id: hit.dataset.key,
          after: sidebarAfter(hit, e.clientX, e.clientY),
        };
        hit.classList.add("dragover");
      }
    };
    handle.onpointerup = (e) => {
      if (!active) return;
      e.preventDefault();
      const drop = target;
      stop();
      if (drop) reorderSidebar(kind, id, drop.id, drop.after);
    };
    handle.onpointercancel = stop;
    handle.onlostpointercapture = () => {
      if (active) stop();
    };
  }
  return {
    clearDragMarks,
    finishChannelDrag,
    beginChannelDrag,
    updateChannelDrag,
    scrollChannelDrag,
    relocate,
    bindTouchDrag,
    reorderSidebar,
    sidebarAfter,
    bindSidebarDrag,
    install() {
      ctx.$("#channelScroll").addEventListener("dragover", (event) => {
        if (!ctx.model.channelDrag) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        ctx.updateChannelDrag(event.clientX, event.clientY);
      });
      ctx.$("#channelScroll").addEventListener("drop", (event) => {
        if (!ctx.model.channelDrag) return;
        event.preventDefault();
        ctx.updateChannelDrag(event.clientX, event.clientY);
        const target = ctx.model.channelDrag.target;
        if (target)
          ctx.relocate(ctx.model.dragId, target.id, undefined, target.after);
        ctx.finishChannelDrag();
      });
      document.addEventListener("dragover", (event) => {
        if (ctx.model.channelDrag)
          ctx.updateChannelDrag(event.clientX, event.clientY);
      });
      document.addEventListener("drop", () => {
        if (ctx.model.channelDrag) ctx.finishChannelDrag();
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && ctx.model.channelDrag)
          ctx.finishChannelDrag();
      });
    },
  };
});
