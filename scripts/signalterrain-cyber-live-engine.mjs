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
import {
  buildSignalIntelligence,
  writeCorrelationBundle,
  correlateRecords,
  SIGNAL_ENGINE_VERSION
} from "./cyber-signal/signal-engine.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "data", "cyber");
const LIVE_PATH = process.env.CYBER_LIVE_OUT || path.join(OUT_DIR, "live.json");
const HEALTH_PATH = process.env.CYBER_HEALTH_OUT || path.join(OUT_DIR, "health.json");
const GRAPH_PATH = process.env.CYBER_GRAPH_OUT || path.join(OUT_DIR, "graph.json");
const ENGINE_VERSION = "1.2.0";
const HISTORY_PATH = process.env.CYBER_HISTORY_OUT || path.join(OUT_DIR, "history.json");
const CORRELATION_PATH = process.env.CYBER_CORRELATION_OUT || path.join(OUT_DIR, "correlation.json");
const MAX_GHSA = Number(process.env.CYBER_MAX_GHSA || 25);
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
  ubuntuUsnRss: "https://ubuntu.com/security/notices/rss.xml",
  ghsa: "https://api.github.com/advisories",
  awsStatusRss: "https://status.aws.amazon.com/rss/all.rss",
  azureStatusRss: "https://azure.status.microsoft/en-us/status/feed/",
  gcpIncidents: "https://status.cloud.google.com/incidents.json",
  cloudflareStatus: "https://www.cloudflarestatus.com/api/v2/summary.json",
  githubStatus: "https://www.githubstatus.com/api/v2/summary.json",
  openaiStatus: "https://status.openai.com/api/v2/summary.json",
  m365StatusRss: "https://rss.cloud.microsoft/status/feed"
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

  // Operational context factors (keyword / entity heuristics — explained, never invented facts)
  const blob = `${rec.title} ${rec.summary} ${(rec.entities?.vendors || []).join(" ")} ${(rec.entities?.products || []).join(" ")}`.toLowerCase();
  const critInfra =
    /\b(scada|ics|ot\b|energy|electric|water.?utility|pipeline|hospital|healthcare|medical.?device|aviation|rail|telecom|5g core|power.?grid)\b/i.test(
      blob
    );
  if (critInfra) {
    add(
      "critical_infrastructure_context",
      6,
      8,
      "Source text references sectors often treated as critical infrastructure — elevate awareness; confirm applicability."
    );
  }
  const supplyChain =
    /\b(supply.?chain|ci\/cd|build.?pipeline|package.?registry|npm|pypi|maven|dependency|library|framework|sdk)\b/i.test(blob);
  if (supplyChain) {
    add("supply_chain_context", 5, 7, "Supply-chain / dependency context indicated by source wording.");
  }
  const edgeRemote =
    /\b(vpn|firewall|gateway|exchange|remote.?desktop|rdp|citrix|pulse.?secure|fortinet|palo.?alto|ivanti|moveit|file.?transfer)\b/i.test(
      blob
    );
  if (edgeRemote) {
    add(
      "edge_exposure_context",
      7,
      8,
      "Edge / remotely reachable software context (VPN, mail, file transfer, etc.) — often higher operational urgency."
    );
  }
  const popularVendor = /\b(microsoft|google|apple|amazon|aws|azure|cisco|oracle|vmware|adobe|linux|windows|android|ios)\b/i.test(
    blob
  );
  if (popularVendor) {
    add("vendor_prevalence", 3, 5, "Widely deployed vendor/product family named — larger potential blast radius.");
  }
  // Exploit maturity proxy from official evidence only
  if (rec.exploitation?.knownExploited && rec.source?.providerId === "cisa-kev") {
    add("exploit_maturity_kev", 6, 6, "Listed in CISA KEV — treated as mature/known exploitation signal.");
  }
  // Nation-state: only when source text explicitly says so (never invent attribution)
  if (/\b(nation.?state|apt\b|state.?sponsored)\b/i.test(blob) && rec.source?.authorityLevel === "official") {
    add(
      "nation_state_mention",
      4,
      6,
      "Official source text mentions nation-state / APT context — attribution remains the source’s claim."
    );
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
    .slice(0, 5)
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

function statuspageToRecords(providerId, providerName, summary, sourceUrl) {
  const retrievedAt = nowIso();
  const records = [];
  const status = summary?.status || {};
  const indicator = String(status.indicator || "none").toLowerCase();
  const description = status.description || "Status unknown";
  const incidents = Array.isArray(summary?.incidents) ? summary.incidents.slice(0, 8) : [];
  const components = Array.isArray(summary?.components) ? summary.components : [];
  const degraded = components.filter((c) => {
    const s = String(c.status || "").toLowerCase();
    return s && s !== "operational";
  });

  if (indicator !== "none" || degraded.length || incidents.length) {
    const titleParts = [];
    if (indicator && indicator !== "none") titleParts.push(providerName + " status: " + description);
    else if (degraded.length) titleParts.push(providerName + ": " + degraded.length + " component(s) not fully operational");
    else titleParts.push(providerName + ": active incident report(s)");
    records.push(
      makeRecord({
        id: `live_outage_${providerId}_${Buffer.from(description + indicator).toString("hex").slice(0, 16)}`,
        type: "service-outage",
        title: titleParts[0],
        summary:
          (incidents[0] && (incidents[0].name || incidents[0].impact)) ||
          (degraded.length
            ? "Affected: " + degraded.slice(0, 6).map((c) => c.name).join(", ")
            : description),
        publishedAt: (incidents[0] && (incidents[0].updated_at || incidents[0].created_at)) || retrievedAt,
        updatedAt: retrievedAt,
        retrievedAt,
        source: {
          providerId,
          providerName,
          sourceUrl,
          authorityLevel: "authoritative"
        },
        identifiers: {},
        entities: { vendors: [providerName], products: [providerName], platforms: ["cloud"] },
        severity: {
          label: indicator === "critical" || indicator === "major" ? "high" : indicator === "minor" ? "medium" : "low"
        },
        exploitation: { knownExploited: false, exploitationEvidence: "unknown", ransomwareLinked: false },
        remediation: {
          summary: "Check provider status page for customer impact and workarounds."
        },
        confidence: "high",
        rawProviderMetadata: { indicator, description, degradedCount: degraded.length, incidentCount: incidents.length }
      })
    );
  } else {
    // Healthy — still emit a quiet operational heartbeat so Outages can say "no major issues"
    records.push(
      makeRecord({
        id: `live_outage_${providerId}_ok`,
        type: "service-outage",
        title: providerName + ": no major outage indicated",
        summary: description || "All monitored components reported operational on the public status page.",
        publishedAt: retrievedAt,
        updatedAt: retrievedAt,
        retrievedAt,
        source: {
          providerId,
          providerName,
          sourceUrl,
          authorityLevel: "authoritative"
        },
        identifiers: {},
        entities: { vendors: [providerName], products: [providerName], platforms: ["cloud"] },
        severity: { label: "info" },
        exploitation: { knownExploited: false, exploitationEvidence: "unknown", ransomwareLinked: false },
        remediation: {},
        confidence: "high",
        rawProviderMetadata: { indicator: "none", healthy: true }
      })
    );
  }
  return records;
}

async function providerStatuspage(providerId, providerName, url) {
  const started = Date.now();
  const res = await fetchText(url);
  if (!res.ok) throw new Error(`${providerId} HTTP ${res.status}`);
  const summary = JSON.parse(res.text);
  const records = statuspageToRecords(providerId, providerName, summary, url.replace(/\/api\/v2\/summary\.json.*/, ""));
  return {
    providerId,
    providerName,
    status: "ok",
    records,
    meta: { included: records.length, responseMs: Date.now() - started, sourceUrl: url }
  };
}

async function providerAwsStatusRss() {
  const started = Date.now();
  const url = ENDPOINTS.awsStatusRss;
  const res = await fetchText(url, { accept: "application/rss+xml, application/xml, text/xml, */*" });
  if (!res.ok) throw new Error(`aws-status HTTP ${res.status}`);
  const items = parseRssItems(res.text, 15);
  const retrievedAt = nowIso();
  const active = items.filter((it) => {
    const t = `${it.title} ${it.summary}`.toLowerCase();
    return !/resolved|completed|service is operating normally/i.test(t);
  });
  let records;
  if (active.length) {
    records = active.slice(0, 5).map((it) =>
      makeRecord({
        id: `live_outage_aws_${Buffer.from(it.guid || it.title).toString("hex").slice(0, 16)}`,
        type: "service-outage",
        title: "AWS: " + it.title,
        summary: it.summary || it.title,
        publishedAt: it.publishedAt,
        updatedAt: it.publishedAt,
        retrievedAt,
        source: { providerId: "aws-status", providerName: "AWS Service Health", sourceUrl: it.link || url, authorityLevel: "authoritative" },
        entities: { vendors: ["Amazon Web Services"], products: ["AWS"], platforms: ["cloud"] },
        severity: { label: /service disruption|impaired|outage/i.test(it.title) ? "high" : "medium" },
        confidence: "high"
      })
    );
  } else {
    records = [
      makeRecord({
        id: "live_outage_aws_ok",
        type: "service-outage",
        title: "AWS: no major outage indicated in public RSS",
        summary: "Recent AWS status RSS items do not show an unresolved disruption (or feed was empty of active events).",
        publishedAt: retrievedAt,
        updatedAt: retrievedAt,
        retrievedAt,
        source: { providerId: "aws-status", providerName: "AWS Service Health", sourceUrl: url, authorityLevel: "authoritative" },
        entities: { vendors: ["Amazon Web Services"], products: ["AWS"], platforms: ["cloud"] },
        severity: { label: "info" },
        confidence: "moderate",
        rawProviderMetadata: { healthy: true, rssItems: items.length }
      })
    ];
  }
  return {
    providerId: "aws-status",
    providerName: "AWS Service Health",
    status: "ok",
    records,
    meta: { included: records.length, responseMs: Date.now() - started, sourceUrl: url, rssItems: items.length }
  };
}

async function providerGcpIncidents() {
  const started = Date.now();
  const url = ENDPOINTS.gcpIncidents;
  const res = await fetchText(url);
  if (!res.ok) throw new Error(`gcp-status HTTP ${res.status}`);
  const data = JSON.parse(res.text);
  const list = Array.isArray(data) ? data : [];
  const retrievedAt = nowIso();
  const open = list.filter((inc) => {
    const end = inc.end || inc.end_time;
    return !end;
  }).slice(0, 8);
  let records;
  if (open.length) {
    records = open.map((inc) =>
      makeRecord({
        id: `live_outage_gcp_${String(inc.id || inc.number || inc.service_key || Math.random()).slice(0, 24)}`,
        type: "service-outage",
        title: "Google Cloud: " + (inc.external_desc || inc.status_impact || "Open incident"),
        summary: String(inc.most_recent_update?.text || inc.external_desc || "").slice(0, 600),
        publishedAt: inc.begin || inc.created || retrievedAt,
        updatedAt: retrievedAt,
        retrievedAt,
        source: {
          providerId: "gcp-status",
          providerName: "Google Cloud Status",
          sourceUrl: inc.uri || "https://status.cloud.google.com/",
          authorityLevel: "authoritative"
        },
        entities: { vendors: ["Google"], products: ["Google Cloud"], platforms: ["cloud"] },
        severity: { label: /high|critical/i.test(String(inc.severity || "")) ? "high" : "medium" },
        confidence: "high"
      })
    );
  } else {
    records = [
      makeRecord({
        id: "live_outage_gcp_ok",
        type: "service-outage",
        title: "Google Cloud: no open incidents in public feed",
        summary: "Google Cloud status incidents.json reports no currently open incidents.",
        publishedAt: retrievedAt,
        updatedAt: retrievedAt,
        retrievedAt,
        source: {
          providerId: "gcp-status",
          providerName: "Google Cloud Status",
          sourceUrl: "https://status.cloud.google.com/",
          authorityLevel: "authoritative"
        },
        entities: { vendors: ["Google"], products: ["Google Cloud"], platforms: ["cloud"] },
        severity: { label: "info" },
        confidence: "high",
        rawProviderMetadata: { healthy: true, totalIncidentsListed: list.length }
      })
    ];
  }
  return {
    providerId: "gcp-status",
    providerName: "Google Cloud Status",
    status: "ok",
    records,
    meta: { included: records.length, responseMs: Date.now() - started, sourceUrl: url }
  };
}

async function providerGhsa() {
  const started = Date.now();
  const url = `${ENDPOINTS.ghsa}?per_page=${MAX_GHSA}&type=reviewed`;
  const res = await fetchText(url, {
    accept: "application/vnd.github+json",
    headers: { "X-GitHub-Api-Version": "2022-11-28" }
  });
  if (!res.ok) throw new Error(`ghsa HTTP ${res.status}`);
  const data = JSON.parse(res.text);
  if (!Array.isArray(data)) throw new Error("ghsa: unexpected payload");
  const retrievedAt = nowIso();
  const records = data.map((adv) => {
    const cves = (adv.cve_id ? [adv.cve_id] : []).concat(extractCves(JSON.stringify(adv.identifiers || [])));
    const uniq = [...new Set(cves.map((c) => String(c).toUpperCase()))];
    const sev = String(adv.severity || "unknown").toLowerCase();
    return makeRecord({
      id: `live_ghsa_${adv.ghsa_id || Buffer.from(adv.summary || "").toString("hex").slice(0, 16)}`,
      type: "vulnerability",
      title: (adv.ghsa_id ? adv.ghsa_id + ": " : "") + (adv.summary || "GitHub Security Advisory"),
      summary: stripHtml(adv.description || adv.summary || "").slice(0, 600),
      publishedAt: adv.published_at || null,
      updatedAt: adv.updated_at || adv.published_at || null,
      retrievedAt,
      source: {
        providerId: "ghsa",
        providerName: "GitHub Security Advisories",
        sourceUrl: adv.html_url || "https://github.com/advisories",
        authorityLevel: "authoritative"
      },
      identifiers: { cves: uniq, ghsa: adv.ghsa_id || null },
      entities: {
        vendors: (adv.vulnerabilities || [])
          .map((v) => v?.package?.ecosystem)
          .filter(Boolean)
          .slice(0, 5),
        products: (adv.vulnerabilities || [])
          .map((v) => v?.package?.name)
          .filter(Boolean)
          .slice(0, 8)
      },
      severity: { label: sev },
      exploitation: { knownExploited: false, exploitationEvidence: "unknown", ransomwareLinked: false },
      remediation: {
        patchesAvailable: Boolean(adv.vulnerabilities?.some((v) => v?.first_patched_version)),
        summary: adv.vulnerabilities?.some((v) => v?.first_patched_version)
          ? "Patched versions listed in GHSA."
          : undefined
      },
      confidence: "high"
    });
  });
  return {
    providerId: "ghsa",
    providerName: "GitHub Security Advisories",
    status: "ok",
    records,
    meta: { included: records.length, responseMs: Date.now() - started, sourceUrl: url }
  };
}

function buildBrief(scored, providers) {
  const bullets = [];
  const push = (text, basedOn = [], priority = 50) => {
    if (!text) return;
    bullets.push({ text, basedOnRecordIds: basedOn, priority });
  };

  const kev = scored.filter((r) => r.type === "exploited-vulnerability" || r.exploitation?.knownExploited);
  const kevRecent = kev.filter((r) => {
    // Prefer KEV dateAdded (publishedAt) — catalog updatedAt is often shared across entries
    const when = r.publishedAt;
    if (!when) return false;
    return daysBetween(when, nowIso()) <= 30;
  });
  if (kevRecent.length) {
    push(
      `CISA added or listed ${kevRecent.length} known-exploited vulnerabilit${kevRecent.length === 1 ? "y" : "ies"} in the last ~30 days (by KEV dateAdded) — review edge and internet-facing systems first.`,
      kevRecent.slice(0, 5).map((r) => r.id),
      10
    );
  } else if (kev.length) {
    push(
      `CISA KEV catalog present (${kev.length} items in this artifact). Prioritize anything matching your stack.`,
      kev.slice(0, 3).map((r) => r.id),
      20
    );
  }

  const ransomware = scored.filter((r) => r.exploitation?.ransomwareLinked);
  if (ransomware.length) {
    push(
      `${ransomware.length} KEV-linked vulnerabilit${ransomware.length === 1 ? "y is" : "ies are"} associated with ransomware campaigns — treat those as elevated operational risk.`,
      ransomware.slice(0, 5).map((r) => r.id),
      12
    );
  }

  const highActive = scored.filter(
    (r) =>
      r.exploitation?.knownExploited &&
      (r.severity?.label === "critical" ||
        r.severity?.label === "high" ||
        (Number(r.severity?.cvssScore) || 0) >= 7)
  );
  if (highActive.length) {
    push(
      `${Math.min(highActive.length, 2)}+ high-severity vulnerabilit${highActive.length === 1 ? "y is" : "ies are"} under known exploitation per official sources.`,
      highActive.slice(0, 4).map((r) => r.id),
      15
    );
  }

  const advisories = scored.filter((r) => r.type === "security-advisory" || r.type === "software-security-release");
  const notableAdv = advisories
    .filter((r) => daysBetween(r.publishedAt || r.retrievedAt, nowIso()) <= 10)
    .slice(0, 3);
  notableAdv.forEach((r) => {
    push(`${r.source?.providerName || "Vendor"}: ${r.title}`.slice(0, 180), [r.id], 25);
  });

  const outages = scored.filter((r) => r.type === "service-outage");
  const badOutages = outages.filter((r) => !(r.rawProviderMetadata && r.rawProviderMetadata.healthy));
  if (!badOutages.length) {
    push(
      "No major cloud outages currently indicated for AWS, Azure/M365 (if connected), Google Cloud, Cloudflare, GitHub, or OpenAI public status feeds in this run.",
      outages.slice(0, 3).map((r) => r.id),
      40
    );
  } else {
    badOutages.slice(0, 4).forEach((r) => {
      push(r.title, [r.id], 8);
    });
  }

  const edge = scored
    .filter((r) => r.priority?.band === "Immediate" || r.priority?.band === "High")
    .filter((r) =>
      /\b(vpn|exchange|firewall|gateway|ivanti|fortinet|citrix|pulse|moveit)\b/i.test(`${r.title} ${r.summary}`)
    );
  if (edge.length) {
    push(
      "Recommended priority today: patch or mitigate internet-facing appliances (VPN / mail / file-transfer / gateway) before routine workstation updates.",
      edge.slice(0, 3).map((r) => r.id),
      5
    );
  } else if (scored[0]) {
    push(
      `Recommended focus: review “${scored[0].title.slice(0, 100)}” (highest priority in this artifact) and confirm whether it touches your environment.`,
      [scored[0].id],
      30
    );
  }

  bullets.sort((a, b) => a.priority - b.priority);
  const trimmed = bullets.slice(0, 8);

  const failed = (providers || []).filter((p) => p.status === "error" || p.status === "planned");
  return {
    title: "Today's Cyber Brief",
    question: "What should I pay attention to right now?",
    generatedAt: nowIso(),
    bullets: trimmed,
    recommendation:
      edge.length > 0
        ? "Patch VPN / edge appliances before workstation rollouts."
        : "Confirm Immediate-band items against your inventory, then schedule advisory reviews.",
    providerCaveats: failed.map((p) => ({
      providerId: p.providerId,
      status: p.status,
      note: p.latestError || p.meta?.note || p.status
    })),
    method:
      "Bullets are interpretations of provider-backed records in this artifact. They are not new intelligence claims and not proof of compromise."
  };
}

function buildDerivedViews(scored) {
  const ransomware = scored
    .filter((r) => r.exploitation?.ransomwareLinked)
    .map((r) => ({
      id: r.id,
      title: r.title,
      cves: r.identifiers?.cves || [],
      vendors: r.entities?.vendors || [],
      products: r.entities?.products || [],
      priority: r.priority?.score,
      band: r.priority?.band,
      sourceUrl: r.source?.sourceUrl,
      remediation: r.remediation || {},
      note: "Association comes from CISA KEV ransomwareUse field (or equivalent official flag) — not a private campaign tracker."
    }));

  const zeroDay = scored
    .filter((r) => {
      const blob = `${r.title} ${r.summary}`.toLowerCase();
      const explicit = /\b(zero.?day|0.?day)\b/.test(blob);
      const kevUnpatched =
        r.exploitation?.knownExploited && r.remediation && r.remediation.patchesAvailable === false;
      const kevFresh =
        r.exploitation?.knownExploited && daysBetween(r.publishedAt || r.updatedAt || nowIso(), nowIso()) <= 30;
      return explicit || kevUnpatched || kevFresh;
    })
    .slice(0, 80)
    .map((r) => ({
      id: r.id,
      title: r.title,
      status: r.remediation?.patchesAvailable
        ? "patched-available"
        : r.exploitation?.knownExploited
          ? "currently-exploited"
          : "reported",
      cves: r.identifiers?.cves || [],
      priority: r.priority?.score,
      band: r.priority?.band,
      sourceUrl: r.source?.sourceUrl,
      note: "Public feeds rarely prove a true zero-day. This view highlights known-exploited / freshly listed / explicitly labeled items."
    }));

  const outages = scored.filter((r) => r.type === "service-outage");
  const threats = scored.filter((r) => r.priority?.band === "Immediate" || r.priority?.band === "High");

  return { ransomware, zeroDay, outages: outages.map((r) => r.id), threats: threats.slice(0, 50).map((r) => r.id) };
}

function appendHistory(brief, meta) {
  const prev = readJsonSafe(HISTORY_PATH) || { version: 1, entries: [] };
  const entry = {
    at: meta.generatedAt,
    trustState: meta.trustState,
    recordCount: meta.counts?.records,
    briefBullets: (brief.bullets || []).map((b) => b.text),
    recommendation: brief.recommendation
  };
  const entries = [entry].concat(prev.entries || []).slice(0, 60);
  writeJson(HISTORY_PATH, { version: 1, updatedAt: nowIso(), entries });
  return entries.slice(0, 14);
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
    ),
    runProvider(providerGhsa, "ghsa"),
    runProvider(providerAwsStatusRss, "aws-status"),
    runProvider(
      () => providerStatuspage("cloudflare-status", "Cloudflare Status", ENDPOINTS.cloudflareStatus),
      "cloudflare-status"
    ),
    runProvider(
      () => providerStatuspage("github-status", "GitHub Status", ENDPOINTS.githubStatus),
      "github-status"
    ),
    runProvider(
      () => providerStatuspage("openai-status", "OpenAI Status", ENDPOINTS.openaiStatus),
      "openai-status"
    ),
    runProvider(providerGcpIncidents, "gcp-status"),
    runProvider(
      async () => {
        try {
          return await providerRss(
            "azure-status",
            "Azure Status",
            ENDPOINTS.azureStatusRss,
            "service-outage",
            "authoritative"
          ).then((p) => {
            const retrievedAt = nowIso();
            const recent = (p.records || []).filter((r) => {
              const when = r.publishedAt || r.retrievedAt;
              return when && daysBetween(when, retrievedAt) <= 7;
            });
            if (!recent.length) {
              p.records = [
                makeRecord({
                  id: "live_outage_azure_ok",
                  type: "service-outage",
                  title: "Azure: no recent status-feed disruptions in the last 7 days",
                  summary: "Azure status feed had no parseable items from the past week (or feed empty).",
                  publishedAt: retrievedAt,
                  updatedAt: retrievedAt,
                  retrievedAt,
                  source: {
                    providerId: "azure-status",
                    providerName: "Azure Status",
                    sourceUrl: ENDPOINTS.azureStatusRss,
                    authorityLevel: "authoritative"
                  },
                  entities: { vendors: ["Microsoft"], products: ["Azure"], platforms: ["cloud"] },
                  severity: { label: "info" },
                  confidence: "moderate",
                  rawProviderMetadata: { healthy: true }
                })
              ];
            } else {
              p.records = recent.slice(0, 6).map((r) =>
                Object.assign({}, r, {
                  type: "service-outage",
                  title: r.title.startsWith("Azure") ? r.title : "Azure: " + r.title,
                  entities: { vendors: ["Microsoft"], products: ["Azure"], platforms: ["cloud"] },
                  rawProviderMetadata: Object.assign({}, r.rawProviderMetadata, { healthy: false })
                })
              );
            }
            return p;
          });
        } catch (err) {
          // Honest empty heartbeat — do not invent outages
          const retrievedAt = nowIso();
          return {
            providerId: "azure-status",
            providerName: "Azure Status",
            status: "ok",
            records: [
              makeRecord({
                id: "live_outage_azure_unavailable",
                type: "service-outage",
                title: "Azure: public status feed unavailable this run",
                summary: String(err && err.message ? err.message : err),
                publishedAt: retrievedAt,
                updatedAt: retrievedAt,
                retrievedAt,
                source: {
                  providerId: "azure-status",
                  providerName: "Azure Status",
                  sourceUrl: ENDPOINTS.azureStatusRss,
                  authorityLevel: "authoritative"
                },
                entities: { vendors: ["Microsoft"], products: ["Azure"], platforms: ["cloud"] },
                severity: { label: "info" },
                confidence: "preliminary",
                rawProviderMetadata: { healthy: true, feedError: true }
              })
            ],
            meta: { errorSoft: String(err && err.message ? err.message : err), sourceUrl: ENDPOINTS.azureStatusRss }
          };
        }
      },
      "azure-status"
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
        note: "MSRC CVRF/API integration planned — not simulated. Azure status RSS is connected separately.",
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
    },
    {
      providerId: "m365-status",
      providerName: "Microsoft 365 Status",
      status: "planned",
      records: [],
      meta: {
        note: "M365 public RSS endpoint varies by tenant/region; Azure status is used as partial Microsoft cloud signal for now.",
        attemptedUrl: ENDPOINTS.m365StatusRss
      }
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

  const signalStarted = Date.now();
  const signal = buildSignalIntelligence(scored, {
    previousRecords: previous?.records || [],
    providers: providerHealth,
    previousBrief: previous?.brief || null
  });
  const intelligenceRecords = signal.records;
  const fullCorrelation = correlateRecords(intelligenceRecords);
  writeCorrelationBundle(
    Object.assign({}, fullCorrelation, {
      signalEngineVersion: SIGNAL_ENGINE_VERSION,
      liveEngineVersion: ENGINE_VERSION
    }),
    CORRELATION_PATH
  );

  const byType = {};
  for (const r of intelligenceRecords) {
    byType[r.type] = (byType[r.type] || 0) + 1;
  }

  const brief = buildBrief(intelligenceRecords, providerHealth);
  // Prefer signal briefings for the Phase-2 home experience while keeping Phase-1 brief compatible
  if (signal.briefings?.morning) {
    const active = signal.briefings[signal.briefings.activeKind] || signal.briefings.morning;
    brief.headline = active.title;
    brief.title = active.title || brief.title;
    brief.bullets = (active.whatChanged || []).slice(0, 6).map((text) => ({
      text,
      basedOnRecordIds: active.basedOnRecordIds || [],
      priority: 10
    }));
    brief.recommendation =
      (active.recommendedActions && active.recommendedActions[0] && active.recommendedActions[0].label) ||
      brief.recommendation;
    brief.signalKind = signal.briefings.activeKind;
    brief.whoShouldCare = active.whoShouldCare || [];
    brief.expectedFuture = active.expectedFuture || [];
  }

  const derived = buildDerivedViews(intelligenceRecords);
  const history = appendHistory(brief, {
    generatedAt: nowIso(),
    trustState,
    counts: {
      records: intelligenceRecords.length,
      surfaced: signal.meta.surfacedByDefault,
      hidden: signal.meta.hiddenByDefault
    }
  });

  const live = {
    meta: {
      version: ENGINE_VERSION,
      signalEngineVersion: SIGNAL_ENGINE_VERSION,
      generatedAt: nowIso(),
      trustState,
      engine: "signalterrain-cyber-live-engine",
      signalProcessingMs: Date.now() - signalStarted,
      principles: [
        "No sample or fixture data in this artifact",
        "Official sources preferred",
        "Transparent priority factors",
        "Defensive awareness only",
        "Briefing interprets provider facts — never invents incidents",
        "Enrichment and recommendations are decision support, not compliance mandates",
        "Low-signal items hidden by default (noise reduction)"
      ],
      counts: {
        records: intelligenceRecords.length,
        byType,
        surfacedByDefault: signal.meta.surfacedByDefault,
        hiddenByDefault: signal.meta.hiddenByDefault,
        providersOk: okCount,
        providersError: errCount,
        correlationEntities: signal.correlation.entityCount,
        correlationRelationships: signal.correlation.relationshipCount
      }
    },
    brief,
    signal: {
      meta: signal.meta,
      briefings: signal.briefings,
      trends: signal.trends,
      timeline: signal.timeline,
      correlation: signal.correlation,
      noise: signal.noise,
      personaFramework: signal.personaFramework
    },
    derived,
    historyPreview: history,
    providers: providerHealth,
    records: intelligenceRecords,
    howToEvaluate: {
      title: "How SignalTerrain evaluates cyber information",
      points: [
        "CVSS measures technical severity, not personal exposure.",
        "KEV indicates known exploitation, not universal applicability to you.",
        "EPSS (when added) estimates exploitation probability, not certainty.",
        "Vendor advisories may be more current than aggregated databases.",
        "Technology-profile matching may require exact version confirmation.",
        "Absence of a match does not prove safety.",
        "News reporting is not equivalent to official confirmation.",
        "Outage signals come from public status pages/RSS — customer impact may differ.",
        "Priority scores explain their factors; they are decision support, not risk scores for your firm.",
        "Recommendations explain why — they are not automated remediation.",
        "ATT&CK technique links are keyword heuristics unless marked otherwise.",
        "Persona tags are relevance hints for future personalization, not assigned roles."
      ]
    }
  };

  // Refuse to write if somehow empty of real providers AND no previous — honest empty
  if (intelligenceRecords.length === 0 && okCount === 0) {
    const empty = {
      meta: {
        version: ENGINE_VERSION,
        signalEngineVersion: SIGNAL_ENGINE_VERSION,
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
    writeJson(GRAPH_PATH, recordsToGraphBundle(intelligenceRecords));
    console.error(
      `Wrote ${intelligenceRecords.length} records (${signal.meta.surfacedByDefault} surfaced) → ${LIVE_PATH} (${trustState})`
    );
    console.error(`Wrote live graph → ${GRAPH_PATH}`);
    console.error(`Wrote correlation → ${CORRELATION_PATH} (${fullCorrelation.relationshipCount} relationships)`);
    console.error(`Signal engine ${SIGNAL_ENGINE_VERSION} in ${signal.meta.processingMs}ms`);
  }

  writeJson(HEALTH_PATH, {
    generatedAt: nowIso(),
    engineVersion: ENGINE_VERSION,
    signalEngineVersion: SIGNAL_ENGINE_VERSION,
    trustState: readJsonSafe(LIVE_PATH)?.meta?.trustState || trustState,
    providers: providerHealth,
    livePath: path.relative(ROOT, LIVE_PATH),
    correlationPath: path.relative(ROOT, CORRELATION_PATH),
    recordCount: readJsonSafe(LIVE_PATH)?.records?.length || 0,
    signalProcessingMs: signal.meta?.processingMs ?? null,
    noiseHidden: signal.meta?.hiddenByDefault ?? null
  });

  console.error(`Health → ${HEALTH_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
