# SignalTerrain — Defensive Recommendations

**Status:** Architecture V0.1  
**Core:** [SIGNALTERRAIN-INTELLIGENCE-CORE.md](SIGNALTERRAIN-INTELLIGENCE-CORE.md)  
**Schema:** `design-system/signalterrain/intelligence/schema-recommendation-v0.1.json`

Recommendations answer **What should happen next?** without executing anything.

---

## Principle

Guidance, not automation.

No automatic remediation.  
No automatic blocking.  
No “one-click IPS.”

A recommendation is an object a human can accept, defer, or dismiss.

---

## Required answers

| Question | Field |
|----------|-------|
| Why? | `why` |
| Who? | `who` (audiences / roles / asset classes) |
| Priority? | `priority` (`low` · `moderate` · `high` · `urgent`) |
| Evidence? | `evidence[]` |
| Recommended action? | `action` (plain language, defensive) |
| Expected duration? | `expectedDuration` |
| Dependencies? | `dependencies[]` |

Also: `confidence`, `relatedUioIds`, `relatedTopicIds`, `unknowns`, `expiresAt`.

Ids use prefix `rec_`.

---

## Priority guidance

| Priority | Meaning |
|----------|---------|
| `low` | Informational hygiene |
| `moderate` | Plan within normal operations |
| `high` | Prioritize soon — still human-paced |
| `urgent` | Rare; requires strong evidence and calm wording |

Urgent must never mean theatrical panic. Always pair with `why` and `evidence`.

---

## Action rules

Allowed: patch, update, backup verify, reduce exposure, monitor vendor advisory, retune expectations (RF), review inventory later.

Forbidden: exploit steps, credential attacks, offensive scanning instructions, automatic network changes.

---

## Lifecycle

`draft` → `suggested` → `accepted` | `deferred` | `dismissed` | `expired`

V0.1 samples use `suggested` / `sample` meta only.

---

## Relationship to Trust

Evidence lists align with the Evidence Card model. Prefer Trust confidence labels in UI.

---

## Related

- [SIGNALTERRAIN-INTELLIGENCE-ROADMAP.md](SIGNALTERRAIN-INTELLIGENCE-ROADMAP.md) Phase 6  
- [WAYPOINT-TRUST-FRAMEWORK.md](WAYPOINT-TRUST-FRAMEWORK.md)  
- [SIGNALTERRAIN-DYNAMIC-DEFENSIVE-POSTURE-ENGINE.md](SIGNALTERRAIN-DYNAMIC-DEFENSIVE-POSTURE-ENGINE.md) — daily “differently today” posture deltas (architecture)
