# Production Validation Checklist

Run before every release (CI now automates most of this).

## Automated (required)

```bash
node automation/validate-production-assets.mjs
node automation/validate-production-links.mjs
node automation/test-production-recovery.mjs
node automation/test-production-repair.mjs
node scripts/validate-dashboard-data.mjs
```

Expect: exit code **0**, missing/broken counts **0**.

## Deploy job

Pages workflow must:

1. Inject build metadata
2. Run asset validation
3. Run link validation
4. Strip `private/`
5. Upload artifact

## Manual spot checks (after deploy)

- [ ] `/` paints with design-system styles
- [ ] `/design-system/css/wds-tokens.css` → 200
- [ ] `/data/live.json` → 200
- [ ] From Dashboard network tab: requests `/data/live.json` (not `/apps/dashboard/data/live.json`)
- [ ] Dashboard does **not** call NWS with `point=0.0000,0.0000` before location resolves
- [ ] `/map/` redirects to Sheds map
- [ ] Sheds “Open now → Field map” lands on `/apps/shed-hunting/map/`
- [ ] ForageCast does not show “null, …” region labels
- [ ] Steepleaf explore loads or shows Retry (never infinite Opening…)
- [ ] Console: no flood of missing `wds-*.css` under `/` or `/apps/.../` (ignore axe tooling noise)

## Do not

- Treat axe network logs of bare `wds-tokens.css` as missing production CSS without checking `/design-system/css/wds-tokens.css`.
