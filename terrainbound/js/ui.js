/**
 * Minimal HTML overlays. World stays primary; panels appear only when needed.
 */

import { drawFieldSketch } from "./investigation.js";
import { drawDatasetGraph } from "./fielddata.js";
import { drawFieldMap, drawProfileChart } from "./geomap.js";
import { drawOrbitModel, drawMoonGeometry, drawEclipseGeometry } from "./celestial.js";

const SYMBOLS = {
  erratic: "◉",
  bedrock: "▣",
  tributary: "⌇",
  bank: "⌢",
  sediment: "≈",
  cobbles: "○",
  marsh: "❧",
  weathered: "▤",
  rills: "⌇",
  gauge: "┃",
  seep: "◌",
  view: "△"
};

const KIND_LABEL = {
  observation: "Observation",
  comparison: "Comparison",
  measurement: "Measurement"
};

export function bindUi(root) {
  const title = root.querySelector("#title-screen");
  const dialogue = root.querySelector("#dialogue");
  const dialogueSpeaker = root.querySelector("#dialogue-speaker");
  const dialogueKicker = root.querySelector("#dialogue-kicker");
  const dialogueText = root.querySelector("#dialogue-text");
  const dialogueActions = root.querySelector("#dialogue-actions");
  const journal = root.querySelector("#journal");
  const missionBody = root.querySelector("#journal-mission");
  const discoveryBody = root.querySelector("#journal-discoveries");
  const discoveryCount = root.querySelector("#discovery-count");
  const evidenceSection = root.querySelector("#journal-evidence-section");
  const evidenceBody = root.querySelector("#journal-evidence");
  const evidenceCount = root.querySelector("#evidence-count");
  const sketchSection = root.querySelector("#journal-sketch-section");
  const sketchCanvas = root.querySelector("#field-sketch");
  const sketchCaption = root.querySelector("#sketch-caption");
  const hypothesisOpen = root.querySelector("#hypothesis-open");
  const toast = root.querySelector("#toast");
  const prompt = root.querySelector("#inspect-prompt");
  const hint = root.querySelector("#control-hint");
  const conclusion = root.querySelector("#conclusion");
  const pathStatus = root.querySelector("#path-status");
  const nodes = root.querySelector("#flow-nodes");
  const concludeHint = root.querySelector("#conclusion-hint");
  const hypothesis = root.querySelector("#hypothesis");
  const hypothesisProcesses = root.querySelector("#hypothesis-processes");
  const hypothesisEvidence = root.querySelector("#hypothesis-evidence");
  const hypothesisStatus = root.querySelector("#hypothesis-status");
  const hypothesisTry = root.querySelector("#hypothesis-try");
  const hypothesisClear = root.querySelector("#hypothesis-clear");
  const fieldRecord = root.querySelector("#field-record");
  const atlas = root.querySelector("#atlas");
  const atlasName = root.querySelector("#atlas-name");
  const atlasSubtitle = root.querySelector("#atlas-subtitle");
  const atlasBlurb = root.querySelector("#atlas-blurb");
  const atlasKicker = root.querySelector("#atlas-kicker");
  const atlasRouteLabel = root.querySelector("#atlas-route-label");
  const atlasRoute = root.querySelector("#atlas-route");
  const atlasTravel = root.querySelector("#atlas-travel");

  const enterBtn = root.querySelector("#enter-btn");
  const confirmReset = root.querySelector("#confirm-reset");
  const evidenceTab = root.querySelector("#tab-evidence-btn");
  const sketchTab = root.querySelector("#tab-sketch-btn");
  const dataTab = root.querySelector("#tab-data-btn");
  const mapTab = root.querySelector("#tab-map-btn");
  const dataSection = root.querySelector("#journal-data-section");
  const mapSection = root.querySelector("#journal-map-section");
  const mapCaption = root.querySelector("#map-caption");
  const regionMap = root.querySelector("#region-map");
  const mapTools = root.querySelector("#map-tools");
  const journalTitle = root.querySelector("#journal-title");
  const placeName = root.querySelector("#place-name");
  const placeSub = root.querySelector("#place-sub");
  const fieldRecordLead = root.querySelector("#field-record-lead");
  const geoBoard = root.querySelector("#geo-board");
  const geoTitle = root.querySelector("#geo-title");
  const geoLead = root.querySelector("#geo-lead");
  const geoBody = root.querySelector("#geo-body");
  const geoStatus = root.querySelector("#geo-status");
  const geoTry = root.querySelector("#geo-try");
  const skyClock = root.querySelector("#sky-clock");
  const skyClockLabel = root.querySelector("#sky-clock-label");
  const skyClockJumps = root.querySelector("#sky-clock-jumps");
  const dataCaption = root.querySelector("#data-caption");
  const dataTable = root.querySelector("#journal-data-table");
  const journalGraph = root.querySelector("#journal-graph");
  const interpretOpen = root.querySelector("#interpret-open");
  const flume = root.querySelector("#flume");
  const flumeSlopes = root.querySelector("#flume-slopes");
  const flumeWater = root.querySelector("#flume-water");
  const flumeStatus = root.querySelector("#flume-status");
  const flumeLog = root.querySelector("#flume-log");
  const flumeNumbers = root.querySelector("#flume-numbers");
  const interpret = root.querySelector("#interpret");
  const interpretX = root.querySelector("#interpret-x");
  const interpretY = root.querySelector("#interpret-y");
  const interpretGraph = root.querySelector("#interpret-graph");
  const interpretPatterns = root.querySelector("#interpret-patterns");
  const interpretConclusions = root.querySelector("#interpret-conclusions");
  const interpretStatus = root.querySelector("#interpret-status");
  const clearance = root.querySelector("#clearance");
  const clearanceProgress = root.querySelector("#clearance-progress");
  const clearanceExplanations = root.querySelector("#clearance-explanations");
  const clearanceFollow = root.querySelector("#clearance-follow");
  const clearanceFollowKicker = root.querySelector("#clearance-follow-kicker");
  const clearanceStatus = root.querySelector("#clearance-status");
  const clearanceTry = root.querySelector("#clearance-try");
  const clearanceFollowTry = root.querySelector("#clearance-follow-try");
  const tabButtons = [...root.querySelectorAll(".journal-tabs [data-tab]")];
  const panels = [...root.querySelectorAll("[data-panel]")];

  let toastTimer = 0;
  let hypothesisHandlers = { onProcess: null, onEvidence: null };
  let journalTab = "notes";

  function showTab(id) {
    journalTab = id;
    for (const btn of tabButtons) btn.classList.toggle("is-on", btn.dataset.tab === id);
    for (const panel of panels) {
      const on = panel.dataset.panel === id;
      panel.hidden = !on;
      panel.classList.toggle("is-on", on);
    }
  }

  for (const btn of tabButtons) {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      showTab(btn.dataset.tab);
    });
  }

  return {
    showTitle(visible) {
      title.hidden = !visible;
    },
    setPlace(name, sub) {
      if (placeName) placeName.textContent = name;
      if (placeSub) placeSub.textContent = sub;
      if (journalTitle) journalTitle.textContent = name;
    },
    setEnterLabel(hasSave) {
      if (enterBtn) {
        enterBtn.textContent = hasSave ? "Continue" : "Begin";
        enterBtn.hidden = false;
      }
      const freshBtn = root.querySelector("#new-explore-btn");
      if (freshBtn) freshBtn.hidden = !hasSave;
    },
    showAppearance(open, presentation, appearance, onPick) {
      const box = root.querySelector("#appearance-setup");
      if (!box) return;
      box.hidden = !open;
      if (!open) return;
      const spec = presentation?.appearance;
      if (!spec) return;
      const fill = (el, items, key) => {
        if (!el) return;
        el.replaceChildren();
        for (const item of items) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.textContent = item.label;
          btn.classList.toggle("is-on", appearance[key] === item.id);
          btn.addEventListener("click", () => onPick?.(key, item.id));
          el.appendChild(btn);
        }
      };
      fill(root.querySelector("#appearance-skins"), spec.skins, "skin");
      fill(root.querySelector("#appearance-hair"), spec.hair, "hair");
      fill(root.querySelector("#appearance-jackets"), spec.jackets, "jacket");
    },
    showTravel(open, regionName, stationName) {
      const card = root.querySelector("#travel-card");
      if (!card) return;
      card.hidden = !open;
      const r = root.querySelector("#travel-region");
      const s = root.querySelector("#travel-station");
      if (r) r.textContent = regionName || "";
      if (s) s.textContent = stationName || "";
    },
    showConfirmReset(open) {
      if (confirmReset) confirmReset.hidden = !open;
    },
    showDialogue(open, speaker, text, actions, kicker = "") {
      dialogue.hidden = !open;
      if (!open) return;
      dialogueSpeaker.textContent = speaker;
      if (dialogueKicker) {
        dialogueKicker.hidden = !kicker;
        dialogueKicker.textContent = kicker;
      }
      dialogueText.textContent = text;
      dialogueActions.replaceChildren();
      for (const action of actions) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = action.label;
        btn.addEventListener("click", action.onClick);
        dialogueActions.appendChild(btn);
      }
    },
    setPrompt(text) {
      prompt.hidden = !text;
      prompt.textContent = text || "";
    },
    setHint(text) {
      hint.textContent = text;
    },
    showToast(titleText, body) {
      toast.hidden = false;
      toast.querySelector("strong").textContent = titleText;
      toast.querySelector("p").textContent = body;
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => {
        toast.hidden = true;
      }, 2800);
      toast.classList.remove("toast-pop");
      void toast.offsetWidth;
      toast.classList.add("toast-pop");
    },
    setJournal(view) {
      const open = view.open;
      journal.classList.toggle("is-open", open);
      journal.setAttribute("aria-hidden", open ? "false" : "true");
      missionBody.replaceChildren();
      discoveryBody.replaceChildren();
      evidenceBody.replaceChildren();

      const observations = view.observations || [];
      const storyNotes = view.storyNotes || [];
      if (!observations.length && !storyNotes.length && !view.concluded) {
        const empty = document.createElement("p");
        empty.className = "journal-empty";
        empty.textContent = view.emptyNotes || "No mission notes yet. Walk the hollow and inspect what you find.";
        missionBody.appendChild(empty);
      }
      for (const item of observations) {
        missionBody.appendChild(noteArticle(item.title, item.text));
      }
      for (const item of storyNotes) {
        missionBody.appendChild(noteArticle(item.title, item.text));
      }
      if (view.concluded && view.conclusionText) {
        const done = noteArticle(view.conclusionText.title, view.conclusionText.text);
        done.classList.add("journal-conclusion");
        missionBody.appendChild(done);
      }
      if (view.landscapeConcluded && view.landscapeConclusionText) {
        const done = noteArticle(view.landscapeConclusionText.title, view.landscapeConclusionText.text);
        done.classList.add("journal-conclusion");
        missionBody.appendChild(done);
      }

      const log = view.discoveryLog;
      if (log) {
        discoveryCount.textContent = `${view.regionName || "Cedar Hollow"} discoveries  ${log.foundCount} / ${log.total}`;
        if (!log.found.length) {
          const empty = document.createElement("p");
          empty.className = "journal-empty";
          empty.textContent = "Nothing in this section yet. Wander. Look closely.";
          discoveryBody.appendChild(empty);
        }
        for (const item of log.found) {
          const art = document.createElement("article");
          art.className = "discovery-card" + (item.interpreted ? " is-interpreted" : "");
          if (item.interpreted) {
            const tag = document.createElement("span");
            tag.className = "interpreted-mark";
            tag.textContent = "Interpretation";
            art.appendChild(tag);
          }
          const h = document.createElement("h3");
          const mark = document.createElement("span");
          mark.className = "discovery-symbol";
          mark.textContent = SYMBOLS[item.symbol] || "•";
          h.append(mark, document.createTextNode(" " + item.name));
          const loc = document.createElement("p");
          loc.className = "discovery-loc";
          loc.textContent = item.location;
          const p = document.createElement("p");
          p.textContent = item.text;
          art.append(h, loc, p);
          discoveryBody.appendChild(art);
        }
        if (log.remaining > 0) {
          const rest = document.createElement("p");
          rest.className = "journal-empty";
          rest.textContent =
            log.remaining === 1
              ? "One unmarked page left."
              : `${log.remaining} unmarked pages left.`;
          discoveryBody.appendChild(rest);
        }
      }

      const evidence = view.evidence;
      const showEvidence = view.landscapeActive || (evidence && evidence.cards.length);
      const showData = Boolean(view.dataRows && view.dataRows.length);
      const showMap = Boolean(view.showMap);
      if (evidenceTab) evidenceTab.disabled = !showEvidence;
      if (sketchTab) sketchTab.disabled = !showEvidence;
      if (dataTab) dataTab.disabled = !showData;
      if (mapTab) mapTab.disabled = !showMap;
      if (!showEvidence && (journalTab === "evidence" || journalTab === "sketch")) showTab("notes");
      else if (!showData && journalTab === "data") showTab("notes");
      else if (!showMap && journalTab === "map") showTab("notes");
      else showTab(journalTab);
      if (evidenceSection) evidenceSection.hidden = journalTab !== "evidence" || !showEvidence;
      if (sketchSection) sketchSection.hidden = journalTab !== "sketch" || !showEvidence;
      if (dataSection) dataSection.hidden = journalTab !== "data" || !showData;
      if (mapSection) mapSection.hidden = journalTab !== "map" || !showMap;
      if (showEvidence && evidence) {
        evidenceCount.textContent = evidence.cards.length
          ? `${evidence.cards.length} field notes`
          : "Compare what doesn't fit. Notes appear after you measure.";
        if (!evidence.cards.length) {
          const empty = document.createElement("p");
          empty.className = "journal-empty";
          empty.textContent = "No evidence cards yet. Inspect more closely at the boulder, the knob, the creek bend, and the high ledge.";
          evidenceBody.appendChild(empty);
        }
        for (const group of evidence.groups) {
          const kicker = document.createElement("p");
          kicker.className = "journal-kicker";
          kicker.textContent = group.label;
          evidenceBody.appendChild(kicker);
          for (const card of group.cards) {
            evidenceBody.appendChild(evidenceArticle(card));
          }
        }
      }

      if (showEvidence && sketchCanvas && view.investigation && view.sketch) {
        const ctx = sketchCanvas.getContext("2d");
        drawFieldSketch(ctx, sketchCanvas.width, sketchCanvas.height, view.investigation, view.sketch);
        if (sketchCaption) {
          sketchCaption.textContent = view.landscapeConcluded
            ? "Inferred ice-flow added after the explanation held."
            : "A field drawing of Cedar Hollow — not a trail map.";
        }
      }

      if (hypothesisOpen) {
        hypothesisOpen.hidden = !view.canPropose && !view.landscapeConcluded;
        hypothesisOpen.textContent = view.landscapeConcluded
          ? "Review the explanation"
          : "What shaped this hollow?";
      }

      if (fieldRecord) {
        fieldRecord.replaceChildren();
        const groups = view.journeyRecord?.length
          ? view.journeyRecord
          : [{ title: "", items: view.fieldRecord || [] }];
        for (const group of groups) {
          if (group.title) {
            const kicker = document.createElement("p");
            kicker.className = "field-record-region";
            kicker.textContent = group.title;
            fieldRecord.appendChild(kicker);
          }
          for (const item of group.items || []) {
            const row = document.createElement("p");
            row.className = "field-record-row is-" + item.status;
            const mark = item.status === "demonstrated" ? "✓" : item.status === "developing" ? "◐" : "○";
            row.textContent = `${mark} ${item.label}`;
            fieldRecord.appendChild(row);
          }
        }
        if (view.missingLine) {
          const note = document.createElement("p");
          note.className = "journal-empty";
          note.textContent = view.missingLine;
          fieldRecord.appendChild(note);
        }
      }

      if (fieldRecordLead && view.fieldRecordLead) {
        fieldRecordLead.textContent = view.fieldRecordLead;
      }

      if (showMap && regionMap && view.mapModel) {
        const ctx = regionMap.getContext("2d");
        drawFieldMap(ctx, regionMap.width, regionMap.height, view.mapModel);
        if (mapCaption) mapCaption.textContent = view.mapCaption || "A sketch map. Layers arrive as you earn them.";
        if (mapTools) {
          mapTools.replaceChildren();
          for (const tool of view.mapTools || []) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.textContent = tool.label;
            btn.classList.toggle("is-on", Boolean(tool.on));
            btn.addEventListener("click", () => view.onMapTool?.(tool.id));
            mapTools.appendChild(btn);
          }
        }
      }

      if (dataTable) {
        dataTable.replaceChildren();
        if (showData) {
          if (dataCaption) dataCaption.textContent = view.dataCaption || "Your runs.";
          if (view.dataColumns) dataTable.appendChild(buildGenericTable(view.dataColumns, view.dataRows));
          else dataTable.appendChild(buildDataTable(view.dataRows, view.dataMeans));
          if (journalGraph && view.graphModel) {
            journalGraph.hidden = false;
            drawDatasetGraph(journalGraph.getContext("2d"), journalGraph.width, journalGraph.height, view.graphModel);
          } else if (journalGraph) {
            journalGraph.hidden = true;
          }
          if (interpretOpen) interpretOpen.hidden = !view.canInterpret;
        }
      }
    },
    showAtlas(open) {
      if (atlas) atlas.hidden = !open;
    },
    setAtlasPreview(model) {
      if (!model) return;
      if (atlasName) atlasName.textContent = model.name;
      if (atlasKicker) {
        atlasKicker.textContent =
          model.status === "here"
            ? model.mastered
              ? "Field work complete"
              : "You are here"
            : model.status === "open"
              ? "Route open"
              : "Preview";
      }
      if (atlasSubtitle) atlasSubtitle.textContent = model.subtitle;
      if (atlasBlurb) atlasBlurb.textContent = model.shortPreview;
      if (atlasRouteLabel) atlasRouteLabel.textContent = "Travel route";
      if (atlasRoute) atlasRoute.textContent = `${model.routeLabel}. ${model.routeDetail}`;
      if (atlasTravel) {
        atlasTravel.hidden = !model.canEnter;
        atlasTravel.textContent = model.canEnter ? "Walk this region" : "";
      }
    },
    showConclusion(open, features, path, observed, hintText) {
      conclusion.hidden = !open;
      concludeHint.textContent = hintText || "";
      if (!open) return;
      nodes.replaceChildren();
      for (const feature of features) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "flow-node";
        btn.dataset.featureId = feature.id;
        btn.style.left = `${feature.mapX}%`;
        btn.style.top = `${feature.mapY}%`;
        btn.disabled = !observed.has(feature.id);
        btn.textContent = feature.short;
        const index = path.indexOf(feature.id);
        if (index >= 0) btn.dataset.order = String(index + 1);
        nodes.appendChild(btn);
      }
      pathStatus.textContent = path.length
        ? path.map((id) => features.find((f) => f.id === id)?.short || id).join(" → ")
        : "Tap places you visited, starting high and moving downhill.";
    },
    showHypothesis(open, view, handlers = {}) {
      hypothesis.hidden = !open;
      if (!open) return;
      hypothesisHandlers = handlers;
      const processes = view.processes || [];
      const cards = view.evidenceCards || [];
      hypothesisProcesses.replaceChildren();
      for (const process of processes) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = process.label;
        btn.classList.toggle("is-on", view.selectedProcess === process.id);
        btn.disabled = view.concluded;
        btn.addEventListener("click", () => hypothesisHandlers.onProcess?.(process.id));
        hypothesisProcesses.appendChild(btn);
      }
      hypothesisEvidence.replaceChildren();
      if (!cards.length) {
        const empty = document.createElement("p");
        empty.className = "journal-empty";
        empty.textContent = "Record field notes first. Only observed evidence can be used.";
        hypothesisEvidence.appendChild(empty);
      }
      for (const card of cards) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.disabled = view.concluded;
        const scale = document.createElement("span");
        scale.className = "chip-scale";
        scale.textContent = card.timescaleLabel || card.timescale;
        btn.append(scale, document.createTextNode(card.title));
        btn.classList.toggle("is-on", (view.selectedEvidenceIds || []).includes(card.id));
        btn.addEventListener("click", () => hypothesisHandlers.onEvidence?.(card.id));
        hypothesisEvidence.appendChild(btn);
      }
      hypothesisStatus.textContent = view.status || "";
      hypothesisStatus.classList.toggle("is-success", Boolean(view.concluded));
      if (hypothesisTry) hypothesisTry.hidden = Boolean(view.concluded);
      if (hypothesisClear) hypothesisClear.hidden = Boolean(view.concluded);
    },
    showFlume(open, view, handlers = {}) {
      if (!flume) return;
      flume.hidden = !open;
      if (!open) return;
      fillChips(flumeSlopes, view.slopes, view.slope, handlers.onSlope);
      fillChips(flumeWater, view.waters, view.water, handlers.onWater);
      if (flumeStatus) flumeStatus.textContent = view.status || "";
      if (flumeLog) {
        flumeLog.replaceChildren();
        for (const trial of view.trials || []) {
          const p = document.createElement("p");
          p.textContent = `${trial.label} · ${trial.waterLabel} · ${trial.seconds} s`;
          if (!trial.fair) p.style.opacity = "0.65";
          flumeLog.appendChild(p);
        }
      }
      if (flumeNumbers) flumeNumbers.hidden = !view.canReadNumbers;
    },
    showInterpret(open, view, handlers = {}) {
      if (!interpret) return;
      interpret.hidden = !open;
      if (!open) return;
      fillChips(interpretX, view.xOptions, view.xField, handlers.onX);
      fillChips(interpretY, view.yOptions, view.yField, handlers.onY);
      fillChips(interpretPatterns, view.patterns, view.patternId, handlers.onPattern);
      fillChips(interpretConclusions, view.conclusions, view.conclusionId, handlers.onConclusion);
      if (interpretGraph && view.graphModel) {
        drawDatasetGraph(interpretGraph.getContext("2d"), interpretGraph.width, interpretGraph.height, view.graphModel);
      }
      if (interpretStatus) {
        interpretStatus.textContent = view.status || "";
        interpretStatus.classList.toggle("is-success", Boolean(view.interpreted));
      }
    },
    showClearance(open, view, handlers = {}) {
      if (!clearance) return;
      clearance.hidden = !open;
      if (!open) return;
      if (clearanceProgress) clearanceProgress.textContent = view.progress || "";
      fillChips(clearanceExplanations, view.explanations, view.selectedExplanation, handlers.onExplanation);
      const follow = Boolean(view.needsFollowUp);
      if (clearanceFollowKicker) clearanceFollowKicker.hidden = !follow;
      if (clearanceFollow) {
        clearanceFollow.hidden = !follow;
        if (follow) fillChips(clearanceFollow, view.followOptions, view.followId, handlers.onFollow);
      }
      if (clearanceTry) clearanceTry.hidden = follow || view.concluded;
      if (clearanceFollowTry) clearanceFollowTry.hidden = !follow || view.concluded;
      if (clearanceStatus) {
        clearanceStatus.textContent = view.status || "";
        clearanceStatus.classList.toggle("is-success", Boolean(view.concluded));
      }
    },
    showGeoBoard(open, view = {}, handlers = {}) {
      if (!geoBoard) return;
      geoBoard.hidden = !open;
      if (!open) return;
      if (geoTitle) geoTitle.textContent = view.title || "Field question";
      if (geoLead) geoLead.textContent = view.lead || "";
      if (geoStatus) {
        geoStatus.textContent = view.status || "";
        geoStatus.classList.toggle("is-success", Boolean(view.ok));
      }
      if (geoTry) {
        geoTry.hidden = Boolean(view.hideTry);
        geoTry.textContent = view.tryLabel || "Try this";
        geoTry.onclick = () => handlers.onTry?.();
      }
      if (geoBody) {
        geoBody.replaceChildren();
        if (view.profile && view.profileCanvas) {
          const canvasEl = document.createElement("canvas");
          canvasEl.width = 420;
          canvasEl.height = 160;
          canvasEl.setAttribute("aria-label", "Topographic profile");
          geoBody.appendChild(canvasEl);
          drawProfileChart(canvasEl.getContext("2d"), canvasEl.width, canvasEl.height, view.profile);
        }
        if (view.diagram) {
          const canvasEl = document.createElement("canvas");
          canvasEl.width = 420;
          canvasEl.height = 168;
          canvasEl.setAttribute("aria-label", "Sky model");
          geoBody.appendChild(canvasEl);
          const g = canvasEl.getContext("2d");
          if (view.diagram.kind === "orbit") drawOrbitModel(g, canvasEl.width, canvasEl.height, view.diagram);
          else if (view.diagram.kind === "moon") drawMoonGeometry(g, canvasEl.width, canvasEl.height, view.diagram.moon);
          else if (view.diagram.kind === "eclipse") drawEclipseGeometry(g, canvasEl.width, canvasEl.height, view.diagram.geo);
        }
        if (view.table) {
          geoBody.appendChild(buildGenericTable(view.table.columns, view.table.rows));
        }
        if (view.groups) {
          for (const group of view.groups) {
            const kicker = document.createElement("p");
            kicker.className = "hypothesis-kicker";
            kicker.textContent = group.label;
            geoBody.appendChild(kicker);
            const row = document.createElement("div");
            row.className = "chip-row";
            geoBody.appendChild(row);
            fillChips(row, group.items, group.selected, (id) => handlers.onPick?.(group.id, id));
          }
        }
      }
    },
    showSkyClock(open, view = {}, handlers = {}) {
      if (!skyClock) return;
      skyClock.hidden = !open;
      if (!open) return;
      if (skyClockLabel) skyClockLabel.textContent = view.label || "Field observation";
      if (skyClockJumps) {
        skyClockJumps.replaceChildren();
        for (const item of view.jumps || []) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.textContent = item.label;
          btn.addEventListener("click", () => handlers.onJump?.(item.id));
          skyClockJumps.appendChild(btn);
        }
      }
    }
  };
}

function fillChips(rootEl, items, selected, onPick) {
  if (!rootEl) return;
  rootEl.replaceChildren();
  for (const item of items || []) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = item.label;
    btn.classList.toggle("is-on", Array.isArray(selected) ? selected.includes(item.id) : selected === item.id);
    btn.addEventListener("click", () => onPick?.(item.id));
    rootEl.appendChild(btn);
  }
}

function buildGenericTable(columns, rows) {
  const wrap = document.createElement("div");
  const table = document.createElement("table");
  table.className = "data-table";
  const head = document.createElement("tr");
  for (const label of columns || []) {
    const th = document.createElement("th");
    th.textContent = label;
    head.appendChild(th);
  }
  table.appendChild(head);
  for (const row of rows || []) {
    const tr = document.createElement("tr");
    const cells = Array.isArray(row) ? row : Object.values(row);
    for (const cell of cells) {
      const td = document.createElement("td");
      td.textContent = cell;
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
  wrap.appendChild(table);
  return wrap;
}

function buildDataTable(rows, means) {
  const wrap = document.createElement("div");
  const table = document.createElement("table");
  table.className = "data-table";
  const head = document.createElement("tr");
  for (const label of ["Slope", "Trial", "Time (s)", "Speed (m/s)"]) {
    const th = document.createElement("th");
    th.textContent = label;
    head.appendChild(th);
  }
  table.appendChild(head);
  for (const row of rows || []) {
    const tr = document.createElement("tr");
    for (const value of [row.slopeLabel || row.slope, row.trial, row.seconds, row.speed]) {
      const td = document.createElement("td");
      td.textContent = String(value);
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
  wrap.appendChild(table);
  if (means?.length) {
    const p = document.createElement("p");
    p.className = "journal-empty";
    p.textContent = means
      .filter((item) => item.seconds != null)
      .map((item) => `${item.label}: ${item.seconds} s (${item.speed} m/s)`)
      .join(" · ");
    wrap.appendChild(p);
  }
  return wrap;
}

function noteArticle(title, text) {
  const li = document.createElement("article");
  const h = document.createElement("h3");
  const p = document.createElement("p");
  h.textContent = title;
  p.textContent = text;
  li.append(h, p);
  return li;
}

function evidenceArticle(card) {
  const art = document.createElement("article");
  art.className = "evidence-card";
  const h = document.createElement("h3");
  h.textContent = card.title;
  const kind = document.createElement("p");
  kind.className = "evidence-kind";
  kind.textContent = KIND_LABEL[card.kind] || "Observation";
  const obs = document.createElement("p");
  obs.textContent = card.observation;
  const sig = document.createElement("p");
  sig.className = "evidence-sig";
  sig.textContent = card.significance;
  art.append(h, kind, obs, sig);
  if (card.question) {
    const q = document.createElement("p");
    q.className = "evidence-q";
    q.textContent = card.question;
    art.appendChild(q);
  }
  return art;
}
