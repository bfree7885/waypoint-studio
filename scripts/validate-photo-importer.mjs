#!/usr/bin/env node
/**
 * Validate Waypoint Photo Importer — syntax check and dry-run smoke.
 */
import { spawnSync } from "child_process";
import fs from "fs";
import fsp from "fs/promises";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { runImporter } from "./photo-importer.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMPORTER = path.join(__dirname, "photo-importer.mjs");
const issues = [];

function check(name, ok, detail) {
  if (!ok) issues.push(`${name}: ${detail}`);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

const syntax = spawnSync(process.execPath, ["--check", IMPORTER], { encoding: "utf8" });
check("syntax", syntax.status === 0, syntax.stderr?.trim());

const help = spawnSync(process.execPath, [IMPORTER, "--help"], { encoding: "utf8" });
check("help", help.status === 0 && help.stdout.includes("dry-run"));

const tmpRoot = await fsp.mkdtemp(path.join(os.homedir(), ".waypoint-photo-importer-"));
const fakeCard = path.join(tmpRoot, "fake-card");
const fakeDcim = path.join(fakeCard, "DCIM", "100MSDCF");
await fsp.mkdir(fakeDcim, { recursive: true });
await fsp.writeFile(path.join(fakeDcim, "DSC00001.JPG"), Buffer.from("waypoint-test-jpeg"));
await fsp.writeFile(path.join(fakeDcim, "DSC00002.ARW"), Buffer.from("waypoint-test-raw"));

const destRoot = path.join(tmpRoot, "Photography");
await fsp.mkdir(destRoot, { recursive: true });

const dryNoCard = await runImporter(["--dry-run", "--dest", destRoot]);
check("dry-run no card", dryNoCard.code === 0, `exit ${dryNoCard.code}`);

const dryScan = await runImporter(["--dry-run", "--dest", destRoot, "--source", fakeCard, "--verbose"]);
check(
  "dry-run scan",
  dryScan.code === 0 && dryScan.result && dryScan.result.found === 2,
  `found=${dryScan.result?.found}`
);

const realImport = await runImporter(["--dest", destRoot, "--source", fakeCard, "--no-notify"]);
check(
  "import copy",
  realImport.code === 0 && realImport.result && realImport.result.copied === 2,
  `copied=${realImport.result?.copied}`
);

const dupe = await runImporter(["--dest", destRoot, "--source", fakeCard, "--no-notify"]);
check(
  "duplicate skip",
  dupe.code === 0 && dupe.result && dupe.result.duplicates === 2 && dupe.result.copied === 0,
  `duplicates=${dupe.result?.duplicates}`
);

await fsp.rm(tmpRoot, { recursive: true, force: true });

if (issues.length) {
  console.error("\nVALIDATION FAILED");
  issues.forEach((i) => console.error(" -", i));
  process.exit(1);
}
console.log("\nPHOTO IMPORTER VALIDATION: PASS");
