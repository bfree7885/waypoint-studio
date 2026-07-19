# SignalTerrain Cyber Recovery — Detailed Changelog

**Phase:** Product Recovery 1  
**Date:** 2026-07-18  
**Status:** Uncommitted — owner review

---

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

## Verified this session

```
node scripts/signalterrain-cyber-live-engine.mjs
→ trustState: Live · ~294 records · brief bullets populated
```

## Outstanding before V1.0

See `docs/SIGNALTERRAIN-CYBER-PRODUCT-RECOVERY-PHASE1.md` § Honest assessment.

**Not committed. Not pushed. Owner review required.**
