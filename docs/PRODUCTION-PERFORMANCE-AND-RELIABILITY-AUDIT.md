# Production Performance and Reliability Audit

**Generated:** 2026-07-20 04:33 UTC

## Separation of concerns

| Class | Finding |
| --- | --- |
| Deployment/cache | Production frozen at `761b202`; Fastly/GitHub cache serving that artifact (`Last-Modified: 2026-07-19 16:28:05 GMT`) |
| Code performance | Prior QA: Dashboard/ForageCast slow cold starts; not re-measured with Lighthouse this pass |
| Provider/network | Not fully re-profiled; Dashboard loaded in spot check without console errors |
| Perception | Owner sees “unchanged” because deploy never advanced |

## Measured this pass
- Homepage HTTP/2 200, `cache-control: max-age=600`, GitHub/Fastly via headers
- Playwright loads of home/dashboard/volunteer/fieldry/scenes/contact/steepleaf succeeded (Chromium)
- LI 404 is reliability/availability failure for that product surface

## Not claimed
No fabricated CWV percentages. Full Lab/Field metrics require post-deploy measurement.
