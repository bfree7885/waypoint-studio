# Hackbot V1 — local foundation

**Status:** Local prototype only. Not a public Waypoint Studio product.  
**Location:** `/hackbot/` at the repository root  
**Open locally:** from the repository root, `python3 -m http.server 8080`, then [http://localhost:8080/hackbot/](http://localhost:8080/hackbot/)

## Purpose

Hackbot is a **personal** AI-assisted cybersecurity **training** and **authorized** security-research workbench.

It is built for one learner on one machine:

1. **Teach me** — practical cybersecurity through hands-on, authorized training.
2. Later: **guide me → work with me → assist my research** on systems the learner owns or is explicitly authorized to test (training labs, CTFs, intentionally vulnerable apps, authorized bug-bounty programs).

It is **not** optimized for public launch, subscriptions, SaaS, marketing, or monetization. It is **not** linked from Waypoint Studio navigation and must not be deployed as a Studio app.

## Direction

| Phase | Intent | This build |
| --- | --- | --- |
| 1 | Teach through authorized, hands-on training | Foundation only (workbench, scope, learning controls, mock mentor) |
| 2 | AI research partner on authorized targets | Not built |
| 3 | Custom tools when real training/research shows they help | Not built |

The Training Engine (lessons, curriculum, competence-based assistance changes) is **intentionally not in V1**.

## Local-first architecture

- Static HTML, CSS, and vanilla JavaScript.
- Browser **IndexedDB** (`hackbot-v1`) on this profile only.
- No accounts, no cloud sync, no API keys, no Node backend, no Docker.
- `MockProvider` is the only AI implementation. The UI talks to `Hackbot.Provider`, which can later host `ApiProvider` or `LocalModelProvider` without rewriting the conversation pane.
- `<meta name="robots" content="noindex,nofollow">`.

## IndexedDB entities

Database: `hackbot-v1` (version `1`)

| Store | Role |
| --- | --- |
| `workspaces` | Name, timestamps, `learningMode`, `assistanceLevel`, `activeSessionId` |
| `targetScopes` | Required authorization record per workspace |
| `sessions` | Investigation/training session |
| `conversationMessages` | Learner and mentor messages |
| `evidenceItems` | Observations and artifacts (empty in V1 UI beyond listing) |
| `actions` | Planned/recorded actions (no execution) |
| `hypotheses` | Current hypotheses |
| `findings` | Draft findings |
| `learningNotes` | Concept notes |
| `sessionActivities` | Chronological reconstruction hooks |
| `meta` | Last active workspace id |

`SessionActivity` is written when a workspace is created, scope is recorded, and messages are added so later work can reconstruct observe → hypothesize → act → record → learn. Relationships are intentionally shallow.

## Workspace and Target Scope

A workspace **cannot become active** without a complete Target Scope:

- workspace name
- target name
- target type
- authorization type
- allowed target(s)

Optional: testing boundaries, notes.

The create form states, once: *Hackbot is intended for systems you own or have explicit authorization to test.*

Target types: Local Training Lab, CTF, Intentionally Vulnerable Application, Authorized Bug Bounty, Other Explicitly Authorized Environment.

Authorization types: Self-owned/local, Training platform authorization, CTF authorization, Bug bounty program authorization, Written explicit authorization, Other explicit authorization.

The store rejects incomplete scope. `activateWorkspace` / `loadWorkbench` refuse workspaces that lack a complete scope.

**Demo:** “Load Demo Workspace” creates or reopens **OWASP Training Lab** (intentionally vulnerable application, self-owned/local, allowed `localhost` / local training environment). It is not auto-created on first run.

## Learning Mode

Default: **ON** for every new workspace, persisted on the workspace.

When on, the workbench presents Hackbot as a mentor that prefers explanation, questions, hints, learner reasoning, and concept understanding — not finished answers. Toggling Learning Mode writes through IndexedDB and survives refresh.

No training curriculum is included yet.

## Assistance Level

Stored on the workspace. Default: **5 — Instructor**.

| Level | Label |
| --- | --- |
| 5 | Instructor |
| 4 | Guided |
| 3 | Partner |
| 2 | Analyst |
| 1 | Independent |

The learner may **view** the scale. V1 does **not** auto-decrease the level and does not implement a competence algorithm.

## AI provider abstraction

```js
Hackbot.Provider.chat(context)
Hackbot.Provider.evaluateLearnerResponse(context)
```

V1 registers **MockProvider** only. Responses are deterministic local strings. `evaluateLearnerResponse` is available for a future Training Engine; it is not a lesson UI.

No external AI calls. No API keys. No local LLM install.

## Safety / scope model

Hackbot is designed around **explicit authorization**. Allowed environments are training labs, CTFs, intentionally vulnerable applications, and explicitly authorized bug-bounty targets.

V1 does **not**:

- execute terminal commands
- scan networks
- exploit targets
- run autonomous attacks
- steal credentials, persist, evade, or destroy
- scan the internet indiscriminately
- integrate with bug-bounty platforms
- call external AI services
- deploy publicly
- integrate with public Waypoint Studio

The bottom **Terminal / Output** panel is a labeled placeholder: execution is not enabled.

## Workbench layout

- Left: Hackbot, workspaces, New Workspace, demo, Training/Notes/Findings placeholders
- Center: workspace title, authorization status, Learning Mode, Assistance Level, mentor conversation
- Right: Target Scope, hypotheses, evidence, actions, learning notes
- Bottom: terminal placeholder

Loop shown in the empty mentor state: **Observe → Understand → Hypothesize → Test → Record → Learn**.
