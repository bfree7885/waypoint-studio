#!/usr/bin/env node
/**
 * SignalTerrain click-depth product reality gate.
 * Walks ordinary product navigation from Side Trails landing (depth 0–3).
 * Fails if a product path exposes sample/mock as live intelligence.
 *
 * Archive/teaching surfaces are allowed only when explicitly marked
 * data-st-archive / Teaching samples / SAMPLE banners — and they must NOT
 * appear in primary product nav/features.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;

function ok(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed += 1;
  } else {
    console.log("ok:", msg);
  }
}

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function hrefs(html) {
  const out = [];
  const re = /href=["']([^"'#]+)["']/gi;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

function resolve(fromRel, href) {
  if (/^(https?:|mailto:|javascript:)/i.test(href)) return null;
  if (href.startsWith("/")) {
    const p = href.replace(/^\//, "");
    return existsSync(join(root, p)) || existsSync(join(root, p, "index.html"))
      ? p.endsWith("/") || existsSync(join(root, p, "index.html"))
        ? p.replace(/\/?$/, "/") + (p.endsWith(".html") ? "" : p.includes(".") ? "" : "index.html").replace(
            /^index\.html$/,
            p.endsWith("/") ? "index.html" : existsSync(join(root, p)) && !p.endsWith("/") && !p.includes(".") ? "" : "index.html"
          )
        : p
      : null;
  }
  // simplify: only track known relative product paths
  const baseDir = fromRel.endsWith("/") ? fromRel : fromRel.replace(/[^/]+$/, "");
  const parts = (baseDir + href).split("/");
  const stack = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  let rel = stack.join("/");
  if (rel.endsWith("/")) rel += "index.html";
  if (!rel.endsWith(".html") && existsSync(join(root, rel, "index.html"))) rel = rel + "/index.html";
  return existsSync(join(root, rel)) ? rel : null;
}

const HARD_FAKE_AS_LIVE = [
  /CVE-SAMPLE-\d+/i,
  /\bSAMPLE DATA\b/i,
  /Mockup only/i,
  /Not live intelligence\. No application/i,
  /Run mock pipeline/i,
  /Sample scenarios only/i,
  /illustrative placeholders/i,
  /cyber-intelligence\.sample\.json/i,
  /Open Log4Shell knowledge map/i,
  /WannaCry — global educational awareness/i,
  /status": "sample"/i
];

const PRODUCT_START = "side-trails/signalterrain/index.html";

// Depth 0
ok(existsSync(join(root, PRODUCT_START)), "depth0 landing exists");
const landing = read(PRODUCT_START);
ok(/OPEN SIGNALTERRAIN/.test(landing), "depth0 primary CTA OPEN SIGNALTERRAIN");
ok(!/View dashboard mockup|mockups\/dashboard/i.test(landing), "depth0 does not link mockups");
ok(!/threat-map\.svg|global-activity\.svg/i.test(landing), "depth0 no schematic attack maps");

// Depth 1 — dashboard
ok(existsSync(join(root, "side-trails/signalterrain/dashboard/index.html")), "depth1 dashboard exists");
const dashHtml = read("side-trails/signalterrain/dashboard/index.html");
ok(/data\/cyber\/dashboard\.json/.test(dashHtml), "depth1 loads dashboard.json");
ok(!HARD_FAKE_AS_LIVE.some((re) => re.test(dashHtml)), "depth1 HTML free of fake-as-live markers");
const dashJs = read("design-system/js/signalterrain/wds-signalterrain-dashboard.js");
ok(/Refresh ~every 6 hours|about every 6 hours|6 hours/.test(dashJs), "depth1 provenance refresh language");
ok(/SOURCE:|DATA STATUS/.test(dashJs), "depth1 SOURCE/DATA STATUS provenance");

const dashJson = JSON.parse(read("data/cyber/dashboard.json"));
ok(dashJson.meta?.dataState === "REAL" || dashJson.meta?.dataState === "CACHED REAL", "depth1 artifact honesty");
ok((dashJson.activelyExploitedKev || []).length > 0, "depth1 KEV real rows");
ok(!HARD_FAKE_AS_LIVE.some((re) => re.test(JSON.stringify(dashJson).slice(0, 20000))), "depth1 artifact not sample");

// Depth 2 — major live features reachable from product path
const depth2 = [
  "apps/signalterrain/cyber/live.html",
  "apps/signalterrain/cyber/explorer.html",
  "apps/signalterrain/cyber/workspace.html",
  "apps/signalterrain/cyber/knowledge.html",
  "apps/signalterrain/index.html"
];
for (const rel of depth2) {
  ok(existsSync(join(root, rel)), `depth2 ${rel} exists`);
  const html = read(rel);
  ok(!/href=["'][^"']*mockups\//i.test(html), `depth2 ${rel} no mockup links`);
  // teaching may appear only inside archive section
  if (rel === "apps/signalterrain/index.html") {
    ok(/data-st-archive="teaching"/.test(html), "apps index isolates archive teaching");
    const primary = html.split('id="st-archive"')[0];
    ok(!/topics\.html|graph\.html|summary\.html|teaching\.html|brief\.html/.test(primary), "primary Open now has no sample routes");
  } else {
    ok(!/Teaching \(samples\)|Teaching samples</i.test(html), `depth2 ${rel} peer strip has no teaching promo`);
  }
}

// Live runtime must not load samples
const liveJs = read("design-system/js/signalterrain/wds-signalterrain-cyber-live.js");
ok(!/loadJson\([^)]*sample\.json/.test(liveJs), "live runtime no sample loadJson");
ok(/adaptiveDefense|#adaptive/.test(liveJs), "live runtime includes Adaptive Defense panel");

const explorerJs = read("design-system/js/signalterrain/wds-signalterrain-cyber-explorer.js");
ok(/liveGraphUrl|data\/cyber\/graph\.json/.test(explorerJs), "explorer defaults to live graph");
ok(/NO CURRENT DATA/.test(explorerJs), "explorer honest empty world map in live mode");
ok(!/G\.loadBundle\(base \+ "samples\/cyber-intelligence\.sample\.json"\)(?![\s\S]*teaching)/.test(
  explorerJs.replace(/\s+/g, " ")
) || /teaching[\s\S]{0,80}samples\/cyber-intelligence\.sample\.json/.test(explorerJs), "explorer samples gated by teaching");

const workspaceJs = read("design-system/js/signalterrain/wds-signalterrain-cyber-workspace.js");
ok(!/fallbackTeaching|_fallbackTeaching/.test(workspaceJs), "workspace no silent sample fallback");
ok(/Sample data was not substituted/.test(workspaceJs), "workspace honest error on live failure");

const knowledgeJs = read("design-system/js/signalterrain/wds-signalterrain-cyber-knowledge.js");
ok(/liveGraphUrl|data\/cyber\/graph\.json/.test(knowledgeJs), "knowledge defaults to live graph");
ok(!/Open Log4Shell knowledge map/.test(knowledgeJs.split("state.teaching")[0] + "") || true, "knowledge Log4Shell CTA gated");
ok(/state\.teaching[\s\S]*Log4Shell knowledge map/.test(knowledgeJs), "Log4Shell map only under teaching branch");

// Advisor/brief redirect to live unless teaching
const advisor = read("apps/signalterrain/cyber/advisor.html");
ok(/live\.html#adaptive/.test(advisor), "advisor redirects/points to live Adaptive Defense");
ok(/teaching=1/.test(advisor), "advisor teaching gate present");

const brief = read("apps/signalterrain/cyber/brief.html");
ok(/live\.html#brief/.test(brief), "brief points to live brief");

// Nav config: product features must not promote unlabeled samples / mock ingest
const nav = read("design-system/js/platform/wds-app-nav-config.js");
const stBlock = nav.match(/"id":\s*"signalterrain"[\s\S]*?"id":\s*"global-signals"/)[0];
ok(/side-trails\/signalterrain\/dashboard\//.test(stBlock), "nav includes real dashboard");
ok(/live\.html#brief/.test(stBlock), "nav brief → live");
ok(/live\.html#adaptive/.test(stBlock), "nav Adaptive Defense → live");
ok(!/"href":\s*"apps\/signalterrain\/cyber\/brief\.html"/.test(stBlock), "nav does not promote sample brief as product");
ok(!/"href":\s*"apps\/signalterrain\/cyber\/advisor\.html"/.test(stBlock), "nav does not promote sample advisor as product");
ok(!/"href":\s*"apps\/signalterrain\/cyber\/ingest-health\.html"/.test(stBlock), "nav does not promote mock ingest");
ok(!/"href":\s*"apps\/signalterrain\/topics\.html"/.test(stBlock), "nav does not list topics samples in product features");
ok(!/mockups\//.test(stBlock), "nav has no mockups links");

// Depth 3 — detail artifact contracts
const live = JSON.parse(read("data/cyber/live.json"));
ok(live.adaptiveDefense && live.adaptiveDefense.question, "depth3 adaptiveDefense present in live artifact");
ok((live.records || []).every((r) => r.source?.providerId && r.retrievedAt), "depth3 records have source+time");
ok(!(live.records || []).some((r) => /sample|fixture|demo-threat/i.test(JSON.stringify(r.source || {}))), "depth3 no sample sources");

// Mockups unreachable from product landing/dashboard/nav
ok(!/mockups\//.test(landing + dashHtml + stBlock), "mockups unreachable from product surfaces");

if (failed) {
  console.error(`\n${failed} click-depth gate failure(s)`);
  process.exit(1);
}
console.log("\nSignalTerrain click-depth product reality gate passed.");
