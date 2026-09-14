/**
 * Compact grounding packet for Summit. TerrainBound owns the facts.
 * Never send student identity, school ids, or internal puzzle codes to a model.
 */

import { buildSummitTruth } from "./summit-truth.js";
import { darkSkyPacketFacts, buildDarkSkyTruth } from "./darksky.js";

export function selectSummitPacket(request) {
  const context = request.context || {};
  const question = String(request.question || "");
  const intent = request.intent || "";
  const level = request.level ?? 0;

  const wantAar =
    Boolean(context.aar?.open) ||
    intent === "why_wrong" ||
    intent === "why_evidence" ||
    /wren|pin|claim|evidence|card/i.test(question);

  if (context.regionId === "dark-sky-basin") {
    const truth = context.darkSkyTruth || buildDarkSkyTruth();
    const recentTurns = request.recentTurns || [];
    return {
      facts: darkSkyPacketFacts(context),
      nextAction: truth.nextAction,
      tutoring: {
        allowedLevel: level,
        ladder: ["orient", "notice", "reason", "teach", "scaffold"][Math.max(0, Math.min(4, level))] || "orient",
        doNotRevealCards: true,
        doNotGrantClearance: true,
        concept: request.conceptId || null,
        allowCuriosity: true
      },
      recent: pickRecent(recentTurns),
      privacy: {
        noName: true,
        noSchool: true,
        noAccount: true
      }
    };
  }

  const fair = (context.raw?.flume?.fairTrials || []).slice(0, 6);
  const measurements = fair.map((row) => ({
    slope: row.slope,
    seconds: row.seconds,
    water: row.water || "one-cup"
  }));
  const truth = buildSummitTruth(context);
  const recentTurns = request.recentTurns || [];

  return {
    facts: {
      region: context.regionId === "cedar-hollow" ? "Cedar Hollow" : context.regionId === "dark-sky-basin" ? "Dark Sky Basin" : "other",
      puzzle: context.puzzleName || "field work",
      stage: context.puzzleStage || "",
      near: (context.location?.near || []).slice(0, 3),
      competencies: (context.competencyIds || []).slice(0, 3),
      inspectedHighLook: (context.observations || []).includes("high-look"),
      fairTrialCount: fair.length,
      measurements,
      numbers: measurements.map((row) => row.seconds),
      prediction: context.predictions?.flume || null,
      unfairAttempted: Boolean(context.rejected?.unfairAttempted),
      missingCount: (context.evidenceMissing || []).length,
      wrenClaim: wantAar ? stripCodes(context.aar?.claimText || "") : "",
      judgeKind: wantAar ? (context.aar?.lastJudge || context.aar?.judged)?.kind || "" : "",
      judgeHint: wantAar ? stripCodes((context.aar?.lastJudge || context.aar?.judged)?.hint || "") : "",
      clearance: context.aar?.result === "clearance",
      supportLevel: level,
      known: truth.known,
      expected: truth.expected,
      unknown: truth.unknown,
      science: truth.science,
      doNotClaim: truth.doNotClaim,
      comparisonValid: truth.comparisonValid,
      comparisonStatus: truth.comparisonStatus,
      evidenceStatus: truth.evidenceStatus,
      concepts: truth.concepts,
      pinned: wantAar
        ? (context.aar?.pinnedNotes || [])
            .map((row) => stripCodes(String(row.title || "")).trim())
            .filter(Boolean)
        : []
    },
    nextAction: truth.nextAction,
    tutoring: {
      allowedLevel: level,
      ladder: ["orient", "notice", "reason", "teach", "scaffold"][Math.max(0, Math.min(4, level))] || "orient",
      doNotRevealCards: true,
      doNotGrantClearance: true,
      concept: request.conceptId || null,
      allowCuriosity: true
    },
    recent: pickRecent(recentTurns),
    privacy: {
      noName: true,
      noSchool: true,
      noAccount: true
    }
  };
}

function pickRecent(rows) {
  return (rows || []).slice(-4).map((row) => ({
    role: row.role === "student" ? "student" : "summit",
    text: stripCodes(String(row.text || "")).slice(0, 220)
  }));
}

export function stripCodes(text) {
  return String(text || "")
    .replace(/\bCH-\d+\b/gi, "a field note")
    .replace(/pin CH-\d+/gi, "pin a note");
}

export function packetNumbers(packet) {
  return (packet?.facts?.numbers || []).map((n) => Number(n)).filter((n) => Number.isFinite(n));
}

export function packetTitles(packet) {
  const facts = packet?.facts || {};
  return [...(facts.known || []), ...(facts.science || [])].filter(Boolean);
}
