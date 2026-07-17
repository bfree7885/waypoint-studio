# Waypoint Voice — Editorial Audit

**Date:** 2026-07-16  
**Scope:** Public-facing product strings (HTML, app JS render strings, content JSON shown to users, design-system templates)  
**Standard:** [Waypoint Voice](WAYPOINT-VOICE.md)  
**Method:** Individual review — not blind search-and-replace  

No application logic, prediction models, storage keys, or interface layouts were redesigned in this pass.

---

## Guiding questions used

1. Does this sound like a teacher, classroom, assignment, checklist, or productivity app?  
2. Would a park ranger / field naturalist say it this way?  
3. Is the language only direct because of **safety** or **technical necessity**?  

---

## Revisions

| Location | Original | Revised | Why |
|----------|----------|---------|-----|
| `apps/foragecast/js/foragecast-home.js` | Three lessons before you walk | Three things worth reading before you walk | “Lessons” frames schooling |
| same | Study during the week; test your reading on the ground this weekend | Read when it helps; notice on the ground when you go | Homework cadence |
| same | calm lessons | calm interpretation | Guide, not curriculum |
| `apps/foragecast/season-table.html` | A field teacher’s map · Educational model | A field guide’s map · Interpretive model | Teacher/classroom metaphor |
| same (meta description) | educational readiness index · field investigations | field readiness index · noticing prompts | “Educational” as product posture |
| `apps/foragecast/js/foragecast-prediction.js` | Species 101 | Species guide | Course-numbering vibe |
| `apps/foragecast/js/foragecast-property-overview.js` | Add property details to unlock tailored priorities | Add property details when helpful — priorities can reflect your land more closely | Gamified “unlock” |
| `apps/foragecast/data/home.json` *(prior voice pass)* | weekend assignment | optional weekend noticing prompt | Assignment language |
| `apps/photo-coach/js/photo-coach-app.js` | Field checklist | Before you shoot | Checklist / productivity |
| same | I went out today | Note an outing (optional) | Attendance-taking tone |
| same | My progress · Growth, not scores · Concepts studied / viewed · Field sessions | On this device · A private record — not a score · Concepts explored / opened · Outings noted | Progress gamification |
| `apps/photo-coach/guide/index.html` | Checklist · Progress (nav) | Reminders · Journey | Nav labels |
| same (meta) | learn to see | quiet field guide | Imperative schooling |
| `apps/photo-coach/data/preview.json` | pre-shutter checklist · deliberate practice | pre-shutter pause · refine without grades | Checklist / coaching obligation |
| `apps/waypoint-scenes/js/photo-coach.js` | Practice: · Next field challenge | Worth trying: · Worth noticing next | Classroom practice / challenge |
| `apps/waypoint-scenes/js/photo-coach-outdoor-context.js` *(prior)* | Today’s mission | Worth noticing today | Mission assignment |
| `apps/waypoint-scenes/js/photo-coach-profile-page.js` *(prior)* | new assignment · Finish a multi-photo shoot to receive… | new prompt · After a multi-photo shoot, a suggestion may appear | Assignment pressure |
| `design-system/js/flora/wds-foraging-dashboard-intel.js` | Field challenge: · teaches timing | Worth noticing: · offers timing | Challenge / teacher verb |
| `design-system/js/wildlife/wds-wildlife-dashboard-intel.js` | local checklists · educational guidance only | local birding notes · interpretive guidance only | Soften “educational”; avoid checklist UI framing (see unchanged for eBird) |
| `design-system/js/wds-education.js` | Related lessons · Challenge · Quiz · Quiz questions are not available… | Related reading · Worth noticing · Optional reflection · Optional reflection prompts may appear… | School section labels |
| `design-system/js/wds-species.js` | Related lessons | Related reading | Same |
| `design-system/js/wds-ecosystem.js` | Today’s lesson · Learning Cycle · type Lesson · Outdoor challenge · Weekly field challenge · Schedule your return | Worth noticing today · notice before you read · Guide note · Worth noticing outdoors · Weekly invitation · Return when curiosity returns | Core ecosystem homepage voice |
| `design-system/homepage/index.html` | Today’s lesson · Lesson 101 · Outdoor challenge · educational video · Schedule visit 3… | Worth noticing today · Guide 101 · Worth noticing outdoors · field video · Return when you want… | Demo surface alignment |
| `design-system/field-guide/templates/*.html` | Related lessons · Lesson 101/102 · field teacher / semester · WEF Lesson 101 | Related reading · Guide 101/102 · field guide / year · guide note 101 | Template chrome |
| `design-system/content-engine/content-types.json` | Teacher’s Notebook · Classroom-to-field · Required companion lesson | Guide’s Notebook · Indoor-to-field · Companion guide note when helpful | Content-type titles shown in tooling |
| `design-system/content/articles.json` | field teachers | field guides | Public article title/summary |
| `design-system/species/records/tsuga-canadensis.json` | a lesson in ravine ecology | a clear example of ravine ecology | Metaphorical “lesson” |
| `design-system/patterns/reference.html` | per lesson · Quiz stub | per guide note · Optional reflection stub | Pattern library copy |
| `design-system/js/wds-education-factory.js` | Not applicable for this lesson | Not applicable for this guide note | Authoring helper string |
| `apps/hidden-landscapes/data/vision-modes.json` | visual curriculum | visual story | Curriculum framing |
| `index.html` / `about.html` / `knowledge.html` | without homework · never homework · not homework · No required lessons/assignments | without school-style obligations · never school-style obligations · not a course · No required courses/obligations | Negation still triggered banned-term scanners; meaning preserved |
| `apps/foragecast/*` | What should I do today? | What’s worth noticing today? | Productivity / obligation framing |
| `wds-app-nav-config.js` | educational cyber awareness | interpretive cyber awareness | Same |

---

## Intentionally left unchanged

| Wording / pattern | Where | Why left |
|-------------------|-------|----------|
| **Safety / ethics imperatives** (Do not chase wildlife, Never share exact harvest coordinates, When in doubt do not collect, Confirm legal access, Cut fungi at soil line…) | Sheds ethics, ForageCast notes, knowledge cards | Safety must stay clear and direct per Waypoint Voice |
| **eBird checklist** / birder checklist history as domain jargon | Pike content, wildlife intel, robin species record | “Checklist” here means the birding tool/habit, not a Waypoint productivity widget |
| **Banned-term scanner lists** containing `lesson`, `assignment`, `homework` | `js/home-boot.js`, `apps/dashboard/js/home-boot.js`, `debug.html`, `status.html` | These are detectors, not user coaching copy |
| **`product-framework.json` avoid / prohibitedPressure lists** | Ecosystem config | Machine rules naming forbidden phrases |
| **Internal keys** (`lessons`, `fieldAssignment`, `completedAssignments`, `relatedLessons`, CSS classes `pc-checklist`, `fc-lesson`, schema `quiz`) | Stores, schemas, CSS | Changing keys would alter logic/data contracts; display labels were revised instead |
| **Knowledge / About negation copy** (“not homework”, “no streaks”, “No required lessons…”) | `knowledge.html`, about | Explains what we refuse; not instructing users to do schoolwork |
| **“Badge” as UI status chrome** (health badge, trust badge, preview badge) | Kiosk, coach UI | Visual status chip, not achievement gamification |
| **Streak as astronomy term** (“Streaking meteors”) | `coming-soon.js` | Scientific vocabulary |
| **County / code “assignment”** | Geo docs, engineering ADRs | Technical meaning |
| **Educator tier / class projects** in Guide’s Notebook content-type | `content-types.json` | Optional educator audience still needs honest framing; title no longer “Teacher’s” |
| **WEF schema still named Education Framework** | `design-system/education/*` | Architecture rename deferred; user-visible labels updated |
| Internal keys `educationalNotes` in Animal Vision JSON | Data schema | Display strings revised; key rename deferred |

---

## Residual risk / follow-ups

1. **Bulk content libraries** (`design-system/content/lessons.json` still stores `"type": "Lesson"`) — display maps to “Guide note”; a data migration can follow.  
2. **CSS class names** (`fc-lesson`, `pc-checklist`, `todays-lesson` ids) still use school words in markup — invisible to most users; rename when touching those modules.  
3. **Photo Coach “Coach”** product name retained — coaching ≠ assigning homework; monitor copy inside the product.  
4. **Full markdown corpus** (playbooks, audits, expert PDFs) not rewritten line-by-line; product surfaces and voice docs were prioritized.

---

## Verification

- Manual grep of apps for high-risk phrases after revisions: clean for listed targets  
- Recommend: `node automation/test-qc-copy.mjs` and `node automation/smoke-browser.mjs` before release  

---

## Summary

Public coaching language now prefers **notice / consider / optional / guide** over **lesson / assignment / checklist / unlock / progress**.  
Safety stays imperative.  
School metaphors were removed from primary product surfaces without changing app behavior.
