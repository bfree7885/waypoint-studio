# SignalTerrain Cyber Recovery — Detailed Changelog

**Phase:** Product Recovery 1 → **2**  
**Dates:** 2026-07-18 · 2026-07-19  
**Status:** Uncommitted — owner review

---

## Phase 2 — Intelligence Engine

### Product

- SignalTerrain begins acting like an analyst layer: enrich → recommend → brief → hide noise.
- New nav: **Briefings**, **Timeline**, **Trends**.
- Default views hide low-signal items; optional **Show low-signal**.
- Cards/detail surface **recommended action + why** and plain-English risk.
- Persona framework preference (local) for future personalization.

### Engine (`1.1.0` → `1.2.0` + Signal `2.0.0`)

- New `scripts/cyber-signal/signal-engine.mjs`.
- Per-record: `enrichment`, `recommendation`, `risk`, `noise`, `personas`.
- Narrative dedupe with `supportingSources`.
- Correlation graph → `data/cyber/correlation.json`.
- Operational briefings: morning / evening / weekly / critical.
- Trend interpretations vs previous artifact.
- Unified timeline events with filter metadata.

### Docs

- Architecture, signal processing, correlation, benchmarks, V1.0 roadmap, Phase 2 recovery report.

### Verified this session

```
node scripts/signalterrain-cyber-live-engine.mjs
→ Live · 294 records · 220 surfaced · 74 hidden · 958 relationships · signal ~56ms
```

---

## Phase 1 — Interface Recovery

## Product

- Default experience is **Today’s Cyber Brief** (`#brief`), answering “What should I pay attention to right now?”
- Task-oriented navigation replaces posture/card sprawl.
- Vulnerability detail pages explain affected systems, seriousness, exploitation, audience, mitigation, and ranking factors in plain English.
- Sample/teaching surfaces demoted and labeled in platform nav and peer links.

## Engine (`1.0.0` → `1.1.0`)

- Emits `brief`, `derived`, `historyPreview`; writes `data/cyber/history.json`.
- Priority factors expanded: edge exposure, supply-chain context, critical-infrastructure wording, vendor prevalence, KEV exploit maturity, explicit nation-state mentions (official text only).
- Providers added: GHSA, AWS RSS, Azure (soft), GCP incidents, Cloudflare/GitHub/OpenAI Statuspage.
- Brief bullets use KEV `dateAdded` (not shared catalog `updatedAt`) for “recent KEV” claims.

## UI

- New recovery layout + CSS (Bloomberg/SOC density, no hacker aesthetics).
- Panels: Overview, Threats, Vulnerabilities, KEV, Ransomware, Zero-Day, Advisories, Outages, Feeds, Search, History, Settings.
- SessionStorage cache (5 minutes) for `live.json`.
- Performance marks: `st-cyber-mount-start`, `st-cyber-paint`.

## Removed / refused

- No sample fallback on live path (unchanged rule, reinforced).
- No fabricated outages when Azure feed fails — honest unavailable/healthy heartbeat.
- Peer link prominence for teaching/demo apps reduced.

## Outstanding before V1.0

See `docs/SIGNALTERRAIN-CYBER-PRODUCT-RECOVERY-PHASE1.md` § Honest assessment.

**Not committed. Not pushed. Owner review required.**
