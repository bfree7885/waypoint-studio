# Cyber Awareness Intelligence Engine

**Version:** 0.1.0 · **Status:** Architecture + prototype  
**Tagline:** What should I pay attention to today?  
**Home:** `scripts/deck-signals/` (no public UI)

Deck-internal intelligence core. Not IDS, SIEM, scanner, or offense.

## Docs

- CYBER-INTELLIGENCE-MODEL.md
- CYBER-GRAPH-ARCHITECTURE.md
- CYBER-PRIORITY-ENGINE.md
- CYBER-DATA-MODEL.md
- CYBER-BRIEFING-ENGINE.md
- CYBER-DAILY-BRIEF.md
- CYBER-EXPLAINABILITY.md
- CYBER-EXPLORER.md
- CYBER-GRAPH-UI.md
- CYBER-TIMELINE.md
- CYBER-MAP.md
- [ADAPTIVE-DEFENSE-ADVISOR.md](../../../../docs/ADAPTIVE-DEFENSE-ADVISOR.md)
- [SECURITY-PROFILES.md](../../../../docs/SECURITY-PROFILES.md)
- [EXPOSURE-ANALYSIS.md](../../../../docs/EXPOSURE-ANALYSIS.md)
- CYBER-SEASONS.md
- [REASONING-ENGINE.md](../../../../docs/REASONING-ENGINE.md)
- [KNOWLEDGE-PLATFORM.md](../../../../docs/KNOWLEDGE-PLATFORM.md)
- CYBER-ENCYCLOPEDIA.md
- [PLAYBOOKS.md](../../../../docs/PLAYBOOKS.md)
- [INCIDENT-LIBRARY.md](../../../../docs/INCIDENT-LIBRARY.md)
- [LEARNING-PATHS.md](../../../../docs/LEARNING-PATHS.md)

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
10. Adaptive advisor lives at `advisor/` — profile + inventory → explainable defensive actions.  
11. Defensive knowledge lives at `knowledge/` — encyclopedia/playbooks/incidents linked to shared graph.
