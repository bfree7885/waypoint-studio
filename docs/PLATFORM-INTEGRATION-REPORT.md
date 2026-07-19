# Platform Integration Report — Product Recovery Phase 3

**Date:** 2026-07-18  
**Commit status:** **Not committed. Not pushed.** Owner review required.

---

## Mission outcome

Waypoint Studio now has a **usable shared spine** so apps stop feeling isolated:

| Capability | Module | Status |
|---|---|---|
| One profile / settings | `WDS.platform` + `WDS.platformIdentity` + `settings.html` | **Active** |
| Shared places | `WDS.platformPlaces` | **Active** |
| Unified observation ledger (query) | `WDS.platformObservations` | **Active** |
| Global search | `WDS.platformSearch` | **Active** (Studio home + Settings) |
| Shared collections | Existing `WDS.platform.Collections` (surfaced) | **Active** (Fieldry + Settings) |
| Local notifications inbox | `WDS.platformNotifications` | **Active** (opt-in) |
| Relationship / KG helpers | `WDS.platformGraph` | **Active** (seeds + derive) |
| Cross-app workflows | `WDS.platformWorkflows` | **Active** (natural links) |

No fabricated live intelligence was added. Cross-app value comes from **reusing the user’s own private records** with honesty labels.

---

## What “one platform” means now

1. **Enter once, find again** — Fieldry / Sheds / ForageCast journal / Volunteer planning appear in one observation ledger view (Settings → Observation history) and in Studio search.  
2. **One place list** — Saved + recent places via platform Locations (Settings → Places).  
3. **One settings door** — `/settings.html` for profile, units, theme, notifications, collections.  
4. **Natural handoffs** — “Continue in Studio” links only where the workflow is genuine (not forced popups).  
5. **Dashboard no longer peeks at Fieldry’s raw key alone** — prefers `platformObservations.wildlifeContext()`.

---

## Application touchpoints

| App | Integration this phase |
|---|---|
| Studio Home | Search box; Settings link; loads integration modules |
| Dashboard | Wildlife stats via observation bridge; places favorites preference |
| ForageCast | Workflow → Fieldry; Studio settings link; scripts on Settings |
| Fieldry | Workflows → Scenes/Sheds/ForageCast; Studio settings nav |
| Sheds | Workflow → Fieldry on home |
| Savant | Workflow → places; Studio settings link |
| SignalTerrain / Volunteer / Steepleaf | Integration scripts available on home |
| Photo Coach / Scenes / HL | Via shared design language + future workflow hooks (Photo Coach→Fieldry defined) |

---

## Honesty rules preserved

- Observation envelopes state they are **user-entered / private / not live detection**.  
- Graph seeds are labeled **architecture**, derived edges labeled **from your private observation**.  
- Notifications are **local inbox only**, disabled by default.  
- Search results declare local catalog + device data + knowledge — never invented detections.

---

## Verification

```text
node automation/test-platform-integration.mjs
```

---

## Docs in this suite

- `PLATFORM-INTEGRATION-CHANGELOG.md`
- `PLATFORM-CROSS-APP-WORKFLOWS.md`
- `PLATFORM-KNOWLEDGE-GRAPH-ARCHITECTURE.md`
- `PLATFORM-SHARED-SERVICES-INVENTORY.md`
- `PLATFORM-INTEGRATION-OPPORTUNITIES.md`
- `PLATFORM-INTEGRATION-TECHNICAL-DEBT.md`
