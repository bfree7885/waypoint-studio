/**
 * Waypoint University — schema 1.1 (Work Block 2).
 * Knowledge graph vocabulary, sources, questions, research stages.
 */
(function (global) {
  "use strict";

  var SCHEMA = "1.1.0";
  var DB_NAME = "waypoint-university-v1";
  var DB_VERSION = 1;

  var KINDS = [
    { id: "topic", label: "Topic", plural: "Topics" },
    { id: "concept", label: "Concept", plural: "Concepts" },
    { id: "article", label: "Article", plural: "Articles" },
    { id: "paper", label: "Academic paper", plural: "Papers" },
    { id: "research-note", label: "Research note", plural: "Research notes" },
    { id: "book", label: "Book", plural: "Books" },
    { id: "course", label: "Course", plural: "Courses" },
    { id: "video", label: "Video", plural: "Videos" },
    { id: "podcast", label: "Podcast", plural: "Podcasts" },
    { id: "website", label: "Website", plural: "Websites" },
    { id: "document", label: "Document", plural: "Documents" },
    { id: "manual", label: "Manual", plural: "Manuals" },
    { id: "project", label: "Project", plural: "Projects" },
    { id: "idea", label: "Idea", plural: "Ideas" },
    { id: "question", label: "Question", plural: "Questions" },
    { id: "experiment", label: "Experiment", plural: "Experiments" },
    { id: "observation", label: "Observation", plural: "Observations" },
    { id: "definition", label: "Definition", plural: "Definitions" },
    { id: "reference", label: "Reference page", plural: "Reference pages" },
    { id: "path", label: "Learning path", plural: "Learning paths" },
    { id: "capture", label: "Quick capture", plural: "Captures" },
    { id: "media", label: "Media", plural: "Media" },
    { id: "person", label: "Person", plural: "People" },
    { id: "place", label: "Place", plural: "Places" },
    { id: "code", label: "Code", plural: "Code" },
    { id: "checklist", label: "Checklist", plural: "Checklists" },
    { id: "task", label: "Task", plural: "Tasks" }
  ];

  var SOURCE_KINDS = ["book", "paper", "article", "document", "manual", "video", "podcast", "website", "course"];

  /** Canonical relationship vocabulary — UX labels match thinking language */
  var RELATION_TYPES = [
    { id: "relates-to", label: "Related concepts", inverse: "relates-to", directed: false, group: "related" },
    { id: "learn-before", label: "Prerequisites", inverse: "continue-with", directed: true, group: "structure" },
    { id: "continue-with", label: "Continue with", inverse: "learn-before", directed: true, group: "structure" },
    { id: "builds-upon", label: "Builds upon", inverse: "built-upon-by", directed: true, group: "structure" },
    { id: "built-upon-by", label: "Built upon by", inverse: "builds-upon", directed: true, group: "structure" },
    { id: "contradicts", label: "Contradicts", inverse: "contradicted-by", directed: true, group: "tension" },
    { id: "contradicted-by", label: "Contradicted by", inverse: "contradicts", directed: true, group: "tension" },
    { id: "has-example", label: "Examples", inverse: "example-of", directed: true, group: "evidence" },
    { id: "example-of", label: "Example of", inverse: "has-example", directed: true, group: "evidence" },
    { id: "used-in", label: "Applications / used in", inverse: "uses", directed: true, group: "application" },
    { id: "uses", label: "Uses", inverse: "used-in", directed: true, group: "application" },
    { id: "referenced-by", label: "Referenced by", inverse: "references", directed: true, group: "citation" },
    { id: "references", label: "References", inverse: "referenced-by", directed: true, group: "citation" },
    { id: "questions", label: "Questions about", inverse: "answered-by", directed: true, group: "inquiry" },
    { id: "answered-by", label: "Potential answers", inverse: "questions", directed: true, group: "inquiry" },
    { id: "future-research", label: "Future research", inverse: "researched-from", directed: true, group: "inquiry" },
    { id: "researched-from", label: "Research from", inverse: "future-research", directed: true, group: "inquiry" },
    { id: "studied-with", label: "Frequently studied together", inverse: "studied-with", directed: false, group: "related" },
    { id: "part-of", label: "Part of", inverse: "contains", directed: true, group: "structure" },
    { id: "contains", label: "Contains", inverse: "part-of", directed: true, group: "structure" },
    { id: "defines", label: "Defines", inverse: "defined-by", directed: true, group: "structure" },
    { id: "defined-by", label: "Defined by", inverse: "defines", directed: true, group: "structure" },
    { id: "observes", label: "Observes", inverse: "observed-in", directed: true, group: "evidence" },
    { id: "observed-in", label: "Observed in", inverse: "observes", directed: true, group: "evidence" },
    { id: "implements", label: "Implements", inverse: "implemented-by", directed: true, group: "application" },
    { id: "implemented-by", label: "Implemented by", inverse: "implements", directed: true, group: "application" },
    { id: "mentions", label: "Mentions", inverse: "mentioned-in", directed: true, group: "citation" },
    { id: "mentioned-in", label: "Mentioned in", inverse: "mentions", directed: true, group: "citation" },
    { id: "evidence-for", label: "Evidence for", inverse: "has-evidence", directed: true, group: "evidence" },
    { id: "has-evidence", label: "Has evidence", inverse: "evidence-for", directed: true, group: "evidence" }
  ];

  var RELATION_GROUPS = [
    { id: "related", label: "Related" },
    { id: "structure", label: "Structure / prerequisites" },
    { id: "application", label: "Applications" },
    { id: "evidence", label: "Examples & evidence" },
    { id: "citation", label: "Citations" },
    { id: "inquiry", label: "Questions & research" },
    { id: "tension", label: "Contradictions" }
  ];

  /** Primary link picker options (outbound-friendly) */
  var LINK_PICKER = [
    "relates-to",
    "learn-before",
    "builds-upon",
    "contradicts",
    "has-example",
    "used-in",
    "references",
    "questions",
    "future-research",
    "studied-with",
    "part-of",
    "defines",
    "implements",
    "evidence-for",
    "mentions"
  ];

  var PROJECTS = [
    { id: "waypoint-studio", label: "Waypoint Studio" },
    { id: "signalterrain", label: "SignalTerrain" },
    { id: "scenes", label: "Scenes" },
    { id: "fieldry", label: "Fieldry" },
    { id: "sheds", label: "Sheds" },
    { id: "foragecast", label: "ForageCast" },
    { id: "steepleaf", label: "Steepleaf" },
    { id: "savant", label: "Savant Sommelier" },
    { id: "volunteer", label: "Waypoint Volunteer" },
    { id: "dashboard", label: "Dashboard" },
    { id: "photography", label: "Photography" },
    { id: "cybersecurity", label: "Cybersecurity" },
    { id: "linux", label: "Linux" },
    { id: "gis", label: "GIS" },
    { id: "ecology", label: "Ecology" },
    { id: "tea", label: "Tea" },
    { id: "wine", label: "Wine" },
    { id: "foraging", label: "Foraging" },
    { id: "university", label: "Waypoint University" },
    { id: "other", label: "Other / personal" }
  ];

  var PATH_TEMPLATES = [
    { title: "Cybersecurity", slug: "cybersecurity" },
    { title: "Photography", slug: "photography" },
    { title: "Linux", slug: "linux" },
    { title: "Artificial Intelligence", slug: "artificial-intelligence" },
    { title: "GIS", slug: "gis" },
    { title: "Tea", slug: "tea" },
    { title: "Wine", slug: "wine" },
    { title: "Ecology", slug: "ecology" },
    { title: "Foraging", slug: "foraging" },
    { title: "Wildlife", slug: "wildlife" },
    { title: "Programming", slug: "programming" },
    { title: "Signal Processing", slug: "signal-processing" },
    { title: "Waypoint Studio", slug: "waypoint-studio" }
  ];

  var MEDIA_KINDS = [
    { id: "image", label: "Image", future: ["ocr"] },
    { id: "pdf", label: "PDF", future: ["ocr", "text-extract"] },
    { id: "video", label: "Video", future: ["transcript"] },
    { id: "audio", label: "Audio", future: ["transcript", "voice-capture"] },
    { id: "code", label: "Code file", future: [] },
    { id: "diagram", label: "Diagram", future: [] },
    { id: "other", label: "Other", future: [] }
  ];

  var QUESTION_STATUSES = [
    { id: "open", label: "Open" },
    { id: "investigating", label: "Investigating" },
    { id: "answered", label: "Answered" },
    { id: "parked", label: "Parked" }
  ];

  var RESEARCH_STAGES = [
    { id: "capture", label: "Capture idea", next: "sources" },
    { id: "sources", label: "Collect sources", next: "summary" },
    { id: "summary", label: "Summarize findings", next: "concepts" },
    { id: "concepts", label: "Extract concepts", next: "links" },
    { id: "links", label: "Link to knowledge", next: "questions" },
    { id: "questions", label: "Identify questions", next: "conclusions" },
    { id: "conclusions", label: "Record conclusions", next: "follow-up" },
    { id: "follow-up", label: "Suggest further research", next: null }
  ];

  var READING_STATUSES = [
    { id: "unread", label: "Unread" },
    { id: "reading", label: "Reading" },
    { id: "finished", label: "Finished" },
    { id: "reference", label: "Reference only" }
  ];

  function kindLabel(id) {
    for (var i = 0; i < KINDS.length; i++) {
      if (KINDS[i].id === id) return KINDS[i].label;
    }
    return id || "Item";
  }

  function relationLabel(id) {
    for (var i = 0; i < RELATION_TYPES.length; i++) {
      if (RELATION_TYPES[i].id === id) return RELATION_TYPES[i].label;
    }
    return id || "Related";
  }

  function relationMeta(id) {
    for (var i = 0; i < RELATION_TYPES.length; i++) {
      if (RELATION_TYPES[i].id === id) return RELATION_TYPES[i];
    }
    return null;
  }

  function projectLabel(id) {
    for (var i = 0; i < PROJECTS.length; i++) {
      if (PROJECTS[i].id === id) return PROJECTS[i].label;
    }
    return id || "Project";
  }

  function isSourceKind(kind) {
    return SOURCE_KINDS.indexOf(kind) >= 0;
  }

  global.WU = global.WU || {};
  global.WU.Schema = {
    SCHEMA: SCHEMA,
    DB_NAME: DB_NAME,
    DB_VERSION: DB_VERSION,
    KINDS: KINDS,
    SOURCE_KINDS: SOURCE_KINDS,
    RELATION_TYPES: RELATION_TYPES,
    RELATION_GROUPS: RELATION_GROUPS,
    LINK_PICKER: LINK_PICKER,
    PROJECTS: PROJECTS,
    PATH_TEMPLATES: PATH_TEMPLATES,
    MEDIA_KINDS: MEDIA_KINDS,
    QUESTION_STATUSES: QUESTION_STATUSES,
    RESEARCH_STAGES: RESEARCH_STAGES,
    READING_STATUSES: READING_STATUSES,
    kindLabel: kindLabel,
    relationLabel: relationLabel,
    relationMeta: relationMeta,
    projectLabel: projectLabel,
    isSourceKind: isSourceKind
  };
})(typeof window !== "undefined" ? window : globalThis);
