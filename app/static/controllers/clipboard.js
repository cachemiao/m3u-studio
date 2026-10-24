/* Clipboard: explicit context dependencies; no implicit application-state globals. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else (root.M3UStudio ??= {}).createClipboard = factory;
})(globalThis, function (ctx) {
  "use strict";
  function legacyCopy(text) {
    const previous = document.activeElement,
      selection = window.getSelection(),
      ranges = [];
    if (selection)
      for (let i = 0; i < selection.rangeCount; i++)
        ranges.push(selection.getRangeAt(i).cloneRange());
    const area = ctx.el("textarea");
    area.className = "clipboard-helper";
    area.value = text;
    const dialogs = [...document.querySelectorAll("dialog[open]")];
    (dialogs.at(-1) || document.body).append(area);
    let ok = false;
    try {
      area.focus({ preventScroll: true });
      area.select();
      ok = document.execCommand("copy");
    } finally {
      area.remove();
      previous?.focus({ preventScroll: true });
      if (selection) {
        selection.removeAllRanges();
        for (const range of ranges)
          try {
            selection.addRange(range);
          } catch {}
      }
    }
    return ok;
  }
  async function writeClipboard(text) {
    if (window.isSecureContext && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {}
    }
    try {
      return legacyCopy(text);
    } catch {
      return false;
    }
  }
  async function copySubscription(text, copyButton = null) {
    const copied = await writeClipboard(text);
    if (!copied) ctx.toast(ctx.t("m119"));
    if (copied && copyButton) {
      clearTimeout(copyButton.copyTimer);
      window.M3UI18n.setText(copyButton, ctx.t("uiCopied"));
      copyButton.classList.add("is-copied");
      copyButton.copyTimer = setTimeout(() => {
        window.M3UI18n.setText(copyButton, ctx.t("m38"));
        copyButton.classList.remove("is-copied");
      }, 1500);
    }
  }
  function createCopyableStream(url) {
    const stream = ctx.el("div", undefined, "stream"),
      address = ctx.el("span", url, "stream-url"),
      feedback = ctx.el("span", undefined, "stream-copy-feedback");
    stream.tabIndex = 0;
    stream.setAttribute("role", "button");
    feedback.setAttribute("role", "status");
    feedback.setAttribute("aria-live", "polite");
    window.M3UI18n.setAttribute(
      stream,
      "title",
      window.M3UI18n.dynamic(() => ctx.t("uiCopyStreamHint") + "\n" + url),
    );
    window.M3UI18n.setAttribute(
      stream,
      "aria-label",
      window.M3UI18n.dynamic(() => ctx.t("uiCopyStreamHint") + ": " + url),
    );
    stream.append(address, feedback);
    let start = null,
      dragged = false,
      busy = false,
      timer;
    stream.addEventListener("pointerdown", (event) => {
      if (event.button === 0) {
        start = { x: event.clientX, y: event.clientY };
        dragged = false;
      }
    });
    stream.addEventListener("pointermove", (event) => {
      if (
        start &&
        event.buttons & 1 &&
        Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5
      )
        dragged = true;
    });
    async function copy() {
      if (busy) return;
      busy = true;
      clearTimeout(timer);
      try {
        const copied = await writeClipboard(url);
        if (!stream.isConnected) return;
        window.M3UI18n.setText(
          feedback,
          ctx.t(copied ? "uiCopied" : "uiCopyStreamFailed"),
        );
        stream.classList.toggle("is-copied", copied);
        stream.classList.toggle("is-copy-error", !copied);
        timer = setTimeout(
          () => {
            window.M3UI18n.setText(feedback, "");
            stream.classList.remove("is-copied", "is-copy-error");
          },
          copied ? 1500 : 4000,
        );
      } finally {
        busy = false;
      }
    }
    stream.addEventListener("click", (event) => {
      event.stopPropagation();
      const selection = window.getSelection();
      if (
        dragged ||
        (selection &&
          !selection.isCollapsed &&
          selection.rangeCount &&
          selection.getRangeAt(0).intersectsNode(address))
      )
        return;
      copy();
    });
    stream.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        copy();
      }
    });
    return stream;
  }
  return {
    legacyCopy,
    writeClipboard,
    copySubscription,
    createCopyableStream,
    install() {},
  };
});
