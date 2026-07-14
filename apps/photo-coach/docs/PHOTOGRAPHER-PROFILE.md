# Photographer Profile

Lifelong private photography companion inside **Waypoint Scenes**.

Not a social profile. Not a portfolio. Not competitive.

## Live path

`/apps/photo-coach/profile/`

Module intro: `/apps/scenes/photographer-profile/`

## Architecture

| Layer | Role |
|-------|------|
| Photo Coach analyze | Writes `PhotoRecord` + shoot entities (localStorage) |
| `WaypointPhotoCoachProfileEngine` | Pure `compute(photos, shoots)` → companion fields |
| `WaypointPhotoCoachRepository` | Persist profile, exclusions, recalculation |
| `WaypointPhotoCoachProfilePage` | Dashboard UI |
| Scenes `ProfileEngine` | Bridge API for platform registry |

## Storage (local-first)

- `waypoint-photo-records-v1`
- `waypoint-photo-shoots-entity-v1`
- `waypoint-photographer-profile-v1`
- coaching memory / prefs keys

No upload. Future cloud sync must be explicit opt-in.

## Companion sections

Overview · Photography Journey · Photography DNA · Patterns · Strengths · Growth Opportunities · Favorites (subjects, locations, seasons, time of day, lenses, focal lengths, lighting) · Editing / composition / exposure / color / mood tendencies · Confidence Timeline · Projects · Recent Progress · Goals · Curiosity Suggestions · Coaching · Evidence · Manage learning

## Voice

Gentle observations only. Celebrate curiosity and consistency. Never grade the person. Never compare to other photographers.
