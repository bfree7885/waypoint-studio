# Cyber Awareness Intelligence Model

**Status:** Architecture V0.1  
**Engine:** SignalTerrain Cyber Awareness Intelligence Engine  
**Package:** `design-system/signalterrain/intelligence/cyber/`  
**UI:** `apps/signalterrain/cyber/`  
**Tagline:** What should I pay attention to today?

This is the foundational **Cyber Awareness reasoning layer** for SignalTerrain.

It is **not** an IDS, SIEM, vulnerability scanner, or offensive security product.

It is educational, defensive, transparent, and privacy-first.

---

## Purpose

Help people understand cybersecurity information by:

1. Ingesting structured records (later: feeds)  
2. Organizing them as typed entities  
3. Connecting them with first-class relationships  
4. Prioritizing with **explainable** scores  
5. Explaining what is Known / Likely / Possible / Unknown  

Live feeds are **out of scope** for V0.1. Architecture must accept them later without rewriting the core model.

---

## Layering

```
Signal Intelligence contracts (observation / Signal Card)
        │
Living knowledge graph (st_* topics)
        │
Intelligence Core (UIO → correlate → recommend)
        │
Cyber Awareness Engine (this) — cyber entity graph + priority + explainability
        │
SignalTerrain UI (cyber/ + summary + graph)
```

Do **not** create a separate Studio nav product for Cyber.

---

## Core entity kinds

Catalog: `entity-kinds.json`.

Threat · Threat Campaign · Malware Family · Ransomware Family · Vulnerability · CVE · KEV Entry · Vendor Advisory · Patch · Exploit Technique · Affected Software · Affected Hardware · Threat Actor (descriptive only) · Mitigation · Indicator (high-level only) · Reference · Timeline Event · Source · Confidence · Region · Industry · Severity

Every entity supports:

| Field | Role |
|-------|------|
| `history` | What changed over time |
| `relationships` | First-class edges |
| `notes` | Local research notes |
| `citations` | Sources |
| `confidence` | Honesty label |
| `updatedAt` | Freshness |
| `ownerAnalysis` | Human analysis |
| `explainability` | Required Q&A + Known/Likely/Possible/Unknown |

Schema: `schema-entity-v0.1.json` · Explainability: `schema-explainability-v0.1.json`

---

## Relationships (first-class)

Examples:

| Relationship | Example |
|--------------|---------|
| `uses` | Threat uses Exploit Technique |
| `affects` | CVE affects Product |
| `mitigates` | Mitigation reduces Threat |
| `fixes` | Patch fixes Vulnerability |
| `targets` | Campaign targets Industry |
| `linked_advisory` | Threat/CVE linked to Advisory |
| `exploited_in` | Vulnerability exploited in Campaign (literacy) |

Kinds map into the living graph catalog (`relationship-kinds.json`). Editorial gates apply to attribution-sensitive edges.

---

## Explainability contract

Every intelligence item should answer:

- What is it?  
- Why does it matter?  
- Who is affected?  
- What changed?  
- What should someone read next?  
- What should someone watch?  
- What remains uncertain?  

Separate arrays — never blur:

- **Known Facts**  
- **Likely**  
- **Possible**  
- **Unknown**  

---

## Shared research workspace

RF and Cyber share `design-system/signalterrain/research/`:

Bookmarks · Collections · Research notes · Saved searches · Tags · Cross references · Source library · Timeline pins · Reading queue · Technical / government / vendor / academic source classes

Do not duplicate workspace stacks per domain.

---

## Future ingestion (same architecture)

| Future source | Maps into |
|---------------|-----------|
| Vendor advisories | `vendor-advisory` + `linked_advisory` |
| CVE / NVD | `cve` + `vulnerability` + `affects` |
| CISA KEV | `kev-entry` + known-exploitation priority input |
| Ransomware tracking | `ransomware-family` / `threat-campaign` |
| Security news | Structured `timeline-event` / UIO — **not** a feed product |

Providers stay interface-first (see Intelligence Core `schema-provider-v0.1.json`).

---

## Related docs

- [CYBER-DATA-MODEL.md](CYBER-DATA-MODEL.md)  
- [CYBER-GRAPH-ARCHITECTURE.md](CYBER-GRAPH-ARCHITECTURE.md)  
- [CYBER-PRIORITY-ENGINE.md](CYBER-PRIORITY-ENGINE.md)  
- [SIGNALTERRAIN-INTELLIGENCE-CORE.md](SIGNALTERRAIN-INTELLIGENCE-CORE.md)  
- [SIGNALTERRAIN-RECOMMENDATIONS.md](SIGNALTERRAIN-RECOMMENDATIONS.md)
