#!/usr/bin/env node
/**
 * Publish dist/signalterrain-field-test/ to bfree7885/waypoint-studio-site.
 *
 * Isolated GitHub Pages field-test host (github.io). Does not deploy
 * waypointstudio.org. Does not touch sheds-site / shedhunting.org.
 * Does not write a CNAME. Does not force-push.
 *
 * Env:
 *   SIGNALTERRAIN_FIELD_TEST_HOST_REPO  default bfree7885/waypoint-studio-site
 *   SIGNALTERRAIN_FIELD_TEST_TOKEN      optional; falls back to SHEDHUNTING_DEPLOY_TOKEN
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { FIELD_TEST_URL, HOST_REPO as DEFAULT_HOST } from "./prepare-signalterrain-field-test-host.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist/signalterrain-field-test");
const REPO = process.env.SIGNALTERRAIN_FIELD_TEST_HOST_REPO || DEFAULT_HOST;
const TOKEN =
  process.env.SIGNALTERRAIN_FIELD_TEST_TOKEN ||
  process.env.SHEDHUNTING_DEPLOY_TOKEN ||
  "";
const LEGACY_TAG = "legacy-waypoint-studio-site-pre-st-v09";

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

function assertSafeRepo() {
  if (REPO === "bfree7885/sheds-site" || /sheds-site/.test(REPO)) {
    throw new Error("Refusing to publish SignalTerrain field-test to sheds-site.");
  }
  if (REPO === "bfree7885/waypoint-studio") {
    throw new Error("Refusing to publish SignalTerrain field-test into waypoint-studio production.");
  }
}

function gitIdentity(cwd) {
  return [
    "-c",
    "user.email=41898282+github-actions[bot]@users.noreply.github.com",
    "-c",
    "user.name=github-actions[bot]"
  ];
}

function tagIfMissing(cwd, tag, sha) {
  try {
    run("git", ["rev-parse", tag], { cwd });
    console.log("keep rollback tag", tag);
  } catch (e) {
    run("git", ["tag", tag, sha], { cwd });
    try {
      run("git", ["push", "origin", tag], { cwd });
      console.log("created rollback tag", tag, sha);
    } catch (err) {
      console.error("Could not push tag", tag, String(err.message || err).slice(0, 400));
    }
  }
}

function main() {
  assertSafeRepo();
  if (!fs.existsSync(path.join(DIST, "apps/summit-signal/index.html"))) {
    throw new Error("dist/signalterrain-field-test/ is missing. Run node scripts/prepare-signalterrain-field-test-host.mjs first.");
  }
  if (fs.existsSync(path.join(DIST, "CNAME"))) {
    throw new Error("Refusing to publish a CNAME. Field-test host must stay on github.io.");
  }
  if (fs.existsSync(path.join(DIST, "apps/shed-hunting")) || fs.existsSync(path.join(DIST, "map"))) {
    throw new Error("Refusing to publish Sheds files in the SignalTerrain field-test artifact.");
  }
  if (fs.existsSync(path.join(DIST, "apps/signalterrain"))) {
    throw new Error("Refusing to publish retired cyber SignalTerrain on the field-test host.");
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "st-field-test-host-"));
  const remote = TOKEN
    ? "https://x-access-token:" + TOKEN + "@github.com/" + REPO + ".git"
    : "https://github.com/" + REPO + ".git";

  try {
    run("git", ["clone", "--depth", "50", remote, tmp], { cwd: ROOT });
  } catch (e) {
    console.error("Could not clone " + REPO + ".");
    console.error(String(e.message || e));
    console.error("Grant contents:write on bfree7885/waypoint-studio-site, or set SIGNALTERRAIN_FIELD_TEST_TOKEN / SHEDHUNTING_DEPLOY_TOKEN.");
    process.exit(2);
  }

  const prev = run("git", ["rev-parse", "HEAD"], { cwd: tmp }).trim();
  console.log("host HEAD before replace:", prev);
  tagIfMissing(tmp, LEGACY_TAG, prev);

  for (const ent of fs.readdirSync(tmp)) {
    if (ent === ".git") continue;
    fs.rmSync(path.join(tmp, ent), { recursive: true, force: true });
  }
  copyDir(DIST, tmp);
  if (fs.existsSync(path.join(tmp, "CNAME"))) {
    fs.rmSync(path.join(tmp, "CNAME"));
  }
  fs.writeFileSync(path.join(tmp, "ROLLBACK.txt"), "previous-host-sha " + prev + "\nlegacy-tag " + LEGACY_TAG + "\n");

  run("git", ["add", "-A"], { cwd: tmp });
  const status = run("git", ["status", "--porcelain"], { cwd: tmp });
  if (!status.trim()) {
    console.log("field-test host already up to date");
    console.log("FIELD-TEST URL (LIVE)", FIELD_TEST_URL);
    return;
  }
  run(
    "git",
    gitIdentity(tmp).concat([
      "commit",
      "-m",
      "Publish unlisted SignalTerrain V1.1 field-test host from waypoint-studio"
    ]),
    { cwd: tmp }
  );
  run("git", ["push", "origin", "HEAD:main"], { cwd: tmp });
  const next = run("git", ["rev-parse", "HEAD"], { cwd: tmp }).trim();
  console.log("published to https://github.com/" + REPO, "commit", next, "rollback-from", prev);
  console.log("FIELD-TEST URL (LIVE)", FIELD_TEST_URL);
}

try {
  main();
} catch (err) {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
}
