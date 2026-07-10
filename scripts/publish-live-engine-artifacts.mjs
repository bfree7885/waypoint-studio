#!/usr/bin/env node
/**
 * Publish Waypoint Live Engine artifacts to GitHub Pages via git commit/push.
 *
 * Safe guards:
 * - Only publishes when live.json data changed since last successful publish
 * - Minimum interval between publish commits (default 20 minutes)
 * - Commits only known artifact paths (no unrelated files)
 * - Skips when WAYPOINT_PUBLISH_ENABLED=0
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const LOG_DIR = path.join(ROOT, "scripts", "logs");
const LOG_PATH = path.join(LOG_DIR, "live-engine-publish.log");
const PUBLISH_STATE_PATH = path.join(ROOT, "data", "publish-state.json");
const ARTIFACTS = [
  "data/live.json",
  "data/health.json",
  "data/publish-state.json",
  "status.html",
  "debug.html"
];
const COMMIT_PREFIX = "Publish live engine artifacts";
const MIN_PUBLISH_INTERVAL_MS = Number(process.env.WAYPOINT_PUBLISH_MIN_INTERVAL_MS || 20 * 60 * 1000);

const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.appendFileSync(LOG_PATH, line + "\n", "utf8");
  console.log(line);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function writeJsonAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, file);
}

function run(cmd, options) {
  return execSync(cmd, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: options && options.silent ? "pipe" : "inherit"
  });
}

function runQuiet(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: "pipe" }).trim();
  } catch (err) {
    return null;
  }
}

function defaultPublishState() {
  return {
    version: 1,
    lastEngineRun: null,
    dataUpdatedAt: null,
    nextScheduledRun: null,
    lastPublishAt: null,
    lastPublishedDataAt: null,
    lastPublishCommit: null,
    lastPublishStatus: "never",
    lastPublishMessage: "No publish attempted yet"
  };
}

function loadPublishState() {
  return { ...defaultPublishState(), ...(readJson(PUBLISH_STATE_PATH) || {}) };
}

function savePublishState(state) {
  writeJsonAtomic(PUBLISH_STATE_PATH, state);
}

function liveDataUpdatedAt() {
  const live = readJson(path.join(ROOT, "data", "live.json"));
  return live && live.updatedAt ? live.updatedAt : null;
}

function artifactsChanged() {
  const paths = ARTIFACTS.map((rel) => path.join(ROOT, rel));
  const existing = paths.filter((file) => fs.existsSync(file));
  if (!existing.length) return false;
  const quoted = existing.map((file) => JSON.stringify(file)).join(" ");
  const diff = runQuiet(`git diff --name-only -- ${quoted}`);
  const untracked = runQuiet(`git ls-files --others --exclude-standard -- ${quoted}`);
  return Boolean((diff && diff.length) || (untracked && untracked.length));
}

function lastPublishCommitAgeMs() {
  const subject = runQuiet('git log -1 --pretty=%s');
  if (!subject || !subject.startsWith(COMMIT_PREFIX)) return null;
  const ts = runQuiet('git log -1 --pretty=%cI');
  if (!ts) return null;
  const age = Date.now() - Date.parse(ts);
  return Number.isFinite(age) ? age : null;
}

function finish(state, status, message) {
  state.lastPublishStatus = status;
  state.lastPublishMessage = message;
  if (!dryRun) savePublishState(state);
  log(`publish ${status}: ${message}`);
  if (status === "failed") process.exitCode = 1;
}

function main() {
  log(`publish ${dryRun ? "dry-run" : "run"} started`);

  if (process.env.WAYPOINT_PUBLISH_ENABLED === "0") {
    const state = loadPublishState();
    finish(state, "skipped", "WAYPOINT_PUBLISH_ENABLED=0");
    return;
  }

  if (!runQuiet("git rev-parse --is-inside-work-tree")) {
    const state = loadPublishState();
    finish(state, "failed", "Not a git repository");
    return;
  }

  const state = loadPublishState();
  const dataUpdatedAt = liveDataUpdatedAt();
  if (!dataUpdatedAt) {
    finish(state, "failed", "data/live.json missing or has no updatedAt");
    return;
  }

  state.dataUpdatedAt = dataUpdatedAt;
  const health = readJson(path.join(ROOT, "data", "health.json"));
  if (health && health.nextScheduledUpdate) {
    state.nextScheduledRun = health.nextScheduledUpdate;
  }

  const dataChanged = !state.lastPublishedDataAt || state.lastPublishedDataAt !== dataUpdatedAt;
  const filesChanged = artifactsChanged();

  if (!filesChanged) {
    finish(state, "skipped", "No artifact file changes detected");
    return;
  }

  if (!dataChanged && !force) {
    finish(state, "skipped", "Artifact files changed but live data timestamp unchanged");
    return;
  }

  const recentPublishAge = lastPublishCommitAgeMs();
  if (!force && recentPublishAge != null && recentPublishAge < MIN_PUBLISH_INTERVAL_MS) {
    finish(
      state,
      "skipped",
      `Recent publish commit ${Math.round(recentPublishAge / 1000)}s ago (min interval ${Math.round(MIN_PUBLISH_INTERVAL_MS / 1000)}s)`
    );
    return;
  }

  const branch = runQuiet("git rev-parse --abbrev-ref HEAD") || "main";
  const remote = process.env.WAYPOINT_PUBLISH_REMOTE || "origin";
  const ahead = runQuiet(`git rev-list --count ${remote}/${branch}..HEAD 2>/dev/null`);
  if (ahead && Number(ahead) > 0 && !force) {
    finish(state, "skipped", `Local branch is ${ahead} commit(s) ahead of ${remote}/${branch}; push pending changes first`);
    return;
  }

  const dirtyOutside = runQuiet('git status --porcelain -- . ":(exclude)data/live.json" ":(exclude)data/health.json" ":(exclude)data/publish-state.json" ":(exclude)status.html" ":(exclude)debug.html"');
  if (dirtyOutside) {
    finish(state, "skipped", "Working tree has unrelated uncommitted changes");
    return;
  }

  const commitMessage = `${COMMIT_PREFIX} (${dataUpdatedAt}). [skip ci]`;
  log(`files changed: ${ARTIFACTS.join(", ")}`);
  log(`publish attempted: branch=${branch} remote=${remote} dryRun=${dryRun}`);

  if (dryRun) {
    finish(state, "dry-run", `Would commit and push: ${commitMessage}`);
    return;
  }

  try {
    const addArgs = ARTIFACTS.map((rel) => JSON.stringify(rel)).join(" ");
    run(`git fetch ${remote} ${branch}`, { silent: true });
    const behind = runQuiet(`git rev-list --count HEAD..${remote}/${branch} 2>/dev/null`);
    if (behind && Number(behind) > 0) {
      log(`rebasing onto ${remote}/${branch} (${behind} commit(s) behind)`);
      run(`git rebase ${remote}/${branch}`, { silent: true });
    }
    run(`git add -- ${addArgs}`, { silent: true });
    run(`git commit -m ${JSON.stringify(commitMessage)}`, { silent: true });
    const commit = runQuiet("git rev-parse --short HEAD");
    run(`git push ${remote} HEAD:${branch}`);
    state.lastPublishAt = new Date().toISOString();
    state.lastPublishedDataAt = dataUpdatedAt;
    state.lastPublishCommit = commit;
    savePublishState(state);
    finish(state, "succeeded", `Pushed ${commit} to ${remote}/${branch}`);
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    finish(state, "failed", message);
  }
}

main();
