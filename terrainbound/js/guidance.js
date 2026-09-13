/**
 * Persistent next-action guidance. Scientific mystery stays.
 * Interface mystery does not.
 */

import { darkSkyGuidance } from "./darksky.js";

const VERBS = ["OBSERVE", "VISIT", "COMPARE", "MEASURE", "RECORD", "TEST", "PREDICT"];

export function fieldGuidance(ctx) {
  const region = ctx.regionId || "cedar-hollow";
  if (region === "high-country") return hcGuidance(ctx);
  if (region === "sunfall-desert") return sfGuidance(ctx);
  if (region === "dark-sky-basin") return dsGuidance(ctx);
  return chGuidance(ctx);
}

function dsGuidance(ctx) {
  return darkSkyGuidance(ctx.dsState || {});
}

function pack(question, verb, next, where, looking, done, pairs = []) {
  return {
    question,
    verb: VERBS.includes(verb) ? verb : "OBSERVE",
    next,
    where,
    lookingFor: looking,
    done,
    pairs
  };
}

function chGuidance(ctx) {
  const mission = ctx.missionState || {};
  const disc = ctx.discoveryState || { foundIds: [] };
  const found = disc.foundIds || [];
  const inv = ctx.invState || {};
  const flume = ctx.flumeState || {};
  const data = ctx.dataState?.datasets?.["cedar-hollow-flow"];
  const challenge = ctx.challengeState || {};
  const obsInt = ctx.obsIntState || { sorts: [] };
  const observed = new Set((mission.observations || []).map((row) => row.featureId || row.id));
  const waterNeed = ["westface-slope", "pine-creek", "mirror-pond", "willow-reach"];
  const waterMissing = waterNeed.filter((id) => !observed.has(id));
  const done = [];
  if (observed.size) done.push(`Field notes: ${observed.size}`);
  if (found.length) done.push(`Finds: ${found.length}`);
  if (inv.measuredIds?.length) done.push(`Comparisons: ${inv.measuredIds.length}`);
  if (flume.trials?.length) done.push(`Table runs: ${flume.trials.length}`);
  if (challenge.observedIds?.length) done.push(`Creek sites: ${challenge.observedIds.length}`);

  const pairs = rockPairs(found, inv);

  if (waterMissing.length) {
    const names = {
      "westface-slope": "Westface Slope",
      "pine-creek": "Pine Creek",
      "mirror-pond": "Mirror Pond",
      "willow-reach": "Willow Reach"
    };
    const next = names[waterMissing[0]];
    return pack(
      "Where did last night's water go?",
      "VISIT",
      `Visit ${next} and inspect the ground.`,
      next,
      "High ground, a creek, a pause, and water still moving downhill.",
      done,
      pairs
    );
  }
  if (!mission.concluded) {
    return pack(
      "Where did last night's water go?",
      "RECORD",
      "Open the Field Tablet and tap the water path in downhill order.",
      "Field Tablet · notes",
      "Places you actually stood, high to low.",
      done,
      pairs
    );
  }

  const sorts = (obsInt.sorts || []).filter((row) => row.ok).length;
  if (found.includes("glacial-erratic") && sorts < 1) {
    return pack(
      "What can you see, and what are you guessing?",
      "COMPARE",
      "At the strange boulder, sort a seen sentence from a guessed sentence.",
      "North trail boulder",
      "Color, grain, and size — not a story about ice yet.",
      done,
      pairs
    );
  }
  if (found.includes("exposed-bedrock") && sorts < 2) {
    return pack(
      "What can you see, and what are you guessing?",
      "COMPARE",
      "At the knob's bare rock, sort a seen sentence from a guessed sentence.",
      "East face of Granite Knob",
      "Lines in the rock versus a guess about what made them.",
      done,
      pairs
    );
  }
  if (!found.includes("glacial-erratic") || !found.includes("exposed-bedrock") || sorts < 2) {
    const where = found.includes("glacial-erratic") ? "East face of Granite Knob" : "North trail, below Granite Knob";
    return pack(
      "What can you see, and what are you guessing?",
      "VISIT",
      found.includes("glacial-erratic")
        ? "Visit the knob's own rock. Sort what you can see from a guess."
        : "Visit the boulder on the north trail that does not match the hill.",
      where,
      "Color, grain, and lines — not a story about how they got here.",
      done,
      pairs
    );
  }

  if (!flume.prediction) {
    return pack(
      "What makes water move faster?",
      "PREDICT",
      "At the runoff table, predict which slope will finish first. Then test it.",
      "Runoff table by the station",
      "One change at a time. Same channel. Same distance.",
      done,
      pairs
    );
  }
  if (!ctx.hasFairComparison) {
    return pack(
      "What makes water move faster?",
      "TEST",
      "Run at least two fair trials on each slope. Extra water is a second change — not a fair test.",
      "Runoff table by the station",
      "Times you can compare.",
      done,
      pairs
    );
  }
  if (!data?.interpreted) {
    return pack(
      "What do your times show?",
      "RECORD",
      "Graph the runs. Name the pattern the numbers actually support.",
      "Field Tablet · data",
      "Overall pattern, not one exact second.",
      done,
      pairs
    );
  }

  const roles = new Set(challenge.workingRoles || []);
  if (!challenge.concluded) {
    if (!challenge.pulsePredict) {
      return pack(
        "Why is part of Pine Creek muddier this morning?",
        "PREDICT",
        "Predict where the brown pulse should first show, then walk the creek to test it.",
        "Pine Creek — start at the station",
        "Rain, loose ground, and a tributary — not a guess from the porch.",
        done,
        pairs
      );
    }
    if (!roles.has("weather")) {
      return pack(
        "Why is part of Pine Creek muddier this morning?",
        "VISIT",
        "Visit the rain gauge. Last night's weather is one part of the system.",
        "Rain gauge by the station",
        "Whether it actually rained.",
        done,
        pairs
      );
    }
    if (!roles.has("join")) {
      return pack(
        "Why is part of Pine Creek muddier this morning?",
        "MEASURE",
        "Visit where Fox Run meets Pine Creek and measure clarity.",
        "Fox Run confluence",
        "Where the creek first changes.",
        done,
        pairs
      );
    }
    if (!roles.has("source")) {
      return pack(
        "Why is part of Pine Creek muddier this morning?",
        "OBSERVE",
        "Visit the fresh scar on Westface, above Fox Run.",
        "Westface scar",
        "Loose soil that could feed the tributary.",
        done,
        pairs
      );
    }
    return pack(
      "Why is part of Pine Creek muddier this morning?",
      "RECORD",
      "Build an explanation from rain, slope, and tributary — then check the marsh follow-up.",
      "After the rain",
      "A system, not a single culprit.",
      done,
      pairs
    );
  }

  if (!inv.measuredIds?.includes("rock-compare")) {
    return pack(
      "Two clocks in the hollow",
      "COMPARE",
      "Compare the boulder with the knob rock — both notes must be in the pair.",
      "Boulder and east-face bedrock",
      "Whether the two rocks match. Last night's rain cannot park that boulder.",
      done,
      pairs
    );
  }
  if (!inv.measuredIds?.includes("bedrock-grooves")) {
    return pack(
      "Two clocks in the hollow",
      "OBSERVE",
      "Examine the knob surface itself. Look for lines in the rock.",
      "East face of Granite Knob",
      "Marks on bedrock, not a name for them yet.",
      done,
      pairs
    );
  }
  if (!inv.measuredIds?.includes("valley-shape")) {
    return pack(
      "Two clocks in the hollow",
      "OBSERVE",
      "From High Look, study the shape of the whole valley.",
      "High Look rail",
      "The bowl of the hollow — sharp or rounded.",
      done,
      pairs
    );
  }
  if (!inv.measuredIds?.includes("sediment-sort")) {
    return pack(
      "Two clocks in the hollow",
      "COMPARE",
      "Stand on both sides of the creek bend. Last night's creek is still taking and leaving.",
      "Cut bank and sand bar",
      "A living creek clock, not just the older bowl.",
      done,
      pairs
    );
  }
  if (!inv.concluded) {
    return pack(
      "Two clocks in the hollow",
      "RECORD",
      "In the tablet, attach last night's creek notes and the older landscape notes.",
      "Field Tablet · evidence",
      "A modern-only story cannot carry the boulder. An ancient-only story cannot carry the sand bar.",
      done,
      pairs
    );
  }

  const puzzles = ctx.puzzleState || {};
  if (!puzzles.systems?.concluded) {
    const sys = ctx.systemsPrompt;
    return pack(
      "Is this one event with parts?",
      sys?.kind === "predict" ? "PREDICT" : "VISIT",
      sys?.prompt || "Map the places that took part last night. Tap the sketch or walk there.",
      sys?.where || "Hollow sketch, or the land itself",
      "Source, slope, path, store, and what took a hit — not four separate stories.",
      done,
      pairs
    );
  }
  const revised =
    (inv.concluded && (inv.attempts || 0) > 1) ||
    Boolean(challenge.conflicted && challenge.revised) ||
    Boolean(puzzles.conflict?.repaired);
  if (!revised) {
    return pack(
      "When the story breaks",
      "RECORD",
      "A crate note and a clear station reach conflict with a tidy whole-creek story. Narrow the case.",
      "Talk to Wren at the station",
      "Revision is dropping a false cause, not adding every brown place.",
      done,
      pairs
    );
  }
  if (puzzles.aar?.result !== "clearance") {
    return pack(
      "Make the case",
      "RECORD",
      "Show Wren the tablet notes that actually support the claim. Pin evidence. Drop what doesn't belong.",
      "Cedar Hollow Station",
      "Field clearance, or more evidence needed — not a score.",
      done,
      pairs
    );
  }

  return pack(
    "Cedar Hollow field work",
    "RECORD",
    "Field clearance is earned. High Country is open when you want the mountains.",
    "World map",
    "The hollow is still here.",
    done,
    pairs
  );
}

function rockPairs(found, inv) {
  return [
    {
      id: "rock-compare",
      left: { label: "Boulder", have: found.includes("glacial-erratic") },
      right: { label: "Knob bedrock", have: found.includes("exposed-bedrock") },
      compared: Boolean(inv.measuredIds?.includes("rock-compare"))
    },
    {
      id: "sediment-sort",
      left: { label: "Outside bend", have: found.includes("cut-bank") },
      right: { label: "Inside bend", have: found.includes("point-bar") },
      compared: Boolean(inv.measuredIds?.includes("sediment-sort"))
    }
  ];
}

function hcGuidance(ctx) {
  const hc = ctx.hcState || {};
  const markers = Object.keys(hc.markers || {}).length;
  const done = [];
  if (markers) done.push(`Markers: ${markers}`);
  if (hc.scaleEstimates?.length) done.push(`Scale estimates: ${hc.scaleEstimates.length}`);
  if (hc.cacheFound) done.push("Cache located");
  if (hc.terrainCompares?.length) done.push(`Slopes read: ${hc.terrainCompares.length}`);
  if (hc.stakes?.length) done.push(`Stakes: ${hc.stakes.length}`);

  if (markers < 2) {
    return pack(
      "Where are you?",
      "RECORD",
      "Walk to a brass cap and record a live reading while you stand on it.",
      "Trailhead or tarn dock marker",
      "A pair of numbers that belongs to this place, not a nearby slope.",
      done
    );
  }
  if (!hc.cacheFound) {
    return pack(
      "Where is the spare instrument cache?",
      "VISIT",
      "Use the live coordinates. Walk until your reading matches the cache pair.",
      "East of the meadow trail — no signboard",
      "A coordinate pair, not a labeled landmark.",
      done
    );
  }
  if ((hc.scaleEstimates || []).length < 2) {
    const which = (hc.scaleEstimates || []).includes("west-switchback") ? "east meadow trail" : "west switchback";
    return pack(
      "How far is the ridge?",
      "MEASURE",
      `Use the map scale bar. Estimate the ${which}, then check it against the land.`,
      "Field Tablet · map",
      "Distance from the scale, not a number the tablet invents for you.",
      done
    );
  }
  if (!hc.routeCompared) {
    return pack(
      "Which trail for a heavy case?",
      "COMPARE",
      "Compare both measured trails. Steepness matters more than minutes.",
      "Ridge junction",
      "Distance and rise you estimated.",
      done
    );
  }
  if ((hc.terrainCompares || []).length < 2) {
    return pack(
      "How does the map show steep ground?",
      "OBSERVE",
      "Stand on the west cliff, then the east meadow. On topo, how close do the lines sit?",
      "West cliff, then east meadow",
      "Line spacing you read. The land does not print the answer.",
      done
    );
  }
  if ((hc.stakes || []).length < 3 || !hc.contourOk) {
    return pack(
      "What do equal elevations share?",
      "RECORD",
      "Read stakes in the uncharted basin. Connect the ones that share 1400 m.",
      "Northeast basin",
      "Equal numbers belong on one line.",
      done
    );
  }
  if (!hc.profileMatch) {
    return pack(
      "What lies between the junction and the mast?",
      "PREDICT",
      "Guess the side view from the map first. Then generate the profile.",
      "Ridge survey, looking north",
      "Rise and dip you cannot see in plan view.",
      done
    );
  }
  if (!hc.slopePredict) {
    return pack(
      "Why did the west switchback fail?",
      "PREDICT",
      "At the broken trail, predict which slope sheds water faster after rain. Use what Cedar Hollow already taught.",
      "West switchback washout",
      "Steep vs gentle ground — no new lesson.",
      done
    );
  }
  if (!hc.imageryCompared) {
    return pack(
      "Does the sketch still match the ground?",
      "COMPARE",
      "Look at the newer image and stand on the washout.",
      "West switchback",
      "A scar the old sketch still draws as a trail.",
      done
    );
  }
  if (!hc.gisOk) {
    return pack(
      "Where can a pad actually sit?",
      "COMPARE",
      "Turn on water and elevation. Reject pads that are wet or a cliff. Walk the ground if the layers disagree.",
      "Three unlabeled pads",
      "Which layer tells the truth for this decision.",
      done
    );
  }
  if (!hc.challengeOk) {
    return pack(
      "How do you reach the radio site?",
      "RECORD",
      "Plan a route you can defend with the washout, the profile, and the trails that still exist.",
      "Ridgeline Station map board",
      "A walkable line, not the shortest sketch line.",
      done
    );
  }
  return pack(
    "High Country field work",
    "RECORD",
    "The map tools stay in the tablet. Sunfall asks you to use them without a new lecture.",
    "Field Tablet · Field Record",
    "A defended route.",
    done
  );
}

function sfGuidance(ctx) {
  const sf = ctx.sfState || {};
  const done = [];
  if (sf.shadows?.length) done.push(`Shadows: ${sf.shadows.length}`);
  if (sf.seasonObs?.length) done.push(`Season noons: ${sf.seasonObs.length}`);
  if (sf.moonLog?.length) done.push(`Moon logs: ${sf.moonLog.length}`);
  if (sf.kepler?.ok) done.push("Sandskip period checked");

  if ((sf.shadows || []).length < 3) {
    const slot = ["morning", "noon", "afternoon"].find((id) => !(sf.shadows || []).some((row) => row.slot === id));
    return pack(
      "Why does the shadow move?",
      "MEASURE",
      `Stand at the solar marker. Use the clock to reach ${slot || "daylight"}, then record the shadow.`,
      "Solar marker east of the dome",
      "Length, direction, and time. Do not name the cause yet.",
      done
    );
  }
  if (sf.rotationExplain !== "earth-rotates") {
    return pack(
      "Why does the shadow move?",
      "RECORD",
      "Three shadows are in the tablet. Explain what actually moved.",
      "Solar marker",
      "Apparent path versus Earth's rotation.",
      done
    );
  }
  if ((sf.seasonObs || []).length < 3) {
    return pack(
      "Why is noon different in January and July?",
      "MEASURE",
      "Same post. Clock to winter, equinox, and summer — noon each time.",
      "Solar marker",
      "Sun height, day length, and Earth–Sun distance.",
      done
    );
  }
  if (sf.seasonExplain !== "tilt") {
    return pack(
      "Why is noon different in January and July?",
      "COMPARE",
      "Compare the three noon rows. Distance may not point the way you expect.",
      "Solar marker / tablet",
      "Which number actually tracks summer.",
      done
    );
  }
  if (!sf.orbit?.measured) {
    return pack(
      "How does an orbit change speed?",
      "MEASURE",
      "At the orbit table, change eccentricity and record perihelion against aphelion.",
      "Orbit table in the dome",
      "Distance and speed at two ends of the same path.",
      done
    );
  }
  if (!sf.kepler?.ok) {
    return pack(
      "When does Sandskip-1 return?",
      "PREDICT",
      "a = 4 AU. Use P² = a³ (P in years). Enter the period, then advance the model to check.",
      "Orbit table",
      "A number you compute, not a multiple-choice list.",
      done
    );
  }
  if (!sf.moonGeometry) {
    return pack(
      "Why does the Moon change shape?",
      "PREDICT",
      "On the alignment model, predict the phase from Sun–Earth–Moon positions. Then check it from the mesa at night.",
      "Dome model, then mesa rim",
      "Geometry first. The sky second.",
      done
    );
  }
  if ((sf.moonLog || []).length < 2) {
    return pack(
      "Why does the Moon change shape?",
      "OBSERVE",
      "Walk to the mesa rim at night and log the Moon. Station lights stay in the basin.",
      "West mesa rim",
      "The phase you predicted.",
      done
    );
  }
  if (!sf.eclipse?.understood) {
    return pack(
      "Why isn't there an eclipse every month?",
      "PREDICT",
      "Predict whether this alignment eclipses. Try tilt on and tilt off. The model should disagree with 'every month'.",
      "Alignment model on the dome table",
      "A hit and a miss, then a reason.",
      done
    );
  }
  if (!sf.tides?.compared) {
    return pack(
      "Do Moon and Sun leave a fingerprint in tide range?",
      "PREDICT",
      "Before opening the full table, predict range at new Moon. Then check the coastal station numbers.",
      "Coastal desk",
      "Spring versus neap from geometry, not a sentence that copies the table.",
      done
    );
  }
  if (!sf.planets?.classified) {
    return pack(
      "Which worlds behave alike?",
      "COMPARE",
      "Sort the planet log by density and distance. Do not memorize the names.",
      "Planet log",
      "A relationship, not a list.",
      done
    );
  }
  if (!sf.challenge?.ok) {
    return pack(
      "Where should we observe the faint return?",
      "VISIT",
      "The target pair is on the tablet. Walk to those coordinates. Night, thin Moon, and the period you computed.",
      "Use the map — the rims are not labeled as answers",
      "Dark sky, open horizon, and the orbit you already checked.",
      done
    );
  }
  return pack(
    "Sunfall observing campaign",
    "RECORD",
    "The window is written. Dark Sky Basin stays closed until a later season.",
    "Field Tablet · Field Record",
    "A plan the sky can test.",
    done
  );
}

export function guideLine(guide) {
  if (!guide) return "";
  return `${guide.verb} · ${guide.next}`;
}
