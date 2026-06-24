/**
 * Waypoint Educational Framework — Topic model
 *
 * Nine-pillar educational topics for all products. Bridges WEF lessons,
 * Field Guide pages, and Content Engine types without rewriting legacy content.
 *
 * @see docs/WAYPOINT-EDUCATIONAL-FRAMEWORK.md
 * @see design-system/education/TOPIC-STANDARD.md
 */
(function (global) {
  "use strict";

  var VERSION = "1.0.0";
  var SCHEMA_ID = "https://waypoint.studio/schemas/education/topic/v1";

  var PILLARS = Object.freeze([
    { key: "what", label: "What is it?", question: "What am I learning about?" },
    { key: "why", label: "Why does it matter?", question: "Why should I care?" },
    { key: "howItWorks", label: "How does it work?", question: "What is the mechanism or process?" },
    { key: "where", label: "Where can it be found?", question: "Where do I look?" },
    { key: "when", label: "When is it most relevant?", question: "When should I go?" },
    { key: "observeSafely", label: "How can someone safely observe it?", question: "How do I observe safely and ethically?" },
    { key: "learnMore", label: "How can they learn more?", question: "What are the next steps?" },
    { key: "connections", label: "How does this connect to larger ecological systems?", question: "What else is linked in nature?" }
  ]);

  var PILLAR_KEYS = PILLARS.map(function (p) { return p.key; });

  var FIELD_TOPIC_TYPES = Object.freeze([
    "species", "habitat", "ecosystem", "phenomenon", "investigation", "challenge", "conservation"
  ]);

  var WEF_TO_PILLAR = Object.freeze({
    what: "what",
    why: "why",
    howItWorks: "howItWorks",
    identify: "where",
    fieldObservations: "observeSafely",
    mistakes: "observeSafely",
    ethics: "observeSafely",
    safety: "observeSafely",
    related: "learnMore",
    challenge: "learnMore"
  });

  var REQUIRED_BY_TYPE = {
    species: ["what", "why", "where", "when", "observeSafely", "connections"],
    habitat: ["what", "why", "where", "when", "observeSafely", "connections"],
    ecosystem: ["what", "why", "howItWorks", "connections"],
    phenomenon: ["what", "why", "howItWorks", "when", "observeSafely", "connections"],
    skill: ["what", "why", "howItWorks", "observeSafely", "learnMore"],
    research: ["what", "why", "howItWorks", "connections", "learnMore"],
    challenge: ["what", "when", "observeSafely", "connections"],
    investigation: ["what", "why", "where", "when", "observeSafely", "connections"],
    equipment: ["what", "why", "howItWorks", "observeSafely"],
    conservation: ["what", "why", "connections", "learnMore"]
  };

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function isObject(v) {
    return v != null && typeof v === "object" && !Array.isArray(v);
  }

  function hasText(val) {
    if (val == null) return false;
    if (typeof val === "string") return val.trim().length > 0;
    if (!isObject(val)) return false;
    if (val.skipped) return !!val.skipReason;
    if (val.body && String(val.body).trim()) return true;
    if (val.season && String(val.season).trim()) return true;
    if (val.bullets && val.bullets.length) return true;
    if (val.steps && val.steps.length) return true;
    if (val.prompts && val.prompts.length) return true;
    if (val.habitats && val.habitats.length) return true;
    if (val.spheres && val.spheres.length) return true;
    if (val.lessons && val.lessons.length) return true;
    if (val.tools && val.tools.length) return true;
    if (val.safety && hasText(val.safety)) return true;
    if (val.ethics && hasText(val.ethics)) return true;
    if (val.mistakes && hasText(val.mistakes)) return true;
    if (val.challenge && hasText(val.challenge)) return true;
    return false;
  }

  function emptySection() {
    return { body: "" };
  }

  function createTopic(options) {
    options = options || {};
    return {
      id: options.id || "topic-" + Date.now(),
      title: options.title || "Untitled topic",
      subtitle: options.subtitle || null,
      type: options.type || "phenomenon",
      product: options.product || null,
      domains: options.domains || [],
      level: options.level || "beginner",
      durationMinutes: options.durationMinutes || null,
      summary: options.summary || null,
      drivingQuestion: options.drivingQuestion || null,
      pillars: {
        what: emptySection(),
        why: emptySection(),
        howItWorks: { steps: [] },
        where: { body: "", habitats: [], mapRef: null, localityHints: [] },
        when: { season: null, body: "" },
        observeSafely: {
          safety: { bullets: [] },
          ethics: { body: "" },
          prompts: [],
          mistakes: { bullets: [] }
        },
        learnMore: {
          lessons: [],
          articles: [],
          tools: [],
          videos: [],
          challenge: { body: "" }
        },
        connections: { body: "", spheres: [] }
      },
      integrity: options.integrity || { provenance: "educational", source: null, citation: null },
      meta: { version: VERSION, author: null }
    };
  }

  function pillarFilled(topic, key) {
    if (!topic || !topic.pillars) return false;
    return hasText(topic.pillars[key]);
  }

  function gapsForTopic(topic) {
    var required = REQUIRED_BY_TYPE[topic.type] || PILLAR_KEYS.slice();
    return required.filter(function (key) {
      return !pillarFilled(topic, key);
    });
  }

  function validateTopic(topic) {
    var errors = [];
    if (!topic || !isObject(topic)) {
      return { ok: false, errors: ["Topic must be an object"], gaps: PILLAR_KEYS };
    }
    if (!topic.id) errors.push("Missing id");
    if (!topic.title) errors.push("Missing title");
    if (!topic.type) errors.push("Missing type");
    if (!topic.pillars) errors.push("Missing pillars object");

    var gaps = gapsForTopic(topic);
    if (FIELD_TOPIC_TYPES.indexOf(topic.type) >= 0 && gaps.indexOf("observeSafely") >= 0) {
      errors.push("Field topics require observeSafely pillar");
    }

    return {
      ok: errors.length === 0 && gaps.length === 0,
      errors: errors,
      gaps: gaps,
      coverage: 1 - gaps.length / PILLAR_KEYS.length
    };
  }

  function auditWefLesson(lesson) {
    var topic = topicFromWefLesson(lesson);
    var covered = PILLAR_KEYS.filter(function (k) { return pillarFilled(topic, k); });
    var gaps = PILLAR_KEYS.filter(function (k) { return !pillarFilled(topic, k); });
    return {
      lessonId: lesson && lesson.id,
      covered: covered,
      gaps: gaps,
      score: covered.length / PILLAR_KEYS.length,
      topic: topic
    };
  }

  function topicFromWefLesson(lesson) {
    if (!lesson) return createTopic({ title: "Unknown" });
    var s = lesson.sections || {};
    var related = lesson.related || [];

    return {
      id: lesson.id || "lesson-unknown",
      title: lesson.title || "Untitled lesson",
      subtitle: lesson.subtitle || null,
      type: inferTypeFromDomains(lesson.domains),
      product: null,
      domains: lesson.domains || [],
      level: lesson.level || "beginner",
      durationMinutes: lesson.durationMinutes || null,
      summary: lesson.summary || null,
      drivingQuestion: null,
      pillars: {
        what: copySection(s.what),
        why: copySection(s.why),
        howItWorks: copySection(s.howItWorks),
        where: mergeWhereFromWef(s.identify),
        when: mergeWhenFromWef(s.fieldObservations),
        observeSafely: {
          safety: copySection(s.safety),
          ethics: copySection(s.ethics),
          prompts: s.fieldObservations && s.fieldObservations.prompts ? s.fieldObservations.prompts.slice() : [],
          mistakes: copySection(s.mistakes)
        },
        learnMore: {
          lessons: related.map(function (r) {
            if (typeof r === "string") return { id: r, title: r };
            return { id: r.id, title: r.title || r.id };
          }),
          articles: [],
          tools: [],
          videos: [],
          challenge: copySection(s.challenge)
        },
        connections: { body: "", spheres: [], skipped: true, skipReason: "Add connections pillar in future revision" }
      },
      integrity: { provenance: "educational" },
      meta: { version: VERSION, bridgedFrom: "wef-lesson" }
    };
  }

  function copySection(sec) {
    if (!sec) return {};
    if (typeof sec === "string") return { body: sec };
    if (Array.isArray(sec)) return { bullets: sec.slice() };
    return JSON.parse(JSON.stringify(sec));
  }

  function mergeWhereFromWef(identify) {
    var base = { body: "", habitats: [], mapRef: null, localityHints: [] };
    if (!identify) return base;
    if (identify.body) base.body = identify.body;
    if (identify.bullets) base.localityHints = identify.bullets.slice();
    return base;
  }

  function mergeWhenFromWef(fieldObs) {
    var base = { season: null, body: "" };
    if (!fieldObs) return base;
    if (fieldObs.body) base.body = fieldObs.body;
    return base;
  }

  function inferTypeFromDomains(domains) {
    domains = domains || [];
    if (domains.indexOf("species") >= 0) return "species";
    if (domains.indexOf("habitats") >= 0) return "habitat";
    if (domains.indexOf("wildlife") >= 0) return "species";
    if (domains.indexOf("geology") >= 0) return "phenomenon";
    if (domains.indexOf("weather") >= 0) return "phenomenon";
    if (domains.indexOf("conservation") >= 0) return "conservation";
    if (domains.indexOf("field-skills") >= 0) return "skill";
    return "phenomenon";
  }

  function pillarLabel(key) {
    var p = PILLARS.find(function (x) { return x.key === key; });
    return p ? p.label : key;
  }

  function renderOutline(topic, options) {
    options = options || {};
    topic = topic || createTopic();
    var showGaps = options.showGaps !== false;
    var gaps = gapsForTopic(topic);
    var items = PILLARS.map(function (p) {
      var filled = pillarFilled(topic, p.key);
      var isGap = gaps.indexOf(p.key) >= 0;
      var state = filled ? "complete" : (isGap && showGaps ? "gap" : "empty");
      return (
        '<li class="wef-topic-outline__item wef-topic-outline__item--' + state + '">' +
          '<span class="wef-topic-outline__label">' + escapeHtml(p.label) + "</span>" +
          (filled ? '<span class="wef-topic-outline__status" aria-hidden="true">✓</span>' : "") +
        "</li>"
      );
    }).join("");

    var integrity = "";
    if (topic.integrity && global.WDS && global.WDS.researchIntegrity && global.WDS.researchIntegrity.renderFootnote) {
      integrity = global.WDS.researchIntegrity.renderFootnote({
        provenance: topic.integrity.provenance || "educational",
        disclaimer: topic.integrity.source || null
      });
    }

    return (
      '<nav class="wef-topic-outline" aria-label="Educational topic coverage">' +
        (topic.drivingQuestion
          ? '<p class="wef-topic-outline__question"><strong>Driving question:</strong> ' + escapeHtml(topic.drivingQuestion) + "</p>"
          : "") +
        '<ol class="wef-topic-outline__list">' + items + "</ol>" +
        (showGaps && gaps.length
          ? '<p class="wef-topic-outline__gaps">Gaps: ' + escapeHtml(gaps.map(pillarLabel).join(" · ")) + "</p>"
          : "") +
        integrity +
      "</nav>"
    );
  }

  global.WDS = global.WDS || {};
  global.WDS.educationTopic = {
    VERSION: VERSION,
    SCHEMA_ID: SCHEMA_ID,
    PILLARS: PILLARS,
    PILLAR_KEYS: PILLAR_KEYS,
    WEF_TO_PILLAR: WEF_TO_PILLAR,
    REQUIRED_BY_TYPE: REQUIRED_BY_TYPE,
    createTopic: createTopic,
    validateTopic: validateTopic,
    auditWefLesson: auditWefLesson,
    topicFromWefLesson: topicFromWefLesson,
    pillarFilled: pillarFilled,
    gapsForTopic: gapsForTopic,
    pillarLabel: pillarLabel,
    renderOutline: renderOutline,
    hasText: hasText
  };
})(window);
