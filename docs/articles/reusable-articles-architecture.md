# Reusable Articles Architecture (Side Trails–ready)

**Status:** Extension points documented — not a multi-tenant CMS  
**Canonical hub:** `/articles/`  
**Related:** [articles-architecture.md](./articles-architecture.md) · [waypoint-take.md](./waypoint-take.md) · [copyright-attribution-and-content-policy.md](./copyright-attribution-and-content-policy.md)

## Purpose

Waypoint Articles is a **shared reading layer** for Studio and, later, Side Trails projects. One schema, one feed UI module, one Take component — multiple origins may publish into the same contracts without inventing a CMS.

## Non-negotiables

- Do not republish full article HTML from third parties.
- Do not fabricate summaries or Takes when material is missing.
- **Waypoint’s Take** never restates Summary; it explains why it matters / who may be affected / what to watch for.
- Original publishers remain the destination for curated RSS items.
- Side Trails projects may contribute articles; they do not become primary Studio peers via the Articles hub alone.

## Shared modules

| Layer | Path | Role |
|-------|------|------|
| Hub UI | `design-system/js/platform/wds-articles-feed.js` | Filters, cards, honesty states |
| Editorial index | `design-system/js/platform/wds-articles.js` | Category / sample manifest |
| Take component | `design-system/js/platform/wds-take.js` | Official editorial interpretation |
| Feed CSS | `design-system/css/wds-articles-feed.css` | Card + Take styling on WDS tokens |
| Shell / nav | `wds-app-shell.js` + `wds-app-nav-config.js` | Shared primary nav (no one-off menus) |
| Pipeline | `scripts/articles/*` | Fetch → normalize → score → export |
| Data | `data/articles/articles.json` | Normalized curated set |
| Registry | `data/articles/feed-registry.json` | Maintainable feed list |

## Canonical article record (current + reserved)

Existing production fields remain the contract. Reserved optional fields prepare Side Trails publishing **without requiring them on live RSS items today**:

| Field | Required today | Notes |
|-------|----------------|-------|
| `id`, `canonicalUrl`, `title`, `sourceName`, … | Yes | See live `articles.json` |
| `summary` / `summaryProvenance` | Yes | Source facts / feed metadata |
| `waypointTake` / `takeProvenance` | Yes | Editorial; may be `unavailable` |
| `origin` | Reserved | `studio` \| `side-trail` \| `curated-rss` (default implied `studio` / curated) |
| `projectId` | Reserved | Side Trails catalog id (e.g. `signalterrain`, `global-signals`) |
| `projectLabel` | Reserved | Short chip label for UI when present |
| `collectionId` | Reserved | Optional grouping within a project |
| `takeKind` | Reserved | `interpretation` \| `restrained` (UI may derive from provenance) |

UI already tolerates `origin` / `projectId` / `projectLabel` when present; absence must not invent values.

## Publishing paths

```text
A) Curated RSS (today)
   feed-registry → refresh CLI → articles.json → /articles/ + RSS exports

B) Studio editorial samples (today)
   articles/samples/*.html + articles/manifest.json

C) Side Trails project articles (future)
   project supplies normalized records (same schema)
        │
        ├─ merge into data/articles/articles.json (shared hub), or
        └─ project-scoped JSON consumed by the same wds-articles-feed mount
             with dataUrl override
```

Path C is an **extension point**: same card renderer, same Take component, optional `projectId` chip. No separate Articles CMS.

## Mount contract (reuse)

```js
WDS.articlesFeed.mountFeed(el, {
  depth: 0,
  dataUrl: "../data/articles/articles.json",  // override for project feeds
  healthUrl: "../data/articles/health.json"
});

WDS.take.renderArticleHtml({
  body: article.waypointTake,
  summary: article.summary,
  provenance: article.takeProvenance
});
```

## Navigation

Articles pages use the shared app shell and `studioPrimaryNav` — Dashboard, Scenes, Sheds, Articles, Side Trails, Support, About. Do not add page-local primary menus that diverge from site architecture.

## Honesty states

Preserve: empty feed, unavailable feeds, filtered empty, stale data, summary unavailable, Take unavailable / restrained (no invention).

## Cross-links

- Global Signals / Side Trails product docs may reference this architecture when those projects publish articles.
- Take visual language aligns with Aurora / RC3 Take pattern (`docs/RC3-AURORA-DESIGN-SYSTEM.md`).
