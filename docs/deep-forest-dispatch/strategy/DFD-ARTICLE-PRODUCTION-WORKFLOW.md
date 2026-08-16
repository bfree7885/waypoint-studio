# Deep Forest Dispatch — Article Production Workflow

**Status:** Required guardrail for article-library phase  
**Date:** 2026-08-16  

## Model

Articles are the scalable base. Videos are selective.

Automation may assist research, scaffolding, formatting, and checks.  
Automation must **not** become mass page generation.

## Required pipeline (no shortcuts)

```text
TOPIC APPROVED
→ RESEARCH
→ SOURCE LEDGER
→ ARTICLE BLUEPRINT
→ ORIGINAL VISUAL / DATA PLAN
→ DRAFT
→ FACT CHECK
→ EDITORIAL REVIEW
→ RENDER / PREVIEW
→ OWNER REVIEW OR APPROVED BATCH QC
→ PUBLISH
```

**Forbidden:** keyword → AI draft → publish.

## Step detail

### 1. Topic approved
From First 10 / ranked candidate pool. Portfolio coherence matters.

### 2. Research
Confirm place, mechanism, SERP gaps, Waypoint advantage.

### 3. Source ledger
Claims mapped to authoritative sources (`DFD-ARTICLE-SOURCE-PLAN.md`).

### 4. Blueprint
Use First-10 blueprint format; update if research changes the story.

### 5. Original visual/data plan
Name the non-prose asset that justifies the page (map, slider, diagram, annotated image, etc.).

### 6. Draft
Human-edited. Follow writing bans in blueprints doc. Place-first.

### 7. Fact check
Numbers, mechanisms, place names, image provenance.

### 8. Editorial review
Tone, clarity, originality, no AI-farm residue.  
Run the pass/fail checklist in `docs/deep-forest-dispatch/DFD-ARTICLE-QUALITY-GATE.md` before owner review.

### 9. Render / preview
Use DFD JSON → `scripts/dfd/render-stories.mjs` pipeline (PR #39).  
`youtubeVideoId` remains null unless a real public video exists.

### 10. Owner review or approved batch QC
Until trust is earned, prefer owner review for Flagships.

### 11. Publish
Sitemap update, library card, related-story links, analytics verification.

## Suggested cadence

After portfolio approval:

- **Target:** ~1 excellent article / 1–2 weeks  
- Prefer Flagship quality over calendar fill  
- Parallelize research for article N+1 while drafting N  
- Do not open more than 2–3 articles in active drafting at once  

## Video gate (later)

Promote to DFD video consideration only if:

- article engagement is healthy relative to peers, **or**
- visual originality is exceptional and filming is feasible, **and**
- the story is not already satisfied by existing videos

Pause on Video #3 until article library learning exists.

## Roles (lightweight)

| Role | Responsibility |
|------|----------------|
| Topic steward | Approves candidates |
| Researcher | Ledger + assets |
| Writer/editor | Draft + tone |
| Fact checker | Claims / provenance |
| Implementer | Render, SEO fields, QA |
| Owner | Flagship publish gate |

## Definition of done (single article)

- [ ] Blueprint followed or intentionally improved  
- [ ] Original visual shipped and credited  
- [ ] Sources/credits panel complete  
- [ ] Related stories + contextual Waypoint links  
- [ ] SEO fields + sitemap  
- [ ] Mobile reading pass  
- [ ] Analytics events firing on library/story  
- [ ] No invented video IDs  
- [ ] No Dashboard/Scenes/Sheds unrelated changes  
