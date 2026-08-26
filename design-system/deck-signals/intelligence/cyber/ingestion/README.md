# Cyber Ingestion Pipeline

**Version:** 0.1.0 · **Status:** Architecture + mock prototype  
**Path:** `design-system/signalterrain/intelligence/cyber/ingestion/`

Trustworthy ingestion for Cyber Awareness — not bulk collection.

## Docs

- CYBER-INGESTION-ARCHITECTURE.md
- CYBER-NORMALIZATION.md
- CYBER-PROVENANCE.md
- CYBER-CACHE.md

## Rules

1. Connectors are independent — no cross-calls.  
2. Normalize to shared records only.  
3. Dedupe preserves every provenance row.  
4. History and change events are append-only.  
5. Cache is per-connector and honest about staleness.  
6. No exploit payloads.  
7. Health UI is internal only.
