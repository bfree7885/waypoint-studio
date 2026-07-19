#!/usr/bin/env node
/**
 * Steepleaf Knowledge Graph — schema, demo graph, search, recommend, AI contracts.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PKG = path.join(ROOT, "design-system/steepleaf");
const failures = [];

function fail(name, detail) {
  failures.push(name + ": " + detail);
  console.log("FAIL", name, "—", detail);
}

function pass(name) {
  console.log("PASS", name);
}

function assert(name, cond, detail) {
  if (cond) pass(name);
  else fail(name, detail || "assertion failed");
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}

function load(file) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, file), "utf8"), { filename: file });
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

async function run() {
  global.window = global;
  global.location = { pathname: "/apps/steepleaf/explore/", search: "" };

  const requiredFiles = [
    "design-system/steepleaf/index.json",
    "design-system/steepleaf/entity-kinds.json",
    "design-system/steepleaf/relationship-types.json",
    "design-system/steepleaf/flavor-ontology.json",
    "design-system/steepleaf/brewing-styles.json",
    "design-system/steepleaf/schema-entity-v0.1.json",
    "design-system/steepleaf/schema-relationship-v0.1.json",
    "design-system/steepleaf/samples/demo-graph.json",
    "design-system/steepleaf/README.md",
    "docs/STEEPLEAF-KNOWLEDGE-GRAPH.md",
    "design-system/js/steepleaf/wds-steepleaf-graph.js",
    "design-system/js/steepleaf/wds-steepleaf-search.js",
    "design-system/js/steepleaf/wds-steepleaf-recommend.js",
    "design-system/js/steepleaf/wds-steepleaf-ai.js",
    "design-system/js/steepleaf/wds-steepleaf-ui.js",
    "design-system/css/wds-steepleaf.css",
    "apps/steepleaf/explore/index.html",
    "apps/steepleaf/entity/index.html",
    "apps/steepleaf/data/foundation.json"
  ];
  requiredFiles.forEach((f) => assert("exists " + f, exists(f)));

  const kinds = readJson("design-system/steepleaf/entity-kinds.json");
  const rels = readJson("design-system/steepleaf/relationship-types.json");
  const flavor = readJson("design-system/steepleaf/flavor-ontology.json");
  const brewing = readJson("design-system/steepleaf/brewing-styles.json");
  const graph = readJson("design-system/steepleaf/samples/demo-graph.json");
  const entitySchema = readJson("design-system/steepleaf/schema-entity-v0.1.json");
  const edgeSchema = readJson("design-system/steepleaf/schema-relationship-v0.1.json");
  const foundation = readJson("apps/steepleaf/data/foundation.json");
  const nav = readJson("design-system/ecosystem/nav-registry.json");
  const registry = readJson("design-system/ecosystem/product-registry.json");

  const requiredKinds = [
    "tea", "tea-type", "tea-family", "region", "country", "province", "estate",
    "mountain", "garden", "producer", "vendor", "cultivar", "harvest", "flush",
    "season", "processing-method", "roast", "oxidation", "fermentation",
    "compression", "storage", "flavor", "aroma", "mouthfeel", "color",
    "brewing-method", "water", "equipment", "tea-ceremony", "historical-event",
    "tea-tradition", "health-topic", "scientific-study"
  ];
  requiredKinds.forEach((id) => {
    assert("kind " + id, kinds.kinds.some((k) => k.id === id));
  });

  const requiredRels = [
    "belongs-to", "produced-by", "located-in", "made-from", "processed-by",
    "shares-flavor-with", "recommended-after", "pairs-with", "best-brewed-using",
    "served-in", "sold-by", "similar-to", "more-oxidized-than", "lighter-roast-than",
    "sweeter-than", "more-floral-than", "less-astringent-than", "lower-caffeine-than"
  ];
  requiredRels.forEach((id) => {
    assert("rel " + id, rels.types.some((t) => t.id === id));
  });

  assert("flavor families", (flavor.families || []).length >= 10);
  assert("brewing styles", (brewing.methods || []).length >= 6, String((brewing.methods || []).length));
  assert("entity schema id", String(entitySchema.$id || "").includes("steepleaf/entity"));
  assert("edge schema id", String(edgeSchema.$id || "").includes("steepleaf"));

  assert("demo entities", graph.entities.length >= 60, String(graph.entities.length));
  assert("demo edges", graph.edges.length >= 100, String(graph.edges.length));

  const kindIds = new Set(kinds.kinds.map((k) => k.id));
  const entityIds = new Set();
  graph.entities.forEach((e) => {
    entityIds.add(e.id);
    assert("entity has id/name/kind " + e.id, e.id && e.name && e.kind);
    assert("entity kind known " + e.kind, kindIds.has(e.kind), e.kind);
  });

  const typeIds = new Set(rels.types.map((t) => t.id));
  const aliases = rels.aliases || {};
  graph.edges.forEach((edge) => {
    assert("edge endpoints " + edge.id, entityIds.has(edge.from) && entityIds.has(edge.to));
    const typ = aliases[edge.type] || edge.type;
    assert("edge type known " + edge.id, typeIds.has(typ), edge.type);
  });

  // Vendors must not be teas; sold-by goes tea → vendor
  graph.edges.filter((e) => (aliases[e.type] || e.type) === "sold-by").forEach((e) => {
    const from = graph.entities.find((x) => x.id === e.from);
    const to = graph.entities.find((x) => x.id === e.to);
    assert("sold-by from tea " + e.id, from && from.kind === "tea");
    assert("sold-by to vendor " + e.id, to && to.kind === "vendor");
    assert("offer attrs " + e.id, e.attributes && e.attributes.priceUsd != null);
  });

  assert("foundation explore route", foundation.routes.some((r) => r.path === "/explore/" && r.ready));
  const stlNav = nav.apps.find((a) => a.id === "steepleaf");
  assert("nav explore feature", stlNav && stlNav.features.some((f) => f.id === "explore"));
  assert(
    "registry tea identity",
    registry.products.steepleaf &&
      /tea/i.test(registry.products.steepleaf.description || "") &&
      !/herbarium/i.test(registry.products.steepleaf.hero || "")
  );

  // Anti-social product stance (prohibition language is allowed in principles)
  assert(
    "educational / no social ranking stance",
    /no social|educational first|explainable/i.test(JSON.stringify(foundation))
  );
  assert(
    "principles reject social competition",
    (foundation.principles || []).some((p) => /social|follower|influencer|engagement/i.test(p))
  );
  load("design-system/js/steepleaf/wds-steepleaf-graph.js");
  load("design-system/js/steepleaf/wds-steepleaf-search.js");
  load("design-system/js/steepleaf/wds-steepleaf-recommend.js");
  load("design-system/js/steepleaf/wds-steepleaf-ai.js");

  assert("runtime graph", global.WDS && global.WDS.steepleafGraph);
  assert("runtime search", global.WDS.steepleafSearch);
  assert("runtime recommend", global.WDS.steepleafRecommend);
  assert("runtime ai", global.WDS.steepleafAI);

  global.WDS.steepleafGraph._indexGraph(graph);

  const longjing = global.WDS.steepleafGraph.get("stl_tea-longjing-shifeng");
  assert("get longjing", !!longjing);

  const neigh = global.WDS.steepleafGraph.neighbors("stl_tea-longjing-shifeng");
  assert("neighbors", neigh.length >= 5, String(neigh.length));

  const searchName = global.WDS.steepleafSearch.search("longjing", { kind: "tea" });
  assert("search name", searchName.some((r) => r.entity.id === "stl_tea-longjing-shifeng"));

  const searchFlavor = global.WDS.steepleafSearch.search("", {
    kind: "tea",
    flavor: "stl_flavor-chestnut"
  });
  assert("search flavor", searchFlavor.some((r) => r.entity.id === "stl_tea-longjing-shifeng"), String(searchFlavor.length));

  const under20 = global.WDS.steepleafRecommend.underPrice(20);
  assert("under 20", under20.length >= 1);
  assert("under 20 has why", under20.every((r) => r.reason && r.reason.length > 8));

  const similar = global.WDS.steepleafRecommend.similarTo("stl_tea-longjing-shifeng");
  assert("similar has why", similar.every((r) => r.reason));

  const floral = global.WDS.steepleafRecommend.discover("more-floral", "stl_tea-longjing-shifeng");
  assert("more-floral lens", Array.isArray(floral));

  const spring = global.WDS.steepleafRecommend.discover("spring-greens");
  assert("spring greens", spring.length >= 1);

  const unique = global.WDS.steepleafAI.unique("stl_tea-longjing-shifeng");
  assert("ai unique", unique.answer && unique.honesty === "demo-graph");

  const next = global.WDS.steepleafAI.answer("What should I try next?", {
    teaId: "stl_tea-longjing-shifeng"
  });
  assert("ai next", next.answer && next.citations.length >= 1);

  const priceQ = global.WDS.steepleafAI.answer("similar tea under $20", {
    teaId: "stl_tea-longjing-shifeng"
  });
  assert("ai under 20", priceQ.answer.length > 10);

  // Smoke HTML references
  const exploreHtml = fs.readFileSync(path.join(ROOT, "apps/steepleaf/explore/index.html"), "utf8");
  assert("explore mounts UI", exploreHtml.includes("steepleafUI.mountExplore"));
  assert("explore css", exploreHtml.includes("wds-steepleaf.css"));

  if (failures.length) {
    console.log("\n" + failures.length + " failure(s)");
    process.exit(1);
  }
  console.log("\nAll Steepleaf knowledge graph checks passed.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
