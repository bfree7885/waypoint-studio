/**
 * TerrainBound learning-environment spine.
 * Curriculum is independent of game regions. Does not invent titles or NYSSLS codes.
 * Not wired into gameplay in Phase B.
 */

export const LEARNING_SCHEMA_VERSION = 2;

export const SUMMIT_CONTEXT_TYPES = ["game", "curriculum", "story", "video", "general"];

export const SUMMIT_ASSISTANCE = {
  guide: "guide",
  explain: "explain",
  connect: "connect"
};

export const RESOURCE_TYPES = [
  "terrainbound-investigation",
  "deep-forest-dispatch-video",
  "external-video",
  "article",
  "visualization",
  "simulation",
  "reading",
  "review",
  "assessment"
];

export const STANDARD_TYPES = [
  "performance-expectation",
  "science-engineering-practice",
  "disciplinary-core-idea",
  "crosscutting-concept"
];

export const STANDARD_CODE_VERIFICATION = ["owner-supplied", "verified-against-nyssls"];

export const TITLE_AWAITING_OWNER = "awaiting-owner-confirmation";

export function topicIdFromNumber(number) {
  const n = Number(number);
  if (!Number.isInteger(n) || n < 1) return null;
  return `topic-${String(n).padStart(2, "0")}`;
}

export function emptyStudentProgress() {
  return {
    masteredTopicIds: [],
    accessibleRegionIds: [],
    currentRegionId: null,
    currentTopicId: null
  };
}

export function emptySummitContext(overrides = {}) {
  const contextType = SUMMIT_CONTEXT_TYPES.includes(overrides.contextType)
    ? overrides.contextType
    : "general";
  return {
    schemaVersion: LEARNING_SCHEMA_VERSION,
    contextType,
    topicId: overrides.topicId || null,
    conceptIds: [...(overrides.conceptIds || [])],
    standardIds: [...(overrides.standardIds || [])],
    regionId: overrides.regionId || null,
    investigationId: overrides.investigationId || null,
    storyId: overrides.storyId || null,
    resourceId: overrides.resourceId || null,
    videoId: overrides.videoId || null,
    studentProgress: {
      ...emptyStudentProgress(),
      ...(overrides.studentProgress || {})
    },
    allowedAssistance: overrides.allowedAssistance || SUMMIT_ASSISTANCE.guide,
    doNotRevealAnswers: overrides.doNotRevealAnswers !== false,
    doNotGrantClearance: overrides.doNotGrantClearance !== false,
    studentFacingStandards: false
  };
}

export function gameSummitContext({
  regionId,
  investigationId,
  topicId,
  conceptIds,
  standardIds,
  studentProgress
} = {}) {
  return emptySummitContext({
    contextType: "game",
    regionId: regionId || null,
    investigationId: investigationId || null,
    topicId: topicId || null,
    conceptIds: conceptIds || [],
    standardIds: standardIds || [],
    studentProgress
  });
}

export function curriculumSummitContext({
  topicId,
  conceptIds,
  standardIds,
  studentProgress
} = {}) {
  return emptySummitContext({
    contextType: "curriculum",
    topicId: topicId || null,
    conceptIds: conceptIds || [],
    standardIds: standardIds || [],
    allowedAssistance: SUMMIT_ASSISTANCE.explain,
    studentProgress
  });
}

export function attachCurriculumToSummitContext(context, {
  topicId,
  conceptIds,
  standardIds
} = {}) {
  const base = context && typeof context === "object" ? context : emptySummitContext();
  return {
    ...base,
    topicId: topicId !== undefined ? topicId : base.topicId,
    conceptIds: conceptIds !== undefined ? [...conceptIds] : [...(base.conceptIds || [])],
    standardIds: standardIds !== undefined ? [...standardIds] : [...(base.standardIds || [])],
    studentFacingStandards: false
  };
}

export function curriculumTopicsFromWorld(world) {
  const regions = world?.regions || [];
  return [...regions]
    .map((region) => ({
      id: topicIdFromNumber(region.curriculumTopic),
      number: region.curriculumTopic,
      title: region.curriculumTitle,
      regionId: region.id,
      courseOrder: region.courseOrder,
      implementationState: region.implementationState || "future"
    }))
    .filter((row) => row.id && row.title)
    .sort((a, b) => a.number - b.number);
}

export function gameExperiencesFromWorld(world) {
  return (world?.regions || []).map((region) => ({
    id: `experience-${region.id}`,
    kind: "field-region",
    regionId: region.id,
    topicIds: [topicIdFromNumber(region.curriculumTopic)].filter(Boolean),
    status: region.implementationState || "future",
    entry: "game"
  }));
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

export function loadLearningCatalog(catalog, world, standards, extras = {}) {
  const topics = extras.curriculum?.topics
    ? list(extras.curriculum.topics)
    : curriculumTopicsFromWorld(world);
  const experiences = extras.experiences?.experiences
    ? list(extras.experiences.experiences)
    : gameExperiencesFromWorld(world);
  const concepts = extras.concepts?.concepts
    ? list(extras.concepts.concepts)
    : list(catalog?.collections?.concepts);
  const standardRows = list(standards?.standards?.length ? standards.standards : standards?.alignments);
  return {
    schemaVersion: Number(catalog?.schemaVersion) || LEARNING_SCHEMA_VERSION,
    status: catalog?.status || extras.curriculum?.status || "foundation",
    playerVisibleCodes: catalog?.playerVisibleCodes === true,
    topics,
    concepts,
    standards: standardRows,
    resources: list(catalog?.collections?.resources),
    stories: list(catalog?.collections?.stories),
    videos: list(catalog?.collections?.videos),
    experiences,
    deepForestDispatch: catalog?.deepForestDispatch || null,
    standardsStatus: standards?.status || catalog?.standardsStatus || "pending-owner-codes",
    curriculumSource: extras.curriculum ? "data/learning/curriculum.json" : catalog?.curriculumSource || "data/world/regions.json"
  };
}

export function loadLearningSpine({
  curriculum,
  concepts,
  standards,
  catalog,
  experiences,
  world
} = {}) {
  return loadLearningCatalog(catalog, world, standards, {
    curriculum,
    concepts,
    experiences
  });
}

export function relatedForStory(story, catalog) {
  if (!story) return { topics: [], videos: [], experiences: [], standards: [] };
  const topicIds = new Set(story.topicIds || []);
  return {
    topics: (catalog?.topics || []).filter((row) => topicIds.has(row.id)),
    videos: (catalog?.videos || []).filter((row) => (row.storyIds || []).includes(story.id)),
    experiences: (catalog?.experiences || []).filter((row) =>
      list(row.topicIds || (row.topicId ? [row.topicId] : [])).some((id) => topicIds.has(id))
    ),
    standards: (catalog?.standards || []).filter((row) => list(row.topicIds).some((id) => topicIds.has(id)))
  };
}

function uniqueIds(rows, field = "id") {
  const ids = list(rows).map((row) => row?.[field]).filter(Boolean);
  return { ids, unique: new Set(ids), duplicates: ids.filter((id, index) => ids.indexOf(id) !== index) };
}

function requireExisting(refs, known, label, errors) {
  for (const id of list(refs)) {
    if (!known.has(id)) errors.push(`${label} dangling reference: ${id}`);
  }
}

function codedStandardAllowed(row) {
  if (row?.code == null || row.code === "") return { ok: true };
  const source = typeof row.source === "string" ? row.source.trim() : "";
  const status = row.verificationStatus;
  if (!source) return { ok: false, reason: `standard ${row.id} has a code but no source` };
  if (!STANDARD_CODE_VERIFICATION.includes(status)) {
    return {
      ok: false,
      reason: `standard ${row.id} has a code without owner/verified verificationStatus`
    };
  }
  if (row.verificationStatus === "pending-owner-codes") {
    return { ok: false, reason: `standard ${row.id} cannot carry a code while pending` };
  }
  return { ok: true };
}

export function validateLearningSpine({
  curriculum,
  concepts,
  standards,
  catalog,
  experiences,
  world
} = {}) {
  const errors = [];
  const topics = list(curriculum?.topics);
  const conceptRows = list(concepts?.concepts);
  const experienceRows = list(experiences?.experiences);
  const standardRows = list(standards?.standards?.length ? standards.standards : standards?.alignments);
  const resources = list(catalog?.collections?.resources);
  const videos = list(catalog?.collections?.videos);
  const worldRegions = list(world?.regions);

  if (topics.length !== 12) errors.push(`expected 12 curriculum topics, found ${topics.length}`);
  const topicNumbers = topics.map((row) => row.number).sort((a, b) => a - b);
  if (JSON.stringify(topicNumbers) !== JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])) {
    errors.push(`topic numbers must be 1–12, found ${topicNumbers.join(",")}`);
  }

  const topicIds = uniqueIds(topics);
  if (topicIds.unique.size !== topicIds.ids.length) errors.push(`duplicate topic ids: ${topicIds.duplicates.join(",")}`);
  const conceptIds = uniqueIds(conceptRows);
  if (conceptIds.unique.size !== conceptIds.ids.length) errors.push(`duplicate concept ids: ${conceptIds.duplicates.join(",")}`);
  const experienceIds = uniqueIds(experienceRows);
  if (experienceIds.unique.size !== experienceIds.ids.length) {
    errors.push(`duplicate experience ids: ${experienceIds.duplicates.join(",")}`);
  }
  const standardIds = uniqueIds(standardRows);
  if (standardIds.unique.size !== standardIds.ids.length) {
    errors.push(`duplicate standard ids: ${standardIds.duplicates.join(",")}`);
  }
  const resourceIds = uniqueIds([...resources, ...videos]);
  if (resourceIds.unique.size !== resourceIds.ids.length) {
    errors.push(`duplicate resource ids: ${resourceIds.duplicates.join(",")}`);
  }

  const regionIds = new Set(worldRegions.map((row) => row.id));
  const knownTopics = topicIds.unique;
  const knownConcepts = conceptIds.unique;
  const knownExperiences = experienceIds.unique;
  const knownStandards = standardIds.unique;
  const knownResources = resourceIds.unique;

  for (const topic of topics) {
    if (!topic.title) errors.push(`topic ${topic.id} missing title`);
    if (topic.titleConfirmation !== TITLE_AWAITING_OWNER && topic.needsOwnerConfirmation !== true) {
      errors.push(`topic ${topic.id} must remain awaiting owner confirmation until classroom titles are supplied`);
    }
    requireExisting(topic.conceptIds, knownConcepts, `topic ${topic.id} conceptIds`, errors);
    requireExisting(topic.standardIds, knownStandards, `topic ${topic.id} standardIds`, errors);
    requireExisting(topic.gameExperienceIds, knownExperiences, `topic ${topic.id} gameExperienceIds`, errors);
    requireExisting(topic.resourceIds, knownResources, `topic ${topic.id} resourceIds`, errors);
    requireExisting(topic.prerequisiteTopicIds, knownTopics, `topic ${topic.id} prerequisiteTopicIds`, errors);
  }

  for (const concept of conceptRows) {
    if (!concept.name) errors.push(`concept ${concept.id} missing name`);
    requireExisting(concept.topicIds, knownTopics, `concept ${concept.id} topicIds`, errors);
    requireExisting(concept.standardIds, knownStandards, `concept ${concept.id} standardIds`, errors);
    requireExisting(concept.relatedConceptIds, knownConcepts, `concept ${concept.id} relatedConceptIds`, errors);
    if (!concept.evidenceSource) errors.push(`concept ${concept.id} missing evidenceSource`);
  }

  for (const experience of experienceRows) {
    requireExisting(experience.topicIds || (experience.topicId ? [experience.topicId] : []), knownTopics, `experience ${experience.id} topicIds`, errors);
    requireExisting(experience.conceptIds, knownConcepts, `experience ${experience.id} conceptIds`, errors);
    requireExisting(experience.standardIds, knownStandards, `experience ${experience.id} standardIds`, errors);
    if (experience.regionId && !regionIds.has(experience.regionId)) {
      errors.push(`experience ${experience.id} dangling regionId: ${experience.regionId}`);
    }
  }

  for (const resource of [...resources, ...videos]) {
    if (resource.type && !RESOURCE_TYPES.includes(resource.type)) {
      errors.push(`resource ${resource.id} unknown type ${resource.type}`);
    }
    requireExisting(resource.topicIds, knownTopics, `resource ${resource.id} topicIds`, errors);
    requireExisting(resource.conceptIds, knownConcepts, `resource ${resource.id} conceptIds`, errors);
    requireExisting(resource.standardIds, knownStandards, `resource ${resource.id} standardIds`, errors);
    requireExisting(resource.gameExperienceIds, knownExperiences, `resource ${resource.id} gameExperienceIds`, errors);
  }

  if (standards?.playerVisible === true) errors.push("standards must not be player visible");
  if ((standards?.status || "") !== "pending-owner-codes" && !standardRows.some((row) => row.code)) {
    errors.push("standards status must stay pending-owner-codes until codes exist");
  }

  for (const row of standardRows) {
    if (row.type && !STANDARD_TYPES.includes(row.type)) errors.push(`standard ${row.id} unknown type ${row.type}`);
    if (row.code == null || row.code === "") {
      if (row.verificationStatus !== "pending-owner-codes") {
        errors.push(`standard ${row.id} with no code must be marked pending-owner-codes`);
      }
    } else {
      const allowed = codedStandardAllowed(row);
      if (!allowed.ok) errors.push(allowed.reason);
    }
    requireExisting(row.topicIds, knownTopics, `standard ${row.id} topicIds`, errors);
    requireExisting(row.conceptIds, knownConcepts, `standard ${row.id} conceptIds`, errors);
  }

  const worldTopics = curriculumTopicsFromWorld(world);
  if (worldTopics.length === 12) {
    for (const worldTopic of worldTopics) {
      const topic = topics.find((row) => row.number === worldTopic.number);
      if (!topic) {
        errors.push(`curriculum missing topic ${worldTopic.number} present on regions.json`);
        continue;
      }
      if (topic.title !== worldTopic.title) {
        errors.push(`topic ${topic.id} title drifted from regions.json (${worldTopic.title})`);
      }
    }
  }

  const display = list(curriculum?.courseDisplayTopicNumbers);
  if (display.length && JSON.stringify(display) === JSON.stringify(list(curriculum?.gameTravelTopicNumbers))) {
    errors.push("courseDisplayTopicNumbers must not silently equal game travel order");
  }
  if (display.length && JSON.stringify(display) !== JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) && !curriculum?.ownerDefinedCourseSequence) {
    errors.push("without ownerDefinedCourseSequence, course display must be Topic 1–12");
  }

  return { ok: errors.length === 0, errors };
}

export const DEFAULT_COURSE_DISPLAY = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const RESOURCE_TYPE_LABELS = {
  "terrainbound-investigation": "Field investigation",
  "deep-forest-dispatch-video": "Deep Forest Dispatch",
  "external-video": "Educational video",
  article: "Article",
  visualization: "Visualization",
  simulation: "Simulation",
  reading: "Reading",
  review: "Field review",
  assessment: "Review"
};

export function courseDisplayNumbers(curriculum) {
  const owner = curriculum?.ownerDefinedCourseSequence;
  if (Array.isArray(owner) && owner.length === 12) return [...owner];
  const display = list(curriculum?.courseDisplayTopicNumbers);
  if (display.length === 12) return display.map(Number);
  return [...DEFAULT_COURSE_DISPLAY];
}

export function courseDisplayTopics(curriculum) {
  const byNumber = new Map(list(curriculum?.topics).map((row) => [Number(row.number), row]));
  return courseDisplayNumbers(curriculum).map((number) => byNumber.get(number)).filter(Boolean);
}

export function parseStationRoute(hash = "") {
  const raw = String(hash || "").replace(/^#/, "");
  const parts = raw.split("/").filter(Boolean);
  if (!parts.length) return { view: "home", topicId: null, resourceId: null };
  if (parts[0] === "course" && parts[1]) return { view: "topic", topicId: parts[1], resourceId: null };
  if (parts[0] === "course") return { view: "course", topicId: null, resourceId: null };
  if (parts[0] === "watch" && parts[1]) return { view: "resource", topicId: null, resourceId: parts[1] };
  if (parts[0] === "watch") return { view: "watch", topicId: null, resourceId: null };
  if (parts[0] === "ask") return { view: "ask", topicId: null, resourceId: null };
  if (parts[0] === "field") return { view: "field", topicId: null, resourceId: null };
  return { view: "home", topicId: null, resourceId: null };
}

export function stationHashFor(route = {}) {
  if (route.view === "topic" && route.topicId) return `#/course/${route.topicId}`;
  if (route.view === "course") return "#/course";
  if (route.view === "resource" && route.resourceId) return `#/watch/${route.resourceId}`;
  if (route.view === "watch") return "#/watch";
  if (route.view === "ask") return "#/ask";
  if (route.view === "field") return "#/field";
  return "#/";
}

export function shouldSkipFieldStation(search = "") {
  const params = new URLSearchParams(search);
  return params.get("field") === "1" || params.get("station") === "0";
}

export function resumeLabel(save) {
  if (!save) return null;
  const id = save.world?.currentRegion || save.currentRegion || "cedar-hollow";
  const pretty = String(id)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return pretty || "the field";
}

export function fieldAvailability(topic, experiences = []) {
  const linked = list(experiences).filter((row) => list(row.topicIds).includes(topic?.id));
  const playable = linked.filter((row) => row.status === "playable");
  if (playable.length) {
    return { id: "available", label: "Available in the field", experiences: playable };
  }
  if (linked.length) {
    return { id: "future", label: "Future field work", experiences: linked };
  }
  return { id: "future", label: "No field region yet", experiences: [] };
}

function conceptNameMap(concepts) {
  return new Map(list(concepts).map((row) => [row.id, row.name || row.summary || ""]));
}

export function studentTopicCard(topic, { concepts = [], experiences = [], catalog } = {}) {
  const availability = fieldAvailability(topic, experiences);
  const names = conceptNameMap(concepts);
  const resources = [...list(catalog?.collections?.resources), ...list(catalog?.collections?.videos)];
  return {
    id: topic.id,
    number: topic.number,
    title: topic.title,
    shortTitle: topic.shortTitle || topic.title,
    description: topic.description || "",
    availability,
    conceptNames: list(topic.conceptIds).map((id) => names.get(id)).filter(Boolean),
    fieldExperiences: availability.experiences.map((row) => ({
      id: row.id,
      regionId: row.regionId,
      status: row.status,
      label: resumeLabel({ world: { currentRegion: row.regionId } })
    })),
    resources: resources
      .filter((row) => list(row.topicIds).includes(topic.id))
      .map((row) => studentResourceCard(row, { concepts }))
  };
}

export function studentResourceCard(resource, { concepts = [] } = {}) {
  const names = conceptNameMap(concepts);
  return {
    id: resource.id,
    title: resource.title,
    type: resource.type,
    typeLabel: RESOURCE_TYPE_LABELS[resource.type] || "Resource",
    brand: resource.brand === "deep-forest-dispatch" ? "Deep Forest Dispatch" : null,
    youtubeVideoId: resource.youtubeVideoId || null,
    youtubeUrl: resource.youtubeUrl || null,
    embedPolicy: resource.embedPolicy || null,
    note: resource.note || "",
    fieldOnly: resource.type === "terrainbound-investigation" || resource.type === "review",
    conceptNames: list(resource.conceptIds).map((id) => names.get(id)).filter(Boolean)
  };
}

export function watchReadItems(catalog, concepts = []) {
  const rows = [...list(catalog?.collections?.videos), ...list(catalog?.collections?.resources)];
  return rows.map((row) => studentResourceCard(row, { concepts }));
}

export function studentFacingTextHasLeak(text) {
  return /HS-ESS|NYSSLS|MS-ESS|performance expectation/i.test(String(text || ""));
}
