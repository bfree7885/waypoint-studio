# Dashboard V2 — Activity Engine

**Module:** `design-system/js/dashboard/v2/wds-dashboard-v2-activity.js`

## Suitability labels

`excellent` · `good` · `fair` · `poor` · `avoid` · `insufficient`

## Output per activity

- `positives[]` — supporting factors (shown to user)
- `limits[]` — limiting factors
- `cautions[]` — safety-adjacent notes (non-medical)
- `bestWindow` — human-readable range from hourly scan
- `confidence` — `high` when live weather, else `low`

## Activities (catalog)

Walk, hike, run, bike, photography, wildlife, birding, gardening, paddling, fishing observation, shed searching, foraging exploration, stargazing, outdoor volunteering.

## Preferences

`waypoint-dashboard-v2-prefs-v1` filters displayed activities. Defaults: walk, hike, photography, wildlife, birding, gardening, stargazing.

## Time windows

`buildWindows()` produces: best overall, photography, walking, stargazing, lowest rain-risk, low-wind — each with reason, confidence, caveat. Omitted when hourly data insufficient.

## Not a fitness prescription

No medical claims. River/paddling notes explicitly disclaim flood/paddling guarantees.
