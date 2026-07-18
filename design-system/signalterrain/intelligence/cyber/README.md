# Cyber Awareness Intelligence Engine

**Version:** 0.1.0 · **Status:** Architecture + prototype  
**Tagline:** What should I pay attention to today?  
**Home:** `apps/signalterrain/cyber/`

Extends SignalTerrain Intelligence Core. Not IDS, SIEM, scanner, or offense.

## Docs

- [CYBER-INTELLIGENCE-MODEL.md](../../../../docs/CYBER-INTELLIGENCE-MODEL.md)
- [CYBER-GRAPH-ARCHITECTURE.md](../../../../docs/CYBER-GRAPH-ARCHITECTURE.md)
- [CYBER-PRIORITY-ENGINE.md](../../../../docs/CYBER-PRIORITY-ENGINE.md)
- [CYBER-DATA-MODEL.md](../../../../docs/CYBER-DATA-MODEL.md)
- [CYBER-BRIEFING-ENGINE.md](../../../../docs/CYBER-BRIEFING-ENGINE.md)
- [CYBER-DAILY-BRIEF.md](../../../../docs/CYBER-DAILY-BRIEF.md)
- [CYBER-EXPLAINABILITY.md](../../../../docs/CYBER-EXPLAINABILITY.md)
- [CYBER-EXPLORER.md](../../../../docs/CYBER-EXPLORER.md)
- [CYBER-GRAPH-UI.md](../../../../docs/CYBER-GRAPH-UI.md)
- [CYBER-TIMELINE.md](../../../../docs/CYBER-TIMELINE.md)
- [CYBER-MAP.md](../../../../docs/CYBER-MAP.md)

## Rules

1. Educational and defensive only.  
2. Every priority score explains each contribution.  
3. Known Facts / Likely / Possible / Unknown stay separate.  
4. Samples stay labeled sample.  
5. No exploit payloads or PoCs.  
6. Research workspace is shared with RF (`../research/`).  
7. Ingestion pipeline lives at `ingestion/` — independent connectors, mock in V0.1.  
8. Daily briefing lives at `briefing/` — calm attention, transparent why.  
9. Intelligence explorer lives at `explorer/` — relationships, timeline, coarse map; reuses shared graph.
