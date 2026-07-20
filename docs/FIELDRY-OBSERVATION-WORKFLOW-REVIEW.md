# Fieldry Observation Workflow Review — Sprint 7

## Create

1. `#/new` → restore draft if present, else WOS draft with date + regional location
2. Quick capture: category (default Other), title, optional common name, ID status, date/time, GPS, notes
3. Autosave draft while typing
4. Save → quota-safe persist → clear draft → `#/obs/<id>`

## Edit

`#/edit/<id>` loads full form (quick + details). Revisions append `"Edited in Fieldry"`. Draft autosave skipped on edit to avoid overwriting new-capture drafts.

## Delete

Confirm from history card or detail. Storage errors surface via alert (no silent failure).

## Duplicate

Detail **Duplicate** clones WOS record with new id and “(copy)” title, opens edit.

## Search / filter

History: live query debounce, category/ID/favorites on change, from/to dates. Life list filters unchanged (Apply still available).

## Export

Home/history export panel: JSON (full WOS) + CSV (precision-gated coordinates).

## Gaps remaining

- No camera / photo attach UI (schema ready)
- No undo after delete
- No import
- No Fieldry map (Sheds owns map-centric notes)
