# Production Expected-Change Traceability

**Generated:** 2026-07-20 04:33 UTC

| Commit | Message (short) | Intended user-visible | Local | Remote | Production | Status | Why |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 761b202 | Dashboard Today Outside | Dashboard briefing | Yes | Yes | **Yes** | Visible and working | Last successful Pages deploy |
| c5a44d4 | Steepleaf reliable companion | Steepleaf recovery | Yes | Yes | **No** | Pushed but deployment failed | Pages fail (also introduced `/explore/` break) |
| d14c9dc | ForageCast honest locations | ForageCast recovery | Yes | Yes | **No** | Deployment failed | Deploy freeze |
| 810a4c1 | SignalTerrain Live | Cyber Live | Yes | Yes | **No** | Deployment failed | Deploy freeze |
| cbbceb8 | Sheds field-first | Sheds recovery | Yes | Yes | **No** | Deployment failed | Deploy freeze |
| d80a682 | Fieldry dependable | Fieldry recovery | Yes | Yes | **No** | Deployment failed | Deploy freeze |
| f0bcccc | Savant reliable | Savant recovery | Yes | Yes | **No** | Deployment failed | Deploy freeze |
| 96f3963 | LI + Volunteer | LI app + Volunteer | Yes | Yes | **No** | Deployment failed | LI 404 |
| ff2f392 | Scholar Module 6 | Scholar | Yes | Yes | **No** | Deployment failed | 404 |
| d091e1e | Dashboard V2 | Today Outside V2 | Yes | Yes | **No** | Deployment failed | Stale Dashboard |
| cfb8bcc | Experience System V2 | Cohesion/a11y shell | Yes | Yes | **No** | Deployment failed | Deploy freeze |
| 081965d | RC1 assessment + gates | Contact hero + LI resilience + reports | Yes | Yes | **No** | Deployment failed | Contact hero missing; reports are docs-only |

## Answer to “Why am I not seeing changes?”

**Primary:** GitHub Pages deploy has failed on every push after `761b202` because `validate-production-links.mjs` rejects Steepleaf `/explore/`. Production therefore remains the older artifact.
