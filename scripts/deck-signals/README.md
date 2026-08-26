# Deck signals (internal)

Situational-awareness ingestion for **Waypoint Deck** when connectivity exists.

This is **not** a Waypoint product. There is no public app, catalog card, or navigation entry.

| Piece | Path |
| --- | --- |
| Live fetch / normalize / write | `scripts/deck-signals/live-engine.mjs` |
| Correlation / scoring | `scripts/deck-signals/lib/` |
| Refresh artifacts | `data/cyber/` |
| Relationship-event research data | `data/deck-signals/relationships/` |
| Schemas | `design-system/deck-signals/` |

Do not revive a standalone cyber / network product from this code.
