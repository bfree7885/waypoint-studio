# Waypoint Scenes — AI Agents

**Mission:** Observe. Understand. Create. Share.

This folder defines focused AI roles for building Waypoint Scenes faster inside Cursor. Copy an agent file into context (`@.ai-agents/product-lead.md`) or paste its example prompt to stay on mission.

Waypoint Scenes is a calm, premium, in-browser app: **Living Scene** motion, **Interactive Parallax**, **Photography** portfolio, **Learn**, and **Export** — plain HTML/CSS/JS, no build step.

---

## Agents

| Agent | File | One-line purpose |
|-------|------|------------------|
| **Product Lead** | [product-lead.md](./product-lead.md) | Scope, priorities, MVP vs. Coming Soon |
| **Frontend Designer** | [frontend-designer.md](./frontend-designer.md) | Calm premium UI, darkroom portfolio, tokens |
| **Frontend Engineer** | [frontend-engineer.md](./frontend-engineer.md) | HTML/CSS/JS implementation and wiring |
| **Motion Engineer** | [motion-engineer.md](./motion-engineer.md) | Effects engine, parallax, presets, performance |
| **Education Editor** | [education-editor.md](./education-editor.md) | Learn tab 101/102, tone, help copy |
| **QA Tester** | [qa-tester.md](./qa-tester.md) | Manual test plans before launch |
| **Release Manager** | [release-manager.md](./release-manager.md) | Commits, release notes, launch checklist |

---

## When to use each agent

| Situation | Agent |
|-----------|--------|
| “Should we build this?” / scope creep / user stories | **Product Lead** |
| Layout, colors, typography, modal/gallery polish | **Frontend Designer** |
| New tab, upload flow, photography wiring, bug fix in JS | **Frontend Engineer** |
| Fog/rain/camera drift, parallax easing, new preset | **Motion Engineer** |
| Learn tab lessons, 101/102 copy, tooltips | **Education Editor** |
| Pre-launch testing, regression checklist | **QA Tester** |
| Commit messages, README, v0.1.0 release notes | **Release Manager** |

Use **one primary agent** per task. Pull in a second only when needed (e.g. Designer + Engineer for a UI feature).

---

## Example prompts

### Product Lead
```
@.ai-agents/product-lead.md — Should video export be MVP or stay in Coming Soon? 
Give the smallest shippable alternative for launch.
```

### Frontend Designer
```
@.ai-agents/frontend-designer.md — Improve the Learn tab layout to match the darkroom Photography 
aesthetic. Propose structure + CSS, no new dependencies.
```

### Frontend Engineer
```
@.ai-agents/frontend-engineer.md — Load photos from assets/Images into photography-data.js 
and keep Create Living Scene / Parallax working.
```

### Motion Engineer
```
@.ai-agents/motion-engineer.md — Tune parallax defaults to feel calmer on mobile tilt. 
Small diff in parallax.js and parallax-presets.js only.
```

### Education Editor
```
@.ai-agents/education-editor.md — Write 101 lesson HTML for the Learn tab: 
"Upload and apply your first Scene Preset." Naturalist tone, ~250 words.
```

### QA Tester
```
@.ai-agents/qa-tester.md — Full MVP pass: list test steps for all 5 tabs and the 
Photography → Living Scene workflow.
```

### Release Manager
```
@.ai-agents/release-manager.md — Draft v0.1.0 release notes and suggest commit grouping 
for my current changes. Do not commit.
```

---

## Simple build workflow

```
Observe     →  Product Lead reviews request / MVP fit
Understand  →  Right agent reads relevant files (index.html, app.js, engine/, etc.)
Create      →  Designer (if UI) → Engineer / Motion Engineer implement
Share       →  Education Editor updates Learn copy; Release Manager updates README & notes
Verify      →  QA Tester checklist before merge or launch
```

### Day-to-day loop

1. **Run locally**
   ```bash
   python3 -m http.server 8080
   ```
2. **Pick an agent** from the table above.
3. **Attach context** — `@.ai-agents/<role>.md` plus files you’re changing.
4. **Keep diffs small** — one tab or one module per session when possible.
5. **QA pass** before calling a milestone done.
6. **Release Manager** when you’re ready to commit, tag, or publish notes.

### Suggested milestone order (MVP)

1. Living Scene + Effects Studio stable  
2. Interactive Parallax calm defaults  
3. Photography portfolio + workflow buttons  
4. Learn 101 content  
5. Export snapshot + QA full pass  
6. Release v0.1.0  

---

## Project map (quick reference)

| Tab | Main files |
|-----|------------|
| Living Scene | `js/app.js`, `js/effects.js`, `js/engine/` |
| Interactive Parallax | `js/parallax.js`, `js/parallax-presets.js` |
| Photography | `js/photography.js`, `js/photography-data.js`, `images/portfolio/` |
| Learn | `index.html` `#tab-learn` |
| Export | `js/export.js`, `#tab-export` |

---

*Observe the landscape. Understand the light. Create with restraint. Share the work.*
