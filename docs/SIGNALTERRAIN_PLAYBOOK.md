# Waypoint Studio SignalTerrain Playbook v1.0

> Product standards for radio situational awareness and private signal logging.

SignalTerrain helps people understand radio environments—receivers, timelines,
maps, and private audio—with clarity, integrity, and privacy.

Complements: Engineering, Product Standards, UI/UX, QA, Performance,
Accessibility, Security, Release, and Lessons Learned playbooks.

------------------------------------------------------------------------

# Product Mission

Help people **observe and understand** radio terrain and incidents through
trustworthy logs and geographic context—prioritizing clarity over engagement.

SignalTerrain is a situational awareness and learning tool. It is not a social
scanner feed, not a rumor amplifier, and not a surveillance product aimed at
people.

------------------------------------------------------------------------

# Target Users

- Amateur radio operators and listeners building situational awareness
- Emergency-minded community volunteers documenting conditions responsibly
- Researchers and hobbyists analyzing signal environments
- Teams maintaining private receiver inventories and incident notes

------------------------------------------------------------------------

# Non-Negotiable Principles

1. **Logging integrity**—timestamps, sources, and edits remain trustworthy.
2. **Privacy first** for audio, receiver locations, and incident details.
3. **Shared receivers and maps are opt-in** and privacy-aware.
4. **Confidence and source notes** accompany assisted transcripts/analyses.
5. **Geographic context without doxxing**—precision follows need and consent.
6. **Clarity over engagement**—no viral clip incentives.
7. **Legal/ethical listening**—encourage compliance with local regulations.
8. **Never fabricate signals, incidents, or transcripts.**

------------------------------------------------------------------------

# UX Expectations

- Timelines are scannable: what, when, confidence, source
- Maps and lists stay consistent with privacy levels
- Audio playback controls are obvious; private audio never auto-publishes
- Empty states guide adding a receiver or first log without gamification
- Assisted transcripts visually distinct from human-confirmed text
- Incident notes support calm operational language—not sensational headlines

------------------------------------------------------------------------

# Loading and Error States

| State | Expectation |
|-------|-------------|
| Importing logs/audio | Progress + failure isolation |
| Transcript assist running | Labeled assisted/processing; not presented as verified fact |
| Map/geocode failure | Log remains; geo marked unavailable |
| Offline | Local logs accessible; sync (if any) clearly pending |
| Permission denied (mic/files) | Plain recovery guidance |

Anti-patterns: auto-sharing audio; certainty on low-confidence decode; silent
clock skew corruption without notice.

------------------------------------------------------------------------

# AI Behavior

- Assist transcription, classification, or summarization with explicit labels
- Preserve original audio/log as source of truth
- Communicate confidence; invite human confirmation for operational use
- Do not invent callsigns, locations, or events to fill gaps
- Avoid sensational narrative style in summaries

------------------------------------------------------------------------

# Data Quality Expectations

- Records include time integrity practices (timezone awareness where relevant)
- Corrections amend without inventing a false original
- Privacy flags travel with exports
- Analysis outputs reference inputs; unsupported claims stay out
- Receiver metadata distinguishes public club info from private home nodes

------------------------------------------------------------------------

# Accessibility Expectations

- Timeline and log tables available beyond color-coded severity alone
- Keyboard control for playback primary actions
- Transcripts readable as text; audio not the only channel for meaning when a
  transcript exists
- Focus management for import dialogs and detail drawers
- Adequate contrast for map legend labels

------------------------------------------------------------------------

# Performance Expectations

- Logs remain interactive as history grows (virtualize/paginate)
- Audio decode/transcript assist must not freeze timeline scrolling
- Map layers progressive; list-first works without tiles
- Startup shows shell and recent logs before heavy analysis

------------------------------------------------------------------------

# Release Quality Gates

- [ ] No default public exposure of private audio/locations
- [ ] Assisted vs confirmed labeling intact
- [ ] Log save/reload integrity verified for touched flows
- [ ] Fabrication impossible on failed decode paths
- [ ] Privacy precision controls honored on maps
- [ ] Mobile review of timeline usable
- [ ] Accessibility smoke on playback + transcript reading
- [ ] Security: untrusted log imports handled safely

------------------------------------------------------------------------

# Future Extensibility

SignalTerrain may grow richer receiver management, analysis tools, or careful
sharing circles. Extensions must preserve logging integrity and privacy-first
defaults.

Avoid prescribing SDR stacks; preserve trustworthy timeline semantics.

------------------------------------------------------------------------

# Versioning

**SignalTerrain Playbook v1.0.** Living product handbook. Update when privacy,
sharing, or transcript-confidence rules change.
