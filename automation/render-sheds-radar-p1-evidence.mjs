#!/usr/bin/env node
/** Analytical PNG evidence for RADAR P1 (no browser). */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = {
  console,
  window: {},
  globalThis: {},
  atob: (s) => Buffer.from(s, "base64").toString("binary"),
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);
for (const rel of [
  "apps/shed-hunting/js/sheds-habitat-gis.js",
  "apps/shed-hunting/js/sheds-gis-pack.js",
  "apps/shed-hunting/js/sheds-radar-base-landscape.js",
  "apps/shed-hunting/js/sheds-search-priority.js",
  "apps/shed-hunting/js/sheds-search-priority-today.js",
  "apps/shed-hunting/js/sheds-radar-p0.js",
]) {
  vm.runInContext(fs.readFileSync(path.join(root, rel), "utf8"), sandbox, { filename: rel });
}

const R = sandbox.WaypointShedsRadarP0;
const Base = sandbox.WaypointShedsRadarBaseLandscape;
const GisPack = sandbox.WaypointShedsGisPack;
const Model = sandbox.WaypointShedsSearchPriorityToday;
const pack = JSON.parse(
  fs.readFileSync(path.join(root, "apps/shed-hunting/gis/packs/pa-pike-milford-v1.json"), "utf8")
);
GisPack.sample(pack, 41.32, -74.8);
const elevFix = JSON.parse(
  fs.readFileSync(path.join(root, "docs/sheds/samples/radar-p0/elev-fixture-pike-50x50.json"), "utf8")
);
const base = R.buildBaseField({
  pack,
  bounds: elevFix.bounds,
  rows: 50,
  cols: 50,
  cellSizeMApprox: 90,
  BaseLandscape: Base,
  GisPack,
}).field;
const enriched = R.enrichWithTerrain(base, elevFix.elevations, {
  SearchPriority: sandbox.WaypointShedsSearchPriority,
  zoom: 13,
}).field;
const staticG = R.paintStaticBase(base).grid;
const fa = R.applyFrame(enriched, "A", { Model }).grid;
const fb = R.applyFrame(enriched, "B", { Model }).grid;

function colorFor(p) {
  if (p == null || p < 0.08) return [0, 0, 0, 0];
  if (p < 0.34) return [78, 110, 118, Math.round((0.04 + p * 0.28) * 255)];
  if (p < 0.67) return [168, 148, 72, Math.round((0.1 + (p - 0.34) * 0.42) * 255)];
  return [72, 140, 78, Math.round((0.18 + (p - 0.67) * 0.55) * 255)];
}

function paint(grid, scale = 8) {
  const rows = grid.rows;
  const cols = grid.cols;
  const w = cols * scale;
  const h = rows * scale;
  const rgba = Buffer.alloc(w * h * 4);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid.cells[r * cols + c];
      const p = cell && !cell.outsideArea ? cell.priority : 0;
      const [Rr, G, B, A] = colorFor(p);
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const x = c * scale + dx;
          const y = r * scale + dy;
          const i = (y * w + x) * 4;
          rgba[i] = Rr;
          rgba[i + 1] = G;
          rgba[i + 2] = B;
          rgba[i + 3] = A;
        }
      }
    }
  }
  return { w, h, rgba };
}

function diffPaint(a, b, scale = 8) {
  const rows = a.rows;
  const cols = a.cols;
  const w = cols * scale;
  const h = rows * scale;
  const rgba = Buffer.alloc(w * h * 4);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ca = a.cells[r * cols + c];
      const cb = b.cells[r * cols + c];
      const pa = ca && !ca.outsideArea ? ca.priority : 0;
      const pb = cb && !cb.outsideArea ? cb.priority : 0;
      const d = Math.abs(pb - pa);
      const v = Math.min(255, Math.round(d * 255 * 3));
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const x = c * scale + dx;
          const y = r * scale + dy;
          const i = (y * w + x) * 4;
          rgba[i] = v;
          rgba[i + 1] = Math.round(v * 0.4);
          rgba[i + 2] = 0;
          rgba[i + 3] = d > 0.02 ? 200 : 0;
        }
      }
    }
  }
  return { w, h, rgba };
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function writePng(file, { w, h, rgba }) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = zlib.deflateSync(raw);
  fs.writeFileSync(
    file,
    Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))])
  );
}

const out = path.join(root, "docs/sheds/samples/radar-p1");
fs.mkdirSync(out, { recursive: true });
writePng(path.join(out, "static-base.png"), paint(staticG));
writePng(path.join(out, "frame-a-cold.png"), paint(fa));
writePng(path.join(out, "frame-b-thaw.png"), paint(fb));
writePng(path.join(out, "frame-diff-thaw-minus-cold.png"), diffPaint(fa, fb));
writePng(path.join(out, "static-base-390.png"), paint(staticG, 6));
writePng(path.join(out, "static-base-320.png"), paint(staticG, 5));
console.log("wrote", out);
