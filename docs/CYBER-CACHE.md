# Cyber Ingest Cache

**Status:** Architecture V0.1  
**Schema:** `schema-cache-entry-v0.1.json`  
**Runtime:** `writeCache` / `readCache` in `wds-signalterrain-cyber-ingest.js`  
**Storage:** `localStorage` keys prefixed `wds.st.cyber.ingest.v01.`

---

## Principles

- **Local-first** — each connector has its own cache entry  
- **Offline useful** when `cachePolicy.offlineUseful`  
- **Honest last-updated** messaging when serving cache  
- **Graceful degradation** — expired cache may still display if refresh fails  
- **No shared cache blob** across connectors (keeps isolation)

---

## Cache entry fields

| Field | Meaning |
|-------|---------|
| `connectorId` | Owner connector |
| `cachedAt` / `expiresAt` | Freshness window from connector TTL |
| `payloadKind` | `raw` · `normalized` · `merged` |
| `objectCount` | Items stored |
| `ok` | Last write succeeded |
| `latencyMs` | Last fetch latency |
| `contentHash` | Simple integrity hint |
| `errorMessage` | Present on failed writes |

---

## Behavior

| Situation | Behavior |
|-----------|----------|
| Fresh cache, no force | Return cache; status notes “Served from local cache” |
| Expired cache, refresh OK | Replace entry |
| Expired cache, refresh fails | Serve expired copy; message “Provider unavailable…” |
| No cache, refresh fails | Surface failure in health; empty result |

---

## Health dashboard

Internal page: `apps/signalterrain/cyber/ingest-health.html`

Shows per connector:

- status · last update · average latency · failure count  
- cache age · trust level  
- objects ingested / normalized / rejected  

Not linked as a marketing surface (`noindex`).

---

## Future

Optional IndexedDB for larger payloads; sync remains opt-in and out of V0.1. TTL policies stay on the connector definition so providers remain independently tunable.

---

## Related

- [CYBER-INGESTION-ARCHITECTURE.md](CYBER-INGESTION-ARCHITECTURE.md)  
- [CYBER-PROVENANCE.md](CYBER-PROVENANCE.md)
