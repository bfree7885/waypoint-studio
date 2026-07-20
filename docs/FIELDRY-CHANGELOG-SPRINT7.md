# Fieldry Changelog — Production Recovery Sprint 7

DO NOT COMMIT / DO NOT PUSH was requested for this sprint; this file records work in the tree.

## Observation workflow

- Quick-capture fieldset first; advanced details collapsed
- Category defaults to **Other** (no blocking empty category)
- Stronger validation: title/common, date, coordinate pairs/ranges, count
- **Duplicate** on detail view
- Hash alias `#/observation/<id>` → detail (legacy deep links)
- Platform ledger deep link fixed to `#/obs/<id>`

## Mobile field entry

- **Use my GPS** promoted above the fold; writes `accuracyM`; sets precision to exact when user opts in
- Draft autosave (`waypoint-fieldry-draft-v1`) on input; restore banner on `#/new`
- Sticky save footer, 16px inputs, safe-area padding, offline banner
- Automatic timestamps retained via WOS draft defaults

## Reliability & export

- `writeAll` / save / delete handle `QuotaExceededError` with honest errors
- Successful save clears draft
- `FieldryExport.buildCSV` for tests; CSV still strips coords for county/hidden

## Search & filtering

- Live history filters (debounced search + change on selects)
- From / to date range wired to existing `filterList` API

## Testing & docs

- `automation/test-fieldry-sprint7.mjs`
- Recovery, workflow, performance, a11y, debt, readiness docs + this changelog
