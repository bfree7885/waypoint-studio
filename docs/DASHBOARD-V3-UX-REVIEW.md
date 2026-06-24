# Dashboard V3 — Persona UX Review

Review date: May 2026  
Scope: Waypoint Studio homepage (`index.html` + Pike County Preview bundle) after V3 living dashboard pass.

---

## Teacher

**Immediately understands**
- The page is organized as a field-learning dashboard, not a news feed.
- "This week outdoors" frames a clear outdoor question and seasonal context.
- Seasonal Watch cards explain *why* phenomena matter, not just *what* is blooming.
- Species Spotlight reads like a lesson module with identification, ecology, and observation tips.
- Research Brief labels confidence and uncertainty instead of presenting science as settled fact.
- Instruments section explains what each tool does and who it helps.

**Still confusing**
- "Pike County Preview" appears in multiple places without one short explainer link near the hero.
- Weekend Investigation is easy to miss — it sits below the dashboard without nav prominence until added.
- Provenance badges (educational / placeholder) are small; students may skim past them.

**Improve next**
- Add a one-line "Preview laboratory" callout in the hero with link to strategic direction.
- Optional classroom mode: printable weekend investigation worksheet.
- Tie field notes to NGSS-style "investigate" prompts where appropriate.

---

## Hiker

**Immediately understands**
- Dashboard bento cards organize weather, trails, water, sky, and wildlife as field cues.
- Weekend prompt and outdoor challenge give a concrete reason to plan a trip.
- Field notes feel like trail-side reading — date, scope, try-this callouts.
- Conservation update focuses on stewardship actions, not abstract slogans.

**Still confusing**
- Live weather/widgets depend on OIP load state; loading copy may linger on slow connections.
- Trail and water cards are editorial placeholders — easy to mistake for real-time conditions without reading footnotes.

**Improve next**
- Stronger empty/loading states on dashboard cards with "confirm on the ground" language.
- Link trail card to future Fieldry route previews when available.

---

## Birder

**Immediately understands**
- Species Spotlight includes timing, habitat, and ethical observation guidance.
- Seasonal Watch highlights phenology shifts relevant to migration and breeding cues.
- "Observe ethically" rows reinforce distance and disturbance limits.

**Still confusing**
- No dedicated "birds this week" card yet — wildlife card is generic editorial.
- Species page links are prepared but not yet live for deep dives.

**Improve next**
- Add optional bird-specific watch card when regional data supports it.
- Cross-link Species Spotlight to eBird-style observation ethics (without implying integration).

---

## Wildlife photographer

**Immediately understands**
- Photo essay gallery respects frames with captions and placeholder honesty.
- Species module discourages collecting/disturbance; conservation note is visible.
- Dashboard emphasizes observation over possession.

**Still confusing**
- Gallery placeholders are styled but empty — no regional images yet.
- No EXIF/location privacy guidance on the photo section itself.

**Improve next**
- First real regional frames with location-generalized captions.
- Short callout on ethical photography (distance, nesting season, private land).

---

## New naturalist

**Immediately understands**
- Central question — "Why go outside today?" — is repeated in dashboard, watch cards, and challenges.
- Weekend Investigation offers a structured first field lab.
- Instruments explain learning paths (dashboard → ForageCast → Fieldry → Scenes).
- How Waypoint Works footer methodology remains available.

**Still confusing**
- Many sections on first scroll; hierarchy helps but the page is still long.
- Difference between "editorial estimate" and "placeholder" may need a glossary once.

**Improve next**
- Collapsible "first visit" guide anchored from hero.
- Progressive disclosure on instrument cards (expand for future capabilities).

---

## Conservation biologist

**Immediately understands**
- Research Brief separates summary, local application, uncertainty, and future citation slot.
- Conservation update blocks: habitat, stewardship, public lands — concrete framing.
- Regional field notes label scope and educational provenance.
- No fabricated citations; source slot marked as future.

**Still confusing**
- Confidence label is editorial, not tied to a formal evidence rubric yet.
- Phenology cards lack observation date ranges or data source hooks for future WOS integration.

**Improve next**
- Wire confidence to Research Integrity taxonomy (observation / estimate / educational / placeholder).
- Add WOS observation ID slots on field notes when citizen science pipeline exists.

---

## Cross-cutting strengths

1. Visual centerpiece on "This week outdoors" with shell layout and aside for happening-now + weekend.
2. Educational Seasonal Watch cards replace generic seasonal lists.
3. Species Spotlight premium module with ecology and observation tips.
4. Journal-style field notes with supporting facts.
5. Honest placeholders throughout — no fake live data.
6. Instrument cards as scientific tools with spec blocks.

## Cross-cutting gaps

1. Real photography and video assets still pending.
2. OIP live widgets not fully populated for all dashboard cards.
3. Nav could include Weekend Investigation and Research Brief for power users.
4. Mobile: long page; anchor nav helps but section density remains high on small screens.

## Recommended next milestone

**Milestone: Dashboard data honesty layer**

- Connect weather card to OIP with explicit fallback UI.
- Add 3–5 real regional photographs with generalized locations.
- Publish first species detail page linked from Species Spotlight.
- Implement Research Brief citation slot with one real primary source.
- Persona test with 2–3 local educators and iterate on Weekend Investigation.
