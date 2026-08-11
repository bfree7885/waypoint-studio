/**
 * Enrich CISA KEV records with NIST NVD CVE 2.0 details.
 * Optional NVD_API_KEY improves rate limits; unauthenticated path remains useful.
 */
export const NVD_ENRICH_VERSION = "1.0.0";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickCvss(cve) {
  const m31 = cve.metrics?.cvssMetricV31?.[0]?.cvssData;
  const m30 = cve.metrics?.cvssMetricV30?.[0]?.cvssData;
  const m2 = cve.metrics?.cvssMetricV2?.[0]?.cvssData;
  const cv = m31 || m30 || m2;
  if (!cv) return { label: "unknown", cvssScore: undefined, cvssVector: undefined };
  return {
    label: String(cv.baseSeverity || "unknown").toLowerCase(),
    cvssScore: cv.baseScore,
    cvssVector: cv.vectorString
  };
}

function extractCpes(cve) {
  const vendors = new Set();
  const products = new Set();
  const configs = cve.configurations || [];
  for (const cfg of configs) {
    for (const node of cfg.nodes || []) {
      for (const match of node.cpeMatch || []) {
        const cpe = String(match.criteria || match.cpe23Uri || "");
        const parts = cpe.split(":");
        // cpe:2.3:a:vendor:product:...
        if (parts.length >= 5) {
          if (parts[3] && parts[3] !== "*") vendors.add(parts[3].replace(/_/g, " "));
          if (parts[4] && parts[4] !== "*") products.add(parts[4].replace(/_/g, " "));
        }
      }
    }
  }
  return {
    vendors: [...vendors].slice(0, 12),
    products: [...products].slice(0, 12)
  };
}

/**
 * @param {object} opts
 * @param {Array} opts.kevRecords
 * @param {(url: string, opts?: object) => Promise<{ok:boolean,status:number,text:string}>} opts.fetchText
 * @param {string} opts.nvdBaseUrl
 * @param {string} [opts.apiKey]
 * @param {number} [opts.maxEnrich]
 * @param {number} [opts.delayMs]
 * @param {(msg?: any) => void} [opts.log]
 */
export async function enrichKevWithNvd(opts) {
  const {
    kevRecords,
    fetchText,
    nvdBaseUrl,
    apiKey = "",
    maxEnrich = 25,
    delayMs = apiKey ? 250 : 700,
    log = () => {}
  } = opts;

  const targets = (kevRecords || []).slice(0, maxEnrich);
  let enriched = 0;
  let failed = 0;
  const errors = [];

  for (const rec of targets) {
    const cveId = (rec.identifiers?.cves || [])[0];
    if (!cveId) continue;
    try {
      await sleep(delayMs);
      const url = `${nvdBaseUrl}?cveId=${encodeURIComponent(cveId)}`;
      const headers = {};
      if (apiKey) headers.apiKey = apiKey;
      const res = await fetchText(url, { headers });
      if (!res.ok) {
        failed += 1;
        errors.push(`${cveId}: HTTP ${res.status}`);
        log("nvd enrich fail", cveId, res.status);
        continue;
      }
      const data = JSON.parse(res.text);
      const wrap = (data.vulnerabilities || [])[0];
      if (!wrap?.cve) {
        failed += 1;
        errors.push(`${cveId}: empty NVD payload`);
        continue;
      }
      const cve = wrap.cve;
      const desc =
        (cve.descriptions || []).find((d) => d.lang === "en") || (cve.descriptions || [])[0];
      const cvss = pickCvss(cve);
      const refs = (cve.references || []).map((r) => r.url).filter(Boolean).slice(0, 12);
      const cwes = [];
      (cve.weaknesses || []).forEach((w) => {
        (w.description || []).forEach((d) => {
          if (d.value && /^CWE-/i.test(d.value)) cwes.push(d.value);
        });
      });
      const cpe = extractCpes(cve);

      // Keep CISA KEV text authoritative for title/action; enrich with NVD facts.
      if (desc?.value && (!rec.summary || rec.summary.length < 40)) {
        rec.summary = desc.value.slice(0, 1200);
      }
      rec.severity = Object.assign({}, rec.severity || {}, {
        label: cvss.label !== "unknown" ? cvss.label : rec.severity?.label || "high",
        cvssScore: cvss.cvssScore ?? rec.severity?.cvssScore,
        cvssVector: cvss.cvssVector ?? rec.severity?.cvssVector
      });
      rec.identifiers = Object.assign({}, rec.identifiers || {}, {
        cves: rec.identifiers?.cves || [cveId],
        cwes: [...new Set([...(rec.identifiers?.cwes || []), ...cwes])].slice(0, 12)
      });
      if (cpe.vendors.length || cpe.products.length) {
        rec.entities = Object.assign({}, rec.entities || {}, {
          vendors: [...new Set([...(rec.entities?.vendors || []), ...cpe.vendors])].slice(0, 12),
          products: [...new Set([...(rec.entities?.products || []), ...cpe.products])].slice(0, 12)
        });
      }
      rec.nvdEnrichment = {
        enriched: true,
        enrichedAt: new Date().toISOString(),
        sourceUrl: `https://nvd.nist.gov/vuln/detail/${cveId}`,
        publishedAt: cve.published || null,
        lastModified: cve.lastModified || null,
        description: desc?.value || null,
        cvssScore: cvss.cvssScore ?? null,
        cvssVector: cvss.cvssVector ?? null,
        severity: cvss.label,
        references: refs,
        cwes,
        affectedProducts: cpe.products,
        affectedVendors: cpe.vendors
      };
      rec.rawProviderMetadata = Object.assign({}, rec.rawProviderMetadata || {}, {
        nvdEnriched: true,
        nvdLastModified: cve.lastModified || null
      });
      enriched += 1;
    } catch (err) {
      failed += 1;
      errors.push(`${cveId}: ${err && err.message ? err.message : err}`);
      log("nvd enrich exception", cveId, err);
    }
  }

  return {
    attempted: targets.length,
    enriched,
    failed,
    errors: errors.slice(0, 10),
    version: NVD_ENRICH_VERSION
  };
}
