# Shed Hunting V1.1 — Today’s Hunt

**Starting main:** `a9b68d864a2c8b2717a52eb7d6299cf9ba9c40a6`  
**Branch:** `cursor/sheds-v1-1-todays-hunt-3501`  
**Status:** product build for review — do not merge or deploy from this note.

Today’s Hunt answers *Should I go shed hunting today?* on the ShedHunting.org overview. The map remains the answer to *Where should I look?*

This is **not** an antler probability. It is an interpreted assessment of season + current/recent search conditions + weather trend + available environmental context.

## Channels stay separate

The composer (`apps/shed-hunting/js/sheds-today-hunt.js`) does **not** replace:

- **TIMING** — `sheds-timing.js` / biological `seasonProfile`
- **HABITAT MODEL**
- **SEARCHABILITY** — `sheds-todays-search.js` + `sheds-searchability.js`
- **OBSERVED**

It reads those channels and explains the band. `ruleIds` on the result name the rules that fired.

## Output

- `band`: Low | Fair | Good | Very good
- `today`: first sentence the hunter reads, then the strongest reason
- `why`: 1–3 interpreted reasons
- `where`: types of ground, or a clean “use the map…” line
- `watch`: omitted when nothing meaningful is supported
- `season`: separate timing label
- `support.missingInputs` / `support.level`
- `disclaimer`: not a find probability

## Band rules

Rule-based. **Not** a 0–100 score, and **not** a direct map of best-window score → hunt band.

1. Start from searchability *favorability* as conditions:
   - favorable → **Good**
   - moderate → **Fair**
   - limited → **Low**
2. Season is a visible modifier, never a same-day cast trigger.
   - outside / early / mostly_past → cap **Fair**
3. **Very good** requires all of:
   - weather ready
   - location known (GPS, saved map view, saved Search Area, or a zoomed map center)
   - searchability favorable
   - season peak, or building/late with an extra melt/warming signal
   - snowfall water-equivalent ≤ 25 mm
   - at least one extra: recent warming with snow signal, melt (SWE > 8 mm and temp > 0 °C), or peak with light SWE and not-strong wind
4. Missing weather **or** location **always** blocks Very good.
5. Deep SWE (> 25 mm water-equivalent; **depth still unknown**) caps at Fair.
6. No weather: max Fair if season is peak/building/late **and** location is known; otherwise Low.

## Temperature trend

`apps/shed-hunting/js/sheds-weather.js` `deriveTempTrend`:

- Compare the mean of the last 3 hours to the mean of the same 3 hours ~24 hours earlier.
- Threshold: **2.0 °C**. Smaller differences are **Little change**.
- Need at least 12 hourly samples spanning 12 hours; otherwise unknown.

Hourly `temperature_2m` is already fetched. V1.1 does **not** add `snow_depth`. SWE is never treated as depth.

## Location (overview)

1. Current geolocation if already granted (button to request otherwise)
2. Last map view (`waypoint-sheds-map-view-v1`) or last Search Area
3. Otherwise ask — the rest of the page still works

No invented city. No silent Milford / Pike County default. The Midwest map overview (zoom 6) is not a hunt location.

## Language

Use: conditions, opportunity, searchability, worth checking, search window, evidence, higher/lower opportunity.

Never: find/antler/deer probability, percent chance of finding sheds, “sheds are here”, “deer are here”, certainty theater.

## Tests

`automation/test-sheds-today-hunt.mjs`
