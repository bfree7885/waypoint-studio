# Steepleaf Recovery Report — Sprint 3

## Goal

Make Steepleaf feel like a calm, dependable tea companion: clear product purpose, reliable startup, and a complete brew → notes → history workflow — without presenting educational samples as the user’s private journal.

## Evidence used

From `audits/live-site-qa/`:

- **P1** explore/entity remained in loading heuristics >15s (syntax/boot path; fail/retry incomplete on companion)
- Home screenshot: usable empty companion, but triple navigation / vague “Sample tea page” peer link
- Explore screenshot (pre-repair): cream strip / broken paint when JS failed mid-boot
- Console/network: graph JSON must resolve; boot must clear `aria-busy` or fail

## Before

| Surface | Problem |
| --- | --- |
| Companion | Could hang if models/scripts arrived late; weak first-visit explanation |
| Explore / entity | Script race left busy mount; educational vs private boundary fuzzy (“AI summary”, “Sample tea page”) |
| Workflow | Brew empty states thin; sessions labeled “Brewing Sessions” without clear next step |
| Perf | Graph re-fetched on every explore↔entity navigation |

## After

| Area | Outcome |
| --- | --- |
| Startup | Companion + explore + entity wait for scripts with deadline, progress status, timeout → fail + retry |
| Clarity | Home states what Steepleaf is, four concrete start steps, and “what you can do” grid |
| Boundary | Peers/nav/entity copy labels educational samples; companion is private on-device |
| Workflow | Brew pick → variables → timer → notes → sessions/history links; empty sessions guide next action |
| Graph | In-memory load cache; status lines during fetch/build; shorter watch timeout (12s) |
| Design / mobile | Onboard + quick tiles; larger nav/form touch targets ≤800px; bridge links companion ↔ graph |

## Surfaces

1. **Private companion** (`/apps/steepleaf/`) — collection, brew, journal, learning  
2. **Knowledge graph** (`explore/`, `entity/`) — labeled educational samples only  

## Honest limits

- Knowledge graph remains a **demo sample graph**, not live inventory or user data sync  
- Companion data is **localStorage only** — no account sync, no multi-device  
- Triple chrome (studio shell + peers strip + in-app nav) is reduced in wording but not fully collapsed into one nav  
- No full Playwright re-audit in this sprint (unit recovery tests cover contracts)

## Verification

```bash
node automation/test-steepleaf-recovery.mjs
node automation/test-steepleaf-knowledge-graph.mjs
```
