# Waypoint Studio — AI Agents

**Mission:** Observe. Understand. Create. Share.

This folder defines focused AI roles for building **Waypoint Studio** products inside Cursor. Copy an agent file into context (`@.ai-agents/product-lead.md`) or paste its example prompt to stay on mission.

**Waypoint Scenes** is the current runnable app: Living Scene, Parallax, Collections, Field Guide, and Export — plain HTML/CSS/JS, no build step. All agents serve the wider Waypoint Studio ecosystem defined in [`WAYPOINT-STUDIO-CONSTITUTION.md`](../WAYPOINT-STUDIO-CONSTITUTION.md) and [`design-system/ECOSYSTEM-BLUEPRINT.md`](../design-system/ECOSYSTEM-BLUEPRINT.md).

---

## Supreme authority — read first

Before making suggestions or writing code, **every agent** must read and obey:

**[`WAYPOINT-STUDIO-CONSTITUTION.md`](../WAYPOINT-STUDIO-CONSTITUTION.md)**

### Reject

Ideas that make Waypoint Studio feel like:

- social media
- a startup dashboard
- enterprise software
- technology for technology's sake

### Every recommendation must support

- learning
- outdoor exploration
- observation
- education
- field guide style
- photography
- diagrams or visuals where useful
- field notes
- videos, news, and articles where appropriate
- optional citizen science
- the mission: **Observe. Understand. Create. Share.**

### Feature test (from the Constitution)

Before proposing any feature, ask: Does this help someone observe, understand, create, share, spend more time outdoors, learn something meaningful, or understand connections in nature? If not, do not build it yet.

### Product shape

Every Waypoint Studio product must include, in some form: **Home · Learn · Gallery · Field Notes · News · Videos · Tools**. The tool is important; it is not the whole product.

If the Constitution conflicts with a design, AI suggestion, or product plan — **the Constitution wins**.

---

## Agents

| Agent | File | One-line purpose |
|-------|------|------------------|
| **Product Lead** | [product-lead.md](./product-lead.md) | Scope, priorities, MVP vs. Coming Soon — Constitution gatekeeper |
| **Frontend Designer** | [frontend-designer.md](./frontend-designer.md) | Field-guide aesthetic, photography-first UI, warm cabin tone |
| **Frontend Engineer** | [frontend-engineer.md](./frontend-engineer.md) | HTML/CSS/JS implementation — seven rooms, not dashboard widgets |
| **Motion Engineer** | [motion-engineer.md](./motion-engineer.md) | Calm natural motion — atmosphere, not gimmicks |
| **Education Editor** | [education-editor.md](./education-editor.md) | Learn content, WEF lessons, outdoor field exercises |
| **QA Tester** | [qa-tester.md](./qa-tester.md) | Manual test plans; verify mission and Constitution compliance |
| **Release Manager** | [release-manager.md](./release-manager.md) | Commits, release notes, launch checklist |

---

## When to use each agent

| Situation | Agent |
|-----------|--------|
| “Should we build this?” / scope creep / Constitution check | **Product Lead** |
| Layout, typography, field-guide polish, seven-room IA | **Frontend Designer** |
| New section wiring, gallery, upload, bug fix in JS | **Frontend Engineer** |
| Fog/rain/camera drift, parallax easing, new preset | **Motion Engineer** |
| Learn lessons, field notes copy, articles, seasonal content | **Education Editor** |
| Pre-launch testing, regression, tone audit | **QA Tester** |
| Commit messages, README, release notes | **Release Manager** |

Use **one primary agent** per task. Pull in a second only when needed (e.g. Designer + Engineer for a UI feature).

---

## Example prompts

### Product Lead
```
@.ai-agents/product-lead.md — Does [feature] pass the Constitution feature test? 
Should it be MVP or deferred? Smallest shippable version that leads people outdoors.
```

### Frontend Designer
```
@.ai-agents/frontend-designer.md — Propose a Home section hero for Waypoint Scenes 
that feels like a state park visitor center, not a SaaS dashboard. Constitution-compliant.
```

### Frontend Engineer
```
@.ai-agents/frontend-engineer.md — Wire photos from assets/Images into photography-data.js. 
Keep field-note metadata and Create Living Scene workflow. Obey Constitution.
```

### Motion Engineer
```
@.ai-agents/motion-engineer.md — Tune parallax to feel like leaning at a cabin window. 
Calm, natural, not gaming UI. Constitution-compliant.
```

### Education Editor
```
@.ai-agents/education-editor.md — Write a WEF lesson that ends with a field exercise outdoors. 
Peterson Field Guide tone. Obey Constitution.
```

### QA Tester
```
@.ai-agents/qa-tester.md — MVP pass for all tabs plus Constitution tone check: 
does anything feel like social media or a startup dashboard?
```

### Release Manager
```
@.ai-agents/release-manager.md — Draft v0.1.0 release notes framed around 
Observe. Understand. Create. Share. Do not commit.
```

---

## Simple build workflow

```
Observe     →  Product Lead reviews request / Constitution / MVP fit
Understand  →  Right agent reads Constitution + relevant files
Create      →  Designer (if UI) → Engineer / Motion Engineer implement
Share       →  Education Editor updates Learn; Release Manager updates docs
Verify      →  QA Tester checklist + Constitution compliance before launch
```

### Day-to-day loop

1. **Read** [`WAYPOINT-STUDIO-CONSTITUTION.md`](../WAYPOINT-STUDIO-CONSTITUTION.md)
2. **Run locally**
   ```bash
   python3 -m http.server 8080
   ```
3. **Pick an agent** from the table above.
4. **Attach context** — `@.ai-agents/<role>.md` plus files you're changing.
5. **Keep diffs small** — one room or one module per session when possible.
6. **QA pass** before calling a milestone done.
7. **Release Manager** when you're ready to commit, tag, or publish notes.

### Suggested milestone order (MVP)

1. Living Scene + Effects Studio stable  
2. Interactive Parallax calm defaults  
3. Gallery (Collections) + field notes metadata  
4. Learn / Field Guide content (WEF)  
5. Export snapshot + QA full pass  
6. Release v0.1.0  

---

## Project map (Waypoint Scenes — quick reference)

| Area | Main files |
|------|------------|
| Design system | `design-system/` (WDS, WEF) |
| Living Scene | `js/app.js`, `js/effects.js`, `js/engine/` |
| Parallax | `js/parallax.js`, `js/parallax-presets.js` |
| Gallery | `js/photography.js`, `js/photography-data.js`, `assets/Images/` |
| Learn | `js/learn-content.js`, `js/learn.js`, `#tab-learn` |
| Tools / Export | `js/export.js`, `#tab-export` |
| Constitution | `WAYPOINT-STUDIO-CONSTITUTION.md` |
| Experience blueprint | `design-system/ECOSYSTEM-BLUEPRINT.md` |

---

*Observe the landscape. Understand the light. Create with restraint. Share the work.*
