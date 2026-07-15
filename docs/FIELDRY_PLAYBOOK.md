# Waypoint Studio Fieldry Playbook v1.0

> Product standards for private field observation and life-list practice.

Fieldry is a private field notebook / life-list companion for recording
encounters, building understanding over time, and learning without competition.

Complements: Engineering, Product Standards, UI/UX, QA, Performance,
Accessibility, Security, Release, and Lessons Learned playbooks.

------------------------------------------------------------------------

# Product Mission

Help people **observe and understand** living things through careful personal
records—evidence-aware, scientifically respectful, and free from popularity
contests.

Fieldry values unidentified observations, humble confidence, and long-term
memory. It is not a game, not a chase leaderboard, and not a substitute for
expert verification when verification is needed.

------------------------------------------------------------------------

# Target Users

- Birders, naturalists, and multi-taxa observers keeping private lists
- Families and learners building observation habits
- Photographers linking sightings to field context
- Citizen scientists who may later export carefully—and optionally

------------------------------------------------------------------------

# Non-Negotiable Principles

1. **Scientific integrity**—observation vs interpretation stay distinct.
2. **Honest confidence**—unknown and uncertain are first-class states.
3. **Non-competitive**—no ranks, streaks, or public scoreboards as core loops.
4. **Evidence quality matters**—notes, media, and uncertainty travel together.
5. **Taxonomy humility**—IDs can change; preserve history of determinations.
6. **Privacy levels and location precision** are user-controlled.
7. **Sensitive species** deserve obscuring / reduced precision by policy.
8. **Local-first ownership** of the life list and notebook.

------------------------------------------------------------------------

# UX Expectations

- Capture flow is fast enough for field use: few taps to save a draft
- Life list and stats encourage reflection, not addiction mechanics
- Unidentified entries are welcomed, not shamed
- Metadata editors are clear (when, where precision, count, notes)
- Empty states teach how to add a first observation without homework language
- Sample/demo data, if present, is unmistakably labeled

------------------------------------------------------------------------

# Loading and Error States

| State | Expectation |
|-------|-------------|
| Saving observation | Clear saving/saved; never claim saved if store failed |
| Media attach pending | Honest pending; observation text still recoverable |
| Sync/export (if any) | Explicit; local copy remains authoritative until confirmed |
| Taxonomy lookup fail | Allow free text / unknown; do not invent species |
| Offline capture | Must work locally; queue optional later enrichment |

Anti-patterns: losing notes on refresh; auto-”confirming” IDs; publishing
precise locations when user chose regional privacy.

------------------------------------------------------------------------

# AI Behavior

- Suggest IDs or similar species only with uncertainty and evidence cues
- Never silently overwrite a user’s determination
- Assist with metadata cleanup and reflective summaries labeled as assistance
- Do not invent counts, behaviors, or rarities not supported by the record
- Encourage better evidence (photo, note) without nagging loops

------------------------------------------------------------------------

# Data Quality Expectations

- Core fields remain structured enough for future export (date, taxon or
  unknown, privacy, precision)
- Edits are traceable enough to understand ID history at a human level
- Imports validate without corrupting the existing list
- Stats derive from real records; placeholders labeled
- Knowledge links are contextual aids—not parallel fake encyclopedias

------------------------------------------------------------------------

# Accessibility Expectations

- Capture and browse keyboard-accessible on desktop
- Form labels and errors meet UI/UX form standards
- Status of save/sync announced calmly
- Touch targets fit gloved or field use where practical
- Charts/stats are not color-only

------------------------------------------------------------------------

# Performance Expectations

- Capture remains responsive as lists grow (pagination / incremental render)
- First paint of life list should not wait on every media thumbnail
- Search/filter stay usable on large private libraries
- Offline-first means local read/write stays fast without network

------------------------------------------------------------------------

# Release Quality Gates

- [ ] Save/reload integrity verified for observations
- [ ] Privacy/precision controls honored on touched flows
- [ ] No competitive ranking introduced in core UX
- [ ] Unknown/uncertain ID states remain available
- [ ] Sample data cannot be mistaken for user data
- [ ] Mobile capture path usable
- [ ] Accessibility smoke on capture form
- [ ] Export/import (if touched) does not leak hidden precise coords

------------------------------------------------------------------------

# Future Extensibility

Fieldry may deepen media attach, sensitive-species rules, export to community
science formats, or Knowledge integration. Extensions must preserve
non-competition, confidence honesty, and local ownership.

Avoid prescribing database engines; preserve evidence + privacy as the spine.

------------------------------------------------------------------------

# Versioning

**Fieldry Playbook v1.0.** Living product handbook. Update when privacy
precision rules, taxonomy ethics, or competition boundaries change.
