/**
 * Deterministic Waypoint's Take from verified event + graph impacts only.
 * NEVER invents facts. Separates VERIFIED vs ANALYSIS.
 * Returns null when evidence is insufficient.
 */

function unique(list) {
  return [...new Set((list || []).filter(Boolean))];
}

function pathLabels(impacts) {
  const labels = [];
  for (const imp of impacts || []) {
    for (const step of imp.path || []) {
      labels.push(`${step.from} → ${step.relationshipType} → ${step.to}`);
    }
  }
  return unique(labels).slice(0, 8);
}

/**
 * @returns {null | object} Take object or null if insufficient evidence
 */
export function buildWaypointTake({ event, industryImpacts = [], citizenImpacts = [], activeEdges = [] }) {
  if (!event?.title || !event?.sourceUrl || !event?.summary) return null;

  const industries = unique(industryImpacts.map((i) => i.affectedEntityLabel));
  const citizens = unique(citizenImpacts.map((i) => i.affectedEntityLabel));
  const firstOrder = industryImpacts.filter((i) => i.order === 1).concat(citizenImpacts.filter((i) => i.order === 1));
  const nextOrder = industryImpacts.filter((i) => i.order >= 2).concat(citizenImpacts.filter((i) => i.order >= 2));

  // Require at least one graph-backed impact OR a direct policy/disaster type with provenance.
  const hasGraph = industries.length + citizens.length > 0 || activeEdges.length > 0;
  const hasDirect =
    ["sanctions", "tariffs", "export_import_controls", "natural_disaster", "armed_conflict", "cyber"].includes(
      event.eventType
    ) && Boolean(event.provenance?.source);
  if (!hasGraph && !hasDirect) return null;

  const verified = [
    `Publisher: ${event.publisher || event.source}`,
    `Published: ${event.publishedAt || "timestamp unavailable"}`,
    `Source: ${event.sourceUrl}`,
    `Event type (adapter classification): ${event.eventType}`
  ];

  const directly = firstOrder.length
    ? unique(firstOrder.map((i) => i.affectedEntityLabel)).join(", ")
    : hasDirect
      ? `Official ${event.eventType.replace(/_/g, " ")} notice from ${event.publisher || event.source}`
      : "No first-order industry/citizen node was reached via coded graph edges.";

  const next = nextOrder.length
    ? `Coded second/third-order exposures include: ${unique(nextOrder.map((i) => i.affectedEntityLabel)).slice(0, 6).join(", ")}. These are pathway exposures, not forecasts.`
    : "No additional verified dependency hop reached an industry or citizen category in the canonical graph.";

  const industryLine = industries.length
    ? industries.slice(0, 8).join(", ")
    : "None identified via coded graph paths from this event.";
  const citizenLine = citizens.length
    ? citizens.slice(0, 8).join(", ")
    : "None identified via coded graph paths from this event.";

  const evidenceLinks = unique(
    [
      event.sourceUrl,
      ...industryImpacts.flatMap((i) => (i.evidence || []).map((e) => e.url)),
      ...citizenImpacts.flatMap((i) => (i.evidence || []).map((e) => e.url)),
      ...activeEdges.map((e) => e.evidence?.url)
    ].filter(Boolean)
  ).slice(0, 8);

  const uncertain = [
    "Retail price and household timing effects are not knowable from the source notice alone.",
    "Graph paths describe structural exposure, not guaranteed outcomes.",
    industryImpacts.some((i) => i.order >= 3) || citizenImpacts.some((i) => i.order >= 3)
      ? "Third-order links are lower confidence by design (distance decay)."
      : null
  ]
    .filter(Boolean)
    .join(" ");

  const whyItMatters = hasGraph
    ? `This official notice activates structural dependencies already coded in the Global Signals graph (${industries.length} industry exposure${industries.length === 1 ? "" : "s"}, ${citizens.length} citizen categor${citizens.length === 1 ? "y" : "ies"}).`
    : `This is an official ${event.eventType.replace(/_/g, " ")} notice. A restrained take is possible from provenance alone, but graph-backed industry/citizen pathways were not activated.`;

  const analysis = [
    `What is directly affected: ${directly}`,
    `What could be affected next: ${next}`,
    `Industries exposed (graph): ${industryLine}`,
    `Citizens might notice (graph): ${citizenLine}`,
    `Evidence supports that statement only through the linked official source and coded edges — not through unverified reporting.`,
    `What remains uncertain: ${uncertain}`
  ].join(" ");

  return {
    whyItMatters,
    analysis,
    verifiedFacts: verified,
    analysisNotes: [
      "ANALYSIS sections use deterministic templates over structured fields only.",
      "No generative model invents geopolitical claims."
    ],
    evidenceLinks,
    relationshipPaths: pathLabels([...industryImpacts, ...citizenImpacts]).slice(0, 6),
    generatedBy: "deterministic-graph-templates",
    generatedAt: new Date().toISOString()
  };
}
