# Waypoint Observation Standard (WOS)

**Version 1.0.0** · Schema ID: `https://waypoint.studio/schemas/observation/v1`

The Waypoint Observation Standard is the canonical data model for environmental observations across every Waypoint Studio product. It is a core architectural document alongside the [Constitution](WAYPOINT-STUDIO-CONSTITUTION.md), [Outdoor Intelligence Platform](../design-system/outdoor-intelligence/README.md), and [Content Engine](WAYPOINT-CONTENT-ENGINE.md).

WOS answers one question: *What should a field observation look like when stored, shared, and exported from Waypoint Studio — designed to support research-grade use?*

Submission, sync, accounts, and export pipelines are **out of scope for v1**. This document defines the data standard only.

---

## Design principles

1. **Designed for research-grade use, not researcher-only** — Every field has a sensible default. A casual field note can be three taps; a mycologist can fill the full taxonomic hierarchy.
2. **Privacy by default** — Observations start local and private. Sharing with researchers or the public is explicit, granular, and revocable.
3. **Provenance over perfection** — Confidence, evidence quality, and verification status are first-class. Honest uncertainty is better than false precision.
4. **One record, many products** — ForageCast, Fieldry, Shed Hunting, and future apps all read and write the same shape via `WDS.observations`.
5. **Darwin Core compatible** — WOS maps cleanly to [Darwin Core](https://dwc.tdwg.org/) for GBIF and institutional export without forcing users to think in DwC terms.

---

## Artifacts

| Artifact | Path | Purpose |
|----------|------|---------|
| JSON Schema | [`design-system/observations/schema-v1.json`](../design-system/observations/schema-v1.json) | Machine validation |
| JS model | [`design-system/js/observations/wds-wos-core.js`](../design-system/js/observations/wds-wos-core.js) | `emptyObservation()`, `normalizeObservation()`, enums |
| Examples | [`design-system/observations/examples/`](../design-system/observations/examples/) | Minimal and detailed contribution samples |

### Public API (browser)

```javascript
WDS.observations.VERSION           // "1.0.0"
WDS.observations.emptyObservation(options)
WDS.observations.normalizeObservation(raw)
WDS.observations.generateId("obs") // obs_, med_, rev_ prefixes
WDS.observations.toDarwinCore(obs)
WDS.observations.contextFromPlatform(oipPackage)
WDS.observations.weatherSnapshotFromPackage(weatherPkg)
```

---

## Relationship to other systems

### Outdoor Intelligence Platform (OIP)

OIP's `observations` slice in [`schema-v2.json`](../design-system/outdoor-intelligence/schema-v2.json) holds **editorial field notes** from regional content bundles — curated copy for the homepage and ForageCast, not user-submitted records.

User and device observations conform to **WOS**. Products may hydrate WOS `context` from OIP at record time (season, phenology, weather snapshot, regional intelligence reference).

### Constitution alignment

Per the [Privacy Philosophy](WAYPOINT-STUDIO-CONSTITUTION.md#privacy-philosophy):

- Users own their observations.
- Citizen science participation is always optional.
- Location privacy must be respected.

WOS encodes these as `privacy.*`, `location.privacy.*`, and `research.exportStatus`.

---

## Record tiers

Products may present progressive disclosure UI, but the underlying schema is always the same object.

| Tier | Typical use | Required at save |
|------|-------------|------------------|
| **Field note** | Quick sighting | `taxon.label`, `observedAt.date`, `record.confidence` |
| **Naturalist** | Species + place + photo | Above + coordinates or county, `media.photos` |
| **Research contribution** | Export-eligible | Above + scientific name or taxon ID, license, consent, verification path |

---

## Field reference

Top-level keys are grouped below. **Why** explains the research or product rationale.

### `id` — Observation ID

| | |
|---|---|
| **Type** | `string` |
| **Format** | `obs_` + UUID v4 |
| **Why** | Stable identifier across devices, revisions, and export repositories. Prefixed IDs prevent collision with media and revision IDs in shared databases. |

---

### `meta` — Record metadata

| Field | Type | Why |
|-------|------|-----|
| `version` | `"1.0.0"` | WOS version this record conforms to. Enables migration without breaking old exports. |
| `schema` | URI | Canonical schema `$id` for validators and documentation links. |
| `createdAt` | ISO 8601 | When the observation was first saved. Distinct from field date/time. |
| `updatedAt` | ISO 8601 | Last modification. Drives sync conflict resolution in future services. |
| `source` | enum | Originating product (`foragecast`, `fieldry`, `import`, …). Required for analytics and support without coupling records to a single app. |
| `productId` | string \| null | Optional sub-product or feature flag ID (e.g. `foragecast-season-table`). |
| `appVersion` | string \| null | Client version at save time. Critical for debugging identification regressions. |
| `revision` | integer ≥ 1 | Current revision number; increments when `revisions` gains an entry. |
| `contentBundleId` | string \| null | Regional bundle active when recorded — links observation to editorial context (Pike County v3, etc.). |
| `regionalIntelligenceVersion` | string \| null | OIP package version at record time — reproducibility for phenology/season claims. |

---

### `observer` — Who made the observation

| Field | Type | Why |
|-------|------|-----|
| `id` | `usr_` + UUID \| null | Future Waypoint account ID. Null for anonymous or pre-account users. |
| `anonymous` | boolean | **Required.** When true, identity must not be stored in exports or public views. Default true preserves Constitution privacy. |
| `displayName` | string \| null | Optional pseudonym for community verification. Never required to save. |
| `localDeviceId` | string \| null | Opaque per-device ID for deduplication on device only. **Never exported by default.** |

Anonymous support is explicit: `anonymous: true` with `id: null` is the default from `emptyObservation()`. Account linking sets `id` and may set `anonymous: false` only with user consent (`privacy.shareObserverIdentity`).

---

### `taxon` — Species identification

| Field | Type | Why |
|-------|------|-----|
| `label` | string | **Required.** Primary display name as entered or selected — approachable entry point ("morel", "turkey tail"). |
| `commonName` | string \| null | Vernacular name for export and search. May match `label`. |
| `scientificName` | string \| null | Binomial or trinomial for research export. Optional at field-note tier. |
| `rank` | enum \| null | Taxonomic rank when known (`species`, `genus`, `informal`, …). |
| `hierarchy` | object | Full lineage: kingdom → subspecies. Supports partial fills; research export uses what's present. |
| `taxonId` | string \| null | External taxonomy key (GBIF, iNaturalist, ITIS). |
| `taxonIdSource` | enum \| null | Which authority issued `taxonId`. |
| `lifeStage` | string \| null | Adult, larva, fruiting body, antler shed, etc. |
| `organismRemarks` | string \| null | Morphology notes that don't fit structured fields. |

**Species** in user-facing copy maps to `taxon` as a whole. Scientific and common names are separated so UIs can show friendly labels while exports stay precise.

---

### `observedAt` — When it happened

| Field | Type | Why |
|-------|------|-----|
| `date` | `YYYY-MM-DD` | **Required.** Calendar date of the sighting. |
| `time` | `HH:MM` or `HH:MM:SS` \| null | Time of day when known. Separate from date for partial records. |
| `timezone` | IANA string \| null | Disambiguates local solar time vs UTC for phenology studies. |
| `uncertaintyMinutes` | number \| null | Observer-estimated time fuzziness ("sometime mid-morning"). |
| `recordedAt` | ISO 8601 \| null | When the device saved the record — may differ from field time if offline. |

---

### `location` — Where it happened

| Field | Type | Why |
|-------|------|-----|
| `latitude` | −90…90 \| null | WGS84 decimal degrees. True coordinates; may be withheld from export. |
| `longitude` | −180…180 \| null | WGS84 decimal degrees. |
| `accuracyM` | number \| null | GPS horizontal accuracy — Darwin Core `coordinateUncertaintyInMeters` input. |
| `elevationFt` | number \| null | US customary default for Waypoint's primary audience. |
| `elevationM` | number \| null | Metric elevation for international export. |
| `elevationSource` | enum \| null | device, gps, dem, manual, … — provenance for elevation claims. |
| `county` | string \| null | Administrative unit; minimum viable location for privacy-conscious users. |
| `state` | string \| null | State or province name. |
| `stateCode` | string \| null | USPS-style code for compact export. |
| `country` | string \| null | Default "United States"; internationalizable. |
| `countryCode` | ISO 3166-1 alpha-2 \| null | Default "US". |
| `localityDescription` | string \| null | Human place description without coordinates ("north-facing ravine below ridge"). |
| `privacy` | object | **Required.** See below. |

#### `location.privacy`

| Field | Type | Why |
|-------|------|-----|
| `precision` | enum | **Required.** `exact` \| `obfuscated` \| `county` \| `hidden` — controls storage and export behavior. |
| `publicLatitude` | number \| null | Coordinate shown when precision is obfuscated or county-centered. |
| `publicLongitude` | number \| null | Pair to `publicLatitude`. |
| `obfuscationRadiusM` | number \| null | Radius used when jittering coordinates for sensitive species or user choice. |
| `coordinateUncertaintyM` | number \| null | Export-facing uncertainty including obfuscation. |

`WDS.observations.publicCoordinates(obs)` returns the coordinates appropriate for a given precision level.

---

### `habitat` — Environmental context

| Field | Type | Why |
|-------|------|-----|
| `label` | string \| null | Short habitat summary for display. |
| `habitatType` | string \| null | e.g. northern hardwood forest, riparian edge. |
| `substrate` | string \| null | Decaying log, sandy soil, basalt — critical for fungi and botany. |
| `aspect` | enum \| null | Slope aspect (N, NE, … flat). |
| `landCover` | string \| null | Land cover class label. |
| `waterProximity` | enum \| null | in_water, stream_edge, wetland, upland, … |
| `canopyCoverPercent` | 0–100 \| null | Structured canopy estimate. |
| `codes` | string[] | Future standardized codes (LANDFIRE, NLCD). |

---

### `context` — Regional and atmospheric snapshot

| Field | Type | Why |
|-------|------|-----|
| `season` | string \| null | Regional season label from OIP (e.g. "late spring"). |
| `phenologyStage` | string \| null | Phenological stage at observation time. |
| `month` | 1–12 \| null | Calendar month for aggregation. |
| `weekOf` | date \| null | ISO week anchor for weekly research cuts. |
| `weatherSnapshot` | object \| null | Point-in-time weather — **not** a live forecast link. Frozen context for reproducibility. |
| `regionalIntelligenceRef` | object \| null | `{ regionId, assembledAt }` pointer to OIP package used when recording. |

#### `context.weatherSnapshot`

| Field | Why |
|-------|-----|
| `capturedAt` | When weather was sampled. |
| `source` | open-meteo, manual, device, … |
| `conditions` | Human-readable summary. |
| `temperatureF` / `temperatureC` | Temperature at observation. |
| `humidityPercent` | Relative humidity. |
| `precipitationActive` | Was it raining/snowing? |
| `windSpeed` / `windUnit` | Wind at observation. |
| `cloudCoverPercent` | Sky cover. |
| `raw` | Optional full WDS weather object for deep export. |

Use `WDS.observations.weatherSnapshotFromPackage(weatherPkg)` to build a snapshot from the weather service.

---

### `record` — What was observed

| Field | Type | Why |
|-------|------|-----|
| `quantity` | number \| null | Count or amount observed. |
| `quantityMin` / `quantityMax` | number \| null | Range when exact count unknown ("dozens"). |
| `quantityUnit` | enum \| null | individuals, clusters, percent_cover, presence, tracks, sign, … |
| `organismQuantityType` | string \| null | Darwin Core analogue. |
| `confidence` | enum | **Required.** certain, likely, possible, uncertain, not_recorded — honest self-assessment. |
| `notes` | string \| null | Free-form observation notes (up to 10,000 chars). |
| `evidenceQuality` | enum | excellent → not_assessed — reviewer or self rating of supporting evidence. |
| `sensitiveSpecies` | boolean | Triggers export restrictions for T&E or poaching-sensitive taxa. |
| `behavior` | string \| null | Behavior or sign description. |
| `measurements` | array | Structured `{ type, value, unit }` measurements (cap size, antler points, etc.). |

---

### `media` — Photos, audio, video

| Field | Type | Why |
|-------|------|-----|
| `photos` | mediaAsset[] | Primary evidence for verification. |
| `audio` | mediaAsset[] | Bird calls, frog choruses, etc. |
| `video` | mediaAsset[] | Movement, behavior, habitat pan. |

#### `mediaAsset`

| Field | Why |
|-------|-----|
| `id` | `med_` + UUID — stable media reference. |
| `kind` | photo \| audio \| video |
| `uri` | Local file URI or relative path. Remote URLs require explicit consent. |
| `mimeType` | MIME for export validators. |
| `caption` | Observer or reviewer caption. |
| `takenAt` | EXIF or user-provided capture time. |
| `widthPx` / `heightPx` | Image dimensions. |
| `durationSec` | Audio/video length. |
| `hash` | SHA-256 for integrity verification. |
| `evidenceRole` | habitat, organism, sign, scale, context — helps reviewers prioritize assets. |

---

### `verification` — Trust and review

| Field | Type | Why |
|-------|------|-----|
| `status` | enum | **Required.** unverified → research_confirmed, disputed, rejected. |
| `reviewer` | object \| null | Who verified. See below. |
| `verifiedAt` | ISO 8601 \| null | When verification occurred. |
| `verificationNotes` | string \| null | Reviewer comments. |
| `flags` | string[] | needs_id, needs_location_review, sensitive, ethical_concern, duplicate_suspected. |

#### `reviewer`

| Field | Why |
|-------|-----|
| `id` | Reviewer account or system ID. |
| `name` | Display name. |
| `role` | observer, community, expert, researcher, automated. |
| `organization` | Institution or iNaturalist project, etc. |

---

### `research` — Export lifecycle

| Field | Type | Why |
|-------|------|-----|
| `exportStatus` | enum | **Required.** private → exported, withheld, retracted. |
| `exportedAt` | ISO 8601 \| null | When last exported. |
| `exportFormats` | string[] | darwin-core, dwc-a, csv, geojson, gbif, custom. |
| `datasetId` | string \| null | Target dataset identifier. |
| `recordId` | string \| null | ID assigned by receiving repository. |
| `withholdReason` | string \| null | Why export was blocked. |
| `darwinCore` | object \| null | Cached DwC row; populated at export via `toDarwinCore()`. |

Default `exportStatus: "private"` — records are not research-visible until the user opts in and eligibility checks pass.

---

### `license` — Data rights

| Field | Type | Why |
|-------|------|-----|
| `code` | enum | **Required.** CC0-1.0, CC-BY-4.0, CC-BY-NC-4.0, all-rights-reserved, waypoint-private. |
| `url` | URI \| null | License deed URL. |
| `attribution` | string \| null | Required attribution string for CC-BY. |
| `rightsHolder` | string \| null | Legal rights holder for export metadata. |

Default `waypoint-private` until the user selects a Creative Commons license for research sharing.

---

### `privacy` — User consent and sharing

| Field | Type | Why |
|-------|------|-----|
| `retention` | enum | **Required.** local-only, device-encrypted, account-sync, research-archive. |
| `shareWithResearchers` | boolean | Opt-in to research export pipeline. |
| `shareLocationPublicly` | boolean | Public map visibility (subject to `location.privacy`). |
| `shareMediaPublicly` | boolean | Photos/audio/video in public views. |
| `shareObserverIdentity` | boolean | Attach observer name/ID to exports. |
| `consentRecordedAt` | ISO 8601 \| null | When user granted research sharing consent. |
| `consentVersion` | string \| null | Consent text version for audit trail. |

---

### `revisions` — Edit history

Append-only array. The top-level object always holds **current state**; each revision entry documents a past change.

| Field | Why |
|-------|-----|
| `revisionId` | `rev_` + UUID. |
| `revisionNumber` | Monotonic edit counter. |
| `revisedAt` | When the edit occurred. |
| `revisedBy` | observer.id or reviewer.id. |
| `changeSummary` | Human-readable edit note. |
| `fieldsChanged` | Dot-path list of changed keys (e.g. `taxon.scientificName`). |
| `snapshotHash` | SHA-256 of canonical JSON before revision — integrity for research audits. |

---

## Darwin Core mapping

`WDS.observations.toDarwinCore(obs)` produces a preview row. Key mappings:

| WOS | Darwin Core term |
|-----|------------------|
| `id` | `occurrenceID` |
| `observer` | `recordedBy` (if not anonymous) |
| `observedAt` | `eventDate` |
| `location` + `location.privacy` | `decimalLatitude`, `decimalLongitude`, `coordinateUncertaintyInMeters` |
| `taxon` | `scientificName`, `vernacularName`, `taxonRank`, hierarchy terms |
| `record` | `organismQuantity`, `occurrenceRemarks`, `identificationVerificationStatus` |
| `habitat` | `habitat` |
| `license` | `license`, `rightsHolder` |

Export services will apply privacy filters before writing DwC files.

---

## Validation

1. **JSON Schema** — Validate against `schema-v1.json` in CI or server-side.
2. **JS normalize** — `normalizeObservation(raw)` coerces enums, fills defaults, and strips invalid media entries in the browser.

Required top-level keys: `meta`, `id`, `observer`, `taxon`, `observedAt`, `location`, `record`, `verification`, `research`, `license`, `privacy`, `revisions`.

Optional but recommended for research tier: `habitat`, `context`, `media`.

---

## Versioning policy

- **Patch** (1.0.x): Clarifications, new optional fields with defaults — no migration required.
- **Minor** (1.x.0): New optional sections; `normalizeObservation` backfills defaults.
- **Major** (2.0.0): Breaking changes; new `$id` and migration guide.

Records store `meta.version` and `meta.schema` permanently.

---

## What is not in v1

- Observation submission API
- Cloud sync or account service
- Automated taxon lookup UI
- GBIF live push
- iNaturalist OAuth

These consume WOS but are separate services.

---

## See also

- [Research Integrity Framework](RESEARCH-INTEGRITY.md)
- [Outdoor Ethics Standard](WAYPOINT-OUTDOOR-ETHICS-STANDARD.md)
- [Constitution — Citizen Science](WAYPOINT-STUDIO-CONSTITUTION.md#citizen-science)
- [Constitution — Privacy Philosophy](WAYPOINT-STUDIO-CONSTITUTION.md#privacy-philosophy)
- [Outdoor Intelligence Platform](../design-system/outdoor-intelligence/README.md)
- [Examples](../design-system/observations/examples/)
