# SignalTerrain Cyber — Technology Profile

**Status:** Live v1  
**Storage:** `localStorage` key `st_inventory_v1` via `WDS.signalTerrainInventory`  
**UI:** `apps/signalterrain/cyber/live.html#profile`

---

## Privacy model

- Local-first by default  
- Not transmitted to providers or third parties by the live dashboard  
- User can add, edit (via re-add), remove, and clear  
- Optional fields: vendor, version, internet-facing (field reserved), notes  

---

## Matching logic

| Level | Label shown | Meaning |
|-------|-------------|---------|
| exact | Direct product match | Product/name overlap with advisory entities |
| vendor | Possible vendor match | Vendor overlap only |
| platform | Platform may be relevant | Platform field overlap |
| ambiguous | Ambiguous possible match | Weak substring in title/summary |
| none | No declared technology match | No overlap |

**Never** silently treat vendor-level match as proof the user is affected.  
**Never** claim compromise from profile matching alone.  
Version mismatches require human confirmation (“Version required to determine exposure”).

---

## Deletion

Use Remove on the profile panel, or `Inventory.clear()` in a developer console. Clearing inventory does not delete the live intelligence artifact.
