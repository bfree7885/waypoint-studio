/**
 * SignalTerrain Adaptive Defense
 *
 * Transparent priority engine that answers: "What should I care about differently today?"
 * Consumes live ingested cyber records only — never sample/fixture data.
 *
 * Categories: WATCH · REVIEW · PATCH / UPDATE · MITIGATE · NO IMMEDIATE ACTION
 *
 * Hard rules:
 * - Does NOT inspect user devices, networks, or endpoints.
 * - General defensive recommendations only (no exploit instructions).
 * - Every item requires evidence from live source records.
 */

export const ADAPTIVE_DEFENSE_VERSION = "1.0.0";

export const DEFENSE_CATEGORIES = [
  "PATCH / UPDATE",
  "MITIGATE",
  "REVIEW",
  "WATCH",
  "NO IMMEDIATE ACTION"
];

const CATEGORY_ORDER = {
  "PATCH / UPDATE": 0,
  MITIGATE: 1,
  REVIEW: 2,
  WATCH: 3,
  "NO IMMEDIATE ACTION": 4
};

/** Map legacy recommendation actions → Adaptive Defense categories. */
export function actionToCategory(action, enrichment, rec) {
  const a = String(action || "");
  const e = enrichment || rec?.enrichment || {};
  const known = !!(e.knownExploitation || rec?.exploitation?.knownExploited);
  const patch = e.patchAvailability === "indicated" || rec?.remediation?.patchesAvailable === true;
  const outage = rec?.type === "service-outage";
  const healthy = outage && rec?.rawProviderMetadata?.healthy;

  if (healthy || a === "ignore") return "NO IMMEDIATE ACTION";
  if (a === "disable-exposed-service" || (known && !patch)) return "MITIGATE";
  if (a === "patch-immediately" || (known && patch)) return "PATCH / UPDATE";
  if (a === "review-vendor-advisory" || a === "investigate-further") return "REVIEW";
  if (a === "monitor" || a === "increase-monitoring") return "WATCH";
  if (outage) return "WATCH";
  const score = Number(rec?.priority?.score) || 0;
  if (score >= 80 && known) return patch ? "PATCH / UPDATE" : "MITIGATE";
  if (score >= 60) return "REVIEW";
  if (score >= 35) return "WATCH";
  return "NO IMMEDIATE ACTION";
}

function evidenceFrom(rec) {
  const sources = [];
  if (rec?.source?.providerName && rec?.source?.sourceUrl) {
    sources.push({
      providerId: rec.source.providerId,
      providerName: rec.source.providerName,
      url: rec.source.sourceUrl,
      authorityLevel: rec.source.authorityLevel || null
    });
  }
  for (const s of rec?.supportingSources || []) {
    if (s.providerName && s.sourceUrl) {
      sources.push({
        providerId: s.providerId,
        providerName: s.providerName,
        url: s.sourceUrl,
        authorityLevel: null
      });
    }
  }
  return sources;
}

function generalDefensiveActions(category, rec) {
  const products = (rec?.entities?.products || []).filter(Boolean);
  const productHint = products.length
    ? `Confirm whether you run ${products.slice(0, 3).join(", ")} (versions matter).`
    : "Confirm whether named products appear in your environment (versions matter).";

  const base = [
    productHint,
    "Check the linked official advisory for vendor mitigation guidance.",
    "This app has not inspected your devices — recommendations are general defensive awareness only."
  ];

  if (category === "PATCH / UPDATE") {
    return [
      "Update or patch the affected software when you confirm it is in scope.",
      "Review exposed / internet-facing services that may run the affected product.",
      "Verify MFA on admin and remote-access paths as a standing control.",
      "Review backup freshness for systems in the affected product family.",
      ...base
    ];
  }
  if (category === "MITIGATE") {
    return [
      "Follow vendor temporary mitigations if a patch is not yet available or deployable.",
      "Reduce exposure of affected services (network controls, least privilege) until a fix is applied.",
      "Monitor official advisories for patch availability.",
      "Verify MFA and review remote-access posture.",
      ...base
    ];
  }
  if (category === "REVIEW") {
    return [
      "Review the advisory against your inventory and change calendar.",
      "Confirm whether affected products/versions are present before scheduling work.",
      "Monitor official sources for exploitation updates.",
      ...base
    ];
  }
  if (category === "WATCH") {
    return [
      "Track this item; no immediate interrupt for most environments unless it matches your stack.",
      "Revisit if exploitation evidence strengthens or a KEV listing appears.",
      ...base
    ];
  }
  return [
    "No immediate defensive interrupt from connected live sources alone.",
    "Keep routine patching and MFA/backup hygiene in place.",
    "This app has not inspected your devices."
  ];
}

function whyMovedUp(rec, previousById, previousByCve) {
  const reasons = [];
  const cve = (rec.identifiers?.cves || [])[0];
  const prev =
    (rec.id && previousById.get(rec.id)) ||
    (cve && previousByCve.get(String(cve).toUpperCase())) ||
    null;

  if (!prev) {
    if (rec.exploitation?.knownExploited && rec.source?.providerId === "cisa-kev") {
      reasons.push("Present in the live CISA KEV catalog for this refresh.");
    } else {
      reasons.push("Newly surfaced (or newly retained) in this live refresh relative to the prior artifact.");
    }
  } else {
    const prevScore = Number(prev.priority?.score) || 0;
    const curScore = Number(rec.priority?.score) || 0;
    if (curScore > prevScore + 5) {
      reasons.push(`Priority score rose from ${prevScore} to ${curScore} based on live factors.`);
    }
    if (!prev.exploitation?.knownExploited && rec.exploitation?.knownExploited) {
      reasons.push("Newly marked as known-exploited in live sources (e.g. CISA KEV).");
    }
    if (!prev.exploitation?.ransomwareLinked && rec.exploitation?.ransomwareLinked) {
      reasons.push("Newly associated with ransomware campaign use per official KEV flag.");
    }
    if (prev.recommendation?.action !== rec.recommendation?.action && rec.recommendation?.action) {
      reasons.push(`Recommended action shifted to “${rec.recommendation.label || rec.recommendation.action}”.`);
    }
  }

  // Always attach top live scoring factors as transparent “why”
  const topFactors = (rec.priority?.contributions || [])
    .filter((c) => c.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 3)
    .map((c) => c.reason);
  for (const f of topFactors) {
    if (f && !reasons.some((r) => r.includes(f.slice(0, 40)))) reasons.push(f);
  }

  if (!reasons.length) {
    reasons.push("Ranked from live priority factors in the current artifact.");
  }
  return reasons;
}

function confidenceOf(rec) {
  const c = rec.confidence || rec.enrichment?.confidence;
  if (c === "confirmed" || c === "high") return { level: "high", note: "Official/high-confidence source labeling." };
  if (c === "moderate") return { level: "moderate", note: "Authoritative or multi-source context; confirm locally." };
  if (rec.source?.authorityLevel === "official") {
    return { level: "high", note: "Official source; applicability to your environment still requires local confirmation." };
  }
  if (rec.source?.authorityLevel === "authoritative") {
    return { level: "moderate", note: "Authoritative vendor/security source." };
  }
  return { level: "preliminary", note: "Treat as awareness until confirmed against inventory and official advisories." };
}

/**
 * Build a single Adaptive Defense recommendation from a live record.
 */
export function buildDefenseItem(rec, ctx = {}) {
  const previousById = ctx.previousById || new Map();
  const previousByCve = ctx.previousByCve || new Map();
  const enrichment = rec.enrichment || {};
  const action = rec.recommendation?.action;
  const category = actionToCategory(action, enrichment, rec);
  const products = [
    ...new Set([...(rec.entities?.products || []), ...(rec.entities?.vendors || [])].filter(Boolean))
  ];
  const moved = whyMovedUp(rec, previousById, previousByCve);
  const evidence = evidenceFrom(rec);
  const confidence = confidenceOf(rec);
  const lastUpdated = rec.updatedAt || rec.publishedAt || rec.retrievedAt || null;

  return {
    id: `ad_${rec.id}`,
    recordId: rec.id,
    category,
    title: rec.title,
    summary: (rec.summary || "").slice(0, 400),
    priorityScore: Number(rec.priority?.score) || 0,
    priorityBand: rec.priority?.band || "Informational",
    whyThisMovedUp: moved,
    evidence,
    affectedProducts: products,
    cves: rec.identifiers?.cves || [],
    confidence,
    lastUpdated,
    freshness: rec.freshness || enrichment.freshness || null,
    knownExploited: !!(rec.exploitation?.knownExploited || enrichment.knownExploitation),
    ransomwareLinked: !!(rec.exploitation?.ransomwareLinked || enrichment.ransomwareAssociated),
    recommendationLabel: rec.recommendation?.label || null,
    recommendationWhy: rec.recommendation?.why || null,
    defensiveActions: generalDefensiveActions(category, rec),
    sourceUrl: rec.source?.sourceUrl || null,
    disclaimer:
      "SignalTerrain has not inspected your devices, networks, or accounts. These are general defensive recommendations derived from public threat intelligence."
  };
}

function indexPrevious(previousRecords) {
  const previousById = new Map();
  const previousByCve = new Map();
  for (const r of previousRecords || []) {
    if (r?.id) previousById.set(r.id, r);
    for (const cve of r?.identifiers?.cves || []) {
      previousByCve.set(String(cve).toUpperCase(), r);
    }
  }
  return { previousById, previousByCve };
}

/**
 * Build Adaptive Defense bundle for live.json.
 */
export function buildAdaptiveDefense(records, options = {}) {
  const previousRecords = options.previousRecords || [];
  const generatedAt = options.generatedAt || new Date().toISOString();
  const { previousById, previousByCve } = indexPrevious(previousRecords);

  const actionable = (records || []).filter((r) => {
    if (!r) return false;
    if (r.noise?.hideByDefault && !r.exploitation?.knownExploited) return false;
    if (r.type === "service-outage" && r.rawProviderMetadata?.healthy) return false;
    return true;
  });

  const items = actionable
    .map((r) => buildDefenseItem(r, { previousById, previousByCve }))
    .filter((item) => item.category !== "NO IMMEDIATE ACTION" || item.priorityScore >= 45)
    .sort((a, b) => {
      const cat = (CATEGORY_ORDER[a.category] ?? 9) - (CATEGORY_ORDER[b.category] ?? 9);
      if (cat !== 0) return cat;
      return b.priorityScore - a.priorityScore;
    });

  const byCategory = {};
  for (const cat of DEFENSE_CATEGORIES) byCategory[cat] = [];
  for (const item of items) {
    if (!byCategory[item.category]) byCategory[item.category] = [];
    byCategory[item.category].push(item);
  }

  // Cap each category for dashboard readability; full list remains filterable via records
  const capped = {};
  for (const cat of DEFENSE_CATEGORIES) {
    capped[cat] = (byCategory[cat] || []).slice(0, cat === "NO IMMEDIATE ACTION" ? 8 : 25);
  }

  const headlineItems = [
    ...capped["PATCH / UPDATE"].slice(0, 5),
    ...capped.MITIGATE.slice(0, 3),
    ...capped.REVIEW.slice(0, 3)
  ].slice(0, 8);

  const question = "What should I care about differently today?";
  const answerParts = [];
  if (capped["PATCH / UPDATE"].length) {
    answerParts.push(
      `${capped["PATCH / UPDATE"].length} item(s) call for patch/update attention from live sources (often KEV + fix available).`
    );
  }
  if (capped.MITIGATE.length) {
    answerParts.push(
      `${capped.MITIGATE.length} item(s) emphasize mitigation / exposure reduction while patches catch up.`
    );
  }
  if (capped.REVIEW.length) {
    answerParts.push(`${capped.REVIEW.length} item(s) warrant advisory review against your stack.`);
  }
  if (!answerParts.length) {
    answerParts.push(
      "No elevated Adaptive Defense interrupts in the current live artifact — keep routine hygiene and monitor feeds."
    );
  }

  return {
    version: ADAPTIVE_DEFENSE_VERSION,
    generatedAt,
    question,
    answerSummary: answerParts.join(" "),
    categories: DEFENSE_CATEGORIES,
    counts: Object.fromEntries(DEFENSE_CATEGORIES.map((c) => [c, (byCategory[c] || []).length])),
    headline: headlineItems,
    byCategory: capped,
    method: {
      title: "How Adaptive Defense prioritizes",
      points: [
        "Inputs are live ingested records only (CISA KEV, advisories, NVD/CVE, vendor feeds, etc.).",
        "Factors include active exploitation, KEV listing, severity, ransomware flags, vendor advisories, recency, evidence quality, and prevalence hints from named vendors/products.",
        "Categories are deterministic: PATCH / UPDATE · MITIGATE · REVIEW · WATCH · NO IMMEDIATE ACTION.",
        "Each item explains WHY THIS MOVED UP, cites evidence URLs, lists affected products from sources, and states confidence.",
        "SignalTerrain does not inspect your devices — optional local inventory only biases scoring in the browser when you add it.",
        "Recommendations are general defensive guidance, not compliance mandates or proof of compromise."
      ]
    },
    disclaimers: [
      "This app has not inspected your devices, networks, or accounts.",
      "Priority is decision support from public intel — not a personalized vulnerability scan.",
      "No sample or fabricated threats are included in production Adaptive Defense."
    ]
  };
}

export default {
  ADAPTIVE_DEFENSE_VERSION,
  DEFENSE_CATEGORIES,
  actionToCategory,
  buildDefenseItem,
  buildAdaptiveDefense
};
