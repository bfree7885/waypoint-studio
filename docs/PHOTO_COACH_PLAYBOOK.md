# Waypoint Studio Photo Coach Playbook v1.0

> Product standards for constructive, transparent photographic coaching.

Photo Coach helps photographers see their work more clearly—strengths,
improvements, and next practice—through browser-based analysis and reflective
guidance. It is the craft-coaching pillar adjacent to Waypoint Scenes.

Complements: Engineering, Product Standards, UI/UX, QA, Performance,
Accessibility, Security, Release, and Lessons Learned playbooks.

------------------------------------------------------------------------

# Product Mission

Help photographers **create with confidence** by learning from their own
images—evidence-based coaching that encourages curiosity and growth without
gamified pressure.

Photo Coach is guidance, not a courtroom. It does not invent what is not in
the frame or in trustworthy metadata.

------------------------------------------------------------------------

# Target Users

- Developing outdoor and nature photographers
- Practiced photographers seeking structured reflection
- Learners using batch review and personal profiles over time
- Educators who want coaching tone without grading theater

------------------------------------------------------------------------

# Non-Negotiable Principles

1. **Feedback must be constructive and specific**—not vague praise or cruelty.
2. **AI claims require visible or metadata evidence**; never invent EXIF.
3. **Confidence and uncertainty are communicated**—not fake precision grades.
4. **No badges, streaks, leaderboards, or social scoring.**
5. **Analysis is local-first / on-device by default**; private labels stay private.
6. **Batch analysis preserves per-image honesty**—no averaged fiction.
7. **Personalized learning remembers thoughtfully**, never manipulates.
8. **Users can reject or ignore suggestions** without punishment.

------------------------------------------------------------------------

# UX Expectations

- Upload / select → analysis → coaching narrative should feel calm and linear
- Strengths appear alongside improvements; tone stays encouraging
- Grades or scores, if shown, never outrank explanation
- Compare and detail views dismiss cleanly (Escape, close, mode change)
- Profile and history help reflection; they must not nag
- Empty library states invite a single first photo, not a tutorial gauntlet
- Mobile review remains readable; touch targets for primary actions are large

------------------------------------------------------------------------

# Loading and Error States

| State | Expectation |
|-------|-------------|
| Analyzing | Honest “Analyzing…” / Updating; not Live coaching claims mid-run |
| Partial analysis | Show what completed; mark incompleteness |
| Unsupported file | Clear file guidance; keep session intact |
| Analysis failure | Recoverable error; offer retry; do not invent a review |
| Batch item failure | Isolate failure; continue siblings with status |
| Storage pressure | Warn before silent data loss |

Anti-patterns: fabricating critique text when analysis failed; stuck compare
overlays; “100% confidence” on speculative aesthetic claims.

------------------------------------------------------------------------

# AI Behavior

- Coach, explain, connect ideas, encourage practice
- Cite what in the image or metadata supports a claim
- Separate technical observations from taste suggestions
- Personalization may use on-device history; explain “because you’ve been
  working on…” when practical
- Never imply professional certification or scientific certainty about artistic
  merit
- Transparent about limits (lighting inference, scene understanding bounds)

------------------------------------------------------------------------

# Data Quality Expectations

- Critiques distinguish observed qualities from inferred advice
- Metadata missing → say unknown; do not invent camera settings
- Batch summaries must not hide per-image errors
- Local profile/history migrations must not drop user notes without recovery
- Shared Photo Library integrations respect ownership and privacy labels

------------------------------------------------------------------------

# Accessibility Expectations

- Keyboard path through upload, results, and dismissible compares
- Coaching content structured with headings and readable contrast
- Status of analysis available to assistive tech without announce storms
- Focus returns after modal detail views
- Reduced motion for decorative transitions in review UI

------------------------------------------------------------------------

# Performance Expectations

- UI chrome ready before heavy decode completes
- Batch jobs show per-item progress; UI stays interactive
- Avoid re-analyzing unchanged images without user intent
- Large images: honest progress rather than multi-second freezes without status
- Profile views should not block on full-library recompute at first paint

------------------------------------------------------------------------

# Release Quality Gates

- [ ] Critique path cannot present invented EXIF or fake certainty
- [ ] Failure path yields no fabricated review body
- [ ] Compare/modal dismiss verified (no dimming trap)
- [ ] Batch partial failure behaves honestly
- [ ] Privacy: no unexpected remote upload of user photos
- [ ] Mobile review path usable
- [ ] Accessibility smoke on primary coaching flow
- [ ] Regression coverage for overlay/dismiss and trust-sensitive copy when touched

------------------------------------------------------------------------

# Future Extensibility

Photo Coach may deepen personalized curricula, multi-image session reviews,
tighter Scenes library integration, or optional export of learning notes.
Extensions must preserve non-gamified coaching, evidence-based claims, and
local-first privacy.

Avoid prescribing models or scoring formulas here; preserve transparency and
constructive tone.

------------------------------------------------------------------------

# Versioning

**Photo Coach Playbook v1.0.** Living product handbook. Update when coaching
ethics, privacy posture, or confidence communication rules change.
