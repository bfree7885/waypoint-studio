# Editorial Standards — Waypoint Studio

**Status:** Active  
**Complements:** Field Guide Standards · Educational Framework · Research Integrity · Product Framework

These standards govern curated knowledge, public explanations, and interpretive copy.

**Curated knowledge depth (selection, corrections, conflicting evidence, AI assistance):**  
[Waypoint Editorial Standards](WAYPOINT-EDITORIAL-STANDARDS.md) · [Knowledge Platform V1](WAYPOINT-KNOWLEDGE-PLATFORM.md)

---

## 1. Source quality

Prefer, in order:

1. Primary research  
2. Government and university sources  
3. Established professional organizations  
4. High-quality synthesis and journalism  
5. Clearly identified expert commentary  

Avoid anonymous claims, engagement bait, and unverifiable viral posts as knowledge foundations.

---

## 2. Transparency

Every curated entry must distinguish:

| Layer | Meaning |
|-------|---------|
| **Source Summary** | What the original source reports |
| **Waypoint Perspective** | What Waypoint Studio concludes or connects for field/app use |
| **Limitations** | What remains uncertain or out of scope |

Never present Waypoint Perspective as part of the original research.

(Stored field name remains `waypointAnalysis` for compatibility; UI label is Perspective.)

---

## 3. Corrections (future-ready)

Process expectations:

- Update summaries when sources change  
- Mark retractions clearly  
- Correct factual errors promptly  
- Replace or flag broken links  
- Record `dateReviewed`  
- Archive outdated guidance with `reviewStatus: archived`

Full process: [Waypoint Editorial Standards](WAYPOINT-EDITORIAL-STANDARDS.md).

---

## 4. Academic material

- One study is not universal truth  
- Note scope and sample limits when relevant  
- Distinguish observational vs experimental work  
- Note known conflicts of interest  
- Mention disagreement or replication gaps when relevant  
- Use plain language without erasing important nuance  

---

## 5. Political / geopolitical / cyber material

For intelligence-adjacent products (e.g. SignalTerrain), see also
[SIGNALTERRAIN-EDITORIAL-STANDARDS.md](SIGNALTERRAIN-EDITORIAL-STANDARDS.md).

- Separate reporting from interpretation
- Cite originals
- Represent uncertainty
- Avoid partisan framing
- Do not present speculation as fact
- Include competing credible interpretations when evidence is disputed
- Make dates and freshness prominent
- Distinguish event reporting, analysis, and scenario assessment
- Avoid fear-based language
- Remain defensive, educational, lawful, and non-operational
- Do not present open-web rumor as verified intelligence
- Never ship exploit PoCs or attack procedures in product surfaces

---

## 6. Copyright

- Do not scrape or republish copyrighted articles in full  
- Prefer metadata, summaries, analysis, and outbound links  
- Short compliant excerpts only when necessary and attributed  

---

## 7. Product language

Follow [Waypoint Voice](WAYPOINT-VOICE.md), [Waypoint Guide Experience](WAYPOINT-GUIDE-EXPERIENCE.md), and `product-framework.json` tone rules.

Present major information as: what we’re seeing → why it matters → worth noticing → if you’re curious.

Safety-critical warnings (toxicity, legal access, wildlife disturbance, cyber offense boundaries) stay direct.

School-like pressure (“complete”, “homework”, “streak”, “you must”) does not belong in product-facing guidance.

Knowledge CTAs prefer: Why this matters · Worth noticing · Related research · Background · If you’re curious.

---

## 8. Privacy and analytics

- No invasive reading surveillance  
- No reading streaks or shame for unread items  
- Future quality metrics may include broken links, failed loads, and accessibility issues — not addictive engagement  

---

## 9. Accessibility

Clear hierarchy, readable line length, contrast, resizing, screen readers, keyboard toggles, reduced motion, mobile comfort.
