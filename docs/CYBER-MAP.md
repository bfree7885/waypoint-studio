# Cyber Map (Geographic Awareness)

**Status:** V0.1  
**Data:** `design-system/signalterrain/intelligence/cyber/explorer/map-layers.json`  
**Schema:** `schema-map-marker-v0.1.json`

---

## Principle

Display only appropriate **public** information for awareness.

Never:

- Precise victim mapping  
- Street/city operational targeting  
- Sensitive operational overlays  

Always:

- Coarse precision (`global` / `continental` / `regional` / `country-coarse`)  
- `neverPreciseVictim: true` on markers  
- Independent layers that load lazily  

---

## Layers (sample)

| Layer | Examples |
|-------|----------|
| Major ransomware activity | Educational WannaCry / NotPetya placements |
| Government advisories | Public CISA-linked literacy |
| Vendor announcements | Patch/advisory awareness |
| Large public outages | Placeholder layer (no invented outage) |
| Regional notices | Coarse regional literacy slots |

---

## Rendering

Equirectangular SVG placement for efficiency — not a cartographic authority claim. Markers link back to cyber entity ids when present.

Layers are fetched when the Map panel opens and cached locally via the research workspace cache helpers for offline re-view of the sample package.
