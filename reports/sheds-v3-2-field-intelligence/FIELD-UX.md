# Sheds V3.2 — Inspect field UX

**Slice:** Make Inspect usable while walking. No new intelligence.  
**Date:** 2026-08-26  
**Branch:** `chore/product-direction-reconciliation`

The map stays the primary field surface. Inspect stays Inspect — not YOU, SEARCH, or OBS.

---

## What changed

- **Stay in Inspect until Done.** After the first tap, further map taps move the inspect point instead of setting SEARCH. Generation tokens still drop stale elevation/terrain fetches.
- **SEARCH copy hides** while Inspect is armed: `#search-prompt` and Field Briefing (`#plan-card`, “Choose a Search Area”) so they do not compete with the HUD. Briefing returns after Done. Plan and Note in the dock stay available.
- **Progressive disclosure.** Facts (“What is here”) are visible. Why this may matter and Limits sit behind a 44px summary until opened.
- **Shorter HUD.** Collapsed max-height `min(38vh, 16.5rem)`; HUD sizes to facts instead of stretching empty chrome. Expanded only when Why/Limits is open. Right gutter kept for locate/zoom.
- **Inspected point stays visible.** After each tap, the map pans so the yellow INSPECT marker is below the HUD and left of map controls.
- **Tap targets.** Done and the Why/Limits summary are at least 44px (`2.75rem`).

## What did not change

Facts, Why rules, Limits copy, GIS sources, and YOU ≠ SEARCH ≠ INSPECT ≠ OBS markers. Observation FAB and dock stay at the bottom.

## Known leftovers

- Inspect is still opened from More → Inspect next tap (no new dock control).
- Desktop session-strip / `prompt×here` overlap from V3.1 is unchanged; Inspect HUD can sit under “Search active” when a session is on.
- Land cover still only inside the Pike pack.
- Expanded Why/Limits still scrolls on short phones (intentional — map stays visible).
