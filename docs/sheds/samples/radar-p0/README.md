# RADAR P0 evidence

Same Pike/Milford AOI under controlled condition frames.

## Acceptance requirement

Capture only after terrain/aspect enrichment is ready:

- `elevKey` non-empty
- `terrainEnriched === true`
- aspect-bearing cells > 0
- southish cells > 0
- frame switch does **not** refetch elevation

Tooling: `node automation/capture-sheds-radar-p0-evidence.mjs [baseUrl]`

When the browser cannot reach Open-Meteo, the capture harness serves
`elev-fixture-pike-50x50.json` (real Open-Meteo DEM samples for this viewport)
through a page `fetch` patch. Scoring still uses Phase 1 `evaluateCell`.

## Live browser (preferred)

Same fixed viewport after enrichment ready; onboarding overlays dismissed for
capture only (product ethics/coach safeguards unchanged).

- `browser-frame-a.png` — Frame A Neutral/Cold
- `browser-frame-b.png` — Frame B Warming/Thaw (same geography/base/elev cache)
- `browser-frame-b-mobile.png` — Frame B ~390×844
- `browser-frame-diff-map.png` — map-region pixel delta (A→B)
- `browser-outside-pack.png` — honest limited coverage outside Pike
- `browser-explain-changed.png` — tap explain on a solar-changed cell
- `proof-report.json` — keys, aspect counts, changed/unchanged cells

Legend: “Smoothed Relative Search Interest · ≈90 m analysis — not find %”

What changes visually (Frame A → Frame B): some southish / condition-sensitive
regions strengthen or rebalance; other cells stay put. Not a uniform wash.

## Synthetic continuous field (model mirror)

Built from the same elev fixture + Phase 1 modifiers:

- `frame-a-cold.png` / `frame-b-thaw.png`
- `*-mobile.png` — same field (narrower presentation crop optional)
- `frame-diff-thaw-minus-cold.png` — Frame B − Frame A intensity gain

Smoothed display only; analytical resolution ≈90 m. Not shed/find probability.

## Fixture viewport

See `elev-fixture-pike-50x50.json` and `proof-report.json` for center/zoom/bounds/
rows/cols/baseKey/elevKey.
