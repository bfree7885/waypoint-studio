# SignalTerrain Intelligence Map

**Status:** Design only — **not implemented**  
**Product:** SignalTerrain (Side Trails)  
**Related:** [CYBER-MAP.md](CYBER-MAP.md), [CYBER-EXPLORER.md](CYBER-EXPLORER.md), [CYBER-PROVENANCE.md](CYBER-PROVENANCE.md), [SIGNALTERRAIN-RECOMMENDATIONS.md](SIGNALTERRAIN-RECOMMENDATIONS.md), [SIGNALTERRAIN-DYNAMIC-DEFENSIVE-POSTURE-ENGINE.md](SIGNALTERRAIN-DYNAMIC-DEFENSIVE-POSTURE-ENGINE.md)

---

## 1. Purpose

The **Intelligence Map** is SignalTerrain’s calm geographic and relational awareness surface for **public, source-backed** cyber and infrastructure signals.

It answers:

> What is publicly reported, where is it coarsely located, and what should a defender understand if they open an incident?

It does **not** answer:

> How do I attack, exploit, scan offensively, or precisely locate victims?

This document is a **design contract**. No map runtime is shipped in this branch.

---

## 2. Design principles

| Prefer | Refuse |
| --- | --- |
| Source-backed markers only | Fabricated hotspots or “demo drama” pins |
| Coarse geography | Street/city victim targeting |
| Independent toggleable layers | One opaque “threat heat” blob |
| Incident dossier on click | Drive-by exploit kits or offensive tooling |
| Calm, intelligence-focused chrome | Urgency hacks, glow-spam, fake AI narration |
| Empty / sparse honesty | Inventing activity to fill the globe |

Every visible incident must carry **at least one evidence URL** (or official advisory identifier resolvable to a public document). No evidence → no marker.

---

## 3. What the map displays

Layers are independent. Users can show/hide each. Sparse layers stay sparse.

### 3.1 Current attacks

| Field | Design |
| --- | --- |
| Meaning | Publicly reported attack activity in progress or recently observed |
| Geography | Coarse only (`global` · `continental` · `regional` · `country-coarse`) |
| Required | Evidence link; confidence label; time window |
| Never | Precise victim coordinates; uncited “ongoing breach” pins |

### 3.2 Campaign spread

| Field | Design |
| --- | --- |
| Meaning | How a named *campaign class* (ransomware family, phishing wave, malware loader class) is described as spreading in public reporting |
| Geography | Multi-region coarse footprints or corridor annotations — schematic, not kinetic |
| Required | Campaign identifier + sources that justify each region claim |
| Never | Invented victim counts; offensive payload details |

### 3.3 Threat actor activity

| Field | Design |
| --- | --- |
| Meaning | Public activity attributed or clustered with clear confidence (confirmed / likely / possible / unknown) |
| Geography | Coarse operating or targeting *claims from sources* — labeled as claims |
| Required | Attribution confidence separate from location confidence |
| Never | Theatrical actor lore; claiming the viewer is targeted |

### 3.4 Infrastructure incidents

| Field | Design |
| --- | --- |
| Meaning | Public incidents affecting infrastructure operators (utilities, transit, health IT, etc.) when reported by official or reputable public sources |
| Geography | Country/region coarse; facility-level pins forbidden unless the *publisher* already published a public, non-sensitive location and product policy allows it |
| Required | Official or primary news evidence; no speculation pins |

### 3.5 BGP events

| Field | Design |
| --- | --- |
| Meaning | Publicly observable routing anomalies (hijack/leak reports, major visibility events) from cited measurement or operator sources |
| Geography | AS / country-coarse abstractions — not building-level |
| Required | Measurement or operator citation; time range; plain-language summary |
| Never | Instructions to manipulate routing |

### 3.6 DNS outages

| Field | Design |
| --- | --- |
| Meaning | Public resolver / authoritative / CDN-DNS disruption reports |
| Geography | Provider footprint or country-coarse affected regions per source |
| Required | Status page or reputable outage report URL |
| Never | Weaponized DNS technique guides |

### 3.7 Cloud outages

| Field | Design |
| --- | --- |
| Meaning | Public cloud provider regional/service degradations from official status surfaces |
| Geography | Provider region labels (e.g. published region codes) — not customer tenancy maps |
| Required | Official status evidence; service names as published |
| Never | Customer-specific blast radius invention |

### 3.8 Geographic clustering

| Field | Design |
| --- | --- |
| Meaning | Aggregation of nearby *coarse* markers into clusters for readability |
| Behavior | Cluster count + dominant layer mix; expand on zoom/focus |
| Required | Clusters dissolve to source-backed children — never invent a cluster without members |
| Honesty | Cluster ≠ new incident; UI must say “N sourced reports” |

---

## 4. Interaction: open an incident

Clicking a marker (or cluster child) opens an **Incident Dossier** panel — progressive, calm, evidence-first. Not a SOC war-room.

### 4.1 Dossier sections (required)

| Section | Content rules |
| --- | --- |
| **Summary** | Plain-language what/when/where-coarse/who-may-care; facts vs claims labeled |
| **Evidence** | Ordered citations (title, publisher, URL, retrieved/as-of); every material claim maps to ≥1 item |
| **Timeline** | Dated events from sources only; gaps called out; no filler timestamps |
| **Related CVEs** | Only CVEs linked by sources or official catalogs; show relation type (affects / exploited-in / mentioned) |
| **Official advisories** | CERT/CISA/vendor/government notices with primary links |
| **News** | Reputable public reporting; visually secondary to official advisories; no rumor laundering |
| **Defensive recommendations** | Guidance objects (`rec_*` shape): why, who, priority, evidence, expected duration; `autoExecute: false`; no offensive steps |

### 4.2 Dossier non-goals

- Exploit PoCs, payload builders, scanning recipes  
- “AI says you are compromised” without evidence  
- Auto-remediation buttons that change networks or accounts  
- Social engagement modules

### 4.3 Empty dossier sections

If a section has no sourced material, show an honest empty state (“No official advisory linked yet”) — do not hide the section to imply completeness.

---

## 5. Information architecture

```
┌──────────────────────────────────────────────────────────┐
│ Layer toggles · time window · confidence filter · search │
└────────────────────────────┬─────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────┐
│              Intelligence Map canvas                     │
│  attacks · campaigns · actors · infra · BGP · DNS · cloud│
│  + geographic clustering                                 │
└────────────────────────────┬─────────────────────────────┘
                             │ click
┌────────────────────────────▼─────────────────────────────┐
│ Incident Dossier                                         │
│ Summary · Evidence · Timeline · CVEs · Advisories · News │
│ · Defensive recommendations                              │
└──────────────────────────────────────────────────────────┘
```

Optional companion strip (not required for V1 design): list/table synchronized with map selection for accessibility and keyboard users.

---

## 6. Source-backing contract

### 6.1 Marker eligibility

A marker may render only if:

1. `evidence[]` length ≥ 1 with resolvable public URL **or** official advisory id that resolves to a public document, and  
2. `geography.precision` is one of the allowed coarse levels, and  
3. `neverPreciseVictim: true` (inherited from [CYBER-MAP.md](CYBER-MAP.md)), and  
4. `confidence` is set and never upgraded beyond what sources support.

### 6.2 Provenance fields (conceptual)

| Field | Purpose |
| --- | --- |
| `sourceId` / `publisher` | Who published |
| `url` | Where to verify |
| `publishedAt` / `retrievedAt` | Temporal honesty |
| `licenseOrTermsNote` | When relevant |
| `quoteOrClaimBound` | Optional short bound claim text |

Align with [CYBER-PROVENANCE.md](CYBER-PROVENANCE.md) when schemas are authored.

### 6.3 Failure modes

| Condition | UI |
| --- | --- |
| Layer feed unavailable | Layer shows unavailable — no invented pins |
| Evidence URL broken | Marker demoted or hidden; dossier shows broken-source state |
| Only news, no official advisory | Allowed, but advisory section empty and summary confidence capped |

---

## 7. Visual & UX direction

- Dark, quiet intelligence bench — consistent with SignalTerrain landing/mockup language  
- Layer colors distinct but not siren-red by default; critical only when sources + confidence justify  
- Clustering labels prefer counts + layer mix over alarming verbs  
- Motion: restrained focus/pan; respect `prefers-reduced-motion`  
- Mobile: map + bottom sheet dossier; all dossier sections reachable without hover-only UI  

---

## 8. Accessibility

- Keyboard: move focus across markers/list; Enter opens dossier; Escape closes  
- Screen readers: marker accessible name includes layer, coarse place, confidence, and “source-backed”  
- Do not rely on color alone for layer identity  

---

## 9. Security & ethics boundaries

**In scope:** public awareness, defensive literacy, cited infrastructure/routing/DNS/cloud disruption context.

**Out of scope forever for this map:**

- Offensive cyber operations tooling  
- Exploit development aids  
- Precise victim or personal targeting maps  
- Scraped private breach dumps presented as “intel”

---

## 10. Relationship to existing surfaces

| Surface | Relationship |
| --- | --- |
| Cyber Map V0.1 ([CYBER-MAP.md](CYBER-MAP.md)) | Precursor; Intelligence Map expands layers + dossier contract |
| Cyber Explorer | May host the map panel; dossier should reuse entity ids when present |
| Dynamic Defensive Posture Engine | Recommendations in the dossier should be compatible with daily posture deltas later |
| Dashboard mockup | Visual tone reference only — mockup ≠ this design’s live data contract |

---

## 11. Phased delivery (design roadmap only)

| Phase | Intent |
| --- | --- |
| A | This design + owner review |
| B | Schemas for markers, layers, dossier sections |
| C | Read-only map with 1–2 sourced layers + dossier shell |
| D | Full layer set + clustering + confidence filters |
| E | Recommendation join from posture/recommendation engines |

No ship dates implied.

---

## 12. Owner decisions needed

1. Confirm coarse precision ladder remains mandatory for all layers.  
2. Confirm whether BGP/DNS/cloud layers ship behind an “infrastructure” group toggle by default.  
3. Confirm news is always secondary to official advisories in dossier order (proposed: yes).  
4. Confirm cluster click expands list before opening a single dossier (proposed: yes).

---

## Related

- [docs/product/signalterrain-intelligence-map-owner-review.md](product/signalterrain-intelligence-map-owner-review.md)
