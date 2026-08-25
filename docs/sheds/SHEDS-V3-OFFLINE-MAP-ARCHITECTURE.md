# Sheds V3 — Offline Map Architecture (recon)

**Date:** 2026-08-24  
**Status:** Architecture investigation for a **future** phase — **not implemented** in V3.1  
**Constraint:** Do not claim offline maps until a prepared region works without cellular service.

---

## 1. Desired outcome

> A user prepares a Search Area at home and retains **useful** basemap context in the woods without cellular service.

Useful means: enough imagery/topo to navigate edges, fields, and roads inside a bounded region — not the entire planet.

---

## 2. Current state

| Layer | Online | Offline today |
| --- | --- | --- |
| Basemap tiles (CARTO / Esri) | Yes | Browser HTTP cache only — unreliable, opaque, not user-controlled |
| Observations / sessions / areas | localStorage | Yes (local-first) |
| GIS pack | Bundled + localStorage cache | Yes inside AOI |
| Weather / elevation | Open-Meteo | Honest unavailable |
| SGL | Network + cache | Partial |

V3.1 explicitly does **not** harvest Esri tiles into a private offline store (ToS / redistribution risk).

---

## 3. Options evaluated

### A. Service Worker + Cache API (opportunistic)

- Cache tiles as browsed  
- **Pros:** Low UX friction  
- **Cons:** Unpredictable quota; eviction; unclear provider compliance; “thought I downloaded it” failures on iOS  

**Verdict:** Insufficient as sole strategy; maybe assistive later.

### B. User-controlled region pack (IndexedDB)

- User selects bbox + zoom range + basemap id  
- Estimate MB; confirm; download into IndexedDB  
- SW serves from IDB when `navigator.onLine === false`  

**Pros:** Honest UX (“Downloaded Pike AOI · Topo · 180 MB”)  
**Cons:** Provider licensing must allow offline packaging; large storage; iOS Safari quota ~1GB class and opaque eviction  

### C. Vector tiles (MapLibre) + local style

- **Pros:** Smaller packs; styleable  
- **Cons:** Large migration from Leaflet; new renderer; still need imagery for satellite  

**Verdict:** Mid-term platform option, not V3.1.

### D. Licensed offline export (Esri / other)

- Use a provider product intended for offline (e.g. Esri export tiles / developer plan)  
- **Pros:** Legally clean  
- **Cons:** Cost, keys, account complexity  

**Verdict:** Preferred **legal** path if satellite offline is required.

### E. Open raster sources for offline packs only

- e.g. public-domain / clearly licensed regional imagery  
- **Pros:** Clear redistribution  
- **Cons:** Coverage uneven; quality varies  

---

## 4. Recommended path (next phase)

**Phase Offline-1 (Topo-first region pack)**

1. User picks SEARCH radius or drawn bbox at home (online).  
2. Sheds estimates tile count for **Topographic** (Esri or alternate licensed source) z12–z16.  
3. Download into IndexedDB with manifest `{ bounds, zooms, providerId, licenseNote, bytes, createdAt }`.  
4. Field mode: if offline and pack covers view → serve pack; else honest “Map tiles unavailable offline”.  
5. Satellite offline deferred until a **licensed** imagery export path exists.

**Do not** scrape World_Imagery into IDB under the current public tile URL.

---

## 5. iOS Safari notes

- SW supported but storage eviction aggressive under pressure  
- Prefer explicit pack size + “Keep this pack” messaging  
- Test background kill / low-storage  
- `navigator.storage.estimate()` for honesty  

---

## 6. Storage estimates (order of magnitude)

| Region | Basemap | Zooms | Rough size |
| --- | --- | --- | --- |
| 2 km SEARCH | Topo | 13–16 | tens of MB |
| 5 km | Topo | 12–16 | ~100–300 MB |
| Same + satellite | — | — | often 2–5× topo |

Always show estimate before download.

---

## 7. Acceptance criteria (future)

- Prepared region opens with tiles when airplane mode is on  
- Outside pack → no silent gray lies; clear message  
- Pack list deletable  
- License/attribution still visible  
- Observations/sessions still work offline (already)  

---

## 8. Non-goals

- Whole-country predownload  
- Background silent harvesting  
- Claiming “offline ready” without a pack  
- Weakening OSMF refusal
