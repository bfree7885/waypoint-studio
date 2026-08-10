# SignalTerrain — Minimum Subscription Product (MSP) Freeze

**Campaign id:** `signalterrain`  
**Product path:** `apps/signalterrain` (same Waypoint Studio monorepo)  
**Standing bar:** SUBSCRIBER READY via `node ops/product-board/board.mjs gate --campaign signalterrain`

This freeze is the scope lock for the first SignalTerrain autonomous campaign.
Anything outside this set is backlog.

## 1. Primary customer

A defensive-minded professional or serious amateur who needs a calm, evidence-labeled **daily cyber awareness brief** (what changed, why it matters, who may be affected, what defensive next steps to consider) — **not** a SIEM, SOC console, scanner, or offensive toolkit.

## 2. Primary problem solved

Public cyber signal noise is overwhelming and often hyped. The customer needs one trustworthy place to open each day, read an honest brief backed by real public sources, and leave with clear defensive context — without fake “live” claims or sample data presented as operational intelligence.

## 3. Primary workflow (end-to-end)

1. Open SignalTerrain home → enter **Today’s cyber brief (live)**  
2. Read the brief / overview with trust labels  
3. Drill into a threat/event detail with sources + retrieved time  
4. Optionally adjust persona/preference (local) and see honest empty/error/loading states  
5. Leave understanding what is live vs sample elsewhere in the app

RF / spectrum tools, knowledge-graph demos, and topic samples are **out of MSP** unless they already ship as clearly labeled samples that do not block the cyber brief path.

## 4. Minimum feature set (in)

- SignalTerrain home with clear CTA to live cyber brief  
- Cyber live brief / overview / detail with real `data/cyber/live.json` (or honest degraded state)  
- Source + retrievedAt honesty on live records  
- Sample/demo surfaces explicitly labeled (topics / graph / summary)  
- Loading, empty, error, and network-failure honesty on the primary path  
- Responsive desktop + mobile for home + live cyber  
- No dead primary controls; no broken nav on MSP routes  
- Privacy link reachable  
- Production verify + foundation/live automated checks green  

## 5. Explicitly out (backlog)

- Full RF / SDR product depth  
- Offensive tooling, scanning, penetration testing  
- Paid auth/billing UI (until owner pricing decision)  
- Multi-product redesign / platform chrome rewrites unrelated to MSP  
- Gold-plating secondary cyber explorer/workspace surfaces beyond honesty + nav integrity  

## Launch (do not run until campaign start is authorized)

```bash
cd /home/bryan/projects/waypoint-product-board   # or waypoint-scenes on feature/agent-ops-product-board
node ops/product-board/board.mjs campaign signalterrain
node ops/product-board/board.mjs discover --campaign signalterrain
node ops/product-board/board.mjs prioritize --campaign signalterrain
node ops/product-board/board.mjs gate --campaign signalterrain
```
