# Fieldry — Life List MVP

**Status:** Usable MVP on shared Platform + WOS + Knowledge  
**Path:** `apps/fieldry/`  
**Tone:** Curiosity and personal growth — no leaderboards, followers, rankings, or streak pressure.

Fieldry is a real-life Pokédex for observing the natural world. Users record encounters, build a personal life list, review history, and earn gentle discovery achievements.

---

## User flow

1. Open Fieldry home (`#/`)
2. Browse categories (`#/browse`) or open capture (`#/new`)
3. Search shared Knowledge suggestions (sample catalog) or enter a manual / unidentified subject
4. Set date, time, location precision, privacy, notes, tags, confidence
5. Save through WOS into `waypoint-fieldry-observations-v1`
6. View the record in history (`#/history`) and detail (`#/obs/<id>`)
7. See the subject on the life list (`#/life`)
8. Review personal statistics and achievements (`#/stats`)
9. Open a Knowledge profile when linked (`#/knowledge/<id>`)

---

## Routes

| Hash | View |
|------|------|
| `#/` | Home |
| `#/new` | Record observation |
| `#/edit/<id>` | Edit |
| `#/obs/<id>` | Detail |
| `#/history` | Observation history |
| `#/life` | Life list |
| `#/browse` | Category browse |
| `#/stats` | Statistics + achievements |
| `#/knowledge/<id>` | Knowledge profile |

---

## Canonical categories

Source of truth: `apps/fieldry/js/fieldry-life-list.js` → `WaypointFieldryLifeList.CATEGORIES`

birds, mammals, reptiles, amphibians, fish, insects, butterflies, dragonflies, plants, trees, mushrooms, lichens, rocks, minerals, clouds, weather, plus `other`.

`OBSERVATION_TYPES` in `fieldry-util.js` remains a separate optional record-type axis (wildlife, plant, phenology, …).

---

## WOS integration

- Drafts via `WDS.observations.emptyObservation({ source: "fieldry" })`
- Persist with `normalizeObservation` (now preserves `extensions`)
- App data under `observation.extensions.fieldry` and mirrored in `meta.fieldry` for resilience
- Fields include: `category`, `unidentified`, `identificationStatus`, `tags`, `knowledgeId`, denormalized names, `privacyLevel`, `count`, `mediaRefs`
- Location precision uses WOS enums: `exact` | `obfuscated` (UI: Approximate) | `county` (UI: Regional) | `hidden`
- Sharing privacy levels (extension): `private` (default) | `shared` | `public` | `anonymized`

Precise coordinates are never shown in UI when precision is regional, approximate-without-intent, or hidden.

---

## Knowledge Platform

- Scripts loaded on the Fieldry page; `WDS.knowledge.configure({ base: "../../design-system/knowledge/" })`
- Demo bundle preloaded and honestly labeled as a **sample catalog**
- Capture uses `WDS.knowledge.search(query, { domain: "fieldry", category })`
- Profiles use `WDS.knowledge.get` / `related`
- Offline: manual and unidentified capture still works; search shows an unavailable state (no fake results)

---

## Life list & statistics

Derived from observations — not a parallel database.

- `deriveLifeList(observations, options)` — unique subjects, first/last dates, counts, filters
- `FieldryStats.derive` — personal reflective metrics only
- `FieldryAchievements` — small deterministic registry (first observation, first bird/mushroom/geology, five categories, revisit, four seasons, identified later, ten trees, night observation)

---

## Storage & migration

| Key | Purpose |
|-----|---------|
| `waypoint-fieldry-observations-v1` | WOS observation array |
| `waypoint-fieldry-device-id` | Anonymous device id |
| `waypoint-fieldry-migration-v2` | Idempotent migration marker (schema v2) |

Migration maps legacy `observationType` → category when missing, sets privacy default, ensures `extensions.fieldry`. Malformed payloads are preserved rather than discarded.

Shared collections/favorites use `waypoint-platform-collections-v1` via `WDS.platform.Collections`.

---

## Testing

```bash
node automation/test-fieldry-mvp.mjs
node automation/test-platform-foundation.mjs
node automation/test-knowledge-platform.mjs
```

---

## Out of scope (this MVP)

Public feeds, chat, followers, leaderboards, marketplace, speculative AI identification / computer vision, cloud sync, data licensing exports.
