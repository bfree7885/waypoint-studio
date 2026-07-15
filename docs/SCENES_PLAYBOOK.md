# Waypoint Studio Scenes Playbook v1.0

> Product standards for creative nature observation and scene craft.

Waypoint Scenes is the creative family for observing carefully, understanding
how we see, and building quieter visual stories from field evidence. It
includes the Scenes home and related creative studios such as Scene Builder,
Photo Coach surfaces, libraries, and experimental vision experiences.

Complements: Engineering, Product Standards, UI/UX, QA, Performance,
Accessibility, Security, Release, and Lessons Learned playbooks.

------------------------------------------------------------------------

# Product Mission

Help people **observe, understand, create, and share** meaningful visual
work rooted in the living world—without turning nature into a social
popularity contest.

Scenes deepen curiosity and craft. It is not a harvest tool, not a streak
engine, and not a feed optimized for dopamine.

------------------------------------------------------------------------

# Target Users

- Nature and outdoor photographers growing intentional practice
- Visual storytellers assembling Living Scenes and reflective sequences
- Learners exploring perception (including beyond-everyday vision experiments)
- Creators who want private local libraries and honest craft tools

------------------------------------------------------------------------

# Non-Negotiable Principles

1. **Creative work remains user-owned**—privacy-first libraries and projects.
2. **Distinguish capture, edit, simulation, and generative assistance.**
3. **No engagement farming**—no likes, follower counts, or forced public
   performance.
4. **Sharing is optional** and never required for core craft loops.
5. **Imports/exports respect consent and attribution** expectations.
6. **Overlays and editors must dismiss cleanly**—no stuck dimming scrims.
7. **Child experiences inherit Scenes ethics** even when visually distinct.
8. **Calm craft over spectacle** unless a named experimental studio clearly
   frames the exception (and still remains honest).

------------------------------------------------------------------------

# UX Expectations

- Scenes home orients without overwhelming; pathways to Coach, Builder,
  Library, and experiments are clear
- Scene Builder and editors prioritize the creative stage; chrome stays quiet
- Collections and projects feel stable across refresh
- First-time empties invite one clear start (import, new scene, open library)
- Export/share flows explain what leaves the device
- Hidden Landscapes and similar experiments must label simulation versus
  photographic capture

Follow UI/UX Playbook: focused composition, purposeful motion, shared shell
navigation.

------------------------------------------------------------------------

# Loading and Error States

| State | Expectation |
|-------|-------------|
| Opening a project | Instant chrome; stage may show honest skeleton |
| Import in progress | Named progress; cancel where practical |
| Decode/render failure | Honest error; keep other projects intact |
| Missing asset | Explain what is missing; offer re-import |
| Export failure | Recoverable message; no silent partial export presented as success |
| Mode switch | Dismiss transient compare/modals; restore interactive stage |

Anti-patterns: wiped canvases without explanation; overlays that permanently
dim the studio; fake “cloud sync complete” when everything is local-only.

------------------------------------------------------------------------

# AI Behavior

AI in Scenes (layout suggestions, effect assistance, captions, coaching
bridges):

- Assist craft; never claim exclusive authorship silently
- Tie suggestions to visible or user-provided materials when judging a frame
- Label automated enhancements and simulations
- Do not invent EXIF, locations, or species in creative metadata
- Encourage exploration without implying there is one correct aesthetic

------------------------------------------------------------------------

# Data Quality Expectations

- Project and collection integrity across sessions (no silent drops)
- Metadata honesty: unknown fields stay unknown
- Exports match what the user approved (resolution, metadata stripping choices)
- Shared design-system media components handle failure without corrupting
  libraries
- Experimental vision modes document interpretive limits

------------------------------------------------------------------------

# Accessibility Expectations

- Keyboard operable primary edit and navigation paths where the medium allows
- Focus management for dialogs, compares, and importer prompts
- Labels for icon-only tools; visible focus on stage controls
- Reduced-motion alternatives for decorative stage motion
- Touch-friendly tools on tablets used in the field

Complex canvases may have practical limits; core open/save/import/export and
navigation must remain accessible.

------------------------------------------------------------------------

# Performance Expectations

- Studio chrome appears quickly; heavy assets lazy-load when possible
- Editing interactions stay responsive; long encodes show honest progress
- Avoid reloading entire apps when switching sibling Scenes experiences
- Large libraries paginate or virtualize rather than freezing first paint
- Motion remains purposeful and interruptable

------------------------------------------------------------------------

# Release Quality Gates

- [ ] No stuck overlay/dimming on Builder or related studios
- [ ] Import/export happy path + failure path verified
- [ ] Privacy claims still match actual storage/sharing behavior
- [ ] Simulation vs capture labeling intact for experimental modes
- [ ] Mobile/tablet basic craft path usable
- [ ] Accessibility smoke on dialogs and primary tools
- [ ] Smoke from Scenes home into at least one child experience

------------------------------------------------------------------------

# Future Extensibility

Scenes may grow richer Living Scene tools, deeper libraries, collaborative
optional sharing, or new perception studios. Extensions should preserve
optional sharing, clear authorship boundaries, and local-first ownership.

Avoid prescribing engines or file formats here; preserve honesty about what is
capture versus construction.

------------------------------------------------------------------------

# Versioning

**Scenes Playbook v1.0.** Living product handbook. Update when the creative
family boundaries or privacy/sharing ethics change.
