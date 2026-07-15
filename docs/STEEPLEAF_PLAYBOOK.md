# Waypoint Studio Steepleaf Playbook v1.0

> Product standards for tea discovery, brewing practice, and tasting literacy.

Steepleaf helps people explore tea—catalog knowledge, brew journaling, flavor
notes, and calm recommendations—through curiosity rather than social
competition or marketplace pressure.

Complements: Engineering, Product Standards, UI/UX, QA, Performance,
Accessibility, Security, Release, and Lessons Learned playbooks.

------------------------------------------------------------------------

# Product Mission

Help people **observe, understand, and create** better tea experiences at
their own pace—learning leaves, water, time, and taste without pretension.

Steepleaf is an education-through-exploration product. It is not a ranking
arena, not a shopfront requirement, and not a substitute for personal taste.

------------------------------------------------------------------------

# Target Users

- Curious tea drinkers improving brew craft
- Journalers tracking what they actually enjoy
- Learners exploring origins, styles, and flavor language
- Households wanting calm recommendations without influencer theater

------------------------------------------------------------------------

# Non-Negotiable Principles

1. **Personal taste over popularity.**
2. **Recommendations are optional, explainable, and dismissible.**
3. **Brew notes are private on-device by default.**
4. **No marketplace dependency** for core learning loops.
5. **No public tasting boards or follower dynamics** as product backbone.
6. **Knowledge should grow from shared Knowledge domains** where possible—
   avoid a contradictory parallel encyclopedia.
7. **Honesty about uncertainty** in steep guidance (leaf variability, water,
   altitude, preference).
8. **Education via exploration**—not quizzes-as-gatekeeping.

------------------------------------------------------------------------

# UX Expectations

- Catalog and journal feel inviting and low-pressure
- Brew session guidance emphasizes senses and iteration
- Flavor notes use approachable language alongside optional precision
- Empty journal invites a first cup, not a certification path
- Mobile and kitchen-friendly layouts: readable at a glance, large controls
- Cross-links to broader Waypoint knowledge stay contextual and calm

------------------------------------------------------------------------

# Loading and Error States

| State | Expectation |
|-------|-------------|
| Catalog loading | Skeletons/Updating; no fake “top teas” invented |
| Saving brew note | Clear saved/failed states |
| Recommendation unavailable | Explain missing inputs (preferences, notes); do not invent ratings |
| Offline | Local journal works; catalog may be partial/cached and labeled |

Anti-patterns: social proof counters; paywalled basics; certainty timers that
shame personal variation.

------------------------------------------------------------------------

# AI Behavior

- Suggest brew adjustments and tasting language with humility
- Explain *why* a suggestion might help (temperature, ratio, time)
- Never imply a single correct taste
- Personalize from the user’s journal—without fabricating past sessions
- Keep wellness/medical claims out unless rigorously sourced and in scope
  (prefer none by default)

------------------------------------------------------------------------

# Data Quality Expectations

- Tea entities distinguish style, origin claims, and uncertainty
- Journal entries preserve what the user recorded; AI polish is labeled if used
- Recommendations cite inputs (preferences, notes)—not mysterious scores
- Units and timers remain clear and user-editable
- Imports/exports of notes respect privacy

------------------------------------------------------------------------

# Accessibility Expectations

- Timers and brew controls operable by keyboard and assistive tech
- Flavor and temperature cues not color-only
- Readable typography for kitchen distance and bright light
- Focus management for session dialogs
- Reduced motion for decorative steep animations

------------------------------------------------------------------------

# Performance Expectations

- Journal and catalog shells appear quickly
- Large catalogs paginate/filter without jank
- Timers remain accurate without locking the UI thread poorly
- Offline journal path prioritized over remote catalog richness

------------------------------------------------------------------------

# Release Quality Gates

- [ ] No competition/marketplace forcing in core flows
- [ ] Privacy default for brew notes unchanged unless intentional and documented
- [ ] Recommendation explainability intact when recommendations ship
- [ ] Save/reload journal integrity verified
- [ ] Uncertainty preserved in steep guidance copy
- [ ] Mobile/kitchen usability checked
- [ ] Accessibility smoke on brew session controls

Foundation incompleteness is acceptable; engagement farming is not.

------------------------------------------------------------------------

# Future Extensibility

Steepleaf may deepen sessions, sensory education, or careful pairing with
related land/plant knowledge (for example ForageCast content tracks).
Extensions should keep taste personal and commerce optional.

Avoid prescribing commerce platforms; preserve calm learning loops.

------------------------------------------------------------------------

# Versioning

**Steepleaf Playbook v1.0.** Living product handbook. Update when
recommendation ethics or journal privacy rules change.
