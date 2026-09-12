/**
 * Deterministic Summit response provider.
 * Offline. Authored. Not an LLM. Future AIProvider must consume the same request shape.
 */

import { LEVEL, conceptKey } from "./summit-policy.js";
import { isOffTopic } from "./summit-route.js";
import { buildSummitTruth } from "./summit-truth.js";
import { conceptTeach } from "./summit-concepts.js";

const FORBIDDEN = /\bCH-\d+\b|pin CH-|select the best|correct!|incorrect!|question \d of/i;

export function createDeterministicProvider({ curriculum, concepts }) {
  return {
    id: "deterministic",
    respond(request) {
      const reply = buildReply(request, curriculum, concepts);
      if (FORBIDDEN.test(reply.text)) {
        reply.text = "That note has to come from your tablet and the hollow — I will not name a card id or finish the action for you.";
        reply.revealsAnswer = false;
      }
      return reply;
    }
  };
}

function pack(text, extra = {}) {
  return {
    text,
    more: extra.more || "",
    moreAvailable: Boolean(extra.more),
    level: extra.level ?? 0,
    conceptIds: extra.conceptIds || [],
    misconceptionId: extra.misconceptionId || null,
    worldCue: extra.worldCue || "",
    revealsAnswer: false,
    provider: "deterministic"
  };
}

function puzzlePack(curriculum, id) {
  return curriculum?.puzzles?.[id] || null;
}

function conceptEntry(concepts, id) {
  return concepts?.[id] || concepts?.[conceptKey(id)] || null;
}

function noteById(context, id) {
  return (context.tablet || []).find((row) => row.id === id) || null;
}

function hasEvidence(context, id) {
  return (context.evidenceEarned || []).includes(id);
}

function flumeSummary(context) {
  const fair = context.raw?.flume?.fairTrials || [];
  if (!fair.length) return null;
  const by = {};
  for (const row of fair) {
    by[row.slope] = by[row.slope] || [];
    by[row.slope].push(row.seconds);
  }
  const parts = Object.entries(by).map(([slope, secs]) => {
    const mean = secs.reduce((sum, n) => sum + n, 0) / secs.length;
    return `${slope}: ${secs.map((n) => `${n}s`).join(", ")} (mean ${mean.toFixed(1)}s)`;
  });
  return parts.join(". ");
}

function missingHonesty(context, needId, haveLine, missLine) {
  if (hasEvidence(context, needId)) return haveLine;
  return missLine;
}

function ladderLine(packFor, level) {
  if (level <= LEVEL.ORIENT) return packFor.orient;
  if (level === LEVEL.NOTICE) return packFor.notice;
  if (level === LEVEL.REASON) return packFor.reason;
  if (level === LEVEL.TEACH) return packFor.teach;
  return packFor.scaffold;
}

function aarWhy(context, packFor, level) {
  const judged = context.aar?.lastJudge || context.aar?.judged;
  const pinned = context.aar?.pinnedNotes || [];
  const claim = context.aar?.claimText || "Wren's current claim";
  if (!pinned.length && judged?.kind !== "incomplete") {
    return pack(
      `Wren asked: “${claim}” You have not pinned a note yet. I cannot tell you which card to tap. Start from what the claim is actually about.`,
      { level, misconceptionId: "incomplete", worldCue: packFor.worldCue }
    );
  }
  const titles = pinned.map((row) => row.title).join("; ");
  const categories = pinned.map((row) => row.category).join(", ");
  if (judged?.kind === "misconception") {
    return pack(
      `That set still mixes clocks. ${judged.hint || packFor.misconceptions.timescale} The notes you pinned (${titles}) are real, but they do not answer this morning's question.`,
      { level, misconceptionId: "timescale", worldCue: packFor.worldCue }
    );
  }
  if (judged?.kind === "overclaim") {
    const extra = pinned.find((row) => !(context.aar.required || []).includes(row.id) && !(context.aar.useful || []).includes(row.id));
    const extraBit = extra
      ? `“${extra.title}” is ${extra.category} evidence.`
      : `Those extra notes are ${categories || "a different kind"} of evidence.`;
    const teach =
      level >= LEVEL.SCAFFOLD
        ? " Stay with notes about the same process Wren named — runoff timing, the pulse places, the seen rock, or the longer clock — and drop the rest. You still choose."
        : " Ask what question Wren asked, then ask whether this note answers that question.";
    return pack(`${extraBit} ${judged.hint || packFor.misconceptions.overclaim}${teach}`, {
      level,
      misconceptionId: "overclaim",
      worldCue: packFor.worldCue
    });
  }
  if (judged?.kind === "incomplete" || judged?.kind === "missing") {
    const extra = pinned.find(
      (row) => !(context.aar.required || []).includes(row.id) && !(context.aar.useful || []).includes(row.id)
    );
    const mismatch = extra
      ? `“${extra.title}” is real, but it answers a different question than Wren asked.`
      : "You have not pinned a note that actually answers this claim.";
    const need = judged.hint || packFor.misconceptions.incomplete;
    const teach =
      level >= LEVEL.SCAFFOLD
        ? " Stay with notes of the same kind Wren named — seen rock, runoff timing, the pulse places, or the longer clock — and drop the rest. You still choose."
        : " Read the claim again. Ask whether this note is the same kind of evidence, not whether you visited a place.";
    return pack(`${mismatch} ${need}${teach}`, {
      level,
      misconceptionId: extra ? "overclaim" : "incomplete",
      worldCue: packFor.worldCue
    });
  }
  return pack(packFor.reason, { level, worldCue: packFor.worldCue });
}

function buildReply(request, curriculum, concepts) {
  const { context, intent, conceptId, level } = request;
  const id = context.activePuzzleId || "CH-02";
  const packFor = puzzlePack(curriculum, id);
  if (!packFor) {
    return pack("I only tutor Cedar Hollow in this slice. Wren still runs the field work.");
  }

  if (isOffTopic(request.question)) {
    return pack(
      "I'm your field science tutor here. I will not answer that. If you want, I can help with what you're seeing in Cedar Hollow.",
      { level, worldCue: packFor.worldCue }
    );
  }

  const route = request.route?.reason || "";
  const truth = request.packet
    ? {
        known: request.packet.facts.known,
        expected: request.packet.facts.expected,
        unknown: request.packet.facts.unknown,
        nextAction: request.packet.nextAction,
        comparisonStatus: request.packet.facts.comparisonStatus
      }
    : buildSummitTruth(context);

  if (route === "evidence-inventory") {
    const known = truth.known?.length ? truth.known.join("; ") : "none recorded yet";
    const unknown = (truth.unknown || []).join("; ");
    return pack(`Notes I can read: ${known}. Still unknown: ${unknown}. I will not invent a card you have not collected.`, {
      level
    });
  }

  if (route === "next-action") {
    return pack(truth.nextAction?.text || "Keep the comparison fair with measurements you actually record.", {
      level
    });
  }

  if (route === "gameplay-redirect") {
    return pack(
      "I will not name a button, tap target, or card to pin. Use the controls and notes you can already see. Wren still judges the case.",
      { level }
    );
  }

  if (route === "fair-test") {
    return fairTestLine(request.question || "", truth, level);
  }

  if (route === "observation") {
    return observationLine(request.question || "", truth, level);
  }

  if (route === "epistemic") {
    return epistemicLine(request.question || "", truth, level);
  }

  if (route === "state-honesty") {
    return honestyLine(request.question || "", context, truth, packFor, level);
  }

  if (route === "answer-ladder") {
    const stronger =
      level >= LEVEL.SCAFFOLD
        ? "Your slope trials, if you recorded them, measured travel time directly. Evidence based on those measurements would address Wren's question — you still choose the note."
        : "I will not finish the case or name a card. Look for a note that actually answers Wren's question.";
    return pack(stronger, { level });
  }

  if (/clearance/i.test(request.question || "") && context.aar?.result !== "clearance") {
    return pack("Wren has not granted field clearance yet. The case is still yours to support with notes you actually collected.", {
      level,
      worldCue: packFor.worldCue
    });
  }

  if (/high look/i.test(request.question || "") && !(context.observations || []).includes("high-look")) {
    return pack("You haven't inspected High Look yet. I will not describe a view you have not stood in. Walk the high ledge if you want that note.", {
      level,
      worldCue: "High Look is the ledge above the hollow."
    });
  }

  if (intent === "vocab") {
    const key = conceptKey(conceptId) || packFor.vocab[0];
    const entry = conceptEntry(concepts, key);
    if (!entry) return pack(packFor.teach, { level: LEVEL.TEACH, conceptIds: packFor.vocab, worldCue: packFor.worldCue });
    return pack(entry.short, {
      more: entry.more,
      level: LEVEL.TEACH,
      conceptIds: [entry.id],
      worldCue: packFor.worldCue
    });
  }

  if (intent === "graph" || intent === "compare") {
    const times = flumeSummary(context);
    if (times) {
      return pack(
        `These are times you recorded: ${times}. Which slope finished sooner when the water stayed the same?`,
        { level: Math.max(level, LEVEL.REASON), conceptIds: ["pattern", "fair-test"], worldCue: packFor.worldCue }
      );
    }
    return pack(
      missingHonesty(
        context,
        "CH-03",
        "You have runoff notes, but I do not see fair trial times I can read. Open the table and check the log.",
        "You haven't measured that yet. The runoff table can give you evidence — predict, then time the same cup on more than one slope."
      ),
      { level, conceptIds: ["fair-test"], worldCue: "The runoff table is by the station." }
    );
  }

  if ((intent === "why_wrong" || intent === "why_evidence") && (context.aar.open || context.activePuzzleId === "CH-09")) {
    return aarWhy(context, packFor, level);
  }

  if (intent === "notice") {
    const highLook = (context.observations || []).includes("high-look");
    if (/high look/i.test(request.question || "")) {
      return pack(
        highLook
          ? "From High Look you already noted that the hollow tilts. Water should linger on low ground — pond and willow bench — not on the knob."
          : "You haven't inspected High Look yet. I will not describe a view you have not stood in. Walk the high ledge if you want that note.",
        { level: LEVEL.NOTICE, worldCue: "High Look is the ledge above the hollow." }
      );
    }
    const near = context.location?.near?.length ? `You are near ${context.location.near.join(", ")}. ` : "";
    return pack(`${near}${packFor.notice}`, { level: LEVEL.NOTICE, worldCue: packFor.worldCue });
  }

  if (intent === "missing") {
    const missing = context.evidenceMissing || [];
    if (!missing.length && context.aar.open) return aarWhy(context, packFor, level);
    if (!missing.length) {
      return pack("The tablet already holds the Layer A notes. Wren still needs a coherent case — the right notes for this claim, not every card.", {
        level,
        worldCue: packFor.worldCue
      });
    }
    const first = missing[0];
    const line = missingHonesty(
      context,
      first,
      `You already have ${noteById(context, first)?.title || "that note"}. Use it; do not collect it twice.`,
      packFor.orient
    );
    return pack(
      `${line} Missing work still includes ${missing.length === 1 ? "one investigation" : `${missing.length} investigations`}. I will not name a cheat path.`,
      { level, worldCue: packFor.worldCue }
    );
  }

  if (intent === "why_wrong" || intent === "why_evidence") {
    const key = detectMisconception(context, packFor);
    const line = packFor.misconceptions[key] || context.rejected?.lastHint || packFor.reason;
    return pack(line, { level: Math.max(level, LEVEL.REASON), misconceptionId: key, worldCue: packFor.worldCue });
  }

  if (intent === "explain_more") {
    const more = (packFor.explainMore || [])[Math.min((packFor.explainMore || []).length - 1, Math.max(0, level - 1))] || packFor.teach;
    return pack(more, { more: packFor.explainMore?.[1] || "", level, conceptIds: packFor.vocab, worldCue: packFor.worldCue });
  }

  if (intent === "explain") {
    return pack(packFor.teach, {
      more: (packFor.explainMore || [])[0] || "",
      level: LEVEL.TEACH,
      conceptIds: packFor.vocab,
      worldCue: packFor.worldCue
    });
  }

  if (intent === "hint") {
    const line = ladderLine(packFor, level);
    return pack(line, { more: packFor.teach, level, conceptIds: packFor.vocab, worldCue: packFor.worldCue });
  }

  const line = ladderLine(packFor, level);
  const earned = context.evidenceEarned || [];
  const remind =
    earned.length && level <= LEVEL.NOTICE
      ? ` You already have notes from ${earned.length === 1 ? "one" : earned.length} investigations in the tablet.`
      : "";
  return pack(`${line}${remind}`, { level, conceptIds: packFor.vocab, worldCue: packFor.worldCue });
}

function fairTestLine(question, truth, level) {
  const q = String(question || "");
  const ready = Boolean(truth.comparisonStatus?.comparisonReady);
  const known = truth.known?.length ? truth.known.join("; ") : "none recorded yet";
  if (/10\.2|10\.4/.test(q) && /gentle/i.test(q) && !ready) {
    return pack("No. Both of those times are steep-slope trials. They do not split into steep versus gentle.", {
      level,
      conceptIds: ["fair-test"]
    });
  }
  if (/what am i comparing/i.test(q) && !ready) {
    return pack(
      `I can read these times: ${known}. Repeating the steep setup is not a steep-versus-gentle comparison yet.`,
      { level, conceptIds: ["fair-test"] }
    );
  }
  if (/which slope was faster/i.test(q) && !ready) {
    return pack(
      `I can read these times: ${known}. Both measured setups are steep, so they do not answer which slope is faster.`,
      { level, conceptIds: ["fair-test"] }
    );
  }
  if (/gentle 12|was gentle \d|already do gentle/i.test(q) && !truth.comparisonStatus?.gentleMeasured) {
    return pack("The gentler slope has not been measured yet. I will not invent that time or treat it as done.", {
      level,
      conceptIds: ["fair-test"]
    });
  }
  if (/both steep|they'?re both steep|bro they/i.test(q) && !ready) {
    return pack("Yes. Both of those runs are steep-slope trials. Repeating steep does not create a gentle comparison.", {
      level,
      conceptIds: ["fair-test"]
    });
  }
  if (ready) {
    return pack(`You have both slopes in the log: ${known}. Compare those measured times; do not invent extra ones.`, {
      level,
      conceptIds: ["fair-test"]
    });
  }
  if (/proved|conclude|already compared|did it twice|two steep|at once is that fair|change slope and water/i.test(q)) {
    return pack(conceptTeach("fair-test", 4), { level, conceptIds: ["fair-test"] });
  }
  return pack(conceptTeach("fair-test", Math.max(level, 2)), { level, conceptIds: ["fair-test"] });
}

function observationLine(question, truth, level) {
  const q = String(question || "");
  const known = truth.known?.length ? truth.known.join("; ") : "none recorded yet";
  if (/the water moved 10\.2|10\.2/i.test(q)) {
    return pack(
      "10.2 seconds is a measured travel time — that is an observation. Why it happened is a separate interpretation.",
      { level, conceptIds: ["observation"] }
    );
  }
  return pack(
    `${conceptTeach("observation", 3)} Known measurements stay observations: ${known}.`,
    { level, conceptIds: ["observation"] }
  );
}

function epistemicLine(question, truth, level) {
  const q = String(question || "");
  const known = truth.known?.length ? truth.known.join("; ") : "none recorded yet";
  const expected = (truth.expected || []).join("; ");
  const unknown = (truth.unknown || []).join("; ");
  if (/predict/i.test(q)) {
    return pack(`That is a prediction, not a result: ${expected}. Unknown until you measure: ${unknown}.`, {
      level,
      conceptIds: ["observation"]
    });
  }
  if (/haven'?t i tested|have i not tested|not tested/i.test(q)) {
    return pack(`Not yet tested or unknown: ${unknown}.`, { level, conceptIds: ["observation"] });
  }
  if (/already prove|experiment show/i.test(q)) {
    if (!truth.comparisonStatus?.comparisonReady) {
      return pack(
        `Known measurements: ${known}. Your log has not shown a steep-versus-gentle result yet. Science still expects the steeper slope to be faster if other conditions stay comparable.`,
        { level, conceptIds: ["fair-test"] }
      );
    }
    return pack(`Your measured times are ${known}. Use those, not a guess.`, { level, conceptIds: ["fair-test"] });
  }
  return pack(`Known (measured): ${known}. Expected by science, not yet your result: ${expected}. Unknown: ${unknown}.`, {
    level,
    conceptIds: ["observation"]
  });
}

function honestyLine(question, context, truth, packFor, level) {
  const q = String(question || "");
  if (/high look/i.test(q) && !(context.observations || []).includes("high-look")) {
    return pack("You haven't inspected High Look yet. I will not describe a view you have not stood in.", {
      level,
      worldCue: "High Look is the ledge above the hollow."
    });
  }
  if (/third (runoff )?trial|trial three|3rd trial/i.test(q)) {
    const n = (context.raw?.flume?.fairTrials || []).length;
    return pack(
      n
        ? `I only see ${n} fair trial${n === 1 ? "" : "s"} in your log. I will not invent a third time.`
        : "You haven't recorded fair runoff times yet. I will not invent a third trial.",
      { level }
    );
  }
  if (/clearance|clear me|wren clear|already finish|did i already/i.test(q) && context.aar?.result !== "clearance") {
    return pack("Wren has not granted field clearance yet. The case is still yours to support with notes you actually collected.", {
      level
    });
  }
  if (/what did i find before|notes do i have|evidence do i have/i.test(q)) {
    const known = truth.known?.length ? truth.known.join("; ") : "none recorded yet";
    return pack(`Notes I can read: ${known}. I will not invent a find you have not made.`, { level });
  }
  if (/gentle/i.test(q) && (truth.unknown || []).some((row) => /gentle/i.test(row))) {
    return pack("The gentler slope has not been measured yet. I will not invent that time.", { level });
  }
  if (/steep/i.test(q) && (truth.unknown || []).some((row) => /steep slope/i.test(row))) {
    return pack("The steeper slope has not been measured yet. I will not invent that time.", { level });
  }
  return pack("I will only talk about observations and times that are already in your log.", { level });
}

function detectMisconception(context, packFor) {
  if (context.rejected?.unfairAttempted) return "unfair-test";
  if (context.raw?.flume?.trials?.length === 1) return "one-trial";
  if (context.aar?.lastJudge?.kind === "overclaim") return "overclaim";
  if (context.aar?.lastJudge?.kind === "misconception") return "timescale";
  const keys = Object.keys(packFor.misconceptions || {});
  return keys[0] || "obs-vs-interp";
}
