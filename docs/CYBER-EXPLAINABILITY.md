# Cyber Explainability (Daily Brief)

**Status:** V0.1  
**Item schema:** `schema-brief-item-v0.1.json`  
**Related:** [CYBER-PRIORITY-ENGINE.md](CYBER-PRIORITY-ENGINE.md), entity `explainability` fields

---

## Principle

Never say “High Priority” without justification.

Every highlighted item must answer:

| Question | Field |
|----------|-------|
| Why is this included today? | `whyIncludedToday` |
| What changed? | `whatChanged` |
| Who is affected? | `whoIsAffected` |
| What is known? | `whatIsKnown` |
| What is uncertain? | `whatIsUncertain` |
| What should someone read next? | `readNext` + `citations` |

---

## Priority transparency

`priority` on each item includes:

- `band` — low / moderate / high / urgent (or informational for confidence accounting)  
- `total` — documented weighted total after profile emphasis  
- `summaryWhy` — from the priority engine  
- `contributions[]` — each `{ factorId, points, reason }`

### Explicit non-hidden adjustments

| Factor id | When |
|-----------|------|
| `profile_emphasis` | Audience multiplier ≠ 1 |
| `scenario_focus` | Entity is central to a demo scenario |
| `reading_relevance` | Reading-queue items (not vulnerability severity) |
| `confidence_accounting` | Confidence summary (points 0) |

Urgent styling remains capped by the priority engine (exploitation evidence + trusted citations).

---

## Provenance

Items carry:

- `citations` — labels, kinds, URLs when known  
- `provenance` — derived attribution rows for UI footnotes  

Sample data stays labeled **sample**. Confidence stays separate from severity.

---

## Confidence

The Confidence Summary section recounts entity confidence labels (high / moderate / low / …). Sparse sources keep certainty humble. Confidence is **not** a second mystery score.

---

## Tone

`tone-rules.json` forbids panic / clickbait phrases. Generation runs `checkTone()` over headlines and item copy. Prefer “attention” over “alert.”

---

## History’s influence

Previous brief snapshots feed change detection. Summaries mention how many items changed. Empty “New Since Yesterday” is a successful calm outcome — not a failure.
