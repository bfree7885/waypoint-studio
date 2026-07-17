# Waypoint Editorial Standards

**Status:** Active — curated knowledge & interpretive copy  
**Audience:** Editors, product AI writing summaries, and anyone adding `wk_*` entries  
**Complements:** [Knowledge Platform](WAYPOINT-KNOWLEDGE-PLATFORM.md) · [Research Integrity](RESEARCH-INTEGRITY.md) · [Constitution](WAYPOINT-CONSTITUTION.md) · general [Editorial Standards](EDITORIAL-STANDARDS.md)

These standards govern **how Waypoint selects, summarizes, and presents curated knowledge**.

Quality over quantity. Depth over speed. Understanding over engagement.

---

## 1. How sources are selected

Prefer, in order:

1. Peer-reviewed primary research  
2. Government and university / extension publications  
3. Established professional organizations and technical standards  
4. High-quality scholarly reviews and field guides  
5. Clearly identified expert commentary (labeled as such)  
6. Books and historical references when they remain the best available framing  

Reject as knowledge foundations:

- Anonymous claims  
- Engagement bait and unverifiable viral posts  
- Scraped full-text dumps  
- AI summaries of random web pages without editorial ownership  
- Sources we cannot cite honestly  

One excellent entry beats twenty mediocre ones.

---

## 2. Source quality requirements

Every curated entry must have:

- A real `sourceName` (or honest `demonstration` fixture labeling)  
- A `sourceType` from the curated taxonomy  
- A Source Summary that a careful reader would recognize as faithful  
- Separated Waypoint Perspective (never mixed into the summary)  
- Limitations when scope, sample, or disagreement matters  
- `dateReviewed` and an honest `reviewStatus`  

When an original URL exists and linking is lawful, set `originalUrl`.  
Never fabricate researchers, journals, findings, dates, statistics, or URLs.

---

## 3. How summaries are written

### Source Summary

- What the publication says  
- Plain language; define jargon once  
- No Waypoint product advice inside this block  
- No hype, no “breaking,” no clickbait titles  

### Key findings

- Short bullets grounded in the source  
- Prefer measurable or clearly bounded claims  

### Why it matters

- Product / field relevance in guide language  
- Invitation, not obligation  

### Waypoint Perspective (`waypointAnalysis` field)

- How this connects to app use and observation  
- Where uncertainty remains  
- Always labeled in UI as **Waypoint Perspective**  
- Never implied to be the authors’ words  

### Limitations

- Scope, geography, season, sample size, conflicting evidence  
- What Waypoint is **not** claiming  

---

## 4. How uncertainty is represented

- Prefer “may,” “often,” “evidence suggests,” “in this region”  
- Separate evidence, interpretation, opinion, and unknowns (Constitution Principle 3 & 8)  
- For single studies: note that one study is not universal truth  
- For advisories: date and freshness are first-class  

Safety, legality, toxicity, and wildlife ethics stay **direct** — never soft-pedaled.

---

## 5. How corrections are handled

When something is wrong or a source changes:

1. Correct the summary / perspective promptly  
2. Update `dateReviewed`  
3. If retracted, say so clearly in limitations or archive the entry  
4. Fix or remove broken `originalUrl` values  
5. Prefer honesty over saving face  

Future systems may keep a short correction note; V1 requires honest status and dates.

---

## 6. How outdated material is archived

- Set `reviewStatus` to `archived` when guidance is superseded  
- Do not delete history silently if users may have bookmarked an id  
- Prefer a newer related entry via `relatedEntries` when available  
- Archived cards should not appear in default “featured” or hook surfaces  

---

## 7. How conflicting evidence is presented

- Acknowledge disagreement when credible sources conflict  
- Do not pick a winner for engagement  
- Summarize each position fairly in Source Summary or Limitations  
- Waypoint Perspective may explain *why the conflict matters in the field* without forcing a side  

For SignalTerrain and intelligence-adjacent material: defensive, educational, lawful, non-operational; no fear bait; separate reporting from interpretation.

---

## 8. Copyright and linking

- Prefer metadata, summaries, analysis, and outbound links  
- Do not scrape or republish copyrighted articles in full  
- Short compliant excerpts only when necessary and attributed  
- Demo fixtures: `reviewStatus: "demonstration"`, `accessType: "demo-only"`, no fake URLs  

---

## 9. Product language for knowledge CTAs

Prefer: Why this matters · Worth noticing · Related research · Background · If you’re curious  

Avoid: Next lesson · Required reading · Complete this · Assignment · Streak  

---

## 10. AI assistance (when used)

AI may help draft structure.  
A human editor owns selection, faithfulness, and Perspective.  
AI must not invent sources.  
AI must pass the Constitution self-check before any user-facing knowledge text ships.

See: [Waypoint AI Principles](WAYPOINT-AI-PRINCIPLES.md).

---

## Related documents

- [Knowledge Platform V1](WAYPOINT-KNOWLEDGE-PLATFORM.md)  
- [Waypoint Knowledge](WAYPOINT-KNOWLEDGE.md)  
- [Editorial Standards](EDITORIAL-STANDARDS.md)  
- [Research Integrity](RESEARCH-INTEGRITY.md)  
- [Guide Experience](WAYPOINT-GUIDE-EXPERIENCE.md)  
