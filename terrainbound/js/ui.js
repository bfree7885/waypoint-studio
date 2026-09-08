/**
 * Minimal HTML overlays. World stays primary; panels appear only when needed.
 */

import { drawFieldSketch } from "./investigation.js";

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

  let toastTimer = 0;
  let hypothesisHandlers = { onProcess: null, onEvidence: null };

  return {
    showTitle(visible) {
      title.hidden = !visible;
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
      }, 4200);
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
        empty.textContent = "No mission notes yet. Walk the hollow and inspect what you find.";
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
        discoveryCount.textContent = `Cedar Hollow discoveries  ${log.foundCount} / ${log.total}`;
        if (!log.found.length) {
          const empty = document.createElement("p");
          empty.className = "journal-empty";
          empty.textContent = "Nothing in this section yet. Wander. Look closely.";
          discoveryBody.appendChild(empty);
        }
        for (const item of log.found) {
          const art = document.createElement("article");
          art.className = "discovery-card";
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
      if (evidenceSection) evidenceSection.hidden = !showEvidence;
      if (sketchSection) sketchSection.hidden = !showEvidence;
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
    }
  };
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
