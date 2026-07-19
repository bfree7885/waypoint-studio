#!/usr/bin/env node
/**
 * SignalTerrain Cyber Live Engine
 *
 * Fetches legitimate public cyber intelligence, normalizes, dedupes, scores,
 * and writes data/cyber/live.json + data/cyber/health.json.
 *
 * NEVER writes sample/fixture content. On total failure, retains last-known-good
 * live artifact (if any) and marks providers unavailable.
 *
 * Env:
 *   NVD_API_KEY (optional)
 *   CYBER_REFRESH_ENABLED=true
 *   CYBER_PROVIDER_TIMEOUT_MS=15000
 *   CYBER_CACHE_TTL_MINUTES=60
 *   CYBER_MAX_KEV=200
 *   CYBER_MAX_NVD=40
 *   CYBER_DEBUG=false
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "data", "cyber");
const LIVE_PATH = process.env.CYBER_LIVE_OUT || path.join(OUT_DIR, "live.json");
const HEALTH_PATH = process.env.CYBER_HEALTH_OUT || path.join(OUT_DIR, "health.json");
const GRAPH_PATH = process.env.CYBER_GRAPH_OUT || path.join(OUT_DIR, "graph.json");
const ENGINE_VERSION = "1.0.0";

const TIMEOUT_MS = Number(process.env.CYBER_PROVIDER_TIMEOUT_MS || 15000);
const MAX_KEV = Number(process.env.CYBER_MAX_KEV || 200);
const MAX_NVD = Number(process.env.CYBER_MAX_NVD || 40);
const NVD_API_KEY = (process.env.NVD_API_KEY || "").trim();
const DEBUG = String(process.env.CYBER_DEBUG || "").toLowerCase() === "true";

const ENDPOINTS = {
  cisaKev:
    "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
  nvdRecent: "https://services.nvd.nist.gov/rest/json/cves/2.0",
  cisaAdvisoriesAtom: "https://www.cisa.gov/cybersecurity-advisories/all.xml",
  msrcCvrf: "https://api.msrc.microsoft.com/cvrf/v3.0/updates",
  chromeReleasesRss: "https://chromereleases.googleblog.com/feeds/posts/default?alt=rss",
  mozillaMfsaRss: "https://www.mozilla.org/en-US/security/advisories/feed.xml",
  ubuntuUsnRss: "https://ubuntu.com/security/notices/rss.xml"
};

function log(...args) {
  if (DEBUG) console.error("[cyber-live]", ...args);
}

function nowIso() {
  return new Date().toISOString();
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function readJsonSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function writeJson(filePath, obj) {
  ensureDir(path.dirname(filePath));
  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, filePath);
}

async function fetchText(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs || TIMEOUT_MS);
  const headers = Object.assign(
    {
      Accept: opts.accept || "application/json, application/xml, text/xml, */*",
      "User-Agent": "WaypointStudio-SignalTerrainCyberLive/1.0 (+https://waypointstudio.org; defensive-awareness)"
    },
    opts.headers || {}
  );
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers, redirect: "follow" });
    const text = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      text,
      headers: Object.fromEntries(res.headers.entries())
    };
  } finally {
    clearTimeout(t);
  }
}

function daysBetween(a, b) {
  const ms = Math.abs(new Date(b).getTime() - new Date(a).getTime());
  return ms / (1000 * 60 * 60 * 24);
}

function freshnessOf(iso) {
  if (!iso) return "stale";
  const d = daysBetween(iso, nowIso());
  if (d <= 2) return "live";
  if (d <= 14) return "recent";
  if (d <= 60) return "aging";
  return "stale";
}

function stripHtml(s) {
  return String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRssItems(xml, limit = 25) {
  const items = [];
  const raw = String(xml || "");
  // RSS <item>
  const rssChunks = raw.split(/<item[\s>]/i).slice(1);
  for (const chunk of rssChunks) {
    if (items.length >= limit) break;
    const title = (chunk.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i) || [])[1];
    const link = (chunk.match(/<link[^>]*>([^<]+)<\/link>/i) || [])[1];
    const guid = (chunk.match(/<guid[^>]*>([^<]+)<\/guid>/i) || [])[1];
    const pub = (chunk.match(/<pubDate[^>]*>([^<]+)<\/pubDate>/i) || [])[1];
    const desc = (chunk.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i) || [])[1];
    if (!title) continue;
    items.push({
      title: stripHtml(title),
      link: stripHtml(link || guid || ""),
      guid: stripHtml(guid || link || title),
      publishedAt: pub ? new Date(pub).toISOString() : null,
      summary: stripHtml(desc).slice(0, 600)
    });
  }
  if (items.length) return items;
  // Atom <entry>
  const atomChunks = raw.split(/<entry[\s>]/i).slice(1);
  for (const chunk of atomChunks) {
    if (items.length >= limit) break;
    const title = (chunk.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i) || [])[1];
    const linkHref = (chunk.match(/<link[^>]*href=["']([^"']+)["']/i) || [])[1];
    const id = (chunk.match(/<id[^>]*>([^<]+)<\/id>/i) || [])[1];
    const updated = (chunk.match(/<updated[^>]*>([^<]+)<\/updated>/i) || [])[1];
    const published = (chunk.match(/<published[^>]*>([^<]+)<\/published>/i) || [])[1];
    const summary = (chunk.match(/<(?:summary|content)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:summary|content)>/i) || [])[1];
    if (!title) continue;
    const when = published || updated;
    items.push({
      title: stripHtml(title),
      link: stripHtml(linkHref || id || ""),
      guid: stripHtml(id || linkHref || title),
      publishedAt: when ? new Date(when).toISOString() : null,
      summary: stripHtml(summary).slice(0, 600)
    });
  }
  return items;
}

function extractCves(text) {
  const set = new Set();
  const re = /CVE-\d{4}-\d{4,7}/gi;
  let m;
  while ((m = re.exec(String(text || "")))) {
    set.add(m[0].toUpperCase());
  }
  return [...set];
}

function makeRecord(partial) {
  const retrievedAt = partial.retrievedAt || nowIso();
  return {
    id: partial.id,
    type: partial.type,
    title: partial.title,
    summary: partial.summary || "",
    publishedAt: partial.publishedAt || null,
    updatedAt: partial.updatedAt || partial.publishedAt || null,
    retrievedAt,
    source: partial.source,
    identifiers: partial.identifiers || {},
    entities: partial.entities || {},
    severity: partial.severity || { label: "unknown" },
    exploitation: partial.exploitation || {
      knownExploited: false,
      exploitationEvidence: "unknown",
      ransomwareLinked: false
    },
    remediation: partial.remediation || {},
    confidence: partial.confidence || "unknown",
    freshness: freshnessOf(partial.updatedAt || partial.publishedAt || retrievedAt),
    rawProviderMetadata: partial.rawProviderMetadata || undefined
  };
}

/** Transparent 0–100 priority with inspectable factors */
function scoreRecord(rec, profileTerms) {
  const contributions = [];
  let total = 0;

  function add(id, points, max, reason) {
    const p = Math.max(0, Math.min(max, points));
    contributions.push({ factorId: id, points: p, maxPoints: max, reason });
    total += p;
  }

  if (rec.exploitation?.knownExploited) {
    add("kev_or_known_exploited", 35, 35, "Official known-exploited evidence (e.g. CISA KEV).");
  }
  if (rec.exploitation?.ransomwareLinked) {
    add("ransomware_linked", 12, 12, "Source associates this with ransomware campaigns.");
  }
  if (rec.exploitation?.exploitationEvidence === "official-confirmed") {
    add("official_exploitation", 8, 8, "Exploitation confirmed by an official source.");
  } else if (rec.exploitation?.exploitationEvidence === "reported") {
    add("reported_exploitation", 3, 8, "Exploitation reported but not official-confirmed.");
  }

  const cvss = Number(rec.severity?.cvssScore);
  if (!Number.isNaN(cvss) && cvss > 0) {
    const pts = Math.round((cvss / 10) * 18);
    add("cvss", pts, 18, `CVSS base score ${cvss} (technical severity, not personal exposure).`);
  } else if (rec.severity?.label === "critical") {
    add("severity_label", 14, 18, "Severity labeled critical by source.");
  } else if (rec.severity?.label === "high") {
    add("severity_label", 10, 18, "Severity labeled high by source.");
  } else if (rec.severity?.label === "medium") {
    add("severity_label", 5, 18, "Severity labeled medium by source.");
  }

  const when = rec.updatedAt || rec.publishedAt;
  if (when) {
    const d = daysBetween(when, nowIso());
    if (d <= 7) add("recency", 10, 10, "Updated/published within 7 days.");
    else if (d <= 30) add("recency", 6, 10, "Updated/published within 30 days.");
    else if (d <= 90) add("recency", 3, 10, "Updated/published within 90 days.");
    else add("recency", 0, 10, "Older than 90 days — reduced urgency from recency alone.");
  }

  if (rec.remediation?.patchesAvailable) {
    add("patch_available", 4, 6, "Patch or vendor fix indicated as available.");
  }
  if (rec.remediation?.deadline) {
    const daysLeft = (new Date(rec.remediation.deadline).getTime() - Date.now()) / 86400000;
    if (daysLeft >= 0 && daysLeft <= 14) {
      add("remediation_deadline", 6, 6, "Official remediation deadline within 14 days.");
    } else if (daysLeft < 0 && daysLeft > -30) {
      add("remediation_deadline", 4, 6, "Official remediation deadline recently passed.");
    }
  }

  if (rec.source?.authorityLevel === "official") {
    add("authority", 5, 5, "Official government or vendor source.");
  } else if (rec.source?.authorityLevel === "authoritative") {
    add("authority", 3, 5, "Authoritative vendor/security source.");
  } else {
    add("authority", 1, 5, "Reputable reporting — treat as context, not sole confirmation.");
  }

  if (rec.confidence === "confirmed" || rec.confidence === "high") {
    add("confidence", 4, 4, `Confidence: ${rec.confidence}.`);
  } else if (rec.confidence === "moderate") {
    add("confidence", 2, 4, "Moderate confidence.");
  } else if (rec.confidence === "preliminary") {
    add("confidence", 0, 4, "Preliminary — reduced weight.");
  }

  const match = matchProfile(rec, profileTerms || []);
  if (match.level === "exact") {
    add("profile_exact", 18, 18, `Direct product match: ${match.detail}`);
  } else if (match.level === "vendor") {
    add("profile_vendor", 8, 18, `Possible vendor match: ${match.detail}`);
  } else if (match.level === "platform") {
    add("profile_platform", 5, 18, `Platform may be relevant: ${match.detail}`);
  } else if (match.level === "ambiguous") {
    add("profile_ambiguous", 2, 18, `Ambiguous possible match: ${match.detail}`);
  } else {
    add("profile_none", 0, 18, "No declared technology match in the current profile.");
  }

  total = Math.max(0, Math.min(100, Math.round(total)));
  let band = "Informational";
  if (total >= 80) band = "Immediate";
  else if (total >= 60) band = "High";
  else if (total >= 35) band = "Monitor";

  const why = contributions
    .filter((c) => c.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 4)
    .map((c) => c.reason)
    .join(" ");

  return {
    score: total,
    band,
    contributions,
    explanation: `Priority ${total} — ${band}. ${why}`,
    profileMatch: match
  };
}

function matchProfile(rec, profileTerms) {
  const vendors = (rec.entities?.vendors || []).map((v) => String(v).toLowerCase());
  const products = (rec.entities?.products || []).map((v) => String(v).toLowerCase());
  const platforms = (rec.entities?.platforms || []).map((v) => String(v).toLowerCase());
  const blob = `${rec.title} ${rec.summary} ${products.join(" ")} ${vendors.join(" ")}`.toLowerCase();

  let best = { level: "none", detail: "No declared technology match" };
  for (const term of profileTerms) {
    const t = String(term.name || term).toLowerCase().trim();
    if (t.length < 2) continue;
    const vendor = String(term.vendor || "").toLowerCase();
    const productHit = products.some((p) => p.includes(t) || t.includes(p)) || blob.includes(t);
    const vendorHit =
      (vendor && vendors.some((v) => v.includes(vendor) || vendor.includes(v))) ||
      vendors.some((v) => v.includes(t) || t.includes(v));

    if (productHit && (term.category === "application" || term.category === "browser" || term.category === "operating-system" || products.length)) {
      if (products.some((p) => p === t || p.includes(t))) {
        return { level: "exact", detail: term.name || t };
      }
      if (best.level !== "exact") best = { level: "exact", detail: term.name || t };
    } else if (vendorHit) {
      if (best.level === "none" || best.level === "platform" || best.level === "ambiguous") {
        best = { level: "vendor", detail: term.name || t };
      }
    } else if (platforms.some((p) => p.includes(t) || t.includes(p))) {
      if (best.level === "none") best = { level: "platform", detail: term.name || t };
    } else if (blob.includes(t) && t.length >= 4) {
      if (best.level === "none") best = { level: "ambiguous", detail: term.name || t };
    }
  }
  return best;
}

async function providerCisaKev() {
  const started = Date.now();
  const url = ENDPOINTS.cisaKev;
  const res = await fetchText(url);
  if (!res.ok) throw new Error(`CISA KEV HTTP ${res.status}`);
  const data = JSON.parse(res.text);
  const vulns = (data.vulnerabilities || [])
    .slice()
    .sort((a, b) => String(b.dateAdded || "").localeCompare(String(a.dateAdded || "")))
    .slice(0, MAX_KEV);

  const retrievedAt = nowIso();
  const records = vulns.map((v) =>
    makeRecord({
      id: `live_kev_${String(v.cveID || "").toLowerCase()}`,
      type: "exploited-vulnerability",
      title: v.vulnerabilityName || v.cveID,
      summary: v.shortDescription || "",
      publishedAt: v.dateAdded ? `${v.dateAdded}T00:00:00.000Z` : null,
      updatedAt: data.dateReleased || null,
      retrievedAt,
      source: {
        providerId: "cisa-kev",
        providerName: "CISA Known Exploited Vulnerabilities Catalog",
        sourceUrl: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
        authorityLevel: "official"
      },
      identifiers: { cves: v.cveID ? [v.cveID] : [] },
      entities: {
        vendors: v.vendorProject ? [v.vendorProject] : [],
        products: v.product ? [v.product] : []
      },
      severity: { label: "high" },
      exploitation: {
        knownExploited: true,
        exploitationEvidence: "official-confirmed",
        ransomwareLinked: /known/i.test(String(v.knownRansomwareCampaignUse || ""))
          ? !/unknown/i.test(String(v.knownRansomwareCampaignUse))
          : false
      },
      remediation: {
        summary: v.requiredAction || "",
        deadline: v.dueDate || null,
        patchesAvailable: true,
        mitigations: v.requiredAction ? [v.requiredAction] : []
      },
      confidence: "confirmed",
      rawProviderMetadata: {
        knownRansomwareCampaignUse: v.knownRansomwareCampaignUse,
        notes: v.notes,
        cisaCatalogVersion: data.catalogVersion
      }
    })
  );

  return {
    providerId: "cisa-kev",
    providerName: "CISA KEV",
    status: "ok",
    records,
    meta: {
      catalogVersion: data.catalogVersion,
      dateReleased: data.dateReleased,
      totalInCatalog: (data.vulnerabilities || []).length,
      included: records.length,
      responseMs: Date.now() - started,
      sourceUrl: url
    }
  };
}

async function providerNvdRecent() {
  const started = Date.now();
  const end = new Date();
  const start = new Date(Date.now() - 7 * 86400000);
  const qs = new URLSearchParams({
    resultsPerPage: String(MAX_NVD),
    pubStartDate: start.toISOString().replace(/\.\d{3}Z$/, ".000"),
    pubEndDate: end.toISOString().replace(/\.\d{3}Z$/, ".000")
  });
  // NVD expects format with timezone offset sometimes; try ISO-like
  const url = `${ENDPOINTS.nvdRecent}?resultsPerPage=${MAX_NVD}`;
  const headers = {};
  if (NVD_API_KEY) headers.apiKey = NVD_API_KEY;
  const res = await fetchText(url, { headers });
  if (!res.ok) throw new Error(`NVD HTTP ${res.status}: ${res.text.slice(0, 200)}`);
  const data = JSON.parse(res.text);
  const retrievedAt = nowIso();
  const records = (data.vulnerabilities || []).map((wrap) => {
    const cve = wrap.cve || {};
    const desc = (cve.descriptions || []).find((d) => d.lang === "en") || (cve.descriptions || [])[0];
    let cvssScore;
    let cvssVector;
    let label = "unknown";
    const m31 = cve.metrics?.cvssMetricV31?.[0]?.cvssData;
    const m30 = cve.metrics?.cvssMetricV30?.[0]?.cvssData;
    const m2 = cve.metrics?.cvssMetricV2?.[0]?.cvssData;
    const cv = m31 || m30 || m2;
    if (cv) {
      cvssScore = cv.baseScore;
      cvssVector = cv.vectorString;
      label = String(cv.baseSeverity || "unknown").toLowerCase();
    }
    const refs = (cve.references || []).map((r) => r.url).filter(Boolean);
    const cwes = [];
    (cve.weaknesses || []).forEach((w) => {
      (w.description || []).forEach((d) => {
        if (d.value && /^CWE-/i.test(d.value)) cwes.push(d.value);
      });
    });
    return makeRecord({
      id: `live_nvd_${String(cve.id || "").toLowerCase()}`,
      type: "vulnerability",
      title: cve.id || "CVE",
      summary: (desc && desc.value) || "",
      publishedAt: cve.published || null,
      updatedAt: cve.lastModified || null,
      retrievedAt,
      source: {
        providerId: "nvd",
        providerName: "NIST National Vulnerability Database",
        sourceUrl: cve.id ? `https://nvd.nist.gov/vuln/detail/${cve.id}` : "https://nvd.nist.gov/",
        authorityLevel: "official"
      },
      identifiers: { cves: cve.id ? [cve.id] : [], cwes },
      entities: { vendors: [], products: [], platforms: [] },
      severity: { label, cvssScore, cvssVector },
      exploitation: {
        knownExploited: false,
        exploitationEvidence: "unknown",
        ransomwareLinked: false
      },
      remediation: { patchesAvailable: false },
      confidence: "high",
      rawProviderMetadata: { referenceCount: refs.length }
    });
  });

  return {
    providerId: "nvd",
    providerName: "NIST NVD",
    status: "ok",
    records,
    meta: {
      totalResults: data.totalResults,
      included: records.length,
      responseMs: Date.now() - started,
      sourceUrl: url,
      apiKeyConfigured: Boolean(NVD_API_KEY),
      note: "Recent page of NVD CVE 2.0 API (resultsPerPage capped)."
    }
  };
}

async function providerRss(providerId, providerName, url, type, authorityLevel) {
  const started = Date.now();
  const res = await fetchText(url, { accept: "application/rss+xml, application/xml, text/xml, */*" });
  if (!res.ok) throw new Error(`${providerId} HTTP ${res.status}`);
  const items = parseRssItems(res.text, 20);
  if (!items.length) {
    throw new Error(`${providerId} returned no parseable feed items`);
  }
  const retrievedAt = nowIso();
  const records = items.map((it, idx) => {
    const cves = extractCves(`${it.title} ${it.summary}`);
    return makeRecord({
      id: `live_${providerId}_${Buffer.from(it.guid || it.title).toString("hex").slice(0, 24)}`,
      type,
      title: it.title,
      summary: it.summary,
      publishedAt: it.publishedAt,
      updatedAt: it.publishedAt,
      retrievedAt,
      source: {
        providerId,
        providerName,
        sourceUrl: it.link || url,
        authorityLevel
      },
      identifiers: { cves },
      entities: {},
      severity: { label: "unknown" },
      exploitation: {
        knownExploited: false,
        exploitationEvidence: type === "security-advisory" ? "unknown" : "unknown",
        ransomwareLinked: false
      },
      remediation: {},
      confidence: authorityLevel === "official" || authorityLevel === "authoritative" ? "high" : "moderate"
    });
  });
  return {
    providerId,
    providerName,
    status: "ok",
    records,
    meta: { included: records.length, responseMs: Date.now() - started, sourceUrl: url }
  };
}

function dedupeRecords(records) {
  const byCve = new Map();
  const byId = new Map();
  const unified = [];

  for (const rec of records) {
    const cves = rec.identifiers?.cves || [];
    if (cves.length) {
      const key = cves[0].toUpperCase();
      const existing = byCve.get(key);
      if (existing) {
        existing.supportingSources = existing.supportingSources || [
          {
            providerId: existing.source.providerId,
            providerName: existing.source.providerName,
            sourceUrl: existing.source.sourceUrl
          }
        ];
        existing.supportingSources.push({
          providerId: rec.source.providerId,
          providerName: rec.source.providerName,
          sourceUrl: rec.source.sourceUrl
        });
        // Prefer KEV / exploited as primary
        if (rec.type === "exploited-vulnerability" && existing.type !== "exploited-vulnerability") {
          const merged = Object.assign({}, rec, {
            supportingSources: existing.supportingSources,
            severity: {
              label: rec.severity?.label || existing.severity?.label,
              cvssScore: existing.severity?.cvssScore ?? rec.severity?.cvssScore,
              cvssVector: existing.severity?.cvssVector ?? rec.severity?.cvssVector,
              epssScore: existing.severity?.epssScore ?? rec.severity?.epssScore
            }
          });
          byCve.set(key, merged);
          const idx = unified.findIndex((u) => u.id === existing.id);
          if (idx >= 0) unified[idx] = merged;
        } else {
          if (rec.severity?.cvssScore && !existing.severity?.cvssScore) {
            existing.severity = Object.assign({}, existing.severity, {
              cvssScore: rec.severity.cvssScore,
              cvssVector: rec.severity.cvssVector,
              label: existing.severity.label === "unknown" ? rec.severity.label : existing.severity.label
            });
          }
          if (rec.summary && rec.summary.length > (existing.summary || "").length) {
            existing.summary = rec.summary;
          }
        }
        continue;
      }
      byCve.set(key, rec);
      byId.set(rec.id, rec);
      unified.push(rec);
      continue;
    }
    if (byId.has(rec.id)) continue;
    byId.set(rec.id, rec);
    unified.push(rec);
  }
  return unified;
}

async function runProvider(fn, id) {
  try {
    const result = await fn();
    return result;
  } catch (err) {
    return {
      providerId: id,
      providerName: id,
      status: "error",
      records: [],
      meta: { error: String(err && err.message ? err.message : err), responseMs: null }
    };
  }
}

function recordsToGraphBundle(records) {
  const entities = [];
  const relationships = [];
  const seen = new Set();
  for (const r of records) {
    const cves = r.identifiers?.cves || [];
    for (const cve of cves) {
      const id = "cy_" + cve.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      if (seen.has(id)) continue;
      seen.add(id);
      entities.push({
        id,
        kind: r.exploitation?.knownExploited ? "kev-entry" : "cve",
        title: cve,
        summary: r.summary || r.title,
        updatedAt: r.updatedAt || r.publishedAt || r.retrievedAt,
        history: r.publishedAt
          ? [{ at: r.publishedAt, summary: "Published / listed by upstream source" }]
          : [],
        citations: [
          {
            label: r.source?.providerName,
            url: r.source?.sourceUrl,
            kind: "government"
          }
        ],
        explainability: {
          knownFacts: [r.title],
          likely: [],
          possible: [],
          unknown: ["Local exposure without version confirmation"],
          whatIsIt: r.summary || "",
          whyItMatters: r.priority?.explanation || ""
        },
        liveRecordId: r.id
      });
    }
    const vendors = r.entities?.vendors || [];
    const products = r.entities?.products || [];
    vendors.forEach((v, i) => {
      const vid =
        "cy_vendor_" +
        String(v)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .slice(0, 48);
      if (!seen.has(vid)) {
        seen.add(vid);
        entities.push({
          id: vid,
          kind: "source",
          title: v,
          summary: "Vendor referenced by live intelligence",
          updatedAt: r.retrievedAt
        });
      }
      const p = products[i] || products[0];
      if (!p) return;
      const pid =
        "cy_product_" +
        String(p)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .slice(0, 48);
      if (!seen.has(pid)) {
        seen.add(pid);
        entities.push({
          id: pid,
          kind: "affected-software",
          title: p,
          summary: "Product referenced by live intelligence (" + v + ")",
          updatedAt: r.retrievedAt
        });
      }
      if (cves[0]) {
        relationships.push({
          id: "rel_" + pid.slice(0, 24) + "_" + cves[0].toLowerCase(),
          type: "affects",
          from: pid,
          to: "cy_" + cves[0].toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          note: "Linked from live provider data"
        });
      }
    });
  }
  return {
    meta: {
      version: "1.0.0",
      status: "live",
      generatedAt: nowIso(),
      source: "signalterrain-cyber-live-engine",
      disclaimer: "Derived from live public sources — not a teaching sample."
    },
    entities,
    relationships
  };
}

async function main() {
  if (String(process.env.CYBER_REFRESH_ENABLED || "true").toLowerCase() === "false") {
    console.error("CYBER_REFRESH_ENABLED=false — skipping refresh");
    process.exit(0);
  }

  const previous = readJsonSafe(LIVE_PATH);
  const startedAt = nowIso();
  console.error(`SignalTerrain Cyber Live Engine ${ENGINE_VERSION} starting…`);

  const providers = await Promise.all([
    runProvider(providerCisaKev, "cisa-kev"),
    runProvider(providerNvdRecent, "nvd"),
    runProvider(
      () =>
        providerRss(
          "cisa-advisories",
          "CISA Cybersecurity Advisories",
          ENDPOINTS.cisaAdvisoriesAtom,
          "security-advisory",
          "official"
        ),
      "cisa-advisories"
    ),
    runProvider(
      () =>
        providerRss(
          "chrome-releases",
          "Google Chrome Releases",
          ENDPOINTS.chromeReleasesRss,
          "software-security-release",
          "authoritative"
        ),
      "chrome-releases"
    ),
    runProvider(
      () =>
        providerRss(
          "ubuntu-usn",
          "Ubuntu Security Notices",
          ENDPOINTS.ubuntuUsnRss,
          "security-advisory",
          "authoritative"
        ),
      "ubuntu-usn"
    )
  ]);

  // Planned (not pretended live)
  const planned = [
    {
      providerId: "mozilla-mfsa",
      providerName: "Mozilla Foundation Security Advisories",
      status: "planned",
      records: [],
      meta: {
        note: "Stable machine-readable MFSA feed URL not confirmed (prior RSS 404) — marked planned, not simulated.",
        attemptedUrl: ENDPOINTS.mozillaMfsaRss
      }
    },
    {
      providerId: "msrc",
      providerName: "Microsoft Security Response Center",
      status: "planned",
      records: [],
      meta: {
        note: "MSRC CVRF/API integration planned — not simulated.",
        sourceUrl: ENDPOINTS.msrcCvrf
      }
    },
    {
      providerId: "apple-security",
      providerName: "Apple Security Releases",
      status: "planned",
      records: [],
      meta: { note: "No stable machine-readable feed wired yet." }
    },
    {
      providerId: "cisco-psirt",
      providerName: "Cisco Security Advisories",
      status: "planned",
      records: [],
      meta: { note: "Planned — prefer official advisory API/RSS when confirmed." }
    },
    {
      providerId: "epss",
      providerName: "FIRST EPSS",
      status: "planned",
      records: [],
      meta: { note: "Optional secondary source after required providers stabilize." }
    }
  ];

  let allRecords = [];
  for (const p of providers) {
    if (p.status === "ok") allRecords = allRecords.concat(p.records || []);
  }

  // If KEV failed but we have previous KEV records, keep them labeled cached
  if (providers.find((p) => p.providerId === "cisa-kev")?.status === "error" && previous?.records?.length) {
    const cachedKev = previous.records
      .filter((r) => r.source?.providerId === "cisa-kev")
      .map((r) => Object.assign({}, r, { freshness: "stale", _fromCache: true }));
    allRecords = allRecords.concat(cachedKev);
    const kevP = providers.find((p) => p.providerId === "cisa-kev");
    if (kevP) {
      kevP.status = "cached";
      kevP.meta = Object.assign({}, kevP.meta, {
        cachedFrom: previous.generatedAt,
        cachedCount: cachedKev.length
      });
    }
  }

  const deduped = dedupeRecords(allRecords);
  const scored = deduped.map((rec) => {
    const priority = scoreRecord(rec, []);
    return Object.assign({}, rec, { priority });
  });
  scored.sort((a, b) => (b.priority?.score || 0) - (a.priority?.score || 0));

  const providerHealth = [...providers, ...planned].map((p) => ({
    providerId: p.providerId,
    providerName: p.providerName,
    status: p.status,
    lastAttemptedAt: startedAt,
    lastSuccessfulAt: p.status === "ok" ? startedAt : previous?.providers?.find((x) => x.providerId === p.providerId)?.lastSuccessfulAt || null,
    responseMs: p.meta?.responseMs ?? null,
    recordCount: (p.records || []).length,
    cacheAge: p.status === "cached" ? "previous-live-artifact" : null,
    rateLimitState: null,
    latestError: p.meta?.error || null,
    resultsMode: p.status === "ok" ? "live" : p.status === "cached" ? "cached" : p.status,
    meta: p.meta || {}
  }));

  const okCount = providerHealth.filter((p) => p.status === "ok").length;
  const errCount = providerHealth.filter((p) => p.status === "error").length;

  let trustState = "Live";
  if (okCount === 0 && scored.length === 0) trustState = "Error";
  else if (okCount === 0 && scored.length) trustState = "Cached";
  else if (errCount > 0) trustState = "Partial";

  const byType = {};
  for (const r of scored) {
    byType[r.type] = (byType[r.type] || 0) + 1;
  }

  const live = {
    meta: {
      version: ENGINE_VERSION,
      generatedAt: nowIso(),
      trustState,
      engine: "signalterrain-cyber-live-engine",
      principles: [
        "No sample or fixture data in this artifact",
        "Official sources preferred",
        "Transparent priority factors",
        "Defensive awareness only"
      ],
      counts: {
        records: scored.length,
        byType,
        providersOk: okCount,
        providersError: errCount
      }
    },
    providers: providerHealth,
    records: scored,
    howToEvaluate: {
      title: "How SignalTerrain evaluates cyber information",
      points: [
        "CVSS measures technical severity, not personal exposure.",
        "KEV indicates known exploitation, not universal applicability to you.",
        "EPSS (when added) estimates exploitation probability, not certainty.",
        "Vendor advisories may be more current than aggregated databases.",
        "Technology-profile matching may require exact version confirmation.",
        "Absence of a match does not prove safety.",
        "News reporting is not equivalent to official confirmation."
      ]
    }
  };

  // Refuse to write if somehow empty of real providers AND no previous — honest empty
  if (scored.length === 0 && okCount === 0) {
    const empty = {
      meta: {
        version: ENGINE_VERSION,
        generatedAt: nowIso(),
        trustState: "Error",
        engine: "signalterrain-cyber-live-engine",
        counts: { records: 0, byType: {}, providersOk: 0, providersError: errCount },
        message: "No verified cyber intelligence has been retrieved yet."
      },
      providers: providerHealth,
      records: [],
      howToEvaluate: live.howToEvaluate
    };
    // Prefer previous good if exists
    if (previous?.records?.length) {
      previous.meta = Object.assign({}, previous.meta, {
        trustState: "Cached",
        cachedAt: nowIso(),
        message: "Live refresh failed; showing last successful retrieval."
      });
      writeJson(LIVE_PATH, previous);
      console.error("Refresh failed; retained previous live artifact.");
    } else {
      writeJson(LIVE_PATH, empty);
      console.error("No live records and no previous artifact.");
    }
  } else {
    writeJson(LIVE_PATH, live);
    writeJson(GRAPH_PATH, recordsToGraphBundle(scored));
    console.error(`Wrote ${scored.length} records → ${LIVE_PATH} (${trustState})`);
    console.error(`Wrote live graph → ${GRAPH_PATH}`);
  }

  writeJson(HEALTH_PATH, {
    generatedAt: nowIso(),
    engineVersion: ENGINE_VERSION,
    trustState: readJsonSafe(LIVE_PATH)?.meta?.trustState || trustState,
    providers: providerHealth,
    livePath: path.relative(ROOT, LIVE_PATH),
    recordCount: readJsonSafe(LIVE_PATH)?.records?.length || 0
  });

  console.error(`Health → ${HEALTH_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
