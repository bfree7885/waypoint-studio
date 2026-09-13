# TerrainBound Puzzle Curriculum Architecture

**Phase 7.9A — DESIGN ONLY.**

This document is the whole-course puzzle architecture for TerrainBound. It does not implement gameplay, Summit, Dark Sky Basin, DNS, Pages, or `apps/terrainbound/`. It does not alter the Phase 7.8B working tree beyond adding this file.

**Status:** design blueprint. Do not treat listed puzzles, hazards, cosmetics, or vehicles as built.

**Curriculum authority used here (in-project only):**

- Topic titles, teaching order, and region identities: `data/world/regions.json`, `data/world/bible.json`, `docs/GAME-BIBLE.md`
- Topic 1 / 2 / 10 competency slots already elicited in mastery profiles
- Topic 1 placeholder science-practice slots: `data/curriculum/placeholders.json`
- Phase 4 reviewed-alignment *concept* list (orbital modeling, Earth–Moon–Sun cycles, stellar life/fusion, surface-process models, water properties/effects, interior/convection, plate-motion evidence, Earth-history evidence, atmospheric explanations, climate energy-flow and forecasting, hazard/resource/sustainability decisions)
- Phase 7.8B instructional foundations: persistent guidance, world evidence, predict-then-check, real measurement, anti-brute-force mastery, cross-region transfer, genuine revision

**Standards codes:** exact NYS ESS / NYSSLS codes have **not** been supplied (`placeholderAlignment.code` remains `null`). This document does **not** invent codes. Concepts are named in plain language and tagged to the project's twelve curriculum topics.

---

## 1. Core gameplay architecture

TerrainBound is an **open-world Earth science puzzle adventure**.

The world is the mystery. There is no enemy. Science unlocks regions. Exploration unlocks fun. Those are separate economies.

### 1.1 Three loops (do not collapse)

**SCIENCE (required for clearance)**

Encounter a scientific problem in the world → investigate → observe / measure / compare → gather evidence → predict / model / test → reason → solve.

A puzzle is a scientific problem that requires the player to *do* Earth science in the world. Walking to a labeled object, reading an explanation, answering trivia, or collecting three obvious clues and picking the labeled conclusion are **not** complete puzzles.

**ADVENTURE (never required for clearance)**

Explore → discover → collect → customize → unlock fun things.

Hidden places, wildlife, overlooks, cosmetics, and easter eggs do not produce academic mastery.

**PROGRESSION (Field Service)**

Complete the region's required science puzzles → return to Wren at the station → After Action Report (defend reasoning) → field clearance → next region opens.

Correct gameplay actions alone do not guarantee clearance if the player cannot explain the reasoning.

### 1.2 What a puzzle is

The **mystery may be difficult**. The **assignment must not be mysterious**.

Early puzzles may provide substantial guidance (what / next / where / already). Later puzzles increasingly require the student to determine:

- where to investigate
- which evidence matters
- which tool to use
- what measurements are necessary
- which previous science applies — **without the game announcing the previous topic**

Interface mystery is not scientific mystery. Persistent guidance stays. Summit, when it exists, teaches science and never tells the player how to beat a puzzle.

### 1.3 Roles (Wren vs Summit)

Summit’s Cedar Hollow tutor is specified in `SUMMIT-TUTOR-ARCHITECTURE.md` (Phase 7.9C). This course map still treats High Country / later regions as unwired.

| Role | Function |
| --- | --- |
| **Wren** | Field / game mentor. Present, then at the station, then on radio. Runs the After Action Report. Never a quiz vending machine. |
| **Summit** | Always-available Sasquatch Earth Science tutor. Teaches the science. Never the solution path. Not implemented in this phase. |
| **Field Service** | Inhabited scientific network. Stations, radio, clearance, instruments. Revealed environmentally. |

### 1.4 Player-facing vs internal

| Player sees | Player never sees |
| --- | --- |
| Investigation, field note, observation, measurement, evidence, Field Record, field plan, Field clearance earned, More evidence needed | Lesson, unit, quiz, test, assignment, grade, score, percentage, standards codes, topic numbers as a report card |

Internal mastery may be numerical. Player-facing result of an After Action Report is only:

- **FIELD CLEARANCE EARNED**
- **MORE EVIDENCE NEEDED**

### 1.5 Course / region order (locked)

Teaching order is not topic-number order. Do not reorder.

| # | Region | Curriculum topic (internal) | Title |
| --- | --- | --- | --- |
| 1 | Cedar Hollow | 1 | Scientific Thinking & Earth Systems |
| 2 | High Country | 2 | Maps, GIS & Geospatial Thinking |
| 3 | Sunfall Desert | 10 | Solar System |
| 4 | Dark Sky Basin | 11 | Stars & the Universe |
| 5 | Painted Badlands | 3 | Earth's Materials |
| 6 | Glacier Country | 4 | Surface Processes |
| 7 | Firepeak | 5 | Earth's Interior & Plate Tectonics |
| 8 | Deep Time Canyon | 6 | Earth's History |
| 9 | Island Coast | 9 | Water & Ocean Systems |
| 10 | Stormlands | 7 | Weather & Atmospheric Systems |
| 11 | Icewater Bay | 8 | Climate & Global Change |
| 12 | High Sierra | 12 | Natural Resources, Hazards & Sustainability |

High Sierra is the **synthesis region**. It introduces few new isolated facts. It requires independent reuse of earlier tools.

### 1.6 Three content layers (retained from the Game Bible)

| Layer | Purpose | Gate |
| --- | --- | --- |
| **A. Required core puzzles** | Genuine demonstration of required understanding | Required for After Action Report eligibility |
| **B. Embedded practice** | Short natural reuse during exploration | Not a second course |
| **C. Optional depth / fun** | Extra learning and adventure | Must not block the next route |

Do not use C to compensate for a weak A.

### 1.7 Play rhythm

Target, not a timer: 2–5 minutes of movement and world observation, then 1–3 minutes of focused scientific interaction, then return to walking. Long uninterrupted tablet sequences that could have been world actions are a design defect.

Approximate science time per region: 2–4 hours of required puzzles plus After Action Report. Optional adventure is unbounded.

---

## 2. Canonical puzzle specification

Every required puzzle in this document uses the following fields. Implementation later must preserve them as data, not as a one-off script.

| Field | Meaning |
| --- | --- |
| **ID** | Stable `REGION-##` identifier |
| **Name** | Player-facing title (place/phenomenon language, not “Lesson 3”) |
| **Layer** | A (required), B (embedded), or C (optional science depth) |
| **Initiating problem** | The phenomenon the world presents |
| **Player must determine** | The scientific question, stated clearly |
| **World locations** | Places that must be walkable |
| **Evidence / data / measurements** | What exists in the world. Distinguishes useful from distractor. |
| **Tools / instruments** | Earned by use, never by opening a menu |
| **Scientific concepts** | Plain-language concepts from the in-project topic. No invented codes. |
| **Reasoning required** | What the student must actually do intellectually |
| **Prediction / model / test** | Required when the concept demands it |
| **Misconceptions addressed** | Plausible wrong models, used in world feedback and After Action Report |
| **World feedback** | How the land, instruments, or later observations argue — not a grade |
| **Prior-region skills reused** | Unannounced unless early-region scaffolding |
| **Mastery evidence** | Internal evidence kinds. Multiple records may be required. |
| **Play time** | Approximate focused time |
| **Remediation / replay** | What changes so answers cannot be memorized |
| **Mechanic** | Primary gameplay type (see §6) |

### 2.1 Anti-patterns (explicitly disallowed as a complete puzzle)

- Walk somewhere and click an object
- Read an explanation panel
- Answer trivia
- Collect three obvious clues and choose the labeled conclusion
- Open a tool and receive mastery
- Software computes the scientific move the student was supposed to make
- First-try success counted as “revision”
- Reteaching a prior topic by lecture when transfer is the point

### 2.2 Allowed incomplete *beats* inside a puzzle

A puzzle may contain a click, a short reading of an instrument, or a choice — as a beat, not as the whole investigation.

### 2.3 Guidance contract

| Stage of the course | Guidance |
| --- | --- |
| Cedar Hollow | Substantial. Persistent what / next / where / already. Wren nearby. |
| High Country | Wren at the station. Incomplete map. Land argues. |
| Sunfall | Radio more than body. Sky is the lab. |
| Dark Sky Basin onward | Problems, not procedures. Guidance names the phenomenon, not the method. |
| High Sierra | The game does not say what to measure, where to look, which tool, or which Earth system. |

### 2.4 Mastery evidence contract (internal)

A competency is demonstrated only when **use + reasoning** are both evidenced.

- World action generates a *use* record (measurement, fair test, walked coordinate, identified mineral, predicted hydrograph, etc.).
- After Action Report generates a *reasoning* record (defend the decision against a plausible misconception).
- Either alone is insufficient for regional clearance.

Numerical internals (design):

- Puzzle use score 0–1 from evidence quality (fair trials, relevant sites, successful prediction check, rejected unfair test, etc.)
- Reasoning score 0–1 from After Action Report items tagged to that concept
- Concept mastery = weighted combination; default 0.6 use + 0.4 reasoning
- Regional clearance requires every *travel-required* concept above threshold, with no critical misconception endorsed

Players never see these numbers.

---

## 3. Complete 12-region puzzle inventory

Count is driven by curriculum need, not a quota. Typical band is 8–12 required (Layer A) puzzles per region. Layer B is embedded in later puzzles. Layer C is optional and listed under open-world fun or optional science notes.

---

### 3.1 Cedar Hollow — Topic 1 Scientific Thinking & Earth Systems

**Station:** Cedar Hollow Station. Wren physically present.

**Core phenomenon:** What can you honestly say about this hollow from what you actually saw, measured, and tested?

**Conversion intent:** Rebuild the current three-region *habits* as distinct puzzles. Do **not** treat glacial reconstruction as Topic 1 mastery. Ice as an agent is introduced as *one possible older clock* and fully assessed in Glacier Country.

**Required puzzles: 9.**

#### CH-01 What You Can See

- **Layer:** A
- **Initiating problem:** A boulder on the north trail does not match the hill. The east face of Granite Knob is stripped and lined.
- **Player must determine:** Which sentences are observations and which are interpretations — then keep the observations as evidence.
- **Locations:** North-trail boulder; east-face bedrock; station porch as a failed shortcut (porch guesses are rejected).
- **Evidence:** Color/grain mismatch; parallel grooves; what cannot be seen (the carrying event).
- **Tools:** Eyes, Field Tablet note.
- **Concepts:** Observation vs interpretation; evidence vs story.
- **Reasoning:** Sort seen vs guessed on two sites. Later explanations may only cite sorted observations.
- **Predict/test:** Not required here.
- **Misconceptions:** Naming is knowing; the first story is the observation.
- **World feedback:** Interpreted names stay locked until later puzzles. Using a guessed sentence as “evidence” is refused.
- **Prior skills:** None (introduces the habit).
- **Mastery evidence:** `obs-int-sort` ×2; later puzzles require citing the seen sentence.
- **Play time:** 12–18 min
- **Remediation:** New object pair (creek cobble vs hill stone; wet seep vs “spring from the mountain’s heart”). Same sort, different sentences.
- **Mechanic:** Field investigation; competing sentences (not a trivia quiz).

#### CH-02 Where Did Last Night's Water Go?

- **Layer:** A
- **Initiating problem:** After rain, water is not equally present everywhere.
- **Player must determine:** The downhill path last night's water actually took, from land they stood on.
- **Locations:** Westface Slope / rills; Pine Creek; Mirror Pond; Willow Reach; High Look (optional confirm).
- **Evidence:** Rills, current direction, pond as pause, wrack line downstream; distractor: station crate note.
- **Tools:** Walking, inspect, field notes.
- **Concepts:** Patterns in a small watershed; water moves downhill; collection.
- **Reasoning:** Sequence high → slope → creek → pause → still moving. Cannot complete from a single overlook sentence.
- **Predict/test:** From High Look, predict where standing water should linger; check the marsh/pond.
- **Misconceptions:** Water disappears; the pond is the end; rain falls and stays where it landed.
- **World feedback:** Tracing an uphill or skip-the-creek path fails against notes from places they did not invent.
- **Prior skills:** CH-01 (only seen notes count).
- **Mastery evidence:** `mission-observation` at required sites; `water-path` constructed from visited nodes.
- **Play time:** 15–25 min
- **Remediation:** Shift which reach holds the wrack line; add a second small drainage that does *not* connect.
- **Mechanic:** Field investigation; spatial sequencing.

#### CH-03 What Makes Water Move Faster?

- **Layer:** A
- **Initiating problem:** The creek is not the same speed everywhere. A runoff table sits by the station: same channel, same distance.
- **Player must determine:** When one thing changes, what happens to travel time — and when two things change, the result is untrustworthy.
- **Locations:** Runoff table beside the station; optional glance at Westface vs meadow to motivate the question.
- **Evidence:** Repeated trial times on gentle / moderate / steep; extra-water (unfair) trial that still *runs*.
- **Tools:** Runoff table; Field data graph.
- **Concepts:** Variables; fair tests; repeated trials; slope–speed relationship.
- **Reasoning:** Predict which slope is faster *before* the first comparison; change one variable; reject the extra-water run as the cause-claim.
- **Predict/test:** Required. Predict-then-time. Unfair trial must be classified, not blocked.
- **Misconceptions:** More water “proves” slope; one run is enough; the table is a toy disconnected from the hill.
- **World feedback:** Times jitter. One odd run prompts a repeat. Graph is *their* numbers.
- **Prior skills:** CH-02 (water moves); CH-01 (what you measured vs what you guessed).
- **Mastery evidence:** `fair-variable-test`; prediction logged; unfair trial recorded and rejected.
- **Play time:** 15–22 min
- **Remediation:** Different base times; different unfair change (channel roughness instead of extra water).
- **Mechanic:** Controlled experiment; quantitative reasoning; graphs.

#### CH-04 The Numbers Mean a Pattern

- **Layer:** A
- **Initiating problem:** The table produced a dataset. Wren will not interpret it for them.
- **Player must determine:** What the graph/table actually shows, including scatter.
- **Locations:** Station table; Field Tablet data page.
- **Evidence:** Player-generated times; constants note (channel, distance, cup).
- **Tools:** Field data (table, graph, interpretation).
- **Concepts:** Data; pattern vs outlier; “overall” vs one point.
- **Reasoning:** Choose an interpretation that matches *their* fair runs, not a memorized slogan.
- **Predict/test:** If they claim “no difference,” the graph contradicts them.
- **Misconceptions:** Graphs decorate; any increase is the variable they like; identical repeats are required for a pattern.
- **World feedback:** Interpretation that ignores the unfair run or the scatter is pushed back.
- **Prior skills:** CH-03.
- **Mastery evidence:** `dataset-interpret` on player data.
- **Play time:** 8–12 min
- **Remediation:** New jitter; inverted slope labels if they only memorized “steep = left column.”
- **Mechanic:** Graphs/data.

#### CH-05 After the Rain

- **Layer:** A
- **Initiating problem:** Part of Pine Creek is muddier and quicker this morning. The stretch by the station is not.
- **Player must determine:** Why *this* reach changed, using weather + slope + tributary — not “it rained.”
- **Locations:** Rain gauge; creek below station; Fox Run confluence; Westface scar; marsh (distractor); Willow Reach; High Look.
- **Evidence:** Gauge tally; clarity measurements; scar above Fox Run; marsh is tea-colored most days.
- **Tools:** Walking; clarity/staff observations; optional runoff-table memory.
- **Concepts:** Earth systems (atmosphere–hydrosphere–geosphere); relevant vs irrelevant evidence; competing explanations.
- **Reasoning:** Predict where a pulse from a steep loose slope should appear; walk to test; reject whole-creek and pond-overflow stories.
- **Predict/test:** Pulse-origin prediction *before* the confluence visit is ideal; if they visit first, they must still predict the downstream fate.
- **Misconceptions:** Rain muddies everything equally; the pond caused it; the marsh’s usual color is this morning’s pulse.
- **World feedback:** Station reach stays relatively clear. Marsh follow-up conflicts with a marsh-caused story.
- **Prior skills:** CH-02, CH-03 (slope sheds faster), CH-01.
- **Mastery evidence:** `systems-link`; pulse predict; competing-explanation rejection; conflict+repair for revision if they endorsed marsh/pond first.
- **Play time:** 20–30 min
- **Remediation:** Pulse sourced from a different tributary or a road cut; clarity numbers change; marsh may be clearer than the pulse.
- **Mechanic:** Field investigation; competing explanations; prediction; systems.

#### CH-06 Two Clocks

- **Layer:** A
- **Initiating problem:** Last night is one clock. The boulder, the scraped face, and the bowl-shaped hollow do not look like one rain.
- **Player must determine:** Which evidence speaks to *today’s creek* and which speaks to an *older landscape* — without being told “the answer is a glacier.”
- **Locations:** North-trail boulder vs knob rock; grooved bedrock; High Look bowl; cut bank vs point bar; pond basin.
- **Evidence:** Rock-type mismatch; parallel grooves; rounded vs angular stones; sharp vs wide valley; bar vs cut bank (modern).
- **Tools:** Compare-rock measurement; Field Tablet evidence cards that stay observational until supported.
- **Concepts:** Timescales; constructing explanations from evidence; landscapes change; (light) transported sediment as *evidence*, not vocabulary drill.
- **Reasoning:** Attach each note to a clock. A modern-creek-only story cannot carry the mismatched boulder and grooves. An ancient-only story cannot carry last night’s bar.
- **Predict/test:** If ice (or another long-travel agent) moved the boulder, the boulder should not match local bedrock — check. If the creek alone made the bowl, the valley should look like a sharp cut — check from High Look.
- **Misconceptions:** One process explains every landform; “glacier” as a magic word; the creek is as old as the mountain in the same way.
- **World feedback:** Hypothesis that cites only rain is refused by the boulder/grooves. Hypothesis that ignores the living creek is refused by the bar/cut bank.
- **Prior skills:** CH-01, CH-02, CH-05.
- **Mastery evidence:** `supported-explanation` using sorted observations; timescale tagging.
- **Play time:** 20–30 min
- **Remediation:** Swap which mismatched lithology appears; add a wind-thrown tree as a false “ancient” clue.
- **Mechanic:** Field investigation; chronology; competing explanations.

**Curriculum note:** Full glacial-process mastery is **not** awarded here. Glacier Country reuses this hollow’s evidence as transfer.

#### CH-07 The Hollow Is a System

- **Layer:** A
- **Initiating problem:** Wren asks whether last night, the slope, the creek, the marsh, and the living bank are separate stories or one event with parts.
- **Player must determine:** How atmosphere, hydrosphere, geosphere, and (light) biosphere participated — and which part did *not*.
- **Locations:** Rain gauge; Westface; Fox Run; marsh/seep; willow roots on the cut bank.
- **Evidence:** Rain tally; scar; tributary pulse; marsh storage; roots hanging in air (living things affected, not the cause).
- **Tools:** Notes; optional simple systems diagram the player fills by placing *their* evidence, not icons from a poster.
- **Concepts:** Earth systems; interactions; biosphere as affected party here, not the driver.
- **Reasoning:** Map components to roles. Reject “the trees caused the flood.”
- **Predict/test:** If the marsh is a store, it should still be wet after the pulse passes — check the seep/marsh.
- **Misconceptions:** Systems means “everything is connected so any answer works”; living things caused the mud.
- **World feedback:** A systems claim that omits weather or slope fails against CH-05 sites.
- **Prior skills:** CH-05, CH-02.
- **Mastery evidence:** `systems-link` deepened; component-role map.
- **Play time:** 12–18 min
- **Remediation:** Biosphere clue changes (fresh browse vs hanging roots); rain tally lower, slope still fails.
- **Mechanic:** Systems model; field investigation.

#### CH-08 When the Story Breaks

- **Layer:** A
- **Initiating problem:** A follow-up observation conflicts with a tidy first explanation (marsh color, or a second pulse, or a clear station reach they ignored).
- **Player must determine:** Whether to patch, replace, or narrow the explanation.
- **Locations:** Depends on conflict seed from CH-05/CH-06 (marsh, crate note, second drainage).
- **Evidence:** The conflicting observation; the original supporting set.
- **Tools:** Field Tablet evidence list; ability to withdraw a claim.
- **Concepts:** Revision; models are accountable to new evidence.
- **Reasoning:** First-try success is success, not revision. Revision requires a rejected or incomplete model that is later repaired.
- **Predict/test:** After revision, predict one new checkable consequence (e.g. clarity below the join vs at the marsh).
- **Misconceptions:** Changing your mind is failure; add every new fact without dropping the false cause.
- **World feedback:** Unrepaired conflict keeps communication locked.
- **Prior skills:** CH-05 or CH-06 as the broken story.
- **Mastery evidence:** `revised-explanation` only on conflict→repair. Not awarded for a perfect first try.
- **Play time:** 10–16 min
- **Remediation:** Different conflict object; cannot reuse the same marsh sentence.
- **Mechanic:** Genuine revision; competing explanations.

#### CH-09 Make the Case

- **Layer:** A (feeds the After Action Report; not a school presentation)
- **Initiating problem:** Wren: “You’ve got enough to make a case. Walk it to me like I wasn’t there.”
- **Player must determine:** A defensible account of *one* hollow problem (water path, pulse, or two clocks) using evidence they actually hold.
- **Locations:** Station (Wren); optional return to one site if a hole appears.
- **Evidence:** Only records already in the tablet.
- **Tools:** Field Record; Wren dialogue.
- **Concepts:** Communication; supported explanation.
- **Reasoning:** Select claims that their evidence can carry. Overclaim is pushed back.
- **Predict/test:** Optional: Wren asks “if we went back to X, what should we still see?”
- **Misconceptions:** A complete walkthrough of every discovery is a case; jargon is a case.
- **World feedback:** This is the seed of the After Action Report (§8). Weak case → More evidence needed on specific puzzles.
- **Prior skills:** CH-01–CH-08 as relevant.
- **Mastery evidence:** `present-findings` only after AAR reasoning items pass (§8). Completing CH-09 dialogue without AAR is not clearance.
- **Play time:** 8–12 min plus AAR
- **Remediation:** Wren asks about a different decision (fair test vs pulse vs clocks).
- **Mechanic:** Field debrief (not a test).

**Cedar Hollow Layer B (embedded, not separate quests):** citing observations in later notes; noticing rills while walking; rejecting porch guesses.

**Cedar Hollow optional science (Layer C, not required):** full naming of “erratic”; counting all 12 current discoveries; extra seep/groundwater curiosity.

---

### 3.2 High Country — Topic 2 Maps, GIS & Geospatial Thinking

**Station:** Ridgeline Station. Wren at the station, speaks less.

**Core phenomenon:** How do you know where you are, and how do you show that to someone who is not standing beside you?

**Required puzzles: 10.** Convert the Phase 7.8B geospatial season into distinct puzzles. Do not award tools for opening Map.

#### HC-01 The Brass Cap

- **Layer:** A
- **Problem:** Survey markers exist on the land. The sketch does not locate you.
- **Determine:** A location is a *pair of values you record at the object*, not a HUD vibe.
- **Locations:** Trailhead brass cap (HC-1); tarn-dock marker (HC-2).
- **Evidence:** Live coordinate reading that sharpens near the cap; mismatched round numbers from far away.
- **Tools:** Coordinates (earned by recording, not by opening).
- **Concepts:** Location; coordinate pair.
- **Reasoning:** Record two real markers. Far-away “close enough” readings are not records.
- **Predict/test:** After recording HC-1, predict which way numbers change toward the tarn; walk to check.
- **Misconceptions:** The blue dot is the science; one number is a location.
- **World feedback:** Cache later will not open on a porch reading.
- **Prior skills:** CH observation (what the cap actually says).
- **Mastery evidence:** `record-marker` ×2.
- **Play time:** 12–18 min
- **Remediation:** Different marker IDs/values.
- **Mechanic:** Field investigation; quantitative.

#### HC-02 Walk to the Cache

- **Layer:** A
- **Problem:** A sampling cache is marked only as an unlabeled coordinate pair.
- **Determine:** Navigate to a place the sketch does not name.
- **Locations:** Unlabeled cache off-trail; must not be a labeled landmark.
- **Evidence:** Live reading vs target pair; terrain in the way.
- **Tools:** Coordinates.
- **Concepts:** Location as navigation, not display.
- **Reasoning:** Plan an approach; arrive within tolerance.
- **Predict/test:** Predict which drainage you should meet; check on arrival.
- **Misconceptions:** Following a quest marker; coordinates are only for recording where you already are.
- **World feedback:** Wrong saddle has a different pair. No nameplate on success — the reading matches.
- **Prior skills:** HC-01; CH walking-the-land.
- **Mastery evidence:** `navigate-coord`.
- **Play time:** 12–20 min
- **Remediation:** New pair; different obstacle ridge.
- **Mechanic:** Route planning; spatial reasoning.

#### HC-03 How Far Is the Ridge?

- **Layer:** A
- **Problem:** Two trails reach the ridge. The sketch has a 200 m scale bar and no computed mileage.
- **Determine:** Trail length from the bar, then check against walking.
- **Locations:** West switchback; east meadow trail; sketch table at station.
- **Evidence:** Printed scale; player estimate; walk time/pace check (honest approximation, labeled as estimate).
- **Tools:** Scale/distance (earned by estimating, not by `measureRoute()` giving the answer).
- **Concepts:** Map scale; distance comparison.
- **Reasoning:** Convert bar to ground; compare two trails.
- **Predict/test:** Estimate first; software length is a *check after*, never the student’s first number.
- **Misconceptions:** Shorter on paper is always shorter to walk; scale is decoration.
- **World feedback:** Walk contradicts a wild estimate.
- **Prior skills:** CH measurement honesty.
- **Mastery evidence:** `measure-route` from estimate+check ×2 trails.
- **Play time:** 15–22 min
- **Remediation:** Different bar; trails swap which is longer.
- **Mechanic:** Mapping; quantitative; prediction.

#### HC-04 Cliff vs Meadow

- **Layer:** A
- **Problem:** The west face and east meadow feel different underfoot. The topo layer is still incomplete.
- **Determine:** How contour spacing should look *from the land*, before adjectives are leaked.
- **Locations:** West cliff; east meadow; optional tarn bench.
- **Evidence:** Body-felt slope; later contour overlay must match the choice.
- **Tools:** Topo layer earned after a correct land-to-lines comparison.
- **Concepts:** Contours; relief.
- **Reasoning:** Stand both places. Choose which should show closer lines. No “tight = steep” tooltip beforehand.
- **Predict/test:** Required land→map prediction.
- **Misconceptions:** Brown lines are trails; high numbers mean steep.
- **World feedback:** Overlay appears as a check; mismatch is visible.
- **Prior skills:** CH slope (speed vs steepness) without announcing Topic 1.
- **Mastery evidence:** `terrain-compare` ×2.
- **Play time:** 12–18 min
- **Remediation:** A third bench with intermediate spacing.
- **Mechanic:** Spatial reasoning; mapping.

#### HC-05 The 1400 Line

- **Layer:** A
- **Problem:** Stakes in the world; the contour is not drawn for them.
- **Determine:** Which stakes share an elevation and how the line should snake.
- **Locations:** Elevation stakes across a spur and a reentrant.
- **Evidence:** Stake numbers; land shape (V of a drainage vs spur).
- **Tools:** Elevation; contour construction.
- **Concepts:** Contours connect equal elevations; V-upstream rule as *discovered*.
- **Reasoning:** Group 1400s; draw through drainages correctly.
- **Predict/test:** Predict whether the line bends up the gully; walk the gully.
- **Misconceptions:** Contours are straight; they cross; they stop at cliffs as decoration.
- **World feedback:** A line that crosses a stake of another value is refused by the stake.
- **Prior skills:** HC-04.
- **Mastery evidence:** `connect-contour`; `read-elevation` ×3.
- **Play time:** 15–20 min
- **Remediation:** Different index contour; extra decoy stake.
- **Mechanic:** Mapping; spatial.

#### HC-06 The Heavy Case

- **Layer:** A
- **Problem:** A heavy sampling case must go to the ridge survey. Storm may arrive later.
- **Determine:** Which trail is defensible for *this* load, using elevation + distance, not vibes.
- **Locations:** Both trails; ridge junction.
- **Evidence:** Estimated distances (HC-03); elevation gain; contour spacing (HC-04/05).
- **Tools:** Gradient reasoning from elevation and distance.
- **Concepts:** Gradient; tradeoffs; decision.
- **Reasoning:** Gentler longer trail vs shorter steep trail. Defend with numbers.
- **Predict/test:** Predict which trail has higher gradient; confirm with gain/distance.
- **Misconceptions:** Shortest is always best; steepness is only a feeling.
- **World feedback:** Choosing west-for-heavy without gradient evidence fails. Speed-only answer is valid *for a different question* Wren can pose on remediation.
- **Prior skills:** CH-03 fair comparison; HC-03–05.
- **Mastery evidence:** `compare-routes`.
- **Play time:** 12–18 min
- **Remediation:** Light emergency radio instead of heavy case (correct trail may flip).
- **Mechanic:** Route planning; quantitative; decision.

#### HC-07 The Rise You Cannot See

- **Layer:** A
- **Problem:** The radio site sits beyond a rise invisible from the junction.
- **Determine:** Translate plan view into a side-view profile *before* the software draws it.
- **Locations:** Junction; transect stakes; radio site.
- **Evidence:** Contours along a line; player-sketched highs/lows.
- **Tools:** Profile tools earned after prediction vs generated section.
- **Concepts:** Profile; plan vs section.
- **Reasoning:** Guess the shape (one hill? two? a drop?) then cut the profile.
- **Predict/test:** Required.
- **Misconceptions:** Maps already *are* side views; profiles are art.
- **World feedback:** Walking the transect confirms the predicted rise.
- **Prior skills:** HC-05.
- **Mastery evidence:** `profile-compare`.
- **Play time:** 12–18 min
- **Remediation:** Different transect; a hidden dip.
- **Mechanic:** Mapping; spatial; prediction.

#### HC-08 A Pad That Needs More Than One Drawing

- **Layer:** A
- **Problem:** Temporary observation pad: near a trail, not in wet ground, not on the cliff, open enough to see sky.
- **Determine:** Combine layers to answer a question no single drawing answers.
- **Locations:** Candidate pads in the world; station map board.
- **Evidence:** Trail layer; wet-ground layer; cliff/slope; canopy/openness.
- **Tools:** GIS layers earned by combining, not toggling for fun.
- **Concepts:** GIS; overlay; representation (different layers reveal different properties).
- **Reasoning:** Query-like: intersection of constraints. Visit the chosen pad.
- **Predict/test:** Predict which candidate fails wet-ground; walk to the tarn-edge decoy and get boots wet.
- **Misconceptions:** The “good site” layer is a labeled answer; more layers are always better without a question.
- **World feedback:** Ground truth can veto a GIS-only pick.
- **Prior skills:** HC-02 location; HC-04 terrain.
- **Mastery evidence:** `combine-layers`; `inspect-layer-type`.
- **Play time:** 15–22 min
- **Remediation:** Constraints change (must be hidden from wind instead of open sky).
- **Mechanic:** Mapping; GIS; competing sites.

#### HC-09 The Sketch Lied

- **Layer:** A
- **Problem:** The west switchback still looks whole on the sketch.
- **Determine:** What newer imagery shows that the sketch does not — then check the ground.
- **Locations:** Washout on west switchback; sketch vs image at station; the scar itself.
- **Evidence:** Imagery break in the trail; on-ground scar; sketch omission.
- **Tools:** Remote-sensing layer.
- **Concepts:** Remote sensing; maps are representations; ground truth.
- **Reasoning:** Imagery is evidence, not the land. Walk the scar.
- **Predict/test:** If the image shows a break, the trail should be interrupted — walk it.
- **Misconceptions:** Newest image is always truth; sketch is always truth; satellites replace walking.
- **World feedback:** Standing on the scar is the check. Cedar Hollow runoff applies: the steep loose face shed (unannounced Topic 1 transfer).
- **Prior skills:** CH-03/CH-05 slope and pulse; HC-06 route.
- **Mastery evidence:** `compare-imagery`; washout slope predict (Layer B transfer).
- **Play time:** 12–18 min
- **Remediation:** East trail imagery artifact (shadow) that is *not* a break.
- **Mechanic:** Remote sensing; field check; transfer.

#### HC-10 The Radio Site Plan

- **Layer:** A
- **Problem:** The radio site still needs a route a person can defend.
- **Determine:** A field plan from coordinates, distance, elevation, imagery, and walkability.
- **Locations:** Chosen route; radio site; Wren.
- **Evidence:** All HC-01–09 records.
- **Tools:** Full geospatial set.
- **Concepts:** Decision; spatial patterns.
- **Reasoning:** Not the shortest line. The one you can walk and explain.
- **Predict/test:** Walk the plan; if blocked, revise.
- **Misconceptions:** A highlighted GIS “best path” is the science.
- **World feedback:** Feeds High Country AAR.
- **Prior skills:** Entire High Country + Cedar Hollow slope.
- **Mastery evidence:** `plan-route` + AAR reasoning.
- **Play time:** 15–25 min
- **Remediation:** Storm-soon variant: time vs exposure tradeoff.
- **Mechanic:** Route planning; decision; synthesis inside the region.

---

### 3.3 Sunfall Desert — Topic 10 Solar System

**Station:** Sunfall Observatory. Wren mostly radio.

**Core phenomenon:** Why does the Sun’s path change, and what can a model predict that a single sunset cannot?

**Required puzzles: 10.**

#### SF-01 The Moving Shadow

- **Layer:** A
- **Problem:** Notebooks disagree about what the Sun did yesterday.
- **Determine:** Apparent daily solar motion from recorded shadows, then Earth’s rotation as explanation.
- **Locations:** Solar marker / gnomon.
- **Evidence:** Morning, noon, afternoon shadow length and direction (player-logged).
- **Tools:** Solar observer; celestial clock (time as instrument, not waiting game).
- **Concepts:** Rotation; apparent vs actual motion.
- **Reasoning:** Log three times. Reject “Sun races around Earth” and “wind moved the stick” if logs contradict them.
- **Predict/test:** Predict afternoon direction from morning+noon; check.
- **Misconceptions:** Geocentric daily Sun; shadows are random.
- **World feedback:** The ground log is the argument.
- **Prior skills:** CH observation vs interpretation; HC coordinates unused yet.
- **Mastery evidence:** `shadow-log`; `rotation-explain`.
- **Play time:** 12–18 min
- **Remediation:** Different latitude-like gnomon length set.
- **Mechanic:** Field investigation; prediction.

#### SF-02 Noon on Three Dates

- **Layer:** A
- **Problem:** One notebook says the noon Sun sits higher in January.
- **Determine:** Seasonal change from tilt / Sun angle / day length — not Earth–Sun distance.
- **Locations:** Same post; winter / equinox / summer noon.
- **Evidence:** Noon height, day length, *and* a distance column that does not match “closer = summer.”
- **Tools:** Celestial clock (dates); solar observer.
- **Concepts:** Seasons; tilt; insolation angle.
- **Reasoning:** Same post, three noons. Distance-as-cause must be rejected from the table, not from a scold.
- **Predict/test:** Predict which date has the longest noon shadow; check.
- **Misconceptions:** Summer because closer; clouds make winter.
- **World feedback:** Winter noon can be closer in the distance column while the Sun is lower.
- **Prior skills:** SF-01.
- **Mastery evidence:** `season-obs`; `reject-distance`.
- **Play time:** 15–22 min
- **Remediation:** Southern-hemisphere field note from a sister station as a transfer check (optional Layer B).
- **Mechanic:** Data; prediction; misconception confrontation.

#### SF-03 Sandskip's Missing Period

- **Layer:** A
- **Problem:** Sandskip-1 is a tracked rock. Distance from the Sun is known; period is not.
- **Determine:** Period from a simplified period–distance relation, then advance the model to check.
- **Locations:** Orbit table / model.
- **Evidence:** Semi-major axis; player-computed P; model return.
- **Tools:** Orbit model.
- **Concepts:** Mathematical orbit; Kepler-style P² ∝ a³ (simplified as already in slice); prediction.
- **Reasoning:** Compute, do not pick 8 from 2/4/8/16. Then check the model.
- **Predict/test:** Required compute → model check.
- **Misconceptions:** Bigger orbit is always slower without the relation; multiple choice is the math.
- **World feedback:** Wrong P makes the model miss the return used later in the observation window.
- **Prior skills:** CH quantitative honesty.
- **Mastery evidence:** `kepler-predict` after model check.
- **Play time:** 12–18 min
- **Remediation:** Different a; different tracked object.
- **Mechanic:** Quantitative; model; prediction.

#### SF-04 Why the Speed Changed

- **Layer:** A
- **Problem:** Sandskip’s plotted path is not a perfect circle; speed marks are uneven.
- **Determine:** Elliptical geometry and faster motion when closer.
- **Locations:** Orbit board; optional crater-floor walk as metaphor only (not the physics).
- **Evidence:** Distances to a focus; spacing of time ticks.
- **Tools:** Orbit model.
- **Concepts:** Orbit shape; distance–speed.
- **Reasoning:** Measure perihelion vs aphelion tick spacing.
- **Predict/test:** Predict where the next tick is tighter; advance.
- **Misconceptions:** Orbits are circles; equal speed always.
- **World feedback:** Model contradicts circle-only claim.
- **Prior skills:** SF-03.
- **Mastery evidence:** `orbit-eccentric`; `orbit-speed`.
- **Play time:** 10–16 min
- **Remediation:** Different eccentricity.
- **Mechanic:** Physical/orbital model; quantitative.

#### SF-05 Why Did the Moon Change Shape?

- **Layer:** A
- **Problem:** The Moon does not need a poster of eight pictures.
- **Determine:** Phase from Earth–Moon–Sun geometry, predicted then logged from the mesa at night.
- **Locations:** Mesa night viewpoint; alignment model.
- **Evidence:** Sky log; model configuration; actual Moon disc.
- **Tools:** Sky log; celestial clock; orbit/alignment model.
- **Concepts:** Moon phases; EMS geometry.
- **Reasoning:** Predict phase from model; go to mesa; log. Geometry must match the sky.
- **Predict/test:** Required.
- **Misconceptions:** Earth’s shadow causes phases; clouds; the Moon generates its own phases.
- **World feedback:** Thin Moon in the later observation window will fail if geometry was faked.
- **Prior skills:** SF-01; HC walk-to-coordinate will be needed in SF-09 (not announced).
- **Mastery evidence:** `moon-geometry`; `moon-log`; `moon-predict`.
- **Play time:** 15–22 min
- **Remediation:** Different starting phase.
- **Mechanic:** Field investigation; model; prediction.

#### SF-06 Not Every Month

- **Layer:** A
- **Problem:** If the Moon goes around every month, why is there not an eclipse every month?
- **Determine:** Orbital tilt / alignment conditions.
- **Locations:** Alignment model on the dome table.
- **Evidence:** Hit-and-miss eclipse trials; tilt on/off.
- **Tools:** Alignment model.
- **Concepts:** Eclipses; three-dimensional geometry.
- **Reasoning:** Predict a new-Moon range that *fails* when tilt is on; check.
- **Predict/test:** Required before a results table.
- **Misconceptions:** Eclipse every new/full moon; eclipses are random weather.
- **World feedback:** Table matches tilt, not folklore.
- **Prior skills:** SF-05.
- **Mastery evidence:** `eclipse-align`; `eclipse-tilt`.
- **Play time:** 12–18 min
- **Remediation:** Different node geometry.
- **Mechanic:** Model; prediction.

#### SF-07 A Fingerprint in the Tide Table

- **Layer:** A
- **Problem:** A coastal station sent tide range. This is not an ocean unit. Does the Moon/Sun leave a fingerprint?
- **Determine:** Correlation of tide range with alignment — without treating the table as a labeled conclusion.
- **Locations:** Coastal desk (data), not a beach (Island Coast later).
- **Evidence:** Tide-range table vs Moon phase / syzygy vs quadrature.
- **Tools:** Sky log + data table.
- **Concepts:** Celestial data; tides as gravitational alignment (intro); correlation.
- **Reasoning:** Predict spring vs neap *before* sorting the table.
- **Predict/test:** Required.
- **Misconceptions:** Wind makes all tides; only the Moon; only the Sun.
- **World feedback:** Mismatched sort fails a later check. Full coastal processes wait for Island Coast.
- **Prior skills:** SF-05/06; CH graph habits.
- **Mastery evidence:** `tide-compare`; tide predict.
- **Play time:** 10–16 min
- **Remediation:** Different station’s table; noise row.
- **Mechanic:** Graphs/data; correlation; prediction.

#### SF-08 What Kind of World Is This?

- **Layer:** A
- **Problem:** Planet log mixes worlds. Drawer sample on the crater floor invites a false meteorite story.
- **Determine:** Classify using properties (density, orbit class, atmosphere notes) — not names from a list.
- **Locations:** Planet log; crater floor; drawer sample.
- **Evidence:** Table of properties; optional density vs a local rock.
- **Tools:** Data; optional rock compare (foreshadow Painted Badlands).
- **Concepts:** Planetary properties; inner vs outer; evidence-based classification.
- **Reasoning:** Group by measured properties. Reject “the crater rock is a planet.”
- **Predict/test:** If inner worlds are denser, which row should match the dense fragment? Check — it may not (distractor).
- **Misconceptions:** All planets are like Earth; craters prove planets fell here.
- **World feedback:** Classification that is only name-matching fails a hidden property.
- **Prior skills:** CH classification-as-evidence.
- **Mastery evidence:** `planet-class`.
- **Play time:** 12–18 min
- **Remediation:** Swap which world is unlabeled.
- **Mechanic:** Material/property identification; data.

#### SF-09 The Observation Window

- **Layer:** A
- **Problem:** The campaign needs a window: place, time, Moon, Sandskip return.
- **Determine:** A defensible observing plan, including a *walked coordinate pair* (High Country skill, unannounced).
- **Locations:** Dark-sky site on the mesa; unlabeled coordinate; night sky.
- **Evidence:** Live coordinates; Moon thinness; Sandskip return from SF-03.
- **Tools:** Coordinates + sky tools.
- **Concepts:** Prediction; planning; transfer of maps.
- **Reasoning:** Walk until the reading matches. Plan night + thin Moon + return. Revise if the sky disagrees.
- **Predict/test:** Required plan; execute; revise on failure.
- **Misconceptions:** Any night works; GPS nameplate; software picks the site.
- **World feedback:** Wrong site is brighter; thick Moon washes the target.
- **Prior skills:** HC-02 navigate-coord (unannounced); SF-03, SF-05.
- **Mastery evidence:** `observe-plan`; `visitChallengeSite`.
- **Play time:** 18–28 min
- **Remediation:** Different pair; different return time.
- **Mechanic:** Route planning; prediction; transfer.

#### SF-10 When the Sky Disagrees

- **Layer:** A
- **Problem:** A planned window fails (wrong phase, wrong site, or model tick).
- **Determine:** Revise the plan from evidence.
- **Locations:** Failed site; station radio.
- **Evidence:** Sky vs plan log.
- **Tools:** Same toolkit.
- **Concepts:** Revision; models accountable to observation.
- **Reasoning:** Same rule as Cedar Hollow: conflict then repair.
- **Predict/test:** New window.
- **Misconceptions:** The plan is the science even if the sky refuses.
- **World feedback:** Feeds Sunfall AAR.
- **Prior skills:** CH-08 revision habit.
- **Mastery evidence:** revised observe-plan.
- **Play time:** 8–14 min
- **Remediation:** Different failure mode.
- **Mechanic:** Revision; prediction.

---

### 3.4 Dark Sky Basin — Topic 11 Stars & the Universe

**Station:** Basin Observatory. Problems, not procedures.

**Core phenomenon:** What can starlight tell you about objects you will never visit?

**Required puzzles: 10.**

#### DS-01 What Starlight Carries

- **Layer:** A
- **Problem:** Two “white” stars look similar in the eyepiece. Their spectrograph traces do not.
- **Determine:** Spectra as composition fingerprints — light as information, not decoration.
- **Locations:** Dome spectrograph; outdoor comparison with a calibration lamp.
- **Evidence:** Absorption/emission lines; lamp reference; two stellar traces.
- **Tools:** Astro-observation (spectra).
- **Concepts:** Light; spectra; composition at a distance.
- **Reasoning:** Match lines to elements using a reference, not a labeled star name.
- **Predict/test:** Predict which lamp line should appear in star A; check.
- **Misconceptions:** Color tells composition completely; we know stars because we visited.
- **World feedback:** Mis-matched element fails a later temperature/composition puzzle.
- **Prior skills:** SF data habits; CH observation vs interpretation (the trace vs “it’s hydrogen because the poster said”).
- **Mastery evidence:** spectrum-match; calibration use.
- **Play time:** 15–22 min
- **Remediation:** Different pair; extra noise line.
- **Mechanic:** Remote sensing (spectroscopy); data.

#### DS-02 Hotter, Cooler

- **Layer:** A
- **Problem:** A reddish star and a bluish star. Folklore says red is hotter (fire).
- **Determine:** Color–temperature relationship from measurements, not folklore.
- **Locations:** Outdoor color comparison; spectrograph peak.
- **Evidence:** Peak wavelength / color index; temperature inferred.
- **Tools:** Spectra + photometry notes.
- **Concepts:** Temperature; Wien-style relationship at conceptual/quant level appropriate to the course.
- **Reasoning:** Rank temperatures from data. Reject “redder = hotter.”
- **Predict/test:** Predict which star’s peak is shorter wavelength; check.
- **Misconceptions:** Fire-color intuition; brightness = temperature.
- **World feedback:** Ranking is used in DS-04.
- **Prior skills:** DS-01.
- **Mastery evidence:** temp-rank from color/peak.
- **Play time:** 10–16 min
- **Remediation:** A bright cool star vs a dim hot star.
- **Mechanic:** Data; misconception.

#### DS-03 Near or Bright?

- **Layer:** A
- **Problem:** Two stars of equal apparent brightness. One has a measurable tiny shift against background; one does not.
- **Determine:** Apparent brightness is not luminosity; distance evidence (parallax-style shift and/or inverse-square reasoning).
- **Locations:** Baseline markers on the basin rim (spatial!); observatory plates from two seasons.
- **Evidence:** Plate shift vs none; apparent magnitude notes.
- **Tools:** Astro tools + HC spatial thinking (unannounced: two observing points).
- **Concepts:** Distance; apparent vs intrinsic brightness.
- **Reasoning:** The shifter is nearer. The other may be intrinsically brighter.
- **Predict/test:** If nearer, parallax should reverse with baseline — check second plate.
- **Misconceptions:** Brighter = closer always; all stars equally far.
- **World feedback:** Wrong distance ranking breaks DS-04 placement.
- **Prior skills:** HC location/baseline; SF inverse-square not required if kept qualitative, but numbers allowed.
- **Mastery evidence:** distance-rank; apparent-vs-absolute distinction.
- **Play time:** 15–22 min
- **Remediation:** Different pair; a variable star distractor.
- **Mechanic:** Spatial; data; indirect evidence.

#### DS-04 Place It on the Diagram

- **Layer:** A
- **Problem:** The dome has an unlabeled luminosity–temperature diagram with regions, not a legend titled “HR.”
- **Determine:** Place three observed stars from DS-01–03 onto the diagram from *their* T and brightness/distance.
- **Locations:** Dome plot; outdoor targets.
- **Evidence:** Player-derived T and luminosity class estimates.
- **Tools:** Diagram as a model, not a worksheet.
- **Concepts:** HR-style diagram; grouping (main sequence vs giant vs dwarf as *regions*, named after placement).
- **Reasoning:** Place points; then read what the region implies.
- **Predict/test:** Predict that a cool luminous star sits up-right (giant region); check against independent size/luminosity clue.
- **Misconceptions:** Memorize the poster; axes swapped; magnitude numbers without meaning.
- **World feedback:** Misplaced giant breaks DS-05.
- **Prior skills:** DS-02, DS-03.
- **Mastery evidence:** diagram-placement ×3.
- **Play time:** 12–18 min
- **Remediation:** Relabeled axes (still T vs L); new stars.
- **Mechanic:** Model; data; spatial (graph space).

#### DS-05 What This Star Becomes

- **Layer:** A
- **Problem:** A massive hot star vs a Sun-like star. The exhibit wants a cartoon lifecycle. The science is mass.
- **Determine:** Likely end-state from mass/position, not from a storybook sequence every star follows.
- **Locations:** Diagram; archival outburst plate (one star only).
- **Evidence:** Mass proxies; one supernova remnant spectrum vs a planetary-nebula-like object.
- **Tools:** Model of stellar life (player-run branches).
- **Concepts:** Stellar evolution; mass dependence; element production foreshadow.
- **Reasoning:** Branch the model. Reject “all stars go supernova” and “all stars become black holes.”
- **Predict/test:** Predict which nearby object matches which end-state; check spectra (DS-01 skill).
- **Misconceptions:** One lifecycle; age = color only.
- **World feedback:** Wrong branch cannot explain the remnant’s lines.
- **Prior skills:** DS-04, DS-01.
- **Mastery evidence:** mass-branch prediction checked.
- **Play time:** 15–22 min
- **Remediation:** Different masses.
- **Mechanic:** Model; competing explanations; prediction.

#### DS-06 Where the Elements Came From

- **Layer:** A
- **Problem:** A metal-poor old star vs a metal-rich younger star. The basin floor is silicate rock.
- **Determine:** Heavy elements require stellar fusion/supernovae; they are not original-simple-universe leftovers.
- **Locations:** Spectrograph; a basin rock (connection, not geology unit).
- **Evidence:** Metal lines present/absent; timeline of star populations.
- **Tools:** Spectra; simple nucleosynthesis model (H→He vs heavier).
- **Concepts:** Fusion; element production; astronomical evidence for history.
- **Reasoning:** You cannot pick up a star. You infer production from spectra + populations.
- **Predict/test:** Predict metal-poor star is older population; check independent kinematic/position clue if provided.
- **Misconceptions:** All elements formed in the Big Bang equally; Earth rocks unrelated to stars.
- **World feedback:** Model that makes gold in the first minutes fails the metal-poor star.
- **Prior skills:** DS-01, DS-05.
- **Mastery evidence:** nucleosynthesis explanation from spectra.
- **Play time:** 12–18 min
- **Remediation:** Different pair; a barium/europium extra line.
- **Mechanic:** Indirect evidence; model; reconstruction of past.

#### DS-07 Everything Receding

- **Layer:** A
- **Problem:** Galaxy spectra from a survey plate: lines shifted.
- **Determine:** Redshift as recession; farther → generally more shifted (Hubble-style pattern), without claiming they must memorize a law name.
- **Locations:** Survey desk; dome.
- **Evidence:** Line positions vs lab rest; distance ranks (brightness/standard candle notes).
- **Tools:** Spectra + distance estimates.
- **Concepts:** Redshift; expanding universe; correlation.
- **Reasoning:** Plot shift vs distance rank. Reject “tired light as the only story” if the puzzle offers a competing model that fails a prediction (e.g. time-dilation of a supernova light curve snippet).
- **Predict/test:** Predict a farther galaxy’s shift; reveal the plate.
- **Misconceptions:** Redshift is “red stars”; Doppler of a car is the whole cosmology without pattern.
- **World feedback:** Scatter exists; trend remains. Honesty about scatter is required.
- **Prior skills:** CH graphs; DS-01.
- **Mastery evidence:** redshift-distance trend; competing-model rejection.
- **Play time:** 15–22 min
- **Remediation:** Different sample; an outlier galaxy.
- **Mechanic:** Correlation; data; competing explanations.

#### DS-08 A History You Cannot Visit

- **Layer:** A
- **Problem:** Three independent lines: expansion (DS-07), light-element abundance note, leftover microwave glow in a receiver.
- **Determine:** A history of a hot, dense early universe from *converging evidence*, not a label “Big Bang” first.
- **Locations:** Radio horn on the basin floor; abundance clipboard; redshift plot.
- **Evidence:** CMB-like isotropic hiss after subtracting dish-pointing; He abundance; expansion.
- **Tools:** Radio receiver; prior plots.
- **Concepts:** Origin evidence; multiple lines; inference.
- **Reasoning:** One line is not enough. Three together beat a “steady and always the same” story for *this* evidence set.
- **Predict/test:** If leftover glow is sky, it should not change when the horn points at the station wall vs zenith in a characteristic way — test (horizon vs zenith; honest residual).
- **Misconceptions:** One famous name replaces evidence; the explosion is in space like a bomb in a room.
- **World feedback:** Wall-pointing is different from sky; student must not fake certainty.
- **Prior skills:** DS-06, DS-07; CH multiple evidence.
- **Mastery evidence:** multi-line origin explanation.
- **Play time:** 15–22 min
- **Remediation:** One line noisy; must say what is weak.
- **Mechanic:** Indirect evidence; reconstruction; competing explanations.

#### DS-09 The Light-Year Delay

- **Layer:** A
- **Problem:** A supernova in a galaxy “happening now” on a poster. The distance says otherwise.
- **Determine:** Lookback time; we see the past.
- **Locations:** Dome; distance from DS-03/07 methods.
- **Evidence:** Distance; c as travel; event date vs arrival.
- **Tools:** Distance + simple time = distance/c conceptual calculator (student sets up).
- **Concepts:** Finite speed of light; lookback; universe as a time machine of light.
- **Reasoning:** Compute/order-of-magnitude. The poster is wrong.
- **Predict/test:** Predict we should *not* see a change in a nearby vs distant event on human timescales the same way.
- **Misconceptions:** Telescopes see the present; huge distance means instant.
- **World feedback:** A nearby variable *does* change night to night; a distant galaxy’s named event does not.
- **Prior skills:** DS-03, SF time as instrument.
- **Mastery evidence:** lookback reasoning with a number.
- **Play time:** 10–16 min
- **Remediation:** Different distances.
- **Mechanic:** Quantitative; chronology.

#### DS-10 The Unlabeled Spectrum

- **Layer:** A (regional integrator)
- **Problem:** A new target: no name. Wren/radio: “What can you honestly say?”
- **Determine:** Temperature, composition clues, distance class, and what you *cannot* say.
- **Locations:** Any instrument the player chooses — the puzzle does not highlight the correct one.
- **Evidence:** Whatever they collect; distractor radio chatter.
- **Tools:** Full Dark Sky kit + judgment.
- **Concepts:** Transfer of DS-01–09; uncertainty.
- **Reasoning:** Choose tools. Overclaim is punished in AAR.
- **Predict/test:** One checkable prediction (e.g. expected color).
- **Misconceptions:** Completeness theater; naming without properties.
- **World feedback:** Feeds Dark Sky AAR.
- **Prior skills:** Entire Topic 11 so far; CH honesty.
- **Mastery evidence:** independent investigation plan + bounded claims.
- **Play time:** 20–30 min
- **Remediation:** New unlabeled target.
- **Mechanic:** Open investigation; competing explanations; uncertainty.

---

### 3.5 Painted Badlands — Topic 3 Earth's Materials

**Station:** Old field camp / mesa station.

**Core phenomenon:** What environment wrote this rock, and how can you tell?

**Required puzzles: 10.**

#### PB-01 What Is This Crystal?

- **Layer:** A
- **Problem:** Two sparkly samples in the wash. One is useful; one is not. Names are hidden.
- **Determine:** Identity from properties (hardness, streak, cleavage vs fracture, luster) — not color first.
- **Locations:** Wash; hardness kit at camp; streak plate.
- **Evidence:** Tests the player runs; a fool’s-color decoy.
- **Tools:** Rock/mineral kit (earned by testing).
- **Concepts:** Mineral properties; identification.
- **Reasoning:** Sequence tests. Color-only ID fails.
- **Predict/test:** Predict streak color before scraping.
- **Misconceptions:** Color IDs minerals; crystals are all quartz; hardness is “strong feeling.”
- **World feedback:** Wrong ID breaks a later “this layer is calcite so it fizzes” check.
- **Prior skills:** CH observation vs interpretation; SF property tables.
- **Mastery evidence:** property-battery ×2 samples.
- **Play time:** 15–22 min
- **Remediation:** Different pair; graphite vs galena-like analog, etc.
- **Mechanic:** Material identification; controlled tests.

#### PB-02 Heavy for Its Size

- **Layer:** A
- **Problem:** Two similar-looking chunks. One heft is wrong.
- **Determine:** Density/specific gravity as a property, measured, not guessed.
- **Locations:** Camp scale; water overflow can; samples.
- **Evidence:** Mass and displaced volume (player-measured).
- **Tools:** Kit + measurement (CH fair-test spirit).
- **Concepts:** Density; quantitative ID.
- **Reasoning:** Compute density; compare to a short reference the player must use, not memorize a textbook.
- **Predict/test:** Predict which sinks faster in the can; then measure properly (feeling is not the number).
- **Misconceptions:** Bigger is heavier; gold is identified by color.
- **World feedback:** Density mismatch with a “gold” claim.
- **Prior skills:** CH measurement; PB-01.
- **Mastery evidence:** density-measure + interpretation.
- **Play time:** 12–18 min
- **Remediation:** New masses/volumes.
- **Mechanic:** Quantitative; identification.

#### PB-03 Born of Fire

- **Layer:** A
- **Problem:** A dark fine rock vs a coarse salt-and-pepper outcrop. Same camp labeled both “volcanic” last year.
- **Determine:** Igneous texture → cooling rate / environment (surface vs slower).
- **Locations:** Dike or plug; lava-like flow lobe; camp mistake tag.
- **Evidence:** Crystal size; vesicular vs massive; contact with surrounding rock.
- **Tools:** Hand lens; kit.
- **Concepts:** Igneous; cooling rate; intrusive vs extrusive as *inferred*.
- **Reasoning:** Fine = faster cool. Coarse = slower. Vesicles = gas at low pressure.
- **Predict/test:** If the coarse body cooled slowly, it should bake or cut the host — look for contact.
- **Misconceptions:** All dark rocks are basalt; all igneous is lava; granite grows in fire on the surface.
- **World feedback:** Contact aureole or chilled margin as check.
- **Prior skills:** PB-01; Firepeak not yet — do not require plate setting.
- **Mastery evidence:** texture-to-cooling explanation.
- **Play time:** 15–22 min
- **Remediation:** A porphyritic middle case.
- **Mechanic:** Field investigation; identification; inference.

#### PB-04 Written in Layers

- **Layer:** A
- **Problem:** Striped mesa. One bed is sandstone-like; one is muddy; one fizzes; one has rounded clasts.
- **Determine:** Sedimentary environment from material evidence (energy, water, chemistry).
- **Locations:** Mesa walk; three beds; ripple vs mud crack vs conglomerate lens.
- **Evidence:** Grain size, rounding, structures, fizz test.
- **Tools:** Kit; hand lens; HCl analog as a field dropper (safe fiction).
- **Concepts:** Sedimentary rocks; depositional environment; energy of transport (foreshadow Glacier Country).
- **Reasoning:** High energy → coarse/rounded; quiet → mud; chemical → fizz.
- **Predict/test:** Predict which bed should show ripples; find them or not.
- **Misconceptions:** Layers = tree rings of lava; all sediments are ocean.
- **World feedback:** A “deep ocean” claim fails the conglomerate lens.
- **Prior skills:** CH sorting of creek stones (unannounced).
- **Mastery evidence:** environment-from-rock ×2 beds.
- **Play time:** 18–25 min
- **Remediation:** Different stack order.
- **Mechanic:** Field investigation; reconstruction of past environments.

#### PB-05 Changed in Place

- **Layer:** A
- **Problem:** The same parent lithology becomes foliated down a canyon where a buried contact is hotter/squeezed.
- **Determine:** Metamorphic change from heat/pressure; parent identifiable.
- **Locations:** Unmetamorphosed parent; foliated equivalent; gradient walk.
- **Evidence:** Foliation orientation; mineral change; no sedimentary structures surviving in the high grade.
- **Tools:** Kit; compass for foliation (HC transfer: orientation is spatial).
- **Concepts:** Metamorphism; parent; directed pressure.
- **Reasoning:** This is not a new sediment dumped on top. It is the same rock transformed.
- **Predict/test:** Predict foliation parallel to the squeezed zone; measure.
- **Misconceptions:** Metamorphic = melted; banding is sedimentary.
- **World feedback:** Melted claim fails because texture is solid-state (no igneous cross-cut here).
- **Prior skills:** PB-03 vs PB-04 contrast; HC orientation.
- **Mastery evidence:** parent-to-metamorphic pairing.
- **Play time:** 15–22 min
- **Remediation:** Different parent.
- **Mechanic:** Field investigation; spatial; identification.

#### PB-06 Same Matter, Different Rock

- **Layer:** A
- **Problem:** Camp poster is a rock-cycle wheel to memorize. The wash has a clast of igneous in sedimentary conglomerate, and a baked sediment.
- **Determine:** Transformations as *evidence in this landscape*, not a circular chant.
- **Locations:** Conglomerate with igneous pebbles; contact; weathered igneous soil-like grus.
- **Evidence:** Pebble in younger bed; baked margin; weathering to sediment source.
- **Tools:** Notes; kit.
- **Concepts:** Rock cycle as process evidence; relative order (foreshadow Deep Time).
- **Reasoning:** Igneous existed before the conglomerate. Heat affected sediment at a contact.
- **Predict/test:** If pebbles came from the plug, pebble lithology should match — check.
- **Misconceptions:** Cycle is a required sequence every rock completes; arrows on a poster are the science.
- **World feedback:** A “sediment always first” claim fails the pebble.
- **Prior skills:** PB-03–05; CH timescales.
- **Mastery evidence:** transformation-evidence chain.
- **Play time:** 12–18 min
- **Remediation:** Reverse which clast appears.
- **Mechanic:** Chronology; reconstruction; model (not a wheel quiz).

#### PB-07 The Mesa's Story

- **Layer:** A
- **Problem:** Interpret the mesa as an environment stack, not a color tour.
- **Determine:** Ordered environmental history from tested beds.
- **Locations:** Full mesa section; camp.
- **Evidence:** PB-04 tests plus lateral pinch-outs.
- **Tools:** Section sketch (HC profile analog).
- **Concepts:** Formation environments; correlation along the mesa.
- **Reasoning:** Write a history. Competing: “paint” vs environments.
- **Predict/test:** A bed that pinches should disappear along strike — walk it.
- **Misconceptions:** Color = mineral always; one environment for the whole mesa.
- **World feedback:** Pinch-out walk.
- **Prior skills:** PB-04, HC profile thinking.
- **Mastery evidence:** stacked-environment explanation.
- **Play time:** 18–25 min
- **Remediation:** Extra channel cut.
- **Mechanic:** Reconstruction; mapping; field investigation.

#### PB-08 Why This Layer Holds Water

- **Layer:** A
- **Problem:** A seep line on the mesa face. Camp needs a well.
- **Determine:** Porosity/permeability contrast (aquifer vs aquitard intro). Full groundwater in Island Coast.
- **Locations:** Seep line; sandstone vs shale-like beds; failed dry hole.
- **Evidence:** Grain packing; seep altitude matches a contact.
- **Tools:** Kit; water (CH seep memory).
- **Concepts:** Porosity vs permeability; materials control water.
- **Reasoning:** Water perches on the fine bed. Dry hole missed the contact.
- **Predict/test:** Predict seep altitude at the next canyon; walk.
- **Misconceptions:** Water is in underground rivers only; solid rock cannot hold water.
- **World feedback:** Dry hole log vs successful contact.
- **Prior skills:** CH seep; PB-04.
- **Mastery evidence:** perch-prediction checked.
- **Play time:** 12–18 min
- **Remediation:** Different contact.
- **Mechanic:** Prediction; field investigation; transfer.

#### PB-09 The Fake Vein

- **Layer:** A
- **Problem:** A glittering vein in a tourist gully. Two stories: ore vs weathering stain vs pyrite analog.
- **Determine:** Competing identification with tests.
- **Locations:** Vein; dump pile; camp.
- **Evidence:** Hardness, streak, density, context (gossan vs vein).
- **Tools:** Full kit.
- **Concepts:** Identification; economic mineral vs lookalike (feeds Topic 12 lightly).
- **Reasoning:** Tests beat glitter.
- **Predict/test:** If sulfide-like, streak should not be gold-yellow — test.
- **Misconceptions:** Prospectors’ color; veins always valuable.
- **World feedback:** Tests.
- **Prior skills:** PB-01, PB-02.
- **Mastery evidence:** competing-ID resolution.
- **Play time:** 12–16 min
- **Remediation:** Different lookalike.
- **Mechanic:** Competing explanations; identification.

#### PB-10 Field Camp Unknowns

- **Layer:** A (integrator)
- **Problem:** A crate of unlabeled samples and one outcrop that matches none until they test.
- **Determine:** ID battery + environment without a worksheet order.
- **Locations:** Camp crate; mystery outcrop.
- **Evidence:** Player-chosen tests.
- **Tools:** Kit. Guidance does not list the test order.
- **Concepts:** Transfer of PB-01–09.
- **Reasoning:** Choose tests. Stop when evidence suffices. Overtesting is allowed; overclaim is not.
- **Predict/test:** Match crate sample to outcrop by properties, then walk.
- **Misconceptions:** One test; name from crate handwriting.
- **World feedback:** Feeds Painted Badlands AAR.
- **Prior skills:** All Topic 3 so far.
- **Mastery evidence:** independent ID + environment claim.
- **Play time:** 20–30 min
- **Remediation:** New crate.
- **Mechanic:** Open identification; sampling.

---

### 3.6 Glacier Country — Topic 4 Surface Processes

**Station:** Moraine station.

**Core phenomenon:** What is moving this mountain downhill, and on what clocks?

**Required puzzles: 10.**

#### GC-01 Ice vs Water

- **Layer:** A
- **Problem:** A valley with mixed scars: polished bedrock and a V-notch inner gorge with a river.
- **Determine:** Which forms were ice, which were water — from evidence, not from the region name.
- **Locations:** U-shaped trough; inner gorge; striations; river.
- **Evidence:** Cross-section shape; striations; modern discharge.
- **Tools:** Surface-process tools; HC profile.
- **Concepts:** Agents of erosion; ice vs running water.
- **Reasoning:** Ice can widen; water can cut a notch later.
- **Predict/test:** Predict striation direction vs current flow; they may disagree (older ice).
- **Misconceptions:** Rivers always make U valleys; ice happened last week because the region is named Glacier.
- **World feedback:** Direction mismatch.
- **Prior skills:** CH-06 two clocks (unannounced); HC profiles.
- **Mastery evidence:** agent-attribution with evidence.
- **Play time:** 18–25 min
- **Remediation:** A wind-scoured ridge as third agent.
- **Mechanic:** Field investigation; competing agents.

#### GC-02 The Valley That Doesn't Fit a River

- **Layer:** A
- **Problem:** Hanging tributary valley and a waterfall.
- **Determine:** Truncation by a larger ice stream, not a river that “forgot” to cut down.
- **Locations:** Hanging valley; main trough; waterfall.
- **Evidence:** Floor altitudes; tributary hanging; HC elevation.
- **Tools:** Elevation; profile.
- **Concepts:** Glacial landscape; hanging valleys.
- **Reasoning:** If only rivers, tributary floors should join smoothly.
- **Predict/test:** Predict a mismatch in floor elevation; measure.
- **Misconceptions:** Waterfalls are random beauty.
- **World feedback:** Numbers.
- **Prior skills:** HC elevation; GC-01.
- **Mastery evidence:** hanging-valley measurement.
- **Play time:** 12–18 min
- **Remediation:** Different hanging height.
- **Mechanic:** Quantitative; spatial; reconstruction.

#### GC-03 From Ridge to Bar

- **Layer:** A
- **Problem:** Fresh till on a moraine; rounded outwash downstream; a delta into a lake.
- **Determine:** Sediment from source to sink: unsorted ice vs sorted water.
- **Locations:** Moraine; outwash; lake delta; source cliff.
- **Evidence:** Sorting, rounding, bedding vs diamict.
- **Tools:** Sampling; PB grain-size skill (unannounced).
- **Concepts:** Transport; deposition; sorting.
- **Reasoning:** Ice dumps mixed; water sorts.
- **Predict/test:** Predict better rounding downstream; sample.
- **Misconceptions:** All piles are moraines; lakes don’t deposit.
- **World feedback:** Sample logs.
- **Prior skills:** PB-04; CH bar vs cut bank.
- **Mastery evidence:** source-to-sink sample chain.
- **Play time:** 18–25 min
- **Remediation:** Wind dune as extra sorter.
- **Mechanic:** Sampling; field investigation.

#### GC-04 Weathering Two Ways

- **Layer:** A
- **Problem:** A split boulder (wedged) vs a crumbled feldspar-rich face (grus/rotten).
- **Determine:** Physical vs chemical weathering, and climate hints.
- **Locations:** Talus; rotten outcrop; wet vs dry aspect (HC aspect).
- **Evidence:** Angular talus; decomposed minerals; aspect.
- **Tools:** Kit; observation.
- **Concepts:** Weathering; surface processes begin before transport.
- **Reasoning:** Ice/root/unload vs chemical decay.
- **Predict/test:** Wetter aspect should show more chemical rotting — check.
- **Misconceptions:** Weathering = erosion; only freeze-thaw everywhere.
- **World feedback:** Aspect contrast.
- **Prior skills:** PB minerals (feldspar vs quartz survival).
- **Mastery evidence:** weathering-type paired evidence.
- **Play time:** 12–18 min
- **Remediation:** Different lithologies.
- **Mechanic:** Field investigation; comparison.

#### GC-05 Soil Is Not Dirt

- **Layer:** A
- **Problem:** A trail cut shows horizons. Someone dumped fill on a pad.
- **Determine:** Soil as a profile with parent, time, slope, organisms — vs dumped dirt.
- **Locations:** Cut; fill pad; parent till.
- **Evidence:** Horizons; roots; abrupt fill contact.
- **Tools:** Sampling; notes.
- **Concepts:** Soil formation; parent material.
- **Reasoning:** Fill lacks horizons. True soil grades into parent.
- **Predict/test:** Predict thin soil on steep slope vs thicker on bench — measure.
- **Misconceptions:** Soil is just dirt; it appears instantly.
- **World feedback:** Thickness vs slope.
- **Prior skills:** GC-04; CH systems (biosphere role honest).
- **Mastery evidence:** horizon vs fill distinction; slope-thickness.
- **Play time:** 12–18 min
- **Remediation:** Different fill.
- **Mechanic:** Sampling; systems.

#### GC-06 The Slope That Will Move

- **Layer:** A
- **Problem:** A road cut with tilted beds, saturation after rain, and a fresh scar.
- **Determine:** Mass-wasting likelihood from slope, water, material — predict where, not “landslides happen.”
- **Locations:** Road cut; scar; toe; HC-like contours.
- **Evidence:** Slope angle; seeps; bedding dip vs slope; vegetation cracks.
- **Tools:** Clinometer analog; topo.
- **Concepts:** Mass wasting; gravity; water as trigger.
- **Reasoning:** Dip-slope + saturate + loose till = path.
- **Predict/test:** Predict next failure lobe; place a (safe) marker; later pulse confirms or not.
- **Misconceptions:** Flat places slide the same; rock is always safe.
- **World feedback:** Designed as **hazard opportunity** (landslide) — dynamic hazard not implemented; use static evidence + a safe suspended-operation fiction later.
- **Prior skills:** CH-03/CH-05; HC contours.
- **Mastery evidence:** failure-path prediction.
- **Play time:** 15–22 min
- **Remediation:** Different dip.
- **Mechanic:** Hazard analysis; prediction; spatial.

#### GC-07 The Pattern of Streams

- **Layer:** A
- **Problem:** Map of drainages: trellis vs dendritic vs radial on a dome.
- **Determine:** Drainage pattern records structure/slope.
- **Locations:** Three sub-basins; overlook; tablet map.
- **Evidence:** Stream traces vs ridges; a folded belt vs uniform till vs volcano-like dome (can be a granite pluton dome).
- **Tools:** Maps (HC); walking a junction.
- **Concepts:** Drainage patterns; spatial.
- **Reasoning:** Match pattern to control.
- **Predict/test:** Predict junction angle; walk.
- **Misconceptions:** All streams wander randomly.
- **World feedback:** Walked junction.
- **Prior skills:** HC spatial; GC-01 structure vs ice.
- **Mastery evidence:** pattern-to-control match.
- **Play time:** 12–18 min
- **Remediation:** Extra captured stream.
- **Mechanic:** Mapping; spatial.

#### GC-08 Two Clocks, One Mountain

- **Layer:** A
- **Problem:** A moraine dated (relative) as older; a river terrace younger; a fresh slump youngest.
- **Determine:** Rates and sequence of surface change.
- **Locations:** Moraine; terrace; slump.
- **Evidence:** Cross-cutting of forms; soil thickness (GC-05); lichen/tree optional.
- **Tools:** Chronology without full Topic 6 radiometrics (those come later); relative order.
- **Concepts:** Timescales; landscape evolution.
- **Reasoning:** Ice, then water, then gravity on the cut.
- **Predict/test:** Soil thicker on older moraine than on slump — check.
- **Misconceptions:** Fastest process is the only one; ice is still the last event everywhere.
- **World feedback:** Soil thickness.
- **Prior skills:** CH-06; GC-01–06.
- **Mastery evidence:** ordered clocks with evidence.
- **Play time:** 12–18 min
- **Remediation:** A second slump older than it looks.
- **Mechanic:** Chronology; rates.

#### GC-09 Cedar Hollow Revisited

- **Layer:** A (transfer)
- **Problem:** A Field Service packet: Cedar Hollow photos (boulder, grooves, bowl) without saying “use Topic 1.”
- **Determine:** Now that ice vs water is known, interpret the hollow’s older clock honestly — and keep the modern creek.
- **Locations:** Packet table; optional memory; do **not** require travel back, but returning to Cedar Hollow may be allowed as adventure.
- **Evidence:** Original CH notes if present; packet photos.
- **Tools:** Prior journal.
- **Concepts:** Transfer; glacial processes now assessable; intellectual honesty if CH notes were thin.
- **Reasoning:** Ice can carry mismatched boulders and groove bedrock; the creek still works today.
- **Predict/test:** If ice came from the north, grooves should trend that way — packet includes an unlabeled groove photo to measure direction.
- **Misconceptions:** Cedar Hollow was only rain; now it is only ice.
- **World feedback:** Dual-clock required.
- **Prior skills:** CH-06; GC-01.
- **Mastery evidence:** transfer explanation; glacial-process now demonstrated.
- **Play time:** 10–16 min
- **Remediation:** Packet from a different hollow.
- **Mechanic:** Transfer; reconstruction.

#### GC-10 After the Melt Pulse

- **Layer:** A (integrator + hazard opportunity)
- **Problem:** Warm afternoon, hanging lake, steep outwash fan, camp downstream.
- **Determine:** How the slope/fan will change if ice, water, and gravity keep working — including flash-flood path.
- **Locations:** Lake outlet; fan; camp; high ground.
- **Evidence:** Channel capacity; recent trimline; weather (simple).
- **Tools:** Surface tools; topo; CH runoff intuition.
- **Concepts:** Coupled surface processes; hazard from process (not arcade).
- **Reasoning:** Model a pulse. Choose a camp relocation with elevation (HC) and drainage (CH).
- **Predict/test:** Hydrograph-like: if outlet clears, fan should wet first — place flags.
- **Misconceptions:** Lakes are safe; flood is the river only in its present bed.
- **World feedback:** Feeds Glacier Country AAR. Dynamic flood **not implemented**; use modeled outcome and a suspended-operation design later.
- **Prior skills:** CH systems; HC maps; GC-01–08.
- **Mastery evidence:** process model + defensible siting.
- **Play time:** 20–30 min
- **Remediation:** Different outlet blockage.
- **Mechanic:** Environmental simulation; hazard response; prediction.

---

### 3.7 Firepeak — Topic 5 Earth's Interior & Plate Tectonics

**Station:** Fault-valley station.

**Core phenomenon:** What is happening under this mountain that you cannot walk into?

**Required puzzles: 10.**

#### FP-01 What the Waves Know

- **Layer:** A
- **Problem:** A small shake. Two seismometers: one nearby, one farther. S is late; a liquid-shadow note from a distant event in the archive.
- **Determine:** Interior structure from waves (P vs S; S not through liquid) — indirect evidence.
- **Locations:** Seismometer A/B; archive desk.
- **Evidence:** Arrival times; missing S on a distant path; player-measured Δt.
- **Tools:** Seismic tools earned by reading traces, not opening the app.
- **Concepts:** Seismic waves; Earth’s interior; inference.
- **Reasoning:** Compute a simple distance from Δt if the course expects it; else order arrivals. S-shadow implies liquid.
- **Predict/test:** Predict S delay at B from A; check.
- **Misconceptions:** We drilled to the core; all waves are the same; magma is the whole interior.
- **World feedback:** Traces.
- **Prior skills:** CH measurement; DS indirect evidence analog.
- **Mastery evidence:** P/S interpretation; interior claim bounded.
- **Play time:** 18–25 min
- **Remediation:** Different distances.
- **Mechanic:** Data; quantitative; indirect evidence.

#### FP-02 Why the Valley Is Straight

- **Layer:** A
- **Problem:** A linear valley, offset fence/road, scarp.
- **Determine:** Fault motion from surface clues.
- **Locations:** Scarp; offset fence; stream nick.
- **Evidence:** Offset amount/direction; scarp face.
- **Tools:** Tape/pace; map.
- **Concepts:** Faults; earthquakes as slip.
- **Reasoning:** Strike-slip vs dip-slip from offsets.
- **Predict/test:** Predict a stream jog direction; find it.
- **Misconceptions:** Valleys are only rivers; earthquakes open permanent chasms as default.
- **World feedback:** Jog exists or doesn’t.
- **Prior skills:** HC spatial; GC rivers vs structure.
- **Mastery evidence:** fault-type from offsets.
- **Play time:** 15–22 min
- **Remediation:** Different offset.
- **Mechanic:** Field investigation; spatial.

#### FP-03 Hot Water, Cold Rock

- **Layer:** A
- **Problem:** Hot springs aligned; nearby cold creek.
- **Determine:** Heat transport and permeability paths, not “the mountain is lava.”
- **Locations:** Springs; cold creek; silica sinter; fault (FP-02).
- **Evidence:** Temperature; alignment on the fault; chemistry optional.
- **Tools:** Thermometer; map.
- **Concepts:** Geothermal; water as heat carrier; convection foreshadow.
- **Reasoning:** Heat follows fractures. Host rock at surface can still be cool.
- **Predict/test:** Predict next spring on the fault trace; walk.
- **Misconceptions:** Hot spring = volcano erupting now; heat is random.
- **World feedback:** Alignment.
- **Prior skills:** PB permeability; FP-02.
- **Mastery evidence:** heat-path prediction.
- **Play time:** 12–18 min
- **Remediation:** A fake spring that is sun-warmed shallow pool (temperature profile).
- **Mechanic:** Field investigation; prediction.

#### FP-04 The Mountain Grew How?

- **Layer:** A
- **Problem:** Composite steep cone vs a shield-like lava field vs a cinder pile.
- **Determine:** Volcano type from materials and slopes, then *setting* as a hypothesis to test with earthquakes/ages (later puzzles).
- **Locations:** Summit trail (profile); lava field; tephra pit.
- **Evidence:** Slope; pyroclastic vs flow; viscosity analog (PB materials).
- **Tools:** Profile; kit.
- **Concepts:** Volcanism; magma composition/viscosity as inferred from products.
- **Reasoning:** Steep + mixed products ≠ same as runny flood basalts.
- **Predict/test:** Predict tephra near vent vs distal flows; sample.
- **Misconceptions:** All volcanoes are steep cones; lava = all magma.
- **World feedback:** Samples.
- **Prior skills:** PB igneous; HC profiles.
- **Mastery evidence:** type-from-products.
- **Play time:** 15–22 min
- **Remediation:** Different edifice.
- **Mechanic:** Field investigation; identification.

#### FP-05 Plates You Cannot See

- **Layer:** A
- **Problem:** GPS repeat stations, quake map, and seafloor-age analog map in the station (or a rift analog).
- **Determine:** Plate motion from multiple surface datasets.
- **Locations:** GPS pins in the world; map wall.
- **Evidence:** Displacement vectors; quake lineation; age increasing from a ridge analog if present.
- **Tools:** GPS/repeat measure; GIS layers.
- **Concepts:** Plate motion; evidence, not a puzzle titled “convergent.”
- **Reasoning:** Combine vectors + quakes. One dataset is weak.
- **Predict/test:** Predict where next year’s pin sits; show the offset already measured.
- **Misconceptions:** Continents plow through ocean crust as the whole story; plates don’t move because we don’t feel them daily.
- **World feedback:** Vector plot.
- **Prior skills:** HC GIS; FP-01/02.
- **Mastery evidence:** multi-line plate-motion case.
- **Play time:** 18–25 min
- **Remediation:** Different vector set.
- **Mechanic:** Remote sensing/geodesy; correlation; mapping.

#### FP-06 Where the Earthquakes Line Up

- **Layer:** A
- **Problem:** Quakes at depth form a dipping zone on one side, shallow on a ridge analog.
- **Determine:** Boundary type from 3D pattern (Wadati-Benioff-style vs spreading vs transform).
- **Locations:** Depth-plot table; surface epicenters.
- **Evidence:** Depth vs position graph the player builds.
- **Tools:** Seismic catalog; graph (CH data).
- **Concepts:** Plate boundaries; interior geometry.
- **Reasoning:** Dipping deep quakes ≠ same as shallow-only rift.
- **Predict/test:** Predict a deep event’s surface projection; it sits toward the volcanic arc analog.
- **Misconceptions:** All quakes are at the volcano; depth is random.
- **World feedback:** Plot.
- **Prior skills:** FP-01, FP-05; CH graphs.
- **Mastery evidence:** boundary-from-depth-pattern.
- **Play time:** 15–22 min
- **Remediation:** Transform-only catalog as contrast.
- **Mechanic:** Graphs; spatial; indirect.

#### FP-07 Why This Coast Is Quiet

- **Layer:** A
- **Problem:** Two coasts on a map: one quaky/volcanic, one quiet with old mountains.
- **Determine:** Competing explanations (distance from boundary vs “no plates here”).
- **Locations:** Map wall; a quiet lithology sample.
- **Evidence:** Age of last deformation; distance to trench analog; intraplate rarity.
- **Tools:** Maps; ages as numbers (Deep Time later deepens).
- **Concepts:** Plates are not everywhere equally active; interior of a plate.
- **Reasoning:** Quiet ≠ no Earth. It’s location on the plate.
- **Predict/test:** If far from boundary, quake rate should be low — catalog check.
- **Misconceptions:** No quakes means no interior processes; every coast is a boundary.
- **World feedback:** Catalog.
- **Prior skills:** FP-05/06.
- **Mastery evidence:** competing-explanation resolution.
- **Play time:** 10–16 min
- **Remediation:** A failed rift as third case.
- **Mechanic:** Competing explanations; data.

#### FP-08 Lahar Path

- **Layer:** A (hazard opportunity: volcanic)
- **Problem:** Snow + ash + a valley town.
- **Determine:** Lahar follows drainages. Use topo (HC) not “run from lava.”
- **Locations:** Channel; town; high bench.
- **Evidence:** Past lahar deposits (PB sedimentary high-energy); contours.
- **Tools:** Topo; materials.
- **Concepts:** Volcanic hazards are not only lava; water + loose debris.
- **Reasoning:** Evacuate *up* out of the valley, not down-valley faster.
- **Predict/test:** Predict inundation on the fan; deposits should match.
- **Misconceptions:** Outrun in the channel; lava is the only threat.
- **World feedback:** Deposit map. Dynamic lahar not implemented.
- **Prior skills:** HC routing; GC fans; CH downhill water.
- **Mastery evidence:** path prediction + safety siting.
- **Play time:** 15–22 min
- **Remediation:** Different drainage.
- **Mechanic:** Hazard response; mapping; transfer.

#### FP-09 The Oldest Rock Is Not on Top

- **Layer:** A (bridge to Deep Time)
- **Problem:** Uplifted marine sediment on the peak; young flows in the valley.
- **Determine:** Uplift and sequence; superposition is a clue but tectonics moves things.
- **Locations:** Peak limestone analog; valley basalt; unconformity.
- **Evidence:** Fossils of sea (careful: Deep Time owns fossils fully); contact.
- **Tools:** Notes; elevation.
- **Concepts:** Rocks record motion; marine on mountains.
- **Reasoning:** Sea did not flood the present peak last week; the rock moved.
- **Predict/test:** If uplifted marine, similar beds should appear along the range at height — check a second peak sample.
- **Misconceptions:** Marine fossils mean the mountain was underwater *as a mountain*; youngest is always highest after tectonics.
- **World feedback:** Second sample.
- **Prior skills:** PB environments; FP-05.
- **Mastery evidence:** uplift explanation.
- **Play time:** 12–18 min
- **Remediation:** Thrust bringing old over young (prepare Deep Time exceptions).
- **Mechanic:** Reconstruction; field investigation.

#### FP-10 Infer the Engine

- **Layer:** A (integrator)
- **Problem:** Heat, quakes, volcanoes, and motion. A convection model sits unused if they only memorize “plates.”
- **Determine:** A thermal-convection-style engine as a *model that explains* surface motion and interior heat — tested against one prediction (e.g. hotter, lower-density upwelling analog).
- **Locations:** Model table; hot-spring belt; volcano.
- **Evidence:** Heat flow pattern; FP-01 liquid outer-core note; plate vectors.
- **Tools:** Convection analog (player-run); seismic; GPS.
- **Concepts:** Interior processes; convection; plates as surface expression.
- **Reasoning:** Model must beat “random” and “hollow Earth.”
- **Predict/test:** If upwelling, volcanoes/heat should cluster there — check map.
- **Misconceptions:** Plates skate on a lake of lava; convection is only weather.
- **World feedback:** Feeds Firepeak AAR.
- **Prior skills:** FP-01–09; SF models as tools.
- **Mastery evidence:** model-plus-surface-evidence case.
- **Play time:** 18–25 min
- **Remediation:** Different heat-flow map.
- **Mechanic:** Physical model; synthesis; prediction.

---

### 3.8 Deep Time Canyon — Topic 6 Earth's History

**Station:** Rim station.

**Core phenomenon:** In what order did this canyon's story actually happen?

**Required puzzles: 10.**

#### DT-01 Bottom Is Older — Until It Isn't

- **Layer:** A
- **Problem:** A clean stack, then a fold/overturned panel.
- **Determine:** Superposition and original horizontality — and when they fail.
- **Locations:** Simple wall; overturned limb with graded beds or vesicles/fossils as way-up.
- **Evidence:** Way-up indicators; fold.
- **Tools:** Notes; PB sedimentary structures.
- **Concepts:** Relative dating; superposition; way-up.
- **Reasoning:** Do not assume the visually lowest is oldest in the overturned panel.
- **Predict/test:** Predict way-up from graded bed; check a fossil orientation if present.
- **Misconceptions:** Lowest is always oldest; layers never move.
- **World feedback:** Way-up.
- **Prior skills:** PB layers; FP uplift.
- **Mastery evidence:** superposition + overturned exception.
- **Play time:** 15–22 min
- **Remediation:** Different way-up clue.
- **Mechanic:** Chronology; field investigation.

#### DT-02 The Cut That Came Later

- **Layer:** A
- **Problem:** A dike or fault cuts beds.
- **Determine:** Cross-cutting: the cutter is younger.
- **Locations:** Dike; fault; baked margin (PB/FP).
- **Evidence:** Truncated layers; bake.
- **Tools:** Observation.
- **Concepts:** Cross-cutting; inclusions optional here or DT-03.
- **Reasoning:** Order the events.
- **Predict/test:** If dike is younger, xenoliths of wall rock may sit in it — find them.
- **Misconceptions:** Dark rock is always oldest; faults are as old as the mountain.
- **World feedback:** Xenoliths.
- **Prior skills:** PB-06; FP-02.
- **Mastery evidence:** ordered events with cross-cut.
- **Play time:** 12–18 min
- **Remediation:** Two dikes, one cuts the other.
- **Mechanic:** Chronology.

#### DT-03 The Missing Pages

- **Layer:** A
- **Problem:** An irregular surface, soil, or truncated folds under flat beds.
- **Determine:** Unconformity as missing time, not a painting change.
- **Locations:** Angular unconformity; possible disconformity nearby.
- **Evidence:** Truncation; paleosol; time gap later quantified in DT-06.
- **Tools:** Sketch; PB soil optional.
- **Concepts:** Unconformities; incomplete record.
- **Reasoning:** Erosion happened. Time is missing.
- **Predict/test:** If angular, beds below should meet the surface at an angle — measure.
- **Misconceptions:** Color change = unconformity always; the record is complete.
- **World feedback:** Angle.
- **Prior skills:** DT-01; GC erosion.
- **Mastery evidence:** unconformity identification + meaning.
- **Play time:** 12–18 min
- **Remediation:** Non-unconformity color band as distractor.
- **Mechanic:** Chronology; reconstruction.

#### DT-04 The Same Storm, Two Walls

- **Layer:** A
- **Problem:** Opposite canyon walls. One bed looks similar; another is a lookalike.
- **Determine:** Correlation with multiple properties, not color.
- **Locations:** North wall; south wall; a tongue that pinches.
- **Evidence:** Lithology, fossils (index later), key beds, pinch-out.
- **Tools:** PB ID; walking (cannot fly).
- **Concepts:** Correlation.
- **Reasoning:** Match with more than paint. A key ash analog helps.
- **Predict/test:** Predict the key bed’s elevation on the far wall (HC); walk a trail down.
- **Misconceptions:** Same color = same time; correlation is guessing.
- **World feedback:** Pinch-out fails a naive match.
- **Prior skills:** PB-07; HC elevation.
- **Mastery evidence:** justified correlation.
- **Play time:** 18–25 min
- **Remediation:** Extra lookalike bed.
- **Mechanic:** Correlation; mapping; identification.

#### DT-05 A Clock in the Fossil

- **Layer:** A
- **Problem:** Two assemblages; one taxon is short-ranged and widespread.
- **Determine:** Index fossils / faunal succession as time, not decoration.
- **Locations:** Two benches; a long-ranged useless clam analog.
- **Evidence:** Range notes (honest table); occurrence.
- **Tools:** Observation; data table.
- **Concepts:** Fossils as time tools; environments still from PB (do not confuse time with ecology).
- **Reasoning:** Short range + wide = useful clock. Ecology still matters so you don’t correlate a reef to a river by one snail.
- **Predict/test:** Predict which bench is older; check with superposition where possible.
- **Misconceptions:** Bigger fossils are older; all fossils are index fossils; humans and dinosaurs as default joke — stay scientific.
- **World feedback:** Superposition check.
- **Prior skills:** DT-01, DT-04; PB environment.
- **Mastery evidence:** index vs facies fossil distinction.
- **Play time:** 15–22 min
- **Remediation:** Different assemblage.
- **Mechanic:** Chronology; data; competing explanations (time vs environment).

#### DT-06 The Number in the Crystal

- **Layer:** A
- **Problem:** A volcanic ash analog in the stack. Parent/daughter ratios on a lab slip.
- **Determine:** Radiometric age from half-life reasoning — compute, don’t pick from a list.
- **Locations:** Ash bed; lab slip; the unconformity (DT-03) to bracket.
- **Evidence:** Ratio; half-life constant given; player calculation.
- **Tools:** Simple decay model (player steps or computes).
- **Concepts:** Absolute dating; half-life; closed system warning.
- **Reasoning:** Age the ash; bracket the unconformity.
- **Predict/test:** Predict whether beds above must be younger than that number — yes if the ash is below them and not reset.
- **Misconceptions:** Radiometric is magic; carbon dates granite; half-life means the sample dies at 2×.
- **World feedback:** Number used in DT-07.
- **Prior skills:** SF math-orbit honesty; CH quantitative.
- **Mastery evidence:** `half-life` computation + bracket.
- **Play time:** 15–22 min
- **Remediation:** Different ratio.
- **Mechanic:** Quantitative; model; chronology.

#### DT-07 When Clocks Disagree

- **Layer:** A
- **Problem:** A second lab age conflicts (reset, contamination, wrong mineral).
- **Determine:** Closed-system / alteration / what to trust.
- **Locations:** Altered fracture; fresh crystal; two lab slips.
- **Evidence:** Alteration; PB mineral change; conflicting numbers.
- **Tools:** Decay model; field alteration map.
- **Concepts:** Uncertainty; revising dates; scientific honesty.
- **Reasoning:** Do not average blindly. Prefer closed crystals.
- **Predict/test:** If reset by heat (FP contact), ages near the dike should be younger — sample distance.
- **Misconceptions:** Science failed so all dates are fake; the first number is sacred.
- **World feedback:** Distance trend.
- **Prior skills:** DT-06; FP heat; CH revision.
- **Mastery evidence:** conflict→repair of the age model.
- **Play time:** 12–18 min
- **Remediation:** Different reset mechanism.
- **Mechanic:** Competing explanations; revision; quantitative.

#### DT-08 Air That Wasn't Always There

- **Layer:** A
- **Problem:** Very old sediments without certain traces vs later red beds / more oxygenated clues appropriate to ESS (stromatolite analog, banded iron analog) — keep claims bounded.
- **Determine:** Atmosphere/life co-evolution at Earth-science grain, not a biology course.
- **Locations:** Lowest benches; red bed; iron formation analog.
- **Evidence:** Rock chemistry clues; fossil presence/absence.
- **Tools:** PB tests; notes.
- **Concepts:** Earth history includes atmosphere; evidence not a timeline poster first.
- **Reasoning:** Oxygen evidence appears *after* certain rocks. Bound uncertainty.
- **Predict/test:** Predict no charcoal analog below a given bench — check.
- **Misconceptions:** Air was always like today; fossils appear all at once everywhere.
- **World feedback:** Presence/absence.
- **Prior skills:** DS nucleosynthesis humility; PB materials.
- **Mastery evidence:** bounded atmosphere-history claim.
- **Play time:** 12–18 min
- **Remediation:** Noisy evidence; must say “weak.”
- **Mechanic:** Reconstruction; indirect evidence.

#### DT-09 The Canyon's Order

- **Layer:** A (integrator)
- **Problem:** Write the history from several independent lines: superposition, cross-cut, unconformity, correlation, fossils, one good radiometric.
- **Determine:** A single coherent sequence.
- **Locations:** Full canyon; rim table.
- **Evidence:** All DT-01–08.
- **Tools:** Journal.
- **Concepts:** Multiple lines of Earth-history evidence (Phase 4 alignment).
- **Reasoning:** No single method is enough. Overclaim missing time as known years is pushed back.
- **Predict/test:** One unused contact should fit the sequence — go confirm.
- **Misconceptions:** A pretty story; ignore the conflicting age.
- **World feedback:** Unused contact.
- **Prior skills:** Entire Topic 6 so far; FP tectonics for uplift events.
- **Mastery evidence:** multi-line history.
- **Play time:** 20–30 min
- **Remediation:** Extra dike.
- **Mechanic:** Reconstruction; chronology; synthesis.

#### DT-10 Firepeak's Fault, Dated

- **Layer:** A (transfer)
- **Problem:** A packet: Firepeak offset terrace vs uncut terrace. No “use Topic 5.”
- **Determine:** Age bracket of slip using Deep Time tools.
- **Locations:** Packet; optional memory of FP-02.
- **Evidence:** Cross-cut of dated ash; undated scarp vs dated bed.
- **Tools:** DT methods + FP fault.
- **Concepts:** Transfer; earthquakes have dates; hazards later.
- **Reasoning:** Slip after ash A, before bed B — or unbounded if evidence missing (honesty).
- **Predict/test:** If a terrace is uncut, it postdates slip — packet photo check.
- **Misconceptions:** Faults are all Precambrian; dating faults is impossible so skip.
- **World feedback:** Feeds Deep Time AAR.
- **Prior skills:** FP-02; DT-02; DT-06.
- **Mastery evidence:** hazard-relevant age bracket.
- **Play time:** 12–18 min
- **Remediation:** Different brackets.
- **Mechanic:** Transfer; chronology; hazard relevance.

---

### 3.9 Island Coast — Topic 9 Water & Ocean Systems

**Station:** Estuary station.

**Core phenomenon:** Where does this water go, and what does it take with it?

**Required puzzles: 10.**

#### IC-01 The Island's Water Budget

- **Layer:** A
- **Problem:** A dry week; tanks low; a spring still runs.
- **Determine:** Reservoirs and fluxes (precip, runoff, infiltration, storage, ocean).
- **Locations:** Gauge; spring; tank; soil pit; tide line.
- **Evidence:** Simple budget numbers the player measures/reads.
- **Tools:** Water instruments (earned by measuring).
- **Concepts:** Water cycle as accounting, not a poster cycle.
- **Reasoning:** Close a budget within honest error. Missing term is infiltration or storage.
- **Predict/test:** If tanks are leaking to ground, a downhill seep should wet — check.
- **Misconceptions:** Water is created/destroyed; the ocean is disconnected from rain.
- **World feedback:** Seep.
- **Prior skills:** CH path; GC storage in lakes.
- **Mastery evidence:** budget with measured terms.
- **Play time:** 15–22 min
- **Remediation:** Different missing term.
- **Mechanic:** Quantitative; systems.

#### IC-02 Soak or Run

- **Layer:** A
- **Problem:** Same storm, two slopes: one rills, one soaks.
- **Determine:** Infiltration vs runoff from soil, slope, cover, saturation.
- **Locations:** Clay pad; sandy bench; steep vs gentle (CH table in the wild).
- **Evidence:** Infiltrometer analog; residual moisture; rill presence.
- **Tools:** Water instruments; CH fair test spirit.
- **Concepts:** Infiltration; runoff; soil; slope.
- **Reasoning:** Predict which sheds; test with a pour or storm replay.
- **Predict/test:** Required controlled pour (field, not only table).
- **Misconceptions:** Rain always soaks; pavement is the only runoff.
- **World feedback:** Rills vs wet sand.
- **Prior skills:** CH-03; PB-08; GC-05.
- **Mastery evidence:** infiltration experiment + interpretation.
- **Play time:** 15–22 min
- **Remediation:** Wet antecedent vs dry.
- **Mechanic:** Controlled experiment; field investigation.

#### IC-03 The Well That Failed

- **Layer:** A
- **Problem:** A well went dry after a neighbor’s pumping; another well is salty.
- **Determine:** Water table, cone of depression analog, porosity/permeability, saltwater intrusion intro.
- **Locations:** Failed well; working well; coast well; piezometers.
- **Evidence:** Water-level measurements; PB-08 lithology; salinity.
- **Tools:** Tape; salinity meter.
- **Concepts:** Groundwater; water table; contamination/salt as density.
- **Reasoning:** Levels form a surface. Overpump near coast pulls salt.
- **Predict/test:** Predict which piezometer dropped; measure.
- **Misconceptions:** Underground rivers only; wells tap mystic pools; pumping here cannot affect there.
- **World feedback:** Levels.
- **Prior skills:** PB-08; IC-01.
- **Mastery evidence:** water-table map from points (HC contours analog).
- **Play time:** 18–25 min
- **Remediation:** Different pumping well.
- **Mechanic:** Mapping; quantitative; systems.

#### IC-04 Salt Where It Shouldn't Be

- **Layer:** A
- **Problem:** Estuary: salinity changes with tide and river.
- **Determine:** Mixing, density, a salt wedge or well-mixed case from measurements.
- **Locations:** River mouth; mid estuary; inlet; depth profile.
- **Evidence:** Salinity vs depth vs tide (SF tide intro, unannounced).
- **Tools:** Salinity; celestial clock for tide.
- **Concepts:** Estuaries; density; tides as mixing clock.
- **Reasoning:** Profile at high vs low water.
- **Predict/test:** Predict saltier bottom at slack? Check this estuary’s type.
- **Misconceptions:** Estuary is just “salty river”; salt is uniform.
- **World feedback:** Profiles.
- **Prior skills:** SF-07 tides; IC-03 density.
- **Mastery evidence:** mixing explanation from profiles.
- **Play time:** 15–22 min
- **Remediation:** Drought vs flood river.
- **Mechanic:** Data; prediction; environmental measurement.

#### IC-05 The Twice-a-Day Shore

- **Layer:** A
- **Problem:** A boat is stranded. Times don’t match a 24 h clock.
- **Determine:** Tidal period and range from a staff, connecting to SF Moon/Sun without a lecture titled Topic 10.
- **Locations:** Tide staff; high wrack; low exposed flats.
- **Evidence:** Staff log; Moon phase in sky log if they think to open it.
- **Tools:** Water instruments; sky log available.
- **Concepts:** Tides; lunar day; range (spring/neap reuse).
- **Reasoning:** Measure interval. ~12.5 h peaks, not noon.
- **Predict/test:** Predict next high; wait via clock instrument; check.
- **Misconceptions:** Tides follow the Sun like shadows; one tide a day everywhere.
- **World feedback:** Missed prediction strands the (fictional) supply crate until they revise.
- **Prior skills:** SF-07; SF-01 clocks.
- **Mastery evidence:** tidal prediction checked.
- **Play time:** 12–18 min
- **Remediation:** Different range.
- **Mechanic:** Prediction; quantitative; transfer.

#### IC-06 A Current You Cannot See

- **Layer:** A
- **Problem:** A drift bottle and a temperature-salinity pair.
- **Determine:** Density-driven vs wind-driven surface current from evidence.
- **Locations:** Inlet; thermistor chain; bottle release/recovery.
- **Evidence:** T, S, density; bottle path vs wind vane.
- **Tools:** Water instruments; map.
- **Concepts:** Ocean currents; density; surface vs deep.
- **Reasoning:** If bottle follows wind but deep T/S suggests opposite, two layers.
- **Predict/test:** Predict bottle landfall; recover.
- **Misconceptions:** One ocean current; temperature alone.
- **World feedback:** Landfall.
- **Prior skills:** IC-04; Stormlands not yet (wind as data here).
- **Mastery evidence:** two-layer or wind-match case.
- **Play time:** 15–22 min
- **Remediation:** Different wind.
- **Mechanic:** Experiment (drift); data; spatial.

#### IC-07 The Beach That Moved

- **Layer:** A
- **Problem:** Groin or jetty: sand piled one side, starved the other.
- **Determine:** Longshore transport direction and human interruption.
- **Locations:** Groin; two beaches; an inlet spit.
- **Evidence:** Grain, width, aerial (HC remote).
- **Tools:** Imagery + walking.
- **Concepts:** Waves; longshore drift; coastal change.
- **Reasoning:** Transport is alongshore. Hard structures redistribute, not create sand.
- **Predict/test:** Predict which side is wider; measure; imagery time pair.
- **Misconceptions:** Beaches are permanent; storms only move sand offshore forever.
- **World feedback:** Widths; before/after image.
- **Prior skills:** HC remote; GC transport.
- **Mastery evidence:** direction + structure effect.
- **Play time:** 15–22 min
- **Remediation:** Opposite wave climate.
- **Mechanic:** Remote sensing; field; resource/human (light).

#### IC-08 After the Unusual Drawback

- **Layer:** A (hazard opportunity: tsunami; also hurricane surge later in Stormlands)
- **Problem:** Archive: water withdrew, then a high wrack inland. A quake note from Firepeak’s sister net.
- **Determine:** Tsunami as displacement wave, not a “tidal wave”; authentic response: inland and up.
- **Locations:** Unusual wrack; staff; a too-low “safe” pier.
- **Evidence:** Inland deposits (PB); timing after quake; not the daily tide (IC-05).
- **Tools:** Notes; topo (high ground).
- **Concepts:** Tsunami; coupled quake–ocean; safety.
- **Reasoning:** Drawback is a warning. Do not go look. Height from topo, not curiosity.
- **Predict/test:** If tsunami, deposits should be inland of storm wrack — sample.
- **Misconceptions:** Tidal wave; surf the drawback; only the beach is unsafe.
- **World feedback:** Deposit line. Dynamic tsunami not implemented.
- **Prior skills:** FP earthquakes; IC-05 contrast; HC elevation.
- **Mastery evidence:** hazard interpretation + correct safety choice.
- **Play time:** 12–18 min
- **Remediation:** Storm-surge wrack vs tsunami deposit contrast.
- **Mechanic:** Hazard response; reconstruction; competing explanations.

#### IC-09 One Watershed, Two Towns

- **Layer:** A
- **Problem:** Upstream town’s runoff and a downstream oyster analog / well.
- **Determine:** Coupled land–water–people system; contamination path.
- **Locations:** Upstream drain; estuary; well.
- **Evidence:** Tracer dye analog; salinity; IC-02 soils.
- **Tools:** Water instruments; map.
- **Concepts:** Watershed; coupled systems; water quality.
- **Reasoning:** What happens uphill arrives. Dilution is not disappearance.
- **Predict/test:** Predict tracer arrival window; check.
- **Misconceptions:** The estuary cleans everything; groundwater is separate from the creek.
- **World feedback:** Tracer. Feeds later High Sierra ethics.
- **Prior skills:** CH systems; IC-02/03.
- **Mastery evidence:** path + time of travel.
- **Play time:** 15–22 min
- **Remediation:** Different source.
- **Mechanic:** Systems; prediction; sampling.

#### IC-10 The Estuary's Decision

- **Layer:** A (integrator)
- **Problem:** Restore a marsh, armor a shore, or move a dock — given tides, sediment, wells, and a storm note.
- **Determine:** A defensible water-system decision using properties and paths actually measured.
- **Locations:** Marsh; armored reach; dock; well.
- **Evidence:** IC-01–09 records.
- **Tools:** Full water kit + maps.
- **Concepts:** Topic 9 synthesis; light Topic 12 foreshadow.
- **Reasoning:** Tradeoffs. No labeled “correct environmentalism.” Evidence.
- **Predict/test:** If marsh restored, predict infiltration/upland flood change — model simple.
- **Misconceptions:** One virtuous button; armor always works.
- **World feedback:** Feeds Island Coast AAR.
- **Prior skills:** Entire Topic 9; HC siting; CH systems.
- **Mastery evidence:** decision with water evidence.
- **Play time:** 20–30 min
- **Remediation:** Different storm climatology number.
- **Mechanic:** Resource/decision; simulation; synthesis.

---

### 3.10 Stormlands — Topic 7 Weather & Atmospheric Systems

**Station:** Plains weather station.

**Core phenomenon:** What is the air doing, and what should a person do about it?

**Required puzzles: 10.**

#### SL-01 Read the Station

- **Layer:** A
- **Problem:** A station model on the board, and the real instruments outside disagree with a student’s memory of symbols.
- **Determine:** Decode *and* match to live instruments (temp, pressure, wind, cloud).
- **Locations:** Instrument mast; board.
- **Evidence:** Live readings; model plot the player draws from instruments, then compares to a telegram model.
- **Tools:** Weather instruments earned by reading the mast.
- **Concepts:** Station models; observation.
- **Reasoning:** Build the model from the mast. Do not start from a quiz of symbols.
- **Predict/test:** Predict how the plotted wind barb should point; check vane.
- **Misconceptions:** The drawing is art; temperature is the whole weather.
- **World feedback:** Mast vs plot.
- **Prior skills:** CH observation; data.
- **Mastery evidence:** live-to-model match.
- **Play time:** 12–18 min
- **Remediation:** Different conditions.
- **Mechanic:** Field investigation; representation.

#### SL-02 Why the Air Moved

- **Layer:** A
- **Problem:** Wind toward the station from high to low? A pressure map is incomplete.
- **Determine:** Pressure gradient as the driver; simple isobars (HC isolines transfer, unannounced).
- **Locations:** Three field barometers; station.
- **Evidence:** Pressure values; wind.
- **Tools:** Barometer; map.
- **Concepts:** Pressure; gradient; wind.
- **Reasoning:** Draw isobars analog. Wind should make sense with gradient (Coriolis conceptual later if needed as a *deflection*, not a formula dump).
- **Predict/test:** Predict wind at a fourth mast; walk to it.
- **Misconceptions:** Wind starts at the clouds; pressure is just “rainy feeling.”
- **World feedback:** Fourth mast.
- **Prior skills:** HC contours (isolines); CH gradient intuition.
- **Mastery evidence:** gradient-to-wind prediction.
- **Play time:** 15–22 min
- **Remediation:** Tighter packing.
- **Mechanic:** Mapping; prediction; quantitative.

#### SL-03 The Front at the Fence

- **Layer:** A
- **Problem:** Temperature, dewpoint, and wind shift across a few kilometers of fence line. Sky changes.
- **Determine:** Air-mass contrast / front from measurements, not from a cartoon.
- **Locations:** Warm side; cool side; shift line.
- **Evidence:** T, Td, wind, pressure trend, cloud.
- **Tools:** Instruments; walking transect (HC profile analog).
- **Concepts:** Air masses; fronts.
- **Reasoning:** A boundary has width and a direction of motion.
- **Predict/test:** Predict which side will be cooler in an hour if the front advances; clock-check.
- **Misconceptions:** Fronts are painted lines with no width; cold air cannot sit next to warm.
- **World feedback:** Hourly change.
- **Prior skills:** SL-01/02; IC density contrast analog.
- **Mastery evidence:** front transect + motion.
- **Play time:** 15–22 min
- **Remediation:** Stationary vs moving.
- **Mechanic:** Field transect; prediction.

#### SL-04 Dewpoint at Dawn

- **Layer:** A
- **Problem:** Fog in the wetland, clear on the dry field.
- **Determine:** Humidity, dewpoint, condensation when T approaches Td.
- **Locations:** Wetland; dry field; dawn clock.
- **Evidence:** T, Td, visibility.
- **Tools:** Hygrometer analog; thermometer.
- **Concepts:** Moisture; dewpoint; clouds/fog as condensation.
- **Reasoning:** Same air? Or wetland moisture source (local).
- **Predict/test:** Predict fog burns off when T rises above Td — wait with clock.
- **Misconceptions:** Fog is smoke; humidity is rain; dewpoint is a mystery number.
- **World feedback:** Burn-off.
- **Prior skills:** IC wetland; CH systems.
- **Mastery evidence:** T–Td fog explanation checked.
- **Play time:** 12–18 min
- **Remediation:** Dew vs frost night.
- **Mechanic:** Prediction; field; systems.

#### SL-05 Tomorrow from Today

- **Layer:** A
- **Problem:** Advection of the front (SL-03) plus upstream station reports.
- **Determine:** Short-range forecast from evidence, with uncertainty named.
- **Locations:** Station; incoming reports; sky.
- **Evidence:** Trends; upstream models the player sketches, not a TV forecast copied.
- **Tools:** Map; instruments; clock.
- **Concepts:** Forecasting; honest uncertainty.
- **Reasoning:** If the front continues, T should drop. If it stalls, not.
- **Predict/test:** Issue a forecast; verify next period. Misses require revision (SL-10 seed).
- **Misconceptions:** Forecasts are magic computers; one station is enough.
- **World feedback:** Next period weather.
- **Prior skills:** SL-02/03; CH prediction-then-check.
- **Mastery evidence:** forecast + verification.
- **Play time:** 15–22 min
- **Remediation:** Stall vs jump.
- **Mechanic:** Prediction; data; uncertainty.

#### SL-06 The Sky That Rotates

- **Layer:** A (hazard opportunity: thunderstorm, tornado)
- **Problem:** A supercell analog day: unstable air, shear notes, a rotating wall cloud report.
- **Determine:** Recognize severe setup and *authentic safety* (lowest interior, not windows, not chase).
- **Locations:** Shelter; ridge (bad); open plains; wetland.
- **Evidence:** Instability clues (T aloft analog, dewpoint), wind shear notes, visual rotation.
- **Tools:** Instruments; radio.
- **Concepts:** Severe weather; convection; safety.
- **Reasoning:** Unstable + moisture + shear. Response is shelter, not photography.
- **Predict/test:** Predict whether the ridge is worse than the interior room — safety choice is the test (operation suspends if they stay on the ridge).
- **Misconceptions:** Overpasses; windows for watching; tornadoes only on TV maps.
- **World feedback:** Suspended operation, then retry. Dynamic tornado not implemented.
- **Prior skills:** SL-04 moisture; SL-02 wind.
- **Mastery evidence:** setup recognition + correct safety action.
- **Play time:** 12–18 min
- **Remediation:** Severe thunderstorm without tornado (different shelter still).
- **Mechanic:** Hazard response; environmental recognition.

#### SL-07 The Hurricane Track

- **Layer:** A (hazard opportunity: hurricane; Island Coast coupling)
- **Problem:** A tropical cyclone approaching. Storm surge vs wind vs inland rain.
- **Determine:** Different hazards in different places (right-front surge, inland flood).
- **Locations:** Map; a coastal packet from Island Coast; inland river.
- **Evidence:** Track forecast cone as *uncertainty*, not a painted fate; topo of coast.
- **Tools:** Maps; IC surge memory; weather.
- **Concepts:** Hurricanes; surge; forecast uncertainty.
- **Reasoning:** Evacuate or shelter per place. Cone is not a cartoon cone of safety inside.
- **Predict/test:** Predict which town gets surge vs wind vs rain; packet answers.
- **Misconceptions:** Eye is safe; inland is safe; the centerline is certain.
- **World feedback:** Packet outcomes. Dynamic hurricane not implemented.
- **Prior skills:** IC-08 contrast tsunami vs surge; HC maps.
- **Mastery evidence:** place-specific hazard + uncertainty named.
- **Play time:** 15–22 min
- **Remediation:** Track shift.
- **Mechanic:** Hazard response; mapping; uncertainty.

#### SL-08 Don't Stand on the Ridge

- **Layer:** A
- **Problem:** Ordinary thunderstorm, lightning, High Country radio site memory.
- **Determine:** Lightning safety: not ridges, not open water, sturdy shelter.
- **Locations:** Ridge analog; station; wetland.
- **Evidence:** Lead time; flash-to-bang optional.
- **Tools:** Radio; clock.
- **Concepts:** Thunderstorm hazards beyond rain.
- **Reasoning:** Authentic response from `data/world/hazards.json` intent.
- **Predict/test:** Choose location as storm approaches; unsafe choice suspends.
- **Misconceptions:** Rubber shoes; under the tallest tree; metal mystery folklore as the whole science.
- **World feedback:** Suspension + explanation + retry.
- **Prior skills:** HC ridges; SL-06.
- **Mastery evidence:** correct shelter decision.
- **Play time:** 8–12 min
- **Remediation:** Boat-on-water variant.
- **Mechanic:** Hazard response.

#### SL-09 The Wetland That Changes the Air

- **Layer:** A
- **Problem:** Local circulation vs synoptic wind.
- **Determine:** Scale: local wetland breeze vs the front.
- **Locations:** Wetland; plains mast; two times of day.
- **Evidence:** Diurnal wind flip vs steady synoptic.
- **Tools:** Vane; clock (SF time-as-instrument).
- **Concepts:** Scale; local vs synoptic; land/water contrast (IC, climate later).
- **Reasoning:** Morning vs afternoon winds. Don’t forecast the country from one swamp gust.
- **Predict/test:** Predict afternoon reversal on a quiet synoptic day; check. On SL-03 day, reversal should fail.
- **Misconceptions:** All wind is local; all wind is the map.
- **World feedback:** Two days.
- **Prior skills:** SL-02/03; IC breeze analog.
- **Mastery evidence:** scale discrimination.
- **Play time:** 12–18 min
- **Remediation:** Lake-breeze analog.
- **Mechanic:** Comparison; prediction; scale.

#### SL-10 When the Model Is Wrong

- **Layer:** A (integrator + revision)
- **Problem:** SL-05 forecast misses.
- **Determine:** Why (stall, moisture shortage, local effect) and revise.
- **Locations:** Station; missed mast.
- **Evidence:** Verification table; SL-09 local effect maybe.
- **Tools:** All weather tools.
- **Concepts:** Revision; forecast error is information.
- **Reasoning:** CH-08 habit. Repair the model.
- **Predict/test:** New short forecast verified.
- **Misconceptions:** Miss means weather is unknowable so guess; never update.
- **World feedback:** Feeds Stormlands AAR.
- **Prior skills:** SL-05; CH revision.
- **Mastery evidence:** revised forecast + reason.
- **Play time:** 12–18 min
- **Remediation:** Different error source.
- **Mechanic:** Revision; prediction; data.

---

### 3.11 Icewater Bay — Topic 8 Climate & Global Change

**Station:** Long-record station on the bay.

**Core phenomenon:** What is a long record saying that a single cold day cannot?

**Required puzzles: 9.**

#### IB-01 A Cold Day Is Not a Climate

- **Layer:** A
- **Problem:** A bitter day. A visitor claims climate change is fake. The bay’s ice is still far from the old photograph.
- **Determine:** Weather vs climate; a day vs a distribution.
- **Locations:** Dock thermometer; photo point; record book.
- **Evidence:** Today’s T; monthly/annual distributions; photo.
- **Tools:** Records; observation.
- **Concepts:** Weather vs climate.
- **Reasoning:** One day cannot refute a distribution. The photo is one line of evidence, not a meme.
- **Predict/test:** Predict that a cold day can sit inside a warmer decade’s spread — show the envelope.
- **Misconceptions:** Weather = climate; one photo proves everything; one day disproves everything.
- **World feedback:** Distribution plot the player helps bin.
- **Prior skills:** SL weather; CH graphs.
- **Mastery evidence:** weather-vs-climate distinction with data.
- **Play time:** 12–18 min
- **Remediation:** A hot day vs a still-cold mean (opposite rhetoric).
- **Mechanic:** Data; competing claims; graphs.

#### IB-02 The Long Record

- **Layer:** A
- **Problem:** Ice-front positions, tree-ring analog, and a thermometer history disagree in the noisy short term.
- **Determine:** Trend vs variability; multiple records.
- **Locations:** Marker cairns of old fronts; core lab; thermometer hut.
- **Evidence:** Time series; player-drawn trend after seeing scatter.
- **Tools:** Graphs; field cairns (spatial).
- **Concepts:** Long records; variability; not fabricating a smooth line.
- **Reasoning:** Honest fit. Outliers remain.
- **Predict/test:** Cover the last decade, predict cairn order; reveal.
- **Misconceptions:** Wiggle means no trend; smooth line means no wiggle.
- **World feedback:** Cairn order.
- **Prior skills:** IB-01; GC ice.
- **Mastery evidence:** trend-with-uncertainty.
- **Play time:** 15–22 min
- **Remediation:** Different noise.
- **Mechanic:** Data; chronology; uncertainty.

#### IB-03 Where Energy Goes

- **Layer:** A
- **Problem:** A simple energy-flow diagram with missing arrows (sun, albedo, IR, ocean).
- **Determine:** Energy budget pieces from measurements (ice albedo vs forest, water T).
- **Locations:** Ice, forest, water, dark rock.
- **Evidence:** Relative absorption; temperature.
- **Tools:** Light meter analog; thermometers.
- **Concepts:** Energy balance; radiation; surfaces.
- **Reasoning:** Fill arrows from measurements, not from a completed poster.
- **Predict/test:** Predict ice stays cooler in sun than rock — measure.
- **Misconceptions:** Cold places don’t get sunlight; heat is only air temperature.
- **World feedback:** Measurements.
- **Prior skills:** SF seasons/angle; DS light as energy.
- **Mastery evidence:** budget from measurements.
- **Play time:** 15–22 min
- **Remediation:** Cloudy vs clear day numbers.
- **Mechanic:** Experiment; model; quantitative.

#### IB-04 The Feedback in the Ice

- **Layer:** A
- **Problem:** Melt exposes darker water/rock.
- **Determine:** Ice-albedo feedback; positive feedback as amplifier, not “good.”
- **Locations:** Dirty ice; clean ice; melt pond.
- **Evidence:** Albedo measures; melt rate analog.
- **Tools:** Light meter; IB-03.
- **Concepts:** Feedbacks.
- **Reasoning:** Less ice → more absorb → more melt. Bound: not the only climate process.
- **Predict/test:** Predict dirtier patch melts down faster; check stakes.
- **Misconceptions:** Feedback means “response email”; all feedbacks stabilize.
- **World feedback:** Stake melt.
- **Prior skills:** IB-03; GC ice.
- **Mastery evidence:** feedback prediction checked.
- **Play time:** 12–18 min
- **Remediation:** Fresh snow reset day.
- **Mechanic:** Experiment; model; prediction.

#### IB-05 The Bay That Used to Be Here

- **Layer:** A
- **Problem:** A forested trimline, drowned stumps, and a tidewater glacier retreated.
- **Determine:** Local change evidence (glacier, sea, ecology) without claiming a global number from one bay.
- **Locations:** Stumps; trimline; modern ice; photo point.
- **Evidence:** Position, dates (DT relative/absolute if a dated stump), GC landforms.
- **Tools:** Dating packet; maps.
- **Concepts:** Climate evidence in landscapes; scale (local vs global).
- **Reasoning:** This bay changed. Global claims need IB-02 networks.
- **Predict/test:** Predict stump ages older toward the sea — if the packet supports.
- **Misconceptions:** One glacier is the planet; retreat is only calving weather.
- **World feedback:** Dates.
- **Prior skills:** GC; DT dates; IB-02.
- **Mastery evidence:** local-evidence case with scale caution.
- **Play time:** 15–22 min
- **Remediation:** A glacier that advanced in one decade inside a retreat century (honesty).
- **Mechanic:** Reconstruction; chronology; scale.

#### IB-06 Carbon in the Water and Air

- **Layer:** A
- **Problem:** A bubbling inlet, a pH note, an air flask time series.
- **Determine:** Greenhouse gases and ocean uptake as coupled, with bounded mechanism (IR trapping conceptual).
- **Locations:** Inlet; flask archive; simple IR demo if present as a *model*.
- **Evidence:** CO2 series; pH; IB-03 IR arrow.
- **Tools:** Records; water chemistry light.
- **Concepts:** Greenhouse effect; ocean carbon; not a politics quest.
- **Reasoning:** Mechanism from energy + composition. Ocean is a reservoir (IC).
- **Predict/test:** If CO2 up, flask later should read higher — archive order.
- **Misconceptions:** Greenhouse is a blanket you can see; CO2 is only pollution smell; ocean is infinite dump.
- **World feedback:** Archive.
- **Prior skills:** IB-03; IC reservoirs; DS spectra (CO2 lines optional transfer).
- **Mastery evidence:** mechanism + reservoir.
- **Play time:** 15–22 min
- **Remediation:** A volcanic CO2 blip vs trend (must separate).
- **Mechanic:** Data; systems; model.

#### IB-07 A Model with Uncertainty Named

- **Layer:** A
- **Problem:** A simple climate model: if ice albedo drops and greenhouse rises, bay ice-front range.
- **Determine:** Forecast a consequence with a range, not a fake precise year.
- **Locations:** Model desk; cairns.
- **Evidence:** IB-02–06; model parameters player can vary within evidence bounds.
- **Tools:** Model; records.
- **Concepts:** Climate-data forecasting (Phase 4 alignment); uncertainty.
- **Reasoning:** Run at least two parameter sets. Report a range.
- **Predict/test:** Hindcast the last cairns first; if it fails, revise (CH).
- **Misconceptions:** Models are crystal balls; models are useless.
- **World feedback:** Hindcast.
- **Prior skills:** SL forecast uncertainty; SF models; CH revision.
- **Mastery evidence:** hindcast + ranged forecast.
- **Play time:** 18–25 min
- **Remediation:** Different sensitivity.
- **Mechanic:** Simulation; prediction; uncertainty.

#### IB-08 Stormlands Was Weather

- **Layer:** A (transfer)
- **Problem:** Packet: a Stormlands tornado year and a heat record. Radio chatter mixes them with the bay.
- **Determine:** Which claims are weather, which need climate records — unannounced Topic 7 vs 8.
- **Locations:** Packet table.
- **Evidence:** SL-type event vs IB distributions.
- **Tools:** Prior journals.
- **Concepts:** Transfer; attribution humility.
- **Reasoning:** Event ≠ climate. Trend ≠ today’s thunder.
- **Predict/test:** Sort claims; one claim is testable with IB-02 and fails.
- **Misconceptions:** Every storm is climate; no storm is climate.
- **World feedback:** Failed claim.
- **Prior skills:** SL; IB-01/02.
- **Mastery evidence:** sorted claims with reasons.
- **Play time:** 10–16 min
- **Remediation:** Different packet.
- **Mechanic:** Transfer; competing claims.

#### IB-09 What a Town Should Plan For

- **Layer:** A (integrator; Topic 12 foreshadow)
- **Problem:** Dock height, forest fire note, fishery analog, a cold-year tourism claim.
- **Determine:** A planning recommendation from long records + model range, not from today’s weather.
- **Locations:** Dock; town board; ice-front.
- **Evidence:** IB-07 range; IC sea level light if a gauge exists; SL extremes as weather overlay.
- **Tools:** All climate tools + maps.
- **Concepts:** Consequences; honest limits; human-Earth.
- **Reasoning:** Plan for the range. Name what the record cannot say.
- **Predict/test:** If dock is at X, which model runs inundate — check topo.
- **Misconceptions:** Wait for certainty; panic from one day.
- **World feedback:** Feeds Icewater Bay AAR.
- **Prior skills:** Entire Topic 8; HC elevation; IC water.
- **Mastery evidence:** decision with named uncertainty.
- **Play time:** 20–30 min
- **Remediation:** Different dock height.
- **Mechanic:** Decision; simulation; synthesis.

---

### 3.12 High Sierra — Topic 12 Natural Resources, Hazards & Sustainability

**Station:** A working Field Service station near towns. Wren, restrained: the player should not need to be told where to look.

**Core phenomenon:** What should this community do, given everything the land, water, weather, and people actually show?

**Required puzzles: 8** (thicker; synthesis). Few new facts. Independent reuse.

Guidance names the *situation*, never the prior topic.

#### HS-01 Where to Put the Town's Water

- **Layer:** A
- **Problem:** A growing town. Three candidate sources: high lake, alluvial well, and a snowmelt creek.
- **Determine:** Which source is defensible across seasons and contamination risk — player must realize maps, slope/runoff, geology, climate, and water table all matter.
- **Locations:** Lake; well field; creek; town; a mine adit upstream of one option.
- **Evidence:** Topo; lithology; infil; climate seasonality; water quality.
- **Tools:** Whatever they earned. None highlighted as “the water tool.”
- **Concepts:** Resources; watersheds; sustainability tradeoffs.
- **Reasoning:** Independent tool choice. A pretty lake may be a climate-sensitive tank (IB). A well may be PB-08/IC-03 geology. A creek may freeze or flood (SL/GC).
- **Predict/test:** Seasonal yield prediction from records; contamination path if mine leaks.
- **Misconceptions:** Biggest lake wins; groundwater is infinite; climate is weather this week.
- **World feedback:** Seasonal numbers; a dye from the adit.
- **Prior skills:** HC, PB, GC, IC, IB, CH systems — unannounced.
- **Mastery evidence:** multi-system source decision.
- **Play time:** 25–40 min
- **Remediation:** Adit moves; drought year numbers.
- **Mechanic:** Resource decision; transfer; systems.

#### HS-02 The Slope Above the Road

- **Layer:** A (hazard: landslide)
- **Problem:** A road under a dipped, logged, saturated slope.
- **Determine:** Failure path and mitigation choice (move road, drain, avoid cut) from contours + materials + water.
- **Locations:** Cut; bench; town road; spring line.
- **Evidence:** Dip vs slope (GC-06); logging; rain forecast (SL) as trigger weather not climate.
- **Tools:** Topo, clinometer, lithology, weather — player-selected.
- **Concepts:** Hazard; risk; surface processes.
- **Reasoning:** Unannounced GC + HC + CH + SL.
- **Predict/test:** Predicted lobe vs flag line.
- **Misconceptions:** Concrete always wins; trees are only scenery.
- **World feedback:** Static evidence; dynamic slide not implemented.
- **Prior skills:** GC-06, HC, CH, SL.
- **Mastery evidence:** path + mitigation with reasons.
- **Play time:** 18–28 min
- **Remediation:** Different dip.
- **Mechanic:** Hazard response; spatial; transfer.

#### HS-03 A Mine, a River, a Choice

- **Layer:** A
- **Problem:** Ore (PB-09 skill) vs downstream water (IC-09) vs jobs (honest tradeoff, not a sermon).
- **Determine:** A resource decision with measured acid/metal analog and a town’s need.
- **Locations:** Pit; mill; river; intake.
- **Evidence:** Mineral ID; water chemistry; flow (IC); maps of who drinks.
- **Tools:** Kit; water; maps.
- **Concepts:** Mineral resources; pollution path; tradeoffs.
- **Reasoning:** Evidence of harm path is not optional. Neither is the town’s energy/mineral need as a fact. Player defends a policy with measurements.
- **Predict/test:** If mill pond leaks, predict downstream concentration pattern.
- **Misconceptions:** Close everything; dump everything; dilution = solution.
- **World feedback:** Concentration pattern.
- **Prior skills:** PB, IC, CH ethics-as-honesty not as lecture.
- **Mastery evidence:** tradeoff with a measured path.
- **Play time:** 20–30 min
- **Remediation:** Different ore / different intake.
- **Mechanic:** Resource decision; sampling; systems.

#### HS-04 Fire Weather on a Dry Ridge

- **Layer:** A (hazard: wildfire)
- **Problem:** Dry fuels, wind, ignition near the ridge town.
- **Determine:** Fire behavior as weather + fuel + topography (slope, aspect, chimneys).
- **Locations:** Ridge; canyon chimney; town; a lake as possible barrier.
- **Evidence:** Fuel dryness; wind (SL); aspect (HC); last climate drought (IB) as context not today’s spark.
- **Tools:** Weather, maps, vegetation notes.
- **Concepts:** Wildfire hazard; leave-early routes.
- **Reasoning:** Authentic: leave early on a known route; not shelter in dense smoke.
- **Predict/test:** Predict upslope run vs the lake’s protection; spot a failed “shelter in the hollow.”
- **Misconceptions:** Fire only goes where the wind is on flat paper; wait and see.
- **World feedback:** Modeled spread. Dynamic fire not implemented.
- **Prior skills:** SL, HC, IB drought as climate context, GC fuels as biomass optional.
- **Mastery evidence:** spread reasoning + evacuation route.
- **Play time:** 18–28 min
- **Remediation:** Wind reversal.
- **Mechanic:** Hazard response; simulation; transfer.

#### HS-05 The Dam and the Fault

- **Layer:** A (hazard: earthquake)
- **Problem:** A reservoir on a mapped trace (FP-02, DT-10 ages).
- **Determine:** Whether the dam site is defensible given slip evidence and inundation if it fails.
- **Locations:** Dam; scarp; town in the valley; paleoseismic packet.
- **Evidence:** Offset ages; design shaking note; inundation topo.
- **Tools:** Seismic, maps, chronology — player must notice.
- **Concepts:** Earthquake hazard; infrastructure; water resource.
- **Reasoning:** Coupled FP + DT + IC + HC.
- **Predict/test:** If the terrace is young and offset, recurrence is not “never.” Inundation map from topo.
- **Misconceptions:** Dams stop quakes; old mountains are done; the valley is safe because it is flat.
- **World feedback:** Offset packet; inundation overlay.
- **Prior skills:** FP, DT, IC, HC.
- **Mastery evidence:** site critique with age + inundation.
- **Play time:** 20–30 min
- **Remediation:** Different recurrence bracket.
- **Mechanic:** Hazard; chronology; mapping; decision.

#### HS-06 Winter Closes the Pass

- **Layer:** A (hazard: blizzard / winter-storm)
- **Problem:** A storm, a pass, a clinic that needs a route.
- **Determine:** Route using weather, avalanche-prone slopes (GC mass wasting + snow), and maps — not the shortest line.
- **Locations:** Pass; forested bench; clinic; radio.
- **Evidence:** Forecast (SL); slope angle; aspect; road cuts.
- **Tools:** Weather, topo, GC slope.
- **Concepts:** Winter hazard; route; exposure.
- **Reasoning:** HC-10 spirit with weather and snow.
- **Predict/test:** Predict which cut avalanches; choose the longer forested bench.
- **Misconceptions:** Plows make physics optional; valleys are always safer (see HS-02).
- **World feedback:** Modeled closure. Dynamic blizzard not implemented.
- **Prior skills:** HC, SL, GC.
- **Mastery evidence:** winter route defense.
- **Play time:** 15–25 min
- **Remediation:** Ice instead of avalanche.
- **Mechanic:** Route planning; hazard; transfer.

#### HS-07 Whose Water in a Dry Year

- **Layer:** A
- **Problem:** Drought (IB), senior vs junior water use, a wetland (IC), and a town.
- **Determine:** Allocation recommendation from yield records and ecological/water-table constraints — honest, not a morality play.
- **Locations:** Diversion; wetland; wells; town.
- **Evidence:** IB drought frequency; IC table; legal-use fiction kept simple and factual.
- **Tools:** Records; water; maps.
- **Concepts:** Scarcity; climate; sustainability; competing needs.
- **Reasoning:** Numbers first. Name winners/losers honestly.
- **Predict/test:** If diversion remains high, predict wetland well drop — piezometer.
- **Misconceptions:** Rain will save us next week (weather); any cut is equally scientific.
- **World feedback:** Piezometer.
- **Prior skills:** IB, IC, CH systems.
- **Mastery evidence:** allocation with measured constraint.
- **Play time:** 18–28 min
- **Remediation:** Different drought length.
- **Mechanic:** Resource decision; data; systems.

#### HS-08 The Whole Toolkit

- **Layer:** A (capstone)
- **Problem:** One coupled situation: a proposed road, a fan, a fault, a fire-prone ridge, a well field, and a town meeting. Wren does not list topics.
- **Determine:** A defensible community recommendation that *requires* spatial data, rocks, water, weather, climate, hazards, resources, and systems thinking.
- **Locations:** Overlook of the whole basin; town; multiple field sites the player must choose.
- **Evidence:** Whatever they collect. Missing a system should hurt the AAR.
- **Tools:** Entire journey.
- **Concepts:** Topic 12 synthesis (bible.json).
- **Reasoning:** Independent recognition of relevant science. Overclaim and under-investigation both fail.
- **Predict/test:** At least one quantitative check (inundation, yield, or slope).
- **Misconceptions:** One specialty saves the town; a speech without measurements.
- **World feedback:** High Sierra AAR. Wren: “Looks like you don't need me telling you where to look anymore.” (design; do not implement this line as a Phase 7.9A feature)
- **Prior skills:** All prior regions.
- **Mastery evidence:** multi-system case + AAR.
- **Play time:** 35–50 min
- **Remediation:** Different proposed road alignment; same skills, new numbers.
- **Mechanic:** Synthesis; decision; open investigation.

---

## 4. Curriculum coverage map

Concepts are the in-project 12-topic ESS course plus the Phase 4 reviewed-alignment list. No official codes.

Coverage standard: **Introduced → Practiced → Used → Transferred → Assessed**. A single appearance is a gap.

| Concept (plain language) | Topic | Introduced | Practiced | Used | Transferred | Assessed |
| --- | --- | --- | --- | --- | --- | --- |
| Observation vs interpretation | 1 | CH-01 | CH-02, CH-06 | All later field notes | HC map vs land; DS spectrum vs story | CH AAR; DS-10 bounded claims |
| Relevant evidence | 1 | CH-02 | CH-05 | All Layer A | HS independent site choice | Each AAR |
| Patterns | 1 | CH-02 | CH-04 | HC spatial; SL isobars | GC drainage | CH, HC AAR |
| Fair tests / variables | 1 | CH-03 | CH-04 | IC-02 pour test | PB density vs “feel” | CH AAR; IC-02 |
| Measurement / repeated trials | 1 | CH-03 | CH-04, HC-01 | Quantitative puzzles | DT half-life setup | CH AAR |
| Graphs / tables | 1 | CH-04 | SF tides; SL verify | IB records | HS yield graphs | Multiple AARs |
| Earth systems interactions | 1 | CH-05, CH-07 | IC-09 | IB carbon; HS-08 | Unannounced in HS | CH, IC, HS AAR |
| Evidence-based explanation | 1 | CH-06 | CH-09 | All integrators | GC-09 hollow packet | Each AAR |
| Revision after conflict | 1 | CH-08 | SF-10; DT-07; SL-10 | IB hindcast fail | HS when a check fails | CH AAR + later repair items |
| Communication / case | 1 | CH-09 | Every AAR | HS town case | — | AAR (primary) |
| Coordinates / location | 2 | HC-01 | HC-02 | SF-09 window | DS baseline; IC wells | HC AAR; SF-09 |
| Map scale / distance | 2 | HC-03 | HC-06 | HS routes | SL transect spacing | HC AAR |
| Elevation / relief | 2 | HC-04, HC-05 | HC-06, HC-07 | GC hanging valley; IC high ground | HS inundation | HC, HS AAR |
| Contours / isolines | 2 | HC-04, HC-05 | HC-07 | SL isobars; IC water table | HS slopes | HC AAR |
| Gradient | 2 | HC-06 | GC-06 angle | IC runoff | HS-02 | HC, HS AAR |
| Profiles / sections | 2 | HC-07 | PB mesa; FP volcano | DT walls | HS dam valley | HC AAR |
| GIS overlay | 2 | HC-08 | HC-10 | IC-07 imagery | HS-08 | HC AAR |
| Remote sensing vs ground | 2 | HC-09 | IC-07; DS plates | IB ice-front photos | HS fire/fuel map | HC AAR |
| Spatial decision | 2 | HC-10 | FP lahar; IC dock | HS routes | — | HC, HS AAR |
| Rotation / daily solar | 10 | SF-01 | SF-02 | SL diurnal (local) | — | SF AAR |
| Seasons / tilt not distance | 10 | SF-02 | IB insolation | HS snowmelt season | — | SF AAR; IB-03 |
| Orbit shape / speed | 10 | SF-04 | SF-03 | — | DS orbital not required | SF AAR |
| Mathematical orbit prediction | 10 | SF-03 | SF-09 return | — | DT half-life as *math honesty* analog | SF AAR |
| Moon phases / EMS geometry | 10 | SF-05 | SF-06, SF-09 | IC-05 tides | — | SF AAR |
| Eclipses / tilt | 10 | SF-06 | SF-09 thin Moon | — | — | SF AAR |
| Tides (celestial fingerprint) | 10 | SF-07 | IC-05 | IC-04 mixing clock | HS dock | SF, IC AAR |
| Planetary properties | 10 | SF-08 | — | PB density analog | — | SF AAR |
| Model vs sky revision | 10 | SF-10 | IB-07 hindcast | SL-10 | HS model checks | SF AAR |
| Spectra / light as information | 11 | DS-01 | DS-02, DS-06 | IB greenhouse optional | PB composition analog | DS AAR |
| Stellar temperature–color | 11 | DS-02 | DS-04 | — | — | DS AAR |
| Distance / apparent vs intrinsic | 11 | DS-03 | DS-04, DS-09 | — | IB local vs global scale analog | DS AAR |
| HR-style grouping | 11 | DS-04 | DS-05 | DS-10 | — | DS AAR |
| Stellar life / mass | 11 | DS-05 | DS-06 | — | — | DS AAR |
| Fusion / element production | 11 | DS-06 | DS-08 | PB “where gold forms” optional C | — | DS AAR |
| Redshift / expansion | 11 | DS-07 | DS-08 | — | — | DS AAR |
| Early-universe converging evidence | 11 | DS-08 | DS-10 | — | DT multi-line habit | DS AAR |
| Lookback time | 11 | DS-09 | DS-10 | — | DT “we see incomplete record” | DS AAR |
| Mineral properties / ID | 3 | PB-01 | PB-02, PB-09 | GC samples; HS ore | DT lithology match | PB AAR |
| Density as property | 3 | PB-02 | SF-08 contrast | IC salt density | — | PB AAR |
| Igneous texture / cooling | 3 | PB-03 | FP-04 products | DT dike | — | PB, FP AAR |
| Sedimentary environment | 3 | PB-04 | PB-07 | GC deposits; IC beaches | DT facies vs time | PB AAR |
| Metamorphism / parent | 3 | PB-05 | PB-06 | FP contacts | DT alteration ages | PB AAR |
| Transformations as evidence | 3 | PB-06 | PB-10 | DT inclusions | — | PB AAR |
| Porosity / permeability | 3 | PB-08 | IC-02, IC-03 | HS wells | FP hot-spring paths | PB, IC AAR |
| Ice vs water agents | 4 | GC-01 | GC-02, GC-03 | IB bay | CH hollow packet GC-09 | GC AAR |
| Glacial landforms | 4 | GC-02 | GC-03, GC-09 | IB-05 | — | GC AAR |
| Weathering vs erosion | 4 | GC-04 | GC-05 | PB grus; HS slopes | — | GC AAR |
| Soil | 4 | GC-05 | GC-08 rates | IC infiltration | HS logging soils | GC AAR |
| Mass wasting | 4 | GC-06 | GC-10 | HS-02, HS-06 | HC washout memory | GC, HS AAR |
| Transport / sorting / deposition | 4 | GC-03 | IC-07 | PB conglomerate | HS fans | GC AAR |
| Drainage patterns | 4 | GC-07 | IC watershed | HS-01 | — | GC AAR |
| Landscape rates / clocks | 4 | GC-08 | DT relative | IB ice-front | — | GC AAR |
| Seismic waves / interior | 5 | FP-01 | FP-06 | HS-05 shaking | DS indirect analog | FP AAR |
| Faults / surface rupture | 5 | FP-02 | DT-10 | HS-05 | — | FP, HS AAR |
| Volcanism / products | 5 | FP-04 | FP-08 | PB igneous setting | — | FP AAR |
| Geothermal / heat paths | 5 | FP-03 | FP-10 | IB energy | — | FP AAR |
| Plate motion evidence | 5 | FP-05 | FP-06, FP-07 | DT marine on peaks | — | FP AAR |
| Boundary geometry (depth) | 5 | FP-06 | FP-07 | — | — | FP AAR |
| Interior engine / convection model | 5 | FP-10 | — | IB energy analog | SL convection caution (not the same) | FP AAR |
| Superposition / way-up | 6 | DT-01 | DT-09 | PB stacks | HS paleoseismic | DT AAR |
| Cross-cutting / inclusions | 6 | DT-02 | DT-09, DT-10 | PB-06 | FP dikes | DT AAR |
| Unconformity / missing time | 6 | DT-03 | DT-06 bracket | IB long gaps analog | — | DT AAR |
| Correlation | 6 | DT-04 | DT-05, DT-09 | PB mesa | — | DT AAR |
| Index fossils / succession | 6 | DT-05 | DT-09 | — | — | DT AAR |
| Radiometric / half-life | 6 | DT-06 | DT-07 | IB stump ages | HS dam recurrence | DT, HS AAR |
| Atmosphere/life history (ESS grain) | 6 | DT-08 | DT-09 | IB carbon as modern | — | DT AAR |
| Water budget / cycle accounting | 9 | IC-01 | IC-10 | HS-01, HS-07 | CH path | IC, HS AAR |
| Infiltration vs runoff | 9 | IC-02 | IC-09 | HS-01 | CH-03 | IC AAR |
| Groundwater / water table | 9 | IC-03 | IC-09 | HS-01, HS-07 | PB-08 | IC, HS AAR |
| Estuary mixing / salinity | 9 | IC-04 | IC-10 | — | — | IC AAR |
| Ocean/coastal currents & waves | 9 | IC-06, IC-07 | IC-10 | SL hurricane surge | — | IC AAR |
| Tsunami vs daily tide | 9 | IC-08 | SL-07 contrast | HS coast if present | FP quake coupling | IC AAR |
| Station models / obs | 7 | SL-01 | SL-05 | HS fire weather | — | SL AAR |
| Pressure / wind / isolines | 7 | SL-02 | SL-03, SL-09 | HS-04 wind | HC isolines | SL AAR |
| Air masses / fronts | 7 | SL-03 | SL-05 | — | IC density analog | SL AAR |
| Humidity / dewpoint / condensation | 7 | SL-04 | SL-06 moisture | IB clouds optional | — | SL AAR |
| Short-range forecast | 7 | SL-05 | SL-10 | HS-06 storm | IB not a climate forecast | SL AAR |
| Severe weather recognition | 7 | SL-06 | SL-07, SL-08 | HS-04 | — | SL AAR |
| Safety response | 7 | SL-06–08 | HS-02,04,05,06 | IC-08 | — | SL, HS AAR |
| Weather vs climate | 8 | IB-01 | IB-08 | HS-07 drought vs this week | SL events | IB, HS AAR |
| Long records / variability | 8 | IB-02 | IB-05, IB-07 | HS-07 | DT incompleteness humility | IB AAR |
| Energy balance | 8 | IB-03 | IB-04, IB-06 | HS fire/energy light | SF seasons | IB AAR |
| Feedbacks | 8 | IB-04 | IB-07 | — | GC ice melt pulse analog | IB AAR |
| Greenhouse / carbon reservoirs | 8 | IB-06 | IB-07 | HS energy/resource | DS spectra optional | IB AAR |
| Climate forecast + uncertainty | 8 | IB-07 | IB-09 | HS-01 seasonal yield | SL forecast analog | IB, HS AAR |
| Local change vs global claim | 8 | IB-05 | IB-08 | HS-08 | — | IB AAR |
| Resource tradeoffs | 12 | IC-10 light; HS-01 | HS-03, HS-07 | HS-08 | PB-09 fake vein | HS AAR |
| Multi-hazard reasoning | 12 | FP-08; GC-10; SL; IC-08 | HS-02–06 | HS-08 | — | HS AAR |
| Sustainability / human–Earth | 12 | IB-09; HS-01 | HS-03, HS-07 | HS-08 | CH systems | HS AAR |
| Independent prior-skill selection | 12 | HS-01 | HS-02–07 | HS-08 | Entire course | HS AAR (primary performance) |

---

## 5. Introduce / practice / use / transfer / assess matrix

Section 4 is the full concept matrix. This section states **rules** the matrix already obeys, and flags remaining thin cells.

### 5.1 Rules

1. **Introduce** in the home region with guidance appropriate to course stage.
2. **Practice** in at least one more puzzle in that region (not the same click).
3. **Use** as a tool inside a later puzzle in-region or next region.
4. **Transfer** in a later region **without announcing the topic**.
5. **Assess** in world use *and* After Action Report reasoning.

### 5.2 Thin-but-present cells (acceptable if AAR probes them)

- Planetary classification (SF-08) transfers only lightly into PB density — AAR must probe properties-not-names.
- Eclipse geometry is practiced in SF-06/09; later transfer is thin by nature (sky geometry). Keep SF AAR strong.
- HR diagram is in-region heavy; transfer is analogical (graphs, axes honesty) not a second HR unit.
- Coriolis as a named deflection is **not** a required puzzle; if the owner’s course requires it, see §16.

### 5.3 Dual-home concepts (intentional)

Some ideas have a *habit home* and a *content home*:

| Idea | Habit home | Content home |
| --- | --- | --- |
| Mismatched boulder / grooves | Cedar Hollow (evidence, clocks) | Glacier Country (ice as agent) |
| Tides | Sunfall (celestial fingerprint) | Island Coast (ocean process) |
| Isolines | High Country (contours) | Stormlands (isobars), Island Coast (water table) |
| Density | Painted Badlands (minerals) | Island Coast (salinity), Sunfall (planets) |
| Convection | Firepeak (mantle engine) | Stormlands (storms — must not conflate) |
| Ice | Glacier Country (process) | Icewater Bay (climate record) |

---

## 6. Puzzle-mechanic variety analysis

Required puzzles by primary mechanic (a puzzle may have a secondary). Counts are of Layer A puzzles in §3.

| Mechanic | Puzzle IDs | Count |
| --- | --- | --- |
| Field investigation | CH-01,02,05,06,07; HC-01; SF-01,05; PB-03,04,05,07; GC-01,04; FP-02,03,04,09; DT-01; SL-01; IC-02 | 22 |
| Controlled experiment | CH-03; IC-02; IB-03,04; PB-01 tests; GC pour none extra | 6+ |
| Mapping | HC-03–05,07,08; GC-07; IC-03 water table; SL-02; FP-05 | 12 |
| Route planning | HC-02,06,10; SF-09; HS-06; FP-08 | 6 |
| Spatial reasoning | HC-04,07; GC-02; FP-06; DS-03 | 5 |
| Sampling | GC-03,05; PB-10; HS-03; IC-09 | 5 |
| Physical / analog models | SF-03,04,06; FP-10; IB-03,07; DS-05 | 7 |
| Prediction / predict-then-check | Most regions; explicit cores: CH-03,05; HC-07,09; SF-03,05,09; GC-06,10; SL-05; IB-07 | 15+ |
| Quantitative reasoning | CH-03,04; HC-03,06; SF-03; DS-09; PB-02; DT-06; IC-01,05; FP-01 | 11 |
| Graphs / data | CH-04; SF-07; DS-07; FP-06; SL-05,10; IB-01,02 | 8 |
| Chronology | CH-06; GC-08; DT-01–10; IB-02,05 | 14 |
| Correlation | SF-07; DS-07; DT-04; IB-02 | 4 |
| Material identification | PB-01,02,09,10; SF-08; GC-03 samples | 6 |
| Remote sensing | HC-09; DS-01; IC-07; IB photos | 4 |
| Environmental simulation | GC-10; IB-07; HS-04,08 | 4 |
| Hazard response | GC-10; FP-08; IC-08; SL-06–08; HS-02,04,05,06 | 10 |
| Resource decisions | IC-10; IB-09; HS-01,03,07,08 | 6 |
| Competing explanations | CH-05,08; SF-02; DS-08,10; PB-09; FP-07; DT-07; IB-01,08 | 10 |
| Reconstruction of past environments | PB-04,07; GC-09; DT-09; IB-05 | 5 |
| Indirect evidence | DS all; FP-01,10; DT-08; IB-06 | 8 |

**Anti-pattern check:** No region is “collect three clues → labeled conclusion” as the only form. Cedar Hollow CH-05 still *includes* competing explanations, but only after prediction, walking, and measurement. High Country scale is estimate-then-walk, not computed-for-the-student. Sunfall Kepler is compute-then-model, not four-button recognition.

---

## 7. Cross-region transfer map

Transfers must **not** announce “use your Topic N skill.”

| From → to | What transfers | Vehicle |
| --- | --- | --- |
| CH → HC | Slope vs speed; observation vs interpretation | HC-09 washout; recording what the cap *says* |
| CH → all | Fair tests, graphs, revision, systems | Embedded in experiments, AARs |
| HC → SF | Walk to unlabeled coordinates | SF-09 observation window |
| HC → later | Contours, scale, profiles, GIS, imagery | GC hanging valley; SL isobars; IC water table; FP lahar; HS all |
| SF → IC | Tides as celestial fingerprint | IC-05 period/range |
| SF → IB | Seasons / angle / energy | IB-03 insolation |
| SF → SL | Time as instrument | SL-04, SL-09 diurnal |
| DS → IB | Light/spectra as information | IB-06 greenhouse optional |
| DS → DT | Converging indirect lines | DT-09 habit |
| PB → GC | Grain size, lithology | GC-03 samples |
| PB → IC | Porosity/permeability | IC-02, IC-03 |
| PB → HS | Ore vs lookalike | HS-03 |
| GC → CH packet | Ice as agent | GC-09 |
| GC → IB | Ice landforms as records | IB-05 |
| GC → HS | Mass wasting | HS-02, HS-06 |
| FP → IC | Quake–ocean | IC-08 |
| FP → DT | Faults, heat reset | DT-07, DT-10 |
| FP → HS | Fault + dam | HS-05 |
| DT → HS | Recurrence brackets | HS-05 |
| IC → SL | Surge vs other coastal waves | SL-07 |
| IC → HS | Wells, watersheds | HS-01, HS-07 |
| SL → IB | Events are weather | IB-08 |
| SL → HS | Fire weather, storms, lightning analog | HS-04, HS-06 |
| IB → HS | Drought as climate, uncertainty | HS-01, HS-07, HS-08 |
| All → HS-08 | Independent selection | Capstone |

**High Sierra test (from the owner brief):** a problem may require the student to realize that a topo map, slope/runoff, geology, weather, and hazard information are all relevant. That is HS-01, HS-04, and HS-08 by design.

---

## 8. After Action Report design

### 8.1 When it happens

After **required Layer A puzzles** for the region (or a configured subset that still covers travel-required concepts), the player returns to the Field Service station and talks with Wren.

This is a **field debrief**, not a school test. Tone matches the Game Bible: “What did you actually see?” “That's possible. What supports it?”

### 8.2 Structure

1. Wren names 3–5 **decisions the player actually made** (not textbook items they never touched).
2. Each item: a short stem in field language + 3–4 plausible replies (correct reasoning, attractive misconception, incomplete, overclaim).
3. Optional: “If we went back to X, what should still be true?”
4. Wren does not say “wrong.” The land’s logic does: “The stretch by the station stayed clear” / “Your unfair run changed two things.”
5. Internal scoring per tagged concept. Player sees only the regional result.

### 8.3 Item design rules

- Choices must be **plausible**. Include the misconception the puzzle targeted.
- A player who brute-forced a correct click but endorses the misconception **fails that concept’s reasoning score**.
- A player who can explain but whose world evidence is missing **fails use** — Wren sends them to the relevant puzzle, not to a lecture.
- Do not grade vocabulary. “The boulder doesn’t match the hill” can beat “erratic.”

### 8.4 Example bank (Cedar Hollow)

**Decision: the runoff table**

- “Steeper slope, same water, shorter times — that’s the fair comparison.” (good)
- “The extra water run proves slope doesn’t matter.” (misconception)
- “One steep run was enough.” (incomplete)
- “The table is just a toy; the creek is different so the numbers don’t count.” (over-separation)

**Decision: the muddy creek**

- “Rain on a loose steep slope, then Fox Run, then Pine Creek.” (good)
- “It rained, so the whole creek is muddier.” (misconception)
- “The marsh is always brown, so the marsh did it.” (misconception)
- “Atmosphere, water, and rock were all involved; the willows were in the way, not the cause.” (systems good)

**Decision: two clocks**

- “Last night’s bar is the creek. The mismatched boulder needs a longer clock.” (good)
- “One process did all of it.” (misconception)
- “It’s a glacier because this is Earth Science.” (jargon without evidence)

Each later region needs a similar bank tied to *that region’s* decisions (route choice, Kepler number, mineral tests, forecast miss, etc.).

### 8.5 Summit

Cedar Hollow Summit (Phase 7.9C) is specified in `SUMMIT-TUTOR-ARCHITECTURE.md`. Summit teaches science. It may **not** name a Field Tablet card id or finish Wren’s After Action Report. Wren still handles field next-steps through the guidance HUD. Later regions are not wired.

---

## 9. Mastery / clearance design

### 9.1 Two results only (player-facing)

**FIELD CLEARANCE EARNED** — the Field Service has enough evidence the explorer is prepared for the next environment. The emotional payoff is **the road opens**.

**MORE EVIDENCE NEEDED** — not yet. No FAIL, no percentage, no stars.

### 9.2 Internal model

Reuse and extend the existing mastery engine conceptually:

- **Use evidence** from puzzles (kinds already in Cedar Hollow / High Country / Sunfall profiles, plus new kinds per region).
- **Reasoning evidence** from AAR items.
- **Travel requirements** = the region’s required concepts (existing Topic 1/2/10 lists; proposed lists for 3–12 below).
- Content completion (all discoveries, time played) **never** gates travel.

Proposed travel-required competency IDs for unbuilt regions (internal, no codes):

| Region | Travel-required competencies (internal IDs) |
| --- | --- |
| Dark Sky Basin | spectra, stellar-temp, distance-brightness, hr-place, stellar-mass-life, nucleosynthesis, redshift-pattern, origin-evidence, lookback, bounded-claims |
| Painted Badlands | mineral-id, density, igneous-cooling, sed-environment, metamorphic-parent, transformation-evidence, porosity-perm, competing-id |
| Glacier Country | agents-ice-water, glacial-forms, weathering-types, soil-profile, mass-wasting, source-sink, drainage-pattern, landscape-clocks, hollow-transfer |
| Firepeak | seismic-interior, fault-offset, volcano-products, geothermal-path, plate-motion, boundary-geometry, lahar-siting, convection-model |
| Deep Time Canyon | superposition-wayup, cross-cutting, unconformity, correlation, index-fossil, radiometric, age-conflict, multi-line-history, fault-age-transfer |
| Island Coast | water-budget, infiltration-runoff, groundwater, estuary-mixing, tides-ocean, currents, longshore, tsunami-safety, watershed-coupling |
| Stormlands | station-obs, pressure-wind, fronts, dewpoint, forecast, severe-recognize, hurricane-place, lightning-safety, forecast-revision |
| Icewater Bay | weather-vs-climate, long-record, energy-budget, ice-albedo, local-change-scale, greenhouse-reservoir, ranged-forecast, weather-climate-sort |
| High Sierra | water-source-synthesis, landslide-mitigation, mine-water-tradeoff, fire-wx-route, dam-fault, winter-route, drought-allocation, whole-toolkit |

Topic 1/2/10 keep existing profile IDs (`observation`, `location`, `rotation`, …).

### 9.3 Anti-brute-force (preserve 7.8B)

- Repeated fair trials; unfair tests still run and must be rejected
- Predictions logged before checks
- Software does not complete the scientific move
- Ground truth can veto GIS
- First-try success ≠ revision
- AAR misconceptions catch click-lucky players

### 9.4 Returning to earlier regions

Always allowed for adventure and for optional depth. Not required for clearance except when a transfer puzzle uses a **packet** (GC-09, DT-10, IB-08) so travel is not a gate.

---

## 10. Targeted remediation design

### 10.1 Scope

If understanding is weak, reopen **only relevant puzzles/concepts**. Do not replay the whole region.

Wren language (pattern from existing `remediationVoice`): field-specific, not “you scored 40%.”

### 10.2 Variation (required)

Remediation **changes numbers, conditions, evidence, or locations** so answers cannot be memorized.

| If weak on | Reopen | What changes |
| --- | --- | --- |
| Observation vs interpretation | CH-01 variant | New object pair / sentences |
| Fair test | CH-03 | Times, unfair variable |
| Systems pulse | CH-05 | Other tributary, numbers |
| Scale | HC-03 | Bar, which trail is longer |
| Kepler | SF-03 | New `a` |
| Spectra | DS-01 | New traces |
| Mineral ID | PB-01/10 | New samples |
| Mass wasting | GC-06 | Dip, saturation |
| Half-life | DT-06 | Ratio |
| Water table | IC-03 | Pumping well |
| Forecast | SL-05/10 | Stall vs jump |
| Weather vs climate | IB-01 | Hot-day rhetoric |
| Synthesis | HS-08 | New road alignment |

### 10.3 AAR retry

Retry only failed stems, with **reworded choices** and, if use was also weak, a forced return to the variant puzzle first.

### 10.4 What remediation must not do

- Unlock the next region “to be kind”
- Show the keyed correct sentence from the first attempt
- Turn Summit on as a solution oracle
- Require collecting optional cosmetics

---

## 11. Scaffolding / difficulty progression

| Stage | Scientific independence | Guidance | Wren | Typical puzzle |
| --- | --- | --- | --- | --- |
| Cedar Hollow | Habits | High: what/next/where/already | Present | Fair test, pulse, two clocks |
| High Country | Spatial tools | Medium; incomplete map | Station | Estimate, walk, overlay |
| Sunfall | Models + math | Medium-low; radio | Radio | Compute, then sky |
| Dark Sky | Indirect evidence | Low; phenomenon named | Radio | Choose the instrument |
| Painted Badlands | Tests you choose | Low | Sparse | Battery without order |
| Glacier Country | Multi-agent, rates | Low | Sparse | Ice vs water without the title helping |
| Firepeak | Infer the unseen | Low | Sparse | Waves, vectors |
| Deep Time | Multi-clock | Low | Sparse | Exceptions (overturned, reset ages) |
| Island Coast | Coupled water | Low | Sparse | Budget, wells, tides |
| Stormlands | Time-critical reading | Low; safety is explicit | Radio in storms | Forecast + shelter |
| Icewater Bay | Long time, uncertainty | Low | Sparse | Range, not a fake year |
| High Sierra | Full independence | Situation only | “Where to look” withheld | Unannounced multi-topic |

Safety-critical authentic responses (lightning, tsunami, lahar, wildfire) stay **explicit**. That is ethics, not a spoiler of the science puzzle.

---

## 12. Open-world discovery / reward plan

Adventure loop is separate. **No academic mastery from these.** They may still be scientifically flavored as long as they are optional.

### 12.1 Movement progression (terrain-respecting)

| Unlock (adventure, not science gate) | Where it makes sense | Constraint |
| --- | --- | --- |
| Walk (default) | All | Always available |
| Steady field pace / better boots | After Cedar Hollow fun milestones | Still foot travel |
| Mountain bike | High Country meadows, Island Coast spits, Stormlands roads | No cliffs, deep talus, thick woods, loose dune faces |
| Field Service 4x4 / appropriate vehicle | Later: Stormlands roads, High Sierra graded roads, Island Coast causeway | Not on foot-only trails, marshes, ice tongues, observatory floors |

Vehicles never skip required science that needs walking a contact, a staff, or a scar. They are fun and logistics, not win-buttons.

### 12.2 Cosmetics (course-long)

Jackets, hats, backpacks, patches, tablet skins, campsite decorations, enamel mugs. Earned by optional finds, not by AAR scores.

### 12.3 Per-region optional discoveries (non-academic)

**Cedar Hollow:** fox den; abandoned sugar-house stones; High Look sunrise bench; a stuck boot in the marsh (comedy); cedar-scented journal skin; Wren’s spare mug if you return a lost notebook (environmental storytelling, not a fetch quest chain).

**High Country:** snowfield cornice overlook; surveyor’s lost lunch tin; tarn swimming hole (safe fiction); bike on the meadow trail; ridgeline wind-flag cosmetic; alpine forget-me-not patch.

**Sunfall:** crater-floor echo; night-blooming cactus; observatory cat shadow easter egg; solar-hat cosmetic; sand-sledge toy; meteor-wrong identification joke plaque that stays optional.

**Dark Sky:** truly dark picnic site; satellite streak log (fun, not a puzzle); constellation stories as folklore *labeled as stories*; glow-in-the-dark patch; dome-sleepover cosmetic.

**Painted Badlands:** slot-canyon echo; old prospector cabin; color-band photo spot; fool’s-gold keychain cosmetic; camp-coffee enamel.

**Glacier Country:** ice cave (safe designated); marmot; hanging-valley rainbow; crampon-laces cosmetic (fashion only); kettle-pond skip stones.

**Firepeak:** hot-spring soak (safe pool, not the dangerous vent); fumarole “dragon breath” joke; pumice that floats in a bucket (fun, can lightly nod at density without mastery); volcano-pin cosmetic.

**Deep Time Canyon:** fossil-bench picnic; echo that returns a delayed “hello”; ranger graffiti from 1920s survey; deep-time patch; layer-stripe scarf.

**Island Coast:** tide-pool (watch-don’t-take); bioluminescence night; wreck rib; sea-glass cosmetic; kayak on calm inlet (adventure).

**Stormlands:** storm-light photography spot; tornado-myth roadside plaque (folklore); wetland bird rookery; rain-jacket cosmetic; kite on a safe day.

**Icewater Bay:** calving-watch bench; drowned-stump quiet; aurora optional night (if scientifically plausible at latitude — if not, omit rather than fake); wool cap cosmetic.

**High Sierra:** granite dome overlook; abandoned fire lookout; trail-crew cache; full cosmetic set; 4x4 spur road to a view, not to a required outcrop.

### 12.4 Collectibles rule

Counts (`4 / 12`) may hunger. Names stay hidden until found. **Never** required for clearance.

---

## 13. Hazard opportunities

Architecture only. None of these are implemented in Phase 7.9A. Align with `data/world/hazards.json` and extend scientifically.

| Hazard | Regions | Puzzle hook | Authentic response (no death) |
| --- | --- | --- | --- |
| Flash flood | Glacier Country, High Sierra; desert wash optional later | GC-10, HS fans | Higher ground; do not enter flowing water |
| Thunderstorm / lightning | Stormlands; High Country ridge memory | SL-08 | Sturdy shelter; not ridges or open water |
| Tornado | Stormlands | SL-06 | Interior, lowest level; not windows |
| Hurricane | Island Coast, Stormlands | SL-07 | Evacuate or shelter per forecast and place |
| Landslide | High Country, Glacier Country, High Sierra | HC-09 scar; GC-06; HS-02 | Leave the path; do not return for stuff |
| Earthquake | Firepeak, High Sierra | FP-01, HS-05 | Drop, cover, hold on; aftershocks |
| Volcanic (ash, lahar, lava, gas) | Firepeak | FP-04, FP-08 | Exclusion zones; not lahar valleys |
| Tsunami | Island Coast | IC-08 | Inland and up immediately |
| Wildfire | High Sierra; Painted Badlands optional dry | HS-04 | Leave early on a known route |
| Winter storm / blizzard | Icewater Bay, High Sierra | HS-06 | Shelter; avoid untreated roads and exposed ridges |
| Heat / dehydration (soft) | Sunfall | Not a mastery gate | Shade, water — tone, not a meter |

**Rules:** No health bar. Unsafe choice may **suspend the field operation**, explain, retry. Preparation and understanding affect outcome. Hazards arise from Earth-system processes.

---

## 14. Detailed Cedar Hollow conversion plan

Cedar Hollow remains Topic 1: scientific thinking and Earth systems. It becomes the first **open-world puzzle region**, not a linear pair of missions plus a challenge menu.

### 14.1 Player-facing spine (new)

1. Arrive. Wren: walk it first. Persistent guidance on.
2. **CH-01** What You Can See (boulder + bedrock).
3. **CH-02** Where Did Last Night's Water Go?
4. **CH-03–04** Runoff table + graph (same instrument, two puzzles).
5. **CH-05** After the Rain (systems).
6. **CH-06** Two Clocks (older vs living creek) — ice named only if evidence carries; mastery is clocks, not glacier vocabulary.
7. **CH-07** Systems map.
8. **CH-08** Conflict/revision if not already earned inside CH-05.
9. Return to Wren. **CH-09** + **After Action Report**.
10. Field clearance → High Country opens.

Optional discoveries can be found in any order throughout.

### 14.2 World layout

Keep the existing hollow: station, knob, creek, Fox Run, pond, marsh, High Look, runoff table, rain gauge, washout, staff gauge. Add nothing that turns it into Glacier Country. The boulder and grooves stay as **honest anomalies**.

### 14.3 Guidance

Keep `guidance.js` verbs (OBSERVE, VISIT, COMPARE, MEASURE, RECORD, TEST, PREDICT). Retarget `next`/`where` to the **active puzzle**, not a single hardcoded mission list. Puzzle ID becomes the guidance context.

### 14.4 After Action Report insertion

Replace “challenge concluded = communication mastery” with: challenge-like world work (**CH-05**) generates *use*; AAR generates *reasoning*; both required.

### 14.5 What students should feel

They had a problem in a place. They measured. They were wrong once and fixed it. Wren asked them to defend a choice. The road opened. They also found a fox den that did not matter to clearance — and that was fine.

---

## 15. Phase 7.8B reuse / disposition

Preserve useful foundations. Do not keep old structures merely because they exist.

| 7.8B system | Disposition | Notes |
| --- | --- | --- |
| Persistent guidance HUD | **KEEP** | Retarget to puzzles; still kills interface mystery |
| Observation vs interpretation (`obsint.js`) | **KEEP** | Becomes CH-01; still required before naming |
| Runoff table (`flume.js`) predict-then-time, unfair extra water, repeated trials | **KEEP** | CH-03 core instrument |
| Field data graph from player numbers | **KEEP** | CH-04 |
| World evidence (must walk sites) | **KEEP** | All CH puzzles |
| Pulse predict in After the Rain | **ADAPT INTO PUZZLE** | CH-05 |
| Systems-link (rain + slope + tributary) | **KEEP** | CH-05/CH-07; AAR probes it |
| Genuine revision (conflict, not checkbox) | **KEEP** | CH-08; marsh follow-up remains a conflict seed |
| Anti-brute-force mastery (fair tests, estimates, compute Kepler, walked coordinates) | **KEEP** as course-wide rules | See §9.3 |
| Cross-region transfer (washout; SF window coordinates) | **KEEP** | Template for §7 |
| `where-does-the-water-go` tablet path as *the* pattern mastery | **ADAPT INTO PUZZLE** | CH-02; visiting still required; tablet sequence alone is not enough |
| `reading-the-landscape` glacial hypothesis as Topic 1 content mastery | **ADAPT** / **REPLACE** (content home) | Keep as CH-06 *clocks/evidence*. Do not award Topic 4 glacial-process mastery here. Vocabulary “erratic” stays earned/optional. |
| Landscape process+notes multiple choice as explanation mastery | **REPLACE** | Explanation must cite sorted observations and survive AAR |
| Regional challenge MC as communication mastery | **REPLACE** | Communication = AAR |
| Discoveries (12 optional, names hidden) | **KEEP** as Layer C / adventure | Not clearance |
| Wren voice | **KEEP** | Less procedure over time |
| Field Tablet as instrument, not LMS | **KEEP** | |
| Mastery vs content completion gate | **KEEP** | Add reasoning scores |
| Tools earned by use | **KEEP** | |
| Canvas 2D, local save, no accounts | **KEEP** | Out of scope to change |
| Computed `measureRoute()` as first length | **REMOVE** as mastery path | Already corrected in 7.8B estimate-first; keep that rule |
| “Tight = steep” leaked tooltip | **REMOVE** | Already a 7.8B defect to not revive |
| Labeled GIS “good site” | **REMOVE** | Constraints, then walk |
| Kepler four-button recognition | **REMOVE** | Compute then model (7.8B) |
| Awarding observation on first inspect | **REMOVE** | Already replaced by obs-int-sort |
| Finishing two stories = systems | **REMOVE** | Systems = CH-05/07 + AAR |
| Player-facing standards codes | **REMOVE** (never add) | |
| Summit | **CEDAR HOLLOW (Phase 7.9C)** | Design authority: `SUMMIT-TUTOR-ARCHITECTURE.md`. Not a High Country tutor. |
| Dark Sky playable world | **DO NOT START** | Inventory only |
| Dynamic hazards | **DO NOT IMPLEMENT** | §13 opportunities only |
| `apps/terrainbound/`, DNS, Pages | **DO NOT TOUCH** | |

### 15.1 High Country and Sunfall (not full conversion plans, but disposition)

They already contain 7.8B puzzle-like beats. This architecture **splits** them into the HC-01–10 and SF-01–10 list so they are not one seasonal quest. Implementation later should not keep a single `high-country-geospatial` / `sunfall-solar-system` blob as the only structure.

---

## 16. Remaining curriculum / design gaps

### 16.1 Official standards alignment

Exact NYS ESS / NYSSLS codes are **not in the project**. This architecture covers the **twelve-topic course as specified in TerrainBound data and the Phase 4 reviewed-alignment concept list**. It cannot claim coded PE/DCI completeness until those codes are supplied and mapped.

When codes arrive: fill `placeholderAlignment.code` and mastery `standardsSlot` fields; do not show them to players.

### 16.2 Concepts thin or absent (honest)

These often appear in a 9th–10th grade ESS course / ESRT-style practice. They are **not** fully puzzled here:

| Gap | Why it is a gap | Likely home if added |
| --- | --- | --- |
| Percent error, significant figures, scientific notation as explicit skills | Only implicit in honest measurement | Cedar Hollow Layer B or a short instrument-calibration puzzle |
| Density of Earth / Earth as a whole | PB/FP density of samples only | Firepeak optional |
| Coriolis as required deflection | Avoided formula dump | Stormlands SL-02 extension if owner requires |
| Named cloud types / lapse rates | Dewpoint/fog only | Stormlands optional C |
| El Niño / teleconnections | Not in bible purposes | Icewater Bay optional C |
| Paleomagnetism / apparent polar wander | Plate evidence uses GPS, ages, quakes | Firepeak optional |
| Full ESRT lookup-table isomorphism (NYS exam skill) | Game is not a table-lookup trainer | Separate practice mode if owner wants exam isomorphism — would be a product decision |
| Constellations as science | Folklore only, labeled | Stay optional fun |
| Biosphere depth / ecology | ESS not biology; CH/GC/IB touch lightly | Do not inflate into a life-science course |
| Human population / carrying capacity numbers | Sustainability is qualitative-plus-measurements | High Sierra if owner’s course requires |
| Specific mineral/rock lists (20 minerals to memorize) | ID *method* is taught; lists are not | Optional field guide Layer C |
| Asteroids/comets/impacts as a required SF puzzle | Cratered desert is identity; SF-08 touches | Add SF Layer B impact-ejecta vs volcanic if needed |

### 16.3 Production / pedagogy gaps (not curriculum content)

- Summit built for Cedar Hollow only (see `SUMMIT-TUTOR-ARCHITECTURE.md`); not a course-wide AI tutor
- Dynamic hazards unbuilt
- AAR dialogue engine unbuilt
- Puzzle-state save model (vs current mission/challenge blobs)
- Accessibility of graphs and spectra on school laptops
- Quantitative reading level: keep arithmetic in reach of 9th–10th grade; provide optional scaffold without skipping the compute
- Teacher-facing nothing: still no dashboard (Game Bible non-goal)

### 16.4 Glacial content placement (resolved in this design)

7.8A noted Cedar Hollow glacial evidence as Topic 4 overlap. **Resolution:** CH-06 teaches timescales and evidence. GC-01/09 assess ice as agent. Do not double-award.

---

## Final verdict

**Can the complete *available* 9th–10th grade Earth & Space Sciences curriculum be covered with sufficient depth, practice, transfer, and performance evidence using this architecture?**

**Yes — for the curriculum that actually exists in this project: the twelve-topic NYS ESS teaching-order course, the Topic 1/2/10 competency lists, and the Phase 4 reviewed-alignment concept list — provided the puzzles are implemented as specified, with After Action Reports and targeted remediation.**

**Proof is the §4 matrix, not a slogan.**

- Every Topic 1 habit has introduce (Cedar Hollow), practice (second puzzle), use (later CH and every later region), transfer (especially HC washout, SF window, GC hollow packet, HS independence), and assess (world use + AAR).
- Every Topic 2 geospatial skill has a do-on-the-land puzzle, a later use, and transfer into weather isolines, water tables, lahars, and High Sierra siting.
- Solar-system motion is observed, modeled, computed, predicted, and checked against the sky; tides and seasons transfer into ocean and climate regions.
- Stars/universe, materials, surface processes, interior/plates, history, water/oceans, weather, climate, and resources/hazards/sustainability each have a home region with 8–10 required puzzles, in-region practice, and at least one unannounced transfer — High Sierra is the performance exam of independent selection.
- Phase 4 alignment examples (orbital math, EMS cycles, stellar life/fusion, surface-process models, water properties/effects, convection, plate-motion evidence, Earth-history evidence, atmospheric explanations, climate energy-flow and forecasting, hazard/resource decisions) each appear in named puzzles in §3.

**Not proven, and not claimed:** complete official NYSSLS PE-code coverage (codes not supplied); full NYS ESRT exam-isomorphism; the thin cells in §16.2.

**Instructional bar:** If a later implementation returns to walk-click-read-or-trivia, the matrix fails even if the titles remain. The architecture is sufficient **only if** mystery stays in the science and the assignment stays clear, predictions are checked in the world, and Wren can still catch a lucky clicker in the debrief.

---

*End of Phase 7.9A design document. No game code modified. No commit. No deploy. Dark Sky Basin not started. Summit not implemented.*
