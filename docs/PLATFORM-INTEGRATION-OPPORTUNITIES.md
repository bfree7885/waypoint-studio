# Remaining Integration Opportunities (before Version 1.0)

**Date:** 2026-07-18

---

## High value / natural next steps

1. **Sheds → WOS adapter write path** — optional “Save to Fieldry” that creates a real WOS observation (user-initiated).  
2. **Photo Coach session end → Fieldry** — render workflow link after a coaching session.  
3. **Volunteer completed → observation/history** — when status becomes `completed`, offer Fieldry note.  
4. **Savant vineyard sites → platform Places** — save site lat/lng into Locations.  
5. **Steepleaf favorites → platform Collections** — stop parallel favorite flags.  
6. **Studio search providers** for wines, teas, ST receivers (register via `platformSearch.register`).  
7. **Dashboard widget** “Your recent observations” using `platformObservations.recent()`.  
8. **Pause polling when hidden** (from Phase 2) still open.

---

## Medium

- Migrate dashboard favorites fully off `waypoint-dashboard-favorites-v1`.  
- GPX import into platform Places.  
- Offline areas registry (architecture only until tile strategy exists).  
- Coordinate format preference honored in all map UIs.  
- Federated query across `WDS.knowledge` + `platformGraph` in one “Connections” panel.

---

## Defer

- Accounts / multi-device sync  
- Push notifications  
- Automatic intelligence that scores habitat from cross-app mixes without new evidence  
- Merging ST cyber graph into platform graph store

---

## Beta readiness for “one platform” feel

**Ready now:** Settings door, search, observation ledger view, places, workflow links on core outdoor apps.  

**Still multi-app feeling:** Photo pipeline, kiosk, Sheds Leaflet island, ST cyber depth, specialty cellars/teas until adapters register.
