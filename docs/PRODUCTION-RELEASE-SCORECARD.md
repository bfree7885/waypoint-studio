# Production Release Scorecard

**Generated:** 2026-07-20 04:33 UTC  
Scores vs **live production** (`761b202`), not local `main`.

| Area | Score | Evidence |
| --- | ---: | --- |
| Deployment integrity | **18** | Pages failing after `761b202` |
| Route integrity | **55** | Core 200; LI/Scholar/University 404 |
| Navigation | **60** | Launchers work; LI/Contact hero gaps |
| Functional correctness | **58** | Spot OK; sprint depth missing |
| Dashboard reliability | **62** | Loads; V2 absent |
| App workflow completeness | **45** | Recoveries undeployed |
| Mobile usability | **65** | 390px spot loads |
| Accessibility | **40** | Prior contrast ceiling |
| Performance | **55** | Responds; historically heavy Dashboard |
| Visual consistency | **60** | Experience V2 absent |
| Content accuracy | **50** | Under-represents finished work |
| Observability | **35** | Mixed `local`/SHA markers |
| Release confidence | **20** | Push≠live |

**Classification: Internal alpha**

Top blockers: deploy freeze; SHA mismatch; LI 404; undeployed recoveries; weak fingerprinting.
