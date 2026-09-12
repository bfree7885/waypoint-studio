#!/usr/bin/env node
/**
 * SignalTerrain V1.2 preparation — promotion gate.
 *
 * GENERATE → REVIEW → PERMISSION CONFIRMED → PROMOTE → REGISTER
 *
 * This increment STOPS AT REVIEW. Product catalogue registration is locked.
 * Redistribution permission is pending; do not copy staged packs into
 * apps/summit-signal/data.
 *
 *   node scripts/signalterrain/promote-sota-summit-packs.mjs \
 *     --from tmp/signalterrain/generated-summit-packs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PERMISSION_NOTE,
  PERMISSION_STATUS,
  PRODUCT_CATALOGUE,
  PRODUCT_DATA_DIR
} from "./lib/sota-summit-csv.mjs";

export const PRODUCT_REGISTRATION_LOCKED = true;

function printHelp() {
  process.stdout.write(
    [
      "SignalTerrain SOTA pack promotion gate",
      "",
      "Current permission status: " + PERMISSION_STATUS,
      PERMISSION_NOTE,
      "",
      "Product registration is LOCKED in this increment.",
      "Staged packs must stay in the staging directory until redistribution",
      "permission is confirmed and a later V1.2 coverage task registers them.",
      "",
      "Usage:",
      "  node scripts/signalterrain/promote-sota-summit-packs.mjs --from <staging-dir>",
      "",
      "Flags (documented for the post-permission step; they do not unlock registration now):",
      "  --from <dir>                 Staging directory from the importer",
      "  --permission-confirmed       Human attestation (not sufficient yet)",
      "  --register                   Would update ss-summit-catalogue.json (locked)",
      "  --to <dir>                   Destination (product data dir is refused)",
      "  --help",
      "",
      "Exact next action after permission: keep using the importer against the",
      "same local CSV, review High Point / PA / NJ packs, then a later task",
      "may unlock registration. Do not scrape. Do not call the SOTA API."
    ].join("\n") + "\n"
  );
}

function parseArgs(argv) {
  const out = {
    from: null,
    to: PRODUCT_DATA_DIR,
    permissionConfirmed: false,
    register: false,
    help: false
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--permission-confirmed") out.permissionConfirmed = true;
    else if (a === "--register") out.register = true;
    else if (a === "--from") out.from = argv[++i];
    else if (a === "--to") out.to = argv[++i];
    else if (a.startsWith("--from=")) out.from = a.slice(7);
    else if (a.startsWith("--to=")) out.to = a.slice(5);
    else throw new Error("Unknown argument: " + a);
  }
  return out;
}

function isProductDest(dir) {
  const resolved = path.resolve(dir);
  const product = path.resolve(PRODUCT_DATA_DIR);
  return resolved === product || resolved.startsWith(product + path.sep);
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(String(e && e.message ? e.message : e) + "\n");
    process.exit(1);
  }
  if (args.help || process.argv.length <= 2) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }
  if (!args.from) {
    process.stderr.write("--from is required (staging directory).\n");
    process.exit(1);
  }

  const fromDir = path.resolve(args.from);
  if (!fs.existsSync(fromDir) || !fs.statSync(fromDir).isDirectory()) {
    process.stderr.write("Staging directory not found: " + fromDir + "\n");
    process.exit(1);
  }

  const message = [
    "PROMOTION REFUSED.",
    "Permission status: " + PERMISSION_STATUS,
    PERMISSION_NOTE,
    "Product registration locked: " + String(PRODUCT_REGISTRATION_LOCKED),
    "Catalogue not modified: " + PRODUCT_CATALOGUE,
    "Requested --register: " + String(args.register),
    "Requested --permission-confirmed: " + String(args.permissionConfirmed),
    "Requested destination: " + path.resolve(args.to),
    "Destination is product data dir: " + String(isProductDest(args.to)),
    "Stop at REVIEW. Do not copy staged packs into the running V1.1 catalogue."
  ].join("\n");

  process.stderr.write(message + "\n");
  process.exit(2);
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
