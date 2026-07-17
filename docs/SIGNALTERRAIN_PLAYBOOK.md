# Waypoint Studio SignalTerrain Playbook v1.1

> Product standards for observing invisible environments — RF situational
> awareness today, educational cyber awareness later — with privacy and clarity.

SignalTerrain is the studio home for **Signal Intelligence**: a platform framing
for radio-frequency observation and, in the future, calm educational cyber
situational awareness. It is not an enterprise SOC, not a surveillance product,
and not a rumor feed.

See also: [PLATFORM-ENGINES.md](PLATFORM-ENGINES.md) ·
[SIGNAL-INTELLIGENCE-VISION.md](SIGNAL-INTELLIGENCE-VISION.md) ·
[SIGNAL-INTELLIGENCE-ARCHITECTURE.md](SIGNAL-INTELLIGENCE-ARCHITECTURE.md) ·
[SIGNAL-INTELLIGENCE-ENGINE.md](SIGNAL-INTELLIGENCE-ENGINE.md)
(Signal Intelligence Foundation V1 — architecture & schemas only).

Complements: Engineering, Product Standards, UI/UX, QA, Performance,
Accessibility, Security, Release, and Lessons Learned playbooks.

------------------------------------------------------------------------

# Product Mission

Help people **observe and understand invisible environments** through
trustworthy logs, geographic context, and honest confidence labeling —
prioritizing clarity over engagement.

## Capability groups

### RF Intelligence (foundation direction)

Radio and spectrum situational awareness. Examples of topics the product may
eventually support when real sources exist: SDR, NOAA broadcasts, amateur
radio, ADS-B, AIS, satellites, spectrum monitoring, and private signal logging.

Today’s foundations emphasize receivers, incident timelines, maps, and private
audio — without inventing traffic that was not observed.

### Cyber Intelligence (planned)

Educational situational awareness for individuals, hobbyists, homelabs, and
small organizations. Future topics may include CVE and advisory digests,
campaign literacy, ransomware awareness notes, vulnerability prioritization
hints, vendor advisories, patch reminders, and infrastructure incidents
(ISP outages, DNS, BGP).

**Planned only.** Do not ship placeholder threat dashboards. Do not imply
protective guarantees. Do not present open-web rumor as verified intelligence.

------------------------------------------------------------------------

# Target Users

- Amateur radio operators and listeners building situational awareness
- Emergency-minded community volunteers documenting conditions responsibly
- Researchers and hobbyists analyzing signal environments
- Teams maintaining private receiver inventories and incident notes
- (Later) Homelab and small-org learners who want calmer cyber awareness

------------------------------------------------------------------------

# Non-Negotiable Principles

1. **Logging integrity**—timestamps, sources, and edits remain trustworthy.
2. **Privacy first** for audio, receiver locations, and incident details.
3. **Shared receivers and maps are opt-in** and privacy-aware.
4. **Confidence and source notes** accompany assisted transcripts/analyses.
5. **Geographic context without doxxing**—precision follows need and consent.
6. **Clarity over engagement**—no viral clip incentives.
7. **Legal/ethical listening**—encourage compliance with local regulations.
8. **Never fabricate signals, incidents, transcripts, or cyber events.**
9. **Cyber ≠ SOC**—educational awareness only; no false shield claims.
10. **Planned work stays labeled Planned** until real data paths exist.

------------------------------------------------------------------------

# UX Expectations

- Timelines are scannable: what, when, confidence, source
- Maps and lists stay consistent with privacy levels
- Audio playback controls are obvious; private audio never auto-publishes
- Empty states guide adding a receiver or first log without gamification
- Assisted transcripts visually distinct from human-confirmed text
- Incident notes support calm operational language—not sensational headlines
- Any future cyber surfaces use the same calm voice and Unavailable honesty

------------------------------------------------------------------------

# Loading and Error States

| State | Expectation |
|-------|-------------|
| Importing logs/audio | Progress + failure isolation |
| Transcript assist running | Labeled assisted/processing; not presented as verified fact |
| Map/geocode failure | Log remains; geo marked unavailable |
| Offline | Local logs accessible; sync (if any) clearly pending |
| Permission denied (mic/files) | Plain recovery guidance |
| Planned cyber source missing | Explicit Unavailable / Planned — never fake CVEs |

Anti-patterns: auto-sharing audio; certainty on low-confidence decode; silent
clock skew corruption without notice; invented threat feeds.

------------------------------------------------------------------------

# AI Behavior

- Assist transcription, classification, or summarization with explicit labels
- Preserve original audio/log as source of truth
- Communicate confidence; invite human confirmation for operational use
- Do not invent callsigns, locations, events, or vulnerabilities to fill gaps
- Avoid sensational narrative style in summaries

------------------------------------------------------------------------

# Data Quality Expectations

- Records include time integrity practices (timezone awareness where relevant)
- Corrections amend without inventing a false original
- Privacy flags travel with exports
- Analysis outputs reference inputs; unsupported claims stay out
- Receiver metadata distinguishes public club info from private home nodes
- Future cyber records must cite provenance or stay Unavailable

------------------------------------------------------------------------

# Accessibility Expectations

- Timeline and log tables available beyond color-coded severity alone
- Keyboard control for playback primary actions
- Transcripts readable as text; audio not the only channel for meaning when a
  transcript exists
- Focus management for import dialogs and detail drawers
- Adequate contrast for map legend labels

------------------------------------------------------------------------

# Testing Expectations

- Logging round-trips preserve timestamps and privacy flags
- Assisted vs confirmed transcripts remain distinguishable in DOM and exports
- Map failures do not drop the underlying incident
- No auto-upload of private audio in default configurations
- Planned modules must not claim Ready in foundation JSON

------------------------------------------------------------------------

# Related platform framing

Signal Intelligence is a **shared engine** documented in
`docs/PLATFORM-ENGINES.md` and `product-registry.json` → `sharedEngines`.
SignalTerrain is the UI home. Do not add a separate Cyber product to navigation
until real capabilities ship.
