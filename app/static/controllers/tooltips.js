/* Tooltips: explicit context dependencies; no implicit application-state globals. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else (root.M3UStudio ??= {}).createTooltips = factory;
})(globalThis, function (ctx) {
  "use strict";
  const featureTooltip = ctx.el("span");
  function hideFeatureTooltip() {
    ctx.model.featureTooltipTarget?.removeAttribute("aria-describedby");
    ctx.model.featureTooltipTarget = null;
    if (featureTooltip.matches(":popover-open")) featureTooltip.hidePopover();
  }
  function showFeatureTooltip(target) {
    hideFeatureTooltip();
    ctx.model.featureTooltipTarget = target;
    featureTooltip.textContent = target.getAttribute("aria-label");
    target.setAttribute("aria-describedby", featureTooltip.id);
    featureTooltip.showPopover();
    const anchor = target.getBoundingClientRect(),
      box = featureTooltip.getBoundingClientRect(),
      gap = 8;
    const top = anchor.top - box.height - gap;
    featureTooltip.style.left =
      Math.max(
        gap,
        Math.min(
          innerWidth - box.width - gap,
          anchor.left + (anchor.width - box.width) / 2,
        ),
      ) + "px";
    featureTooltip.style.top =
      Math.max(
        gap,
        Math.min(
          innerHeight - box.height - gap,
          top >= gap ? top : anchor.bottom + gap,
        ),
      ) + "px";
  }
  return {
    hideFeatureTooltip,
    showFeatureTooltip,
    install() {
      featureTooltip.id = "channelFeatureTooltip";
      featureTooltip.setAttribute("role", "tooltip");
      featureTooltip.setAttribute("popover", "manual");
      document.body.append(featureTooltip);
      document.addEventListener("pointerover", (e) => {
        const target = e.target.closest(".channel-feature");
        if (target && target !== ctx.model.featureTooltipTarget)
          ctx.showFeatureTooltip(target);
      });
      document.addEventListener("pointerout", (e) => {
        if (
          ctx.model.featureTooltipTarget &&
          e.target.closest(".channel-feature") ===
            ctx.model.featureTooltipTarget &&
          !ctx.model.featureTooltipTarget.contains(e.relatedTarget)
        )
          ctx.hideFeatureTooltip();
      });
      document.addEventListener("focusin", (e) => {
        if (e.target.matches(".channel-feature"))
          ctx.showFeatureTooltip(e.target);
      });
      document.addEventListener("focusout", (e) => {
        if (e.target === ctx.model.featureTooltipTarget)
          ctx.hideFeatureTooltip();
      });
      document.addEventListener("scroll", ctx.hideFeatureTooltip, true);
      window.addEventListener("resize", ctx.hideFeatureTooltip);
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") ctx.hideFeatureTooltip();
      });
    },
  };
});
