# Dashboard Recovery Report — Sprint 2

## Goal

Make Dashboard the calm home screen of Waypoint Studio: what is happening outside, why it matters, and what to consider today.

## Before

- Summary felt like a thin headline with gauges scattered across tabs
- “Partial success” appeared when secondary providers (trails/elevation/rivers) lagged
- Temperature / UV / photography cues repeated without clear ownership
- Customize lived as a footer affordance rather than a Settings topic

## After

| Area | Outcome |
| --- | --- |
| Centerpiece | **Today Outside** with Why-backed briefing (hero preview + full Today tab) |
| Usability | Dashboard paints usable briefing when weather (critical path) is live |
| Trust UI | Partial banner names failed vs location-skipped providers |
| Navigation | One question per tab; Settings holds customize + studio link |
| Dedupe | Weather owns gauges; Photography owns light quality; Sun & Moon owns clock times |
| Mobile | Larger tab hit targets; sticky tab scroller unchanged; Why lines clamp on preview |

## Architecture (unchanged spine)

`home-boot` → `contentEngine` outdoor-dashboard → `dashboardRecovery` → Today / lazy specialty mounts → OIP `Promise.all` (trails late).

## Honest limits

- Still a large sequential `wds.js` load — cold start weight remains structural
- Interpretations are rule-based from OIP, not a generative model
- Offline/cached modes rely on existing reliability tags; deeper offline package UX is future work
- Air tab still uses catalog widget chrome (not a full custom narrative panel)

## Readiness

**Closed-beta ready as the Studio entry briefing**, once deployed and spot-checked on mobile. Not yet “public beta polished” for CWV/contrast/offline depth.
