#!/usr/bin/env node
/**
 * Publish dist/shedhunting/ to the companion GitHub Pages repository.
 *
 * Phase 3A: no custom-domain CNAME. Studio origin flag stays false.
 *
 * Usage:
 *   node scripts/prepare-shed-hunting-host.mjs
 *   node scripts/publish-shed-hunting-host.mjs
 *
 * Env:
 *   SHEDHUNTING_HOST_REPO      default bfree7885/shedhunting.org
 *   SHEDHUNTING_DEPLOY_TOKEN  optional; otherwise uses ambient git credentials
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist/shedhunting");
const REPO = process.env.SHEDHUNTING_HOST_REPO || "bfree7885/shedhunting.org";
const TOKEN = process.env.SHEDHUNTING_DEPLOY_TOKEN || "";

function run(cmd, args, opts) {
  const res = spawnSync(cmd, args, Object.assign({ encoding: "utf8" }, opts));
  if (res.status !== 0) {
    const err = (res.stderr || res.stdout || "").trim();
    throw new Error((cmd + " " + args.join(" ") + " failed: " + err).slice(0, 2000));
  }
  return res.stdout || "";
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const ent of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, ent.name);
    const dst = path.join(to, ent.name);
    if (ent.isDirectory()) copyDir(src, dst);
    else fs.copyFileSync(src, dst);
  }
}

function pagesWorkflow() {
  return `name: GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: .
      - id: deployment
        uses: actions/deploy-pages@v4
`;
}

function readme() {
  return `# ShedHunting.org (generated host)

This repository is the **deployable** Shed Hunting site. Application source lives in [waypoint-studio](https://github.com/bfree7885/waypoint-studio).

Do not edit product code here. Regenerate from the source repo:

\`\`\`
node scripts/prepare-shed-hunting-host.mjs
node scripts/publish-shed-hunting-host.mjs
\`\`\`

Phase 3A: GitHub Pages project URL only. **No custom-domain CNAME** until Phase 3B.
`;
}

function main() {
  if (!fs.existsSync(path.join(DIST, "index.html")) || !fs.existsSync(path.join(DIST, "map/index.html"))) {
    throw new Error("dist/shedhunting/ is missing. Run node scripts/prepare-shed-hunting-host.mjs first.");
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "shedhunting-host-"));
  const remote = TOKEN
    ? "https://x-access-token:" + TOKEN + "@github.com/" + REPO + ".git"
    : "https://github.com/" + REPO + ".git";

  try {
    run("git", ["clone", "--depth", "1", remote, tmp], { cwd: ROOT });
  } catch (e) {
    console.error("Could not clone " + REPO + ".");
    console.error(String(e.message || e));
    console.error("Create the public companion repository, grant this GitHub App access to it, then re-run.");
    process.exit(2);
  }

  for (const ent of fs.readdirSync(tmp)) {
    if (ent === ".git") continue;
    fs.rmSync(path.join(tmp, ent), { recursive: true, force: true });
  }
  copyDir(DIST, tmp);
  fs.mkdirSync(path.join(tmp, ".github/workflows"), { recursive: true });
  fs.writeFileSync(path.join(tmp, ".github/workflows/pages.yml"), pagesWorkflow());
  fs.writeFileSync(path.join(tmp, "README.md"), readme());
  if (fs.existsSync(path.join(tmp, "CNAME"))) {
    fs.unlinkSync(path.join(tmp, "CNAME"));
  }

  run("git", ["add", "-A"], { cwd: tmp });
  const status = run("git", ["status", "--porcelain"], { cwd: tmp });
  if (!status.trim()) {
    console.log("companion already up to date");
    return;
  }
  run("git", ["-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com", "-c", "user.name=github-actions[bot]", "commit", "-m", "Publish Shed Hunting host artifact"], { cwd: tmp });
  run("git", ["push", "origin", "HEAD:main"], { cwd: tmp });
  console.log("published to https://github.com/" + REPO);
}

try {
  main();
} catch (err) {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
}
