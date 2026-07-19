# Waypoint Studio ForageCast Playbook v1.0

> Product standards for seasonal land understanding and stewardship.

ForageCast is a seasonal land companion—foraging literacy, orchard and garden
timing, food forest awareness, and phenology—centered on **why** species appear
where and when, not on guaranteed finds.

Complements: Engineering, Product Standards, UI/UX, QA, Performance,
Accessibility, Security, Release, and Lessons Learned playbooks.

------------------------------------------------------------------------

# Product Mission

Help people **observe and understand** seasonal living systems on land they
care about, so they practice safer, more ethical, more curious relationships
with plants and fungi.

ForageCast teaches stewardship and phenology. It does not promise harvests,
pin secret patches for crowds, or replace field identification.

**Product Recovery Phase 1** (summary-first outdoor intelligence): see
[`docs/FORAGECAST-PRODUCT-RECOVERY.md`](FORAGECAST-PRODUCT-RECOVERY.md).

------------------------------------------------------------------------

# Target Users

- Home stewards, gardeners, and food-forest tenders
- Ethical foragers building ID and season skills
- Land managers and educators teaching phenology
- Curious learners exploring regional season tables

------------------------------------------------------------------------

# Non-Negotiable Principles

1. **Ecological accuracy over engagement.** Prefer silence to fabrication.
2. **Uncertainty is explicit**—windows, suitability, and forecasts are
   estimates, not guarantees.
3. **Safety first**—toxics, look-alikes, and “confirm ID yourself” remain
   visible where relevant.
4. **Never share exact harvest spots** by default; private property and
   ethics respected.
5. **Phenology and seasonality** beat “pin the mushroom” utility framing.
6. **Property stewardship tools** serve care, not extraction contests.
7. **No homework theater**—observation and exploration, not quizzes-as-product.
8. **Outdoor ethics** (Leave No Trace, habitat care) are part of guidance.

------------------------------------------------------------------------

# UX Expectations

- Seasonal context is understandable quickly (what time of year means here)
- Guidance separates regional education from site-specific claims
- Safety callouts are calm and serious—not buried in footnotes only
- Maps/lists never pressure users to broadcast precise productive sites
- Empty land/property states invite careful setup, not scraping public data
  irresponsibly
- Mobile field readability matters: contrast, large controls, brief copy

------------------------------------------------------------------------

# Loading and Error States

| State | Expectation |
|-------|-------------|
| Season package loading | Updating / honest waiting; not “Perfect harvest now” |
| Missing location | Ask clearly; provisional regional education may show unlabeled as local |
| Model/estimate unavailable | Explain limits; offer educational fallback |
| Offline | Cached seasonal notes labeled; no new fabricated suitability |
| Conflict between sources | Prefer conservative uncertainty |

Anti-patterns: certainty badges on thin data; implying legal permission to
harvest; hiding look-alike warnings behind engagement UI.

------------------------------------------------------------------------

# AI Behavior

- Explain phenology, habitat logic, and seasonal timing
- Personalize to land notes the user provided—without inventing site surveys
- Always separate identification assistance from confirmation
- Refuse to present unsafe surety on toxic look-alikes
- Optional recommendations remain explainable and dismissible

AI must never claim “safe to eat” as a definitive judgment.

------------------------------------------------------------------------

# Data Quality Expectations

- Phenology windows cite seasonality logic or editorial regional knowledge
  with appropriate uncertainty
- Species guidance distinguishes native/invasive/cultivated contexts when
  relevant
- Property/land records are user-owned and precise only to the user’s intent
- Anonymous contribution ideas (if any) stay coarse (for example county-level)
  and opt-in
- Estimates labeled Estimated / seasonal—not Live weather impersonation

------------------------------------------------------------------------

# Accessibility Expectations

- Seasonal tables and key warnings are available as text, not color alone
- Keyboard navigation across primary land/season flows
- Safety warnings remain in the reading order, not hover-only
- Touch-friendly controls for field use
- Compatible with Accessibility Playbook contrast and focus rules

------------------------------------------------------------------------

# Performance Expectations

- Primary seasonal overview paints progressively
- Heavy maps or long species lists must not block first orientation
- Property tools remain responsive with growing local notes
- Networked weather/season inputs follow Dashboard-like honesty when shared

------------------------------------------------------------------------

# Release Quality Gates

- [ ] No harvest-guarantee framing in new copy or UI
- [ ] Uncertainty and safety language intact on touched flows
- [ ] Privacy: no exact patch sharing defaults introduced
- [ ] Loading/error honesty for seasonal estimates verified
- [ ] Mobile field readability checked
- [ ] Accessibility smoke on warnings and primary navigation
- [ ] Ethics regressions (baiting, extraction contests) absent

------------------------------------------------------------------------

# Future Extensibility

ForageCast may deepen phenology journals, orchard planners, or careful
community science at coarse geography. Extensions must preserve private
precise locations, safety humility, and ecological honesty.

Avoid prescribing models; preserve “teach why/when” over “guarantee find.”

------------------------------------------------------------------------

# Versioning

**ForageCast Playbook v1.0.** Living product handbook. Update when safety,
phenology ethics, or location-privacy rules change.
