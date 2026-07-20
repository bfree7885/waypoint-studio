# Dashboard Remaining Technical Debt & Public Beta Recommendations

## Remaining issues

1. **Cold-start JS weight** — largest reliability-adjacent risk for first-time visitors  
2. **Systemic color contrast** (axe) across dark/light tokens  
3. **Air / Rivers narrative depth** still thinner than Today + Weather  
4. **Offline package UX** — cached mode exists but needs a clearer “last known briefing” story  
5. **Maps** — not a first-class Dashboard tab in Recovery (by design); Sheds owns field map  
6. **Customize panel** still a modal/settings surface — ensure mobile sheet is touch-friendly in a later pass  

## Recommendations before public beta

| Priority | Action |
| --- | --- |
| P0 | Deploy Sprint 1 + Sprint 2; re-run live Playwright on Dashboard (geo granted/denied/offline) |
| P1 | Bundle/split Dashboard boot path; measure real-device LCP |
| P1 | Contrast pass on Today Outside + tabs |
| P2 | Richer Air tab interpretation panel matching Today Why pattern |
| P2 | Explicit per-provider Retry chips when critical feed fails |
| P3 | Optional map glance widget linking to Sheds / ForageCast maps |

## Honest readiness assessment

**Dashboard as closed-beta home briefing: Yes (after deploy + smoke).**  
**Dashboard as public-beta flagship: Not yet** — needs performance bundle work and a11y contrast before inviting a broad public audience.
