# Waypoint Studio 2026 Rebuild — Architecture Baseline

**Status:** Architecture baseline approved for Dashboard Phase 1 implementation  
**Authority:** This folder is the sole product/architecture authority for the rebuild.  
**Implementation:** Dashboard Phase 1 shell + presentation polish — see [dashboard-phase1-polish-owner-review.md](./dashboard-phase1-polish-owner-review.md) (awaiting owner visual review; Phase 2 not started). Framework baseline: [dashboard-phase1-owner-review.md](./dashboard-phase1-owner-review.md).

## Documents

| # | Document | Purpose |
|---|----------|---------|
| 1 | [01-product-vision.md](./01-product-vision.md) | Company product map, era history, non-goals |
| 2 | [02-information-architecture.md](./02-information-architecture.md) | Surfaces, cross-product boundaries, shared platform |
| 3 | [03-dashboard-architecture.md](./03-dashboard-architecture.md) | Customizable workspace, widgets, Today Outside |
| 4 | [04-scenes-architecture.md](./04-scenes-architecture.md) | Photography education, analysis, shoot review |
| 5 | [05-sheds-architecture.md](./05-sheds-architecture.md) | Wildlife, mapping, conditions, observations |
| 6 | [06-routing.md](./06-routing.md) | Canonical routes and nav contracts |
| 7 | [07-design-system.md](./07-design-system.md) | Shared WDS rules for the three products |

## Binding owner decision (2026-07-22)

- **Outdoor OS era** — historical, not canonical
- **Recovery / V2 / V3 Dashboard eras** — historical, not canonical
- **New canonical:** Waypoint Studio 2026 Rebuild
- **Home Vision Lock:** [home-vision-lock-owner-review.md](./home-vision-lock-owner-review.md) — public `/` is **Home** = Rebuild Phase 2; `dashboard` remains an internal module name; `/apps/dashboard/` is a permanent alias
- **Only three products:** Home (internal: Dashboard) · Scenes · Sheds
- Do **not** merge product philosophies
- Do **not** preserve Outdoor OS because it is newer
- Do **not** restore historical homepage / Outdoor OS / Recovery as product faces

Archived prior vision/spec docs: [`docs/archive/pre-rebuild-2026/`](../archive/pre-rebuild-2026/).

Product philosophy that still applies across products: [`docs/PRODUCT_STANDARDS.md`](../PRODUCT_STANDARDS.md) (trust, privacy, honesty, observational education). Rebuild docs govern product IA and architecture; Product Standards govern feel and non-negotiables. **Home Vision Lock** is binding for public IA after owner approval.
