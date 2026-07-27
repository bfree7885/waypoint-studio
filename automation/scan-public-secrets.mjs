#!/usr/bin/env node
/**
 * Scan public product surfaces for secrets / private API credentials.
 * Excludes private/, node_modules/, and known non-secret schema URLs.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs/turnaround/2026-07-26-sprint-03");

const SKIP_DIR = new Set([
  ".git",
  "node_modules",
  "private",
  "audits",
  "reports",
  "docs",
  "automation/artifacts"
]);

const PATTERNS = [
  { id: "aws-key", re: /AKIA[0-9A-Z]{16}/g },
  { id: "google-api", re: /AIza[0-9A-Za-z_-]{20,}/g },
  { id: "slack-token", re: /xox[baprs]-[0-9A-Za-z-]{10,}/g },
  { id: "github-pat", re: /gh[pousr]_[A-Za-z0-9_]{20,}/g },
  { id: "jwt", re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { id: "generic-secret-assign", re: /(?:api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"']{12,}["']/gi },
  { id: "bearer", re: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/g },
  { id: "private-key-block", re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g }
];

const ALLOW = [
  /apiKeyConfigured/,
  /requires apiKey in WDS\.weather\.configure/,
  /cfg\.apiKey/,
  /headers\.apiKey = NVD_API_KEY/,
  /Boolean\(NVD_API_KEY\)/,
  /process\.env\.[A-Z0-9_]*KEY/,
  /process\.env\.[A-Z0-9_]*TOKEN/,
  /process\.env\.[A-Z0-9_]*SECRET/,
  /"apiKeyConfigured": false/,
  /password data/i,
  /account passwords/i,
  /formsubmit\.co\/ajax\/contact@/
];

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(js|mjs|json|html|css|md|yml|yaml|txt)$/i.test(ent.name)) out.push(p);
  }
  return out;
}

const hits = [];
for (const file of walk(ROOT)) {
  const text = fs.readFileSync(file, "utf8");
  const rel = path.relative(ROOT, file);
  for (const pat of PATTERNS) {
    pat.re.lastIndex = 0;
    let m;
    while ((m = pat.re.exec(text))) {
      const snippet = text.slice(Math.max(0, m.index - 40), Math.min(text.length, m.index + m[0].length + 40));
      if (ALLOW.some((re) => re.test(snippet))) continue;
      hits.push({
        file: rel,
        pattern: pat.id,
        match: m[0].slice(0, 80),
        context: snippet.replace(/\s+/g, " ").trim()
      });
    }
  }
}

fs.mkdirSync(OUT, { recursive: true });
const report = {
  generatedAt: new Date().toISOString(),
  scannedRoot: ROOT,
  hitCount: hits.length,
  hits: hits.slice(0, 50)
};
fs.writeFileSync(path.join(OUT, "secret-scan.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: hits.length === 0, hitCount: hits.length, sample: hits.slice(0, 5) }, null, 2));
if (hits.length) process.exit(1);
