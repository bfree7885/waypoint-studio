/**
 * @deprecated Use WDS.researchIntegrity — backward-compatible alias
 */
(function (global) {
  "use strict";
  function attach() {
    var RI = global.WDS && global.WDS.researchIntegrity;
    if (!RI) return false;
    global.WDS.provenance = {
      KINDS: RI.KINDS,
      SPECIES_STATUS: RI.SPECIES_STATUS,
      GROUP_LABELS: RI.GROUP_LABELS,
      kindMeta: RI.kindMeta,
      humanizeSpeciesStatus: RI.humanizeSpeciesStatus,
      groupLabel: RI.groupLabel,
      readinessBandLabel: RI.readinessBandLabel,
      renderBadge: RI.renderBadge,
      renderStrip: RI.renderStrip,
      dashboardTag: RI.dashboardTag,
      citizenScienceNote: RI.citizenScienceNote
    };
    return true;
  }
  if (!attach()) {
    var attempts = 0;
    var timer = setInterval(function () {
      if (attach() || ++attempts > 120) clearInterval(timer);
    }, 10);
  }
})(window);
