# Scenes + Waypoint Publishing

**Canonical product roles:** see `docs/PRODUCT-DIRECTION.md`.  
**Dashboard Discover (do not rewrite):** `docs/DASHBOARD-DISCOVER.md`.

## Jobs

| Surface | Question |
|---------|----------|
| **Dashboard** | What should I notice today? |
| **Scenes** | What am I looking at, and why is it interesting? |
| **Publishing** | Shared infrastructure that tells the story (articles, videos, visual stories). |
| **Sheds** | Help me go — specialized field objective (out of scope here). |

## Content types

| Format | When to use |
|--------|-------------|
| **Scene tools** | Craft + visual exploration (Coach, Library, Auto Edit, Moving Scenes, Hidden Landscapes). |
| **Story (DFD)** | First-party visual Earth explanation — maps, imagery, sources. |
| **Article** | Readable explanation; curated third-party field reading + rare first-party samples. |
| **Video** | Narrated companion when a story earns film (YouTube). |

One subject may have story + video + Scenes pathway. Never force every format.

## Deep Forest Dispatch

**Editorial series / label** under Waypoint Publishing — not a fourth Studio product.

- Library: `/deep-forest-dispatch/`
- Stories: JSON in `data/deep-forest-dispatch/stories/` → `scripts/dfd/render-stories.mjs`
- Analytics hooks: `DFD_*` CustomEvents (compatibility preserved)
- YouTube channel may keep the DFD name

## Relationships & matching

Source of truth: `data/publishing/content-relationships.json`  
Runtime: `WDS.publishingMatch` (`design-system/js/platform/wds-publishing-match.js`)

`matchDiscovery(ctx)` returns a story card only when:

1. Happening Now / signal text hits explicit `signalKeywords`, or  
2. Caller passes an explicit topic that the story lists, or  
3. Conservative labeled condition rule (today: `quiet-humid-cool` → valley fog)

**Empty match is success.** No embeddings. No filler links.

Dashboard deepeners show **Understand this** only when a match exists. Static Go deeper hubs remain.

## Dashboard → story handoff

```
Discovery (honest signal)
  → optional Understand card (matched story)
    → DFD story (± video)
      → Continue in Waypoint (Scenes / Dashboard / Articles)
```

## Generation workflow (real)

DFD: topic → research → ledger → draft → fact check → render → QC → publish → measure  
Articles: feed fetch → sanitize → score → summarize → Take → JSON/RSS  
Content Engine: regional product bundles (separate from DFD pages)

AI may assist production; claims need verification paths (ledgers / sources). Do not automate misinformation.

## Analytics

Preserve `DFD_LIBRARY_VIEW`, `DFD_STORY_VIEW`, `DFD_VIDEO_PLAY`, `DFD_RELATED_STORY_CLICK`, `DFD_WAYPOINT_TOOL_CLICK`, `DFD_YOUTUBE_CLICK`.  
No third-party collector in-repo yet — do not invent metrics.

## Subscription boundary (future)

Publishing attracts curiosity; Studio tools create recurring value.  
Do not paywall discovery stories in this phase. Future free/subscriber lines should protect craft depth and field tools first, not the entry stories that teach people what Waypoint is.

## Known limitations

- Only Mount Hood has a live YouTube ID; Lençóis package exists without public ID.
- Ledgers missing for the two earliest film heroes.
- Scenes craft tools do not deep-link into specific DFD lessons yet.
- Browse taxonomy in relationships JSON is for matching/docs — DFD library still uses the story grid.
- `experiences.json` remains unused (documented; not invented as SSOT this phase).

## Intentionally not built

Deck OS · Fieldry · Savant · Sheds V3.2 · social · giant CMS · vector search · mass filler articles · Dashboard Discover rewrite · aggressive paywalls.
