/**
 * Local grounded composer. Writes conversational tutoring from the packet.
 * Not a neural model. Used when no remote adapter is configured, and in tests.
 */

import { stripCodes } from "./summit-packet.js";
import { isCuriosity, isFollowUp, isOffTopic, wantsDirectAnswer } from "./summit-route.js";

export function createLocalComposerAdapter({ curiosity = {} } = {}) {
  return {
    id: "local-composer",
    kind: "local",
    async complete({ packet, question }) {
      return composeLocal(packet, question, curiosity);
    }
  };
}

export function composeLocal(packet, question, curiosity = {}) {
  const q = String(question || "").trim();
  const facts = packet?.facts || {};
  const level = packet?.tutoring?.allowedLevel ?? 0;
  const recent = packet?.recent || [];

  if (isOffTopic(q)) {
    return out(
      "I'm your field science tutor here. If you want, I can help with what you're seeing in Cedar Hollow.",
      { offTopic: true, supportLevel: level }
    );
  }

  if (wantsDirectAnswer(q)) {
    const stronger =
      level >= 4
        ? "Your slope trials measured travel time directly. Evidence based on those measurements would address Wren's question — you still choose the note."
        : "Wren is asking about a specific kind of evidence. Look for a note that actually answers that question. I will not name a card for you to pin.";
    return out(stronger, { supportLevel: level, suggestedAction: "open-tablet" });
  }

  if (/third (runoff )?trial|trial three|3rd trial/i.test(q)) {
    const n = facts.fairTrialCount || 0;
    if (n < 3) {
      return out(
        n
          ? `I only see ${n} fair trial${n === 1 ? "" : "s"} in your log. I will not invent a third time.`
          : "You haven't recorded fair runoff times yet. The table can give you those measurements.",
        { supportLevel: level }
      );
    }
  }

  if (/high look/i.test(q)) {
    if (!facts.inspectedHighLook) {
      return out("You haven't inspected High Look yet. I will not describe a view you have not stood in.", {
        supportLevel: level
      });
    }
    return out("From High Look you already noted that the hollow tilts. Water should linger on low ground.", {
      supportLevel: level
    });
  }

  if (/clearance|already gave|unlocked high country/i.test(q)) {
    if (facts.clearance) {
      return out("Wren already accepted the case. High Country is available when you want the mountains.", { supportLevel: level });
    }
    return out("Wren has not granted field clearance yet. The case is still yours to support with notes you actually collected.", {
      supportLevel: level
    });
  }

  if (isCuriosity(q)) {
    return out(curiosityLine(q, curiosity, facts), { concept: curiosityConcept(q), supportLevel: level });
  }

  if (isFollowUp(q, recent)) {
    return out(followUpLine(q, packet, recent, level), { supportLevel: level });
  }

  if (/which note|why cant i use|why can't i use|this one/i.test(q) && facts.wrenClaim) {
    const pin = facts.pinned?.[0];
    const line = pin
      ? `“${pin}” is a real note, but Wren asked: ${facts.wrenClaim} Ask whether that note answers that question.`
      : `Wren asked: ${facts.wrenClaim} Pin a note that matches that question. I will not name a cheat card.`;
    return out(line, { supportLevel: level, referencedEvidence: pin ? [pin] : [] });
  }

  if (/what am i comparing|compare/i.test(q) && facts.measurements?.length) {
    return out(timesLine(facts) + " Which slope finished sooner with the same water?", {
      concept: "fair-test",
      supportLevel: level
    });
  }

  if (/makes no sense|why did it|faster|slower/i.test(q) && facts.measurements?.length) {
    return out(
      level >= 3
        ? timesLine(facts) + " On the steeper surface, gravity pulls the same water downhill more effectively, so it usually finishes sooner."
        : timesLine(facts) + " Compare those two. Which trial had the shorter time?",
      { concept: "slope", supportLevel: level }
    );
  }

  if (/swamp|marsh/i.test(q)) {
    return out(
      "A marsh can store water and change timing. That is not automatically the same as the brown pulse that rode a tributary after a slope failed. Walk those places if the notes are thin.",
      { concept: "storage", supportLevel: level }
    );
  }

  if (/trees cause|trees caused|willows start/i.test(q)) {
    return out("Willows can take a hit without starting the flood. Ask what moved the water — rain, slope, and path.", {
      concept: "system",
      supportLevel: level
    });
  }

  if (/easier|another way|still don/i.test(q)) {
    return out(easierLine(packet, level), { supportLevel: level });
  }

  if (/what am i even doing|i dont get|i don't get|^why$|^what$|^help$/i.test(q)) {
    return out(
      level <= 0
        ? `Right now you are working on ${facts.puzzle}. Walk the ground or use the table, then ask about what you actually see.`
        : `Right now you are working on ${facts.puzzle}. ${ladderPrompt(level, facts)}`,
      { supportLevel: level }
    );
  }

  return out(
    `${ladderPrompt(level, facts)} I can explain the science; you still walk, measure, and pin.`,
    { supportLevel: level }
  );
}

function timesLine(facts) {
  if (!facts.measurements?.length) return "I do not see fair trial times I can read.";
  const parts = facts.measurements.map((row) => `${row.slope} ${row.seconds}s`);
  return `These are times you recorded: ${parts.join(", ")}.`;
}

function followUpLine(q, packet, recent, level) {
  const last = [...recent].reverse().find((row) => row.role === "summit")?.text || "";
  const facts = packet.facts || {};
  if (/steep/i.test(q) && facts.measurements?.length) {
    return "That's what your measurements support here. Steeper channels finished sooner when the water stayed the same.";
  }
  if (/gentle|slow/i.test(q) && facts.measurements?.length) {
    return "Yes — the gentler run took longer in the times you logged. Slope changed; the cup of water did not.";
  }
  if (/so\??$|faster\?$/i.test(q) || /steeper means faster/i.test(q)) {
    return facts.measurements?.length
      ? "That's what your measurements support here."
      : "I do not have fair times to confirm that yet. Time the same cup on more than one slope.";
  }
  if (/easier|another way/i.test(q)) return easierLine(packet, level);
  if (/why though|why\??$/i.test(q)) {
    if (level >= 3) {
      return "Gravity still pulls downhill. Steeper ground gives that pull more of a run, so the same water usually arrives sooner.";
    }
    if (facts.measurements?.length) {
      return "Look at the two measurements again. Something changed when the slope changed.";
    }
    return last
      ? `Stay with that. ${ladderPrompt(level, facts)}`
      : "Ask what one thing you changed, then compare the times you actually recorded.";
  }
  if (/that part|that$/i.test(q)) {
    return last ? `That part: ${last.slice(0, 220)}` : "Which part — the times, the claim, or the place in the hollow?";
  }
  return last
    ? `Stay with that. ${ladderPrompt(level, facts)}`
    : ladderPrompt(level, facts);
}

function easierLine(packet, level) {
  const facts = packet.facts || {};
  if (facts.measurements?.length) {
    return "Short version: same water, different slope, different time. The steeper run finished first in your log. That is slope, not a new storm.";
  }
  return `Short version: you are figuring out ${facts.puzzle}. Look at the land or the tablet, then take the next small step.`;
}

function ladderPrompt(level, facts) {
  if (level <= 0) return `You are trying to understand ${facts.puzzle}.`;
  if (level === 1) return facts.near?.length ? `You are near ${facts.near.join(", ")}. Look there before asking for the answer.` : "Notice one useful thing in the hollow or on the table.";
  if (level === 2) return "Compare two things you already have — two times, two places, or two notes.";
  if (level === 3) return "The science is that gravity pulls runoff downhill; steeper, looser ground usually sheds it faster.";
  return "The relationship is slope and time: if the cup stayed the same, the faster run is the steeper channel. You still record or pin it.";
}

function curiosityLine(q, curiosity, facts) {
  const bank = curiosity || {};
  if (/flash flood/i.test(q)) return bank["flash-flood"] || "A flash flood is a sudden pulse of runoff. Steep, already-wet, or burned ground can shed rain fast. That is the same family of idea as your slope times — not a new region.";
  if (/snow/i.test(q)) return bank.snowmelt || "Snowmelt can also become runoff when water is released on a slope. The path still follows gravity. I do not know your local forecast.";
  if (/where i live|at home|in my town/i.test(q)) return bank.local || "I do not know where you live. Anywhere rain or melt hits sloping ground, water can run off. Cedar Hollow is the case in front of you.";
  if (/flat/i.test(q)) return bank.flat || "If the hill were flat, the same water would usually take longer. Your table is how you check that — I will not invent a flat-hill time you did not run.";
  if (/gravity/i.test(q)) return bank.gravity || "Gravity pulls water downhill everywhere. Slope changes how quickly that happens. Direction still follows the fall of the land.";
  return `That can connect to ${facts.puzzle}, but the notes in front of you still come first.`;
}

function curiosityConcept(q) {
  if (/flash flood|snow|flat/i.test(q)) return "runoff";
  if (/gravity/i.test(q)) return "gravity";
  return "system";
}

function out(response, extra = {}) {
  return {
    response: stripCodes(response),
    concept: extra.concept || null,
    referencedEvidence: extra.referencedEvidence || [],
    suggestedAction: extra.suggestedAction || null,
    supportLevel: extra.supportLevel ?? 0,
    offTopic: Boolean(extra.offTopic)
  };
}
