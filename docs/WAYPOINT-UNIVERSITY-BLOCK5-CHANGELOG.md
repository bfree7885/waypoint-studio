# Waypoint University — Module 5 Changelog

**Status:** Uncommitted — owner review  
**Do not commit / do not push until requested**

---

## Access

- Private **owner server** on loopback (`127.0.0.1:8787`) with scrypt password + signed session cookie
- `./start.sh setup` provisions the sole owner account into gitignored `server/.env`
- Exact instructions: `private/university/ACCESS.md`
- **`university.waypointstudio.org` is not live** — documented blockers (Pages has no auth; `private/` stripped)

## Daily use

- Home is a real workspace: Continue, Quick capture, Current focus, Open questions, Recent knowledge, Active projects, Review
- Nav: Home · Knowledge · Research · Learning Paths · Projects · Sources · Questions · Journal · Graph · Search · Settings
- Journal entries (`kind: journal`)
- Learning path detail: add entries (`part-of`), ordered list, related questions
- Editor: status/archive, path select, review flag, Markdown preview toggle, draft autosave, unsaved warning
- Export JSON + Markdown; import JSON
- Sign out via Settings → `/logout`

## Persistence

- Knowledge remains IndexedDB `waypoint-university-v1` (survives restart in the same browser profile)
- Drafts stored in IDB meta
- Schema **1.4.0**

## Tests

- `node private/university/tests/module5-smoke.mjs` — auth crypto + Spatial Computing model workflow + search/Markdown/hubs

## Explicit honesty

- Not safe on the public internet as shipped
- No remote private subdomain yet
- Media attach still deferred
- Manual browser journey for full IDB E2E should be run by the owner after `./start.sh`
