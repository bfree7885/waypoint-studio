# Cyber Data Model

**Status:** Architecture V0.1  
**Package:** `design-system/signalterrain/intelligence/cyber/`  
**Shared workspace:** `design-system/signalterrain/research/`

---

## Artifacts

| Artifact | Path |
|----------|------|
| Package index | `intelligence/cyber/index.json` |
| Entity kinds | `entity-kinds.json` |
| Relationship kinds | `relationship-kinds.json` |
| Entity schema | `schema-entity-v0.1.json` |
| Explainability schema | `schema-explainability-v0.1.json` |
| Priority score schema | `schema-priority-score-v0.1.json` |
| Priority factors / rules | `priority-factors.json`, `priority-rules.json` |
| Sample intelligence | `samples/cyber-intelligence.sample.json` |
| Sample research workspace | `samples/research-workspace.sample.json` |
| Research item schema | `research/schema-item-v0.1.json` |

---

## Entity envelope

Required: `meta`, `id`, `kind`, `title`, `summary`, `confidence`, `updatedAt`, `history`, `relationships`, `notes`, `citations`, `explainability`.

Optional: `severity`, `regions`, `industries`, `cveId`, `externalIds`, `ownerAnalysis`, `topicIds`, `uioIds`, `priorityInputs`.

Ids: `cy_[a-z0-9-]+` (dots allowed for CVE-like suffixes).

---

## Sample teaching cases

The sample bundle includes public historical cases (labeled **sample**):

Heartbleed · EternalBlue · WannaCry · NotPetya · SolarWinds · ProxyShell · Log4Shell · MOVEit

Rules:

- Do not fabricate technical facts  
- Cite government/vendor/standard sources  
- Include relationships, timeline, citations, confidence, mitigations  
- No exploit payloads or reproduction steps  

---

## Research workspace items

Kinds: `bookmark`, `collection`, `note`, `saved-search`, `tag`, `cross-reference`, `source-entry`, `timeline-pin`, `queue-item`

Domains: `radio` · `cyber` · `infrastructure` · `research` · `shared`

Storage principle: **local-first**.

---

## Mapping to Intelligence Core / SI

| Cyber model | Core / SI |
|-------------|-----------|
| Time-bound public event | UIO (`uio_*`) |
| Durable concept | Topic (`st_*`) |
| Attention score | Priority score (`cyp_*`) |
| Next action | Recommendation (`rec_*`, never auto-execute) |
| Observation card | Signal Card contracts (SI package) |

---

## Future ingestion without schema break

| Feed | Entity / edge targets |
|------|------------------------|
| Live advisories | `vendor-advisory`, `linked_advisory`, citations |
| CVE ingestion | `cve`, `vulnerability`, `affects` |
| KEV ingestion | `kev-entry`, priority `knownExploitation` |
| Ransomware tracking | `ransomware-family`, `threat-campaign` |
| Security news | `timeline-event` + UIO — curated, not endless feed UI |

**Pipeline:** See [CYBER-INGESTION-ARCHITECTURE.md](CYBER-INGESTION-ARCHITECTURE.md). Connectors emit `normalized-record[]` with provenance; dedupe preserves attribution before `cy_*` attach.

Providers remain designed interfaces until explicitly activated.

---

## Related

- [CYBER-INTELLIGENCE-MODEL.md](CYBER-INTELLIGENCE-MODEL.md)  
- [CYBER-GRAPH-ARCHITECTURE.md](CYBER-GRAPH-ARCHITECTURE.md)  
- [CYBER-PRIORITY-ENGINE.md](CYBER-PRIORITY-ENGINE.md)  
- [SIGNALTERRAIN-INTELLIGENCE-CORE.md](SIGNALTERRAIN-INTELLIGENCE-CORE.md)
