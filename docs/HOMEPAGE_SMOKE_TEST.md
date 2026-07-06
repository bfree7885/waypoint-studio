# Homepage Smoke Test — Phase 1

Manual checklist for Waypoint Studio homepage (`index.html`) before merging stability work or after a week away. Run locally:

```bash
python3 -m http.server 8080
# Open http://localhost:8080/
```

**Pass criteria:** Every item should succeed without console errors (network failures for live APIs are OK if educational fallbacks appear).

---

## Boot and layout

- [ ] Page loads without a blank screen; loading state clears within ~10s on a normal connection
- [ ] `#main` and `#outdoor-dashboard` are present after boot
- [ ] Skip link (`Skip to content`) focuses `#main`
- [ ] Title updates to include region name after location resolves

## Top navigation (hash links)

Each link should scroll to a visible section — no dead anchors.

| Link | Target |
|------|--------|
| Today | `#outdoor-dashboard` |
| Conditions | `#wdb-section-conditions` |
| Sun & Moon | `#wdb-section-sun-moon` |
| Safety | `#wdb-section-safety` |
| Stewardship | `#wdb-section-conservation` |
| ForageCast | `apps/foragecast/` (loads app) |
| Fieldry | `apps/fieldry/` (loads app) |

## Dashboard widgets

- [ ] Morning brief strip renders (go / caution / wait or educational copy)
- [ ] At least one widget per default section shows content (live or **Educational** tag)
- [ ] Widget tags distinguish **Live** vs **Educational** — no bare “Loading…” forever
- [ ] Section collapse toggles work; collapsed sections hide their grid
- [ ] Widget refresh (↻) and collapse (▾) controls are tappable on a 375px-wide viewport

## Customize panel

- [ ] **Customize** opens the settings dialog
- [ ] Widget / Sections / Groups tabs switch
- [ ] Toggle switches and star (favorite) controls respond to tap
- [ ] **Done** closes panel; layout updates
- [ ] **Reset defaults** restores Morning preset without error

## Location

- [ ] Location bar shows current region (default Pike County Preview)
- [ ] Changing region reloads dashboard content

## Integrity labeling

- [ ] Widgets without live feeds show **Educational** (not “Preview” or silent empty)
- [ ] Educational panels include “Educational · not live data” badge where fallback HTML is used
- [ ] True errors (if forced) may still show **Unavailable** — that is expected

## Mobile touch targets

- [ ] Top nav links, section toggles, widget controls, and Customize meet ~44px tap height

## Cross-app entry (quick)

- [ ] ForageCast homepage loads
- [ ] Fieldry homepage loads

## Failure modes

- [ ] Disconnect network → reload → boot error or educational content (not infinite spinner)
- [ ] Retry button on boot error reloads the page

---

## Notes

- Live weather requires network access to Open-Meteo; offline tests should expect educational weather copy.
- This checklist does not replace automated tests; it catches navigation, boot, and trust regressions cheaply.
- Update this file when default dashboard preset or top nav changes.
