# Production Accessibility Audit

**Generated:** 2026-07-20 04:33 UTC

## Scope honesty

- Full axe re-scan of all production routes was **not** completed in this pass.
- Best production baseline remains `audits/live-site-qa/accessibility.md` (2026-07-19) plus Chromium spot checks today.
- Experience System V2 a11y work is on `main` but **not deployed**, so production a11y has not benefited from it.

## Findings (evidence-based)

| Issue | WCAG | Severity | Evidence | Impact | Fix |
| --- | --- | --- | --- | --- | --- |
| Systemic color-contrast | 1.4.3 | High | Jul 19 axe ~102 routes | Hard to read UI | Token remediation after redeploy |
| LI missing (404) | 2.4.5 / availability | Critical product | Production 404 | Feature unreachable | Deploy Block 1 |
| Contact hero inconsistency | 2.4.5 | Medium | Home HTML vs footer | Discoverability | Redeploy Contact gate |
| Full SR pass absent | 4.1.2 etc. | Medium | No VoiceOver/TalkBack this audit | Unknown gaps | Manual pass post-deploy |

## Spot-check notes
Playwright Chromium desktop/mobile: major shells loaded without page errors on sampled apps; LI 404 pages present console noise.
