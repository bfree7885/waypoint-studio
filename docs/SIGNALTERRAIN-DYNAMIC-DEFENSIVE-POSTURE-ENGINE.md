# Dynamic Defensive Posture Engine

**Status:** Architecture only — **not implemented**  
**Product:** SignalTerrain (Side Trails)  
**Primary question:** *What should I do differently today?*  
**Related (existing):** [ADAPTIVE-DEFENSE-ADVISOR.md](ADAPTIVE-DEFENSE-ADVISOR.md), [SIGNALTERRAIN-RECOMMENDATIONS.md](SIGNALTERRAIN-RECOMMENDATIONS.md), [CYBER-BRIEFING-ENGINE.md](CYBER-BRIEFING-ENGINE.md), [SIGNALTERRAIN-CYBER-PRIORITY-MODEL.md](SIGNALTERRAIN-CYBER-PRIORITY-MODEL.md)

---

## 1. Purpose

Static recommendation lists age badly. A patch tip that mattered last Tuesday may be noise today; a calm “monitor” note may become the only thing worth changing after a new exploited vulnerability lands.

The **Dynamic Defensive Posture Engine** (DDPE) is the architecture for turning *changing public intelligence* and *stable defender context* into a short, explainable daily delta:

> **What should I do differently today?**

Not “here are fifty timeless best practices.”  
Not automatic remediation.  
Not offensive guidance.  
Not fake certainty.

DDPE is a **reasoning contract**. This document does not ship runtime code.

---

## 2. Design principles

| Prefer | Refuse |
| --- | --- |
| Daily *delta* vs yesterday’s posture | Static evergreen checklists as the main UX |
| Evidence-linked drivers | Black-box “risk scores” with no factors |
| Facts vs inferences labeled | Invented attribution or victim claims |
| Human accept / defer / dismiss | Auto-execute, auto-block, one-click IPS |
| Calm, professional tone | Urgency theater, fear marketing, fake AI voice |
| Honest “nothing material changed” | Filling the board to look busy |

---

## 3. Core idea: posture = context × climate

```
┌─────────────────────────────────────────────────────────────┐
│                 Defender context (slow-changing)            │
│  technology stack · region · industry · environments        │
│  risk tolerance · inventory completeness / unknowns         │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│              Threat climate (fast-changing)                 │
│  new zero-days · copycat attacks · active ransomware        │
│  exploited vulnerabilities · vendor advisories              │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│              Dynamic Defensive Posture Engine               │
│  detect deltas → score relevance → draft actions            │
│  explain drivers → compress to “differently today”          │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
              What should I do differently today?
              (+ why · evidence · confidence · safe to ignore)
```

- **Context** answers: *Does this apply to me?*  
- **Climate** answers: *What moved in the public record?*  
- **Posture output** answers: *What should change in my defensive work today?*

---

## 4. Adaptation inputs

Each input is a **driver class**. Drivers never become recommendations without a relevance join to defender context (or an explicit “general hygiene” lane with lower priority).

### 4.1 New zero-days

| Role in DDPE | Behavior |
| --- | --- |
| Signal | Newly disclosed issue with incomplete patch/mitigation story, or early exploitation reports |
| Adaptation | Raise watch priority for matching stack components; prefer *verify exposure* and *vendor channel watch* over speculative fixes |
| Guardrails | Do not invent in-the-wild exploitation; label confidence; avoid “zero-day” as marketing spice |

**Differently today example (shape):** “If you run Sample Product Family X, review today’s vendor note and confirm whether your build is in scope — skip unrelated browser plugins.”

### 4.2 Copycat attacks

| Role in DDPE | Behavior |
| --- | --- |
| Signal | Public reporting that a known technique or lure is being reused against new verticals |
| Adaptation | Shift priorities toward the *technique* (phishing path, exposed service class) rather than a single CVE ID |
| Guardrails | No theatrical actor lore; no claiming the defender is targeted without evidence |

**Differently today example (shape):** “Finance-shaped phishing copycats are in sample reporting — tighten today’s review of payment-change requests; defer low-value password-rotation theater.”

### 4.3 Active ransomware

| Role in DDPE | Behavior |
| --- | --- |
| Signal | Credible public campaign/affiliate activity affecting industries or product classes in the profile |
| Adaptation | Promote backup restore verification, remote-access hardening, and known initial-access paths tied to the campaign class |
| Guardrails | Never invent victims; “active” requires cited public evidence; low-confidence chatter stays low priority |

### 4.4 Exploited vulnerabilities

| Role in DDPE | Behavior |
| --- | --- |
| Signal | Known exploited catalog membership (e.g. KEV-class), or official exploitation evidence |
| Adaptation | Highest weight among climate drivers when inventory/stack matches; deadlines become first-class |
| Guardrails | CVSS alone is insufficient (see priority model); profile match required for personal urgency |

### 4.5 Vendor advisories

| Role in DDPE | Behavior |
| --- | --- |
| Signal | Patch, mitigation, or detection guidance from a publisher tied to products in inventory |
| Adaptation | Convert advisory into a dated action with expected duration; expire when patched or dismissed |
| Guardrails | Prefer primary advisory URLs; do not paraphrase into stronger claims than the vendor made |

### 4.6 Technology stack

| Role in DDPE | Behavior |
| --- | --- |
| Context | Products, versions, platforms, services the defender actually runs (manual inventory V1; discovery later) |
| Adaptation | Filters and re-ranks climate drivers; unmatched climate stays informational or hidden behind “not in your stack” |
| Guardrails | Ambiguous version matches are inferences; never treat vendor-level match as proof of exposure |

### 4.7 Region

| Role in DDPE | Behavior |
| --- | --- |
| Context | Operating regions / regulatory neighborhoods the defender cares about |
| Adaptation | Emphasize advisories and campaign reporting that cite those regions; do not geo-fabricate map drama |
| Guardrails | Region emphasis is a multiplier on attention — not a claim of targeting |

### 4.8 Industry

| Role in DDPE | Behavior |
| --- | --- |
| Context | Sector (e.g. education, municipal, small retail, personal/home lab) |
| Adaptation | Prefer copycat and ransomware patterns reported against that industry; adjust language to role reality |
| Guardrails | Industry tags come from profile + cited reporting — not stereotypes |

---

## 5. Output: “What should I do differently today?”

DDPE’s primary artifact is a **Daily Posture Delta** (name illustrative).

### 5.1 Required shape

| Field | Meaning |
| --- | --- |
| `asOf` | Generation time |
| `comparedTo` | Prior posture snapshot id / time |
| `headline` | One calm sentence answering the primary question |
| `doDifferently[]` | 1–5 actions that changed vs prior day |
| `whyNow[]` | Driver classes that moved (zero-day, KEV, advisory, …) |
| `stillTrue[]` | Ongoing priorities unchanged (optional, short) |
| `safeToDefer[]` | Items demoted or explicitly not worth chasing today |
| `unknowns[]` | Missing inventory, ambiguous matches, thin evidence |
| `confidence` | Overall honesty label for the delta |
| `evidence[]` | Citations for every material claim |

Each `doDifferently` item must include: plain-language **action**, **why**, **who/what it applies to**, **priority**, **evidence**, **expected duration**, and **expiresAt** (aligned with [SIGNALTERRAIN-RECOMMENDATIONS.md](SIGNALTERRAIN-RECOMMENDATIONS.md)).

### 5.2 How “differently” is computed (conceptual)

1. Build **yesterday’s posture** (accepted + suggested + deferred actions still open).  
2. Ingest **today’s climate deltas** (new/changed drivers only).  
3. **Join** drivers to stack / region / industry (relevance).  
4. Produce candidate actions; **diff** against yesterday.  
5. Keep only actions that are **new, newly urgent, newly in-scope, or newly evidenced**.  
6. Compress to a human-scale list; if none qualify, say so plainly.

```
climate_delta ⊕ context_match → candidates
candidates − prior_posture     → differently_today
differently_today              → explain + evidence + confidence
```

### 5.3 Empty / quiet days

A valid output:

> Nothing material changed for your stack since yesterday. Continue open items X and Y; ignore Z.

Quiet days are a feature. Filling space is a defect.

---

## 6. Logical components (future implementation map)

| Component | Responsibility | Notes |
| --- | --- | --- |
| Context profile | Stack, region, industry, environments, risk tolerance | Slow store; privacy-first / local-first when practical |
| Climate ingest | Normalize public zero-day, exploit, ransomware, advisory signals | Cite sources; no scrape-to-secrecy |
| Delta detector | Diff climate + prior posture snapshots | Powers “what changed” |
| Relevance joiner | Match drivers → inventory / sector / region | Ambiguity = inference |
| Action drafter | Emit recommendation objects (`rec_*`) | Guidance only; `autoExecute: false` |
| Explainer | Factor contributions in plain language | No mystery totals |
| Daily compressor | Produce the posture delta board | Caps list length; prefers clarity |

Existing Adaptive Defense Advisor surfaces may **host** this contract later; DDPE is the named engine for dynamic posture deltas specifically. This branch does not wire or refactor that runtime.

---

## 7. Non-goals

- Automatic patching, blocking, or account changes  
- Offensive tradecraft, exploit PoCs, or credential attacks  
- Predicting attacks against a named organization without evidence  
- Replacing human judgment with a scoreboard  
- Fake “AI co-pilot” narration that invents certainty

---

## 8. Trust & product standards

- Facts vs estimates vs placeholders must stay visually and structurally distinct.  
- Never fabricate victims, actors, or exploitation.  
- Urgent priority is rare and must carry strong evidence plus calm wording.  
- Align evidence presentation with Waypoint Trust / recommendation schemas when implemented.

---

## 9. Phased roadmap (documentation only)

| Phase | Intent |
| --- | --- |
| A — Contract | This architecture + schemas sketched; owner review |
| B — Snapshot diff | Daily delta against stored posture without new UI chrome |
| C — Driver packs | Explicit adapters per input class (KEV, advisory, ransomware, …) |
| D — Context depth | Stronger stack/region/industry joins with honest unknowns |
| E — Product UI | “What should I do differently today?” as a first-class board |

No phase implies a ship date.

---

## 10. Owner decisions needed

1. Confirm DDPE as the canonical name for this daily-delta engine vs folding naming into Adaptive Defense Advisor only.  
2. Confirm maximum `doDifferently` count (proposal: 5).  
3. Confirm whether region/industry are required profile fields or optional emphasis.  
4. Approve quiet-day copy as a success state.

---

## Related

- [ADAPTIVE-DEFENSE-ADVISOR.md](ADAPTIVE-DEFENSE-ADVISOR.md) — existing “differently today” mission surface  
- [SIGNALTERRAIN-RECOMMENDATIONS.md](SIGNALTERRAIN-RECOMMENDATIONS.md) — recommendation object rules  
- [CYBER-BRIEFING-ENGINE.md](CYBER-BRIEFING-ENGINE.md) — “pay attention today” brief (complementary, not identical)  
- [docs/product/signalterrain-dynamic-defensive-posture-owner-review.md](product/signalterrain-dynamic-defensive-posture-owner-review.md)
