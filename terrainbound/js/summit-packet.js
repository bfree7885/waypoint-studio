/**
 * Compact grounding packet for Summit. TerrainBound owns the facts.
 * Never send student identity, school ids, or internal puzzle codes to a model.
 */

const TITLE_SAFE = /CH-\d+/i;

export function selectSummitPacket(request) {
  const context = request.context || {};
  const question = String(request.question || "");
  const intent = request.intent || "";
  const level = request.level ?? 0;
  const q = question.toLowerCase();

  const wantAar =
    Boolean(context.aar?.open) ||
    intent === "why_wrong" ||
    intent === "why_evidence" ||
    /wren|pin|claim|evidence|card/i.test(question);
  const wantLook = /high look|lookout|ledge/i.test(question);

  const fair = (context.raw?.flume?.fairTrials || []).slice(0, 6);
  const measurements = fair.map((row) => ({
    slope: row.slope,
    seconds: row.seconds,
    water: row.water || "one-cup"
  }));

  const tablet = (context.tablet || []).map((row) => ({
    title: String(row.title || "").replace(TITLE_SAFE, "").trim(),
    category: row.category || "evidence"
  }));

  const pinned = wantAar
    ? (context.aar?.pinnedNotes || [])
        .map((row) => String(row.title || "").replace(TITLE_SAFE, "").trim())
        .filter(Boolean)
    : [];

  const judge = wantAar ? context.aar?.lastJudge || context.aar?.judged : null;
  const recentTurns = request.recentTurns || [];

  return {
    facts: {
      region: context.regionId === "cedar-hollow" ? "Cedar Hollow" : "other",
      puzzle: context.puzzleName || "field work",
      stage: context.puzzleStage || "",
      competencies: (context.competencyIds || []).slice(0, 3),
      near: (context.location?.near || []).slice(0, 3),
      observations: pickObservations(context, q, wantLook),
      inspectedHighLook: (context.observations || []).includes("high-look"),
      fairTrialCount: (context.raw?.flume?.fairTrials || []).length,
      measurements,
      numbers: measurements.map((row) => row.seconds),
      prediction: context.predictions?.flume || null,
      unfairAttempted: Boolean(context.rejected?.unfairAttempted),
      evidenceTitles: tablet.map((row) => row.title).filter(Boolean),
      evidenceCategories: tablet.map((row) => row.category),
      missingCount: (context.evidenceMissing || []).length,
      pinned,
      wrenClaim: wantAar ? stripCodes(context.aar?.claimText || "") : "",
      judgeKind: judge?.kind || "",
      judgeHint: stripCodes(judge?.hint || ""),
      clearance: context.aar?.result === "clearance",
      supportLevel: level
    },
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

function pickObservations(context, q, wantLook) {
  if (wantLook) return (context.observations || []).includes("high-look") ? ["High Look"] : [];
  return (context.location?.near || []).slice(0, 2);
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
  return [...(facts.evidenceTitles || []), ...(facts.pinned || [])].filter(Boolean);
}
