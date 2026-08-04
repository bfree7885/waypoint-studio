/**
 * Waypoint Scenes — Portfolio Health · Workspace UI
 * Presentation only. Analysis lives in health-engine / health-compare / health-store.
 */
(function (global) {
  "use strict";

  var Catalog = function () {
    return global.WaypointScenesHealthCatalog;
  };
  var StoreApi = function () {
    return global.WaypointScenesHealthStore;
  };
  var Compare = function () {
    return global.WaypointScenesHealthCompare;
  };
  var PortfolioEngine = function () {
    return global.WaypointScenesPortfolioEngine;
  };
  var AssistSessions = function () {
    return global.WaypointScenesAssistantSessions;
  };
  var CoachStore = function () {
    return global.WaypointScenesCoachStore;
  };
  var BuilderSessions = function () {
    return global.WaypointScenesBuilderSessions;
  };
  var PL = function () {
    return global.WaypointPhotoLibraryStore;
  };

  var healthStore = null;
  var portfolioEngine = null;
  var assistEngine = null;
  var coachEngine = null;
  var builderEngine = null;
  var libraryImages = [];
  var analysis = null;
  var activeInsightId = null;
  var pendingRemove = null;
  var focusReturnEl = null;

  var state = {
    view: "scope" // scope | results | detail | compare
  };

  function $(id) {
    return document.getElementById(id);
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setStatus(msg, isError) {
    var el = $("pfh-status");
    if (!el) return;
    if (!msg) {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    el.hidden = false;
    el.textContent = msg;
    el.classList.toggle("is-error", !!isError);
  }

  function setProgress(on, text) {
    var el = $("pfh-progress");
    var t = $("pfh-progress-text");
    if (!el) return;
    el.hidden = !on;
    if (t && text) t.textContent = text;
  }

  function libraryById(id) {
    for (var i = 0; i < libraryImages.length; i++) if (libraryImages[i].id === id) return libraryImages[i];
    return null;
  }

  function thumbHtml(img, alt) {
    if (img && img.media && img.media.thumbnailDataUrl) {
      return (
        '<img src="' +
        esc(img.media.thumbnailDataUrl) +
        '" alt="' +
        esc(alt || img.filename || "Photograph") +
        '" loading="lazy" decoding="async">'
      );
    }
    return (
      '<div class="pf-thumb-fallback" role="img" aria-label="' +
      esc(alt || (img && img.filename) || "Photograph") +
      '">' +
      esc((img && img.filename) || "No preview") +
      "</div>"
    );
  }

  function confLabel(c) {
    return Catalog().CONFIDENCE[c] || Catalog().CONFIDENCE.lower;
  }

  function loadLibrary() {
    libraryImages = [];
    try {
      if (PL() && PL().loadIndex) libraryImages = PL().loadIndex() || [];
    } catch (e) {
      libraryImages = [];
    }
  }

  function portfolios() {
    return portfolioEngine ? portfolioEngine.list() : [];
  }

  function selectedPortfolioIds() {
    var sel = $("pfh-portfolios");
    if (!sel) return [];
    return Array.prototype.slice
      .call(sel.selectedOptions || [])
      .map(function (o) {
        return o.value;
      })
      .filter(Boolean);
  }

  function fillPortfolios() {
    var sel = $("pfh-portfolios");
    var empty = $("pfh-empty-portfolios");
    var list = portfolios();
    if (!sel) return;
    sel.innerHTML = list
      .map(function (p) {
        return (
          '<option value="' +
          esc(p.id) +
          '">' +
          esc(p.title || "Untitled") +
          " (" +
          (p.imageIds || []).length +
          ")</option>"
        );
      })
      .join("");
    if (empty) empty.hidden = list.length > 0;
    if (list.length === 1) sel.selectedIndex = 0;
  }

  function fillDimensions() {
    var wrap = $("pfh-dim-list");
    if (!wrap) return;
    var enabled = healthStore.getState().enabledDimensions;
    wrap.innerHTML = Catalog()
      .DIMENSIONS.map(function (d) {
        var checked = enabled.indexOf(d.id) >= 0 ? " checked" : "";
        return (
          '<label><input type="checkbox" data-dim="' +
          esc(d.id) +
          '"' +
          checked +
          "> " +
          esc(d.label) +
          "</label>"
        );
      })
      .join("");
    var ex = $("pfh-exclude-incomplete");
    if (ex) ex.checked = !!healthStore.getState().excludeIncompleteMetadataDimensions;
  }

  function readDimensionsIntoStore() {
    var ids = [];
    document.querySelectorAll("#pfh-dim-list input[data-dim]").forEach(function (inp) {
      if (inp.checked) ids.push(inp.getAttribute("data-dim"));
    });
    var ex = $("pfh-exclude-incomplete");
    healthStore.setDimensions(ids.length ? ids : Catalog().DIMENSIONS.map(function (d) {
      return d.id;
    }), ex ? ex.checked : false);
  }

  function showView(view) {
    state.view = view;
    $("pfh-overview").hidden = view !== "results" && view !== "detail";
    $("pfh-insights").hidden = view !== "results";
    $("pfh-compare").hidden = view !== "compare";
    $("pfh-detail").hidden = view !== "detail";
    $("pfh-dimensions").hidden = view === "compare";
    $("pfh-refresh").hidden = !(analysis && (view === "results" || view === "detail"));
  }

  function renderOverview() {
    var list = $("pfh-overview-list");
    var lim = $("pfh-limitations");
    if (!analysis || !list) return;
    list.innerHTML = (analysis.overview.areas || [])
      .map(function (a) {
        return (
          '<li class="pfh-overview-item' +
          (a.status === "unavailable" ? " is-unavailable" : "") +
          '">' +
          '<div class="pfh-overview-item__label">' +
          esc(a.label) +
          ' <span class="pfh-badge" data-status="' +
          esc(a.status) +
          '">' +
          esc(a.status) +
          "</span></div>" +
          "<p>" +
          esc(a.summary) +
          "</p></li>"
        );
      })
      .join("");
    if (lim) {
      lim.innerHTML = (analysis.limitations || [])
        .map(function (t) {
          return "<li>" + esc(t) + "</li>";
        })
        .join("");
    }
    renderOrientationChart();
  }

  function renderOrientationChart() {
    var chart = $("pfh-chart");
    var bars = $("pfh-chart-bars");
    var sr = $("pfh-chart-sr");
    if (!chart || !bars || !analysis) return;
    var counts = { landscape: 0, portrait: 0, square: 0 };
    var total = 0;
    (analysis.portfolioIds || []).forEach(function (pid) {
      var p = portfolios().filter(function (x) {
        return x.id === pid;
      })[0];
      if (!p) return;
      (p.imageIds || []).forEach(function (id) {
        var img = libraryById(id);
        if (!img) return;
        var a = global.WaypointScenesAssistantSignals.aspectBucket(img);
        if (a && counts[a] != null) {
          counts[a]++;
          total++;
        }
      });
    });
    if (total < 2) {
      chart.hidden = true;
      return;
    }
    chart.hidden = false;
    var parts = [];
    var srParts = [];
    ["landscape", "portrait", "square"].forEach(function (k) {
      var n = counts[k];
      var pct = total ? Math.round((n / total) * 100) : 0;
      parts.push(
        '<div class="pfh-bar-row"><span>' +
          esc(k) +
          '</span><div class="pfh-bar-track"><div class="pfh-bar-fill" style="width:' +
          pct +
          '%"></div></div><span>' +
          n +
          "</span></div>"
      );
      srParts.push(k + ": " + n + " (" + pct + "%)");
    });
    bars.innerHTML = parts.join("");
    bars.setAttribute("aria-label", "Orientation mix: " + srParts.join(", "));
    if (sr) sr.textContent = "Orientation distribution. " + srParts.join(". ") + ".";
  }

  function filteredInsights() {
    if (!analysis) return [];
    var cat = ($("pfh-filter-cat") && $("pfh-filter-cat").value) || "all";
    return (analysis.insights || []).filter(function (ins) {
      if (cat === "saved") return !!ins.saved;
      if (cat === "dismissed") return !!ins.dismissed || !!ins.notRelevant;
      if (cat === "all") return !ins.dismissed && !ins.notRelevant;
      return ins.category === cat && !ins.dismissed && !ins.notRelevant;
    });
  }

  function renderInsights() {
    var list = $("pfh-insight-list");
    var empty = $("pfh-insights-empty");
    if (!list) return;
    var items = filteredInsights();
    if (empty) empty.hidden = items.length > 0;
    list.innerHTML = items
      .map(function (ins) {
        return (
          '<button type="button" class="pfh-card' +
          (ins.dismissed ? " is-dismissed" : "") +
          (ins.saved ? " is-saved" : "") +
          '" data-insight-id="' +
          esc(ins.id) +
          '" data-category="' +
          esc(ins.category) +
          '">' +
          '<div class="pfh-card__meta">' +
          '<span class="pfh-badge">' +
          esc(Catalog().categoryLabel(ins.category)) +
          "</span>" +
          "<span>" +
          esc(confLabel(ins.confidence)) +
          "</span>" +
          (ins.intentionalRepetition ? "<span>Marked intentional</span>" : "") +
          (ins.saved ? "<span>Saved</span>" : "") +
          "</div>" +
          "<h3>" +
          esc(ins.title) +
          "</h3>" +
          "<p>" +
          esc(ins.observation) +
          "</p></button>"
        );
      })
      .join("");
  }

  function insightById(id) {
    if (!analysis) return null;
    for (var i = 0; i < analysis.insights.length; i++) {
      if (analysis.insights[i].id === id) return analysis.insights[i];
    }
    return null;
  }

  function openInsight(id, fromEl) {
    var ins = insightById(id);
    if (!ins) return;
    activeInsightId = id;
    focusReturnEl = fromEl || document.activeElement;
    var body = $("pfh-detail-body");
    var affected = $("pfh-affected");
    var actions = $("pfh-detail-actions");
    body.innerHTML =
      '<p class="pfh-card__meta"><span class="pfh-badge">' +
      esc(Catalog().categoryLabel(ins.category)) +
      "</span><span>" +
      esc(confLabel(ins.confidence)) +
      "</span><span>Basis: " +
      esc(ins.comparisonBasis) +
      "</span></p>" +
      "<h2>" +
      esc(ins.title) +
      "</h2>" +
      "<p>" +
      esc(ins.observation) +
      "</p>" +
      "<p>" +
      esc(ins.whyItMayMatter) +
      "</p>" +
      '<h3 class="pfh-subhead">Evidence</h3>' +
      '<ul class="pfh-evidence">' +
      (ins.evidence || [])
        .map(function (e) {
          return "<li><strong>" + esc(e.label || e.signal) + ":</strong> " + esc(e.value) + "</li>";
        })
        .join("") +
      "</ul>" +
      '<label for="pfh-note">Personal note</label>' +
      '<textarea id="pfh-note" class="pfh-note" maxlength="500">' +
      esc(ins.note || "") +
      "</textarea>";

    affected.innerHTML = (ins.affectedImageIds || [])
      .map(function (iid) {
        var img = libraryById(iid);
        return (
          '<div class="pfh-thumb" data-image-id="' +
          esc(iid) +
          '">' +
          thumbHtml(img, img && img.filename) +
          '<button type="button" class="wds-btn wds-btn--ghost pfh-open-img" data-image-id="' +
          esc(iid) +
          '">Open</button></div>'
        );
      })
      .join("");

    var btns = [];
    function addBtn(id, label) {
      btns.push(
        '<button type="button" class="wds-btn wds-btn--ghost" data-action="' + esc(id) + '">' + esc(label) + "</button>"
      );
    }
    addBtn("save", ins.saved ? "Unsave" : "Save insight");
    addBtn("dismiss", "Dismiss");
    addBtn("restore", "Restore");
    addBtn("not-relevant", "Not relevant");
    if (ins.category === "repetition") addBtn("intentional", ins.intentionalRepetition ? "Clear intentional" : "Mark intentional");
    addBtn("coach", "Send to Coach");
    addBtn("builder", "Open Builder");
    if ((ins.suggestedActions || []).indexOf("remove-with-confirm") >= 0) addBtn("remove", "Remove one…");
    addBtn("note-save", "Save note");
    actions.innerHTML = btns.join("");

    showView("detail");
    var back = $("pfh-detail-back");
    if (back) back.focus();
  }

  function applyInsightPatch(patch) {
    if (!activeInsightId) return;
    var ins = insightById(activeInsightId);
    healthStore.setInsightFlags(
      activeInsightId,
      Object.assign({ fingerprint: ins && ins.fingerprint }, patch)
    );
    // Reflect on in-memory analysis
    if (ins) {
      Object.keys(patch).forEach(function (k) {
        if (k !== "fingerprint") ins[k] = patch[k];
      });
    }
    analysis = healthStore.latestAnalysis() || analysis;
    if (analysis) {
      analysis = global.WaypointScenesHealthEngine.mergePersisted(analysis, {
        insightState: healthStore.getState().insightState
      });
    }
    renderInsights();
    if (activeInsightId) openInsight(activeInsightId);
  }

  function runAnalyze(force) {
    readDimensionsIntoStore();
    var scopeType = ($("pfh-scope-type") && $("pfh-scope-type").value) || "one";
    var ids = selectedPortfolioIds();
    var list = portfolios();

    if (!list.length) {
      setStatus("No portfolios yet. Create one from your library first.", true);
      return;
    }

    if (scopeType === "compare") {
      if (ids.length < 2) {
        setStatus("Select at least two portfolios to compare.", true);
        return;
      }
      setProgress(true, "Comparing portfolios…");
      setTimeout(function () {
        try {
          var chosen = list.filter(function (p) {
            return ids.indexOf(p.id) >= 0;
          });
          var result = Compare().compare(chosen, libraryImages);
          renderCompare(result);
          showView("compare");
          setProgress(false);
          setStatus("Descriptive comparison ready — no winner is declared.");
        } catch (e) {
          setProgress(false);
          setStatus((e && e.message) || "Comparison failed", true);
        }
      }, 20);
      return;
    }

    if (scopeType === "one" && ids.length !== 1) {
      if (ids.length === 0 && list.length === 1) ids = [list[0].id];
      else {
        setStatus("Select exactly one portfolio for single-portfolio analysis.", true);
        return;
      }
    }
    if (scopeType === "multiple" && ids.length < 2) {
      setStatus("Select at least two portfolios.", true);
      return;
    }
    if (scopeType === "all") {
      ids = list.map(function (p) {
        return p.id;
      });
    }

    setProgress(true, "Analyzing body of work…");
    setTimeout(function () {
      try {
        var assistantSessions = assistEngine && assistEngine.list ? assistEngine.list() : [];
        var coachSessions = [];
        try {
          if (coachEngine && coachEngine.list) coachSessions = coachEngine.list();
          else if (CoachStore() && CoachStore().get && CoachStore().get().list) coachSessions = CoachStore().get().list();
        } catch (e2) {
          coachSessions = [];
        }
        var builderSessions = builderEngine && builderEngine.list ? builderEngine.list() : [];

        analysis = healthStore.runAnalysis(
          {
            scope: scopeType === "all" ? "all" : scopeType === "multiple" ? "multiple" : "one",
            portfolioIds: ids,
            portfolios: list,
            libraryImages: libraryImages,
            assistantSessions: assistantSessions,
            coachSessions: coachSessions,
            builderSessions: builderSessions
          },
          { force: !!force }
        );
        renderOverview();
        renderInsights();
        showView("results");
        setProgress(false);
        setStatus(
          "Analysis ready · " +
            analysis.insights.length +
            " insights · version " +
            analysis.analysisVersion +
            ". No universal score."
        );
      } catch (e) {
        setProgress(false);
        setStatus((e && e.message) || "Analysis failed", true);
      }
    }, 20);
  }

  function renderCompare(result) {
    var table = $("pfh-compare-table");
    var notes = $("pfh-compare-notes");
    if (!table) return;
    if (!result.ok) {
      table.innerHTML = "<p>" + esc(result.message) + "</p>";
      return;
    }
    var head =
      "<thead><tr><th>Aspect</th>" +
      result.portfolios
        .map(function (p) {
          return "<th>" + esc(p.title) + "</th>";
        })
        .join("") +
      "</tr></thead>";
    var body =
      "<tbody>" +
      result.rows
        .map(function (r) {
          return (
            "<tr><th scope=\"row\">" +
            esc(r.label) +
            "</th>" +
            r.values
              .map(function (v) {
                return "<td>" + esc(v) + "</td>";
              })
              .join("") +
            "</tr>"
          );
        })
        .join("") +
      "</tbody>";
    table.innerHTML = "<table>" + head + body + "</table>";
    if (notes) {
      notes.innerHTML = (result.notes || [])
        .map(function (n) {
          return "<li>" + esc(n.text) + "</li>";
        })
        .join("");
    }
  }

  function openCoachForInsight(ins) {
    var ids = (ins.affectedImageIds || []).slice(0, 2);
    var q = ids.length >= 2 ? "?a=" + encodeURIComponent(ids[0]) + "&b=" + encodeURIComponent(ids[1]) : "";
    global.location.href = "assistant.html" + q;
  }

  function confirmRemove(imageId) {
    pendingRemove = imageId;
    focusReturnEl = document.activeElement;
    var dlg = $("pfh-confirm");
    if (dlg) {
      dlg.hidden = false;
      $("pfh-confirm-ok").focus();
    }
  }

  function doRemove() {
    if (!pendingRemove || !analysis || !analysis.portfolioIds.length) {
      closeConfirm();
      return;
    }
    var pid = analysis.portfolioIds[0];
    var p = portfolioEngine.get(pid);
    if (!p) {
      closeConfirm();
      return;
    }
    var nextIds = (p.imageIds || []).filter(function (id) {
      return id !== pendingRemove;
    });
    if (portfolioEngine.removeImage) portfolioEngine.removeImage(pid, pendingRemove);
    else if (portfolioEngine.updatePortfolio) portfolioEngine.updatePortfolio(pid, { imageIds: nextIds });
    setStatus("Removed from portfolio. Original remains in Photo Library.");
    closeConfirm();
    runAnalyze(true);
  }

  function closeConfirm() {
    pendingRemove = null;
    var dlg = $("pfh-confirm");
    if (dlg) dlg.hidden = true;
    if (focusReturnEl && focusReturnEl.focus) focusReturnEl.focus();
  }

  function bind() {
    $("pfh-analyze").addEventListener("click", function () {
      runAnalyze(false);
    });
    $("pfh-refresh").addEventListener("click", function () {
      runAnalyze(true);
    });
    $("pfh-filter-cat").addEventListener("change", renderInsights);
    $("pfh-scope-type").addEventListener("change", function () {
      var t = $("pfh-scope-type").value;
      var sel = $("pfh-portfolios");
      if (sel) sel.multiple = t === "multiple" || t === "compare" || t === "all";
    });
    $("pfh-insight-list").addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-insight-id]");
      if (!btn) return;
      openInsight(btn.getAttribute("data-insight-id"), btn);
    });
    $("pfh-detail-back").addEventListener("click", function () {
      showView("results");
      renderInsights();
      if (focusReturnEl && focusReturnEl.focus) focusReturnEl.focus();
    });
    $("pfh-detail-actions").addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-action]");
      if (!btn) return;
      var action = btn.getAttribute("data-action");
      var ins = insightById(activeInsightId);
      if (!ins) return;
      if (action === "save") applyInsightPatch({ saved: !ins.saved });
      else if (action === "dismiss") applyInsightPatch({ dismissed: true });
      else if (action === "restore") {
        healthStore.restoreInsight(activeInsightId);
        applyInsightPatch({ dismissed: false, notRelevant: false });
      } else if (action === "not-relevant") applyInsightPatch({ notRelevant: true, dismissed: true });
      else if (action === "intentional") applyInsightPatch({ intentionalRepetition: !ins.intentionalRepetition });
      else if (action === "coach") openCoachForInsight(ins);
      else if (action === "builder") global.location.href = "builder.html";
      else if (action === "remove") {
        if (ins.affectedImageIds && ins.affectedImageIds[0]) confirmRemove(ins.affectedImageIds[0]);
      } else if (action === "note-save") {
        var note = ($("pfh-note") && $("pfh-note").value) || "";
        applyInsightPatch({ note: note });
        setStatus("Note saved.");
      }
    });
    $("pfh-affected").addEventListener("click", function (ev) {
      var btn = ev.target.closest(".pfh-open-img");
      if (!btn) return;
      var id = btn.getAttribute("data-image-id");
      global.location.href = "../../photo-library/?image=" + encodeURIComponent(id);
    });
    $("pfh-confirm-ok").addEventListener("click", doRemove);
    $("pfh-confirm-cancel").addEventListener("click", closeConfirm);
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && $("pfh-confirm") && !$("pfh-confirm").hidden) {
        ev.preventDefault();
        closeConfirm();
      }
    });
  }

  function boot() {
    loadLibrary();
    portfolioEngine = PortfolioEngine().create();
    return portfolioEngine.init().then(function () {
      healthStore = StoreApi().create();
      return healthStore.init();
    }).then(function () {
      try {
        assistEngine = AssistSessions().create();
        return assistEngine.init ? assistEngine.init() : Promise.resolve();
      } catch (e) {
        assistEngine = null;
        return Promise.resolve();
      }
    }).then(function () {
      try {
        coachEngine = CoachStore().getShared ? CoachStore().getShared() : CoachStore().create();
        if (coachEngine && coachEngine.init) return coachEngine.init();
      } catch (e) {
        coachEngine = null;
      }
      return Promise.resolve();
    }).then(function () {
      try {
        builderEngine = BuilderSessions().create();
        return builderEngine.init ? builderEngine.init() : Promise.resolve();
      } catch (e) {
        builderEngine = null;
        return Promise.resolve();
      }
    }).then(function () {
      fillPortfolios();
      fillDimensions();
      bind();
      // Deep link ?portfolio=id
      try {
        var params = new URLSearchParams(global.location.search || "");
        var pid = params.get("portfolio");
        if (pid) {
          var sel = $("pfh-portfolios");
          if (sel) {
            Array.prototype.forEach.call(sel.options, function (o) {
              o.selected = o.value === pid;
            });
          }
        }
      } catch (e2) {}
      setStatus("Choose a portfolio scope to begin. Health describes patterns — it does not score them.");
    });
  }

  global.WaypointScenesPortfolioHealthUI = { boot: boot };
})(typeof window !== "undefined" ? window : globalThis);
