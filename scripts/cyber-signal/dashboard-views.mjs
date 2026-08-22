/**
 * Build the first SignalTerrain real-dashboard JSON from live records + health.
 * Honest absence over fabricated activity. No threat-level or world-map claims.
 */

function dayKey(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function withinHours(iso, hours) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= hours * 3600 * 1000;
}

function providerDataState(p) {
  if (!p) return "SOURCE UNAVAILABLE";
  if (p.status === "ok") return "REAL";
  if (p.status === "cached") return "CACHED REAL";
  if (p.status === "planned") return "NO CURRENT DATA";
  if (p.status === "error") return "SOURCE UNAVAILABLE";
  return "SOURCE UNAVAILABLE";
}

function recordDataState(rec, providersById) {
  if (rec?._fromCache || rec?.freshness === "stale") return "CACHED REAL";
  const pid = rec?.source?.providerId;
  const p = pid ? providersById.get(pid) : null;
  if (p?.status === "ok") return "REAL";
  if (p?.status === "cached") return "CACHED REAL";
  if (!pid) return "SOURCE UNAVAILABLE";
  return providerDataState(p);
}

function slimKev(rec, dataState) {
  const cve = (rec.identifiers?.cves || [])[0] || null;
  const nvd = rec.nvdEnrichment || null;
  return {
    id: rec.id,
    dataState,
    cve,
    title: rec.title,
    vendor: (rec.entities?.vendors || [])[0] || null,
    product: (rec.entities?.products || [])[0] || null,
    dateAdded: rec.publishedAt,
    requiredAction: rec.remediation?.summary || null,
    dueDate: rec.remediation?.deadline || null,
    ransomwareCampaignAssociation:
      rec.exploitation?.ransomwareLinked === true
        ? String(rec.rawProviderMetadata?.knownRansomwareCampaignUse || "Known")
        : null,
    summary: rec.summary,
    cvssScore: nvd?.cvssScore ?? rec.severity?.cvssScore ?? null,
    cvssVector: nvd?.cvssVector ?? rec.severity?.cvssVector ?? null,
    nvdDescription: nvd?.description || null,
    nvdPublishedAt: nvd?.publishedAt || null,
    nvdLastModified: nvd?.lastModified || null,
    nvdReferences: nvd?.references || [],
    nvdEnriched: Boolean(nvd?.enriched),
    sourceName: rec.source?.providerName || "CISA KEV",
    sourceUrl: rec.source?.sourceUrl || "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
    nvdUrl: cve ? `https://nvd.nist.gov/vuln/detail/${cve}` : null,
    retrievedAt: rec.retrievedAt,
    updatedAt: rec.updatedAt
  };
}

function slimNvd(rec, dataState) {
  const cve = (rec.identifiers?.cves || [])[0] || null;
  return {
    id: rec.id,
    dataState,
    cve,
    title: rec.title || cve,
    description: rec.summary,
    cvssScore: rec.severity?.cvssScore ?? null,
    cvssVector: rec.severity?.cvssVector ?? null,
    severity: rec.severity?.label || null,
    publishedAt: rec.publishedAt,
    lastModified: rec.updatedAt,
    cwes: rec.identifiers?.cwes || [],
    products: rec.entities?.products || [],
    vendors: rec.entities?.vendors || [],
    sourceName: rec.source?.providerName || "NIST NVD",
    sourceUrl: rec.source?.sourceUrl || (cve ? `https://nvd.nist.gov/vuln/detail/${cve}` : "https://nvd.nist.gov/"),
    retrievedAt: rec.retrievedAt
  };
}

function slimAdvisory(rec, dataState) {
  return {
    id: rec.id,
    dataState,
    title: rec.title,
    publishedAt: rec.publishedAt,
    updatedAt: rec.updatedAt,
    type: rec.type || "security-advisory",
    description: String(rec.summary || "").slice(0, 500),
    sourceName: rec.source?.providerName || "CISA Advisories",
    sourceUrl: rec.source?.sourceUrl || "https://www.cisa.gov/news-events/cybersecurity-advisories",
    retrievedAt: rec.retrievedAt
  };
}

/**
 * @param {object} live - live.json document (or in-memory equivalent)
 * @param {object} health - health.json document
 */
export function buildDashboardViews(live, health) {
  const records = live?.records || [];
  const providers = live?.providers || health?.providers || [];
  const providersById = new Map(providers.map((p) => [p.providerId, p]));
  const generatedAt = live?.meta?.generatedAt || health?.generatedAt || new Date().toISOString();
  const today = dayKey(generatedAt);

  const kev = records
    .filter((r) => r.source?.providerId === "cisa-kev" || r.type === "exploited-vulnerability")
    .map((r) => slimKev(r, recordDataState(r, providersById)));

  const nvd = records
    .filter((r) => r.source?.providerId === "nvd")
    .map((r) => slimNvd(r, recordDataState(r, providersById)))
    .sort((a, b) => String(b.lastModified || b.publishedAt || "").localeCompare(String(a.lastModified || a.publishedAt || "")));

  const advisories = records
    .filter((r) => r.source?.providerId === "cisa-advisories")
    .map((r) => slimAdvisory(r, recordDataState(r, providersById)))
    .sort((a, b) => String(b.updatedAt || b.publishedAt || "").localeCompare(String(a.updatedAt || a.publishedAt || "")));

  const ransomware = kev.filter((k) => k.ransomwareCampaignAssociation);

  const changed = [];
  for (const k of kev) {
    if (dayKey(k.dateAdded) === today || withinHours(k.dateAdded, 36)) {
      changed.push({
        at: k.dateAdded,
        kind: "kev-added",
        text: `${k.cve || "KEV entry"} added to CISA KEV${k.vendor ? ` (${k.vendor}${k.product ? " / " + k.product : ""})` : ""}.`,
        sourceUrl: k.sourceUrl,
        recordId: k.id,
        dataState: k.dataState
      });
    }
  }
  for (const n of nvd) {
    if (withinHours(n.lastModified || n.publishedAt, 36) || dayKey(n.lastModified) === today || dayKey(n.publishedAt) === today) {
      changed.push({
        at: n.lastModified || n.publishedAt,
        kind: "nvd-updated",
        text: `${n.cve || "CVE"} new/updated in NVD${n.cvssScore != null ? ` (CVSS ${n.cvssScore})` : ""}.`,
        sourceUrl: n.sourceUrl,
        recordId: n.id,
        dataState: n.dataState
      });
    }
  }
  for (const a of advisories) {
    if (withinHours(a.updatedAt || a.publishedAt, 36) || dayKey(a.updatedAt) === today || dayKey(a.publishedAt) === today) {
      changed.push({
        at: a.updatedAt || a.publishedAt,
        kind: "advisory",
        text: `CISA advisory: ${a.title}`,
        sourceUrl: a.sourceUrl,
        recordId: a.id,
        dataState: a.dataState
      });
    }
  }
  changed.sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));

  const sourceHealth = providers
    .filter((p) =>
      ["cisa-kev", "nvd", "cisa-advisories"].includes(p.providerId) || p.status === "ok" || p.status === "error" || p.status === "cached"
    )
    .map((p) => ({
      providerId: p.providerId,
      name: p.providerName,
      dataState: providerDataState(p),
      status: p.status,
      lastRefresh: p.lastAttemptedAt || null,
      lastSuccessfulAt: p.lastSuccessfulAt || null,
      freshness: p.status === "ok" ? "fresh" : p.status === "cached" ? "stale" : p.status === "planned" ? "none" : "failed",
      success: p.status === "ok" || p.status === "cached",
      recordCount: p.recordCount ?? 0,
      sourceUrl: p.meta?.sourceUrl || null,
      latestError: p.latestError || p.meta?.error || null
    }));

  const primaryIds = new Set(["cisa-kev", "nvd", "cisa-advisories"]);
  const primary = sourceHealth.filter((s) => primaryIds.has(s.providerId));
  const primaryOk = primary.filter((s) => s.status === "ok").length;

  let trustState = live?.meta?.trustState || health?.trustState || "Unknown";
  let overallDataState = "REAL";
  if (primaryOk === 0 && kev.length + nvd.length + advisories.length === 0) {
    overallDataState = "SOURCE UNAVAILABLE";
  } else if (primaryOk === 0) {
    overallDataState = "CACHED REAL";
  } else if (primaryOk < primary.length) {
    overallDataState = "REAL"; // partial still shows real where available
  }

  return {
    meta: {
      version: "1.0.0",
      generatedAt,
      trustState,
      dataState: overallDataState,
      engine: live?.meta?.engine || "signalterrain-cyber-live-engine",
      principles: [
        "Every panel is REAL, CACHED REAL, SOURCE UNAVAILABLE, or NO CURRENT DATA",
        "No fabricated threat levels, attack maps, or demo CVEs",
        "Ransomware signal only from authoritative KEV association",
        "Source attribution required on every important item"
      ],
      counts: {
        kev: kev.length,
        nvd: nvd.length,
        nvdEnrichedKev: kev.filter((k) => k.nvdEnriched).length,
        advisories: advisories.length,
        ransomwareLinkedKev: ransomware.length,
        changedToday: changed.length
      }
    },
    whatChangedToday: changed.slice(0, 40),
    activelyExploitedKev: kev.slice(0, 200),
    newUpdatedNvd: nvd.slice(0, 60),
    cisaAdvisories: advisories.slice(0, 40),
    ransomwareSignal: {
      dataState: ransomware.length ? (ransomware.every((r) => r.dataState === "CACHED REAL") ? "CACHED REAL" : "REAL") : "NO CURRENT DATA",
      note: ransomware.length
        ? "Association comes from CISA KEV knownRansomwareCampaignUse — not a private campaign tracker."
        : "No authoritative ransomware campaign associations in the current KEV slice.",
      items: ransomware.slice(0, 50)
    },
    sourceHealth,
    absences: {
      threatLevel: "NO CURRENT DATA — SignalTerrain does not invent a composite threat level without an authoritative source.",
      worldAttackMap: "NO CURRENT DATA — no authoritative global attack map is integrated; schematic maps are not shown as live activity."
    }
  };
}
