#!/usr/bin/env node
/**
 * Global Signals Articles — Sprint 1 Prompt 1 (route shell).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

const htmlPath = "side-trails/global-signals/articles/index.html";
const cssPath = "design-system/css/wds-global-signals-articles.css";

assert.ok(exists(htmlPath), "articles route missing");
assert.ok(exists(cssPath), "articles CSS missing");

const html = read(htmlPath);
assert.match(html, /<title>Articles — Global Signals<\/title>/);
assert.match(html, /Intelligence briefs with verified sources/);
assert.match(html, /id="gsa-feed"/);
assert.match(html, /data-gsa-feed/);
assert.match(html, /data-gsa-state="empty"/);
assert.match(
  html,
  /Global Signals articles will appear here as verified sources are added\./
);
assert.match(html, /href="\.\.\/"/);
assert.match(html, /href="\.\.\/\.\.\//);
assert.match(html, /Back to Global Signals/);
assert.match(html, /Side Trails/);
assert.match(html, /wds-global-signals-articles\.css/);
assert.match(html, /wds-global-signals-landing\.css/);
assert.doesNotMatch(html, /Coming soon/i);
assert.doesNotMatch(html, /fetch\(|WebSocket|openai|anthropic/i);
assert.doesNotMatch(html, /waypointsTake|impactPath|confidence/i);

const css = read(cssPath);
assert.match(css, /\.gsa-feed/);
assert.match(css, /\.gsa-empty/);
assert.match(css, /@media \(max-width:\s*40rem\)/);
assert.match(css, /min-height:\s*10rem/);

// Static file server smoke: 200 + no script console surface on shell
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".js": "text/javascript; charset=utf-8"
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  let rel = urlPath === "/" ? "index.html" : urlPath.replace(/^\//, "");
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.join(root, rel);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  const ext = path.extname(file);
  res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
  res.end(fs.readFileSync(file));
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

async function get(pathname) {
  const res = await fetch(`${base}${pathname}`);
  const text = await res.text();
  return { status: res.status, text, headers: res.headers };
}

const page = await get("/side-trails/global-signals/articles/");
assert.equal(page.status, 200, "articles route should return 200");
assert.match(page.text, /gsa-feed/);
assert.match(page.text, /Global Signals articles will appear here/);

const cssRes = await get("/design-system/css/wds-global-signals-articles.css");
assert.equal(cssRes.status, 200, "articles CSS should return 200");

const gs = await get("/side-trails/global-signals/");
assert.equal(gs.status, 200);
assert.match(gs.text, /\.\/articles\//);

const st = await get("/side-trails/");
assert.equal(st.status, 200);

// Shell has no app scripts — console-error surface is empty by construction
assert.doesNotMatch(page.text, /<script/i);

server.close();
console.log("Global Signals Articles Prompt 1 (route shell) checks passed.");
