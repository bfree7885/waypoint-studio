# Cyber Normalization

**Status:** Architecture V0.1  
**Schema:** `design-system/signalterrain/intelligence/cyber/ingestion/schema-normalized-record/v0.1` → `schema-normalized-record-v0.1.json`  
**Runtime:** connector-specific normalizers in `wds-signalterrain-cyber-connectors.js` + shared finalize in `wds-signalterrain-cyber-ingest.js`

---

## Goal

Convert provider-specific payloads into **shared** SignalTerrain records. Provider quirks must not leak into the cyber graph or UIOs.

---

## Mapping examples

| Provider-shaped input | Normalized `recordType` |
|-----------------------|-------------------------|
| Vendor advisory | `shared-advisory` |
| CVE / NVD entry | `shared-vulnerability` |
| Security article / blog / academic | `research-item` |
| Threat / KEV bulletin | `threat-update` |
| Patch bulletin | `patch-bulletin` |
| Ransomware tracker row | `ransomware-report` |

---

## Fields always normalized

| Field | Notes |
|-------|-------|
| dates | `publishedAt`, `retrievedAt` (ISO when possible) |
| severity | Mapped to shared vocabulary (`info`…`critical` / `unknown`) — **separate from confidence** |
| references | URL list |
| products / vendors | String arrays |
| industries / regions | Awareness facets |
| confidence | Honesty label |
| citations | Labeled sources |
| provenance | At least one connector provenance object |
| identityKeys | Stable keys for dedupe (`cve:…`, `adv:…`, title fingerprint) |

---

## Shared finalize rules

1. Require title + summary  
2. Reject exploit-payload / weaponization language  
3. Compute `identityKeys.primary` from CVE → advisory → title fingerprint  
4. Set `meta.status` to `rejected` with reason when invalid — do not silently drop attribution of the attempt in health counters  

---

## Deduplication (pipeline layer)

Connectors never dedupe against each other.

The ingest framework merges likely duplicates using:

- shared CVEs  
- shared advisory ids  
- vendor keys + title fingerprint  
- identityKeys.primary  

**Provenance from every original source is retained.** Attribution is never collapsed to a single winner.

---

## Attach to shared models

Normalized records hint `targetEntityKind` (`cve`, `vendor-advisory`, `patch`, …) for later projection into `cy_*` entities and optional UIO emission — without embedding NVD/MSRC/CISA JSON shapes in those models.

---

## Related

- [CYBER-INGESTION-ARCHITECTURE.md](CYBER-INGESTION-ARCHITECTURE.md)  
- [CYBER-PROVENANCE.md](CYBER-PROVENANCE.md)  
- [CYBER-DATA-MODEL.md](CYBER-DATA-MODEL.md)
