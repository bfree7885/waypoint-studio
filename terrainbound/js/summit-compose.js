/**
 * Local grounded composer. Writes conversational tutoring from the packet.
 * Not a neural model. Used when no remote adapter is configured, and in tests.
 */

import { stripCodes } from "./summit-packet.js";
import { isCuriosity, isFollowUp, isNextActionAsk, isOffTopic, wantsDirectAnswer } from "./summit-route.js";
import { GAME_HELP_LINE, characterReply, isCharacterAsk, isGameHelpAsk } from "./summit-character.js";

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
      "I'm Summit, the hollow's Earth Science companion. That question isn't on this trail. Cedar Hollow is.",
      { offTopic: true, supportLevel: level }
    );
  }

  if (isGameHelpAsk(q)) {
    return out(GAME_HELP_LINE, { supportLevel: level });
  }

  if (isCharacterAsk(q)) {
    return out(characterReply(q), { supportLevel: level });
  }

  if (/gravity (get|gets|is) stronger|stronger gravity/i.test(q)) {
    return out("Gravity does not get stronger on a steep hill. More of the same pull acts downhill along the surface.", {
      concept: "slope",
      supportLevel: level
    });
  }

  if (/path is longer|farther to travel|further to travel|steeper means farther/i.test(q)) {
    return out("No. A longer path is not the reason. The key idea is how the slope changes the downhill part of gravity.", {
      concept: "slope",
      supportLevel: level
    });
  }

  if (wantsDirectAnswer(q)) {
    const stronger =
      level >= 4
        ? "Your slope trials measured travel time directly. Evidence based on those measurements would address Wren's question — you still choose the note."
        : "Wren is asking about a specific kind of evidence. Look for a note that actually answers that question. I will not name a card for you to pin.";
    return out(stronger, { supportLevel: level });
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
    return out(line, { supportLevel: level });
  }

  if (/difference between observation and interpretation|observation or a cause/i.test(q)) {
    return out(
      "Observation is what you directly saw or measured. Interpretation is the explanation you give those facts.",
      { concept: "observation", supportLevel: level }
    );
  }

  if (/i saw that runoff is caused|i think steep made it faster|proves slope/i.test(q)) {
    return out(
      "A time you recorded is an observation. “Steep made it faster” is an interpretation, and it needs a fair steep-versus-gentle comparison before it is a result.",
      { concept: "observation", supportLevel: level }
    );
  }

  if (/the water moved 10\.2/i.test(q)) {
    const has = (facts.numbers || []).some((n) => Number(n).toFixed(1) === "10.2");
    return out(
      has
        ? "10.2 seconds is a measured travel time — that is an observation. Why it happened is a separate interpretation."
        : "I do not see 10.2 seconds in the times I can read. I will not invent it.",
      { concept: "observation", supportLevel: level }
    );
  }

  if (/what am i comparing|compare/i.test(q) && facts.measurements?.length) {
    const ready = Boolean(facts.comparisonStatus?.comparisonReady);
    return out(
      ready
        ? timesLine(facts) + " Which slope finished sooner with the same water?"
        : timesLine(facts) + " Repeating the steep setup is not a steep-versus-gentle comparison yet.",
      { concept: "fair-test", supportLevel: level }
    );
  }

  if (/makes no sense|why did it|faster|slower/i.test(q) && facts.measurements?.length) {
    const ready = Boolean(facts.comparisonStatus?.comparisonReady);
    const science =
      "On a steeper slope, more of gravity's pull acts downhill, so the same water tends to move faster. Gravity itself is not stronger.";
    return out(
      ready
        ? timesLine(facts) + " " + science
        : timesLine(facts) + " " + science + " Your log has not shown the gentler slope yet.",
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

  if (/i dont get|i don't get|^why$|^what$/i.test(q)) {
    return out(
      level <= 0
        ? `Right now you're working on ${facts.puzzle}. Look at the land or the tablet, then ask about what you actually see.`
        : `Right now you're working on ${facts.puzzle}. ${ladderPrompt(level, facts)}`,
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
  const ready = Boolean(facts.comparisonStatus?.comparisonReady);
  if (/gravity gets stronger|gravity stronger/i.test(q)) {
    return "Gravity does not get stronger on a steep hill. More of the same pull acts downhill along the surface.";
  }
  if (/path|farther|further|longer/i.test(q)) {
    return "A longer path is not the reason. The slope changes how much of gravity's pull acts downhill.";
  }
  if (/steep matter/i.test(q)) {
    return level >= 3
      ? "On a steeper slope, more of gravity's pull acts downhill, so the same water tends to move faster. Gravity itself is not stronger."
      : "Steepness is the thing that would change in a fair slope test.";
  }
  if (/gentle|slow/i.test(q)) {
    if (!facts.comparisonStatus?.gentleMeasured) {
      return "The gentler slope has not been measured yet. Science expects it to take longer if other conditions stay comparable, but your log has not shown that yet.";
    }
    return "Yes — the gentler run took longer in the times you logged. Slope changed; the cup of water did not.";
  }
  if (/steep/i.test(q) && facts.measurements?.length) {
    if (!ready) {
      return "Your steep trials are measurements of that one setup. They do not yet show steep versus gentle.";
    }
    return "That's what your measurements support here. Steeper channels finished sooner when the water stayed the same.";
  }
  if (/so\??$|faster\?$/i.test(q) || /steeper means faster/i.test(q)) {
    if (ready) return "That's what your measurements support here.";
    return facts.measurements?.length
      ? "Science expects the steeper slope to be faster if other conditions stay comparable. Your log has not shown the gentle comparison yet."
      : "I do not have fair times to confirm that yet. Time the same cup on more than one slope.";
  }
  if (/easier|another way/i.test(q)) return easierLine(packet, level);
  if (/why though|why\??$|huh/i.test(q)) {
    if (level >= 3) {
      return "Gravity still pulls downhill. On a steeper slope more of that pull acts downhill, so the same water usually arrives sooner.";
    }
    if (facts.measurements?.length) {
      return "Look at the measurements you actually have. Repeating the same slope is consistency, not a slope comparison.";
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
  const ready = Boolean(facts.comparisonStatus?.comparisonReady);
  if (ready && facts.measurements?.length) {
    return "Short version: same water, different slope, different time. The steeper run finished first in your log. That is slope, not a new storm.";
  }
  if (facts.measurements?.length) {
    return "Short version: you have steep-slope times. Science expects steep to be faster, but you still need a gentler-slope measurement for a fair comparison.";
  }
  return `Short version: you are figuring out ${facts.puzzle}. Look at the land or the tablet, then take the next small step.`;
}

function ladderPrompt(level, facts) {
  const ready = Boolean(facts.comparisonStatus?.comparisonReady);
  if (level <= 0) return `Right now the job is ${facts.puzzle}.`;
  if (level === 1) return facts.near?.length ? `You are near ${facts.near.join(", ")}. Look there before asking for the answer.` : "Notice one useful thing in the hollow or on the table.";
  if (level === 2) {
    return ready
      ? "Compare two things you already have — two times, two places, or two notes."
      : "You tested one setup. What would you need to change to compare slope?";
  }
  if (level === 3) return "On a steeper slope, more of gravity's pull acts downhill, so the same water tends to move faster. Gravity itself is not stronger.";
  return ready
    ? "The relationship is slope and time: if the cup stayed the same, the faster run is the steeper channel. You still record or pin it."
    : "Repeated steep trials can be consistent without proving steep versus gentle. Measure the other slope next.";
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

export function composeStudentVisible(explanation, packet, request = {}) {
  const science = stripCodes(explanation).trim();
  const parts = [];
  if (science) parts.push(science);
  if (isNextActionAsk(request.question) || request.route?.reason === "next-action") {
    const action = packet?.nextAction?.text;
    if (action) parts.push(action);
  }
  return parts.join(" ");
}

function out(response, extra = {}) {
  return {
    explanation: stripCodes(response),
    response: stripCodes(response),
    followUpQuestion: extra.followUpQuestion || "",
    concept: extra.concept || "",
    supportLevel: extra.supportLevel ?? 0,
    offTopic: Boolean(extra.offTopic)
  };
}
