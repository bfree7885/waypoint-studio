/**
 * Sheds V3.1 mapping foundation visual QA (CDP).
 * Captures required viewports including primary 390 active+prompt+YOU.
 */
import fs from "fs";
import path from "path";
import http from "http";
import { createServer } from "http";
import { spawn } from "child_process";
import { setTimeout as delay } from "timers/promises";
import { extname, join, normalize } from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ART = path.join(ROOT, "reports", "sheds-v3-mapping-foundation");
fs.mkdirSync(ART, { recursive: true });
const PORT = 8127;
const DBG = 9327;

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
    const st = fs.statSync(file);
    if (!st.isFile()) {
      res.writeHead(404);
      res.end();
      return;
    }
    const ct =
      {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".json": "application/json",
        ".png": "image/png"
      }[extname(file).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": ct, "Cache-Control": "no-store" });
    res.end(fs.readFileSync(file));
  } catch {
    res.writeHead(404);
    res.end("missing");
  }
});
await new Promise((r) => server.listen(PORT, "127.0.0.1", r));

const proc = spawn(
  "/usr/bin/google-chrome",
  ["--headless=new", "--disable-gpu", "--no-sandbox", "--remote-debugging-port=" + DBG, "about:blank"],
  { stdio: "ignore" }
);
await delay(2200);
const tabs = await new Promise((resolve, reject) => {
  http
    .get("http://127.0.0.1:" + DBG + "/json/list", (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(d));
        } catch (e) {
          reject(e);
        }
      });
    })
    .on("error", reject);
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
await send("Page.enable");
await send("Runtime.enable");
async function evalExpr(expression) {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result?.value;
}
async function prep() {
  await evalExpr(`(() => {
    try {
      localStorage.setItem("waypoint-sheds-ethics-seen-v1","1");
      localStorage.setItem("waypoint-sheds-first-run-coach-v1","1");
    } catch(e){}
    document.querySelectorAll(".sheds-sheet.is-open").forEach(s=>{s.classList.remove("is-open"); s.setAttribute("aria-hidden","true");});
    document.documentElement.classList.remove("sheds-sheet-open");
    var c=document.getElementById("first-run-coach"); if(c) c.setAttribute("hidden","");
    var e=document.getElementById("ethics-ack"); if(e) e.click();
    var loading=document.getElementById("map-loading"); if(loading){loading.classList.add("is-done"); loading.setAttribute("hidden","");}
    var plan=document.getElementById("plan-card"); if (plan) plan.setAttribute("data-expanded","false");
    document.documentElement.style.setProperty("--sheds-safe-top", "47px");
    document.documentElement.style.setProperty("--sheds-safe-bottom", "34px");
    return true;
  })()`);
  await delay(300);
}

const MEASURE = `(() => {
  function visible(el){
    if(!el || el.hasAttribute("hidden") || el.hidden) return null;
    const cs=getComputedStyle(el);
    if(cs.display==="none" || cs.visibility==="hidden") return null;
    const r=el.getBoundingClientRect();
    if(r.width<1 || r.height<1) return null;
    return {t:+r.top.toFixed(1), b:+r.bottom.toFixed(1), l:+r.left.toFixed(1), r:+r.right.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1)};
  }
  function touchGap(a,b){
    if(!a||!b) return null;
    const dx = Math.max(a.l-b.r, b.l-a.r, 0);
    const dy = Math.max(a.t-b.b, b.t-a.b, 0);
    if(dx===0 && dy===0){
      const ox = Math.min(a.r,b.r)-Math.max(a.l,b.l);
      const oy = Math.min(a.b,b.b)-Math.max(a.t,b.t);
      if(ox>0 && oy>0) return -Math.min(ox,oy);
      return 0;
    }
    return Math.hypot(dx,dy);
  }
  const items = {
    hud: visible(document.querySelector(".sheds-hud-top")),
    strip: visible(document.getElementById("session-strip")),
    prompt: visible(document.getElementById("search-prompt")),
    here: visible(document.querySelector(".sheds-here")),
    mapCtrls: visible(document.querySelector(".sheds-map-ctrls")),
    measure: visible(document.getElementById("measure-hud")),
    inspect: visible(document.getElementById("inspect-hud")),
    dock: visible(document.querySelector(".sheds-app-dock")),
  };
  const pairs=[["hud","strip"],["strip","prompt"],["strip","mapCtrls"],["prompt","here"],["prompt","mapCtrls"]];
  const collisions=[], tight=[];
  for (const [a,b] of pairs) {
    const A=items[a], B=items[b]; if(!A||!B) continue;
    const g=touchGap(A,B);
    if(g!==null && g<0) collisions.push(a+"×"+b+" overlap="+(-g).toFixed(1));
    else if(g!==null && g<6) tight.push(a+"×"+b+" gap="+g.toFixed(1));
  }
  return {
    collisions, tight,
    basemap: (document.getElementById("basemap-select")||{}).value || null,
    measureHidden: !items.measure,
    inspectHidden: !items.inspect,
    hasBasemapSelect: !!document.getElementById("basemap-select"),
    hasMeasureBtn: !!document.getElementById("btn-measure")
  };
})()`;

async function shot(name, w, h, mobile, steps) {
  await send("Emulation.setDeviceMetricsOverride", {
    width: w,
    height: h,
    deviceScaleFactor: mobile ? 3 : 1,
    mobile: !!mobile
  });
  await send("Page.navigate", { url: "http://127.0.0.1:" + PORT + "/apps/shed-hunting/map/" });
  await delay(4500);
  await prep();
  if (steps) {
    await evalExpr(steps);
    await delay(800);
  }
  const png = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ART, name + ".png"), Buffer.from(png.data, "base64"));
  const m = await evalExpr(MEASURE);
  fs.writeFileSync(path.join(ART, name + ".json"), JSON.stringify(m, null, 2));
  console.log(name, JSON.stringify(m));
}

const actPromptYou = `document.getElementById("btn-track").click();
  var m=document.getElementById("session-strip-meta"); if(m) m.textContent="47m 12s · 12 notes · track paused";
  var p=document.getElementById("search-prompt"); if(p){p.removeAttribute("hidden"); p.hidden=false;}
  var label=document.getElementById("loc-status"); if(label){label.textContent="You · GPS ~12 m";}
  true`;

await shot("01-320-portrait", 320, 568, true);
await shot("02-390-portrait", 390, 844, true);
await shot("03-390-active", 390, 844, true, `document.getElementById("btn-track").click(); true`);
await shot("04-390-active-prompt-you-PRIMARY", 390, 844, true, actPromptYou);
await shot(
  "05-390-briefing-expanded",
  390,
  844,
  true,
  `document.getElementById("btn-toggle-plan").click(); true`
);
await shot(
  "06-390-map-layers",
  390,
  844,
  true,
  `(async () => {
    document.getElementById("btn-more").click();
    await new Promise(r => setTimeout(r, 300));
    document.getElementById("btn-layers").click();
    await new Promise(r => setTimeout(r, 400));
    return true;
  })()`
);
await shot(
  "07-390-measure",
  390,
  844,
  true,
  `(async () => {
    document.getElementById("btn-more").click();
    await new Promise(r => setTimeout(r, 300));
    document.getElementById("btn-layers").click();
    await new Promise(r => setTimeout(r, 300));
    document.getElementById("btn-measure").click();
    await new Promise(r => setTimeout(r, 200));
    return true;
  })()`
);
await shot("08-844x390-landscape", 844, 390, true, actPromptYou);
await shot("09-1280-desktop", 1280, 800, false);
await shot(
  "10-390-satellite",
  390,
  844,
  true,
  `(async () => {
    document.getElementById("btn-more").click();
    await new Promise(r => setTimeout(r, 300));
    document.getElementById("btn-layers").click();
    await new Promise(r => setTimeout(r, 300));
    var s = document.getElementById("basemap-select");
    s.value = "satellite";
    s.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise(r => setTimeout(r, 500));
    var closeBtn = document.querySelector("#sheet-controls [data-close-sheet]");
    if (closeBtn) closeBtn.click();
    await new Promise(r => setTimeout(r, 400));
    return true;
  })()`
);

fs.writeFileSync(
  path.join(ART, "README.md"),
  `# Sheds V3.1 mapping foundation QA\n\nGenerated by automation/capture-sheds-v3-mapping-foundation.mjs\n`
);

ws.close();
proc.kill("SIGTERM");
server.close();
console.log("DONE", ART);
