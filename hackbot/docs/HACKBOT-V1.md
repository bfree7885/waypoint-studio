# Hackbot V1 — local foundation

**Status:** Local prototype only. Not a public Waypoint Studio product.  
**Location:** `/hackbot/` at the repository root  
**Open locally:** from the repository root, `python3 -m http.server 8080`, then [http://localhost:8080/hackbot/](http://localhost:8080/hackbot/)

MockProvider concept matching (no browser): `node hackbot/scripts/training-eval-smoke.cjs`

## V1 recovery baseline (Phase A)

| Item | Value |
| --- | --- |
| Historical Lesson 3 tip | `d03af73028ec25187b90b5afd2ba7107f54b3266` (`origin/cursor/hackbot-lesson-3-faf9`) |
| Recovery strategy | Fresh branch from current `origin/main` + transplant of `hackbot/` only (not the old stacked PR chain) |
| Development branch | `hackbot/v1-recovery` |
| Historical pointer | `hackbot/v1-historical-lesson3` → `d03af730` |
| Lessons implemented | **1–8** (playable) |
| Lessons not implemented | **9–10** (catalog titles only; labeled `future`) |
| Trail Supply | Synthetic local storefront + service worker under `hackbot/training/web-foundations/lesson-2/` |
| Protocol matching fix | `MockProvider` keeps `http`/`https` tokens when normalizing `https://…` answers |
| Next phase | Phase B6 — Lesson 9: APIs and JSON |

Do **not** claim Lessons 9–10 exist. Do **not** merge historical PRs #83/#85/#86/#87 blindly; this branch supersedes that stack for ongoing V1 work.

### Visual identity

Hackbot keeps its own workbench identity (near-black panels, green accent `#3ecf8e`, compact tooling). Do not restyle it to Studio V2 cyan.

### Safety boundaries (retained)

- Synthetic / local / explicitly scoped training targets only
- Required Target Scope before an active workspace
- No arbitrary public scanning
- No automatic terminal execution
- No autonomous exploitation, credential attacks, or destructive actions
- Workbench remains local/private (`noindex,nofollow`)
- Not a public remote security-testing service

## Purpose

Hackbot is a **personal** AI-assisted cybersecurity **training** and **authorized** security-research workbench.

It is built for one learner on one machine:

1. **Teach me** — practical cybersecurity through hands-on, authorized training.
2. Later: **guide me → work with me → assist my research** on systems the learner owns or is explicitly authorized to test (training labs, CTFs, intentionally vulnerable apps, authorized bug-bounty programs).

It is **not** optimized for public launch, subscriptions, SaaS, marketing, or monetization. It is **not** linked from Waypoint Studio navigation and must not be deployed as a Studio app.

## Direction

| Phase | Intent | This build |
| --- | --- | --- |
| 1 | Teach through authorized, hands-on training | Foundation + Training Engine (Module 1; Lessons 1–8 usable) |
| 2 | AI research partner on authorized targets | Not built |
| 3 | Custom tools when real training/research shows they help | Not built |

Lesson 1 is the first training experience. Lesson 2 is page inspection. Lesson 3 watches local HTTP in the Network panel. Lesson 4 teaches reading request and response headers. Lesson 5 teaches status-code families and redirects (`Location`). Lesson 6 traces user input into query parameters, request bodies, and path values. Lesson 7 introduces cookies/sessions as continuity across separate HTTP exchanges. Lesson 8 consolidates DevTools into a question→tool→evidence workflow. Lessons 9–10 are labeled **future**. Assistance Level is not auto-changed.

## Local-first architecture

- Static HTML, CSS, and vanilla JavaScript.
- Browser **IndexedDB** (`hackbot-v1`) on this profile only.
- No accounts, no cloud sync, no API keys, no Node backend, no Docker.
- `MockProvider` is the only AI implementation. The UI talks to `Hackbot.Provider`, which can later host `ApiProvider` or `LocalModelProvider` without rewriting the conversation pane.
- `<meta name="robots" content="noindex,nofollow">`.

## IndexedDB entities

Database: `hackbot-v1` (version `2`). Name stays `hackbot-v1`; the version number is the schema generation.

Upgrade `1 → 2` is additive: existing object stores are left in place. Workspaces, scopes, Learning Mode, and Assistance Level are not wiped.

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
| `learningNotes` | Concept notes (lesson reflections are stored here) |
| `sessionActivities` | Chronological reconstruction hooks |
| `lessonProgress` | Per-workspace lesson step, hints, attempts, completion (v2) |
| `exerciseAttempts` | Submitted answers and MockProvider verdicts (v2) |
| `meta` | Last active workspace id |

`LessonProgress.id` is `workspaceId::lessonId`. `currentStep` is a **numeric step index**. `completedSteps` holds step ids (e.g. `a-url`).

`SessionActivity` is written when a workspace is created, scope is recorded, messages are added, a lesson starts, and an exercise is attempted.

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

## Assistance Level

Stored on the workspace. Default: **5 — Instructor**.

| Level | Label |
| --- | --- |
| 5 | Instructor |
| 4 | Guided |
| 3 | Partner |
| 2 | Analyst |
| 1 | Independent |

The learner may **view** the scale. This build does **not** auto-decrease the level and does not implement a competence algorithm. Lessons run at the workspace's current Assistance Level.

| Level | Behavior (summary) |
| --- | --- |
| **5 Instructor** | High scaffolding: plain-language explanations, terminology before tests, concrete examples, explicit DevTools directions (where to click / what to notice), demonstration before independent application, reminders of prior concepts. Failure ladder: guiding question → stronger field hint → clear teach-through with permission to continue. **Teach me** / “I don’t know” triggers teaching (not a cryptic hint). |
| **4 Guided** | Substantial support, less explicit demonstration than Instructor. |
| **3 Partner** | Assumes fundamentals; collaborates. |
| **2 Analyst** | Mostly questions and evidence checks; occasional hints. |
| **1 Independent** | Minimal intervention. |

The user chooses the level. No automatic level changes in this phase.

## Teaching model (Instructor Mode)

At Assistance Level **5**, Hackbot follows:

**TEACH → DEMONSTRATE → GUIDED TRY → INDEPENDENT TRY → REASON → REFLECT**

The learner should not be required to infer a concept Hackbot has not yet taught or demonstrated. Reasoning remains important — it comes **after** enough information exists to reason. Prefer short explanations plus learner action over textbook walls of text.

### Teach Me / I don’t know

On graded steps (exercise / reflection), Training shows **Give me a hint** and, at Level 5, **Teach me**. Typing phrases such as “I don’t know”, “teach me”, “help”, or “stuck” also enters the Teach Me path.

Teach Me:

1. Explains the concept in plain language (`exercise.teach`, else the strongest hint)
2. Points where to look
3. Demonstrates enough to unblock
4. Does **not** automatically complete the entire lesson; the learner continues in their own words

Attempt 3 on Teach Me (or after three failed graded attempts) may allow continue without shame — same recovery philosophy as the hint ladder.

### Training entry

Workbench shows a primary **Start Training** / **Continue Training** control so beginners are not forced to understand hypotheses, evidence, findings, or terminal before beginning the curriculum. Workbench remains available and grows more useful as investigation skills develop.

## Training Engine

Sidebar **Training** opens Module 1 — Web Investigation Foundations.

| Lesson | Status |
| --- | --- |
| 1. How a Web Request Works | Available |
| 2. Inspecting a Web Page | Available |
| 3. HTTP Requests and Responses | Available |
| 4. Headers | Available |
| 5. Status Codes and Redirects | Available |
| 6. Parameters and User Input | Available |
| 7. Cookies and Sessions | Available |
| 8. Browser Developer Tools | Available |
| 9–10 | Future (visible, not playable) |

Instructor teaching loop: **Teach → Demonstrate → Guided try → Independent try → Reason → Reflect**. Lesson 2 also uses **Look → Identify → Ask why → Form a model → Verify** and teaches HTML/DOM basics before Elements inspection. Lesson 3 uses **Observe before modify**. Lesson 6 emphasizes **Observe → Compare → Reason** and **change one thing at a time**. Lesson 7 adds state continuity (cookies/sessions) with before/after comparison. Lesson 8 consolidates DevTools into **question → choose tool → evidence → interpret within limits**.

**Next phase after field retest:** UNDECIDED until a learner tries revised Instructor Mode. Do **not** auto-start Lessons 9–10.

Lessons 2–8 share a local synthetic storefront: [Trail Supply](../training/web-foundations/lesson-2/) (`hackbot/training/web-foundations/lesson-2/`). Open it in another tab. Search, login, product clicks, redirect, parameter, and session labs issue **same-origin** fetches handled by a small service worker (`sw.js`) so the Network panel can show:

- GET `/search?q=boots` → **200** JSON (query parameter `q`)
- GET `/search?q=boots&sort=price` → **200** JSON (multi-parameter demo; response echoes `params`)
- Phrase search such as `trail camera` → `q=trail%20camera` (URL encoding via the client)
- POST `/login` (synthetic body) → **401** JSON
- GET `/products/42` → **200** (identifier in the path)
- GET `/products/999` (or other missing id) → **404**
- GET `/go/camera` → **302** with `Location` → `/products/42` → **200**
- GET `/session/status` → **200** JSON (`session: "none"` or `"recognized"`)
- GET `/session/start` → **200** JSON with `setCookieLine` + response header `X-Training-Set-Cookie: trail_session=demo-trail-7; …` (synthetic; not auth)
- GET `/session/clear` → **200** JSON + clear training Set-Cookie mirror

Client script `js/app.js` also emits a benign `console.info` training log for Lesson 8 Console observation. `document.title` is `Trail Supply`.

**Lesson 7 cookie/session limitations (documented honestly):**

1. Service-worker responses cannot reliably expose real `Set-Cookie` (forbidden response header). Trail Supply shows the same string as `X-Training-Set-Cookie` and JSON `setCookieLine`.
2. Service workers cannot read the browser `Cookie` header on `FetchEvent.request`. After the page mirrors `trail_session` via `document.cookie`, status requests also send `X-Trail-Training-Cookie: trail_session=demo-trail-7` so the lab can recognize state.
3. Learners still inspect **Application → Cookies** for the real browser cookie jar entry.
4. `HttpOnly` / `Secure` are taught conceptually (HTTP training origin; `document.cookie` cannot set HttpOnly).

Do **not** treat Lesson 7 training-mirror headers as native `Set-Cookie` / `Cookie`. Lesson 8 teaches Application for real cookie-jar evidence and Network for traffic, including those mirrors when relevant.

This is not real authentication and stores no credentials. Hackbot IndexedDB learner progress (`hackbot-v1`) is separate from Trail Supply’s demo cookie.

Response headers from the training handler include `Content-Type: application/json`, `Content-Length`, and `Cache-Control: no-store`. Demos are local-only and deterministic. No general-purpose backend. No exploitation, session hijacking, or cookie-theft training.

Right rail on the Training view is **Learning Progress** (module, lesson, step, concepts, hints, attempts, Assistance Level). No XP, streaks, coins, or leaderboards.

Progress, attempts, hints, and reflections persist in IndexedDB and survive refresh. Each lesson’s progress is stored separately (`workspaceId::lessonId`). Lesson 5 → `workspaceId::status-redirects`. Lesson 6 → `workspaceId::parameters`. Lesson 7 → `workspaceId::cookies`. Lesson 8 → `workspaceId::devtools`. Schema version stays **2**.

### MockProvider evaluation

`evaluateLearnerResponse` classifies answers as **CORRECT**, **PARTIALLY CORRECT**, or **NEEDS ANOTHER LOOK** using case/punctuation-insensitive concept matching defined on each exercise. Optional `mode: "teach"` (or help-phrase answers) returns teaching feedback with `taught: true` and does not auto-complete the lesson on early attempts. Attempt 1 asks a guiding question (Level 5 prefixes Instructor guidance); attempt 2 gives a stronger hint; attempt 3 explains clearly (`exercise.teach`) and lets the learner continue. Reflections are stored as `LearningNote`s and are not graded harshly.

## AI provider abstraction

```js
Hackbot.Provider.chat(context)
Hackbot.Provider.evaluateLearnerResponse(context)
```

This build registers **MockProvider** only. Responses are deterministic local strings. Lessons 1–8 call `evaluateLearnerResponse`.

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

- Left: Hackbot, workspaces, New Workspace, demo, Training, Notes/Findings placeholders
- Center: workbench conversation, or Training lesson runner
- Right: workbench rails (scope, hypotheses, evidence, actions, notes) or Training Learning Progress
- Bottom: terminal placeholder

Loop shown in the empty mentor state: **Observe → Understand → Hypothesize → Test → Record → Learn**.
