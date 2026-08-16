# Deep Forest Dispatch — Public Launch Report

**Date:** 2026-08-16  
**Integration branch:** `cursor/dfd-public-launch-efa3`  
**Base:** `main`

---

## PRODUCTION

| Item | Status |
|------|--------|
| Deployed | See live verification at end of this section (updated after Pages deploy) |
| Production commit | Commit on `main` after merge/push of this launch branch |
| Library URL | https://waypointstudio.org/deep-forest-dispatch/ |
| Story count | **12** |
| Live verification | Run after GitHub Pages deploy completes |

### Integration

| PR | Role | Integration |
|----|------|-------------|
| #39 | Initial DFD library | Ancestor of Batch #3 tip |
| #40 | Article strategy | Docs already on Batch #3 tip |
| #41 | Batch #1 (stories 1–5) | Ancestor of Batch #3 tip |
| #43 | Batch #2 (stories 6–8) | Ancestor of Batch #3 tip |
| #44 | Batch #3 (stories 9–12) | Merged into launch branch → `main` |

### Library slugs (12)

1. `mount-hood-rain-shadow`  
2. `lencois-maranhenses`  
3. `great-salt-lake-two-colors`  
4. `valley-fog-at-dawn`  
5. `lenticular-clouds-explained`  
6. `okavango-dry-season-flood`  
7. `eye-of-the-sahara-richat`  
8. `namib-dunes-moving-satellites`  
9. `kati-thanda-lake-eyre-fills`  
10. `channeled-scablands-floods`  
11. `kgari-rainforest-on-sand`  
12. `columbia-glacier-satellite-retreat`

### Pre-deploy validation (this environment)

| Check | Result |
|-------|--------|
| `node scripts/dfd/render-stories.mjs` | Pass — 12 stories |
| `node automation/test-deep-forest-dispatch.mjs` | Pass |
| `node automation/validate-production-assets.mjs` | Pass |
| `node automation/validate-production-links.mjs` | Pass (0 broken; pre-existing warnings on unrelated shells) |
| Sitemap entries for DFD | Present in `sitemap.xml` |
| robots.txt | `Allow: /` + Sitemap URL |
| Canonical / OG / JSON-LD | Emitted by DFD renderer |
| Analytics hooks | Present in `wds-dfd-analytics.js` |
| `youtubeVideoId` | Remains `null` until public IDs exist |

---

## SEARCH

| Item | Status |
|------|--------|
| Sitemap URL | https://waypointstudio.org/sitemap.xml |
| robots.txt | https://waypointstudio.org/robots.txt — allows crawl; points to sitemap |
| Canonical status | Absolute `https://waypointstudio.org/...` on DFD pages |
| Structured data | Article JSON-LD on story pages |
| Search Console | **Not configured in repo** — owner must verify + submit sitemap |

Setup doc: [GOOGLE-SEARCH-CONSOLE-SETUP.md](./GOOGLE-SEARCH-CONSOLE-SETUP.md)

---

## ANALYTICS

| Item | Status |
|------|--------|
| Implementation | CustomEvent + `__WAYPOINT_ANALYTICS_QUEUE__` (no second platform added) |
| DFD events wired | `DFD_LIBRARY_VIEW`, `DFD_STORY_VIEW`, `DFD_RELATED_STORY_CLICK`, `DFD_WAYPOINT_TOOL_CLICK`, `DFD_VIDEO_PLAY`, `DFD_YOUTUBE_CLICK` |
| Owner action | Confirm queue consumer / GA4 (or equivalent) receives events if not already |

---

## YOUTUBE

| Item | Status |
|------|--------|
| Video #1 final asset | **Not in this environment** — locate local approved export |
| Video #1 thumbnail | **Not in this environment** — interim still: `assets/images/deep-forest-dispatch/mount-hood/story-hero.jpg` |
| Video #1 package | [youtube/VIDEO-1-MOUNT-HOOD.md](./youtube/VIDEO-1-MOUNT-HOOD.md) |
| Video #2 final asset | **Not in this environment** — locate local approved export |
| Video #2 thumbnail | **Not in this environment** — interim still: `assets/images/deep-forest-dispatch/lencois/lencois-hero.jpg` |
| Video #2 package | [youtube/VIDEO-2-LENCOIS.md](./youtube/VIDEO-2-LENCOIS.md) |
| Channel setup | [youtube/CHANNEL-SETUP.md](./youtube/CHANNEL-SETUP.md) — owner creates channel |
| Video ID wiring | [YOUTUBE-VIDEO-ID-WIRING.md](./YOUTUBE-VIDEO-ID-WIRING.md) |

**Release order:** Video #1 first → Video #2 several days later. Do not upload from this agent environment.

---

## OWNER

See [OWNER-LAUNCH-ACTIONS.md](./OWNER-LAUNCH-ACTIONS.md) — only personal owner steps.

---

## Live verification checklist (post-deploy)

Fill after Pages deploy:

- [ ] `GET /deep-forest-dispatch/` → 200, 12 story links
- [ ] All 12 story URLs → 200
- [ ] Images / graphics render
- [ ] Canonical + JSON-LD present
- [ ] Sitemap lists library + 12 stories
- [ ] robots.txt reachable
- [ ] No accidental `noindex`
- [ ] Analytics script loads / events fire in console or queue
