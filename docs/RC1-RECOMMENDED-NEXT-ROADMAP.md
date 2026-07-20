# Recommended Next Roadmap — After Sprint 10

## Now (Closed Beta gate — days)

1. Deploy latest `main` (includes recovery 1–9 + Sprint 10 gate fixes).  
2. Run Playwright smoke on production: `/map/`, Dashboard, ForageCast Overview, Steepleaf explore/entity, season-table, Sheds map, Volunteer Discover, LI field reader.  
3. Send Closed Beta invites with explicit framing (sample data, educational estimates, private notebooks).  
4. Open Contact accessibility category for feedback.

## Next focused cycle (pre-public RC1) — “Quality & Access”

**Theme:** accessibility + cold start + Scenes consistency — **not** new apps.

| Track | Work |
| --- | --- |
| A11y | Token contrast; Knowledge; nested interactive; keyboard/SR pass on top 5 flows |
| Perf | Dashboard provider budget; ForageCast boot trim; measure with Playwright usable-wait v2 |
| Scenes | Photo Coach / Library / Hidden Landscapes smoke + honesty polish |
| Field | Photo attach spike for Fieldry or Sheds (one app first) |
| QA | Institutionalize live re-audit script in CI against staging |

## Later enhancements (post-RC1)

- Live Volunteer regional feeds  
- LI regional rule packs + optional layers  
- Savant knowledge graph entities  
- Unified observation write bridge  
- SignalTerrain Radio when ready  

## Naming recommendation

Call the next public milestone **Closed Beta 1**, not **RC1**, until contrast + live re-audit + cold-start bars are met. Reserve **RC1** for the first public candidate after the Quality & Access cycle.
