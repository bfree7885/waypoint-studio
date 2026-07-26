# Feature Matrix — Waypoint Studio (2026-07)

Classifications: **available and functional** · **partially available** · **prototype only** · **source-only** · **planned** · **absent**

---

## Dashboard (production @ `59c09de`)

| Feature | Status | Notes |
| --- | --- | --- |
| Today Outside summary | available and functional | Observational; often Partial |
| Conditions tile | available and functional | Open-Meteo / NWS |
| Air tile | partially available | Frequently Unavailable |
| Alerts tile | available and functional | Empty state OK; trust chip can say Waiting |
| Astronomy tile | partially available | Moonrise “Not reported” |
| Light tile | partially available | Needs sunrise/sunset; fails on NWS-only |
| Customize enable/disable | available and functional | 5 tiles only |
| Favorites / reorder / size | available and functional | |
| Category select-all / clear | **absent** on production | Present on unmerged catalog branch |
| Expanded 24–32 tile catalog | **source-only** | `feature/dashboard-functional-tile-catalog` |
| Kiosk (Rebuild hash) | partially available | Also separate `kiosk.html` (V3) |
| Location prompt / fallback | available and functional | |
| Honest loading / empty / error | available and functional | Strongest quality |

---

## Scenes pillars (requested map)

| Pillar | Status | Live entry |
| --- | --- | --- |
| Learn — Photo Coach | available and functional | `/apps/photo-coach/` |
| Create — Living Scenes | prototype only / preview | `/apps/scenes/living-scenes/` (“Future experience”) |
| Remember — Outdoor Journals | **absent** | — |
| Explore — Hidden Landscapes | available and functional (experimental) | `/apps/hidden-landscapes/` |

### Adjacent Scenes capabilities

| Capability | Status |
| --- | --- |
| Shoot Review | available and functional |
| Photo Library | available and functional |
| Upload + JPEG EXIF in Coach | partially available |
| Library EXIF depth | partially available |
| Scene Builder (early) | partially available (`/apps/waypoint-scenes/`) |
| Photographer Profile | partially available |
| Portfolio Foundation | source-only (feature branch) |
| Portfolio Assistant | source-only |
| Auto Portfolio Builder | source-only |
| Portfolio Health | source-only |
| Website ZIP output | source-only |

---

## Sheds

| Feature | Status |
| --- | --- |
| Map shell (Leaflet) | partially available |
| Ethics / honesty modal | available and functional |
| Location / GPS focus | partially available (often off) |
| Likelihood / heat surfaces | prototype only |
| Today’s Search framing | partially available |
| Local observation storage | partially available |
| Offline messaging | partially available |
| Regulations / legal access | honesty copy only — not a legal tool |
| Deer-specific model | prototype only — relative priority, not prediction |

**Stage:** working prototype / foundation — not a finished public product.

---

## Importer end-to-end

| Step | Score |
| --- | --- |
| 1. Insert Sony SD | implemented (OS mount) |
| 2. Auto-detect | implemented (Python GUI; no automated GUI tests) |
| 3. Import new photos | implemented (+ CLI tested) |
| 4. Preserve EXIF/location | partial (bytes preserved; weak cataloging into Scenes) |
| 5. Avoid duplicates | implemented (SHA ledger; CLI tested) |
| 6. Safely eject | **nonexistent** |
| 7. Open imported shoot in Scenes | **planned / stub** (“coming soon”) |
| 8. Portfolio / editing guidance | partial (manual Coach only) |
| 9. Create journal / portfolio / print / Living Scene | mostly planned / absent from importer |

**Access:** Desktop only (`waypoint-importer/`). Not a public web app.

---

## Platform / trust

| Feature | Status |
| --- | --- |
| About mission copy | available and functional |
| Contact form (FormSubmit) | available and functional |
| Privacy / Terms | available and functional |
| Support FAQ | partially available (“Coming later” card) |
| Incubator directory | available — correctly non-primary |
| Favicon | **absent** (404) |
| Security headers (CSP/XFO/XCTO) | **absent** |
| Service worker | absent (good — no SW stale risk) |
