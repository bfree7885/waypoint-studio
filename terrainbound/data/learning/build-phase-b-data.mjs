#!/usr/bin/env node
/**
 * One-shot writer for Phase B learning JSON. Run from repo root:
 * node terrainbound/data/learning/build-phase-b-data.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const world = JSON.parse(fs.readFileSync(path.join(dir, "../world/regions.json"), "utf8"));
const bible = JSON.parse(fs.readFileSync(path.join(dir, "../world/bible.json"), "utf8"));

const TITLE_SOURCE = "terrainbound/data/world/regions.json curriculumTitle";
const BIBLE_PURPOSE = "terrainbound/data/world/bible.json curriculumPurpose";
const MASTERY = "terrainbound/data/mastery/*.json competency";
const SUMMIT = "terrainbound/data/summit/concepts.json";
const PUZZLE = "terrainbound/docs/PUZZLE-CURRICULUM-ARCHITECTURE.md §9.2 travel-required competencies";
const PLACEHOLDER_SEP = "terrainbound/data/curriculum/placeholders.json sciencePractice";

const shortTitles = {
  1: "Scientific Thinking",
  2: "Maps & GIS",
  3: "Earth's Materials",
  4: "Surface Processes",
  5: "Interior & Tectonics",
  6: "Earth's History",
  7: "Weather",
  8: "Climate",
  9: "Water & Oceans",
  10: "Solar System",
  11: "Stars & the Universe",
  12: "Resources & Hazards"
};

const courseOrder = world.courseOrderTopicNumbers;
function topicId(n) {
  return `topic-${String(n).padStart(2, "0")}`;
}
function coursePrereq() {
  return [];
}

function regionForTopic(n) {
  return world.regions.find((row) => row.curriculumTopic === n);
}

function bibleForRegion(id) {
  return bible.regions.find((row) => row.id === id);
}

const seps = [
  {
    id: "sep-asking-questions",
    title: "Asking questions and defining problems",
    placeholderIds: ["topic-1-scientific-habits"]
  },
  {
    id: "sep-planning-investigations",
    title: "Planning and carrying out investigations",
    placeholderIds: ["water-movement-through-terrain", "weathering-and-bedrock"]
  },
  {
    id: "sep-analyzing-data",
    title: "Analyzing and interpreting data",
    placeholderIds: ["interpreting-landforms", "glacial-processes", "interpreting-geologic-evidence"]
  },
  {
    id: "sep-argument-from-evidence",
    title: "Engaging in argument from evidence",
    placeholderIds: ["evidence-based-explanation"]
  },
  {
    id: "sep-constructing-explanations",
    title: "Constructing explanations",
    placeholderIds: ["transported-sediment", "constructing-explanations-from-evidence"]
  },
  {
    id: "sep-developing-models",
    title: "Developing and using models",
    placeholderIds: ["erosion-and-deposition", "landscape-change", "scale-time-relationships"]
  },
  {
    id: "sep-obtaining-information",
    title: "Obtaining, evaluating, and communicating information",
    placeholderIds: ["wetlands-and-groundwater"]
  }
];

function concept({
  id,
  name,
  summary,
  topicIds,
  related = [],
  evidenceSource,
  evidenceKind,
  elicitedNow = false
}) {
  return {
    id,
    name,
    summary,
    topicIds,
    standardIds: [],
    relatedConceptIds: related,
    evidenceSource,
    evidenceKind,
    elicitedNow
  };
}

const concepts = [
  concept({
    id: "observation",
    name: "Observation",
    summary: "Distinguish what was actually observed from an interpretation.",
    topicIds: ["topic-01"],
    related: ["interpretation", "evidence"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "interpretation",
    name: "Interpretation",
    summary: "The story attached after notes exist. It can be wrong even when the observation is real.",
    topicIds: ["topic-01"],
    related: ["observation"],
    evidenceSource: SUMMIT,
    evidenceKind: "summit-concept",
    elicitedNow: true
  }),
  concept({
    id: "evidence",
    name: "Evidence",
    summary: "Gather relevant observations and measurements that can support or weaken a claim.",
    topicIds: ["topic-01"],
    related: ["observation", "explanation"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "patterns",
    name: "Patterns",
    summary: "Recognize meaningful patterns in data or the environment — not a one-off.",
    topicIds: ["topic-01"],
    related: ["field-data"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "variables",
    name: "Variables",
    summary: "Use measurements and recognize relationships among variables. A fair test changes one thing on purpose.",
    topicIds: ["topic-01"],
    related: ["fair-test", "slope"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "fair-test",
    name: "Fair test",
    summary: "A fair test changes one thing, keeps the rest the same, and repeats the run.",
    topicIds: ["topic-01"],
    related: ["variables"],
    evidenceSource: SUMMIT,
    evidenceKind: "summit-concept",
    elicitedNow: true
  }),
  concept({
    id: "field-data",
    name: "Field data",
    summary: "Interpret a graph, table, or field dataset.",
    topicIds: ["topic-01"],
    related: ["patterns"],
    evidenceSource: "terrainbound/data/mastery/cedar-hollow.json competency id data",
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "systems",
    name: "Earth systems",
    summary: "Link atmosphere, hydrosphere, and geosphere in one event — not by finishing two unrelated stories.",
    topicIds: ["topic-01"],
    related: ["runoff", "watershed-coupling"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "explanation",
    name: "Explanation",
    summary: "Construct an explanation supported by evidence.",
    topicIds: ["topic-01"],
    related: ["evidence", "revision"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "revision",
    name: "Revision",
    summary: "Revise a model or explanation when evidence conflicts with it. First-try success is not revision.",
    topicIds: ["topic-01"],
    related: ["explanation", "bounded-claims"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "communication",
    name: "Communication",
    summary: "Communicate a defensible conclusion.",
    topicIds: ["topic-01"],
    related: ["explanation"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "runoff",
    name: "Runoff",
    summary: "Rainwater moving over the ground instead of soaking in right away.",
    topicIds: ["topic-01", "topic-09"],
    related: ["slope", "infiltration-runoff", "storage"],
    evidenceSource: SUMMIT,
    evidenceKind: "summit-concept",
    elicitedNow: true
  }),
  concept({
    id: "slope",
    name: "Slope",
    summary: "How steep the ground is. Water on a steeper slope usually gets where it is going sooner.",
    topicIds: ["topic-01"],
    related: ["gradient", "runoff", "gravity"],
    evidenceSource: SUMMIT,
    evidenceKind: "summit-concept",
    elicitedNow: true
  }),
  concept({
    id: "gravity",
    name: "Gravity",
    summary: "Gravity pulls water downhill. It does not pull water up Granite Knob.",
    topicIds: ["topic-01"],
    related: ["slope", "runoff"],
    evidenceSource: SUMMIT,
    evidenceKind: "summit-concept",
    elicitedNow: true
  }),
  concept({
    id: "storage",
    name: "Storage",
    summary: "Storage holds water for a while. It can change timing without starting the flood.",
    topicIds: ["topic-01"],
    related: ["runoff", "groundwater"],
    evidenceSource: SUMMIT,
    evidenceKind: "summit-concept",
    elicitedNow: true
  }),
  concept({
    id: "downstream",
    name: "Downstream",
    summary: "The direction water already chose — toward lower ground.",
    topicIds: ["topic-01"],
    related: ["runoff", "systems"],
    evidenceSource: SUMMIT,
    evidenceKind: "summit-concept",
    elicitedNow: true
  }),
  concept({
    id: "timescale",
    name: "Timescale",
    summary: "How long a process needs. Last night is one clock. A mismatched boulder needs a longer one.",
    topicIds: ["topic-01", "topic-06"],
    related: ["landscape-clocks", "multi-line-history"],
    evidenceSource: SUMMIT,
    evidenceKind: "summit-concept",
    elicitedNow: true
  }),
  concept({
    id: "cause",
    name: "Cause",
    summary: "What actually made the change. Being nearby is not enough.",
    topicIds: ["topic-01"],
    related: ["correlation", "explanation"],
    evidenceSource: SUMMIT,
    evidenceKind: "summit-concept",
    elicitedNow: true
  }),
  concept({
    id: "correlation",
    name: "Correlation",
    summary: "Two things can happen together without one causing the other.",
    topicIds: ["topic-01"],
    related: ["cause"],
    evidenceSource: SUMMIT,
    evidenceKind: "summit-concept",
    elicitedNow: true
  }),
  concept({
    id: "location",
    name: "Location",
    summary: "Use coordinates as a pair of values to establish where a place is.",
    topicIds: ["topic-02"],
    related: ["scale"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "scale",
    name: "Scale",
    summary: "Use map scale to measure or compare distance on the land.",
    topicIds: ["topic-02"],
    related: ["location", "gradient"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "elevation",
    name: "Elevation",
    summary: "Read height above a datum and compare relief.",
    topicIds: ["topic-02"],
    related: ["contours", "gradient"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "contours",
    name: "Contours",
    summary: "Connect what the land looks like underfoot with contour spacing and shape.",
    topicIds: ["topic-02"],
    related: ["elevation", "profile"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "gradient",
    name: "Gradient",
    summary: "Use elevation and distance to reason about steepness for a real travel problem.",
    topicIds: ["topic-02"],
    related: ["slope", "scale", "elevation"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "profile",
    name: "Profile",
    summary: "Translate a plan-view map into a side-view cross-section.",
    topicIds: ["topic-02"],
    related: ["contours"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "gis",
    name: "GIS layers",
    summary: "Combine more than one spatial layer to answer a field question.",
    topicIds: ["topic-02"],
    related: ["remote", "decision"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "remote",
    name: "Remote sensing",
    summary: "Use remotely sensed imagery with field and map evidence.",
    topicIds: ["topic-02"],
    related: ["gis", "representation"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "decision",
    name: "Geospatial decision",
    summary: "Use geospatial evidence to choose and defend a route.",
    topicIds: ["topic-02"],
    related: ["gis", "gradient"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "spatial",
    name: "Spatial patterns",
    summary: "Identify spatial relationships among terrain, water, trails, and features.",
    topicIds: ["topic-02"],
    related: ["gis"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "representation",
    name: "Map representation",
    summary: "Notice that different representations of one place reveal different properties.",
    topicIds: ["topic-02"],
    related: ["gis", "remote"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "rotation",
    name: "Earth rotation",
    summary: "Explain apparent daily solar motion using Earth's rotation and recorded shadows.",
    topicIds: ["topic-10"],
    related: ["seasons"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "seasons",
    name: "Seasons",
    summary: "Use tilt, Sun angle, and daylight — not Earth–Sun distance — to explain seasonal cycles.",
    topicIds: ["topic-10"],
    related: ["rotation"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "orbit",
    name: "Orbit shape",
    summary: "Interpret elliptical geometry and changing speed with distance.",
    topicIds: ["topic-10"],
    related: ["math-orbit", "model"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "math-orbit",
    name: "Mathematical orbit",
    summary: "Use a simplified period–distance relation to predict a return and check it.",
    topicIds: ["topic-10"],
    related: ["orbit", "prediction"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "moon",
    name: "Moon phases",
    summary: "Explain and predict phase from Earth–Moon–Sun geometry.",
    topicIds: ["topic-10"],
    related: ["eclipses", "tides-ocean"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "eclipses",
    name: "Eclipses",
    summary: "Use orbital tilt to explain why eclipses do not happen every month.",
    topicIds: ["topic-10"],
    related: ["moon"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "celestial-data",
    name: "Celestial data",
    summary: "Interpret remote tide records and planetary tables without memorizing lists.",
    topicIds: ["topic-10"],
    related: ["moon", "prediction"],
    evidenceSource: "terrainbound/data/mastery/sunfall-desert.json competency id data / localCompetency celestial-data",
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "prediction",
    name: "Observation planning",
    summary: "Make and test a defensible observing plan, and revise it if the sky disagrees.",
    topicIds: ["topic-10"],
    related: ["math-orbit", "revision"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "model",
    name: "Sky model",
    summary: "Use or revise an orbital model based on evidence.",
    topicIds: ["topic-10"],
    related: ["orbit"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "spectra",
    name: "Spectra as evidence",
    summary: "Use spectral structure, not appearance, to compare sources.",
    topicIds: ["topic-11"],
    related: ["stellar-temp", "redshift-pattern"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "stellar-temp",
    name: "Stellar temperature",
    summary: "Rank temperature from peak/color evidence, not fire folklore.",
    topicIds: ["topic-11"],
    related: ["spectra"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "distance-brightness",
    name: "Brightness vs distance",
    summary: "Separate apparent brightness from distance using a walked baseline.",
    topicIds: ["topic-11"],
    related: ["hr-place"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "hr-place",
    name: "Diagram from measurements",
    summary: "Place stars on unlabeled axes from player measurements.",
    topicIds: ["topic-11"],
    related: ["stellar-temp", "distance-brightness"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "stellar-mass-life",
    name: "Stellar lives and mass",
    summary: "Show that initial mass branches stellar futures.",
    topicIds: ["topic-11"],
    related: ["hr-place", "nucleosynthesis"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "nucleosynthesis",
    name: "Origin of some elements",
    summary: "Connect basin rock and metal lines without claiming all elements were made in stars.",
    topicIds: ["topic-11"],
    related: ["stellar-mass-life", "origin-evidence"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "redshift-pattern",
    name: "Redshift as shifted lines",
    summary: "Treat redshift as a shifted line pattern, not a red color.",
    topicIds: ["topic-11"],
    related: ["spectra", "origin-evidence"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "origin-evidence",
    name: "Converging origin evidence",
    summary: "Assemble expansion, leftover glow, and abundance rather than a slogan.",
    topicIds: ["topic-11"],
    related: ["redshift-pattern", "lookback"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "lookback",
    name: "Lookback time",
    summary: "Refuse present-tense claims for distant light.",
    topicIds: ["topic-11"],
    related: ["origin-evidence", "bounded-claims"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "bounded-claims",
    name: "Bounded claims",
    summary: "Separate observed, inferred, unknown, and refused overclaims.",
    topicIds: ["topic-11"],
    related: ["revision", "lookback"],
    evidenceSource: MASTERY,
    evidenceKind: "mastery-competency",
    elicitedNow: true
  }),
  concept({
    id: "rain-shadow",
    name: "Rain shadow",
    summary: "A mountain barrier lifts moist air on the windward side and leaves drier country to leeward.",
    topicIds: ["topic-07"],
    related: ["station-obs"],
    evidenceSource: "data/deep-forest-dispatch/stories/mount-hood-rain-shadow.json concepts",
    evidenceKind: "dfd-story-concept"
  }),
  concept({
    id: "mineral-id",
    name: "Mineral identification",
    summary: "Identify minerals from tested properties, not from a poster name.",
    topicIds: ["topic-03"],
    related: ["density", "competing-id"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "density",
    name: "Density",
    summary: "Density as a measured property used in identification.",
    topicIds: ["topic-03"],
    related: ["mineral-id"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "igneous-cooling",
    name: "Igneous cooling",
    summary: "Cooling history recorded in igneous texture and related evidence.",
    topicIds: ["topic-03"],
    related: ["transformation-evidence"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "sed-environment",
    name: "Sedimentary environment",
    summary: "Formation environment written in sedimentary materials.",
    topicIds: ["topic-03"],
    related: ["transformation-evidence"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "metamorphic-parent",
    name: "Metamorphic parent",
    summary: "Parent rock and conditions implied by metamorphic evidence.",
    topicIds: ["topic-03"],
    related: ["transformation-evidence"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "transformation-evidence",
    name: "Rock transformation",
    summary: "Material evidence of how one rock became another.",
    topicIds: ["topic-03"],
    related: ["igneous-cooling", "sed-environment", "metamorphic-parent"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "porosity-perm",
    name: "Porosity and permeability",
    summary: "How pore space and connectedness affect fluids in rock.",
    topicIds: ["topic-03"],
    related: ["groundwater"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "competing-id",
    name: "Competing identification",
    summary: "Tell an economic mineral from a lookalike using tests, not wishful naming.",
    topicIds: ["topic-03"],
    related: ["mineral-id"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "agents-ice-water",
    name: "Ice and water as agents",
    summary: "Ice versus water as agents that reshape slopes.",
    topicIds: ["topic-04"],
    related: ["glacial-forms", "source-sink"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "glacial-forms",
    name: "Glacial landforms",
    summary: "Landforms and deposits that record moving ice.",
    topicIds: ["topic-04"],
    related: ["agents-ice-water", "landscape-clocks"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "weathering-types",
    name: "Weathering",
    summary: "Ways rock breaks down at the surface.",
    topicIds: ["topic-04"],
    related: ["soil-profile", "source-sink"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "soil-profile",
    name: "Soil profile",
    summary: "Soil as a record of weathering and time on a slope.",
    topicIds: ["topic-04"],
    related: ["weathering-types"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "mass-wasting",
    name: "Mass wasting",
    summary: "Downslope movement of rock and soil under gravity.",
    topicIds: ["topic-04"],
    related: ["landslide-mitigation", "agents-ice-water"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "source-sink",
    name: "Source to sink",
    summary: "Sediment from source through transport to deposition.",
    topicIds: ["topic-04"],
    related: ["drainage-pattern", "agents-ice-water"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "drainage-pattern",
    name: "Drainage pattern",
    summary: "How stream networks organize a landscape.",
    topicIds: ["topic-04"],
    related: ["source-sink", "watershed-coupling"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "landscape-clocks",
    name: "Landscape clocks",
    summary: "Different processes need different lengths of time.",
    topicIds: ["topic-04"],
    related: ["timescale", "hollow-transfer"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "hollow-transfer",
    name: "Hollow transfer",
    summary: "Reuse Cedar Hollow runoff and slope notes in later surface-process work without reteaching Topic 1.",
    topicIds: ["topic-04"],
    related: ["runoff", "slope"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "seismic-interior",
    name: "Seismic interior",
    summary: "Infer interior structure from seismic evidence you cannot walk into.",
    topicIds: ["topic-05"],
    related: ["convection-model"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "fault-offset",
    name: "Fault offset",
    summary: "Offset land as evidence of fault motion.",
    topicIds: ["topic-05"],
    related: ["plate-motion", "fault-age-transfer"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "volcano-products",
    name: "Volcanic products",
    summary: "What a volcano leaves on the surface and what that implies underneath.",
    topicIds: ["topic-05"],
    related: ["geothermal-path", "lahar-siting"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "geothermal-path",
    name: "Geothermal path",
    summary: "Heat and fluid paths from depth to hot springs or related features.",
    topicIds: ["topic-05"],
    related: ["volcano-products", "convection-model"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "plate-motion",
    name: "Plate motion",
    summary: "Plate motion inferred from surface clues.",
    topicIds: ["topic-05"],
    related: ["boundary-geometry", "fault-offset"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "boundary-geometry",
    name: "Plate-boundary geometry",
    summary: "Boundary type and geometry from field and map evidence.",
    topicIds: ["topic-05"],
    related: ["plate-motion"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "lahar-siting",
    name: "Lahar siting",
    summary: "Where volcanic mudflows can travel, used as a siting problem.",
    topicIds: ["topic-05"],
    related: ["volcano-products", "decision"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "convection-model",
    name: "Convection model",
    summary: "A model of interior convection constrained by surface evidence.",
    topicIds: ["topic-05"],
    related: ["seismic-interior", "plate-motion"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "superposition-wayup",
    name: "Superposition and way-up",
    summary: "Which bed is older, and which way was originally up.",
    topicIds: ["topic-06"],
    related: ["cross-cutting", "unconformity"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "cross-cutting",
    name: "Cross-cutting relationships",
    summary: "A feature that cuts another is younger than what it cuts.",
    topicIds: ["topic-06"],
    related: ["superposition-wayup", "fault-age-transfer"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "unconformity",
    name: "Unconformity",
    summary: "A gap in the rock record you can point to.",
    topicIds: ["topic-06"],
    related: ["superposition-wayup", "timescale"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "stratigraphic-correlation",
    name: "Stratigraphic correlation",
    summary: "Matching rock units across a canyon or region. Not the Topic 1 habit of confusing togetherness with cause.",
    topicIds: ["topic-06"],
    related: ["index-fossil", "multi-line-history"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "index-fossil",
    name: "Index fossil",
    summary: "Fossils used to correlate and constrain relative age.",
    topicIds: ["topic-06"],
    related: ["stratigraphic-correlation"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "radiometric",
    name: "Radiometric age",
    summary: "Numerical age from radiometric evidence, checked against other lines.",
    topicIds: ["topic-06"],
    related: ["age-conflict", "timescale"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "age-conflict",
    name: "Conflicting ages",
    summary: "What to do when dating lines disagree.",
    topicIds: ["topic-06"],
    related: ["radiometric", "multi-line-history"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "multi-line-history",
    name: "Multi-line history",
    summary: "Reconstruct events from several independent lines of evidence.",
    topicIds: ["topic-06"],
    related: ["timescale", "age-conflict"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "fault-age-transfer",
    name: "Fault age transfer",
    summary: "Use earlier fault evidence when reading a later stratigraphic story.",
    topicIds: ["topic-06"],
    related: ["fault-offset", "cross-cutting"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "water-budget",
    name: "Water budget",
    summary: "Where water is stored and how it moves among reservoirs.",
    topicIds: ["topic-09"],
    related: ["infiltration-runoff", "groundwater"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "infiltration-runoff",
    name: "Infiltration vs runoff",
    summary: "Water that soaks in versus water that runs off.",
    topicIds: ["topic-09"],
    related: ["runoff", "water-budget"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "groundwater",
    name: "Groundwater",
    summary: "Water stored and moving in the ground.",
    topicIds: ["topic-09"],
    related: ["storage", "porosity-perm", "water-budget"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "estuary-mixing",
    name: "Estuary mixing",
    summary: "Where fresh and salt water mix along a working shore.",
    topicIds: ["topic-09"],
    related: ["tides-ocean", "currents"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "tides-ocean",
    name: "Tides",
    summary: "Tidal period and range, including Earth–Moon–Sun geometry without reteaching Topic 10.",
    topicIds: ["topic-09"],
    related: ["moon", "currents"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "currents",
    name: "Currents",
    summary: "Ocean and coastal currents as movers of water and sediment.",
    topicIds: ["topic-09"],
    related: ["longshore", "tides-ocean"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "longshore",
    name: "Longshore transport",
    summary: "Sediment moving along a shore.",
    topicIds: ["topic-09"],
    related: ["currents", "source-sink"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "tsunami-safety",
    name: "Tsunami safety",
    summary: "Scientifically appropriate response when a tsunami hazard is real.",
    topicIds: ["topic-09"],
    related: ["severe-recognize"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "watershed-coupling",
    name: "Watershed coupling",
    summary: "Land, groundwater, and coast as one coupled water system.",
    topicIds: ["topic-09"],
    related: ["systems", "water-budget", "drainage-pattern"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "station-obs",
    name: "Station observations",
    summary: "Read the atmosphere from real station observations.",
    topicIds: ["topic-07"],
    related: ["observation", "pressure-wind"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "pressure-wind",
    name: "Pressure and wind",
    summary: "How pressure patterns relate to wind.",
    topicIds: ["topic-07"],
    related: ["station-obs", "fronts"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "fronts",
    name: "Fronts",
    summary: "Boundaries between air masses as observed change.",
    topicIds: ["topic-07"],
    related: ["pressure-wind", "forecast"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "dewpoint",
    name: "Dew point",
    summary: "Moisture in the air as a measured quantity, not a slogan.",
    topicIds: ["topic-07"],
    related: ["station-obs"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "forecast",
    name: "Forecast",
    summary: "A short-range forecast from changing observations.",
    topicIds: ["topic-07"],
    related: ["forecast-revision", "weather-vs-climate"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "severe-recognize",
    name: "Severe weather recognition",
    summary: "Recognize hazardous weather from evidence, then choose a safe response.",
    topicIds: ["topic-07"],
    related: ["hurricane-place", "lightning-safety"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "hurricane-place",
    name: "Hurricane place",
    summary: "Where a hurricane's hazards actually sit relative to the person.",
    topicIds: ["topic-07"],
    related: ["severe-recognize"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "lightning-safety",
    name: "Lightning safety",
    summary: "A scientifically appropriate lightning response.",
    topicIds: ["topic-07"],
    related: ["severe-recognize"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "forecast-revision",
    name: "Forecast revision",
    summary: "Change a forecast when later observations disagree.",
    topicIds: ["topic-07"],
    related: ["forecast", "revision"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "weather-vs-climate",
    name: "Weather vs climate",
    summary: "Separate a hot day from a long record.",
    topicIds: ["topic-08"],
    related: ["forecast", "long-record", "weather-climate-sort"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "long-record",
    name: "Long climate record",
    summary: "What a long record can say that a single cold day cannot.",
    topicIds: ["topic-08"],
    related: ["weather-vs-climate", "ranged-forecast"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "energy-budget",
    name: "Energy budget",
    summary: "Energy balance and flows that climate explanations must respect.",
    topicIds: ["topic-08"],
    related: ["ice-albedo", "greenhouse-reservoir"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "ice-albedo",
    name: "Ice-albedo feedback",
    summary: "Ice, reflectivity, and feedbacks in a long record.",
    topicIds: ["topic-08"],
    related: ["energy-budget"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "local-change-scale",
    name: "Local change and scale",
    summary: "Local change read at the scale the evidence actually supports.",
    topicIds: ["topic-08"],
    related: ["long-record"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "greenhouse-reservoir",
    name: "Greenhouse and reservoirs",
    summary: "Greenhouse gases and carbon/heat reservoirs as evidenced stores, not slogans.",
    topicIds: ["topic-08"],
    related: ["energy-budget"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "ranged-forecast",
    name: "Ranged forecast",
    summary: "Forecast a consequence with uncertainty named honestly.",
    topicIds: ["topic-08"],
    related: ["long-record", "bounded-claims"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "weather-climate-sort",
    name: "Weather/climate sort",
    summary: "Sort claims into weather versus climate before arguing causes.",
    topicIds: ["topic-08"],
    related: ["weather-vs-climate"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "water-source-synthesis",
    name: "Water-source synthesis",
    summary: "Use the whole water toolkit in a community decision.",
    topicIds: ["topic-12"],
    related: ["water-budget", "whole-toolkit"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "landslide-mitigation",
    name: "Landslide mitigation",
    summary: "A defensible response to slope failure using earlier map and surface-process work.",
    topicIds: ["topic-12"],
    related: ["mass-wasting", "decision"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "mine-water-tradeoff",
    name: "Mine and water tradeoff",
    summary: "Resource extraction versus water quality as a coupled decision.",
    topicIds: ["topic-12"],
    related: ["competing-id", "water-source-synthesis"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "fire-wx-route",
    name: "Fire-weather route",
    summary: "A route choice under fire weather using spatial and atmospheric evidence.",
    topicIds: ["topic-12"],
    related: ["decision", "severe-recognize"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "dam-fault",
    name: "Dam and fault",
    summary: "Infrastructure sitting on geologic hazard as a synthesis problem.",
    topicIds: ["topic-12"],
    related: ["fault-offset", "whole-toolkit"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "winter-route",
    name: "Winter route",
    summary: "A winter travel or siting choice that needs weather, terrain, and earlier habits.",
    topicIds: ["topic-12"],
    related: ["decision", "forecast"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "drought-allocation",
    name: "Drought allocation",
    summary: "Allocate scarce water using budget and long-record evidence.",
    topicIds: ["topic-12"],
    related: ["water-source-synthesis", "long-record"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  }),
  concept({
    id: "whole-toolkit",
    name: "Whole toolkit",
    summary: "A sustainability decision that requires tools and understanding from earlier topics — not a new isolated unit.",
    topicIds: ["topic-12"],
    related: ["water-source-synthesis", "systems"],
    evidenceSource: PUZZLE,
    evidenceKind: "proposed-travel-competency"
  })
];

const conceptById = Object.fromEntries(concepts.map((row) => [row.id, row]));
for (const row of concepts) {
  row.relatedConceptIds = row.relatedConceptIds.filter((id) => conceptById[id]);
}

const resources = [
  {
    id: "res-where-does-the-water-go",
    type: "terrainbound-investigation",
    title: "Where Does the Water Go?",
    topicIds: ["topic-01"],
    conceptIds: ["observation", "evidence", "runoff", "systems"],
    standardIds: [],
    gameExperienceIds: ["experience-cedar-hollow"],
    sourcePath: "terrainbound/data/missions/where-does-the-water-go.json"
  },
  {
    id: "res-what-makes-water-move",
    type: "terrainbound-investigation",
    title: "What makes water move",
    topicIds: ["topic-01"],
    conceptIds: ["variables", "fair-test", "slope", "runoff", "field-data"],
    standardIds: [],
    gameExperienceIds: ["experience-cedar-hollow"],
    sourcePath: "terrainbound/data/investigations/what-makes-water-move.json"
  },
  {
    id: "res-reading-the-landscape",
    type: "terrainbound-investigation",
    title: "Reading the Landscape",
    topicIds: ["topic-01"],
    conceptIds: ["observation", "timescale", "explanation", "revision"],
    standardIds: [],
    gameExperienceIds: ["experience-cedar-hollow"],
    sourcePath: "terrainbound/data/investigations/reading-the-landscape.json",
    note: "Introduces an older landscape clock. Ice as an agent is not Topic 1 mastery; Glacier Country owns that assessment."
  },
  {
    id: "res-after-the-rain",
    type: "review",
    title: "After the rain",
    topicIds: ["topic-01"],
    conceptIds: ["systems", "cause", "correlation", "revision", "communication"],
    standardIds: [],
    gameExperienceIds: ["experience-cedar-hollow"],
    sourcePath: "terrainbound/data/challenges/after-the-rain.json"
  },
  {
    id: "res-high-country-geospatial",
    type: "terrainbound-investigation",
    title: "High Country field season",
    topicIds: ["topic-02"],
    conceptIds: ["location", "scale", "elevation", "contours", "gradient", "profile", "gis", "remote", "decision"],
    standardIds: [],
    gameExperienceIds: ["experience-high-country"],
    sourcePath: "terrainbound/data/investigations/high-country.json"
  },
  {
    id: "res-sunfall-solar-system",
    type: "terrainbound-investigation",
    title: "Sunfall observing campaign",
    topicIds: ["topic-10"],
    conceptIds: ["rotation", "seasons", "orbit", "math-orbit", "moon", "eclipses", "celestial-data", "prediction"],
    standardIds: [],
    gameExperienceIds: ["experience-sunfall-desert"],
    sourcePath: "terrainbound/data/investigations/sunfall-desert.json"
  },
  {
    id: "res-dark-sky-light-as-evidence",
    type: "terrainbound-investigation",
    title: "Light as field evidence",
    topicIds: ["topic-11"],
    conceptIds: ["spectra", "stellar-temp", "distance-brightness", "hr-place", "stellar-mass-life", "nucleosynthesis", "redshift-pattern", "origin-evidence", "lookback", "bounded-claims"],
    standardIds: [],
    gameExperienceIds: ["experience-dark-sky-basin"],
    sourcePath: "terrainbound/data/investigations/dark-sky-basin.json"
  }
];

const videos = [
  {
    id: "video-dfd-mount-hood-rain-shadow",
    type: "deep-forest-dispatch-video",
    title: "Why one side of this mountain is a forest — and the other is a desert",
    topicIds: ["topic-07"],
    conceptIds: ["rain-shadow"],
    standardIds: [],
    gameExperienceIds: [],
    storyIds: [],
    embedPolicy: "youtube-embed-only",
    youtubeVideoId: "ue74ge9Bz7U",
    youtubeUrl: "https://www.youtube.com/watch?v=ue74ge9Bz7U",
    sourcePath: "data/deep-forest-dispatch/stories/mount-hood-rain-shadow.json",
    brand: "deep-forest-dispatch",
    note: "Architecture proof only. Do not rehost. DFD remains a sibling brand."
  }
];

const experienceConceptMap = {
  "cedar-hollow": concepts.filter((row) => row.elicitedNow && row.topicIds.includes("topic-01")).map((row) => row.id),
  "high-country": concepts.filter((row) => row.elicitedNow && row.topicIds.includes("topic-02")).map((row) => row.id),
  "sunfall-desert": concepts.filter((row) => row.elicitedNow && row.topicIds.includes("topic-10")).map((row) => row.id),
  "dark-sky-basin": concepts.filter((row) => row.elicitedNow && row.topicIds.includes("topic-11")).map((row) => row.id),
  "painted-badlands": concepts.filter((row) => row.topicIds.includes("topic-03") && row.evidenceKind === "proposed-travel-competency").map((row) => row.id),
  "glacier-country": concepts.filter((row) => row.topicIds.includes("topic-04") && row.evidenceKind === "proposed-travel-competency").map((row) => row.id),
  "firepeak": concepts.filter((row) => row.topicIds.includes("topic-05") && row.evidenceKind === "proposed-travel-competency").map((row) => row.id),
  "deep-time-canyon": concepts.filter((row) => row.topicIds.includes("topic-06") && row.evidenceKind === "proposed-travel-competency").map((row) => row.id),
  "island-coast": concepts.filter((row) => row.topicIds.includes("topic-09") && row.evidenceKind === "proposed-travel-competency").map((row) => row.id),
  "stormlands": concepts.filter((row) => row.topicIds.includes("topic-07") && row.evidenceKind === "proposed-travel-competency").map((row) => row.id),
  "icewater-bay": concepts.filter((row) => row.topicIds.includes("topic-08") && row.evidenceKind === "proposed-travel-competency").map((row) => row.id),
  "high-sierra": concepts.filter((row) => row.topicIds.includes("topic-12") && row.evidenceKind === "proposed-travel-competency").map((row) => row.id)
};

const experiences = world.regions.map((region) => ({
  id: `experience-${region.id}`,
  kind: "field-region",
  regionId: region.id,
  topicIds: [topicId(region.curriculumTopic)],
  conceptIds: experienceConceptMap[region.id] || [],
  standardIds: [],
  status: region.implementationState,
  entry: "game",
  availableAfter: region.availableAfter || null,
  note: "Current atlas association. A topic may later have zero, one, or many experiences; a region may later support more than one topic."
}));

const resourceIdsByTopic = {};
for (const resource of [...resources, ...videos]) {
  for (const id of resource.topicIds) {
    resourceIdsByTopic[id] ??= [];
    resourceIdsByTopic[id].push(resource.id);
  }
}

const topics = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((number) => {
  const region = regionForTopic(number);
  const purpose = bibleForRegion(region.id)?.curriculumPurpose || "";
  const playable = region.implementationState === "playable";
  return {
    id: topicId(number),
    number,
    title: region.curriculumTitle,
    shortTitle: shortTitles[number],
    shortTitleSource: "derived-from-curriculumTitle",
    description: purpose,
    descriptionSource: BIBLE_PURPOSE,
    conceptIds: concepts.filter((row) => row.topicIds.includes(topicId(number))).map((row) => row.id),
    standardIds: [],
    gameExperienceIds: [`experience-${region.id}`],
    resourceIds: resourceIdsByTopic[topicId(number)] || [],
    prerequisiteTopicIds: coursePrereq(),
    prerequisiteNote: "No owner-confirmed course prerequisites. Do not copy game travel order here. Game unlocks live on regions.json / experiences.",
    courseOrder: region.courseOrder,
    status: playable ? "field-playable" : "field-future",
    titleSource: TITLE_SOURCE,
    titleConfirmation: "awaiting-owner-confirmation",
    needsOwnerConfirmation: true,
    titleConfidence: "repo-derived-from-region-metadata"
  };
});

const curriculum = {
  id: "nys-ess-12-topic-course",
  schemaVersion: 2,
  status: "spine",
  playerVisibleCodes: false,
  authority: "This file is the 12-topic course. regions.json is the atlas, not the curriculum database.",
  titlePolicy: "Titles copied from regions.json curriculumTitle. They are not confirmed classroom names. Do not invent replacements.",
  courseOrderTopicNumbers: courseOrder,
  courseOrderNote: "Game atlas/travel order only. Not the student Course display and not a confirmed classroom sequence.",
  gameTravelTopicNumbers: courseOrder,
  courseDisplayTopicNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  courseDisplayRule: "topic-number",
  ownerDefinedCourseSequence: null,
  sequenceNote: "Course display is Topic 1 through Topic 12 until the owner supplies ownerDefinedCourseSequence. Game unlocks stay on regions.json / experiences.",
  topics
};

const conceptsDoc = {
  id: "terrainbound-concepts",
  schemaVersion: 2,
  status: "evidenced-only",
  note: "Plain-language concepts evidenced in mastery, Summit, or the puzzle architecture travel lists. Do not fill from general Earth Science memory.",
  concepts
};

const experiencesDoc = {
  id: "terrainbound-game-experiences",
  schemaVersion: 2,
  status: "atlas-linked",
  note: "Each atlas region is one game experience today. That is a current mapping, not a Topic = Region law.",
  experiences
};

const standards = {
  id: "nys-ess-alignments",
  schemaVersion: 2,
  playerVisible: false,
  framework: "NYS P-12 Science Learning Standards / Earth & Space Sciences (NYSSLS)",
  status: "pending-owner-codes",
  disclaimer: "Official performance-expectation, DCI, and CCC codes have not been supplied. Do not invent HS-ESS or NYSSLS codes. SEP titles below are copied from existing placeholder sciencePractice strings only.",
  allowedTypes: [
    "performance-expectation",
    "science-engineering-practice",
    "disciplinary-core-idea",
    "crosscutting-concept"
  ],
  codePolicy: {
    allowCodeWithoutSource: false,
    requiredVerificationToAcceptCode: ["owner-supplied", "verified-against-nyssls"],
    pendingVerificationStatus: "pending-owner-codes"
  },
  alignments: [],
  standards: seps.map((row) => ({
    id: row.id,
    code: null,
    title: row.title,
    description: "NYSSLS science and engineering practice name as already stored in TerrainBound placeholder metadata. Official code pending owner supply.",
    type: "science-engineering-practice",
    topicIds: [],
    conceptIds: [],
    source: PLACEHOLDER_SEP,
    placeholderIds: row.placeholderIds,
    verificationStatus: "pending-owner-codes",
    playerVisible: false
  }))
};

const catalog = {
  id: "terrainbound-learning",
  schemaVersion: 2,
  status: "curriculum-spine",
  playerVisibleCodes: false,
  note: "Phase B catalog. Curriculum authority is curriculum.json, not regions.json. Do not invent topic names, PE codes, stories, or extra videos.",
  curriculumSource: "data/learning/curriculum.json",
  standardsStatus: "pending-owner-codes",
  collections: {
    topics: "data/learning/curriculum.json",
    concepts: "data/learning/concepts.json",
    standards: "data/learning/standards.json",
    experiences: "data/learning/experiences.json",
    resources,
    stories: [],
    videos
  },
  deepForestDispatch: {
    relationship: "sibling",
    catalog: "data/deep-forest-dispatch/catalog.json",
    embedPolicy: "youtube-embed-only",
    rehostPolicy: "do-not-download-or-rehost-third-party-video",
    brandMerge: false
  }
};

function write(name, data) {
  fs.writeFileSync(path.join(dir, name), `${JSON.stringify(data, null, 2)}\n`);
}

write("curriculum.json", curriculum);
write("concepts.json", conceptsDoc);
write("experiences.json", experiencesDoc);
write("standards.json", standards);
write("catalog.json", catalog);
console.log(`wrote ${topics.length} topics, ${concepts.length} concepts, ${experiences.length} experiences, ${resources.length} resources, ${videos.length} videos, ${standards.standards.length} pending SEPs`);
