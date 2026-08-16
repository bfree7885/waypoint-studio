# Deep Forest Dispatch — Content Measurement Plan

**Status:** Experiment design for the article-library phase  
**Date:** 2026-08-16  

## Goal

Learn which Earth stories earn discovery, attention, and deeper Waypoint exploration — then feed that learning into topic selection and selective video production.

## Existing hooks to use

From DFD analytics interface (PR #39):

- `DFD_LIBRARY_VIEW`
- `DFD_STORY_VIEW`
- `DFD_RELATED_STORY_CLICK`
- `DFD_WAYPOINT_TOOL_CLICK`
- `DFD_VIDEO_PLAY` / `DFD_YOUTUBE_CLICK` (when videos exist)

Plus platform-available sources when configured:

- Google Search Console (impressions/clicks/queries) — if/when property access exists  
- Server or privacy-respecting analytics already on Waypoint — do not invent a paid stack  

**Do not invent numeric success thresholds without baseline context.**

## Metrics to track

| Question | Signals |
|----------|---------|
| Did people find it? | Search impressions/clicks (GSC); landing sessions |
| Did they engage the story? | Story views; scroll/time if available; compare-slider use later |
| Did they go deeper into DFD? | Related-story clicks; library return |
| Did they enter Waypoint tools? | Tool clicks (Dashboard, Scenes, etc.) |
| Did video help? | YouTube click/play when present |
| What should become video? | High curiosity + high visual originality + engagement |

## Checkpoints

Evaluate after approximately:

### ~10 published new articles
- Which titles earn impressions?
- Which earn clicks?
- Any related-story paths forming?
- Production effort vs payoff — too slow / too thin?

### ~20 published new articles
- Topic clusters that work (weather noticing vs mega-landscape vs satellite change)
- Internal link graph health
- First candidates for selective video adaptation
- Topics to stop repeating

### ~30 published new articles
- Portfolio gaps vs overrepresented themes
- Evergreen vs spike behavior (e.g., Lake Eyre fills)
- Whether article→tool conversion is real
- Decision: continue cadence, slow down, or shift mix

## Checkpoint review questions (same each time)

1. WHAT IS GETTING IMPRESSIONS?  
2. WHAT IS GETTING CLICKS?  
3. WHAT IS KEEPING PEOPLE READING?  
4. WHAT IS SENDING PEOPLE DEEPER INTO WAYPOINT?  
5. WHAT TOPICS SHOULD BECOME VIDEOS?  
6. WHAT SHOULD WE STOP MAKING?

## Anti-vanity rules

- Raw page count is not success  
- Rankings without engagement are weak signal  
- Do not chase high-volume topics that fail the Waypoint advantage test  
- Do not declare “SEO win” from anecdotes alone  

## Reporting format

At each checkpoint, write a short note under `docs/deep-forest-dispatch/strategy/checkpoints/` with:

- date / article count  
- top impression pages  
- top engaged stories  
- related-click leaders  
- tool-click leaders  
- keep / cut / video candidates  
- next five topics (from candidate pool)
