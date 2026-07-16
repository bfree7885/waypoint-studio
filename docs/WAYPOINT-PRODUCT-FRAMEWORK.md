# Waypoint Product Framework

**Status:** Active foundation  
**Config:** `design-system/ecosystem/product-framework.json`  
**Related:** Constitution · Product Standards · Waypoint Method · Waypoint Knowledge · Editorial Standards

---

## Mission

> Observe clearly. Understand deeply. Choose your own direction.

Waypoint Studio does **not** assign tasks, homework, streaks, scores, or obligations.

A user may simply read, observe, or leave. That is a complete and valid use of every product.

---

## Shared stages

| Stage | Role |
|-------|------|
| **Observe** | Help the user see what is happening. |
| **Understand** | Help the user understand why it matters. |

These two stages are shared across the studio.

---

## Domain-specific direction

The third stage reflects each product’s natural purpose. Labels describe **support**, not commands.

| Product | Direction |
|---------|-----------|
| Sheds | **Search** |
| Fieldry | **Record** |
| ForageCast | **Explore** |
| Steepleaf | **Brew** |
| Savant Sommelier | **Taste** |
| SignalTerrain | **Monitor** |
| Outdoor Intelligence Dashboard | **Plan** |
| Waypoint Scenes | **Create** |
| Photo Coach | **Refine** |
| Hidden Landscapes | **Reveal** |

### Why Create belongs to Scenes

**Create** remains part of the broader studio identity (`Observe · Understand · Create · Share`) and is especially natural in Waypoint Scenes. It is optional, personal, and free from competition. It is **not** a required behavior in Sheds, Dashboard, SignalTerrain, or other non-creative surfaces.

---

## User autonomy principles

1. No mandatory onboarding that blocks the primary tool.  
2. No progress gates, streaks, or achievement pressure as core loops.  
3. Direction language invites consideration (“you may want to”, “worth watching”).  
4. Safety-critical guidance stays clear and direct.  
5. Knowledge and research are available when helpful — never forced before use.

---

## Tone

Prefer: consider, explore, conditions currently favor, evidence suggests, one possible interpretation, useful context, your decision.

Avoid unless safety/technical: must, homework, assignment, streak, complete today’s task, take action now.

Encoded in `product-framework.json` → `tone`.

---

## Implementation

- Machine-readable: `design-system/ecosystem/product-framework.json`
- Registry pointer: `product-registry.json` → `sharedEngines.product-framework`
- Public explanation: `about.html`, `knowledge.html`, home lead copy
- Field example: Sheds plan “Why this area?” links to optional reading

---

## Remaining V2 work

- Product-home “Understand” strips fed by curated hooks  
- Verified (non-demo) research entries with real citations  
- Condition→knowledge wiring beyond structural hooks  
- Localization of framework strings  
