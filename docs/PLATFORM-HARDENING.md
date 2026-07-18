# SignalTerrain — Platform Hardening (Work Block 8)

**Date:** 2026-07-18  
**Roles:** Security, reliability, developer experience, defensive engineering  
**Constraint:** Architecture & defensive review — no penetration testing

---

## Defensive security review

### S1 — Data handling & privacy

| Item | Detail |
|------|--------|
| **Findings** | Inventory, security profile, research workspace, and ingest caches live in `localStorage`. Good local-first default; keys were undocumented. |
| **Evidence** | `st_inventory_v1`, `st_security_profile_v1`, `st_research_workspace_v01`, `st_advisor_snapshot_v1`, `wds.st.cyber.ingest.v01.*`; now cataloged in `WDS.signalTerrainUtil.STORAGE_KEYS`. |
| **Recommendations** | Never sync without explicit consent UI; treat inventory as sensitive; provide clear export/wipe. |
| **Priority** | High |
| **Estimated effort** | 1–2 days wipe/export UX |
| **Expected impact** | Privacy trust |

### S2 — Credential & secret storage

| Item | Detail |
|------|--------|
| **Findings** | No API keys in cyber runtimes today (mock connectors). Future live connectors must not store secrets in `localStorage`. |
| **Evidence** | Mock ingest only. |
| **Recommendations** | Prefer OS keychain / server-side proxy; if client tokens ever exist, use non-extractable patterns and short TTL. |
| **Priority** | High (future) |
| **Estimated effort** | Design 1 day before first live connector |
| **Expected impact** | Prevent credential leaks |

### S3 — XSS & HTML rendering

| Item | Detail |
|------|--------|
| **Findings** | Most surfaces escape with `esc`. Ingest previously used identity `esc` — fixed. Remaining risk: any future unescaped `innerHTML` concatenation. |
| **Evidence** | `wds-signalterrain-cyber-ingest.js`; shared util. |
| **Recommendations** | Require util `esc` for all HTML; lint/grep for raw `innerHTML` + untrusted fields. |
| **Priority** | High |
| **Estimated effort** | Ongoing |
| **Expected impact** | XSS resistance |

### S4 — Third-party trust

| Item | Detail |
|------|--------|
| **Findings** | Google Fonts on every cyber page expands privacy surface and offline failure modes. No CSP. |
| **Evidence** | `fonts.googleapis.com` / `fonts.gstatic.com` links. |
| **Recommendations** | Self-host Cormorant + Inter (or Studio fonts); add CSP (`default-src 'self'`; allow only known script/style). |
| **Priority** | High |
| **Estimated effort** | 1–2 days |
| **Expected impact** | Privacy + supply-chain reduction |

### S5 — Logging & error handling

| Item | Detail |
|------|--------|
| **Findings** | Client errors mostly inline alerts; little structured logging. Good that mock pipelines don’t exfiltrate. |
| **Evidence** | Mount `role="alert"` paths. |
| **Recommendations** | Keep logs local; never send inventory/profile to remote analytics by default. |
| **Priority** | Medium |
| **Estimated effort** | 1 day policy |
| **Expected impact** | Privacy |

### S6 — Rate limiting & future APIs

| Item | Detail |
|------|--------|
| **Findings** | No live rate limits yet. |
| **Evidence** | Mock connectors. |
| **Recommendations** | Before live fetch: backoff, jitter, budget per source, user-visible cache age. |
| **Priority** | Medium |
| **Estimated effort** | 2 days with first connector |
| **Expected impact** | Reliability + abuse resistance |

### S7 — Authentication (future)

| Item | Detail |
|------|--------|
| **Findings** | No auth model on SignalTerrain cyber today. |
| **Recommendations** | Stay anonymous/local until sync; if accounts appear, separate identity from local research notes. |
| **Priority** | Low now |
| **Estimated effort** | — |
| **Expected impact** | Avoid premature auth complexity |

### S8 — Dependency risk

| Item | Detail |
|------|--------|
| **Findings** | Cyber stack is largely first-party JS + JSON — low npm surface in-browser. Automation uses Node built-ins. |
| **Recommendations** | Keep browser stack dependency-light; review any chart/map library before add. |
| **Priority** | Medium |
| **Estimated effort** | Per dependency |
| **Expected impact** | Supply-chain control |

---

## Reliability

| Finding | Recommendation | Priority | Effort |
|---------|----------------|----------|--------|
| Sample JSON is single point of demo failure | Validate sample in CI (exists); add schema validate step | Medium | 1 d |
| Script load-order fragility | Document order; eventually modules | Medium | 0.5–3 d |
| Hash/state loss on hard errors | Keep last-good panel message | Low | 0.5 d |

---

## Developer experience

| Finding | Evidence | Recommendation | Priority | Effort |
|---------|----------|----------------|----------|--------|
| Many parallel docs | Block docs + product docs | Keep one index in platform architecture | Medium | 0.5 d |
| Global IIFE discovery | `WDS.signalTerrain*` | Document API map in architecture | Medium | 0.5 d |
| Test sandboxes omit util | automation loaders | Add util to sandbox lists | Medium | 0.5 d |
| Naming mostly clear (`cyber-*`) | — | Preserve; avoid “studio cyber product” naming | High | — |
| Folder structure workable | `intelligence/cyber/*` + `js/signalterrain/*` | Keep data vs runtime split | — | — |

---

## Completed hardening / refactors (this block)

1. **Shared util** — `design-system/js/signalterrain/wds-signalterrain-util.js`  
2. **Graph invariant** — read-only `entities`, `listEntities()`, removed reassignment footguns  
3. **Ingest escaping** — real HTML escape (via util when present)  
4. **Foundation chrome** — `.st-cyber-nav`, `.st-cyber-list`, `.st-cyber-peers`  
5. **Peer link alignment** — Brief / Explorer / Advisor / Knowledge  
6. **Review documentation set** — architecture, debt, scalability, UX, performance, a11y, hardening  
7. **Master architecture update** — cyber runtime map + WB8 notes  

---

## Intentionally deferred

- Content-Security-Policy deployment  
- Self-hosted fonts  
- Live connectors + auth  
- E2E / axe automation  
- ES module bundling  
- Indexed search / graph DB  
- Brief payload generation migration  
- Full view-model extraction  

---

## Prioritized improvement roadmap

| Order | Item | Source docs | Effort |
|------:|------|-------------|--------|
| 1 | Finish peer/nav single source | Architecture, UX | 1–2 d |
| 2 | Self-host fonts + CSP baseline | Security, Perf | 1–2 d |
| 3 | Generate briefs; shrink samples | Perf, Scale | 2–3 d |
| 4 | Chunk intelligence package | Scale, Perf | 3–5 d |
| 5 | Focus management on hash paint | A11y | 1–2 d |
| 6 | Include util in all test sandboxes | DX | 0.5 d |
| 7 | Wipe/export local cyber data | Privacy | 1–2 d |
| 8 | Rate-limit design before live ingest | Security, Reliability | 2 d |
| 9 | View-model extraction (explorer/knowledge) | Architecture | 3–6 d |
| 10 | Optional ES modules | DX | 3–5 d |

---

## Owner review gate

**Do not commit / push until owner review.** Unrelated dirty working tree files (`data/*`, `debug.html`, `status.html`, etc.) must remain untouched by this block’s commit when approved.
