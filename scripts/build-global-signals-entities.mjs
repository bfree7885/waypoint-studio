#!/usr/bin/env node
/**
 * Build unified Global Signals entity registry + thin HTML shells.
 * Canonical routes: /side-trails/global-signals/entities/<type>/<slug>/
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
}
function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}
function slugify(label) {
  return String(label || "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

const countriesDoc = readJson("data/global-signals/countries/countries.json");
const industriesDoc = readJson("data/global-signals/industries/industries.json");
const relationshipsDoc = readJson("data/global-signals/relationships/relationships.json");
const citizenDoc = readJson("data/global-signals/citizen-impact/citizen-impact.json");
const articlesDoc = readJson("data/global-signals/articles/articles.json");

const articlesById = new Map(articlesDoc.articles.map((a) => [a.id, a]));
const industriesById = new Map(industriesDoc.industries.map((i) => [i.id, i]));
const industriesBySlug = new Map(industriesDoc.industries.map((i) => [i.slug, i]));
const graphById = new Map((relationshipsDoc.entities || []).map((e) => [e.id, e]));
const edges = relationshipsDoc.relationships || [];
const cascadeByRoot = new Map((relationshipsDoc.cascades || []).map((c) => [c.rootId, c]));

const INDUSTRY_GRAPH_MAP = {
  semiconductors: "gsn_semiconductors",
  automotive: "gsn_automotive",
  retail: "gsn_retail",
  construction: "gsn_construction",
  transportation: "gsn_transportation",
  food: "gsn_food_processing",
  shipping: "gsn_logistics",
  technology: "gsn_electronics"
};

const COUNTRY_TAKES = {
  taiwan: {
    whyItMatters:
      "Taiwan’s foundry concentration is a structural dependency for electronics, autos, and industrial controls — not a daily headline score.",
    analysis:
      "Treat concentration as a long-horizon systems fact. Household scarcity claims should stay Low/Unknown unless inventory data exists."
  },
  "united-states": {
    whyItMatters:
      "US demand, policy, and logistics hubs shape how many global shocks show up on North American shelves and energy bills.",
    analysis:
      "Country profiles here are structural baselines, not live risk feeds. Prefer evidenced trade links over speculative claims."
  },
  china: {
    whyItMatters:
      "China’s manufacturing and trade weight means many supply chains route through Chinese nodes even when brands feel local.",
    analysis:
      "Use structural production and logistics facts first. Avoid treating every political headline as an automatic price prediction."
  }
};

const TYPE_ORDER = [
  "country",
  "industry",
  "article",
  "citizen-impact",
  "port",
  "company",
  "commodity",
  "policy",
  "conflict",
  "tariff",
  "weather"
];

function articleHeadline(id) {
  return articlesById.get(id)?.headline || id;
}

function citizenHref(category) {
  const id = String(category || "").replace(/^gsci_/, "");
  return id ? `../../citizen-impact/#section-${id}` : "../../citizen-impact/";
}

function graphHref(gsnId) {
  if (!gsnId) return "../../relationships/";
  return `../../relationships/?focus=${encodeURIComponent(gsnId)}&entity=${encodeURIComponent(gsnId)}`;
}

function linkFromGsn(gsnId) {
  const ge = graphById.get(gsnId);
  if (!ge) return null;
  return {
    id: gsnId,
    type: ge.type,
    slug: slugify(ge.label),
    name: ge.label
  };
}

function depsFromGraph(gsnId) {
  return edges
    .filter((e) => e.to === gsnId)
    .map((e) => {
      const src = linkFromGsn(e.from);
      return {
        id: e.from,
        type: src?.type || "unknown",
        slug: src?.slug || slugify(e.from),
        name: src?.name || e.from,
        relation: e.relationType,
        why: e.why,
        confidence: e.confidence,
        timeHorizon: e.timeHorizon,
        href: src ? `../../entities/${src.type}/${src.slug}/` : graphHref(e.from)
      };
    });
}

function dependentsFromGraph(gsnId) {
  return edges
    .filter((e) => e.from === gsnId)
    .map((e) => {
      const dst = linkFromGsn(e.to);
      if (!dst) return null;
      return {
        id: e.to,
        type: dst.type,
        slug: dst.slug,
        name: dst.name,
        relation: e.relationType,
        why: e.why,
        confidence: e.confidence,
        timeHorizon: e.timeHorizon,
        href: `../../entities/${dst.type}/${dst.slug}/`
      };
    })
    .filter(Boolean);
}

function softArticles(label, extra = []) {
  const labels = new Set([label, ...extra].map((s) => String(s).toLowerCase()));
  const out = [];
  for (const a of articlesDoc.articles) {
    const bag = [
      ...(a.affectedCountries || []),
      ...(a.affectedIndustries || []),
      ...(a.affectedCommodities || [])
    ].map((x) => String(x).toLowerCase());
    if (bag.some((b) => labels.has(b) || [...labels].some((l) => b.includes(l)))) {
      out.push({ id: a.id, headline: a.headline });
    }
  }
  return out;
}

const byKey = new Map();
function addEntity(entity) {
  const key = `${entity.type}::${entity.slug}`;
  if (byKey.has(key)) {
    const prev = byKey.get(key);
    byKey.set(key, {
      ...prev,
      ...entity,
      moduleIds: { ...prev.moduleIds, ...entity.moduleIds },
      relatedArticles: entity.relatedArticles?.length ? entity.relatedArticles : prev.relatedArticles,
      waypointsTake:
        entity.waypointsTake?.analysis || entity.waypointsTake?.whyItMatters
          ? entity.waypointsTake
          : prev.waypointsTake,
      dependencies: entity.dependencies?.length ? entity.dependencies : prev.dependencies,
      dependentEntities: entity.dependentEntities?.length
        ? entity.dependentEntities
        : prev.dependentEntities,
      currentRisks: entity.currentRisks?.length ? entity.currentRisks : prev.currentRisks,
      aliases: { ...prev.aliases, ...entity.aliases }
    });
    return;
  }
  byKey.set(key, entity);
}

// Countries
for (const c of countriesDoc.countries) {
  const gsnId = `gsn_${c.slug}`;
  const hasGraph = graphById.has(gsnId);
  const related = (c.relatedArticles || []).map((id) => ({ id, headline: articleHeadline(id) }));
  addEntity({
    id: gsnId,
    moduleIds: { country: c.id, graph: hasGraph ? gsnId : null },
    type: "country",
    slug: c.slug,
    name: c.name,
    summary: c.summary,
    confidence: "High",
    timeHorizon: "Long-term",
    overview: {
      text: c.summary,
      confidence: "High",
      timeHorizon: "Long-term",
      events: (c.currentEvents || []).slice(0, 3)
    },
    relatedArticles: related.length ? related : softArticles(c.name).slice(0, 3),
    waypointsTake: COUNTRY_TAKES[c.slug] || { whyItMatters: "", analysis: "" },
    relationshipGraph: {
      entityId: hasGraph ? gsnId : null,
      cascadeId: cascadeByRoot.get(gsnId)?.id || null,
      href: hasGraph ? graphHref(gsnId) : "../../relationships/",
      note: hasGraph
        ? "Opens Relationship Explorer with ?focus= for this country."
        : "No curated cascade root yet — explorer still available."
    },
    dependencies: hasGraph ? depsFromGraph(gsnId) : [],
    dependentEntities: hasGraph
      ? dependentsFromGraph(gsnId)
      : (c.majorIndustries || []).slice(0, 6).map((mi) => {
          const name = mi.name || mi;
          const slugGuess = slugify(String(name).split("(")[0]);
          const ind = industriesBySlug.get(slugGuess);
          return {
            id: ind?.id || null,
            type: "industry",
            slug: ind?.slug || slugGuess,
            name: ind?.name || String(name),
            relation: "major_industry",
            why: mi.notes || "Tagged as a major industry on the country profile.",
            confidence: "Medium",
            timeHorizon: "Long-term",
            href: ind ? `../../entities/industry/${ind.slug}/` : `../../industries/${slugGuess}/`
          };
        }),
    currentRisks: (c.currentRisks || []).map((r) => ({
      title: r.title,
      summary: r.summary,
      confidence: r.confidence,
      timeHorizon: r.timeHorizon,
      label: r.label || "Illustrative risk · sample/demo"
    })),
    citizenImpacts: c.citizenImpactConnections || [],
    aliases: { countryPath: `../../countries/${c.slug}/` },
    provenance: { sources: ["countries.json", hasGraph ? "relationships.json" : null].filter(Boolean) }
  });
}

// Industries
for (const ind of industriesDoc.industries) {
  const graphId = INDUSTRY_GRAPH_MAP[ind.slug] || null;
  const id =
    graphId && graphById.get(graphId)?.type === "industry"
      ? graphId
      : `gsn_industry_${ind.slug}`;
  const take = ind.waypointsTake || {};
  const dependencies = (ind.topDependencies || []).map((d) => {
    const target = industriesById.get(d.industryId);
    return {
      id: d.industryId,
      type: "industry",
      slug: d.slug || target?.slug || slugify(d.name),
      name: d.name || target?.name || d.industryId,
      relation: d.relation || "depends_on",
      why: d.relation || "",
      confidence: d.confidence || "Unknown",
      timeHorizon: d.horizon || "Unknown",
      href: `../../entities/industry/${d.slug || target?.slug || slugify(d.name)}/`
    };
  });
  let dependentEntities = (ind.relatedIndustries || [])
    .map((rid) => {
      const target = industriesById.get(rid);
      if (!target) return null;
      return {
        id: target.id,
        type: "industry",
        slug: target.slug,
        name: target.name,
        relation: "related_industry",
        why: "Tagged as a related industry in the curated baseline.",
        confidence: "Medium",
        timeHorizon: "Long-term",
        href: `../../entities/industry/${target.slug}/`
      };
    })
    .filter(Boolean);
  if (graphId && graphById.has(graphId)) {
    for (const d of dependentsFromGraph(graphId)) {
      if (!dependentEntities.some((x) => x.id === d.id || x.slug === d.slug)) dependentEntities.push(d);
    }
    for (const d of depsFromGraph(graphId)) {
      if (!dependencies.some((x) => x.id === d.id)) dependencies.push(d);
    }
  }
  addEntity({
    id,
    moduleIds: { industry: ind.id, graph: graphId },
    type: "industry",
    slug: ind.slug,
    name: ind.name,
    summary: ind.summary || ind.tagline || "",
    confidence: ind.whatIsHappening?.confidence || "Medium",
    timeHorizon: ind.whatIsHappening?.horizon || "Months",
    overview: {
      text: [ind.tagline, ind.whatIsHappening?.text, ind.why?.text].filter(Boolean).join(" "),
      confidence: ind.whatIsHappening?.confidence || "Medium",
      timeHorizon: ind.whatIsHappening?.horizon || "Months"
    },
    relatedArticles: (ind.relatedArticles || []).map((a) =>
      typeof a === "string"
        ? { id: a, headline: articleHeadline(a) }
        : { id: a.id, headline: a.headline || articleHeadline(a.id) }
    ),
    waypointsTake: { whyItMatters: take.whyItMatters || "", analysis: take.analysis || "" },
    relationshipGraph: {
      entityId: graphId && graphById.has(graphId) ? graphId : null,
      cascadeId: graphId ? cascadeByRoot.get(graphId)?.id || null : null,
      href: graphId && graphById.has(graphId) ? graphHref(graphId) : "../../relationships/",
      note:
        graphId && graphById.has(graphId)
          ? "Deep-links Relationship Explorer with ?focus=gsn_*."
          : "No graph root mapped for this industry yet."
    },
    dependencies,
    dependentEntities,
    currentRisks: (ind.threats || []).map((t) => ({
      title: t.label,
      summary: t.detail,
      confidence: t.confidence,
      timeHorizon: t.horizon,
      label: "Industry threat · curated baseline"
    })),
    citizenImpacts: ind.citizenImpacts || [],
    aliases: { industryPath: `../../industries/${ind.slug}/` },
    provenance: { sources: ["industries.json", graphId ? "relationships.json" : null].filter(Boolean) }
  });
}

// Articles as entities
for (const a of articlesDoc.articles) {
  const slug = a.id.replace(/^gsa_/, "").replace(/^demo-/, "demo-");
  const take = a.waypointsTake || {};
  const pathEntities = (a.likelyImpactPath || [])
    .map((step) => ({
      id: null,
      type: step.type || "unknown",
      slug: slugify(step.label),
      name: step.label,
      relation: "impact_path",
      why: step.explanation || "",
      confidence: step.confidence || "Unknown",
      timeHorizon: step.timeframe || "Unknown",
      href: null
    }));
  addEntity({
    id: a.id,
    moduleIds: { article: a.id },
    type: "article",
    slug,
    name: a.headline,
    summary: a.factualSummary,
    confidence: a.confidence || "Unknown",
    timeHorizon: a.timeHorizon || "Unknown",
    overview: {
      text: `${a.factualSummary} Publisher: ${a.publisher || "Unknown"}. Date: ${a.date || a.publishedAt || "Unknown"}.`,
      confidence: a.confidence || "Unknown",
      timeHorizon: a.timeHorizon || "Unknown"
    },
    relatedArticles: articlesDoc.articles
      .filter((x) => x.id !== a.id)
      .slice(0, 2)
      .map((x) => ({ id: x.id, headline: x.headline })),
    waypointsTake: { whyItMatters: take.whyItMatters || "", analysis: take.analysis || "" },
    relationshipGraph: {
      entityId: null,
      cascadeId: null,
      href: "../../relationships/",
      note: "Articles soft-link the explorer; path steps below are literacy hops, not graph focus ids unless mapped."
    },
    dependencies: pathEntities.slice(0, 2),
    dependentEntities: pathEntities.slice(2),
    currentRisks: [],
    aliases: { articlesPath: `../../articles/?id=${encodeURIComponent(a.id)}` },
    provenance: { sources: ["articles.json"] }
  });
}

// Citizen impact sections as entities
for (const section of citizenDoc.sections || []) {
  const statements = section.statements || [];
  const related = [];
  const deps = [];
  const risks = [];
  for (const st of statements) {
    for (const aid of st.relatedArticleIds || []) {
      if (!related.some((x) => x.id === aid)) related.push({ id: aid, headline: articleHeadline(aid) });
    }
    for (const eid of st.entityIds || []) {
      const src = linkFromGsn(eid);
      if (src && !deps.some((d) => d.id === eid)) {
        deps.push({
          id: eid,
          type: src.type,
          slug: src.slug,
          name: src.name,
          relation: "linked_from_statement",
          why: st.whatChanged,
          confidence: st.confidence,
          timeHorizon: st.timeHorizon,
          href: `../../entities/${src.type}/${src.slug}/`
        });
      }
    }
    risks.push({
      title: st.whatChanged,
      summary: st.why || st.causedBy || "",
      confidence: st.confidence,
      timeHorizon: st.timeHorizon,
      label: "Citizen impact statement · sample/demo"
    });
  }
  const focusId = deps[0]?.id || null;
  addEntity({
    id: `gsci_${section.id}`,
    moduleIds: { citizenImpactSection: section.id, graph: focusId },
    type: "citizen-impact",
    slug: section.id,
    name: section.label,
    summary: section.blurb || "",
    confidence: "Medium",
    timeHorizon: "Months",
    overview: {
      text: section.blurb || `Citizen impact category: ${section.label}.`,
      confidence: "Medium",
      timeHorizon: "Months"
    },
    relatedArticles: related,
    waypointsTake: {
      whyItMatters: section.blurb || "",
      analysis:
        statements.length
          ? "Statements on the Citizen Impact board carry their own confidence and horizons. This entity page aggregates the category without inventing household outcomes."
          : ""
    },
    relationshipGraph: {
      entityId: focusId,
      cascadeId: focusId ? cascadeByRoot.get(focusId)?.id || null : null,
      href: focusId ? graphHref(focusId) : "../../relationships/",
      note: focusId
        ? "Focuses Relationship Explorer on a linked graph entity from this category’s statements."
        : "No graph entity linked from statements yet."
    },
    dependencies: deps,
    dependentEntities: [],
    currentRisks: risks.slice(0, 6),
    aliases: { citizenImpactPath: citizenHref(section.id) },
    provenance: { sources: ["citizen-impact.json"] }
  });
}

// Remaining graph entities (ports, commodities, etc.) not already covered as country/industry
for (const ge of relationshipsDoc.entities || []) {
  const slug = slugify(ge.label);
  const key = `${ge.type}::${slug}`;
  if (byKey.has(key) && (ge.type === "country" || ge.type === "industry")) {
    const prev = byKey.get(key);
    prev.moduleIds = { ...prev.moduleIds, graph: ge.id };
    if (!prev.relationshipGraph?.entityId) {
      prev.relationshipGraph = {
        entityId: ge.id,
        cascadeId: cascadeByRoot.get(ge.id)?.id || null,
        href: graphHref(ge.id),
        note: "Opens Relationship Explorer with ?focus=."
      };
    }
    continue;
  }
  if (byKey.has(key)) continue;
  const cascade = cascadeByRoot.get(ge.id);
  addEntity({
    id: ge.id,
    moduleIds: { graph: ge.id },
    type: ge.type,
    slug,
    name: ge.label,
    summary: ge.summary,
    confidence: "Medium",
    timeHorizon: "Long-term",
    overview: { text: ge.summary, confidence: "Medium", timeHorizon: "Long-term" },
    relatedArticles: softArticles(ge.label).slice(0, 3),
    waypointsTake: cascade
      ? {
          whyItMatters: cascade.summary,
          analysis:
            "Summarizes the curated cascade root. Edges carry their own confidence — not a live forecast."
        }
      : { whyItMatters: ge.summary, analysis: "" },
    relationshipGraph: {
      entityId: ge.id,
      cascadeId: cascade?.id || null,
      href: graphHref(ge.id),
      note: ge.selectable
        ? "Selectable Relationship Explorer root (?focus=)."
        : "Present in the graph; may not be a selectable cascade root."
    },
    dependencies: depsFromGraph(ge.id),
    dependentEntities: dependentsFromGraph(ge.id),
    currentRisks: [],
    aliases: {},
    provenance: { sources: ["relationships.json"] }
  });
}

const entityList = [...byKey.values()].sort((a, b) => {
  const ti = TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type);
  return ti !== 0 ? ti : a.name.localeCompare(b.name);
});

const doc = {
  version: "1.0.0",
  updatedAt: new Date().toISOString(),
  mode: "sample-demo",
  modeLabel: "Sample / demo unified entity registry",
  honesty: {
    banner:
      "Sample / demo entity registry — not a live intelligence feed. Empty sections mean unknown evidence, not fabricated zeros.",
    confidenceRules:
      "Observed is reserved for established structural facts. Predictive risks must never use Observed.",
    idRules:
      "Canonical graph focus ids are gsn_*. Country module ids gsc_*; industry gsi_*; articles gsa_*; citizen sections gsci_*. Do not conflate gsc_* country ids with cascade/statement ids.",
    emptySections:
      "Every entity page always renders Overview, Waypoint’s Take, Relationship Graph, Related Articles, Dependencies, Dependent Entities, Current Risks, Time Horizon, and Confidence."
  },
  types: TYPE_ORDER,
  sectionOrder: [
    "overview",
    "waypoints-take",
    "relationship-graph",
    "related-articles",
    "dependencies",
    "dependent-entities",
    "current-risks",
    "time-horizon",
    "confidence"
  ],
  crossLinks: {
    articles: "../../articles/",
    relationships: "../../relationships/",
    citizenImpact: "../../citizen-impact/",
    countries: "../../countries/",
    industries: "../../industries/"
  },
  counts: Object.fromEntries(TYPE_ORDER.map((t) => [t, entityList.filter((e) => e.type === t).length])),
  entities: entityList
};

const outData = path.join(root, "data/global-signals/entities/entities.json");
ensureDir(path.dirname(outData));
fs.writeFileSync(outData, JSON.stringify(doc, null, 2) + "\n");
console.log("Wrote entities.json", entityList.length, doc.counts);

function shellHtml({ title, description, canonical, depth, type, slug, navExtra = "" }) {
  const rootPrefix = "../".repeat(depth);
  const dataUrl = rootPrefix + "data/global-signals/entities/entities.json";
  const jsUrl = rootPrefix + "design-system/js/global-signals/wds-gs-entities.js";
  const cssLanding = rootPrefix + "design-system/css/wds-global-signals-landing.css";
  const cssEnt = rootPrefix + "design-system/css/wds-global-signals-entities.css";
  const fav = rootPrefix + "favicon.svg";
  const gsHome = "../".repeat(Math.max(depth - 2, 1));
  const attrs = [
    'id="gse-root"',
    'class="gse-mount"',
    'data-gse-root',
    'data-gse-state="loading"',
    `data-gse-data="${dataUrl}"`
  ];
  if (type) attrs.push(`data-gse-type="${type}"`);
  if (slug) attrs.push(`data-gse-slug="${slug}"`);
  const mountOpts = { depth, dataUrl };
  if (type) mountOpts.type = type;
  if (slug) mountOpts.slug = slug;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="description" content="${description.replace(/"/g, "&quot;")}">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="${canonical}">
  <title>${title.replace(/</g, "")}</title>
  <link rel="icon" href="${fav}" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;650&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${cssLanding}">
  <link rel="stylesheet" href="${cssEnt}">
</head>
<body class="gs-landing gse-page">
  <a class="gs-skip" href="#main">Skip to content</a>
  <header class="gs-top">
    <a class="gs-brand-mark" href="${gsHome}">Global Signals</a>
    <nav aria-label="Product">
      <a href="${gsHome}entities/">Entities</a>
      ${navExtra}
      <a href="${gsHome}relationships/">Relationships</a>
      <a href="${gsHome}articles/">Articles</a>
      <a href="${gsHome}../">Side Trails</a>
    </nav>
  </header>
  <main id="main" class="gse-main">
    <section ${attrs.join(" ")} aria-label="Entity system">
      <p class="gse-empty" role="status">Loading entity…</p>
    </section>
  </main>
  <script src="${jsUrl}" defer></script>
  <script>
    document.addEventListener("DOMContentLoaded", function () {
      if (window.WDS && WDS.globalSignals && WDS.globalSignals.entities) {
        WDS.globalSignals.entities.mount(document.getElementById("gse-root"), ${JSON.stringify(mountOpts)});
      }
    });
  </script>
  <footer class="gs-footer">
    <p><strong>Global Signals</strong> — Understanding how world events shape everyday life.</p>
    <p>Part of Side Trails.</p>
  </footer>
</body>
</html>
`;
}

const outPages = path.join(root, "side-trails/global-signals/entities");
ensureDir(outPages);
fs.writeFileSync(
  path.join(outPages, "index.html"),
  shellHtml({
    title: "Entity System — Global Signals",
    description: "Shared Global Signals entity layout for countries, industries, articles, and citizen impact.",
    canonical: "https://waypointstudio.org/side-trails/global-signals/entities/",
    depth: 3
  })
);

for (const type of TYPE_ORDER) {
  const typed = entityList.filter((e) => e.type === type);
  ensureDir(path.join(outPages, type));
  fs.writeFileSync(
    path.join(outPages, type, "index.html"),
    shellHtml({
      title: `${type} entities — Global Signals`,
      description: `Browse ${type} entities in the shared Global Signals entity system.`,
      canonical: `https://waypointstudio.org/side-trails/global-signals/entities/${type}/`,
      depth: 4,
      type
    })
  );
  for (const entity of typed) {
    ensureDir(path.join(outPages, type, entity.slug));
    fs.writeFileSync(
      path.join(outPages, type, entity.slug, "index.html"),
      shellHtml({
        title: `${entity.name} — ${type} · Global Signals`,
        description: `${entity.name} entity page using the shared Global Signals layout. Sample/demo.`,
        canonical: `https://waypointstudio.org/side-trails/global-signals/entities/${type}/${entity.slug}/`,
        depth: 5,
        type,
        slug: entity.slug,
        navExtra: `<a href="./" aria-current="page">${String(entity.name).replace(/</g, "")}</a>`
      })
    );
  }
}
console.log("Wrote HTML shells under side-trails/global-signals/entities/");
