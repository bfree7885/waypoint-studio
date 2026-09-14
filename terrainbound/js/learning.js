/**
 * TerrainBound learning-environment foundation.
 * Indexes the existing 12-topic course. Does not invent titles, standards, or stories.
 * Not wired into gameplay in Phase A.
 */

export const LEARNING_SCHEMA_VERSION = 1;

export const SUMMIT_CONTEXT_TYPES = ["game", "curriculum", "story", "video", "general"];

export const SUMMIT_ASSISTANCE = {
  guide: "guide",
  explain: "explain",
  connect: "connect"
};

export function topicIdFromNumber(number) {
  const n = Number(number);
  if (!Number.isInteger(n) || n < 1) return null;
  return `topic-${String(n).padStart(2, "0")}`;
}

export function emptyStudentProgress() {
  return {
    masteredTopicIds: [],
    accessibleRegionIds: [],
    currentRegionId: null
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
    doNotGrantClearance: overrides.doNotGrantClearance !== false
  };
}

export function gameSummitContext({
  regionId,
  investigationId,
  topicId,
  conceptIds,
  studentProgress
} = {}) {
  return emptySummitContext({
    contextType: "game",
    regionId: regionId || null,
    investigationId: investigationId || null,
    topicId: topicId || null,
    conceptIds: conceptIds || [],
    studentProgress
  });
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
  return curriculumTopicsFromWorld(world).map((topic) => ({
    id: `experience-${topic.regionId}`,
    kind: "field-region",
    regionId: topic.regionId,
    topicId: topic.id,
    status: topic.implementationState,
    entry: "game"
  }));
}

export function loadLearningCatalog(catalog, world, standards) {
  const topics = curriculumTopicsFromWorld(world);
  return {
    schemaVersion: Number(catalog?.schemaVersion) || LEARNING_SCHEMA_VERSION,
    status: catalog?.status || "foundation",
    playerVisibleCodes: catalog?.playerVisibleCodes === true,
    topics,
    concepts: Array.isArray(catalog?.collections?.concepts) ? catalog.collections.concepts : [],
    standards: Array.isArray(standards?.alignments) ? standards.alignments : [],
    resources: Array.isArray(catalog?.collections?.resources) ? catalog.collections.resources : [],
    stories: Array.isArray(catalog?.collections?.stories) ? catalog.collections.stories : [],
    videos: Array.isArray(catalog?.collections?.videos) ? catalog.collections.videos : [],
    experiences: gameExperiencesFromWorld(world),
    deepForestDispatch: catalog?.deepForestDispatch || null,
    standardsStatus: standards?.status || catalog?.standardsStatus || "pending-owner-codes"
  };
}

export function relatedForStory(story, catalog) {
  if (!story) return { topics: [], videos: [], experiences: [], standards: [] };
  const topicIds = new Set(story.topicIds || []);
  return {
    topics: (catalog?.topics || []).filter((row) => topicIds.has(row.id)),
    videos: (catalog?.videos || []).filter((row) => (row.storyIds || []).includes(story.id)),
    experiences: (catalog?.experiences || []).filter((row) => topicIds.has(row.topicId)),
    standards: (catalog?.standards || []).filter((row) => (row.topicIds || []).some((id) => topicIds.has(id)))
  };
}
