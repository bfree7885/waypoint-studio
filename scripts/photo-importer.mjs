#!/usr/bin/env node
/**
 * Waypoint Photo Importer v1.1
 *
 * Copy Sony a6700 media from a mounted SD card into Google Drive/Photography
 * with verification, duplicate skipping, and import logs.
 *
 * Usage:
 *   node scripts/photo-importer.mjs --dry-run
 *   node scripts/photo-importer.mjs --source /media/$USER/CARD --dest "$HOME/Google Drive/Photography"
 *   ./scripts/photo-import --source /media/$USER/CARD
 */
import crypto from "crypto";
import fs from "fs";
import fsp from "fs/promises";
import os from "os";
import path from "path";
import process from "process";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VERSION = "1.1.0";

const PHOTO_EXT = new Set([".arw", ".jpg", ".jpeg"]);
const VIDEO_EXT = new Set([".mp4", ".mov"]);
const SONY_SCAN_DIRS = ["DCIM", "PRIVATE"];

const SYSTEM_PREFIXES = [
  "/bin", "/boot", "/dev", "/etc", "/lib", "/lib64", "/opt", "/proc", "/run/lock",
  "/sbin", "/snap", "/srv", "/sys", "/tmp", "/usr", "/var"
];

function photographyDestCandidates(home) {
  return [
    path.join(home, "Google Drive", "Photography"),
    path.join(home, "GoogleDrive", "Photography"),
    path.join(home, "google-drive", "Photography"),
    path.join(home, "Drive", "Photography"),
    path.join(home, "Google Drive", "My Drive", "Photography"),
    path.join(home, "Google Drive", "My Drive", "Photos"),
    path.join(home, "GoogleDrive", "My Drive", "Photography"),
    path.join(home, "Insync", "Google Drive", "Photography"),
    path.join(home, "Insync", "bryan@waypoint.studio", "Google Drive", "Photography")
  ];
}

function driveRootCandidates(home) {
  return [
    path.join(home, "Google Drive"),
    path.join(home, "GoogleDrive"),
    path.join(home, "google-drive"),
    path.join(home, "Insync", "Google Drive"),
    path.join(home, "Insync")
  ];
}

function printHelp() {
  console.log(`Waypoint Photo Importer v${VERSION}

Copy Sony a6700 media from a mounted SD card into Google Drive/Photography.

Options:
  --dry-run              Scan and report only; do not copy files
  --verbose, -v          Detailed logging
  --source, -s <path>    SD card mount or folder (auto-detect if omitted)
  --dest, -d <path>      Destination root (default: detect Google Drive/Photography)
  --create-dest          Create Photography folder if Google Drive exists (default)
  --no-create-dest       Fail if Photography folder is missing
  --no-video             Skip .mp4 and .mov files
  --no-notify            Skip desktop notification
  --help, -h             Show this help

Examples:
  node scripts/photo-importer.mjs --dry-run
  node scripts/photo-importer.mjs --source /media/$USER/NO\\ NAME --verbose
  ./scripts/photo-import --source /media/$USER/CARDNAME

Safety:
  - Never deletes files on the SD card
  - Never overwrites without checksum verification
  - Skips identical duplicates anywhere under Photography/
  - Refuses system paths and Google Drive as source
`);
}

function parseArgs(argv) {
  const opts = {
    dryRun: false,
    verbose: false,
    includeVideo: true,
    notify: true,
    createDest: true,
    source: null,
    dest: null,
    help: false
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") opts.help = true;
    else if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--verbose" || a === "-v") opts.verbose = true;
    else if (a === "--no-video") opts.includeVideo = false;
    else if (a === "--no-notify") opts.notify = false;
    else if (a === "--create-dest") opts.createDest = true;
    else if (a === "--no-create-dest") opts.createDest = false;
    else if (a === "--source" || a === "-s") opts.source = argv[++i];
    else if (a === "--dest" || a === "-d") opts.dest = argv[++i];
    else throw new Error(`Unknown argument: ${a}`);
  }
  return opts;
}

function logLine(lines, level, message) {
  const ts = new Date().toISOString();
  lines.push(`[${ts}] ${level.toUpperCase()} ${message}`);
}

function vlog(opts, lines, message) {
  if (opts.verbose) logLine(lines, "debug", message);
}

function extOf(filePath) {
  return path.extname(filePath).toLowerCase();
}

function isSupportedFile(filePath, includeVideo) {
  const ext = extOf(filePath);
  if (PHOTO_EXT.has(ext)) return true;
  if (includeVideo && VIDEO_EXT.has(ext)) return true;
  return false;
}

function normalize(p) {
  return path.resolve(p);
}

function isUnder(child, parent) {
  const c = normalize(child);
  const p = normalize(parent);
  return c === p || c.startsWith(p + path.sep);
}

function isSystemPath(p) {
  const resolved = normalize(p);
  if (resolved === "/") return true;
  return SYSTEM_PREFIXES.some((prefix) => resolved === prefix || resolved.startsWith(prefix + path.sep));
}

async function pathExists(p) {
  try {
    await fsp.access(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function isDirectory(p) {
  try {
    const st = await fsp.stat(p);
    return st.isDirectory();
  } catch {
    return false;
  }
}

async function findGoogleDrivePhotographyRoot(explicitDest, createDest) {
  if (explicitDest) {
    const dest = normalize(explicitDest);
    if (!(await pathExists(dest))) {
      if (createDest) {
        await fsp.mkdir(dest, { recursive: true });
        return { ok: true, path: dest, tried: [dest], detected: "explicit-created" };
      }
      return {
        ok: false,
        path: dest,
        tried: [dest],
        message: `Destination does not exist: ${dest}\nCreate it or pass --create-dest / a different --dest path.`
      };
    }
    return { ok: true, path: dest, tried: [dest], detected: "explicit" };
  }

  const home = os.homedir();
  const candidates = photographyDestCandidates(home);
  const tried = [...candidates];

  for (const c of candidates) {
    if (await pathExists(c)) {
      return { ok: true, path: normalize(c), tried, detected: "candidate" };
    }
  }

  const driveRoots = driveRootCandidates(home);
  for (const root of driveRoots) {
    if (!(await isDirectory(root))) continue;
    tried.push(root);
    const entries = await fsp.readdir(root, { withFileTypes: true }).catch(() => []);
    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      const name = ent.name.toLowerCase();
      if (name.includes("photograph") || name === "photos") {
        const found = normalize(path.join(root, ent.name));
        tried.push(found);
        if (await pathExists(found)) {
          return { ok: true, path: found, tried, detected: "scan" };
        }
      }
    }
  }

  if (createDest) {
    for (const root of driveRoots) {
      if (!(await isDirectory(root))) continue;
      const created = normalize(path.join(root, "Photography"));
      tried.push(created);
      try {
        await fsp.mkdir(created, { recursive: true });
        return { ok: true, path: created, tried, detected: "created", created: true };
      } catch {
        /* try next root */
      }
    }
    const fallback = path.join(home, "Google Drive", "Photography");
    tried.push(fallback);
    try {
      await fsp.mkdir(fallback, { recursive: true });
      return { ok: true, path: normalize(fallback), tried, detected: "created-fallback", created: true };
    } catch {
      /* fall through */
    }
  }

  return {
    ok: false,
    path: candidates[0],
    tried,
    message:
      "Could not find a Google Drive Photography folder.\n" +
      "Tried:\n" +
      tried.map((t) => `  - ${t}`).join("\n") +
      "\n\nCreate one, for example:\n" +
      `  mkdir -p "${path.join(home, "Google Drive", "Photography")}"\n` +
      "Or re-run with --create-dest after Google Drive is mounted."
  };
}

async function hasSonyMediaRoot(mountPath) {
  for (const dir of SONY_SCAN_DIRS) {
    const candidate = path.join(mountPath, dir);
    if (await isDirectory(candidate)) return true;
  }
  return false;
}

async function listMediaMounts() {
  const user = os.userInfo().username;
  const bases = [
    path.join("/media", user),
    path.join("/run/media", user)
  ];
  const mounts = [];
  for (const base of bases) {
    if (!(await isDirectory(base))) continue;
    const entries = await fsp.readdir(base, { withFileTypes: true }).catch(() => []);
    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      const mountPath = path.join(base, ent.name);
      if (await hasSonyMediaRoot(mountPath)) mounts.push(mountPath);
    }
  }
  return mounts;
}

function driveGuardPaths(home) {
  return [
    path.join(home, "Google Drive"),
    path.join(home, "GoogleDrive"),
    path.join(home, "google-drive"),
    path.join(home, "Insync")
  ];
}

function validateSourcePath(sourcePath, destRoot, explicit) {
  const src = normalize(sourcePath);
  if (isSystemPath(src)) {
    return { ok: false, message: `Refusing system path as source: ${src}` };
  }
  if (destRoot && isUnder(src, destRoot)) {
    return { ok: false, message: `Refusing source inside destination: ${src}` };
  }
  const home = os.homedir();
  for (const guard of driveGuardPaths(home)) {
    if (isUnder(src, guard)) {
      return { ok: false, message: `Refusing cloud-sync path as source: ${src}` };
    }
  }
  if (!explicit) {
    if (!isUnder(src, path.join("/media", os.userInfo().username)) &&
        !isUnder(src, path.join("/run/media", os.userInfo().username))) {
      return {
        ok: false,
        message:
          `Source does not look like a removable camera mount: ${src}\n` +
          "Expected a mount under /media/$USER/ or /run/media/$USER/.\n" +
          "Pass the mount root explicitly with --source after the card is mounted."
      };
    }
  }
  return { ok: true, path: src };
}

async function walkSonyFiles(sourceRoot, includeVideo) {
  const files = [];
  const root = normalize(sourceRoot);

  async function walkDir(dir) {
    const entries = await fsp.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name.startsWith(".")) continue;
        await walkDir(full);
      } else if (ent.isFile() && isSupportedFile(full, includeVideo)) {
        files.push(full);
      }
    }
  }

  for (const scanDir of SONY_SCAN_DIRS) {
    const scanPath = path.join(root, scanDir);
    if (await isDirectory(scanPath)) await walkDir(scanPath);
  }

  if (!files.length && (root.includes(`${path.sep}DCIM`) || root.includes(`${path.sep}PRIVATE`))) {
    await walkDir(root);
  }

  files.sort();
  return files;
}

function dateFolderForFile(filePath, stats) {
  const d = stats.birthtime && stats.birthtime.getFullYear() > 1980
    ? stats.birthtime
    : stats.mtime;
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return { year: yyyy, day: `${yyyy}-${mm}-${dd}` };
}

async function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function buildDestIndex(destRoot, includeVideo) {
  const index = new Map();
  const root = normalize(destRoot);
  const logDir = path.join(root, "import-logs");

  async function walk(dir) {
    const entries = await fsp.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (full === logDir || ent.name === "import-logs") continue;
        await walk(full);
      } else if (ent.isFile() && isSupportedFile(full, includeVideo)) {
        const base = path.basename(full).toLowerCase();
        const st = await fsp.stat(full);
        const list = index.get(base) || [];
        list.push({ path: full, size: st.size });
        index.set(base, list);
      }
    }
  }

  if (await isDirectory(root)) await walk(root);
  return index;
}

async function findGlobalDuplicate(index, basename, srcSize, srcHash) {
  const key = basename.toLowerCase();
  const candidates = index.get(key) || [];
  for (const c of candidates) {
    if (c.size !== srcSize) continue;
    const hash = c.hash || await sha256File(c.path);
    c.hash = hash;
    if (hash === srcHash) return c.path;
  }
  return null;
}

async function uniqueDestPath(destPath) {
  if (!(await pathExists(destPath))) return destPath;
  const dir = path.dirname(destPath);
  const ext = path.extname(destPath);
  const base = path.basename(destPath, ext);
  for (let i = 1; i < 10000; i++) {
    const candidate = path.join(dir, `${base}_imported_${String(i).padStart(3, "0")}${ext}`);
    if (!(await pathExists(candidate))) return candidate;
  }
  throw new Error(`Could not find unique name for ${destPath}`);
}

async function copyVerified(src, dest, opts, lines) {
  const srcStat = await fsp.stat(src);
  if (opts.dryRun) {
    logLine(lines, "info", `DRY-RUN copy ${src} -> ${dest}`);
    return { status: "copied", src, dest, bytes: srcStat.size, dryRun: true };
  }

  await fsp.mkdir(path.dirname(dest), { recursive: true });
  await fsp.copyFile(src, dest, fs.constants.COPYFILE_EXCL);

  const destStat = await fsp.stat(dest);
  if (destStat.size !== srcStat.size) {
    await fsp.unlink(dest).catch(() => {});
    throw new Error(`Size mismatch after copy: ${src} (${srcStat.size}) -> ${dest} (${destStat.size})`);
  }

  const srcHash = await sha256File(src);
  const destHash = await sha256File(dest);
  if (srcHash !== destHash) {
    await fsp.unlink(dest).catch(() => {});
    throw new Error(`Checksum mismatch after copy: ${src} -> ${dest}`);
  }

  logLine(lines, "info", `COPIED ${path.basename(src)} (${srcStat.size} bytes, sha256 ${srcHash.slice(0, 12)}…)`);
  return { status: "copied", src, dest, bytes: srcStat.size, sha256: srcHash };
}

async function importFile(src, destRoot, opts, lines, destIndex) {
  const srcStat = await fsp.stat(src);
  const basename = path.basename(src);
  const srcHash = await sha256File(src);
  const existing = await findGlobalDuplicate(destIndex, basename, srcStat.size, srcHash);
  if (existing) {
    vlog(opts, lines, `Duplicate skipped (already in library): ${existing}`);
    return { status: "duplicate", src, dest: existing, bytes: srcStat.size, sha256: srcHash };
  }

  const { year, day } = dateFolderForFile(src, srcStat);
  const destDir = path.join(destRoot, year, day);
  let destPath = path.join(destDir, basename);

  if (await pathExists(destPath)) {
    const destStat = await fsp.stat(destPath);
    if (destStat.size === srcStat.size) {
      const destHash = await sha256File(destPath);
      if (destHash === srcHash) {
        vlog(opts, lines, `Duplicate skipped (identical at destination): ${destPath}`);
        return { status: "duplicate", src, dest: destPath, bytes: srcStat.size, sha256: srcHash };
      }
    }
    destPath = await uniqueDestPath(destPath);
    logLine(lines, "warn", `Name collision; using ${destPath}`);
  }

  if (opts.dryRun) {
    logLine(lines, "info", `DRY-RUN would copy ${basename} -> ${destPath}`);
    return { status: "copied", src, dest: destPath, bytes: srcStat.size, dryRun: true };
  }

  try {
    const outcome = await copyVerified(src, destPath, opts, lines);
    const key = basename.toLowerCase();
    const list = destIndex.get(key) || [];
    list.push({ path: destPath, size: srcStat.size, hash: outcome.sha256 });
    destIndex.set(key, list);
    return outcome;
  } catch (err) {
    return { status: "failed", src, dest: destPath, error: err.message || String(err) };
  }
}

function formatDuration(ms) {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${min}m ${rem}s`;
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function buildSummary(result) {
  const lines = [
    "",
    "=== Waypoint Photo Importer Summary ===",
    `Version: ${VERSION}`,
    `Mode: ${result.dryRun ? "DRY-RUN" : "IMPORT"}`,
    `Source: ${result.source || "(none)"}`,
    `Destination root: ${result.destRoot || "(none)"}`,
    `Files found: ${result.found}`,
    `Copied: ${result.copied}`,
    `Duplicates skipped: ${result.duplicates}`,
    `Failures: ${result.failures}`,
    `Bytes copied: ${formatBytes(result.bytesCopied)}`,
    `Elapsed: ${formatDuration(result.elapsedMs)}`,
    `Log file: ${result.logFile || "(not written)"}`
  ];
  if (result.destFolders && result.destFolders.length) {
    lines.push(`Date folders: ${result.destFolders.join(", ")}`);
  }
  if (result.failureDetails.length) {
    lines.push("Failures:");
    result.failureDetails.forEach((f) => lines.push(`  - ${f}`));
  }
  if (result.notes.length) {
    lines.push("Notes:");
    result.notes.forEach((n) => lines.push(`  - ${n}`));
  }
  if (result.dryRun && result.planned && result.planned.length) {
    lines.push("Planned copies (first 10):");
    result.planned.slice(0, 10).forEach((p) => lines.push(`  ${path.basename(p.src)} -> ${p.dest}`));
    if (result.planned.length > 10) {
      lines.push(`  ... and ${result.planned.length - 10} more`);
    }
  }
  return lines.join("\n");
}

async function writeImportLog(destRoot, logLines) {
  const today = new Date();
  const yyyy = String(today.getFullYear());
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const logDir = path.join(destRoot, "import-logs");
  const logFile = path.join(logDir, `${yyyy}-${mm}-${dd}-import.log`);
  await fsp.mkdir(logDir, { recursive: true });
  await fsp.appendFile(logFile, logLines.join("\n") + "\n", "utf8");
  return logFile;
}

function desktopNotify(title, body) {
  const which = spawnSync("which", ["notify-send"], { encoding: "utf8" });
  if (which.status !== 0) return false;
  const res = spawnSync("notify-send", [title, body, "-i", "camera-photo"], { encoding: "utf8" });
  return res.status === 0;
}

async function resolveSource(opts, destRoot, lines) {
  if (opts.source) {
    const check = validateSourcePath(opts.source, destRoot, true);
    if (!check.ok) return { ok: false, message: check.message };
    if (!(await pathExists(check.path))) {
      return { ok: false, message: `Source path does not exist: ${check.path}` };
    }
    if (!(await hasSonyMediaRoot(check.path)) && !check.path.includes("DCIM") && !check.path.includes("PRIVATE")) {
      return {
        ok: false,
        message: `No DCIM or PRIVATE folder found at source: ${check.path}`
      };
    }
    return { ok: true, path: check.path };
  }

  const mounts = await listMediaMounts();
  vlog(opts, lines, `Auto-detected mounts: ${mounts.join(", ") || "(none)"}`);
  if (mounts.length === 1) return { ok: true, path: mounts[0] };
  if (mounts.length > 1) {
    return {
      ok: false,
      message:
        "Multiple camera mounts found. Choose one with --source:\n" +
        mounts.map((m) => `  --source "${m}"`).join("\n")
    };
  }

  return {
    ok: false,
    message:
      "No SD card with DCIM/PRIVATE detected under /media/$USER/.\n\n" +
      "Next steps:\n" +
      "  1. Plug in your Sony a6700 SD card\n" +
      "  2. ls /media/$USER/\n" +
      "  3. node scripts/photo-importer.mjs --dry-run --source /media/$USER/CARDNAME\n" +
      "  4. node scripts/photo-importer.mjs --source /media/$USER/CARDNAME\n\n" +
      "Or use the shortcut:\n" +
      "  ./scripts/photo-import --dry-run --source /media/$USER/CARDNAME"
  };
}

export async function runImporter(argv = process.argv.slice(2)) {
  const started = Date.now();
  const opts = parseArgs(argv);
  if (opts.help) {
    printHelp();
    return { code: 0 };
  }

  const lines = [];
  logLine(lines, "info", `Waypoint Photo Importer v${VERSION} started`);
  if (opts.dryRun) logLine(lines, "info", "DRY-RUN mode — no files will be copied");

  const destResult = await findGoogleDrivePhotographyRoot(opts.dest, opts.createDest);
  if (!destResult.ok) {
    logLine(lines, "error", destResult.message);
    console.error(destResult.message);
    console.error("\nPaths checked:");
    destResult.tried.forEach((t) => console.error(`  - ${t}`));
    return { code: 2, lines };
  }

  const destRoot = destResult.path;
  logLine(lines, "info", `Destination root: ${destRoot} (${destResult.detected})`);
  if (destResult.created) {
    logLine(lines, "info", "Created Photography destination folder");
    console.log(`Created destination: ${destRoot}`);
  }

  const sourceResult = await resolveSource(opts, destRoot, lines);
  if (!sourceResult.ok) {
    logLine(lines, "error", sourceResult.message);
    console.log(sourceResult.message);
    if (opts.dryRun && destRoot) {
      console.log(`\nDestination root resolved: ${destRoot}`);
      console.log("Dry-run complete — plug in SD card and pass --source to scan files.");
    }
    return { code: opts.dryRun ? 0 : 1, lines };
  }

  const source = sourceResult.path;
  logLine(lines, "info", `Source: ${source}`);

  const files = await walkSonyFiles(source, opts.includeVideo);
  logLine(lines, "info", `Files found: ${files.length}`);

  const destIndex = await buildDestIndex(destRoot, opts.includeVideo);
  vlog(opts, lines, `Indexed ${destIndex.size} existing filenames in destination library`);

  const result = {
    dryRun: opts.dryRun,
    source,
    destRoot,
    found: files.length,
    copied: 0,
    duplicates: 0,
    failures: 0,
    bytesCopied: 0,
    failureDetails: [],
    notes: [],
    planned: [],
    destFolders: new Set(),
    elapsedMs: 0,
    logFile: null
  };

  if (!files.length) {
    result.notes.push("No supported files found in DCIM/PRIVATE.");
    result.elapsedMs = Date.now() - started;
    const summary = buildSummary({ ...result, destFolders: [] });
    lines.push(summary);
    console.log(summary);
    if (!opts.dryRun) {
      result.logFile = await writeImportLog(destRoot, lines);
      console.log(`Log written: ${result.logFile}`);
    }
    return { code: 0, lines, result };
  }

  let n = 0;
  for (const file of files) {
    n += 1;
    if (!opts.dryRun && files.length > 3) {
      process.stdout.write(`\rImporting ${n}/${files.length}...`);
    }
    try {
      const outcome = await importFile(file, destRoot, opts, lines, destIndex);
      if (outcome.status === "copied") {
        result.copied += 1;
        result.bytesCopied += outcome.bytes || 0;
        if (outcome.dest) {
          result.planned.push({ src: file, dest: outcome.dest });
          result.destFolders.add(path.dirname(outcome.dest).replace(destRoot + path.sep, ""));
        }
      } else if (outcome.status === "duplicate") {
        result.duplicates += 1;
      } else if (outcome.status === "failed") {
        result.failures += 1;
        result.failureDetails.push(`${file}: ${outcome.error}`);
        logLine(lines, "error", `FAILED ${file}: ${outcome.error}`);
      }
    } catch (err) {
      result.failures += 1;
      const msg = err.message || String(err);
      result.failureDetails.push(`${file}: ${msg}`);
      logLine(lines, "error", `FAILED ${file}: ${msg}`);
    }
  }
  if (!opts.dryRun && files.length > 3) process.stdout.write("\n");

  result.elapsedMs = Date.now() - started;
  const summary = buildSummary({
    ...result,
    destFolders: [...result.destFolders].sort()
  });
  lines.push(summary);
  console.log(summary);

  if (!opts.dryRun) {
    result.logFile = await writeImportLog(destRoot, lines);
    console.log(`Log written: ${result.logFile}`);
    if (opts.notify) {
      const title = result.failures ? "Photo import finished with errors" : "Photo import complete";
      const body = `${result.copied} copied, ${result.duplicates} duplicates skipped, ${result.failures} failed`;
      if (!desktopNotify(title, body)) {
        result.notes.push("notify-send not available; desktop notification skipped");
      }
    }
  }

  return { code: result.failures ? 1 : 0, lines, result };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runImporter().then((out) => process.exit(out.code ?? 0)).catch((err) => {
    console.error(err.stack || err.message || String(err));
    process.exit(1);
  });
}
