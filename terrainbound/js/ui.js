/**
 * Minimal HTML overlays. World stays primary; panels appear only when needed.
 */

import { drawFieldSketch } from "./investigation.js";
import { drawDatasetGraph } from "./fielddata.js";
import { drawFieldMap, drawProfileChart } from "./geomap.js";
import { drawOrbitModel, drawMoonGeometry, drawEclipseGeometry } from "./celestial.js";
import { drawSystemsSketch } from "./puzzles.js";
import { drawSpectrumBench, drawSeasonPlates, drawUnlabeledPlot, drawRedshiftPlot, drawHornField } from "./darksky.js";

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
  measurement: "Measurement",
  pattern: "Pattern",
  system: "System",
  relationship: "Relationship",
  claim: "What I can claim",
  "system-relationship": "System relationship",
  "revised-explanation": "Revised explanation",
  "map-evidence": "Map evidence"
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
  const skyClockExtra = root.querySelector("#sky-clock-extra");
  const skyClockFull = root.querySelector("#sky-clock-full");
  const skyEyepiece = root.querySelector("#sky-eyepiece");
  const skyEyeTitle = root.querySelector("#sky-eye-title");
  const skyEyeLead = root.querySelector("#sky-eye-lead");
  const skyEyeCanvas = root.querySelector("#sky-eye-canvas");
  const skyEyeStatus = root.querySelector("#sky-eye-status");
  const skyEyeClose = root.querySelector("#sky-eye-close");
  const spectrumBench = root.querySelector("#spectrum-bench");
  const spectrumTitle = root.querySelector("#spectrum-title");
  const spectrumLead = root.querySelector("#spectrum-lead");
  const spectrumCanvas = root.querySelector("#spectrum-canvas");
  const spectrumReadout = root.querySelector("#spectrum-readout");
  const spectrumTools = root.querySelector("#spectrum-tools");
  const spectrumStatus = root.querySelector("#spectrum-status");
  const spectrumLamp = root.querySelector("#spectrum-lamp");
  const spectrumLog = root.querySelector("#spectrum-log");
  const spectrumClose = root.querySelector("#spectrum-close");
  const guide = root.querySelector("#field-guide");
  const guideQuestion = root.querySelector("#guide-question");
  const guideVerb = root.querySelector("#guide-verb");
  const guideNext = root.querySelector("#guide-next");
  const guideWhere = root.querySelector("#guide-where");
  const guidePairs = root.querySelector("#guide-pairs");
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
  const systemsMap = root.querySelector("#systems-map");
  const systemsLead = root.querySelector("#systems-lead");
  const systemsSketch = root.querySelector("#systems-sketch");
  const systemsPrompt = root.querySelector("#systems-prompt");
  const systemsStatus = root.querySelector("#systems-status");
  const systemsTry = root.querySelector("#systems-try");
  const aar = root.querySelector("#aar");
  const aarTitle = root.querySelector("#aar-title");
  const aarLead = root.querySelector("#aar-lead");
  const aarStem = root.querySelector("#aar-stem");
  const aarEvidence = root.querySelector("#aar-evidence");
  const aarEvidenceKicker = root.querySelector("#aar-evidence-kicker");
  const aarStatus = root.querySelector("#aar-status");
  const aarNext = root.querySelector("#aar-next");
  const aarSubmit = root.querySelector("#aar-submit");
  const summit = root.querySelector("#summit");
  const summitLog = root.querySelector("#summit-log");
  const summitLead = root.querySelector("#summit-lead");
  const summitMore = root.querySelector("#summit-more");
  const summitToggle = root.querySelector("#summit-toggle");
  const summitAsk = root.querySelector("#summit-ask");
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
    setGuide(model, visible = true) {
      if (!guide) return;
      if (!visible || !model) {
        guide.hidden = true;
        return;
      }
      guide.hidden = false;
      if (guideQuestion) guideQuestion.textContent = model.question || "";
      if (guideVerb) guideVerb.textContent = model.verb || "";
      if (guideNext) guideNext.textContent = model.next || "";
      if (guideWhere) {
        const bits = [model.where, model.lookingFor].filter(Boolean);
        guideWhere.textContent = bits.join(" · ");
      }
      if (guidePairs) {
        const pairs = (model.pairs || []).filter((pair) => !pair.compared);
        guidePairs.hidden = !pairs.length;
        guidePairs.replaceChildren();
        for (const pair of pairs) {
          const li = document.createElement("li");
          const left = pair.left.have ? "recorded" : "needed";
          const right = pair.right.have ? "recorded" : "needed";
          li.textContent = `${pair.left.label}: ${left}  ·  ${pair.right.label}: ${right}`;
          guidePairs.appendChild(li);
        }
      }
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
      if (view.guide) {
        missionBody.prepend(
          noteArticle(
            `${view.guide.verb} · ${view.guide.question}`,
            `${view.guide.next}${view.guide.where ? " (" + view.guide.where + ")" : ""}`
          )
        );
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
      const showEvidence =
        view.landscapeActive ||
        Boolean(evidence && evidence.cards.length) ||
        Boolean(view.puzzleEvidence && view.puzzleEvidence.length);
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
        if (evidence.cards.length) {
          evidenceCount.textContent = `${evidence.cards.length} field notes`;
        } else if (view.puzzleEvidence?.length) {
          evidenceCount.textContent = "Notes from the investigation. Pin these when Wren asks.";
        } else {
          evidenceCount.textContent = "Compare what doesn't fit. Notes appear after you measure.";
        }
        if (!evidence.cards.length && !view.puzzleEvidence?.length) {
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
            ? "Older landscape notes added after the explanation held."
            : "A field drawing of Cedar Hollow — not a trail map.";
        }
      }
      if (showEvidence && view.puzzleEvidence?.length) {
        const kicker = document.createElement("p");
        kicker.className = "journal-kicker";
        kicker.textContent = "Case notes";
        evidenceBody.appendChild(kicker);
        for (const row of view.puzzleEvidence) {
          const article = document.createElement("article");
          const kind = document.createElement("p");
          kind.className = "chip-scale";
          kind.textContent = KIND_LABEL[row.category] || "Evidence";
          const title = document.createElement("h4");
          title.textContent = row.title;
          const note = document.createElement("p");
          note.textContent = row.note;
          article.append(kind, title, note);
          evidenceBody.appendChild(article);
        }
      }

      if (hypothesisOpen) {
        hypothesisOpen.hidden = !view.canPropose && !view.landscapeConcluded;
        hypothesisOpen.textContent = view.landscapeConcluded
          ? "Review the explanation"
          : "Two clocks in the hollow";
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
      if (view.predictOptions) {
        const pred = root.querySelector("#flume-predict") || flumeSlopes;
        if (root.querySelector("#flume-predict")) {
          fillChips(root.querySelector("#flume-predict"), view.predictOptions, view.prediction, handlers.onPredict);
        }
      }
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
      const pulse = Boolean(view.needsPulse);
      if (clearanceExplanations) clearanceExplanations.hidden = pulse;
      const follow = Boolean(view.needsFollowUp);
      if (clearanceFollowKicker) {
        clearanceFollowKicker.hidden = !(follow || pulse);
        if (pulse) clearanceFollowKicker.textContent = view.pulsePrompt || "Predict first";
        else if (follow) clearanceFollowKicker.textContent = "One more check";
      }
      if (clearanceFollow) {
        clearanceFollow.hidden = !(follow || pulse);
        if (pulse) fillChips(clearanceFollow, view.pulseOptions, view.pulseId, handlers.onPulse);
        else if (follow) fillChips(clearanceFollow, view.followOptions, view.followId, handlers.onFollow);
      }
      if (!pulse) fillChips(clearanceExplanations, view.explanations, view.selectedExplanation, handlers.onExplanation);
      if (clearanceTry) {
        clearanceTry.hidden = follow || view.concluded;
        clearanceTry.textContent = pulse ? "Record prediction" : "Try this explanation";
      }
      if (clearanceFollowTry) clearanceFollowTry.hidden = !follow || view.concluded;
      if (clearanceStatus) {
        clearanceStatus.textContent = view.status || "";
        clearanceStatus.classList.toggle("is-success", Boolean(view.concluded));
      }
    },
    showSystems(open, view = {}, handlers = {}) {
      if (!systemsMap) return;
      systemsMap.hidden = !open;
      if (!open) return;
      if (systemsLead) systemsLead.textContent = view.lead || "";
      if (systemsPrompt) systemsPrompt.textContent = view.prompt || "";
      if (systemsSketch && view.spec) {
        const ctx = systemsSketch.getContext("2d");
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(280, Math.floor(systemsSketch.clientWidth || 560));
        const h = Math.max(180, Math.floor(w * 0.58));
        systemsSketch.width = Math.floor(w * dpr);
        systemsSketch.height = Math.floor(h * dpr);
        systemsSketch.style.width = `${w}px`;
        systemsSketch.style.height = `${h}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawSystemsSketch(ctx, w, h, view.spec, view.state);
        systemsSketch.onpointerdown = (event) => {
          if (event.button != null && event.button !== 0) return;
          event.preventDefault();
          const rect = systemsSketch.getBoundingClientRect();
          handlers.onTap?.(event.clientX - rect.left, event.clientY - rect.top, w, h);
        };
        systemsSketch.onclick = null;
      }
      if (systemsStatus) {
        systemsStatus.textContent = view.status || "";
        systemsStatus.classList.toggle("is-success", Boolean(view.concluded || view.ready));
      }
      if (systemsTry) systemsTry.hidden = !view.ready || Boolean(view.concluded);
    },
    showAar(open, view = {}, handlers = {}) {
      if (!aar) return;
      aar.hidden = !open;
      if (!open) return;
      if (aarTitle) aarTitle.textContent = view.title || "Make the case";
      if (aarLead) aarLead.textContent = view.lead || "";
      if (aarStem) aarStem.textContent = view.stem || "";
      if (aarEvidenceKicker) aarEvidenceKicker.hidden = Boolean(view.result);
      if (aarEvidence) {
        aarEvidence.hidden = Boolean(view.result);
        aarEvidence.replaceChildren();
        const selected = new Set(view.selected || []);
        for (const row of view.evidence || []) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "aar-card-btn";
          btn.classList.toggle("is-on", selected.has(row.id));
          btn.setAttribute("aria-pressed", selected.has(row.id) ? "true" : "false");
          const kind = document.createElement("span");
          kind.className = "chip-scale";
          kind.textContent = KIND_LABEL[row.category] || "Evidence";
          const title = document.createElement("strong");
          title.textContent = row.title;
          const note = document.createElement("span");
          note.textContent = row.note;
          btn.append(kind, title, note);
          btn.addEventListener("click", () => handlers.onToggle?.(row.id));
          aarEvidence.appendChild(btn);
        }
      }
      if (aarStatus) {
        aarStatus.textContent = view.status || "";
        aarStatus.classList.toggle("is-success", view.result === "clearance");
      }
      if (aarNext) aarNext.hidden = Boolean(view.done || view.result);
      if (aarSubmit) aarSubmit.hidden = !view.done || Boolean(view.result);
    },
    setSummitIdea(on) {
      summitToggle?.classList.toggle("has-idea", Boolean(on));
    },
    showSummit(open, view = {}) {
      if (!summit) return;
      summit.hidden = !open;
      if (summitToggle) summitToggle.setAttribute("aria-expanded", open ? "true" : "false");
      if (!open) return;
      if (summitLead) {
        summitLead.textContent = view.lead || "Curious about the hollow. Serious about the science.";
        summitLead.classList.toggle("is-pending", Boolean(view.pending));
      }
      const portrait = root.querySelector("#summit-portrait");
      if (portrait) {
        const src = view.portraitSrc || "./assets/summit/summit-neutral.svg";
        if (portrait.getAttribute("src") !== src) portrait.setAttribute("src", src);
        portrait.dataset.expression = view.expression || "neutral";
        portrait.alt = "Summit, a Sasquatch Earth Science companion";
      }
      if (summit) summit.setAttribute("aria-busy", view.pending ? "true" : "false");
      if (summitLog) {
        summitLog.replaceChildren();
        for (const row of view.messages || []) {
          const p = document.createElement("p");
          p.className = `summit-msg ${row.role === "student" ? "is-student" : "is-summit"}`;
          const cite = document.createElement("cite");
          cite.textContent = row.role === "student" ? "You" : "Summit";
          const body = document.createElement("span");
          body.textContent = row.text;
          p.append(cite, body);
          summitLog.appendChild(p);
        }
        summitLog.scrollTop = (view.messages || []).length <= 2 ? 0 : summitLog.scrollHeight;
      }
      if (summitMore) summitMore.hidden = !view.moreAvailable;
      if (summitAsk) summitAsk.disabled = Boolean(view.pending);
      const diag = root.querySelector("#summit-diag");
      if (diag) {
        diag.hidden = !view.diag;
        diag.setAttribute("aria-hidden", view.diag ? "false" : "true");
        diag.textContent = view.diag || "";
      }
      const ft = root.querySelector("#summit-fieldtest");
      const ftFlag = root.querySelector("#summit-fieldtest-flag");
      if (ftFlag) ftFlag.hidden = !view.fieldTest;
      if (ft) {
        ft.hidden = !view.fieldTest;
        ft.dataset.turnId = view.fieldTestTurnId || "";
      }
      if (open && !view.pending) summitAsk?.focus();
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
        if (view.numberInput) {
          const kicker = document.createElement("p");
          kicker.className = "hypothesis-kicker";
          kicker.textContent = view.numberInput.label || "Value";
          geoBody.appendChild(kicker);
          const input = document.createElement("input");
          input.type = "number";
          input.step = "any";
          input.id = "geo-number";
          input.setAttribute("aria-label", view.numberInput.label || "Value");
          input.value = view.numberInput.value == null ? "" : String(view.numberInput.value);
          input.addEventListener("input", () => handlers.onNumber?.(view.numberInput.id, input.value));
          geoBody.appendChild(input);
        }
        if (view.obsInt) {
          const kicker = document.createElement("p");
          kicker.className = "hypothesis-kicker";
          kicker.textContent = view.obsInt.prompt;
          geoBody.appendChild(kicker);
          const row = document.createElement("div");
          row.className = "chip-row";
          geoBody.appendChild(row);
          fillChips(
            row,
            [
              { id: "observation", label: view.obsInt.observation },
              { id: "interpretation", label: view.obsInt.interpretation }
            ],
            view.obsInt.selected,
            (id) => handlers.onPick?.("choice", id)
          );
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
        if (view.actions) {
          if (view.actionLabel) {
            const kicker = document.createElement("p");
            kicker.className = "hypothesis-kicker";
            kicker.textContent = view.actionLabel;
            geoBody.appendChild(kicker);
          }
          const row = document.createElement("div");
          row.className = "chip-row";
          geoBody.appendChild(row);
          for (const action of view.actions) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.textContent = action.label;
            btn.classList.toggle("is-on", Boolean(action.on));
            btn.addEventListener("click", () => handlers.onAction?.(action.id));
            row.appendChild(btn);
          }
        }
        if (view.canvasKind) {
          const canvasEl = document.createElement("canvas");
          canvasEl.className = "ds-field-canvas";
          canvasEl.width = view.canvasWidth || 420;
          canvasEl.height = view.canvasHeight || 220;
          canvasEl.setAttribute("aria-label", view.canvasLabel || "Field diagram");
          canvasEl.tabIndex = 0;
          geoBody.appendChild(canvasEl);
          const g = canvasEl.getContext("2d");
          if (view.canvasKind === "plates") drawSeasonPlates(g, view);
          else if (view.canvasKind === "plot") drawUnlabeledPlot(g, view);
          else if (view.canvasKind === "redshift") drawRedshiftPlot(g, view);
          else if (view.canvasKind === "horn") drawHornField(g, view);
          canvasEl.onclick = (event) => {
            const box = canvasEl.getBoundingClientRect();
            const x = ((event.clientX - box.left) / box.width) * 100;
            const y = (1 - (event.clientY - box.top) / box.height) * 100;
            handlers.onCanvas?.(x, y);
          };
          canvasEl.onkeydown = (event) => {
            if (event.key === "Enter" || event.key === " ") handlers.onCanvas?.(50, 50);
            if (event.key === "ArrowLeft") handlers.onCanvas?.(20, 50);
            if (event.key === "ArrowRight") handlers.onCanvas?.(80, 50);
            if (event.key === "ArrowUp") handlers.onCanvas?.(50, 80);
            if (event.key === "ArrowDown") handlers.onCanvas?.(50, 20);
          };
        }
      }
    },
    showSkyClock(open, view = {}, handlers = {}) {
      if (!skyClock) return;
      skyClock.hidden = !open;
      if (!open) return;
      skyClock.dataset.mode = view.mode || "clock";
      if (skyClockLabel) skyClockLabel.textContent = view.label || "Celestial clock";
      const fillRow = (el, items) => {
        if (!el) return;
        el.replaceChildren();
        for (const item of items || []) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.textContent = item.label;
          btn.addEventListener("click", () => handlers.onJump?.(item.id));
          el.appendChild(btn);
        }
        el.hidden = !(items && items.length);
      };
      fillRow(skyClockJumps, view.primary || view.jumps);
      fillRow(skyClockExtra, view.extra);
      if (skyClockFull) {
        skyClockFull.hidden = false;
        skyClockFull.textContent = view.expanded ? "Hide extra steps" : "Full observation window";
        skyClockFull.onclick = () => handlers.onFull?.();
      }
    },
    showSkyEyepiece(open, view = {}, handlers = {}) {
      if (!skyEyepiece) return;
      skyEyepiece.hidden = !open;
      if (!open) return;
      if (skyEyeTitle) skyEyeTitle.textContent = view.title || "Dome eyepiece";
      if (skyEyeLead) skyEyeLead.textContent = view.lead || "";
      if (skyEyeStatus) skyEyeStatus.textContent = view.status || "";
      if (skyEyeClose) skyEyeClose.onclick = () => handlers.onClose?.();
      if (skyEyeCanvas) {
        const ctx = skyEyeCanvas.getContext("2d");
        const width = skyEyeCanvas.width;
        const height = skyEyeCanvas.height;
        ctx.fillStyle = "#07091a";
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = "#1c283c";
        ctx.fillRect(0, height * 0.72, width, height * 0.28);
        ctx.fillStyle = "#f4efe2";
        for (let i = 0; i < 48; i += 1) {
          const x = ((i * 97) % width);
          const y = ((i * 53) % Math.floor(height * 0.7));
          ctx.globalAlpha = 0.35 + (i % 5) * 0.08;
          ctx.beginPath();
          ctx.arc(x, y, 0.8 + (i % 3) * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        skyEyeCanvas.onclick = (event) => {
          const box = skyEyeCanvas.getBoundingClientRect();
          const x = ((event.clientX - box.left) / box.width) * width;
          const y = ((event.clientY - box.top) / box.height) * height;
          let best = null;
          let bestD = 36;
          for (const star of view.targets || []) {
            const sx = 40 + star.az * (width - 80);
            const sy = 36 + (1 - star.alt) * (height * 0.55);
            const d = Math.hypot(x - sx, y - sy);
            if (d < bestD) {
              best = star;
              bestD = d;
            }
          }
          if (best) handlers.onPick?.(best.id);
        };
        for (const star of view.targets || []) {
          const x = 40 + star.az * (width - 80);
          const y = 36 + (1 - star.alt) * (height * 0.55);
          ctx.fillStyle = star.color || "#f4f6fb";
          ctx.globalAlpha = 0.25;
          ctx.beginPath();
          ctx.arc(x, y, star.size * 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.arc(x, y, star.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#c8d4e8";
          ctx.font = "12px Trebuchet MS, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(star.seen ? `${star.label} · logged` : star.label, x, y + 22);
        }
        skyEyeCanvas.onkeydown = (event) => {
          if (event.key === "Enter" || event.key === " ") {
            const unseen = (view.targets || []).find((row) => !row.seen);
            if (unseen) handlers.onPick?.(unseen.id);
          }
        };
        skyEyeCanvas.tabIndex = 0;
      }
    },
    showSpectrum(open, view = {}, handlers = {}) {
      if (!spectrumBench) return;
      spectrumBench.hidden = !open;
      if (!open) return;
      if (spectrumTitle) spectrumTitle.textContent = view.title || "Field spectrograph";
      if (spectrumLead) spectrumLead.textContent = view.lead || "";
      if (spectrumReadout) spectrumReadout.textContent = view.readout || "";
      if (spectrumStatus) spectrumStatus.textContent = view.status || "";
      if (spectrumLog) {
        spectrumLog.textContent = view.logLabel || "Log this reading";
        spectrumLog.onclick = () => handlers.onLog?.();
      }
      if (spectrumClose) {
        spectrumClose.textContent = view.closeLabel || "Back to the basin";
        spectrumClose.onclick = () => handlers.onClose?.();
      }
      if (spectrumLamp) {
        spectrumLamp.hidden = view.mode !== "lamp";
        spectrumLamp.textContent = view.lampOn ? "Turn lamp off" : "Turn lamp on";
        spectrumLamp.onclick = () => handlers.onToggleLamp?.();
      }
      if (spectrumTools) {
        spectrumTools.replaceChildren();
        if (view.showAlign) {
          const label = document.createElement("label");
          label.textContent = "Slide east trace";
          const slider = document.createElement("input");
          slider.type = "range";
          slider.min = "-80";
          slider.max = "80";
          slider.value = String(view.shift || 0);
          slider.setAttribute("aria-label", "Slide one spectrum against the other");
          slider.addEventListener("input", () => handlers.onShift?.(Number(slider.value)));
          label.appendChild(slider);
          spectrumTools.appendChild(label);
        }
        if (view.mode === "ember") {
          const white = document.createElement("label");
          const whiteSlide = document.createElement("input");
          whiteSlide.type = "range";
          whiteSlide.min = "380";
          whiteSlide.max = "760";
          whiteSlide.value = String(view.whiteMark || 428);
          whiteSlide.setAttribute("aria-label", "White target peak wavelength in nanometers");
          const whiteText = document.createTextNode(`White peak ${whiteSlide.value} nm`);
          white.append(whiteText, whiteSlide);
          whiteSlide.addEventListener("input", () => {
            whiteText.textContent = `White peak ${whiteSlide.value} nm`;
            handlers.onPeak?.("white", Number(whiteSlide.value));
          });
          const ember = document.createElement("label");
          const emberSlide = document.createElement("input");
          emberSlide.type = "range";
          emberSlide.min = "380";
          emberSlide.max = "760";
          emberSlide.value = String(view.emberMark || 628);
          emberSlide.setAttribute("aria-label", "Reddish target peak wavelength in nanometers");
          const emberText = document.createTextNode(`Reddish peak ${emberSlide.value} nm`);
          ember.append(emberText, emberSlide);
          emberSlide.addEventListener("input", () => {
            emberText.textContent = `Reddish peak ${emberSlide.value} nm`;
            handlers.onPeak?.("ember", Number(emberSlide.value));
          });
          spectrumTools.append(white, ember);
        }
        if (view.toolChips) {
          const row = document.createElement("div");
          row.className = "chip-row";
          spectrumTools.appendChild(row);
          fillChips(row, view.toolChips.items, view.toolChips.selected, (id) => handlers.onTool?.(id));
        }
      }
      if (spectrumCanvas) {
        const ctx = spectrumCanvas.getContext("2d");
        drawSpectrumBench(ctx, view);
        spectrumCanvas.tabIndex = 0;
        spectrumCanvas.onclick = (event) => {
          const box = spectrumCanvas.getBoundingClientRect();
          const x = ((event.clientX - box.left) / box.width) * spectrumCanvas.width;
          const nm = 380 + ((x - 28) / Math.max(1, spectrumCanvas.width - 56)) * 380;
          handlers.onCanvas?.(Math.max(380, Math.min(760, nm)));
        };
        spectrumCanvas.onkeydown = (event) => {
          if (event.key === "Enter" || event.key === " ") {
            const mid = view.mode === "lamp" ? 546 : view.mode === "ember" ? Number(view.emberMark || 628) : 486;
            handlers.onCanvas?.(mid);
          }
        };
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
  art.append(h, kind, obs);
  if (card.interpreted && card.significance) {
    const sig = document.createElement("p");
    sig.className = "evidence-sig";
    sig.textContent = card.significance;
    art.appendChild(sig);
  }
  if (card.question) {
    const q = document.createElement("p");
    q.className = "evidence-q";
    q.textContent = card.question;
    art.appendChild(q);
  }
  return art;
}
