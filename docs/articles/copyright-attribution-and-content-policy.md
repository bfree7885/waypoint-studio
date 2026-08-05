# Waypoint Articles — Copyright, Attribution & Content Policy

## Core rule

**The original publisher remains the destination.**

Waypoint:

- links to the canonical article URL from the feed
- may use feed-provided title, description/excerpt, dates, categories, and permitted enclosure metadata
- may generate a short summary and **Waypoint’s Take** grounded only in that permitted metadata
- does **not** copy, scrape, or republish full copyrighted article text
- does **not** load remote article HTML into the application as content
- does **not** execute embedded feed scripts

## Attribution requirements

Every card must show:

- source / publisher name
- publication date when available
- clear “Read original article” CTA opening the publisher URL (`rel="noopener noreferrer"`)
- notice that Waypoint does not host the full article

RSS exports must state that Waypoint is curating and commenting on third-party reporting.

## Summary policy

Allowed sources for summaries:

- sanitized feed description / summary / content fields (truncated)
- title + metadata

Not allowed:

- invented quotations
- exaggerated claims
- long copied passages
- presenting a truncated excerpt as a complete editorial summary

Provenance labels:

- `ai-generated`
- `feed-description`
- `editor-written`
- `unavailable`

This sprint ships **deterministic feed-description** summaries (and honest `unavailable` when material is too thin). No production AI summarizer is required.

## Waypoint’s Take policy

Separate from the summary. Explains outdoor-observer relevance and optional Waypoint product context.

Must not:

- give unsupported medical, legal, emergency, or wildlife-handling advice
- present speculation as fact
- manufacture a product connection where none exists
- use marketing language or identical boilerplate on every card

Provenance labels: `generated` | `editor-written` | `fallback` | `unavailable`

## Topic exclusions

Reject politics-as-news, celebrity, lifestyle filler, gear shopping, and unrelated tech unless it directly affects outdoor observation, public lands, environmental science, photography, hiking, or Waypoint users.

## Images

Only feed-permitted enclosure / media URLs may be retained as `imageUrl`. Image credit stored when available. The default card UI prioritizes text attribution over decorative remote images.
