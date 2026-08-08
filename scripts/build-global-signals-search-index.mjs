#!/usr/bin/env node
/**
 * Build a structured Global Signals search index from curated JSON sources.
 * No AI / LLM — deterministic extraction + relationship-aware hints only.
 *
 * Usage: node scripts/build-global-signals-search-index.mjs
 * Output: data/global-signals/search/search-index.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
}

function norm(s) {
  return String(s == null ? "" : s)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(...parts) {
  const set = new Set();
  for (const p of parts) {
    for (const t of norm(p).split(/\s+/)) {
      if (t.length >= 2) set.add(t);
    }
  }
  return [...set];
}

function pushUnique(list, item) {
  if (!item || !item.label) return;
  if (list.some((h) => h.kind === item.kind && h.label === item.label && h.href === item.href)) {
    return;
  }
  list.push(item);
}

const ROUTES = {
  articles: "/side-trails/global-signals/articles/",
  countries: "/side-trails/global-signals/countries/",
  industries: "/side-trails/global-signals/industries/",
  relationships: "/side-trails/global-signals/relationships/",
  citizenImpact: "/side-trails/global-signals/citizen-impact/",
  search: "/side-trails/global-signals/search/"
};

const TYPE_ORDER = [
  "country",
  "industry",
  "commodity",
  "company",
  "port",
  "conflict",
  "tariff",
  "policy",
  "weather",
  "article",
  "citizen-impact"
];

const TYPE_LABELS = {
  country: "Country",
  industry: "Industry",
  commodity: "Commodity",
  company: "Company",
  port: "Port",
  conflict: "Conflict",
  tariff: "Tariff",
  policy: "Policy",
  weather: "Weather",
  article: "Article",
  "citizen-impact": "Citizen impact"
};

const articles = readJson("data/global-signals/articles/articles.json");
const relationships = readJson("data/global-signals/relationships/relationships.json");
const countries = readJson("data/global-signals/countries/countries.json");
const industries = readJson("data/global-signals/industries/industries.json");
const citizen = readJson("data/global-signals/citizen-impact/citizen-impact.json");

const entityById = new Map((relationships.entities || []).map((e) => [e.id, e]));
const cascadesByEntity = new Map();
for (const cascade of relationships.cascades || []) {
  const involved = new Set([cascade.rootId]);
  for (const edgeId of cascade.edgeIds || []) {
    const edge = (relationships.relationships || []).find((r) => r.id === edgeId);
    if (!edge) continue;
    involved.add(edge.from);
    involved.add(edge.to);
  }
  for (const id of involved) {
    if (!cascadesByEntity.has(id)) cascadesByEntity.set(id, []);
    cascadesByEntity.get(id).push(cascade);
  }
}

const neighbors = new Map();
for (const edge of relationships.relationships || []) {
  if (!neighbors.has(edge.from)) neighbors.set(edge.from, new Set());
  if (!neighbors.has(edge.to)) neighbors.set(edge.to, new Set());
  neighbors.get(edge.from).add(edge.to);
  neighbors.get(edge.to).add(edge.from);
}

const industryBySlug = new Map((industries.industries || []).map((i) => [i.slug, i]));
const industryByName = new Map(
  (industries.industries || []).map((i) => [norm(i.name), i])
);
const countryBySlug = new Map((countries.countries || []).map((c) => [c.slug, c]));
const countryByName = new Map(
  (countries.countries || []).map((c) => [norm(c.name), c])
);

function cascadeHints(entityId) {
  const hints = [];
  for (const cascade of cascadesByEntity.get(entityId) || []) {
    const isRoot = cascade.rootId === entityId;
    pushUnique(hints, {
      kind: "cascade",
      label: isRoot
        ? `Cascade root: ${cascade.title}`
        : `Appears in cascade: ${cascade.title}`,
      href: `${ROUTES.relationships}?entity=${encodeURIComponent(cascade.rootId)}`
    });
  }
  return hints;
}

function neighborHints(entityId, limit = 4) {
  const hints = [];
  const ids = [...(neighbors.get(entityId) || [])].slice(0, limit);
  for (const nid of ids) {
    const ent = entityById.get(nid);
    if (!ent) continue;
    pushUnique(hints, {
      kind: "related",
      label: `Related ${TYPE_LABELS[ent.type] || ent.type}: ${ent.label}`,
      href: `${ROUTES.relationships}?entity=${encodeURIComponent(ent.selectable ? ent.id : cascadeRootFor(nid) || ent.id)}`
    });
  }
  return hints;
}

function cascadeRootFor(entityId) {
  const list = cascadesByEntity.get(entityId) || [];
  if (!list.length) return null;
  return list[0].rootId;
}

function industryHref(slug) {
  return `${ROUTES.industries}${encodeURIComponent(slug)}/`;
}

function countryHref(slug) {
  return `${ROUTES.countries}${encodeURIComponent(slug)}/`;
}

function articleHref(id) {
  return `${ROUTES.articles}?id=${encodeURIComponent(id)}`;
}

function citizenHref(sectionId) {
  return `${ROUTES.citizenImpact}#section-${encodeURIComponent(sectionId)}`;
}

const entries = [];
const seen = new Set();

function addEntry(entry) {
  if (!entry.id || !entry.type || !entry.label) return;
  if (seen.has(entry.id)) return;
  seen.add(entry.id);
  const searchParts = [
    entry.label,
    ...(entry.aliases || []),
    entry.summary || "",
    entry.context || "",
    ...(entry.keywords || [])
  ];
  entry.searchText = norm(searchParts.join(" "));
  entry.tokens = tokens(...searchParts);
  entry.typeLabel = TYPE_LABELS[entry.type] || entry.type;
  entry.hints = entry.hints || [];
  entries.push(entry);
}

// —— Relationship graph entities ——
for (const ent of relationships.entities || []) {
  const hints = [...cascadeHints(ent.id), ...neighborHints(ent.id)];
  const countryMatch = countryByName.get(norm(ent.label));
  if (countryMatch && ent.type === "country") {
    pushUnique(hints, {
      kind: "module",
      label: `Country Intelligence: ${countryMatch.name}`,
      href: countryHref(countryMatch.slug)
    });
  }
  const indMatch =
    industryBySlug.get(ent.id.replace(/^gsn_/, "")) ||
    industryByName.get(norm(ent.label));
  if (indMatch && (ent.type === "industry" || ent.type === "commodity")) {
    pushUnique(hints, {
      kind: "module",
      label: `Industry Intelligence: ${indMatch.name}`,
      href: industryHref(indMatch.slug)
    });
  }

  addEntry({
    id: `rel:${ent.id}`,
    sourceId: ent.id,
    type: ent.type,
    label: ent.label,
    aliases: [],
    summary: ent.summary || "",
    context: "Relationship Explorer entity",
    confidence: null,
    provenance: "sample-demo · relationships.json",
    href: `${ROUTES.relationships}?entity=${encodeURIComponent(ent.id)}`,
    module: "relationships",
    moduleLabel: "Relationship Explorer",
    moduleStatus: "intended",
    keywords: [ent.type, ent.id],
    hints,
    boost: ent.selectable ? 1.15 : 1,
    inCascades: (cascadesByEntity.get(ent.id) || []).length
  });
}

// —— Countries ——
for (const c of countries.countries || []) {
  const hints = [];
  const relId = `gsn_${c.slug.replace(/-/g, "_")}`;
  // Taiwan special-case: gsn_taiwan
  const altRel =
    entityById.get(`gsn_${c.slug}`) ||
    entityById.get(relId) ||
    [...entityById.values()].find((e) => e.type === "country" && norm(e.label) === norm(c.name));
  if (altRel) {
    pushUnique(hints, {
      kind: "cascade",
      label: `Open in Relationship Explorer`,
      href: `${ROUTES.relationships}?entity=${encodeURIComponent(altRel.id)}`
    });
    for (const h of cascadeHints(altRel.id)) pushUnique(hints, h);
  }
  for (const ind of (c.majorIndustries || []).slice(0, 4)) {
    const name = typeof ind === "string" ? ind : ind.name || ind.label;
    const match = industryByName.get(norm(name));
    if (match) {
      pushUnique(hints, {
        kind: "related",
        label: `Related industry: ${match.name}`,
        href: industryHref(match.slug)
      });
    }
  }
  for (const cat of (c.citizenImpactConnections || []).slice(0, 3)) {
    const id = typeof cat === "string" ? cat : cat.id || cat.category;
    if (!id) continue;
    pushUnique(hints, {
      kind: "module",
      label: `Citizen Impact: ${id}`,
      href: citizenHref(id)
    });
  }

  const aliases = [c.iso2, c.region].filter(Boolean);
  addEntry({
    id: `country:${c.id}`,
    sourceId: c.id,
    type: "country",
    label: c.name,
    aliases,
    summary: c.summary || "",
    context: c.region ? `Region: ${c.region}` : "Country Intelligence",
    confidence: null,
    provenance: "sample-demo · countries.json",
    href: countryHref(c.slug),
    module: "countries",
    moduleLabel: "Country Intelligence",
    moduleStatus: "intended",
    keywords: [c.slug, ...(c.majorPorts || []).map((p) => p.name).filter(Boolean)],
    hints,
    boost: 1.2,
    inCascades: altRel ? (cascadesByEntity.get(altRel.id) || []).length : 0
  });

  // Ports nested under countries
  for (const port of c.majorPorts || []) {
    if (!port || !port.name) continue;
    const portId = `port:${c.slug}:${norm(port.name).replace(/\s+/g, "-")}`;
    addEntry({
      id: portId,
      sourceId: c.id,
      type: "port",
      label: port.name,
      aliases: [c.name],
      summary: port.notes || `Major port associated with ${c.name} (curated country profile).`,
      context: `Country: ${c.name}`,
      confidence: null,
      provenance: "sample-demo · countries.json · majorPorts",
      href: countryHref(c.slug),
      module: "countries",
      moduleLabel: "Country Intelligence",
      moduleStatus: "intended",
      keywords: ["port", c.name, c.slug],
      hints: [
        {
          kind: "module",
          label: `Country profile: ${c.name}`,
          href: countryHref(c.slug)
        }
      ],
      boost: 1,
      inCascades: 0
    });
  }
}

// —— Industries ——
for (const ind of industries.industries || []) {
  const hints = [];
  const relMatch =
    entityById.get(`gsn_${ind.slug}`) ||
    [...entityById.values()].find(
      (e) =>
        (e.type === "industry" || e.type === "commodity") &&
        norm(e.label) === norm(ind.name)
    );
  if (relMatch) {
    pushUnique(hints, {
      kind: "cascade",
      label: "Open in Relationship Explorer",
      href: `${ROUTES.relationships}?entity=${encodeURIComponent(relMatch.id)}`
    });
    for (const h of cascadeHints(relMatch.id)) pushUnique(hints, h);
  }
  for (const mc of (ind.majorCountries || []).slice(0, 4)) {
    const name = typeof mc === "string" ? mc : mc.name || mc.label;
    const slug = typeof mc === "object" ? mc.slug : null;
    const match = (slug && countryBySlug.get(slug)) || countryByName.get(norm(name));
    if (match) {
      pushUnique(hints, {
        kind: "related",
        label: `Related country: ${match.name}`,
        href: countryHref(match.slug)
      });
    }
  }
  for (const ci of (ind.citizenImpacts || []).slice(0, 3)) {
    const cat = typeof ci === "string" ? ci : ci.category || ci.id;
    if (!cat) continue;
    pushUnique(hints, {
      kind: "module",
      label: `Citizen Impact: ${cat}`,
      href: citizenHref(cat)
    });
  }
  for (const art of (ind.relatedArticles || []).slice(0, 2)) {
    const id = typeof art === "string" ? art : art.id;
    if (!id) continue;
    pushUnique(hints, {
      kind: "module",
      label: `Related article`,
      href: articleHref(id)
    });
  }

  addEntry({
    id: `industry:${ind.id}`,
    sourceId: ind.id,
    type: "industry",
    label: ind.name,
    aliases: [ind.slug, ind.tagline].filter(Boolean),
    summary: ind.summary || ind.tagline || "",
    context: "Industry Intelligence",
    confidence: null,
    provenance: "sample-demo · industries.json",
    href: industryHref(ind.slug),
    module: "industries",
    moduleLabel: "Industry Intelligence",
    moduleStatus: "intended",
    keywords: [ind.slug, ...(ind.relatedIndustries || [])],
    hints,
    boost: 1.15,
    inCascades: relMatch ? (cascadesByEntity.get(relMatch.id) || []).length : 0
  });
}

// —— Articles ——
for (const a of articles.articles || []) {
  const hints = [];
  for (const country of (a.affectedCountries || []).slice(0, 3)) {
    const match = countryByName.get(norm(String(country).split("(")[0]));
    if (match) {
      pushUnique(hints, {
        kind: "related",
        label: `Related country: ${match.name}`,
        href: countryHref(match.slug)
      });
    }
  }
  for (const industry of (a.affectedIndustries || []).slice(0, 3)) {
    const match = industryByName.get(norm(industry));
    if (match) {
      pushUnique(hints, {
        kind: "related",
        label: `Related industry: ${match.name}`,
        href: industryHref(match.slug)
      });
    }
  }
  for (const impact of (a.citizenImpacts || []).slice(0, 2)) {
    const cat = typeof impact === "string" ? impact : impact.category || impact.id;
    // citizen impacts on articles may be free text; only link known section ids
    const known = (citizen.sectionOrder || []).includes(cat);
    if (known) {
      pushUnique(hints, {
        kind: "module",
        label: `Citizen Impact: ${cat}`,
        href: citizenHref(cat)
      });
    }
  }

  addEntry({
    id: `article:${a.id}`,
    sourceId: a.id,
    type: "article",
    label: a.headline,
    aliases: [a.publisher, a.eventType].filter(Boolean),
    summary: a.factualSummary || "",
    context: [a.publisher, a.date || a.publishedAt].filter(Boolean).join(" · "),
    confidence: a.confidence || null,
    provenance: "sample-demo · articles.json",
    href: articleHref(a.id),
    module: "articles",
    moduleLabel: "Articles",
    moduleStatus: "live",
    keywords: [
      a.eventType,
      ...(a.affectedCountries || []),
      ...(a.affectedIndustries || []),
      ...(a.affectedCommodities || [])
    ].filter(Boolean),
    hints,
    boost: 1.1,
    inCascades: 0
  });
}

// —— Citizen Impact sections ——
for (const section of citizen.sections || []) {
  const statementText = (section.statements || [])
    .map((s) => [s.whatChanged, s.why, s.causedBy].filter(Boolean).join(" "))
    .join(" ");
  const entityLabels = [];
  for (const s of section.statements || []) {
    for (const eid of s.entityIds || []) {
      const ent = entityById.get(eid) || (citizen.entities || []).find((e) => e.id === eid);
      if (ent) entityLabels.push(ent.label);
    }
  }
  const hints = [];
  pushUnique(hints, {
    kind: "module",
    label: "Citizen Impact board",
    href: citizenHref(section.id)
  });
  // link first related article if present
  for (const s of (section.statements || []).slice(0, 2)) {
    for (const aid of (s.relatedArticleIds || []).slice(0, 1)) {
      pushUnique(hints, {
        kind: "module",
        label: "Related article",
        href: articleHref(aid)
      });
    }
  }

  addEntry({
    id: `citizen:${section.id}`,
    sourceId: section.id,
    type: "citizen-impact",
    label: section.label || section.id,
    aliases: [section.id],
    summary: section.blurb || "",
    context: "Citizen Impact category",
    confidence: null,
    provenance: "sample-demo · citizen-impact.json",
    href: citizenHref(section.id),
    module: "citizen-impact",
    moduleLabel: "Citizen Impact",
    moduleStatus: "intended",
    keywords: [section.id, ...entityLabels],
    hints,
    boost: 1.05,
    inCascades: 0,
    // stash statement text into search via keywords path — use summary extension
    _extraSearch: statementText
  });
}

// Apply extra search text for citizen sections
for (const e of entries) {
  if (e._extraSearch) {
    e.searchText = norm([e.searchText, e._extraSearch].join(" "));
    e.tokens = tokens(e.searchText);
    delete e._extraSearch;
  }
}

const updatedAt = new Date().toISOString().slice(0, 10);
const index = {
  version: 1,
  updatedAt,
  mode: "sample-demo",
  modeLabel: "Sample / demo index — structured over curated Global Signals JSON. Not live search. Not AI.",
  honesty: {
    banner:
      "Universal Search queries a labeled sample/demo index built from curated Global Signals JSON. It does not call an AI model, invent entities, or claim live coverage. Sibling module routes (Countries, Industries, Relationship Explorer, Citizen Impact) may still be Coming soon on main until those branches merge — deep links use stable intended URLs.",
    method: "Deterministic token/substring ranking over a prebuilt structured index. Relationship hints come from relationship edges and cascade membership only.",
    confidenceRules:
      "Confidence labels are copied from source records when present. Missing confidence is shown as unavailable — never fabricated."
  },
  routes: ROUTES,
  typeOrder: TYPE_ORDER,
  typeLabels: TYPE_LABELS,
  sources: [
    { path: "data/global-signals/articles/articles.json", role: "articles" },
    { path: "data/global-signals/countries/countries.json", role: "countries + nested ports" },
    { path: "data/global-signals/industries/industries.json", role: "industries" },
    { path: "data/global-signals/relationships/relationships.json", role: "entities, edges, cascades" },
    { path: "data/global-signals/citizen-impact/citizen-impact.json", role: "citizen-impact sections" }
  ],
  stats: {
    entries: entries.length,
    byType: TYPE_ORDER.reduce((acc, t) => {
      acc[t] = entries.filter((e) => e.type === t).length;
      return acc;
    }, {})
  },
  entries
};

const outRel = "data/global-signals/search/search-index.json";
const outPath = path.join(root, outRel);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(index, null, 2) + "\n");
console.log(
  `Wrote ${outRel} (${entries.length} entries; types: ${JSON.stringify(index.stats.byType)})`
);
