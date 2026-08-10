import fs from "fs";
import path from "path";
import { writeJson, readJson, nowIso } from "./io.mjs";
import { getStateDir } from "./paths.mjs";

/**
 * Machine-readable evidence package for Subscriber Ready gate runs.
 * Stored under Product Board state so the board can prove what was evaluated.
 */
export const EVIDENCE_KINDS = Object.freeze([
  "automated_tests",
  "playwright_browser",
  "screenshots",
  "mobile_screenshots",
  "console",
  "network",
  "production_url",
  "a11y",
  "data_source",
  "static_probe",
  "commercial_review",
  "red_team",
  "attestation",
  "gate_summary"
]);

export function getEvidenceDir(runId) {
  const base = path.join(getStateDir(), "evidence");
  return runId ? path.join(base, runId) : base;
}

export function createEvidenceRun(meta = {}) {
  const runId =
    meta.runId ||
    `gate-${nowIso().replace(/[:.]/g, "-")}`;
  const dir = getEvidenceDir(runId);
  fs.mkdirSync(dir, { recursive: true });
  const manifest = {
    version: 1,
    runId,
    createdAt: nowIso(),
    campaign: meta.campaign || null,
    target: meta.target || "waypoint-studio",
    entries: []
  };
  writeJson(path.join(dir, "manifest.json"), manifest);
  return { runId, dir, manifest };
}

export function addEvidenceEntry(run, entry) {
  const kind = entry.kind || "static_probe";
  if (!EVIDENCE_KINDS.includes(kind)) {
    throw new Error(`Unknown evidence kind: ${kind}`);
  }
  const id = entry.id || `${kind}-${run.manifest.entries.length + 1}`;
  const record = {
    id,
    kind,
    at: nowIso(),
    status: entry.status || "recorded",
    summary: entry.summary || "",
    severity: entry.severity || null,
    artifact: entry.artifact || null,
    data: entry.data ?? null
  };

  if (entry.data != null && entry.persist !== false) {
    const fileName = `${id}.json`.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = path.join(run.dir, fileName);
    writeJson(filePath, {
      id,
      kind,
      at: record.at,
      status: record.status,
      summary: record.summary,
      severity: record.severity,
      data: entry.data
    });
    record.artifact = path.relative(getStateDir(), filePath);
  }

  run.manifest.entries.push(record);
  writeJson(path.join(run.dir, "manifest.json"), run.manifest);
  return record;
}

export function finalizeEvidenceRun(run, summary) {
  const summaryPath = path.join(run.dir, "summary.json");
  writeJson(summaryPath, {
    ...summary,
    runId: run.runId,
    finalizedAt: nowIso(),
    entryCount: run.manifest.entries.length
  });
  run.manifest.summaryArtifact = path.relative(getStateDir(), summaryPath);
  run.manifest.finalizedAt = nowIso();
  writeJson(path.join(run.dir, "manifest.json"), run.manifest);
  return {
    runId: run.runId,
    dir: run.dir,
    manifestPath: path.join(run.dir, "manifest.json"),
    summaryPath,
    entryCount: run.manifest.entries.length
  };
}

export function loadLatestEvidenceSummary() {
  const base = getEvidenceDir();
  if (!fs.existsSync(base)) return null;
  const runs = fs
    .readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  if (!runs.length) return null;
  const latest = runs[runs.length - 1];
  const summaryPath = path.join(base, latest, "summary.json");
  if (!fs.existsSync(summaryPath)) return { runId: latest, summary: null };
  return { runId: latest, summary: readJson(summaryPath) };
}

export function evidenceCompleteness(manifest, requiredKinds = []) {
  const present = new Set((manifest?.entries || []).map((e) => e.kind));
  const missing = requiredKinds.filter((k) => !present.has(k));
  return { complete: missing.length === 0, missing, present: [...present] };
}
