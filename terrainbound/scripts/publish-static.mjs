#!/usr/bin/env node
/**
 * Copy canonical TerrainBound static files for GitHub Pages.
 * Does not copy the gateway, tests, docs, or secrets.
 *
 *   node terrainbound/scripts/publish-static.mjs /path/to/terrainbound-site
 */
import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const STATIC_DIRS = ["assets", "css", "data", "js"];
export const STATIC_FILES = ["index.html"];
export const FORBIDDEN = [
  "data/summit/.env",
  "data/summit/.env.save",
  "data/summit/.env.example",
  "server",
  "tests",
  "scripts",
  "docs"
];

const TB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function isForbiddenRel(rel) {
  const n = rel.replace(/\\/g, "/");
  return FORBIDDEN.some((row) => n === row || n.startsWith(row + "/"));
}

export async function publishStatic(dest) {
  if (!dest) throw new Error("publish-static requires a destination directory");
  const out = path.resolve(dest);
  await mkdir(out, { recursive: true });
  for (const file of STATIC_FILES) {
    await cp(path.join(TB, file), path.join(out, file));
  }
  for (const dir of STATIC_DIRS) {
    await cp(path.join(TB, dir), path.join(out, dir), {
      recursive: true,
      filter: (src) => {
        const rel = path.relative(TB, src).replace(/\\/g, "/");
        if (!rel || rel === dir) return true;
        if (rel.endsWith(".env") || rel.endsWith(".env.save") || rel.endsWith(".env.example")) return false;
        return !isForbiddenRel(rel);
      }
    });
  }
  try {
    await rm(path.join(out, "data/summit/.env"), { force: true });
  } catch {
    /* ignore */
  }
  return out;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const dest = process.argv[2];
  if (!dest) {
    console.error("Usage: node terrainbound/scripts/publish-static.mjs <destination-dir>");
    process.exit(1);
  }
  const exists = await stat(dest).catch(() => null);
  if (!exists) await mkdir(dest, { recursive: true });
  await publishStatic(dest);
  console.log(`Published TerrainBound static files to ${path.resolve(dest)}`);
}
