/**
 * Offline SOTA summitslist.csv parser and pack builder.
 *
 * Accepts a manually supplied local file only. Performs no network I/O.
 * Does not register packs with the SignalTerrain product catalogue.
 *
 * Official static lists are typically titled "SOTA Summits List (Date=…)"
 * followed by a header row. Columns are mapped by name, not position.
 * Association/region *codes* are taken from dedicated columns when present,
 * otherwise parsed from SummitCode (ASSOC/REGION-NNN).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const IMPORTER_VERSION = "0.1.0";
export const SOURCE_TYPE = "official-static-summit-list";
export const SOURCE_DATASET = "summitslist.csv";
export const ACQUISITION_METHOD = "manual user-supplied file";
export const PERMISSION_STATUS = "pending";
export const PERMISSION_NOTE =
  "Usage/redistribution permission pending confirmation. Summit records originate from Summits on the Air (SOTA). SignalTerrain is an independent application and is not affiliated with or endorsed by Summits on the Air (SOTA). Do not assume a licence for redistribution or public-app use.";

export const MAX_FIELD_CHARS = 2048;
export const MAX_ROWS = 500000;
export const COORD_EPS = 0.00015;
export const SUMMIT_REF_RE = /^([A-Z0-9]{1,6})\/([A-Z0-9]{1,4})-(\d{3})$/i;
export const REGION_FILTER_RE = /^([A-Z0-9]{1,6})\/([A-Z0-9]{1,4})$/i;
export const ASSOCIATION_FILTER_RE = /^[A-Z0-9]{1,6}$/i;

const LIB_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(LIB_DIR, "../../..");
export const DEFAULT_STAGING_DIR = path.join(REPO_ROOT, "tmp/signalterrain/generated-summit-packs");
export const PRODUCT_DATA_DIR = path.join(REPO_ROOT, "apps/summit-signal/data");
export const PRODUCT_CATALOGUE = path.join(PRODUCT_DATA_DIR, "ss-summit-catalogue.json");

/** Canonical field → accepted header names (normalized: lowercase, no spaces/_). */
export const HEADER_ALIASES = {
  summitCode: ["summitcode", "summit_code", "reference", "summitref", "summitreference", "code"],
  associationName: ["associationname", "association_name", "association"],
  associationCode: ["associationcode", "association_code", "associationid", "association_id"],
  regionName: ["regionname", "region_name", "region"],
  regionCode: ["regioncode", "region_code", "regionid", "region_id"],
  name: ["summitname", "summit_name", "name"],
  latitude: ["latitude", "lat"],
  longitude: ["longitude", "lng", "long", "lon"],
  altM: ["altm", "altitude_m", "elevationm", "elevation_m", "alt_m", "ele"],
  altFt: ["altft", "altitude_ft", "elevationft", "elevation_ft", "alt_ft"],
  points: ["points"],
  bonusPoints: ["bonuspoints", "bonus_points", "seasonalbonus"],
  validFrom: ["validfrom", "valid_from"],
  validTo: ["validto", "valid_to"],
  valid: ["valid", "status"],
  activationCount: ["activationcount", "activation_count"],
  activationDate: ["activationdate", "activation_date"],
  activationCall: ["activationcall", "activation_call"],
  locator: ["locator", "maidenhead"],
  gridRef1: ["gridref1", "grid_ref_1"],
  gridRef2: ["gridref2", "grid_ref_2"]
};

const REQUIRED_MAPPED = ["summitCode", "latitude", "longitude"];

export function normalizeHeaderName(raw) {
  return String(raw || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-]+/g, "");
}

export function hashBuffer(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export function isNetworkLikeInput(value) {
  const s = String(value || "").trim();
  if (!s) return false;
  if (/^(https?|ftp|file):\/\//i.test(s)) return true;
  if (/^\/\//.test(s)) return true;
  return false;
}

export function sanitizeReportString(value) {
  const s = String(value == null ? "" : value);
  if (/^[=+\-@\t\r]/.test(s)) return "'" + s;
  return s;
}

export function parseCsv(text) {
  const src = String(text || "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  while (i < src.length) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (c === "\n") {
      if (field.endsWith("\r")) field = field.slice(0, -1);
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }
  if (inQuotes) {
    throw new Error("Malformed CSV: unterminated quoted field.");
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function mapHeaders(headerCells) {
  const mapped = {};
  const unknown = [];
  const raw = [];
  for (let i = 0; i < headerCells.length; i += 1) {
    const original = String(headerCells[i] == null ? "" : headerCells[i]);
    const norm = normalizeHeaderName(original);
    raw.push(original);
    let hit = null;
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(norm)) {
        hit = field;
        break;
      }
    }
    if (hit) {
      if (mapped[hit] == null) mapped[hit] = i;
    } else if (norm) {
      unknown.push(original);
    }
  }
  const missing = REQUIRED_MAPPED.filter((f) => mapped[f] == null);
  return { mapped, unknown, raw, missing, ok: missing.length === 0 };
}

function looksLikeHeader(cells) {
  const mapped = mapHeaders(cells);
  return mapped.ok;
}

export function splitPreambleAndHeader(rows) {
  for (let i = 0; i < Math.min(rows.length, 12); i += 1) {
    const cells = rows[i] || [];
    const first = String(cells[0] || "").trim();
    if (!first) continue;
    if (looksLikeHeader(cells)) {
      return {
        titleLine: i > 0 ? String((rows[0] || [])[0] || "").trim() : null,
        headerIndex: i,
        header: cells,
        mapping: mapHeaders(cells)
      };
    }
  }
  return {
    titleLine: rows[0] ? String(rows[0][0] || "").trim() : null,
    headerIndex: -1,
    header: null,
    mapping: { mapped: {}, unknown: [], raw: [], missing: REQUIRED_MAPPED.slice(), ok: false }
  };
}

export function parseSummitRef(ref) {
  const t = String(ref || "").trim();
  const m = SUMMIT_REF_RE.exec(t);
  if (!m) return null;
  return {
    reference: m[1].toUpperCase() + "/" + m[2].toUpperCase() + "-" + m[3],
    associationCode: m[1].toUpperCase(),
    regionCode: m[2].toUpperCase(),
    number: m[3]
  };
}

function cell(row, mapping, field) {
  const idx = mapping.mapped[field];
  if (idx == null || idx >= row.length) return "";
  return String(row[idx] == null ? "" : row[idx]).trim();
}

function asNumber(value) {
  if (value == null || value === "") return { ok: true, value: null, present: false };
  const t = String(value).trim();
  if (!t) return { ok: true, value: null, present: false };
  if (!/^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(t)) {
    return { ok: false, value: null, present: true, raw: t };
  }
  const n = Number(t);
  if (!Number.isFinite(n)) return { ok: false, value: null, present: true, raw: t };
  return { ok: true, value: n, present: true };
}

function parseValidFlag(raw, validFrom, validTo) {
  const t = String(raw || "").trim().toLowerCase();
  if (t === "true" || t === "1" || t === "valid" || t === "yes") return true;
  if (t === "false" || t === "0" || t === "invalid" || t === "no" || t === "expired") return false;
  const to = parseLooseDate(validTo);
  const from = parseLooseDate(validFrom);
  if (!to && !from) return null;
  const now = Date.now();
  if (from && from.getTime() > now) return false;
  if (to && to.getTime() < now) return false;
  return true;
}

function parseLooseDate(raw) {
  const t = String(raw || "").trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
    const iso = Date.parse(t);
    if (!Number.isNaN(iso)) return new Date(iso);
  }
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    const y = Number(m[3]);
    /* Official summitslist.csv dates are typically dd/mm/yyyy. Stored raw; this is only for valid/expired. */
    return new Date(Date.UTC(y, mo - 1, d));
  }
  const iso = Date.parse(t);
  if (!Number.isNaN(iso)) return new Date(iso);
  return null;
}

function problem(rowNumber, field, message, extra) {
  return Object.assign({ row: rowNumber, field: field, problem: message }, extra || {});
}

export function rowToCandidate(row, mapping, rowNumber) {
  const issues = [];
  for (let i = 0; i < row.length; i += 1) {
    const v = String(row[i] == null ? "" : row[i]);
    if (v.length > MAX_FIELD_CHARS) {
      issues.push(problem(rowNumber, mapping.raw[i] || "column", "Field exceeds " + MAX_FIELD_CHARS + " characters."));
    }
  }
  const rawRef = cell(row, mapping, "summitCode");
  if (!rawRef) issues.push(problem(rowNumber, "summitCode", "Summit reference is empty."));
  const parsedRef = parseSummitRef(rawRef);
  if (rawRef && !parsedRef) {
    issues.push(problem(rowNumber, "summitCode", "Summit reference format is invalid.", { value: rawRef }));
  }

  const latRaw = cell(row, mapping, "latitude");
  const lngRaw = cell(row, mapping, "longitude");
  const latN = asNumber(latRaw);
  const lngN = asNumber(lngRaw);
  if (!latN.ok) issues.push(problem(rowNumber, "latitude", "Latitude is not numeric.", { value: latRaw }));
  else if (!latN.present) issues.push(problem(rowNumber, "latitude", "Latitude is empty."));
  else if (latN.value < -90 || latN.value > 90) {
    issues.push(problem(rowNumber, "latitude", "Latitude is out of range.", { value: latRaw }));
  }
  if (!lngN.ok) issues.push(problem(rowNumber, "longitude", "Longitude is not numeric.", { value: lngRaw }));
  else if (!lngN.present) issues.push(problem(rowNumber, "longitude", "Longitude is empty."));
  else if (lngN.value < -180 || lngN.value > 180) {
    issues.push(problem(rowNumber, "longitude", "Longitude is out of range.", { value: lngRaw }));
  }

  const pointsRaw = cell(row, mapping, "points");
  const pointsN = asNumber(pointsRaw);
  if (pointsN.present && !pointsN.ok) {
    issues.push(problem(rowNumber, "points", "Points is not numeric.", { value: pointsRaw }));
  }

  const altMRaw = cell(row, mapping, "altM");
  const altFtRaw = cell(row, mapping, "altFt");
  const altMN = asNumber(altMRaw);
  const altFtN = asNumber(altFtRaw);
  if (altMN.present && !altMN.ok) {
    issues.push(problem(rowNumber, "altM", "Elevation (m) is not numeric.", { value: altMRaw }));
  }
  if (altFtN.present && !altFtN.ok) {
    issues.push(problem(rowNumber, "altFt", "Elevation (ft) is not numeric.", { value: altFtRaw }));
  }
  if (!altMN.present && !altFtN.present) {
    issues.push(problem(rowNumber, "elevation", "Elevation is missing (need AltM and/or AltFt)."));
  }

  const assocName = cell(row, mapping, "associationName") || null;
  const regionName = cell(row, mapping, "regionName") || null;
  let associationCode = cell(row, mapping, "associationCode").toUpperCase() || (parsedRef && parsedRef.associationCode) || null;
  let regionCode = cell(row, mapping, "regionCode").toUpperCase() || (parsedRef && parsedRef.regionCode) || null;
  if (!associationCode) issues.push(problem(rowNumber, "association", "Association code is missing and could not be parsed from the summit reference."));
  if (!regionCode) issues.push(problem(rowNumber, "region", "Region code is missing and could not be parsed from the summit reference."));

  const name = cell(row, mapping, "name") || null;
  const validFrom = cell(row, mapping, "validFrom") || null;
  const validTo = cell(row, mapping, "validTo") || null;
  const validRaw = cell(row, mapping, "valid");
  const bonusN = asNumber(cell(row, mapping, "bonusPoints"));
  const actCountN = asNumber(cell(row, mapping, "activationCount"));

  const record = {
    sourceRow: rowNumber,
    summitCode: parsedRef ? parsedRef.reference : rawRef || null,
    name: name,
    associationCode: associationCode,
    associationName: assocName,
    regionCode: regionCode,
    regionName: regionName,
    latitude: latN.ok ? latN.value : null,
    longitude: lngN.ok ? lngN.value : null,
    points: pointsN.ok ? pointsN.value : null,
    altM: altMN.ok ? altMN.value : null,
    altFt: altFtN.ok ? altFtN.value : null,
    bonusPoints: bonusN.ok ? bonusN.value : null,
    validFrom: validFrom,
    validTo: validTo,
    valid: parseValidFlag(validRaw, validFrom, validTo),
    activationCount: actCountN.ok ? actCountN.value : null,
    activationDate: cell(row, mapping, "activationDate") || null,
    activationCall: cell(row, mapping, "activationCall") || null,
    locator: cell(row, mapping, "locator") || null,
    gridRef1: cell(row, mapping, "gridRef1") || null,
    gridRef2: cell(row, mapping, "gridRef2") || null
  };

  return { ok: issues.length === 0, issues: issues, record: record };
}

function coordsClose(a, b) {
  if (a == null || b == null) return a == null && b == null;
  return Math.abs(a - b) <= COORD_EPS;
}

function valuesEqual(a, b, numeric) {
  if (numeric) return coordsClose(a, b);
  const sa = a == null || a === "" ? null : String(a);
  const sb = b == null || b === "" ? null : String(b);
  return sa === sb;
}

const MATERIAL_FIELDS = [
  ["name", false],
  ["associationCode", false],
  ["regionCode", false],
  ["associationName", false],
  ["regionName", false],
  ["latitude", true],
  ["longitude", true],
  ["altM", true],
  ["altFt", true],
  ["points", true]
];

export function recordsAgree(a, b) {
  for (const [field, numeric] of MATERIAL_FIELDS) {
    if (!valuesEqual(a[field], b[field], numeric)) return false;
  }
  return true;
}

export function conflictingFields(a, b) {
  const out = [];
  for (const [field, numeric] of MATERIAL_FIELDS) {
    if (!valuesEqual(a[field], b[field], numeric)) out.push(field);
  }
  return out;
}

export function regionKey(associationCode, regionCode) {
  return String(associationCode || "") + "/" + String(regionCode || "");
}

export function parseRegionFilter(value) {
  const t = String(value || "").trim().toUpperCase();
  const m = REGION_FILTER_RE.exec(t);
  if (!m) return null;
  return { associationCode: m[1], regionCode: m[2], key: m[1] + "/" + m[2] };
}

function emptyRow(row) {
  if (!row || !row.length) return true;
  return row.every((c) => String(c == null ? "" : c).trim() === "");
}

export function inspectSource(text, fileMeta) {
  const rows = parseCsv(text);
  if (rows.length > MAX_ROWS + 12) {
    throw new Error("CSV has more than " + MAX_ROWS + " data rows.");
  }
  const split = splitPreambleAndHeader(rows);
  if (!split.mapping.ok) {
    return {
      ok: false,
      fatal: true,
      errors: [
        "CSV header could not be mapped. Need summit reference, latitude, and longitude columns by name. Missing: " +
          split.mapping.missing.join(", ")
      ],
      titleLine: split.titleLine,
      headers: split.mapping,
      totals: { sourceRecords: 0, valid: 0, invalid: 0, exactDuplicatesRemoved: 0, associations: 0, regions: 0 },
      associations: [],
      regions: [],
      samples: [],
      invalid: [],
      duplicates: { exact: [], conflicts: [] },
      records: [],
      file: fileMeta || null
    };
  }

  const invalid = [];
  const byRef = new Map();
  const exact = [];
  const conflicts = [];
  let sourceRecords = 0;

  for (let i = split.headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (emptyRow(row)) continue;
    sourceRecords += 1;
    const rowNumber = i + 1;
    const cand = rowToCandidate(row, split.mapping, rowNumber);
    if (!cand.ok) {
      invalid.push.apply(invalid, cand.issues);
      continue;
    }
    const rec = cand.record;
    const key = rec.summitCode;
    const prev = byRef.get(key);
    if (!prev) {
      byRef.set(key, rec);
      continue;
    }
    if (recordsAgree(prev, rec)) {
      exact.push({ reference: key, sourceRows: [prev.sourceRow, rec.sourceRow] });
      continue;
    }
    conflicts.push({
      reference: key,
      sourceRows: [prev.sourceRow, rec.sourceRow],
      conflictingFields: conflictingFields(prev, rec)
    });
  }

  const records = Array.from(byRef.values()).sort(function (a, b) {
    return a.summitCode < b.summitCode ? -1 : a.summitCode > b.summitCode ? 1 : 0;
  });

  const assocMap = new Map();
  const regionMap = new Map();
  for (const rec of records) {
    const aKey = rec.associationCode;
    if (!assocMap.has(aKey)) {
      assocMap.set(aKey, { code: aKey, name: rec.associationName, count: 0, regions: new Set() });
    }
    const assoc = assocMap.get(aKey);
    assoc.count += 1;
    if (!assoc.name && rec.associationName) assoc.name = rec.associationName;
    assoc.regions.add(rec.regionCode);

    const rKey = regionKey(rec.associationCode, rec.regionCode);
    if (!regionMap.has(rKey)) {
      regionMap.set(rKey, {
        associationCode: rec.associationCode,
        associationName: rec.associationName,
        regionCode: rec.regionCode,
        regionName: rec.regionName,
        count: 0,
        key: rKey
      });
    }
    const region = regionMap.get(rKey);
    region.count += 1;
    if (!region.regionName && rec.regionName) region.regionName = rec.regionName;
  }

  const associations = Array.from(assocMap.values())
    .map(function (a) {
      return {
        code: a.code,
        name: a.name,
        count: a.count,
        regions: Array.from(a.regions).sort()
      };
    })
    .sort(function (a, b) {
      return a.code < b.code ? -1 : 1;
    });
  const regions = Array.from(regionMap.values()).sort(function (a, b) {
    return a.key < b.key ? -1 : 1;
  });

  const samples = [];
  for (const region of regions) {
    if (samples.length >= 8) break;
    const hit = records.find(function (r) {
      return r.associationCode === region.associationCode && r.regionCode === region.regionCode;
    });
    if (hit) samples.push(sampleRecord(hit));
  }

  const ok = conflicts.length === 0 && split.mapping.ok;
  return {
    ok: ok,
    fatal: false,
    errors: conflicts.length
      ? conflicts.map(function (c) {
          return (
            "Conflicting duplicate " +
            c.reference +
            " (rows " +
            c.sourceRows.join(", ") +
            "; fields " +
            c.conflictingFields.join(", ") +
            ")"
          );
        })
      : [],
    titleLine: split.titleLine,
    headers: split.mapping,
    totals: {
      sourceRecords: sourceRecords,
      valid: records.length,
      invalid: invalid.length,
      exactDuplicatesRemoved: exact.length,
      associations: associations.length,
      regions: regions.length
    },
    associations: associations,
    regions: regions,
    samples: samples,
    invalid: invalid,
    duplicates: { exact: exact, conflicts: conflicts },
    records: records,
    file: fileMeta || null
  };
}

function sampleRecord(rec) {
  return {
    summitCode: rec.summitCode,
    name: rec.name,
    associationCode: rec.associationCode,
    associationName: rec.associationName,
    regionCode: rec.regionCode,
    regionName: rec.regionName,
    latitude: rec.latitude,
    longitude: rec.longitude,
    altM: rec.altM,
    altFt: rec.altFt,
    points: rec.points,
    sourceRow: rec.sourceRow
  };
}

function filterRecords(records, options) {
  const opts = options || {};
  const regionKeys = new Set();
  const assocSet = new Set();
  const regionFilters = Array.isArray(opts.regions) ? opts.regions : [];
  const assocFilters = Array.isArray(opts.associations) ? opts.associations : [];
  for (const r of regionFilters) {
    const parsed = parseRegionFilter(r);
    if (!parsed) throw new Error("Invalid --region value '" + r + "'. Use ASSOC/REGION (example W2/GC).");
    regionKeys.add(parsed.key);
  }
  for (const a of assocFilters) {
    const t = String(a || "").trim().toUpperCase();
    if (!ASSOCIATION_FILTER_RE.test(t)) throw new Error("Invalid --association value '" + a + "'.");
    assocSet.add(t);
  }
  if (!regionKeys.size && !assocSet.size) {
    return { records: records.slice(), selectedRegionKeys: null, selectedAssociations: [] };
  }
  const out = records.filter(function (rec) {
    const key = regionKey(rec.associationCode, rec.regionCode);
    if (regionKeys.has(key)) return true;
    if (assocSet.has(rec.associationCode)) return true;
    return false;
  });
  return {
    records: out,
    selectedRegionKeys: regionKeys.size ? Array.from(regionKeys).sort() : null,
    selectedAssociations: Array.from(assocSet).sort()
  };
}

function boundsFrom(summits) {
  let minLat = null;
  let maxLat = null;
  let minLng = null;
  let maxLng = null;
  for (const s of summits) {
    if (minLat == null) {
      minLat = maxLat = s.latitude;
      minLng = maxLng = s.longitude;
    } else {
      if (s.latitude < minLat) minLat = s.latitude;
      if (s.latitude > maxLat) maxLat = s.latitude;
      if (s.longitude < minLng) minLng = s.longitude;
      if (s.longitude > maxLng) maxLng = s.longitude;
    }
  }
  if (minLat == null) return null;
  return { minLat: minLat, minLng: minLng, maxLat: maxLat, maxLng: maxLng };
}

function packFileName(associationCode, regionCode) {
  return "ss-summits-" + associationCode.toLowerCase() + "-" + regionCode.toLowerCase() + ".json";
}

function packIdOf(associationCode, regionCode) {
  return associationCode + "-" + regionCode;
}

export function buildPack(records, provenanceBase, associationCode, regionCode) {
  const list = records
    .filter(function (r) {
      return r.associationCode === associationCode && r.regionCode === regionCode;
    })
    .sort(function (a, b) {
      return a.summitCode < b.summitCode ? -1 : 1;
    });
  if (!list.length) {
    throw new Error("No valid records for region " + associationCode + "/" + regionCode + ".");
  }
  const first = list[0];
  const bounds = boundsFrom(list);
  const preparedAt = provenanceBase.preparedAt;
  const sourceFilename = provenanceBase.sourceFilename;
  const packId = packIdOf(associationCode, regionCode);
  const summits = list.map(function (r) {
    const row = {
      summitCode: r.summitCode,
      name: r.name,
      associationCode: r.associationCode,
      associationName: r.associationName,
      regionCode: r.regionCode,
      regionName: r.regionName,
      validFrom: r.validFrom || null,
      validTo: r.validTo || null,
      valid: r.valid,
      longitude: r.longitude,
      latitude: r.latitude,
      points: r.points,
      altM: r.altM,
      altFt: r.altFt,
      activationCount: r.activationCount,
      activationDate: r.activationDate || null,
      activationCall: r.activationCall || null,
      locator: r.locator || null,
      retrievedFrom: sourceFilename,
      retrievedAt: preparedAt,
      sourceRow: r.sourceRow
    };
    if (r.bonusPoints != null) row.bonusPoints = r.bonusPoints;
    if (r.gridRef1) row.gridRef1 = r.gridRef1;
    if (r.gridRef2) row.gridRef2 = r.gridRef2;
    return row;
  });
  const region = {
    associationCode: associationCode,
    associationName: first.associationName,
    regionCode: regionCode,
    regionName: first.regionName,
    summitCount: summits.length
  };
  if (bounds) {
    region.maxLat = bounds.maxLat;
    region.maxLng = bounds.maxLng;
    region.minLat = bounds.minLat;
    region.minLng = bounds.minLng;
  }
  return {
    source: {
      provider: "sota-static-summitslist-csv",
      sourceType: SOURCE_TYPE,
      sourceDataset: SOURCE_DATASET,
      sourceFilename: sourceFilename,
      sourceAcquisitionMethod: ACQUISITION_METHOD,
      sourceHashSha256: provenanceBase.sourceHashSha256,
      retrievedAt: preparedAt,
      importerVersion: IMPORTER_VERSION,
      recordCount: summits.length,
      packId: packId,
      associationCode: associationCode,
      regionCode: regionCode,
      label: (first.regionName || regionCode) + " (" + associationCode + "/" + regionCode + ")",
      developmentFixture: true,
      permissionStatus: PERMISSION_STATUS,
      licenseNote: PERMISSION_NOTE,
      registeredWithProduct: false
    },
    region: region,
    summits: summits
  };
}

export function generatePacks(inspection, options) {
  if (!inspection || inspection.fatal) {
    throw new Error((inspection && inspection.errors && inspection.errors[0]) || "CSV inspection failed.");
  }
  if (inspection.duplicates.conflicts.length) {
    const err = new Error("Conflicting duplicate summit references. Generation refused.");
    err.conflicts = inspection.duplicates.conflicts;
    throw err;
  }
  const filtered = filterRecords(inspection.records, options);
  if (!filtered.records.length) {
    throw new Error("No matching summit records for the requested association/region filter.");
  }
  const groups = new Map();
  for (const rec of filtered.records) {
    const key = regionKey(rec.associationCode, rec.regionCode);
    if (!groups.has(key)) groups.set(key, rec);
  }
  const provenanceBase = {
    preparedAt: (options && options.preparedAt) || new Date().toISOString(),
    sourceFilename: inspection.file && inspection.file.filename ? inspection.file.filename : SOURCE_DATASET,
    sourceHashSha256: inspection.file && inspection.file.sha256
  };
  const packs = [];
  const keys = Array.from(groups.keys()).sort();
  for (const key of keys) {
    const [associationCode, regionCode] = key.split("/");
    const pack = buildPack(filtered.records, provenanceBase, associationCode, regionCode);
    packs.push({
      id: pack.source.packId,
      regionKey: key,
      filename: packFileName(associationCode, regionCode),
      payload: pack
    });
  }
  return {
    packs: packs,
    selectedRegionKeys: filtered.selectedRegionKeys,
    selectedAssociations: filtered.selectedAssociations,
    provenanceBase: provenanceBase
  };
}

export function assertNotProductDataDir(outDir) {
  const resolved = path.resolve(outDir);
  const product = path.resolve(PRODUCT_DATA_DIR);
  if (resolved === product || resolved.startsWith(product + path.sep)) {
    throw new Error(
      "Refusing to write generated packs into the product catalogue directory (" +
        product +
        "). Use a staging directory and the promotion gate after redistribution permission is confirmed."
    );
  }
}

export function writeGeneratedPacks(generated, outDir, inspection) {
  assertNotProductDataDir(outDir);
  fs.mkdirSync(outDir, { recursive: true });
  const written = [];
  for (const pack of generated.packs) {
    const dest = path.join(outDir, pack.filename);
    const base = path.basename(pack.filename);
    if (base !== pack.filename || pack.filename.includes("..") || pack.filename.includes(path.sep)) {
      throw new Error("Unsafe pack filename: " + pack.filename);
    }
    fs.writeFileSync(dest, JSON.stringify(pack.payload, null, 2) + "\n", "utf8");
    written.push({ id: pack.id, filename: pack.filename, path: dest, summitCount: pack.payload.summits.length });
  }
  const report = {
    importerVersion: IMPORTER_VERSION,
    preparedAt: generated.provenanceBase.preparedAt,
    permissionStatus: PERMISSION_STATUS,
    licenseNote: PERMISSION_NOTE,
    registeredWithProduct: false,
    source: inspection.file || null,
    headers: {
      raw: inspection.headers.raw,
      mapped: inspection.headers.mapped,
      unknown: inspection.headers.unknown
    },
    totals: inspection.totals,
    packs: written,
    invalid: inspection.invalid,
    exactDuplicatesRemoved: inspection.duplicates.exact
  };
  const reportPath = path.join(outDir, "import-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  return { written: written, reportPath: reportPath, report: report };
}

export function readLocalCsvFile(inputPath) {
  if (isNetworkLikeInput(inputPath)) {
    throw new Error("Refusing network/URL input. Supply a local file path to a manually provided CSV.");
  }
  const resolved = path.resolve(inputPath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    throw new Error("Input is not a local file: " + resolved);
  }
  const buf = fs.readFileSync(resolved);
  if (buf.includes(0x00)) {
    throw new Error("Input file contains NUL bytes and will not be parsed.");
  }
  const sha256 = hashBuffer(buf);
  const text = buf.toString("utf8");
  return {
    text: text,
    file: {
      filename: path.basename(resolved),
      path: resolved,
      bytes: buf.length,
      sha256: sha256,
      sourceType: SOURCE_TYPE,
      sourceDataset: SOURCE_DATASET,
      sourceAcquisitionMethod: ACQUISITION_METHOD
    }
  };
}

export function formatDryRun(inspection) {
  const lines = [];
  lines.push("SignalTerrain SOTA CSV importer " + IMPORTER_VERSION + " (dry-run, no pack files written)");
  lines.push("Permission: " + PERMISSION_STATUS + " — " + PERMISSION_NOTE);
  if (inspection.file) {
    lines.push("Source file: " + inspection.file.filename);
    lines.push("Source bytes: " + inspection.file.bytes);
    lines.push("Source SHA-256: " + inspection.file.sha256);
  }
  if (inspection.titleLine) lines.push("Title: " + sanitizeReportString(inspection.titleLine));
  lines.push("Headers mapped: " + Object.keys(inspection.headers.mapped).sort().join(", "));
  if (inspection.headers.unknown.length) {
    lines.push("Unmapped headers (ignored): " + inspection.headers.unknown.join(", "));
  }
  const t = inspection.totals;
  lines.push(
    "Records: source=" +
      t.sourceRecords +
      " valid=" +
      t.valid +
      " invalid=" +
      t.invalid +
      " exactDuplicatesRemoved=" +
      t.exactDuplicatesRemoved +
      " associations=" +
      t.associations +
      " regions=" +
      t.regions
  );
  lines.push("Associations:");
  for (const a of inspection.associations) {
    lines.push("  " + a.code + (a.name ? " (" + sanitizeReportString(a.name) + ")" : "") + " — " + a.count + " · regions " + a.regions.join(", "));
  }
  lines.push("Regions:");
  for (const r of inspection.regions) {
    lines.push(
      "  " +
        r.key +
        (r.regionName ? " " + sanitizeReportString(r.regionName) : "") +
        " — " +
        r.count
    );
  }
  if (inspection.samples.length) {
    lines.push("Samples:");
    for (const s of inspection.samples) {
      lines.push(
        "  " +
          s.summitCode +
          " " +
          sanitizeReportString(s.name || "") +
          " " +
          s.latitude +
          "," +
          s.longitude +
          " " +
          (s.points != null ? s.points + " pts" : "")
      );
    }
  }
  if (inspection.duplicates.exact.length) {
    lines.push("Exact duplicates (kept first): " + inspection.duplicates.exact.length);
  }
  if (inspection.duplicates.conflicts.length) {
    lines.push("CONFLICTS:");
    for (const c of inspection.duplicates.conflicts) {
      lines.push(
        "  " + c.reference + " rows " + c.sourceRows.join("/") + " fields " + c.conflictingFields.join(", ")
      );
    }
  }
  if (inspection.invalid.length) {
    lines.push("Invalid rows:");
    for (const inv of inspection.invalid.slice(0, 40)) {
      lines.push("  row " + inv.row + " field " + inv.field + " — " + inv.problem);
    }
    if (inspection.invalid.length > 40) {
      lines.push("  … " + (inspection.invalid.length - 40) + " more");
    }
  }
  return lines.join("\n");
}
