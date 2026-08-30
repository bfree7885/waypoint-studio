# Shed Hunting V1.1 — Today’s Hunt

**Branch:** `cursor/sheds-v1-1-todays-hunt-3501`  
**Starting main:** `a9b68d864a2c8b2717a52eb7d6299cf9ba9c40a6`

Today’s Hunt answers *Should I go shed hunting today?* on the ShedHunting.org overview. The map remains *Where should I look?*

This is **not** an antler probability.

## What the band means

**Overall shed-hunt recommendation for today** — not field-searchability alone.

Searchability (weather, daylight, footing) is one **input**. Season is another. Excellent walking weather must not produce a high overall band when the regional shed-search window is clearly poor.

Internal channels stay separate (TIMING, HABITAT MODEL, SEARCHABILITY, OBSERVED). The composer interprets them; it does not replace them with one opaque score.

## Rating eligibility

`Low` / `Fair` / `Good` / `Very good` are emitted only when **all** of these are true:

1. **Valid location** — finite lat/lng from GPS, last map view, a saved Search Area, or a zoomed map center. Never an invented town. The Midwest zoom-6 overview is not a location.
2. **Usable weather** — a fetched forecast package with a numeric temperature. Wind and daylight gaps are listed internally; they do not turn missing data into Low.
3. **Season/timing** is derived from date + latitude. It is **shown whenever a location exists**, including when weather failed. A missing timing module does not invent Low; season then reads unclear and Very good is blocked.

Missing critical inputs are **UNKNOWN**, not Low.

### Unrated labels (not hunt bands)

| Label | When | Today |
| --- | --- | --- |
| **Need location** | No valid place | Share a location or choose an area to get today’s local hunt assessment. |
| **Not rated** | Place known; weather/field conditions unavailable | Today’s local conditions are temporarily unavailable. |
| **…** (loading) | Waiting on weather | Reading today’s conditions… |

Season still appears when a location exists (e.g. Not rated + Main search window).

## Rated bands

| Band | Meaning |
| --- | --- |
| **Low** | Enough data to assess, and today’s shed-hunt opportunity is poor (including **outside** the main regional window, even if walking weather is fine). |
| **Fair** | Enough data; a cautious go — approaching/leftover season, or mixed field conditions in an open window. |
| **Good** | Enough data; open seasonal window and workable-to-favorable field conditions. |
| **Very good** | Good plus strong extras. Never without location and usable weather. |

### Season caps (after field conditions suggest a base)

- **outside** → **Low**. Walking weather cannot raise the overall recommendation.
- **early** → max **Fair** (approaching).
- **mostly_past** → max **Fair** (leftover).
- **building / peak / late** → field conditions may raise; Very good still needs extras.

### Very good extras (all required)

- usable weather + location
- favorable field conditions
- season peak, or building/late with an extra melt/warming signal
- snowfall water-equivalent ≤ 25 mm (depth still unknown)
- at least one extra: recent warming with snow signal, melt (SWE > 8 mm and temp > 0 °C), or peak with light cover

Deep SWE (> 25 mm water-equivalent) caps a *rated* day at Fair.

## Outside-season decision (late August @ 41.3°N)

**Low**, not Fair.

The headline asks whether to go **shed hunting** today. Comfortable walking weather in a clearly closed regional window is not a Fair shed-hunt day. WHY may still say walking weather is workable, while the band stays Low.

## Hunter-facing copy

Default view: TODAY, WHY, WHERE, WATCH (omit if empty), Season, short disclaimer.

Avoid architecture words in that view (`searchability`, `channel`, `model`, `support inputs`). Those stay internal / More detail.

## Temperature trend

`deriveTempTrend`: last 3 hours vs the same hours ~24h earlier. Threshold **2.0 °C**. Need ≥12 hourly samples spanning 12 hours.

V1.1 does **not** add `snow_depth`. SWE is never treated as depth.

## Tests

`automation/test-sheds-today-hunt.mjs`

## Mobile host notes

At ≤360px the dedicated-host overview hides the brand “Powered by Waypoint” line, the stage eyebrow, and the duplicate Open Map under the location prompt so Need location and Open Map stay on the first screen.
