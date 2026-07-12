#!/usr/bin/env node
/**
 * Knowledge Platform tests — schema fixtures, search, relationships, domain filters, WSKB link field.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import vm from "vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
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

function load(file) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, file), "utf8"), { filename: file });
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}

async function run() {
  global.window = global;
  global.fetch = async () => {
    throw new Error("fetch should not be required when fixtures are ingested");
  };

  load("design-system/js/knowledge/wds-knowledge-core.js");
  load("design-system/js/knowledge/wds-knowledge-search.js");
  load("design-system/js/knowledge/wds-knowledge-relationships.js");

  const index = readJson("design-system/knowledge/index.json");
  const domains = readJson("design-system/knowledge/domains.json");
  const bundle = readJson("design-system/knowledge/samples/demo-bundle.json");
  const relationships = readJson("design-system/knowledge/relationships.json");
  const schema = readJson("design-system/knowledge/schema-v1.json");
  const wos = readJson("design-system/observations/schema-v1.json");

  assert("schema id", schema.$id.includes("knowledge/v1"));
  assert("index has entries", index.entries.length >= 15);
  assert("bundle matches index count", bundle.records.length === index.entries.length);
  assert("domains include fieldry", domains.domains.some((d) => d.id === "fieldry"));
  assert("domains include steepleaf", domains.domains.some((d) => d.id === "steepleaf"));
  assert("wos allows wskb source", JSON.stringify(wos).includes('"wskb"'));
  assert("wos allows knowledge source", JSON.stringify(wos).includes('"knowledge"'));

  // Every index id exists in bundle
  const bundleIds = new Set(bundle.records.map((r) => r.id));
  index.entries.forEach((e) => {
    assert("bundle has " + e.id, bundleIds.has(e.id));
  });

  // Required core fields on samples
  bundle.records.forEach((r) => {
    assert(
      "core fields " + r.id,
      r.id && r.kind && r.domains && r.names && r.names.common && r.description && r.meta
    );
  });

  global.WDS.knowledge.ingestFixtures({ index, domains, bundle, relationships });

  const maple = await global.WDS.knowledge.get("kn_acer-saccharum");
  assert("get maple", maple && maple.wskbId === "acer-saccharum");
  assert("maple domains", maple.domains.indexOf("foragecast") >= 0);

  const sheds = await global.WDS.knowledge.list({ domain: "sheds" });
  assert("sheds domain filter", sheds.length >= 3, String(sheds.length));
  assert(
    "sheds includes deer",
    sheds.some((e) => e.id === "kn_odocoileus-virginianus")
  );

  const tea = await global.WDS.knowledge.search("dragonwell", { domain: "steepleaf" });
  assert("search alias longjing", tea.length >= 1 && tea[0].id === "kn_longjing", JSON.stringify(tea[0]));

  const scientific = await global.WDS.knowledge.search("Quercus alba");
  assert("search scientific", scientific.some((h) => h.id === "kn_white-oak"));

  const tagged = await global.WDS.knowledge.search("mast", { tag: "mast" });
  assert("search tags", tagged.some((h) => h.id === "kn_oak-acorn" || h.id === "kn_white-oak"));

  const geo = await global.WDS.knowledge.search("maple", { region: "northeast-us" });
  assert("geo filter region", geo.some((h) => h.id === "kn_acer-saccharum"));

  const related = await global.WDS.knowledge.related("kn_white-oak");
  assert("related oak has neighbors", related.neighbors.length >= 1);
  assert(
    "oak produces acorn edge",
    related.edges.some((e) => e.type === "produces" && e.to === "kn_oak-acorn")
  );

  const chain = await global.WDS.knowledge.path("kn_white-oak", "kn_deer-shed-cycle");
  assert("ecology path found", chain.found, JSON.stringify(chain));
  assert(
    "path includes acorn and deer",
    chain.nodes.indexOf("kn_oak-acorn") >= 0 &&
      chain.nodes.indexOf("kn_odocoileus-virginianus") >= 0,
    chain.nodes.join(" > ")
  );

  const chanterellePath = await global.WDS.knowledge.path("kn_chanterelle", "kn_post-rain-fruiting");
  assert("chanterelle rain path", chanterellePath.found);

  // No duplicate species body when wskb linked — description stays short pointer style
  assert(
    "wskb-linked entry keeps delegation note or short body",
    maple.description.length < 500 && maple.wskbId
  );

  // Relationship types documented
  assert("relationship types listed", (relationships.relationshipTypes || []).includes("produces"));

  if (failures.length) {
    console.log("\n" + failures.length + " failure(s)");
    process.exit(1);
  }
  console.log("\nAll knowledge platform tests passed.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
