#!/usr/bin/env node
/**
 * Product framework + Waypoint Knowledge curated layer tests.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import vm from "vm";
import { createServer } from "http";
import { spawn } from "child_process";
import { setTimeout as delay } from "timers/promises";
import http from "http";
import { extname, join, normalize } from "path";
import { mkdirSync, writeFileSync, readFileSync, statSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ART = path.join(ROOT, "reports", "waypoint-knowledge-framework-2026-07");
let passed = 0;
const failures = [];

function assert(name, cond) {
  if (cond) {
    passed++;
    console.log("PASS", name);
  } else {
    failures.push(name);
    console.log("FAIL", name);
  }
}

const fw = JSON.parse(
  fs.readFileSync(path.join(ROOT, "design-system/ecosystem/product-framework.json"), "utf8")
);
assert("framework version", fw.version === "1.0.0");
assert("mission headline autonomy", /Choose your own direction/i.test(fw.mission.headline));
assert("observe + understand shared", !!(fw.sharedStages.observe && fw.sharedStages.understand));
const expected = {
  sheds: "Search",
  fieldry: "Record",
  foragecast: "Explore",
  steepleaf: "Brew",
  "savant-sommelier": "Taste",
  signalterrain: "Monitor",
  dashboard: "Plan",
  scenes: "Create",
  "photo-coach": "Refine",
  "hidden-landscapes": "Reveal"
};
Object.keys(expected).forEach((id) => {
  const p = fw.products.find((x) => x.id === id);
  assert("direction " + id, p && p.direction.label === expected[id]);
});
assert("tone prefer list", Array.isArray(fw.tone.prefer) && fw.tone.prefer.includes("Consider"));
assert("tone avoid list", fw.tone.avoidUnlessSafetyOrTechnical.includes("Homework"));

const schema = JSON.parse(
  fs.readFileSync(path.join(ROOT, "design-system/knowledge/curated/schema-v1.json"), "utf8")
);
assert("curated schema id pattern", /wk_/.test(schema.properties.id.pattern));
assert("summary required", schema.required.includes("summary"));
assert("waypointAnalysis field", !!schema.properties.waypointAnalysis);
assert("category field", !!schema.properties.category);
assert("cardKind includes review", schema.properties.cardKind.enum.includes("review"));

const taxonomy = JSON.parse(
  fs.readFileSync(path.join(ROOT, "design-system/knowledge/curated/taxonomy.json"), "utf8")
);
assert("taxonomy has source categories", taxonomy.sourceCategories.length >= 10);
assert("taxonomy CTA prefer curious", taxonomy.ctaLabels.includes("If you're curious"));
assert("taxonomy bans required reading", taxonomy.prohibitedCtaLabels.includes("Required reading"));

const demo = JSON.parse(
  fs.readFileSync(path.join(ROOT, "design-system/knowledge/curated/demo-entries.json"), "utf8")
);
assert("demo entries exist", demo.entries.length >= 8);
assert(
  "all demo marked demonstration",
  demo.entries.every((e) => e.reviewStatus === "demonstration")
);
assert(
  "no fabricated urls in demo",
  demo.entries.every((e) => e.originalUrl == null || e.accessType === "demo-only")
);
assert(
  "sheds demos present",
  demo.entries.filter((e) => e.products.includes("sheds")).length >= 2
);
assert(
  "scenes/photo demos present",
  demo.entries.filter((e) => e.products.includes("scenes") || e.products.includes("photo-coach")).length >= 2
);
assert(
  "fieldry/forage demos present",
  demo.entries.filter((e) => e.products.includes("fieldry") || e.products.includes("foragecast")).length >= 2
);
assert(
  "signalterrain demos present",
  demo.entries.filter((e) => e.products.includes("signalterrain")).length >= 1
);
assert(
  "contextual hooks present",
  demo.entries.some((e) => (e.contextualHooks || []).length > 0)
);

["docs/WAYPOINT-PRODUCT-FRAMEWORK.md", "docs/WAYPOINT-KNOWLEDGE.md", "docs/WAYPOINT-KNOWLEDGE-PLATFORM.md", "docs/WAYPOINT-EDITORIAL-STANDARDS.md", "docs/EDITORIAL-STANDARDS.md"].forEach((p) => {
  assert(p + " exists", fs.existsSync(path.join(ROOT, p)));
});
assert(
  "platform doc has curation mission",
  /best information|thoughtfully organized/i.test(
    fs.readFileSync(path.join(ROOT, "docs/WAYPOINT-KNOWLEDGE-PLATFORM.md"), "utf8")
  )
);

const about = fs.readFileSync(path.join(ROOT, "about.html"), "utf8");
assert("about autonomy messaging", /Choose their own direction|choose their own direction/i.test(about));
assert("about links knowledge", /knowledge\.html/.test(about));
assert("about keeps Create Share cycle", /Observe · Understand · Create · Share/.test(about));

const home = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
assert("home links knowledge", /knowledge\.html/.test(home));
assert("home lead autonomy", /Choose your own direction/i.test(home));

const knowledgePage = fs.readFileSync(path.join(ROOT, "knowledge.html"), "utf8");
assert("knowledge page loads curated js", /wds-knowledge-curated\.js/.test(knowledgePage));
assert("knowledge page demo disclosure", /demonstration/i.test(knowledgePage));

const sheds = fs.readFileSync(path.join(ROOT, "apps/shed-hunting/map/index.html"), "utf8");
assert("sheds optional knowledge link", /Why this may matter/i.test(sheds) && /knowledge\.html/.test(sheds));
assert("sheds remains map-first shell", /id="sheds-map"/.test(sheds) && /sheds-fab-rail/.test(sheds));

const css = fs.readFileSync(path.join(ROOT, "design-system/css/wds-knowledge.css"), "utf8");
assert("analysis visually distinct", /wk-card__analysis/.test(css) && /wk-card__summary/.test(css));
assert("reduced motion", /prefers-reduced-motion/.test(css));

const wdsCss = fs.readFileSync(path.join(ROOT, "design-system/css/wds.css"), "utf8");
assert("wds imports knowledge css", /wds-knowledge\.css/.test(wdsCss));

const jsSrc = fs.readFileSync(
  path.join(ROOT, "design-system/js/knowledge/wds-knowledge-curated.js"),
  "utf8"
);
const sandbox = { window: {}, globalThis: {}, console };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(jsSrc, sandbox);
const K = sandbox.WDS.knowledgeCurated;
assert("renderer exported", !!(K && K.renderCard && K.renderList));
const html = K.renderCard(demo.entries[0], { compact: true });
assert("card has source summary label", /Source Summary/.test(html));
assert("card has waypoint perspective label", /Waypoint Perspective/.test(html));
assert("card has source summary", /Source Summary/.test(html));
assert("related reading helper", typeof K.renderRelatedReading === "function");
const related = K.renderRelatedReading(demo, {
  product: "sheds",
  hookId: "sheds-south-aspect",
  compact: true
});
assert("related reading renders for sheds hook", /wk-related-reading|wk-card/.test(related));
assert("card marks demo status", /Demonstration/.test(html));
assert("analysis note present", /not part of the original source/i.test(html));

const contentEngine = fs.readFileSync(
  path.join(ROOT, "design-system/js/wds-content-engine.js"),
  "utf8"
);
assert("content engine soft outdoor prompt", /Worth noticing outdoors/.test(contentEngine));
assert("content engine no after-watching homework", !/After watching:/.test(contentEngine));

const registry = JSON.parse(
  fs.readFileSync(path.join(ROOT, "design-system/ecosystem/product-registry.json"), "utf8")
);
assert("registry has product-framework engine", !!registry.sharedEngines["product-framework"]);
assert("registry has curated knowledge engine", !!registry.sharedEngines["waypoint-knowledge-curated"]);

async function runCdp() {
  mkdirSync(ART, { recursive: true });
  const PORT = 8110;
  const DBG = 9310;
  function ct(file) {
    return (
      {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".json": "application/json",
        ".png": "image/png"
      }[extname(file).toLowerCase()] || "application/octet-stream"
    );
  }
  const server = createServer((req, res) => {
    try {
      let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      if (urlPath.endsWith("/")) urlPath += "index.html";
      const file = normalize(join(ROOT, urlPath));
      if (!file.startsWith(ROOT)) {
        res.writeHead(403);
        res.end();
        return;
      }
      const st = statSync(file);
      if (!st.isFile()) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { "Content-Type": ct(file), "Cache-Control": "no-store" });
      res.end(readFileSync(file));
    } catch (e) {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((r) => server.listen(PORT, "127.0.0.1", r));
  const chrome = process.env.CHROME_PATH || "/usr/bin/google-chrome";
  const proc = spawn(
    chrome,
    ["--headless=new", "--disable-gpu", "--no-sandbox", "--remote-debugging-port=" + DBG, "about:blank"],
    { stdio: "ignore" }
  );
  await delay(2200);
  const tabs = await new Promise((resolve, reject) => {
    http.get("http://127.0.0.1:" + DBG + "/json/list", (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(d));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
  const WebSocket = (await import(path.join(ROOT, "node_modules/ws/index.js"))).default;
  const ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((r) => ws.on("open", r));
  let id = 0;
  const pending = new Map();
  ws.on("message", (raw) => {
    const msg = JSON.parse(raw);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const mid = ++id;
      pending.set(mid, { resolve, reject });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });

  async function shot(name) {
    const shotRes = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(path.join(ART, name + ".png"), Buffer.from(shotRes.data, "base64"));
  }

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await send("Page.navigate", { url: "http://127.0.0.1:" + PORT + "/knowledge.html" });
  await delay(3500);
  const metrics = await send("Runtime.evaluate", {
    expression: `(() => {
      const card = document.querySelector(".wk-card");
      const toggle = document.querySelector(".wk-card__toggle");
      if (toggle) toggle.click();
      if (card) card.scrollIntoView({ block: "start" });
      const analysis = document.querySelector(".wk-card__analysis");
      return {
        framework: !!document.querySelector(".wk-framework__stages"),
        cards: document.querySelectorAll(".wk-card").length,
        analysis: !!analysis,
        summary: !!document.querySelector(".wk-card__summary"),
        analysisVisible: !!(analysis && analysis.offsetParent !== null),
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
        productMap: document.querySelectorAll(".wk-product-map__item").length
      };
    })()`,
    returnByValue: true
  });
  const m = (metrics.result && metrics.result.value) || {};
  assert("cdp framework stages", m.framework);
  assert("cdp knowledge cards", m.cards >= 1);
  assert("cdp summary vs analysis", m.summary && m.analysis && m.analysisVisible);
  assert("cdp product third-stage map", m.productMap >= 8);
  assert("cdp no overflow mobile", !m.overflow);
  await send("Runtime.evaluate", {
    expression: `document.querySelector(".wk-framework__stages")?.scrollIntoView({block:"start"}); true`,
    returnByValue: true
  });
  await delay(300);
  await shot("01-framework-mobile");
  await send("Runtime.evaluate", {
    expression: `document.querySelector(".wk-card")?.scrollIntoView({block:"start"}); true`,
    returnByValue: true
  });
  await delay(300);
  await shot("02-knowledge-card-expanded");

  await send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false
  });
  await delay(500);
  await send("Runtime.evaluate", {
    expression: `document.querySelector(".wk-framework")?.scrollIntoView({block:"start"}); true`,
    returnByValue: true
  });
  await delay(250);
  await shot("03-framework-desktop");
  await send("Runtime.evaluate", {
    expression: `document.querySelector(".wk-card__analysis")?.scrollIntoView({block:"center"}); true`,
    returnByValue: true
  });
  await delay(250);
  await shot("04-summary-vs-analysis");

  await send("Page.navigate", { url: "http://127.0.0.1:" + PORT + "/about.html" });
  await delay(2000);
  await shot("05-about-framework");

  await send("Page.navigate", { url: "http://127.0.0.1:" + PORT + "/apps/shed-hunting/map/" });
  await delay(4000);
  await send("Runtime.evaluate", {
    expression: `(() => { try { localStorage.setItem("waypoint-sheds-ethics-seen-v1","1"); } catch(e){} document.getElementById("ethics-ack")?.click(); document.querySelectorAll(".sheds-sheet.is-open").forEach(s=>s.classList.remove("is-open")); document.getElementById("btn-toggle-plan")?.click(); return true; })()`,
    returnByValue: true
  });
  await delay(600);
  await shot("06-sheds-direction-link");

  writeFileSync(
    path.join(ART, "README.md"),
    [
      "# Waypoint Knowledge / Product Framework evidence",
      "",
      "- `01-framework-mobile.png` — shared Observe / Understand / direction stages",
      "- `02-knowledge-card-expanded.png` — knowledge card on mobile",
      "- `03-framework-desktop.png` — product third-stage map",
      "- `04-summary-vs-analysis.png` — Source Summary vs Waypoint Perspective",
      "- `05-about-framework.png` — public messaging",
      "- `06-sheds-direction-link.png` — optional Understand entry on Sheds plan"
    ].join("\n")
  );

  ws.close();
  proc.kill("SIGTERM");
  server.close();
  console.log("Artifacts written to", ART);
}

async function main() {
  if (process.env.WK_CDP === "1") {
    try {
      await runCdp();
    } catch (e) {
      console.error("CDP error:", e.message || e);
      failures.push("cdp-run");
    }
  } else {
    console.log("SKIP cdp (set WK_CDP=1 for screenshots)");
  }
  if (failures.length) {
    console.error("\nFramework/knowledge tests failed (" + failures.length + ").");
    failures.forEach((f) => console.error(" -", f));
    process.exit(1);
  }
  console.log("\nAll framework/knowledge tests passed (" + passed + ").");
}

main();
