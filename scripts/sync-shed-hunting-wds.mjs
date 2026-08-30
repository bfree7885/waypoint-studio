#!/usr/bin/env node
/**
 * Copy the small WDS subset Shed Hunting owns (map + dedicated-host artifact).
 * Does not duplicate the full design system.
 *
 * Usage: node scripts/sync-shed-hunting-wds.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEST = path.join(ROOT, "apps/shed-hunting/vendor/wds");

const FILES = [
  ["design-system/css/wds-experience-v2.css", "wds-experience-v2.css"],
  ["design-system/js/platform/wds-origins.js", "wds-origins.js"]
];

fs.mkdirSync(DEST, { recursive: true });
for (const [fromRel, name] of FILES) {
  const from = path.join(ROOT, fromRel);
  const to = path.join(DEST, name);
  fs.copyFileSync(from, to);
  console.log("copied", fromRel, "→", path.relative(ROOT, to));
}
