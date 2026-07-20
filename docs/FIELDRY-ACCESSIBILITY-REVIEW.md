# Fieldry Accessibility Review — Sprint 7

## Improvements

- Form errors use `role="alert"` / `aria-live="assertive"`
- Draft + GPS status use `role="status"`
- Sticky primary save remains keyboard reachable
- Labels retained on all quick-capture and advanced fields
- Offline banner announced via status role

## Remaining gaps (honest)

- Studio-wide color-contrast failures from live QA still apply to WDS tokens
- Knowledge result list keyboard navigation is basic (Escape closes; limited arrow support)
- Delete confirmations are native `window.confirm` (accessible but abrupt)
- Export controls live in a `<details>` — ensure summary is discoverable

## Manual checklist

- [ ] Tab order: back → fields → GPS → save → cancel
- [ ] Screen reader announces validation on failed save
- [ ] Focus returns usefully after failed GPS
- [ ] History filters operable without pointer
