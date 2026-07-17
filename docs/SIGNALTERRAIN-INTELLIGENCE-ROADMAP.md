# SignalTerrain — Intelligence Core Roadmap

**Status:** Architecture roadmap (directional — not a shipping calendar)  
**Core:** [SIGNALTERRAIN-INTELLIGENCE-CORE.md](SIGNALTERRAIN-INTELLIGENCE-CORE.md)  
**Complements:** [SIGNAL-INTELLIGENCE-ROADMAP.md](SIGNAL-INTELLIGENCE-ROADMAP.md)

Phased path from intelligence ingestion to carefully bounded defensive capabilities. **IDS and IPS are late phases.** This V0.1 sprint delivers architecture only for Phases 1–2 foundations.

---

## North star

SignalTerrain answers: What changed? Why does it matter? Who is affected? What should happen next? — with evidence, calm, and accumulating knowledge.

---

## Phases

| Phase | Name | Outcome | Runtime in V0.1 |
|-------|------|---------|-----------------|
| **1** | Intelligence ingestion | Provider interfaces + UIO normalization | Contracts + samples only |
| **2** | Correlation graph | Event↔event and event↔topic correlation patterns | Design + sample chains |
| **3** | Personal relevance | Rank summary by user context (role, assets later) | Not started |
| **4** | Network inventory | Optional local asset inventory for “who is affected” | Not started |
| **5** | Passive IDS | Read-only detection hints consuming Core — no blocking | Not started |
| **6** | Adaptive defensive recommendations | Richer recommendation engine with inventory context | Schema only now |
| **7** | Carefully bounded IPS | Extremely limited, explicit, reversible controls — if ever | Explicitly out of V0.1–V0.x |

---

## Phase 1 — Intelligence ingestion

- Provider interface contract (`schema-provider-v0.1.json`)  
- Normalize every event into UIO  
- Honesty: samples labeled; no fake live feeds  
- Prefer cited sources (CISA, NVD, NOAA, status pages) when connectors arrive later  

**Exit:** A provider can be stubbed and produce valid UIOs without UI panic chrome.

---

## Phase 2 — Correlation graph

- Pattern library for multi-hop chains  
- Link UIOs to living topics (`st_*`)  
- Confidence gates on `targets` / `caused_by` class edges  
- Explorer/summary can show “related intelligence”  

**Exit:** Sample geopolitical → shipping → advisory → CVE and vuln → exploitation → patch → mitigation chains validate in fixtures.

---

## Phase 3 — Personal relevance

- User/org profile hints (optional, privacy-first)  
- Summary ordering by relevance, not volume  
- Still no automatic action  

---

## Phase 4 — Network inventory

- Local-first inventory of systems/services  
- Maps “who is affected” from UIO `affectedSystems` to inventory  
- Never requires uploading home-network maps by default  

---

## Phase 5 — Passive IDS

- Consume Core UIOs + local signals  
- Present detections as intelligence — not red-wall SOC theater  
- **Detection only**; no inline blocking  

---

## Phase 6 — Adaptive defensive recommendations

- Recommendations conditioned on inventory + active UIOs  
- Still **recommendations only**  
- Human decides  

---

## Phase 7 — Carefully bounded IPS

- Only after Phases 1–6 are honest and reviewed  
- Explicit allowlists, reversible actions, audit trail  
- Narrow scope — not a general IPS product claim  

**V0.1 forbids implementing Phase 5–7.**

---

## Alignment with Signal Intelligence roadmap

SI roadmap covers shared engine modules and Signal Cards.  
This roadmap covers SignalTerrain’s **Intelligence Core** path (UIO → correlation → relevance → inventory → passive IDS → recommendations → bounded IPS).

They compose; they do not compete.

SignalTerrain Intelligence Core: [SIGNALTERRAIN-INTELLIGENCE-CORE.md](SIGNALTERRAIN-INTELLIGENCE-CORE.md) · [SIGNALTERRAIN-INTELLIGENCE-ROADMAP.md](SIGNALTERRAIN-INTELLIGENCE-ROADMAP.md).

---

## Status vocabulary

| Label | Meaning |
|-------|---------|
| Architecture | Contracts / docs / prototypes |
| Foundation | Local helpers / samples |
| Planned | Intended; not available |
| Preview | Real but limited |
| Active | Honestly usable |

Never advertise Planned phases as Available.

---

## Related

- [SIGNALTERRAIN-CORRELATION-ENGINE.md](SIGNALTERRAIN-CORRELATION-ENGINE.md)  
- [SIGNALTERRAIN-RECOMMENDATIONS.md](SIGNALTERRAIN-RECOMMENDATIONS.md)  
- [SIGNALTERRAIN-INTELLIGENCE-CORE.md](SIGNALTERRAIN-INTELLIGENCE-CORE.md)
