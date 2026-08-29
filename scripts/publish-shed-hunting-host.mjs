#!/usr/bin/env node
/**
 * Publish dist/shedhunting/ to bfree7885/sheds-site (GitHub Pages for shedhunting.org).
 *
 * Keeps the existing shedhunting.org CNAME. Does not change waypointstudio.org.
 * Does not force-push. Tags the pre-replace HEAD for rollback.
 *
 * Env:
 *   SHEDHUNTING_HOST_REPO             default bfree7885/sheds-site
 *   SHEDHUNTING_DEPLOY_TOKEN          optional PAT with contents:write on sheds-site
 *   WAYPOINT_MAP_TILE_CONFIG          optional JSON overlay (not required)
 *   SHEDHUNTING_ALLOW_PLACEHOLDER_TILES=1  only for non-production tests
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist/shedhunting");
const REPO = process.env.SHEDHUNTING_HOST_REPO || "bfree7885/sheds-site";
const TOKEN = process.env.SHEDHUNTING_DEPLOY_TOKEN || "";
const ALLOW_PLACEHOLDER = process.env.SHEDHUNTING_ALLOW_PLACEHOLDER_TILES === "1";
const ROLLBACK_TAG = "legacy-terrain-intelligence-2026-03-10";

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

function metaContentFromHtml(html) {
  const m = String(html || "").match(/<meta\s+name="waypoint-map-tiles"[^>]*content='(\{[^']*\})'/i)
    || String(html || "").match(/<meta\s+name="waypoint-map-tiles"[^>]*content="(\{[^"]*\})"/i);
  return m && m[1] ? m[1] : null;
}

function parseEnvTileConfig() {
  const raw = (process.env.WAYPOINT_MAP_TILE_CONFIG || "").trim();
  if (!raw || raw.charAt(0) !== "{") return null;
  try {
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : null;
  } catch (e) {
    return null;
  }
}

function loadDistTiles(dist) {
  const jsPath = path.join(dist, "js/sheds-tile-provider.js");
  const html = fs.readFileSync(path.join(dist, "map/index.html"), "utf8");
  const meta = metaContentFromHtml(html);
  const sandbox = {
    console,
    document: {
      querySelector: function (sel) {
        if (String(sel || "").indexOf("waypoint-map-tiles") >= 0 && meta) {
          return {
            getAttribute: function () {
              return meta;
            }
          };
        }
        return null;
      }
    }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.WAYPOINT_MAP_TILE_CONFIG = parseEnvTileConfig();
  vm.runInNewContext(fs.readFileSync(jsPath, "utf8"), sandbox, { filename: "sheds-tile-provider.js" });
  return sandbox.WaypointShedsTiles;
}

function effectiveStreetUrl(tiles) {
  return tiles.mergeConfig().streetUrl;
}

function readme() {
  return `# ShedHunting.org (generated host)

This repository is the **GitHub Pages deploy target** for [https://shedhunting.org](https://shedhunting.org).

Canonical application source: [waypoint-studio](https://github.com/bfree7885/waypoint-studio).

Do not edit product code here. Publish from the source repo:

\`\`\`
node scripts/prepare-shed-hunting-host.mjs
node scripts/publish-shed-hunting-host.mjs
\`\`\`

Pages: branch \`main\` / root. Keep the \`CNAME\` file as \`shedhunting.org\`.
Do not point this project at \`waypointstudio.org\`.
`;
}

function main() {
  if (!fs.existsSync(path.join(DIST, "index.html")) || !fs.existsSync(path.join(DIST, "map/index.html"))) {
    throw new Error("dist/shedhunting/ is missing. Run node scripts/prepare-shed-hunting-host.mjs first.");
  }

  const tiles = loadDistTiles(DIST);
  const streetUrl = effectiveStreetUrl(tiles);
  if (!ALLOW_PLACEHOLDER && !tiles.isPublishableStreetUrl(streetUrl)) {
    console.error("Refusing to publish a watermarked host.");
    console.error("Effective Street URL is not production-safe:", streetUrl);
    console.error("Default Street must be Esri World Street Map (or a keyed CARTO URL).");
    console.error("WAYPOINT_MAP_TILE_CONFIG is an optional overlay, not a required secret.");
    console.error("Do not replace live shedhunting.org with CARTO API KEY REQUIRED tiles.");
    process.exit(3);
  }
  console.log("publish street provider:", streetUrl);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "shedhunting-host-"));
  const remote = TOKEN
    ? "https://x-access-token:" + TOKEN + "@github.com/" + REPO + ".git"
    : "https://github.com/" + REPO + ".git";

  try {
    run("git", ["clone", "--depth", "1", remote, tmp], { cwd: ROOT });
  } catch (e) {
    console.error("Could not clone " + REPO + ".");
    console.error(String(e.message || e));
    console.error("Grant the Cursor GitHub App access to bfree7885/sheds-site, or set SHEDHUNTING_DEPLOY_TOKEN (contents:write).");
    process.exit(2);
  }

  const prev = run("git", ["rev-parse", "HEAD"], { cwd: tmp }).trim();
  console.log("sheds-site HEAD before replace:", prev);
  try {
    run("git", ["tag", "-f", ROLLBACK_TAG, prev], { cwd: tmp });
    run("git", ["push", "origin", ROLLBACK_TAG], { cwd: tmp });
    console.log("rollback tag:", ROLLBACK_TAG, prev);
  } catch (e) {
    console.error("Could not push rollback tag (history on main is still intact at " + prev + "):", String(e.message || e).slice(0, 400));
  }

  for (const ent of fs.readdirSync(tmp)) {
    if (ent === ".git") continue;
    fs.rmSync(path.join(tmp, ent), { recursive: true, force: true });
  }
  copyDir(DIST, tmp);
  fs.writeFileSync(path.join(tmp, "CNAME"), "shedhunting.org\n");
  fs.writeFileSync(path.join(tmp, "README.md"), readme());

  run("git", ["add", "-A"], { cwd: tmp });
  const status = run("git", ["status", "--porcelain"], { cwd: tmp });
  if (!status.trim()) {
    console.log("sheds-site already up to date");
    return;
  }
  run("git", ["-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com", "-c", "user.name=github-actions[bot]", "commit", "-m", "Publish generated ShedHunting.org host from waypoint-studio"], { cwd: tmp });
  run("git", ["push", "origin", "HEAD:main"], { cwd: tmp });
  const next = run("git", ["rev-parse", "HEAD"], { cwd: tmp }).trim();
  console.log("published to https://github.com/" + REPO, "commit", next, "rollback", prev);
}

try {
  main();
} catch (err) {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
}
