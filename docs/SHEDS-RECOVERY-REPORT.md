# Sheds Recovery Report — Sprint 6

## Goal

Make Sheds feel like a professional outdoor field companion: map-primary, GPS-honest, interpretive Today’s Search, minimal-tap observations, reliable heat updates — without speculative AI or unrelated product work.

## Evidence used

From `audits/live-site-qa/` (2026-07-19):

| Finding | Severity | Sprint 6 response |
| --- | --- | --- |
| Public `/map/` → 404 | P0 | Redirect already in tree; verified + documented |
| Sheds map works after ethics; tile `ERR_ABORTED` noise | P2/noise | Elev AbortController reduces stale provider work; tile abort during pan remains provider-normal |
| Sheds overall ~6.3; mobile/polish/clarity room | Product | FAB note, outdoor contrast, briefing language, GPS denial memory |
| Foundation claimed photos | Honesty | Copy corrected — photos not on field map yet |
| Systemic `wds-*.css` 404s on Sheds home | P2 platform | Unchanged this sprint (home still paints via `wds.css`); map shell is self-contained |

## Before → After

| Area | Before | After |
| --- | --- | --- |
| Add note | Tools sheet only (extra taps) | FAB + Tools |
| Today’s Search expand | Raw band / snow mm / wind kph / % | Interpreted field briefing + confidence why |
| GPS boot | Always `getCurrentPosition` | Skips when previously denied; clearer retry |
| Heat refine | Stale elev fetches could race | Abort on recompute generation change |
| Offline | Short banner | Notes-still-save + limited-data mode text |
| Obs form | Type/note/confidence only | GPS pin, habitat, probable default |

## Honest limits

- Photos still not implemented (correctly disclosed)
- Multi-species field map remains whitetail-focused
- Land-cover / habitat provider data still unavailable — model says so
- Tile CDN aborts during fast pan/zoom are expected and not fully silencable
- Species browser route remains incomplete

## Verification

```bash
node automation/test-sheds-sprint6.mjs
node automation/test-sheds-field-ux.mjs
node automation/test-sheds-planner.mjs
```
