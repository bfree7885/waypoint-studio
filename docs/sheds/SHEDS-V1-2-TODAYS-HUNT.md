# Shed Hunting V1.2 — Today’s Hunt intelligence

**Branch:** `cursor/sheds-v1-2-todays-hunt-intelligence-3501`  
**Starting main:** `a1d87928b16469355edff0b91a2dbe75cfa9f3fa` (V1.1 merge)

V1.2 keeps the V1.1 question — *Should I go shed hunting today?* — and makes the answer smarter using freeze/thaw, a 24–48 hour temperature trend, and Open-Meteo `snow_depth` **when that field is actually numeric**.

This is not a visual redesign and not a new weather vendor.

## Layers (keep separate)

| Layer | Examples |
| --- | --- |
| Raw | `temperature_2m`, daily min/max, `snow_depth` (meters), `snowfall_sum` (cm) |
| Derived | freeze/thaw class, warming/cooling/stable, snow-cover class |
| Interpretation | whether today looks more or less worthwhile to go |

Do **not** imply freeze/thaw causes antler drop, that melt means sheds will be found, or any find/deer probability.

## Open-Meteo fields (verified 2026-08-31)

Same `api.open-meteo.com/v1/forecast` request, extended:

- `current` / `hourly`: existing fields plus **`snow_depth`** (meters, instant)
- `daily`: existing fields plus **`temperature_2m_min`**, **`temperature_2m_max`** (°C)
- `past_days=2` (was 1) so a 48 h trend and overnight window can exist
- `snowfall_sum` remains **cm of snowfall**, not snow depth and not SWE

Open-Meteo documents water-equivalent as `snowfall_cm / 7`. This product does **not** apply that conversion, and never substitutes `snowfall_sum` for `snow_depth`.

**Missing `snow_depth` is not zero snow.** Explicit `0.0` is known bare ground.

## Freeze/thaw

Deadband **1.0 °C** (data precision is typically 0.1 °C).

- Overnight window: local 18:00–08:00
- Daytime window: local 10:00–16:00 (includes forecast hours — occurred or expected)
- Fallback: today’s `temperature_2m_min` / `temperature_2m_max` when hourly samples are thin

| Status | Rule |
| --- | --- |
| `freeze_thaw` | overnight min ≤ −1 °C and daytime max ≥ +1 °C |
| `below_freezing` | daytime max ≤ −1 °C |
| `above_freezing` | overnight min ≥ +1 °C |
| `near_freezing` | data exists but the swing is inside the deadband |
| `insufficient` | not enough hourly or daily temperatures |

## Temperature trend

`deriveTempTrend` prefers a **48 h** lookback when that window exists, else the V1.1 **24 h** lookback. Window mean is 6 hours. Threshold **2.0 °C**. Status `little_change` is labeled **Relatively stable**.

## Snow-cover class (only if `snow_depth` is numeric)

| Status | Depth |
| --- | --- |
| `none` | 0 m (explicit) |
| `light` | &lt; 5 cm |
| `limiting` | 5–15 cm |
| `deep` | ≥ 15 cm |
| `unavailable` | null / omitted / not near “now” |

Hunter-facing copy uses those classes, not meter precision.

## Recommendation changes (season still wins)

V1.1 bands, season caps, Need location / Not rated, and Very good gating are preserved.

Additions:

- Freeze→thaw counts as a Very good **extra** (like melt), not a season override
- Continuously below freezing **blocks Very good**
- Deep measured snow **caps at Fair** and blocks Very good
- `snowfall_sum` “deep” cap applies only when measured depth is **not** known none/light — snowfall is not used as cover when depth is known

## UI

Same card. Order: rating → short explanation → season → up to three supporting condition lines → Open Map → Why / Where / Watch.

## Tests

- `automation/test-sheds-today-hunt.mjs` (V1.1 regressions)
- `automation/test-sheds-today-hunt-v12.mjs`
- `automation/test-sheds-today-hunt-mobile.mjs` (320 / 375 / 390 / 430)

## Dedicated host

Generate locally with `node scripts/prepare-shed-hunting-host.mjs`. Do **not** run `scripts/publish-shed-hunting-host.mjs` for this task.
