# Waypoint Guide Experience

**Status:** Active foundation  
**Audience:** Every Waypoint Studio product surface, editorial, and product-facing AI  
**Complements:** [Waypoint Voice](WAYPOINT-VOICE.md) · [Waypoint AI Guide](WAYPOINT-AI-GUIDE.md) · Product Framework · Field Design System · Editorial Standards

This document governs **how information is presented**.

It does **not** redesign navigation, maps, or add major features.  
It transforms Waypoint from an information platform into a **trusted field guide**.

---

## Mission

Every Waypoint Studio app should feel like spending the day with an exceptional guide.

Not a teacher.  
Not a lecturer.  
Not a productivity app.  
Not an influencer.  
Not an algorithm optimizing engagement.

After a few minutes with Waypoint, the user should feel:

- “I’ve learned something interesting.”  
- “I understand more than I did five minutes ago.”  
- “I know why this matters.”  
- “The decision is still mine.”

---

## The Guide Pattern

Every major piece of information should naturally follow this arc:

### 1. What we’re seeing

Describe current conditions. No conclusions yet.

Examples: weather, river level, recent wildlife movement, research status, mushroom activity, photo characteristics, radio activity.

Simply establish **what is happening**.

### 2. Why it matters

Provide context. Connect observations. Explain relationships. Use research when appropriate. Use plain language. Never assume prior knowledge.

Always distinguish:

| Kind | Meaning |
|------|---------|
| **Observed fact** | What evidence shows |
| **Interpretation** | How Waypoint reads that evidence |
| **Uncertainty** | What we do not know yet |

### 3. Worth noticing

Replaces tasks, assignments, challenges-as-homework, required activities.

Offer interesting observations — invitations to notice, not instructions.

Examples:

- “This south-facing slope warms earlier than the surrounding forest.”  
- “Notice how today’s cloud cover softens contrast.”  
- “Several recent studies suggest…”  
- “This species is often overlooked because…”

### 4. If you’re curious

Optional exploration: related research, historical comparisons, nearby observations, species notes, maps, further reading.

No pressure. No expectation. No completion tracking.

---

## Emotional outcome

| More of | Never |
|---------|--------|
| curious | behind |
| informed | judged |
| confident | pressured |
| oriented | obligated |

If the user feels they failed the app, the presentation failed.

---

## Language rules

### Prefer

Guide · Field notes · Observation · Worth noticing · Background · Context · Reference · Why it matters · If you’re curious · Related information

### Reduce (product-facing)

Teacher · Professor · Lesson · Classroom · Assignment · Lab (as schooling) · Homework · Exercise · Study guide · Training · Course · Certification · Required · Mandatory

### Keep direct

Safety warnings · Legal warnings · Accessibility instructions

Internal code IDs, engineering “assignment,” banned-term detectors, and historical audit docs may retain school words when they are **not** coaching the user.

---

## Guide Cards

Reusable presentation pattern for major observations.

```text
--------------------------------------------------
Worth Noticing

South-facing slopes are warming more quickly today
because overnight temperatures stayed above freezing.

Why it matters

Earlier warming often increases wildlife movement
in these areas during late winter.

If you're curious

• Research on winter bedding behavior
• Terrain explanation
• Recent observations nearby
--------------------------------------------------
```

**Never on a Guide Card:** grades · tasks · “Next lesson” · progress bars · homework · streaks · completion metrics.

### Shared assets

| Asset | Role |
|-------|------|
| `design-system/css/wds-guide-experience.css` | Quiet field-note layout |
| `design-system/js/guide/wds-guide-card.js` | `WDS.guideCard` renderer |
| `design-system/patterns/guide-card.html` | Living reference |
| Registry → `sharedEngines.waypoint-guide-experience` | Product pointer |

---

## Product applications

| Product | What we’re seeing | Why it matters | Worth noticing | If you’re curious |
|---------|-------------------|----------------|----------------|-------------------|
| **Sheds** | Habitat conditions | Terrain, weather, biology | Field observations | Research, maps, habitat science |
| **Fieldry** | Observation | Context | Species cues | Species references |
| **ForageCast** | Current conditions | Ecology | Phenology cues | Related fungi or plants |
| **Photo Coach** | Image characteristics | Visual perception | Composition ideas | Photography research, examples |
| **SignalTerrain** | Current events | Technical context | Advisories | Research |
| **Dashboard** | Conditions | Planning context | Quiet signals | Deeper layers |
| **Scenes** | Frame / atmosphere | Craft and memory | Light and depth | Related guides |

---

## Design principles

The experience should feel:

- calm  
- quiet  
- curious  
- respectful  
- professional  

AI and copy should sound like someone who enjoys sharing knowledge — not someone finishing a curriculum.

Users should never feel behind, judged, or pressured.

---

## Conversation patterns

Prefer openings like:

- I noticed something interesting…  
- This might explain…  
- Here’s why this matters…  
- If you’re interested…  
- You may also want to know…  
- Worth noticing…  

Avoid:

- You must… / You should… (except safety/legal)  
- Your assignment…  
- Complete this…  
- You’re behind…  
- Next lesson…  

Full AI voice: [Waypoint AI Guide](WAYPOINT-AI-GUIDE.md).  
Editorial voice: [Waypoint Voice](WAYPOINT-VOICE.md).

---

## Future editorial standards

1. New major UI blocks default to the Guide Pattern (four beats) unless safety requires a direct imperative.  
2. Homepage and Learn surfaces prefer **Worth noticing** / **If you’re curious** over lesson / challenge / assignment framing.  
3. Knowledge cards keep Source Summary distinct from Waypoint Analysis.  
4. Guide Cards may appear inline beside maps and tools — they never replace the field surface.  
5. Progress and grades (if any technical scores exist) describe **signals**, never the person’s worth.  
6. Editorial reviews ask: *Would an exceptional park ranger say this on a trail?*

---

## Checklist

1. Does this establish what we’re seeing before concluding?  
2. Is “why it matters” labeled as interpretation when it is interpretation?  
3. Is the next step an invitation, not an assignment?  
4. Can the user stop here and still feel informed?  
5. Would a first-time visitor feel guided — not schooled?

If any answer is no, revise.

---

## Related documents

- [Waypoint Constitution](WAYPOINT-CONSTITUTION.md)  
- [Waypoint AI Principles](WAYPOINT-AI-PRINCIPLES.md)  
- [Waypoint Voice](WAYPOINT-VOICE.md)  
- [Waypoint AI Guide](WAYPOINT-AI-GUIDE.md)  
- [Waypoint Product Framework](WAYPOINT-PRODUCT-FRAMEWORK.md)  
- [Waypoint Field Design System](WAYPOINT-FIELD-DESIGN-SYSTEM.md)  
- [Editorial Standards](EDITORIAL-STANDARDS.md)  
- [Product Standards](PRODUCT_STANDARDS.md)  
- [Waypoint Studio Constitution](WAYPOINT-STUDIO-CONSTITUTION.md)  
