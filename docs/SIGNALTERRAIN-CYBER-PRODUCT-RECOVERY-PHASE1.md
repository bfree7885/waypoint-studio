# SignalTerrain Cyber — Product Recovery Phase 1

**Date:** 2026-07-18  
**Engine:** `signalterrain-cyber-live-engine` **1.1.0**  
**Commit policy:** Not committed / not pushed (owner review)

---

## Mission check

| Question | Answer after Phase 1 |
|----------|----------------------|
| What should I pay attention to right now? | **Today’s Cyber Brief** is the default home (`#brief`) |
| Demo / samples on the critical path? | **No** — live artifact only; samples labeled and demoted in nav |
| Ranked by importance? | **Yes** — transparent priority score + factors, not chronology |
| Real public sources? | **Yes** — KEV, NVD, CISA advisories, GHSA, Chrome, Ubuntu, cloud status |

---

## Architecture improvements

1. **Brief-first product shell** on `live.html`  
   - Task nav: Overview · Threats · Vulnerabilities · KEV · Ransomware · Zero-Day · Advisories · Outages · Feeds · Search · History · Settings  
   - Dense professional CSS (`wds-signalterrain-cyber-live.css`) — no matrix/hacker chrome  

2. **Live engine 1.1.0** writes richer artifact:  
   - `brief` — interpretive bullets + recommendation  
   - `derived` — ransomware / zero-day / outage / threat indexes  
   - `historyPreview` + `data/cyber/history.json` — prior briefs  
   - Extended priority factors (edge exposure, supply-chain context, critical infrastructure wording, vendor prevalence, KEV exploit maturity, nation-state **only when official text says so**)  

3. **New live providers** (honest empty / soft-fail, never fabricated):  
   - GitHub Security Advisories (GHSA)  
   - AWS status RSS  
   - Azure status (soft-ok if feed unparsable)  
   - Google Cloud incidents JSON  
   - Cloudflare / GitHub / OpenAI Statuspage summaries  

4. **Nav honesty** — sample apps labeled “(samples)” / teaching demoted; Live + Workspace primary  

5. **Record detail** — plain-English sections: affected, seriousness, exploitation, who should care, mitigate/patches, why ranked, references  

---

## Performance

| Change | Effect |
|--------|--------|
| Session cache of `live.json` (5 min) | Instant revisit / tab switches without re-fetch |
| Hash panels (SPA-style) | Navigation without full page reload |
| Non-blocking history load | Brief paints without waiting on history file |
| Slimmer font load (IBM Plex Sans, non-blocking) | Faster text paint |
| Perf marks `st-cyber-*` | Measurable mount → paint |

**Remaining:** `live.json` is still ~1MB; future work = compressed/split indexes + CDN caching headers.

---

## Reliability

| Control | Status |
|---------|--------|
| Provider timeouts | Yes (`CYBER_PROVIDER_TIMEOUT_MS`) |
| Per-provider try/catch via `runProvider` | Yes |
| KEV last-known-good on hard fail | Yes (retained) |
| Planned ≠ live | Yes (MSRC, Apple, Cisco, EPSS, M365 labeled planned) |
| Provider health table | Feeds panel |
| No sample fallback | Enforced in UI + engine |
| Freshness / trustState | Live / Partial / Cached / Error |

---

## Data sources integrated (this run)

| Source | Role |
|--------|------|
| CISA KEV | Known exploited + ransomware flags |
| NIST NVD | Recent CVEs |
| CISA Advisories Atom | Official advisories |
| GitHub Security Advisories | Reviewed GHSA |
| Chrome Releases RSS | Security releases (filtered upstream) |
| Ubuntu USN RSS | Linux advisories |
| AWS / Azure / GCP / Cloudflare / GitHub / OpenAI status | Outage center |

---

## Changelog (files)

```
scripts/signalterrain-cyber-live-engine.mjs     — 1.1.0 brief, derived, outages, GHSA, factors
design-system/js/signalterrain/wds-signalterrain-cyber-live.js — recovery UI
design-system/css/wds-signalterrain-cyber-live.css — new
apps/signalterrain/cyber/live.html              — brief-first shell
design-system/js/platform/wds-app-nav-config.js — sample labels / order
data/cyber/live.json · health.json · graph.json · history.json — regenerated
docs/SIGNALTERRAIN-CYBER-PRODUCT-RECOVERY-PHASE1.md — this report
docs/SIGNALTERRAIN-CYBER-RECOVERY-CHANGELOG.md
```

---

## Honest assessment — what remains before Version 1.0

### Still not V1-complete

1. **MSRC / Apple / Cisco / EPSS** — still planned; Patch Tuesday narrative is incomplete without MSRC.  
2. **True ransomware campaign intelligence** — only KEV `ransomwareUse` flags; no group TTPs / industry maps from authoritative feeds yet.  
3. **True zero-day proof** — public data cannot certify zero-days; view is an honest proxy.  
4. **Nation-state / supply-chain** — keyword heuristics on official text, not dedicated feeds.  
5. **Threat actor / malware family search** — entities not in live catalog yet.  
6. **Teaching/brief/explorer/advisor/knowledge** — still sample-backed; should eventually bind to live or stay explicitly educational-only.  
7. **Payload size** — need indexed slices for second-monitor snappiness on slow links.  
8. **M365-specific outages** — not a stable public feed; Azure is partial Microsoft signal.  
9. **Automated CDP / refresh CI** — engine is manual/cron; budgets not gated in CI yet.

### What *is* credible today

A security-aware user can leave **Cyber Live** open, read **Today’s Cyber Brief**, drill KEV / threats / outages, see **why** items score high, and trust that **nothing on this path is a fake incident**.

That is Product Recovery Phase 1 — not finished V1.0, but no longer a prototype demo.

---

**Not committed. Not pushed. Owner review required.**
