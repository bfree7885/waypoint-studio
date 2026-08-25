# Sheds V3 — Access / Property Data Architecture (recon)

**Date:** 2026-08-24  
**Status:** Architecture investigation — **not implemented** beyond existing PA SGL overlay  
**Critical rule:** A drawn boundary is **never** legal permission to enter land.

---

## 1. Product intent

Help hunters understand **access context**:

- public vs likely private  
- state / federal / protected designations  
- seasonal closures when authoritative  
- stewardship cautions near sensitive winter habitat  

Not: a trespass-assurance product.

---

## 2. Current Sheds capability

| Layer | Status |
| --- | --- |
| PA State Game Lands (PASDA MapServer) | Optional overlay — access context only |
| Parcel / property lines | Absent |
| PAD-US / nationwide public lands | Absent |
| Seasonal closure feed | Absent |

Ethics sheet already states property/law responsibility.

---

## 3. Source classes to evaluate

| Need | Candidate sources | Notes |
| --- | --- | --- |
| Federal / multi-public | USGS **PAD-US** | Authoritative public lands inventory; update cycles; attribution |
| State wildlife lands | State GIS / PASDA-class services | PA SGL already; other states fragmented |
| USFS / NPS / FWS | Agency map services | Often WMS/FeatureServer; ToS vary |
| Protected / sensitive | PAD-US designation + state overlays | Stewardship messaging |
| Parcels | County cadastral / commercial aggregators | **Highest legal + licensing + freshness risk** |
| Closures | State wildlife regs / alerts | Prefer official bulletins; hard to automate nationwide |

---

## 4. Parcel data — caution

Parcels are:

- county-fragmented  
- uneven license (open vs restricted)  
- frequently stale  
- easy to misread as “I can go here”  

**Recommendation:** Defer nationwide parcels. If ever PA-first:

1. Use an explicit open county/state source with written license  
2. Label every feature: “Boundary for reference — not permission”  
3. Never auto-route into private parcels  
4. Prefer public-land positive identification over private-land inference  

Absence of a public-land polygon ≠ “free to enter.”

---

## 5. PA-first feasibility

| Step | Feasibility |
| --- | --- |
| Keep/improve SGL overlay | High |
| Add PAD-US clip for PA | Medium — large dataset; needs generalization + cache |
| DCNR / state parks / forests | Medium — multiple services |
| County parcels statewide | Low–Medium — uneven openness |

---

## 6. Recommended phased approach

**Access-1:** Public-lands positive layer (PAD-US generalized + existing SGL) with designation labels and “verify regulations” note.  

**Access-2:** Optional state wildlife land packs (one state at a time).  

**Access-3:** Seasonal closure notices as **Observed/Authoritative** cards when a reliable feed exists — never invent.  

**Access-X (research):** Parcels only with legal review + UX that cannot be mistaken for permission.

---

## 7. UI placement (when built)

- Toggle under **More → Map & layers** (alongside SGL)  
- No permanent chrome  
- Tap feature → sheet: name, manager, designation, link to regs if available, honesty disclaimer  

---

## 8. Ethics / safety copy (required)

On any access overlay:

> Boundaries are for awareness only. Always verify current regulations and landowner permission. Sheds does not grant access.

Winter stewardship (separate from parcels): when Habitat MODEL suggests concentration, surface disturbance caution — without claiming the app knows disturbance is “safe.”

---

## 9. Non-goals

- Guaranteeing legal access  
- Replacing onX Hunt property products  
- Scraping assessor sites  
- Showing parcels without license clarity
