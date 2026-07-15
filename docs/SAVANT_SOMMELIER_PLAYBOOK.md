# Waypoint Studio Savant Sommelier Playbook v1.0

> Product standards for wine landscape literacy, terroir, and tasting education.

Savant Sommelier helps people understand vineyards as living landscapes—
terrain, climate, soils, and wine styles—with transparency and calm education
rather than lifestyle pretense.

Complements: Engineering, Product Standards, UI/UX, QA, Performance,
Accessibility, Security, Release, and Lessons Learned playbooks.

------------------------------------------------------------------------

# Product Mission

Help people **observe and understand** wine through place—terroir, seasons,
and sensory practice—so learning feels curious and grounded.

Savant Sommelier teaches landscape literacy. It is not an influencer score
app, not a mandatory marketplace, and not a competitive tasting board.

------------------------------------------------------------------------

# Target Users

- Learners building wine literacy without intimidation
- Travelers and hosts seeking place-based understanding
- Small producers or stewards keeping private site notes
- Enthusiasts journaling tastings for personal memory

------------------------------------------------------------------------

# Non-Negotiable Principles

1. **Landscape literacy over lifestyle branding.**
2. **Transparency**—suitability and guidance carry honest confidence.
3. **Responsible presentation**—no pressure to overconsume; adult, calm tone.
4. **Property and site details private by default.**
5. **No marketplace requirement** for learning loops.
6. **No influencer scores or competitive public boards** as core product.
7. **Distinguish observation, typical style notes, and personal preference.**
8. **Scientific and geographic humility**—terroir is complex; avoid myths sold
   as certainty.

------------------------------------------------------------------------

# UX Expectations

- Concepts introduce place before prestige
- Tasting notes invite personal language alongside optional structured descriptors
- Suitability or climate context shows uncertainty bands, not fake precision
- Empty private cellars/journals invite a first note, not a status contest
- Visual design stays elegant and quiet—not nightclub luxury clichés
- Mobile tasting entry is fast and readable in dim restaurants (contrast!)

------------------------------------------------------------------------

# Loading and Error States

| State | Expectation |
|-------|-------------|
| Place/climate context loading | Updating; no invented vineyard stats |
| Saving tasting note | Clear saved/failed |
| Suitability model unavailable | Educational landscape copy without fake scores |
| Offline | Personal notes available; remote place intel labeled cached/unavailable |

Anti-patterns: authoritative scores from empty data; public ranking of users’
palates; shaming “wrong” preferences.

------------------------------------------------------------------------

# AI Behavior

- Explain terroir factors, typical styles, and tasting vocabulary
- Coach sensory attention without enforcing elitist gatekeeping
- Personalize from the user’s notes—never fabricate their history
- Label style generalizations versus site-specific claims
- Avoid medical health claims and irresponsible consumption encouragement
- Refuse to invent vintages, lab chemistry, or critic scores

------------------------------------------------------------------------

# Data Quality Expectations

- Sites/wineries/wines separate verified editorial fields from user private notes
- Climate/soil/terrain context cites appropriate uncertainty
- Tasting journal preserves user words; AI rewrites are optional and labeled
- Imports do not overwrite private notes silently
- Geographic precision respects privacy settings

------------------------------------------------------------------------

# Accessibility Expectations

- Tasting forms fully labeled; errors clear
- Flavor wheels/visualizations not color-only
- Keyboard path for journal and exploration
- Contrast suitable for low-light contexts when possible
- Reduced motion for decorative vineyard imagery

------------------------------------------------------------------------

# Performance Expectations

- Journal and learning shells appear before heavy map/terrain assets
- Large catalogs filter without blocking note capture
- Offline-first personal notes remain fast
- Progressive place intelligence similar in spirit to Dashboard honesty

------------------------------------------------------------------------

# Release Quality Gates

- [ ] No competitive scoring/social prestige mechanics in core UX
- [ ] Privacy defaults for property/site notes preserved
- [ ] Confidence/uncertainty shown for suitability-style insights
- [ ] Responsible, non-pushy consumption tone in copy
- [ ] Save/reload tasting notes verified when features exist
- [ ] Mobile tasting entry usable; contrast checked
- [ ] Accessibility smoke on journal forms
- [ ] No fabricated critic/place statistics on failure paths

Foundation gaps are fine; pretentious or coercive patterns are not.

------------------------------------------------------------------------

# Future Extensibility

Savant Sommelier may deepen site journals, climate literacy, regional guides,
or careful pairing education. Extensions should keep place-honest learning and
optional commerce.

Avoid prescribing marketplace integrations; preserve private stewardship of
site details and personal taste.

------------------------------------------------------------------------

# Versioning

**Savant Sommelier Playbook v1.0.** Living product handbook. Update when
privacy, responsible-presentation, or terroir-confidence rules change.
