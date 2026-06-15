/**
 * Waypoint Education Framework — Lesson factory
 * Helpers for products authoring canonical lessons (no content included).
 */
(function (global) {
  "use strict";

  var edu = global.WDS && global.WDS.education;
  if (!edu) return;

  function emptySection() {
    return { body: "", steps: [], bullets: [], prompts: [] };
  }

  function skippedSection(reason) {
    return { skipped: true, skipReason: reason || "Not applicable for this lesson." };
  }

  function futureQuiz(message) {
    return {
      status: "future",
      futureMessage: message || "",
      items: []
    };
  }

  /**
   * Create a blank lesson scaffold with all template sections.
   */
  function createLesson(id, title, options) {
    options = options || {};
    return {
      id: id,
      title: title,
      subtitle: options.subtitle || "",
      domains: options.domains || ["field-skills"],
      level: options.level || "beginner",
      durationMinutes: options.durationMinutes || null,
      summary: options.summary || "",
      sections: {
        what: options.what || emptySection(),
        why: options.why || emptySection(),
        identify: options.identify != null ? options.identify : skippedSection("Identification is not the focus of this lesson."),
        howItWorks: options.howItWorks || { steps: [] },
        fieldObservations: options.fieldObservations || { prompts: [] },
        mistakes: options.mistakes || { bullets: [] },
        ethics: options.ethics != null ? options.ethics : skippedSection(),
        safety: options.safety != null ? options.safety : skippedSection(),
        challenge: options.challenge || emptySection(),
        quiz: options.quiz || futureQuiz()
      },
      related: options.related || []
    };
  }

  function createTrack(id, title, options) {
    options = options || {};
    return {
      id: id,
      title: title,
      subtitle: options.subtitle || "",
      domains: options.domains || [],
      lessons: options.lessons || []
    };
  }

  function createCurriculum(product, options) {
    options = options || {};
    return {
      version: edu.VERSION,
      product: product,
      mission: options.mission || "",
      intro: options.intro || "",
      tracks: options.tracks || []
    };
  }

  global.WDS.education.factory = {
    createLesson: createLesson,
    createTrack: createTrack,
    createCurriculum: createCurriculum,
    emptySection: emptySection,
    skippedSection: skippedSection,
    futureQuiz: futureQuiz
  };
})(window);
