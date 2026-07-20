/**
 * Waypoint University — schema 1.5 (Module 6 · research assistant).
 * Decision/hypothesis statuses, assist action vocabulary.
 */
(function (global) {
  "use strict";

  var SCHEMA = "1.5.0";
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
    { id: "task", label: "Task", plural: "Tasks" },
    { id: "session", label: "Research session", plural: "Research sessions" },
    { id: "field-note", label: "Field note", plural: "Field notes" },
    { id: "hypothesis", label: "Hypothesis", plural: "Hypotheses" },
    { id: "decision", label: "Decision journal", plural: "Decision journals" },
    { id: "argument", label: "Argument map", plural: "Argument maps" },
    { id: "concept-map", label: "Concept map", plural: "Concept maps" },
    { id: "journal", label: "Journal entry", plural: "Journal entries" },
    { id: "personal-communication", label: "Personal communication", plural: "Personal communications" },
    { id: "other", label: "Other source", plural: "Other sources" }
  ];

  var SOURCE_KINDS = [
    "book",
    "paper",
    "article",
    "document",
    "manual",
    "video",
    "podcast",
    "website",
    "course",
    "personal-communication",
    "other"
  ];

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
    { id: "partial", label: "Partially answered" },
    { id: "answered", label: "Resolved" },
    { id: "deferred", label: "Deferred" },
    { id: "parked", label: "Parked" }
  ];

  var NODE_STATUSES = [
    { id: "active", label: "Active" },
    { id: "draft", label: "Draft" },
    { id: "archived", label: "Archived" }
  ];

  var HYPOTHESIS_STATUSES = [
    { id: "proposed", label: "Proposed" },
    { id: "testing", label: "Testing" },
    { id: "supported", label: "Supported (tentative)" },
    { id: "challenged", label: "Challenged" },
    { id: "retired", label: "Retired" }
  ];

  var DECISION_STATUSES = [
    { id: "draft", label: "Draft" },
    { id: "decided", label: "Decided" },
    { id: "reviewing", label: "Under review" },
    { id: "closed", label: "Closed" }
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

  /** Understanding Map stages — descriptive, never grades */
  var UNDERSTANDING_STAGES = [
    { id: "discovered", label: "Discovered", blurb: "Noticed and captured." },
    { id: "exploring", label: "Exploring", blurb: "Reading and turning over the idea." },
    { id: "practicing", label: "Practicing", blurb: "Working examples and small drills." },
    { id: "applying", label: "Applying", blurb: "Using it in a project or decision." },
    { id: "connecting", label: "Connecting", blurb: "Linking across topics and fields." },
    { id: "teaching", label: "Teaching", blurb: "Explaining, defining, answering others." },
    { id: "mastering", label: "Mastering", blurb: "Stable, revisited, confidently held." }
  ];

  var ANNOTATION_KINDS = [
    { id: "highlight", label: "Highlight" },
    { id: "margin", label: "Margin note" },
    { id: "definition", label: "Definition" },
    { id: "question", label: "Question" },
    { id: "concept", label: "Related concept" },
    { id: "future", label: "Future research" }
  ];

  /**
   * Cross-disciplinary bridges — surface unexpected relationships.
   * left/right are project lane ids (and compatible path themes).
   */
  var DISCIPLINE_BRIDGES = [
    {
      id: "vision-photo",
      label: "Computer vision ↔ Photography",
      blurb: "Seeing systems and making photographs share optics, signal, and attention.",
      left: ["scenes", "signalterrain", "dashboard"],
      right: ["photography"]
    },
    {
      id: "gis-ecology",
      label: "GIS ↔ Ecology",
      blurb: "Place, pattern, and living systems.",
      left: ["gis", "fieldry"],
      right: ["ecology"]
    },
    {
      id: "ecology-forage",
      label: "Ecology ↔ Foraging",
      blurb: "Field knowledge meets seasonal attention.",
      left: ["ecology", "foragecast"],
      right: ["foraging"]
    },
    {
      id: "cyber-linux",
      label: "Cybersecurity ↔ Linux",
      blurb: "Defensive understanding needs the systems layer.",
      left: ["cybersecurity", "signalterrain"],
      right: ["linux"]
    },
    {
      id: "stats-wildlife",
      label: "Statistics ↔ Wildlife / field research",
      blurb: "Observation becomes evidence when counted carefully.",
      left: ["fieldry", "foragecast", "ecology"],
      right: ["dashboard", "other"]
    },
    {
      id: "ai-apps",
      label: "Artificial intelligence ↔ Waypoint apps",
      blurb: "AI ideas should touch every product lane you build.",
      left: ["waypoint-studio", "university"],
      right: ["signalterrain", "scenes", "dashboard", "volunteer", "steepleaf", "savant", "foragecast"]
    },
    {
      id: "tea-ecology",
      label: "Tea ↔ Ecology / place",
      blurb: "Plants, terroir, and attentive tasting.",
      left: ["tea", "steepleaf"],
      right: ["ecology", "foraging"]
    },
    {
      id: "wine-place",
      label: "Wine ↔ Place / ecology",
      blurb: "Terroir links palate to landscape.",
      left: ["wine", "savant"],
      right: ["ecology", "gis"]
    }
  ];

  /** Scholar research workspaces — shared design, distinct workflows */
  var SCHOLAR_WORKSPACES = [
    {
      id: "active",
      label: "Active Research",
      blurb: "Focused inquiry in progress — sessions, notes, and open threads.",
      kinds: ["session", "research-note", "topic", "concept", "idea"],
      primaryAction: { href: "#scholar/session", label: "Start session" }
    },
    {
      id: "reading",
      label: "Reading",
      blurb: "Deep reading with sources, highlights, and reliability notes.",
      kinds: ["book", "paper", "article", "document", "manual", "video", "podcast", "website", "course"],
      primaryAction: { href: "#reading", label: "Reading workspace" }
    },
    {
      id: "writing",
      label: "Writing",
      blurb: "Compose definitions, articles, and synthesis from evidence.",
      kinds: ["article", "research-note", "definition", "reference", "argument"],
      primaryAction: { href: "#new/research-note", label: "New writing" }
    },
    {
      id: "projects",
      label: "Projects",
      blurb: "Living research hubs for every Waypoint lane and personal project.",
      kinds: ["project"],
      primaryAction: { href: "#projects", label: "Open projects" }
    },
    {
      id: "experiments",
      label: "Experiments",
      blurb: "Hypotheses, trials, and results — careful, revisable claims.",
      kinds: ["experiment", "hypothesis"],
      primaryAction: { href: "#new/experiment", label: "New experiment" }
    },
    {
      id: "reference",
      label: "Reference",
      blurb: "Stable lookup pages, manuals, and citation anchors.",
      kinds: ["reference", "manual", "document", "definition"],
      primaryAction: { href: "#new/reference", label: "New reference" }
    },
    {
      id: "questions",
      label: "Questions",
      blurb: "Unresolved curiosity — linked to evidence and experiments.",
      kinds: ["question"],
      primaryAction: { href: "#new/question", label: "New question" }
    },
    {
      id: "field",
      label: "Field Notes",
      blurb: "Observations from the world — trails, tastings, investigations.",
      kinds: ["field-note", "observation"],
      primaryAction: { href: "#scholar/field", label: "Quick field note" }
    }
  ];

  var FIELD_NOTE_CONTEXTS = [
    { id: "photography", label: "Photography outing" },
    { id: "wildlife", label: "Wildlife observation" },
    { id: "trail", label: "Trail walk" },
    { id: "tea", label: "Tea tasting" },
    { id: "wine", label: "Wine tasting" },
    { id: "foraging", label: "Foraging trip" },
    { id: "cyber", label: "Cybersecurity investigation" },
    { id: "linux", label: "Linux troubleshooting" },
    { id: "gis", label: "GIS / field survey" },
    { id: "other", label: "Other field work" }
  ];

  var SESSION_STATUSES = [
    { id: "active", label: "Active" },
    { id: "completed", label: "Completed" },
    { id: "abandoned", label: "Parked" }
  ];

  /** Personal source reliability — organize evidence without pretending certainty */
  var RELIABILITY_DIMENSIONS = [
    { id: "authority", label: "Authority", blurb: "Who produced this, and how qualified?" },
    { id: "evidence", label: "Evidence", blurb: "How well is the claim supported?" },
    { id: "bias", label: "Bias concern", blurb: "0 = little concern · 5 = strong concern" },
    { id: "recency", label: "Recency", blurb: "How current is this for your purpose?" },
    { id: "confidence", label: "Your confidence", blurb: "How much weight will you give it for now?" }
  ];

  /**
   * Thinking tools — extensible foundations (full canvases in later modules).
   */
  var THINKING_TOOLS = [
    {
      id: "concept-map",
      kind: "concept-map",
      label: "Concept map",
      blurb: "Nodes and relations for a topic cluster.",
      status: "foundation",
      fields: ["nodes", "focusId"]
    },
    {
      id: "argument-map",
      kind: "argument",
      label: "Argument map",
      blurb: "Claims, supports, and objections.",
      status: "foundation",
      fields: ["claim", "supports", "objections"]
    },
    {
      id: "decision-journal",
      kind: "decision",
      label: "Decision journal",
      blurb: "Decision, reasoning, evidence, alternatives, expected outcome, confidence, review date, later observations.",
      status: "ready",
      fields: [
        "decision",
        "rationale",
        "evidenceUsed",
        "alternatives",
        "expectedOutcome",
        "confidence",
        "reviewDate",
        "laterObservations"
      ]
    },
    {
      id: "hypothesis",
      kind: "hypothesis",
      label: "Hypothesis tracking",
      blurb: "Statement with supporting and contradicting evidence — never treated as fact.",
      status: "ready",
      fields: [
        "statement",
        "hypothesisStatus",
        "supportingEvidence",
        "contradictingEvidence",
        "experiments",
        "confidence"
      ]
    },
    {
      id: "experiment-plan",
      kind: "experiment",
      label: "Experiment planning",
      blurb: "Question, method, result, next step.",
      status: "foundation",
      fields: ["question", "method", "result", "next"]
    }
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

  function understandingLabel(id) {
    for (var i = 0; i < UNDERSTANDING_STAGES.length; i++) {
      if (UNDERSTANDING_STAGES[i].id === id) return UNDERSTANDING_STAGES[i].label;
    }
    return id || "Discovered";
  }

  function annotationLabel(id) {
    for (var i = 0; i < ANNOTATION_KINDS.length; i++) {
      if (ANNOTATION_KINDS[i].id === id) return ANNOTATION_KINDS[i].label;
    }
    return id || "Note";
  }

  function workspaceLabel(id) {
    for (var i = 0; i < SCHOLAR_WORKSPACES.length; i++) {
      if (SCHOLAR_WORKSPACES[i].id === id) return SCHOLAR_WORKSPACES[i].label;
    }
    return id || "Workspace";
  }

  function fieldContextLabel(id) {
    for (var i = 0; i < FIELD_NOTE_CONTEXTS.length; i++) {
      if (FIELD_NOTE_CONTEXTS[i].id === id) return FIELD_NOTE_CONTEXTS[i].label;
    }
    return id || "Field work";
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
    NODE_STATUSES: NODE_STATUSES,
    HYPOTHESIS_STATUSES: HYPOTHESIS_STATUSES,
    DECISION_STATUSES: DECISION_STATUSES,
    RESEARCH_STAGES: RESEARCH_STAGES,
    READING_STATUSES: READING_STATUSES,
    UNDERSTANDING_STAGES: UNDERSTANDING_STAGES,
    ANNOTATION_KINDS: ANNOTATION_KINDS,
    DISCIPLINE_BRIDGES: DISCIPLINE_BRIDGES,
    SCHOLAR_WORKSPACES: SCHOLAR_WORKSPACES,
    FIELD_NOTE_CONTEXTS: FIELD_NOTE_CONTEXTS,
    SESSION_STATUSES: SESSION_STATUSES,
    RELIABILITY_DIMENSIONS: RELIABILITY_DIMENSIONS,
    THINKING_TOOLS: THINKING_TOOLS,
    kindLabel: kindLabel,
    relationLabel: relationLabel,
    relationMeta: relationMeta,
    projectLabel: projectLabel,
    isSourceKind: isSourceKind,
    understandingLabel: understandingLabel,
    annotationLabel: annotationLabel,
    workspaceLabel: workspaceLabel,
    fieldContextLabel: fieldContextLabel
  };
})(typeof window !== "undefined" ? window : globalThis);
