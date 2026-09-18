#!/usr/bin/env node
/**
 * SignalTerrain V1.2 preparation — generate staged regional packs from a
 * manually supplied official SOTA summit CSV.
 *
 * No network. No product registration. Staging output only.
 *
 *   node scripts/signalterrain/import-sota-summits.mjs \
 *     --input /path/to/summitslist.csv \
 *     --dry-run
 *
 *   node scripts/signalterrain/import-sota-summits.mjs \
 *     --input /path/to/summitslist.csv \
 *     --out tmp/signalterrain/generated-summit-packs \
 *     --region W2/GC \
 *     --association W2
 */
import fs from "node:fs";
import path from "node:path";
import {
  ACQUISITION_METHOD,
  DEFAULT_STAGING_DIR,
  IMPORTER_VERSION,
  PERMISSION_NOTE,
  PERMISSION_STATUS,
  assertNotProductDataDir,
  formatDryRun,
  generatePacks,
  inspectSource,
  isNetworkLikeInput,
  readLocalCsvFile,
  writeGeneratedPacks
} from "./lib/sota-summit-csv.mjs";

function printHelp() {
  const text = [
    "SignalTerrain SOTA static catalogue importer " + IMPORTER_VERSION,
    "",
    "Accepts a local, manually supplied official summit CSV. Does not download.",
    "Does not call the SOTA API. Does not scrape. Does not register packs.",
    "Permission status: " + PERMISSION_STATUS,
    PERMISSION_NOTE,
    "",
    "Usage:",
    "  node scripts/signalterrain/import-sota-summits.mjs --input <file> --dry-run",
    "  node scripts/signalterrain/import-sota-summits.mjs --input <file> --out <dir> --region ASSOC/REGION",
    "",
    "Options:",
    "  --input <path>         Local CSV path (required). Not a URL.",
    "  --out <dir>            Staging directory (default: tmp/signalterrain/generated-summit-packs)",
    "  --dry-run, --list      Inspect only; do not write pack files",
    "  --json                 Machine-readable stdout",
    "  --region ASSOC/REGION  Repeatable. Generate/filter by SOTA region code",
    "  --association CODE     Repeatable. Include every region in an association",
    "  --help                 This message",
    "",
    "Acquisition method: " + ACQUISITION_METHOD,
    "Default output is staging. Product catalogue registration is a separate promotion step",
    "and remains locked until redistribution permission is confirmed."
  ].join("\n");
  process.stdout.write(text + "\n");
}

function parseArgs(argv) {
  const out = {
    input: null,
    out: DEFAULT_STAGING_DIR,
    dryRun: false,
    json: false,
    help: false,
    regions: [],
    associations: []
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--dry-run" || a === "--list") out.dryRun = true;
    else if (a === "--json") out.json = true;
    else if (a === "--input") {
      out.input = argv[++i];
    } else if (a === "--out") {
      out.out = argv[++i];
    } else if (a === "--region") {
      out.regions.push(argv[++i]);
    } else if (a === "--association") {
      out.associations.push(argv[++i]);
    } else if (a.startsWith("--input=")) out.input = a.slice(8);
    else if (a.startsWith("--out=")) out.out = a.slice(6);
    else if (a.startsWith("--region=")) out.regions.push(a.slice(9));
    else if (a.startsWith("--association=")) out.associations.push(a.slice(14));
    else {
      throw new Error("Unknown argument: " + a);
    }
  }
  return out;
}

function fail(message, code) {
  process.stderr.write(message + "\n");
  process.exit(code == null ? 1 : code);
}

function jsonReport(inspection, extra) {
  const payload = {
    ok: inspection.ok,
    dryRun: !!(extra && extra.dryRun),
    importerVersion: IMPORTER_VERSION,
    permissionStatus: PERMISSION_STATUS,
    licenseNote: PERMISSION_NOTE,
    source: inspection.file,
    titleLine: inspection.titleLine,
    headers: {
      raw: inspection.headers.raw,
      mapped: inspection.headers.mapped,
      unknown: inspection.headers.unknown,
      missing: inspection.headers.missing
    },
    totals: inspection.totals,
    associations: inspection.associations,
    regions: inspection.regions,
    samples: inspection.samples,
    invalid: inspection.invalid,
    duplicates: inspection.duplicates,
    errors: inspection.errors,
    generated: extra && extra.generated ? extra.generated : null,
    written: extra && extra.written ? extra.written : null
  };
  return JSON.stringify(payload, null, 2);
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    fail(String(e && e.message ? e.message : e));
    return;
  }
  if (args.help || process.argv.length <= 2) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }
  if (!args.input) fail("--input is required (local file path).");
  if (isNetworkLikeInput(args.input)) {
    fail("Refusing network/URL input. Supply a local file path to a manually provided CSV.", 2);
  }

  let loaded;
  try {
    loaded = readLocalCsvFile(args.input);
  } catch (e) {
    fail(String(e && e.message ? e.message : e), 2);
    return;
  }

  const inspection = inspectSource(loaded.text, loaded.file);
  if (args.dryRun) {
    if (args.json) process.stdout.write(jsonReport(inspection, { dryRun: true }) + "\n");
    else process.stdout.write(formatDryRun(inspection) + "\n");
    process.exit(inspection.ok ? 0 : 1);
  }

  if (!args.regions.length && !args.associations.length) {
    fail("Generation requires --region ASSOC/REGION and/or --association CODE. Use --dry-run to list regions first.");
  }

  try {
    assertNotProductDataDir(args.out);
  } catch (e) {
    fail(String(e && e.message ? e.message : e), 2);
    return;
  }

  let generated;
  try {
    generated = generatePacks(inspection, {
      regions: args.regions,
      associations: args.associations
    });
  } catch (e) {
    if (args.json) {
      process.stdout.write(
        jsonReport(inspection, { dryRun: false, generated: null }) + "\n"
      );
    }
    fail(String(e && e.message ? e.message : e));
    return;
  }

  const written = writeGeneratedPacks(generated, path.resolve(args.out), inspection);
  if (args.json) {
    process.stdout.write(
      jsonReport(inspection, {
        dryRun: false,
        generated: generated.packs.map(function (p) {
          return { id: p.id, filename: p.filename, summitCount: p.payload.summits.length };
        }),
        written: written.written
      }) + "\n"
    );
  } else {
    process.stdout.write(
      "Wrote " +
        written.written.length +
        " staged pack(s) to " +
        path.resolve(args.out) +
        "\nPermission: " +
        PERMISSION_STATUS +
        " — packs are NOT registered with the product catalogue.\nReport: " +
        written.reportPath +
        "\n"
    );
    for (const w of written.written) {
      process.stdout.write("  " + w.filename + " (" + w.id + ", " + w.summitCount + " summits)\n");
    }
  }
}

main().catch(function (err) {
  fail(String(err && err.stack ? err.stack : err));
});
