# Story Mode — design notes

## Intent

Story Mode turns disconnected Global Signals records into a calm **intelligence briefing** — sequential, scannable, evidence-first. It is not a news feed, not a chat bot, and not an LLM narrative generator.

## Composition

1. Brand + short mission (hub header)
2. Honesty banner (sample/demo)
3. Curated story picker (seed IDs only)
4. Briefing header (title, dek, confidence / horizon / path method)
5. Section TOC with present/missing status
6. Nine briefing sections in reading order
7. Explore-modules deep links + honest gaps

## Section order (default)

What happened → Why it matters → Industries → Countries → Citizen impacts → Related articles → Relationship graph → Confidence → Evidence

## Trust rules

- Curated story definitions may reference entity / edge / article / industry / country / citizen IDs only.
- Section bodies come from structured fields (article factual summaries, cascade summaries, edge `why`, industry/article `waypointsTake`, linked records).
- Missing sections render honest empty states — never filler.
- Confidence is the weakest hop on the traversed path; Predicted hops never use Observed.
- No AI generation of edges, takes, confidence, or evidence.

## Visual

Reuse Global Signals landing tokens (deep navy field, mint accent, IBM Plex). Chain UI mirrors Explain This / Relationship Explorer so literacy transfers across modules. Desktop + mobile; skip link; reduced-motion respect.
