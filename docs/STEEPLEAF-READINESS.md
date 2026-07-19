# Steepleaf — Readiness Assessment (Sprint 3)

## Verdict

**Ready for closed beta as a private tea companion**, with an adjacent educational knowledge graph that is clearly labeled as sample data.

Not yet “public launch polished” for CWV, single-nav chrome, or offline-first packaging.

## Checklist

| Criterion | Status |
| --- | --- |
| Visitor understands brew / track / learn / journal | Met (home onboard + quick grid) |
| Startup fails with retry instead of infinite wait | Met (companion + explore + entity) |
| Primary workflow complete (tea → brew → notes → history) | Met |
| Sample graph not presented as user journal | Met (copy + honesty chips) |
| Mobile usable (touch, scroll nav) | Improved |
| Automated contract tests | Met (`test-steepleaf-recovery.mjs`) |
| Live Playwright re-audit after deploy | Pending owner deploy |
| Multi-device sync | Not offered |

## Recommend

1. Deploy this tree and spot-check `/apps/steepleaf/`, `explore/`, and one entity URL on phone + desktop.  
2. Confirm boot fail UI by temporarily breaking a script URL in staging.  
3. Keep closed-beta framing: private companion first; graph as optional education.
