# Dark Sky Basin — Region Architecture (Phase 8A)

**Status:** Design only. Not playable. Not merged. Not deployed.  
**Phase:** 8A — architecture / owner review  
**Baseline:** Studio `main` `f8f777b089434c4ef160fb9fc15f3cec427c3388` · production Summit `db2b7cc04bcbcd548657b5daa5addd42520c0eff`  
**Curriculum authority:** `data/world/bible.json`, `data/world/regions.json`, `docs/PUZZLE-CURRICULUM-ARCHITECTURE.md` §3.4, `docs/GAME-BIBLE.md`  
**Do not implement this document in 8A.**

This is one region. It does not reopen Summit infrastructure, does not move `terrainbound.org`, and does not redesign Wren or Summit.

---

## 0. What this is not

Sunfall Desert already owns Topic 10 **Solar System**: rotation, seasons, orbit, Moon, eclipses, the celestial clock. Dark Sky Basin is **not** a second Sunfall.

The sky here is not a seasons lab, not a Moon-phase trainer, and not “go learn astronomy.” It is a **dark place** where starlight can be treated as evidence about objects the explorer will never walk.

Cedar Hollow taught habits (observe, fair test, evidence vs interpretation, revise, make a case). Those habits transfer. They are not reteached from zero.

---

## 1. Region fantasy

Dark Sky Basin is a high desert hollow ringed by rim mountains. The rims keep town glow out. The night is still dark enough to work. A small Field Service observatory sits on the north rim. The floor is quiet. Two cairns on opposite rims are far enough apart to matter as a baseline.

**Why Wren is here.** After Sunfall, the explorer can time a nearby star (the Sun) and check a model against a desert sky. The Field Service inherited an older basin log that treats two bright “white twins” as the same kind of object because they look the same in the eyepiece. The log is becoming folklore. Wren’s radio: the catalog has to be honest before Painted Badlands, and honesty here means **reading light**, not naming posters.

**The scientific question.** *What can starlight tell you about objects you will never visit?*

**What the player sees immediately.** Arrival is **night**. The basin floor is almost black. The rim is a darker ring against a sky that is actually full. Station windows are dim red. One white dome. No creek sparkle, no noon shadow stick, no runoff table. A painted Field Service emblem. Wren is mostly radio.

**Why the landscape matters.** Spectroscopy fails under dome wash. Parallax needs two places you can walk. A leftover-sky radio test needs a quiet floor, not the station roof. A basin rock is not a geology unit — it is the only object here you *can* pick up, set against stars you cannot.

**Why it can only happen here.** Cedar Hollow woods hide the sky. High Country is about maps underfoot. Sunfall’s station lights and solar program are the wrong observing conditions. This basin exists in the atlas because the rims still keep the night usable.

---

## 2. Curriculum mapping

| Field | Authority |
| --- | --- |
| Region id | `dark-sky-basin` |
| Course order | 4 of 12 |
| Curriculum topic | **11 — Stars & the Universe** |
| Predecessor | Sunfall Desert (Topic 10, playable) |
| Successor | Painted Badlands (Topic 3, future) |
| Core phenomenon | What can starlight tell you about objects you will never visit? |
| Tool to earn | `astro-observation` (light, spectra, distance evidence) |
| Travel competencies (internal IDs) | `spectra`, `stellar-temp`, `distance-brightness`, `hr-place`, `stellar-mass-life`, `nucleosynthesis`, `redshift-pattern`, `origin-evidence`, `lookback`, `bounded-claims` |

Exact NYS ESS / NYSSLS codes are **not in the project** (`placeholderAlignment.code` remains `null`). Do not invent codes. Concepts stay in plain language.

### NY Earth & Space Science relevance (plain language, not coded PEs)

Students practice remote sensing of stars and galaxies: light as information, temperature from color/peak, apparent vs intrinsic brightness, distance evidence, grouping on a luminosity–temperature diagram, mass-dependent stellar lives, origin of heavy elements, redshift–distance pattern, converging origin evidence, lookback time, and **bounded claims**.

### Master vs introduce

| Master before clearance | Introduce, do not master |
| --- | --- |
| Spectra as fingerprints (match to a lamp, not a poster name) | Formal HR class names as vocabulary-first |
| Color/peak vs folklore “red = hotter” | Wien’s law as an equation to memorize |
| Apparent brightness ≠ luminosity; nearer objects can show a baseline shift | Full trigonometric parallax derivation |
| Place observed stars on an unlabeled T vs L diagram | Catalog mnemonics (OBAFGKM recitation) |
| Mass branches lives (not one cartoon lifecycle) | Detailed remnant taxonomy |
| Heavy elements from stars, not “all in the first minutes” | Full nucleosynthesis pathways |
| Redshift–distance **trend** with honest scatter | Named Hubble constant |
| Several lines of origin evidence beat a label | Cosmology as identity politics or theology |
| Light takes time; we see the past | Relativity course |
| What you cannot yet say | Completeness theater |

Sunfall transfer (unannounced): inverse-square / distance-in-the-sky habits, “models accountable to observation,” sky as instrument, time as a logged state. Do not reopen Moon-phase or season puzzles.

---

## 3. Learning goals

By the time the road to Painted Badlands can open, the explorer should be able to:

1. Treat a spectrograph trace as a **seen sentence** about light, distinct from a star’s nickname.
2. Rank stellar temperature from color/peak data and reject fire-color folklore.
3. Separate “looks bright” from “is nearby” using a walked baseline and plates.
4. Place their own measurements on a diagram, then read what the region implies.
5. Predict different end-states from mass, not from a single story every star follows.
6. Connect metal lines (and a basin rock) to stellar production of heavy elements.
7. Read a redshift–distance pattern without calling every red object “receding.”
8. Require **more than one** origin line before a hot-dense-early history.
9. Use lookback time so “happening now” on a poster can be false.
10. Investigate an unlabeled target and **stop at the evidence**.

---

## 4. Misconception map

| ID | Plausible wrong model | Where it should break | Repair (world, not a scold) |
| --- | --- | --- | --- |
| M1 | Eyepiece twins are the same kind of star | DS-01 traces differ | Lamp match vs “it looks white” |
| M2 | Redder = hotter (fire) | DS-02 peak/color | Cool luminous vs hot dim |
| M3 | Brighter = closer always | DS-03 shift vs none | Walked rim baseline |
| M4 | The labeled poster *is* the diagram | DS-04 | Unlabeled axes; player-derived points |
| M5 | Every star goes supernova / black hole | DS-05 remnant mismatch | Branch the model; check spectra |
| M6 | All elements formed equally at the start | DS-06 metal-poor star | Lines absent vs basin silicate |
| M7 | Redshift means “the star is red” | DS-07 lab rest vs shifted lines | Same element, moved lines |
| M8 | One famous name replaces evidence | DS-08 | Horn test; one noisy line stays weak |
| M9 | Telescopes see the present | DS-09 | Nearby variable changes; distant event does not |
| M10 | Naming the object = understanding it | DS-10 / AAR | Bounded claims; overclaim fails Wren |

**Required revision beat:** DS-02 (or the inherited twins log) lets a confident folklore ranking fail against peak/color, then the explorer revises. First-try success is allowed; it does not count as revision. CH-08 habit transfers: conflict, then repair.

---

## 5. World map / location design

One basin. Movement should change **what light you can trust**, not teleport between classrooms.

```
                    N Rim — Observatory (dome, plate desk, Wren radio)
                         |
            West Rim Stake ---- rim trail ---- East Rim Stake
                         |                         |
                         +-------- basin floor ----+
                              Quiet Floor
                           (horn, basin rock)
                         Lamp Bench (south of dome, out of wash)
                         Glow Notch (optional; town-glow leak)
```

| Place | Visual | Scientific job | Observable | How found | Time-varying? | Spatial link |
| --- | --- | --- | --- | --- | --- | --- |
| **North Rim Station** | Dim red windows, white dome, Field Service paint | Home, radio Wren, diagram table, plate archive | Dome instruments; station glow (a problem) | Arrival | Night working default | Overlooks whole basin |
| **Lamp Bench** | Concrete pad, calibration lamp, no trees | Outdoor comparison away from dome wash | Lamp emission lines vs stellar traces | Walk south from dome; inspect prompt when close | Lamp on/off (player) | Must leave the dome to get a fair reference |
| **West Rim Stake** | Cairn, painted baseline mark | End A of parallax baseline | Same catalog star against rim landmarks | Follow rim trail west | Season plates (authored) | Distance to East Stake is the science |
| **East Rim Stake** | Matching cairn | End B | Tiny shift vs background on plates | Walk the rim; do not skip | Season plates | Walking *is* the baseline |
| **Quiet Floor** | Salt-pale pan, almost no vegetation | Darkest + quiet radio; rock you can pick up | Horn hiss by pointing; silicate hand sample | Descend from rim (one trail) | Night; pointing | Away from station lights |
| **Plate Desk** | Indoor archive, drawers, unlabeled envelope | Survey plates, galaxy set, “twins” log | Traces, shifts, redshifts | Inside station after first night walk | Drawers open as investigations require | Same building, different honesty than the dome eyepiece |
| **Glow Notch** (Layer C / warning) | A dip in the west rim; faint town glow | Why this basin exists | Washed spectra / lost faint stars | Optional wander | If “Moon bright” authored state, worse | Contrast with Quiet Floor |
| **Picnic Dark Site** (Layer C) | Flat, folklore plaques labeled as stories | Adventure, not mastery | Satellite streak log (fun) | Optional | Cosmetic | Must not gate clearance |

Discoveries (optional, non-academic, from the 7.9A plan): dark picnic; satellite streak; constellation stories **labeled as stories**; glow patch; dome-sleepover cosmetic.

---

## 6. Investigation sequence

Required Layer A: **DS-01 … DS-10** (IDs locked to the course architecture). Player-facing names use place/phenomenon language.

Play rhythm: 2–5 minutes walking/observing, then 1–3 minutes of a real instrument, then walk again. Long indoor tablet stacks are a defect.

| ID | Player-facing purpose | Concept | Player action | World interaction | Evidence earned | Misconception | Summit can help | Prerequisite | Completion | Feeds |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **DS-01** The twins that aren’t | Two “white” stars in the log; traces disagree | Light as information; spectra | Predict a lamp line in star A; match traces | Dome trace + Lamp Bench reference | Spectrum-match; calibration used | Eyepiece = identity | Trace vs nickname; do not invent lines | Night arrival; walk to lamp | Honest match of lines to lamp, not poster | DS-02, DS-06, DS-07 |
| **DS-02** The cooler ember | Red vs blue; folklore says red is hotter | Color–temperature | Rank from peak/color; reject fire story | Outdoor color + spectrograph peak | Temp-rank | Red = hot | Folklore vs peak; brightness ≠ T | DS-01 | Ranking that survives a bright-cool vs dim-hot pair | DS-04 |
| **DS-03** Two cairns | Equal apparent brightness; only one shifts | Apparent vs intrinsic; distance | Walk west then east; compare season plates | Rim stakes + archive plates | Distance-rank; apparent-vs-absolute | Brighter = closer | Shift is geometry, not “the star jumped” | DS-01; HC spatial (unannounced) | Nearer identified by shift that reverses with baseline | DS-04, DS-09 |
| **DS-04** Unlabeled plot | Place three observed stars on T vs L | HR-style regions | Place points from *their* T and brightness/distance | Dome plot (no “HR” title) | Diagram-placement ×3 | Poster memory; swapped axes | How to read a region after placing, not the click | DS-02, DS-03 | Three placements consistent with prior notes | DS-05 |
| **DS-05** Not one life | Massive hot vs Sun-like; cartoon lifecycle on the wall | Mass-dependent evolution | Branch a model; check a remnant spectrum | Diagram + one outburst plate | Mass-branch prediction checked | All stars supernova | End-state from mass, not storybook | DS-04, DS-01 | Correct branch matches remnant lines | DS-06 |
| **DS-06** What the floor is made of | Metal-poor vs metal-rich; basin silicate | Nucleosynthesis; history in light | Compare metal lines; pick up the rock | Spectrograph + Quiet Floor rock | Nucleosynthesis explanation | All elements at t=0 equally | Rock is connection, not a new geology course | DS-01, DS-05 | Heavy elements require stars | DS-08 |
| **DS-07** Lines that moved | Galaxy plates; lines not at lab rest | Redshift; trend with distance rank | Plot shift vs distance rank; predict a farther plate | Plate Desk | Redshift–distance trend; competing model rejected | Redshift = red star | Same element, moved lines; scatter is honest | DS-01; CH graph habit | Trend named; one competing story fails a prediction | DS-08, DS-09 |
| **DS-08** Three lines, no label | Expansion + abundance note + leftover glow | Origin evidence; inference | Point the horn; require converging lines | Quiet Floor horn + clipboard + DS-07 plot | Multi-line origin explanation | Name replaces evidence | What is still weak if one line is noisy | DS-06, DS-07 | Cannot rest on a single famous word | DS-10 |
| **DS-09** Not tonight | Poster “supernova happening now” | Lookback | Order-of-magnitude from distance; compare nearby variable | Dome + prior distances | Lookback with a number | Telescopes see now | Light travel; nearby vs distant change | DS-03, DS-07 | Poster is wrong for the distant event | DS-10 |
| **DS-10** The unlabeled envelope | Wren: what can you honestly say? | Transfer + uncertainty | Choose instruments; no highlighter | Any prior place | Independent plan + bounded claims | Completeness theater | Honesty about unknowns; no invented magnitudes | DS-01–09 eligible | Claims match collected evidence only | AAR |

Layer B (embedded, not extra homework): stray-light at the dome; Glow Notch as “why we walked to the lamp.”

Layer C: picnic, satellite streaks, folklore plaques.

**Strongest gameplay mechanic:** **walked baselines and stray-light geography** — the player changes what the light can mean by where they stand — plus **spectra as field evidence** (match, don’t memorize). Do not let DS-04 become a worksheet if DS-01–03 never left the dome.

---

## 7. Evidence architecture (Field Tablet)

Reuse the existing tablet. **Do not create a separate astronomy notebook.**

| Category (reuse / extend) | Dark Sky content | Analog |
| --- | --- | --- |
| Notes / observations | Seen sentences: line positions, colors, horn pointing, cairn visits | CH-01 seen vs guessed |
| Evidence cards | Calibration used; temp-rank; distance-rank; diagram placements; mass branch; nucleosynthesis; redshift trend; origin lines; lookback; bounded unlabeled claims | CH puzzle evidence |
| Field data | Player redshift–distance ranks; optional peak-wavelength notes | CH runoff table/graph |
| Sketch | Optional sky sketch of *catalog objects actually marked*, not constellation tests | Landscape sketch |
| Time records | Authored night index + which season plate | Sunfall sky log (do not duplicate Moon columns) |
| Map | Basin rim/floor; cairns as spatial evidence | Field map layers earned by use |

Cards the AAR will accept must be **player-produced**. Software does not auto-complete “hydrogen” because the poster said so.

---

## 8. Sky / time architecture (minimum deterministic model)

**Need night as the working world.** Do not build an astronomy simulator.

| Include | Why it teaches | Minimum model |
| --- | --- | --- |
| Night as default working state | This region is a dark-sky workplace | Reuse Sunfall `sky` minutes only as **night lock** + label; do not ship season/Moon puzzles |
| Authored star/galaxy **catalog** | Objects have properties the player measures | Data file: id, color, peak, apparent brightness, parallaxShiftPx, metalLines, restLines, redshift, distanceRank, massProxy, remnantTag. Deterministic. |
| Pickable catalog objects in the sky | Observation is in the world | Few bright authored targets + decorative starfield |
| Lamp on/off | Fair calibration | Local instrument state |
| Two season **plates** | Parallax reverse | Discrete states `plateA` / `plateB`, not a live year |
| Nearby variable can change “later tonight” | Lookback contrast | One authored jump: `later-tonight` |
| Horn pointing | Origin evidence test | Azimuth/zenith vs wall — local geometry, not CMB physics engine |

| Exclude | Why |
| --- | --- |
| Full n-body / real RA-Dec catalog | Spectacle, not this course |
| Moon-phase curriculum | Sunfall |
| Season-as-topic | Sunfall |
| Real-time hours of waiting | Classroom death |
| Constellation quizzes | Folklore unless labeled Layer C |

If the Moon is present at all, treat it as **glare that can ruin faint work** (authored “bright Moon” optional state), not as a Topic 10 retake.

Summit and puzzles read the **catalog + player measurements**, never a prose description of the sky.

---

## 9. Summit context needs

Summit stays Sasquatch, playful, serious about science. Does not control progression, invent state, or replace Wren.

**Helps:** color-temp folklore; apparent vs luminosity; “the star jumped” vs baseline; redshift ≠ red star; lookback; overclaim; why a single origin line is weak; game-help (“how do I play here”) as basin loop, not CH-02 copy.

**Does not:** pick the HR point; grant clearance; name official catalog IDs the player never measured; invent magnitudes, redshifts, or elements.

**Structured packet (required before hosted Dark Sky science):**

- `regionId: dark-sky-basin`
- `nightState`, `plateSet` (`A`/`B`), `lampOn`
- `catalogIdsObserved[]`
- `measurements`: tracesMatched, tempRank, distanceRank, diagramPlacements, hornPoints, claimsDraft
- `known[]` / `unknown[]` / `expected[]` (truth-packet style)
- last four turns
- **no** free-text sky dump

Until that layer exists, Dark Sky Summit science-talk must stay deterministic or refuse hosted calls. Do not let GPT-OSS infer astronomy from chat.

---

## 10. Wren AAR

Wren is expedition lead. Radio more than body (Game Bible: later regions = problems, not procedures).

**The case to construct:** For the unlabeled envelope (DS-10) — and the inherited twins log — what can you honestly say from light you actually recorded? What must stay unknown?

Pin tablet evidence to Wren claims (same pattern as Cedar Hollow: required / useful / misconception / irrelevant / overclaim).

### FIELD CLEARANCE

Enough evidence that the explorer is prepared for the next environment (Painted Badlands). Internally: the ten travel competencies have use-evidence, and AAR claims hold without overclaim.

Player-facing: no score. The road opens.

Suggested Wren claims (not a quiz):

1. The twins log treated appearance as identity — show the traces.
2. Temperature ranking from color/peak, not fire.
3. Brightness is not distance — show the cairn/plate shift.
4. The unlabeled target: properties you measured, and a sentence you **refuse**.

### MORE EVIDENCE NEEDED

Not FAIL. Keep the notes that hold.

Typical holes: no lamp calibration; still “red is hotter”; no rim walk; diagram from the poster not from measurements; “Big Bang” with one line; unnamed object with a complete story; extra cards that don’t belong on a claim.

---

## 11. Progression

```
Sunfall field clearance
  → travel copy: a high basin where the night is still dark enough to work
  → Dark Sky Basin night arrival
  → DS-01 … DS-10 (required)
  → Wren AAR
  → FIELD CLEARANCE → Painted Badlands remains closed until that later phase
     or MORE EVIDENCE NEEDED → basin stays walkable
```

Optional Layer C never gates travel. `?field=1` debug may force entry later; student UI gets no unlock button.

Save: new region session beside existing journal (Sunfall pattern). Do not rename Cedar Hollow keys.

---

## 12. Mobile implications

- Night palette must stay readable (contrast, not crushed blacks on cheap LCDs).
- Catalog targets: large hit areas, not pixel-hunting constellations.
- Rim walk is the spatial puzzle; do not require three-finger precision.
- Dome traces: pan/zoom; don’t rely on hover.
- Horn pointing: coarse (zenith / wall / horizon), not a radio telescope UI.
- Safe-area padding: Close / Ask Summit / tablet must not sit on the sky picker.
- Keyboard: basin has little typing; don’t make spectra a keyboard exam.

---

## 13. Technical dependencies

| Dependency | Use | Do not |
| --- | --- | --- |
| Existing region/session/save | Fourth playable region | New engine |
| Sunfall sky minutes | Night lock + rare authored jumps | Reteach seasons/Moon |
| Field Tablet / puzzles / AAR | New specs under `data/puzzles`, `data/aar`, `data/mastery` | Second notebook |
| Summit hybrid + Worker | After Dark Sky truth packet | New backend |
| Canvas 2D | Night basin, dome, traces | WebGL skybox as the product |
| `astro-observation` tool | Earned by use | Unlock by opening a menu |

No accounts, multiplayer, cloud saves, or production deploy in Phase 8.

---

## 14. Risks

| Risk | Why it hurts | Mitigation |
| --- | --- | --- |
| **Spectrograph as worksheet** | Highest | Lamp Bench is a walk; traces are world objects; no multiple-choice element names as the primary verb |
| HR diagram as a poster quiz | Feels like school | Unlabeled; points from DS-02/03 only |
| Duplicating Sunfall | Confused identity | Night lock only; no season/Moon mastery |
| Hosted Summit invents astronomy | Trust break | Packet-only; unknown stays unknown |
| Indoor-only observatory | Movement is flavor | Rim baseline + floor horn are required walks |
| Too many indoor plates | Tablet fatigue | Alternate walk / instrument |
| Constellation folklore as science | Dishonest | Layer C, labeled stories |
| Scope: whole cosmos | Never ships | 8B is twins + color-temp + night walk only |

---

## 15. Implementation order (later phases — not 8A)

1. **8B — First playable slice (recommended):** night basin art, station, lamp bench, two authored white stars, DS-01, then DS-02. No galaxies, no horn, no AAR clearance.
2. Rim stakes + plates (DS-03).
3. Unlabeled diagram (DS-04) + mass branch (DS-05).
4. Floor rock + nucleosynthesis (DS-06).
5. Plate desk redshift (DS-07) + horn (DS-08) + lookback (DS-09).
6. Unlabeled envelope (DS-10) + Wren AAR + mastery profile + travel to stay closed (Painted Badlands still future).
7. Summit Dark Sky packet + hosted science-talk for this region.
8. Layer C picnic / cosmetics.

**8A stops at these documents.**

---

## Character and product constraints (locked)

| Role | Dark Sky |
| --- | --- |
| Wren | Radio; frames the dishonest twins log; judges AAR; grants clearance |
| Summit | Sasquatch Earth Science companion; explains light; does not run the expedition |
| Player | Independent field investigator (Game Bible: Sunfall and beyond) |

Preserve science, adventure, and progression loops. No worksheet wrapped in movement.
