# Deep Forest Dispatch — Content Workflow

**Audience:** DFD producers + Waypoint maintainers  
**Architecture:** content JSON → static HTML render → GitHub Pages  
**Do not build a CMS.**

## Goal

Adding Video #3 (and later stories) should mostly be:

1. Research / source package  
2. Video production  
3. Content record + media  
4. YouTube ID when public  
5. Render + test + publish  

Not: new page engineering.

---

## Architecture (keep it)

| Piece | Path | Role |
|-------|------|------|
| Catalog | `data/deep-forest-dispatch/catalog.json` | Library index |
| Story records | `data/deep-forest-dispatch/stories/<slug>.json` | Source of truth |
| Renderer | `scripts/dfd/render-stories.mjs` | Writes static story HTML |
| Library page | `deep-forest-dispatch/index.html` | Destination / collection |
| Story pages | `deep-forest-dispatch/stories/<slug>/index.html` | Generated, crawlable |
| CSS | `design-system/css/wds-dfd.css` | Shared DFD visual system |
| JS | `design-system/js/dfd/*` | Library, story enhancers, analytics hooks |
| Media | `assets/images/deep-forest-dispatch/` | Heroes, diagrams, satellite/edu assets |

---

## Add a new story (Video #3+)

### 1. Research package

Collect: location, coordinates, concepts, authoritative sources, imagery credits, scientific cautions, related Waypoint tools that **actually exist**.

### 2. Create media

Add assets under:

```text
assets/images/deep-forest-dispatch/<story-folder>/
```

Update `assets/images/deep-forest-dispatch/README.md` with provenance.

Prefer NASA / USGS / NOAA public-domain imagery. Label educational derivatives clearly.

### 3. Add story JSON

Copy an existing file in `data/deep-forest-dispatch/stories/` and rename:

```text
data/deep-forest-dispatch/stories/<slug>.json
```

Required fields (minimum):

- `id`, `slug`, `title`, `subtitle`, `deck`, `shortDescription`
- `seoTitle`, `metaDescription`, `ogImage`, `canonicalPath`
- `published`, `status` (`published` \| `draft`)
- `youtubeVideoId` (string or `null`)
- `hero` (`src`, `alt`, `credit`, `license`)
- `location` (`name`, `region`, `coordinates`)
- `concepts[]`
- `sections[]` with `blocks` (`p`, `aside`, `figure`, `diagram`, `map`, `compare`)
- `sources[]`, `credits[]`
- `relatedStories[]` (slugs)
- `waypointConnections[]` (only real routes)

### 4. Register in catalog

Add an entry to `data/deep-forest-dispatch/catalog.json` → `stories[]` with card fields + `path` + `data`.

### 5. YouTube ID

If the video is **not** public yet:

```json
"youtubeVideoId": null
```

The story page shows a finished “Film companion coming soon” panel — never a broken player.

When the video is public:

```json
"youtubeVideoId": "abcdefghijk"
```

Re-render. Embed + VideoObject structured data appear automatically.

**Do not invent URLs or IDs.**

### 6. Render

From repo root:

```bash
node scripts/dfd/render-stories.mjs
```

### 7. Sitemap

Add the story URL to `sitemap.xml` (same pattern as existing DFD story entries).

### 8. Library static cards (SEO)

Update the crawlable card list inside `deep-forest-dispatch/index.html` so the new story is present even before JS runs. The catalog mount will refresh the grid from JSON.

### 9. Test

```bash
node automation/test-deep-forest-dispatch.mjs
# plus normal CI / smoke as configured
```

### 10. Publish

Commit generated HTML + JSON + media. Deploy via existing Pages pipeline.

---

## Related stories

Set `relatedStories` to other slugs. Story pages load card metadata from the catalog.

## Waypoint connections

Use contextual labels (`See today’s conditions`, `Plan a photo`, …).  
Only link routes that exist in production.

## Analytics hooks

Events (CustomEvent + `__WAYPOINT_ANALYTICS_QUEUE__`):

- `DFD_LIBRARY_VIEW`
- `DFD_STORY_VIEW`
- `DFD_VIDEO_PLAY` (best-effort on embed interaction)
- `DFD_RELATED_STORY_CLICK`
- `DFD_WAYPOINT_TOOL_CLICK`
- `DFD_YOUTUBE_CLICK`

No paid analytics platform.

## Honesty rules

- Do not paste YouTube transcripts as the page.
- Web stories go **deeper** than the film.
- Preserve scientific caution notes in research.
- Keep provenance on imagery and diagrams.
