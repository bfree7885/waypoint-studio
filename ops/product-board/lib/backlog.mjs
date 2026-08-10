import { readJson, writeJson, nowIso, nextId } from "./io.mjs";
import { getBacklogPath, ENG_ROOT } from "./paths.mjs";
import {
  assertSeverity,
  compareSeverity,
  blocksSubscriberReady
} from "./severity.mjs";
import path from "path";
import fs from "fs";

export const WORK_STATUSES = Object.freeze([
  "backlog",
  "ready",
  "in_progress",
  "fix",
  "test",
  "visual_review",
  "red_team",
  "retest",
  "blocked",
  "done",
  "cancelled"
]);

export const DEFAULT_BACKLOG = Object.freeze({
  version: 1,
  updatedAt: null,
  policy: {
    priorities: ["P0", "P1", "P2", "P3", "P4"],
    productionBugsAreP0: true,
    failedReviewCreatesRepairWork: true,
    subscriberReadyBlockedBy: ["P0", "P1", "P2"]
  },
  items: []
});

export function loadBacklog() {
  return readJson(getBacklogPath(), DEFAULT_BACKLOG);
}

export function saveBacklog(backlog) {
  backlog.updatedAt = nowIso();
  writeJson(getBacklogPath(), backlog);
  return backlog;
}

export function createWorkItem({
  title,
  severity,
  area = "general",
  acceptanceCriteria = ["Observable fix verified by Product Board retest"],
  source = "manual",
  notes = "",
  relatedEngineeringId = null,
  status = "ready"
}) {
  assertSeverity(severity);
  return {
    id: null, // filled by addWorkItem
    title,
    severity,
    area,
    status,
    acceptanceCriteria,
    source,
    notes,
    relatedEngineeringId,
    assignedRole: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    failureOrigin: null,
    evidence: [],
    blocksSubscriberReady: blocksSubscriberReady(severity)
  };
}

export function addWorkItem(backlog, partial) {
  const item = createWorkItem(partial);
  item.id = nextId(backlog.items, "WB");
  backlog.items = backlog.items || [];
  backlog.items.push(item);
  return item;
}

export function findItem(backlog, id) {
  return (backlog.items || []).find((i) => i.id === id) || null;
}

export function openBlockingItems(backlog) {
  return (backlog.items || []).filter(
    (i) =>
      i.blocksSubscriberReady &&
      !["done", "cancelled"].includes(i.status)
  );
}

export function prioritizedQueue(backlog) {
  return (backlog.items || [])
    .filter((i) =>
      ["backlog", "ready", "fix", "test", "visual_review", "red_team", "retest", "in_progress"].includes(
        i.status
      )
    )
    .sort((a, b) => {
      const sev = compareSeverity(a.severity, b.severity);
      if (sev !== 0) return sev;
      return String(a.id).localeCompare(String(b.id));
    });
}

/**
 * Import open tasks from recovered Engineering OS backlog (WE-*).
 * Does not duplicate IDs already linked via relatedEngineeringId.
 */
export function syncEngineeringBacklog(backlog) {
  const engPath = path.join(ENG_ROOT, "backlog", "backlog.json");
  if (!fs.existsSync(engPath)) {
    return { imported: 0, skipped: 0 };
  }
  const eng = readJson(engPath);
  const linked = new Set(
    (backlog.items || [])
      .map((i) => i.relatedEngineeringId)
      .filter(Boolean)
  );
  let imported = 0;
  let skipped = 0;
  for (const t of eng.tasks || []) {
    if (["done", "cancelled"].includes(t.status)) {
      skipped += 1;
      continue;
    }
    if (linked.has(t.id)) {
      skipped += 1;
      continue;
    }
    // Engineering historically used P0–P3; map unknown to P3.
    const severity = ["P0", "P1", "P2", "P3", "P4"].includes(t.priority)
      ? t.priority
      : "P3";
    addWorkItem(backlog, {
      title: `[eng] ${t.title}`,
      severity,
      area: t.area || "engineering",
      acceptanceCriteria: t.acceptanceCriteria || ["Engineering task completed"],
      source: "engineering-backlog",
      notes: t.notes || "",
      relatedEngineeringId: t.id,
      status: t.status === "in_progress" ? "in_progress" : "ready"
    });
    imported += 1;
  }
  return { imported, skipped };
}
