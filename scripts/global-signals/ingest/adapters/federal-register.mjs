/**
 * Federal Register API adapter — official US government documents.
 * Used for sanctions / trade / policy signals from Treasury, OFAC, USTR, Commerce.
 */
import { fetchJson, nowIso } from "../../lib/io.mjs";
import { makeProvenance } from "../../lib/provenance.mjs";
import { makeEventId } from "./_rss.mjs";

const AGENCIES = [
  { slug: "foreign-assets-control-office", eventType: "sanctions", label: "OFAC" },
  { slug: "industry-and-security-bureau", eventType: "export_import_controls", label: "BIS" },
  { slug: "trade-representative-office-of-united-states", eventType: "trade_policy", label: "USTR" },
  { slug: "u-s-customs-and-border-protection", eventType: "trade_policy", label: "CBP" }
];

function classifyTitle(title, fallback) {
  const t = String(title || "").toLowerCase();
  if (/sanction|sdn|blocked person|ofac/.test(t)) return "sanctions";
  if (/tariff|section 301|duty|duties/.test(t)) return "tariffs";
  if (/export|import|entity list|ear\b|license/.test(t)) return "export_import_controls";
  if (/trade|wto|preferential/.test(t)) return "trade_policy";
  return fallback;
}

export async function fetchFederalRegister({ perPage = 15, timeoutMs = 20000 } = {}) {
  const retrievedAt = nowIso();
  const events = [];
  const failures = [];
  let okSources = 0;

  for (const agency of AGENCIES) {
    const url =
      `https://www.federalregister.gov/api/v1/documents.json?per_page=${perPage}&order=newest` +
      `&conditions%5Bagencies%5D%5B%5D=${encodeURIComponent(agency.slug)}`;
    try {
      const res = await fetchJson(url, { timeoutMs });
      if (!res.ok || !res.json) {
        failures.push({
          adapter: "federal-register",
          agency: agency.slug,
          error: `HTTP ${res.status}`,
          at: retrievedAt
        });
        continue;
      }
      okSources += 1;
      const results = res.json.results || [];
      for (const doc of results) {
        const title = String(doc.title || "").trim();
        const sourceUrl = doc.html_url || doc.pdf_url || null;
        if (!title || !sourceUrl) continue;
        const publishedAt = doc.publication_date
          ? new Date(`${doc.publication_date}T12:00:00Z`).toISOString()
          : null;
        const abstract = String(doc.abstract || doc.excerpts || "").trim();
        const summary = abstract
          ? abstract.slice(0, 600)
          : `Federal Register document from ${agency.label}: ${title}`;
        const eventType = classifyTitle(title, agency.eventType);
        const id = makeEventId("fr", doc.document_number || sourceUrl, title);
        events.push({
          id,
          title,
          summary,
          eventType,
          entities: [agency.label, ...(doc.agencies || []).map((a) => a.name).filter(Boolean)].slice(0, 6),
          countries: ["United States"],
          regions: ["North America"],
          occurredAt: publishedAt,
          publishedAt,
          evidence: [
            {
              kind: "official_document",
              label: `Federal Register ${doc.document_number || ""}`.trim(),
              url: sourceUrl
            }
          ],
          status: "active",
          provenance: makeProvenance({
            source: "federal-register",
            sourceUrl,
            publisher: "Federal Register",
            publishedAt,
            retrievedAt
          }),
          sourceRefs: [{ adapter: "federal-register", agency: agency.slug, documentNumber: doc.document_number }]
        });
      }
    } catch (err) {
      failures.push({
        adapter: "federal-register",
        agency: agency.slug,
        error: String(err.message || err),
        at: retrievedAt
      });
    }
  }

  return {
    adapter: "federal-register",
    events,
    sourceHealth: { ok: okSources, attempted: AGENCIES.length, failures }
  };
}
