/**
 * Waypoint Education Framework (WEF)
 * Shared education engine for all Waypoint Studio products.
 *
 * @see design-system/education/README.md
 */
(function (global) {
  "use strict";

  var VERSION = "1.0.0";

  /** Canonical lesson section keys (fixed template order). */
  var SECTION_KEYS = [
    "what",
    "why",
    "identify",
    "howItWorks",
    "fieldObservations",
    "mistakes",
    "ethics",
    "safety",
    "related",
    "challenge",
    "quiz"
  ];

  /** Default labels for each section. Products may override per lesson. */
  var SECTION_LABELS = {
    what: "What is it?",
    why: "Why it matters",
    identify: "How to identify it",
    howItWorks: "How it works",
    fieldObservations: "Field observations",
    mistakes: "Common mistakes",
    ethics: "Ethics",
    safety: "Safety",
    related: "Related lessons",
    challenge: "Challenge",
    quiz: "Quiz"
  };

  /** Section CSS modifiers for visual language. */
  var SECTION_MODIFIERS = {
    what: "what",
    why: "why",
    identify: "identify",
    howItWorks: "how",
    fieldObservations: "field",
    mistakes: "mistakes",
    ethics: "ethics",
    safety: "safety",
    related: "related",
    challenge: "challenge",
    quiz: "quiz"
  };

  /**
   * Domains every product may tag lessons with.
   * Used for filtering, search, and cross-product discovery.
   */
  var DOMAINS = {
    species: { label: "Species", products: ["foragecast", "steepleaf", "shed-hunting"] },
    habitats: { label: "Habitats", products: ["foragecast", "steepleaf", "fieldry"] },
    ecology: { label: "Ecology", products: ["foragecast", "steepleaf", "terrainbound"] },
    weather: { label: "Weather", products: ["foragecast", "signalterrain", "scenes"] },
    geology: { label: "Geology", products: ["signalterrain", "terrainbound", "shed-hunting"] },
    astronomy: { label: "Astronomy", products: ["signalterrain", "scenes"] },
    tea: { label: "Tea", products: ["fieldry", "steepleaf"] },
    wine: { label: "Wine", products: ["savant-sommelier"] },
    wildlife: { label: "Wildlife", products: ["shed-hunting", "foragecast", "terrainbound"] },
    navigation: { label: "Navigation", products: ["signalterrain", "terrainbound", "fieldry"] },
    photography: { label: "Photography", products: ["scenes", "fieldry"] },
    conservation: { label: "Conservation", products: ["steepleaf", "foragecast", "terrainbound"] },
    "field-skills": { label: "Field skills", products: ["fieldry", "foragecast", "shed-hunting", "scenes"] }
  };

  var LEVELS = ["intro", "beginner", "intermediate", "advanced"];

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

  function asArray(v) {
    if (v == null) return [];
    return Array.isArray(v) ? v : [v];
  }

  /**
   * Normalize free-form section input into SectionContent shape.
   */
  function normalizeSection(value) {
    if (value == null) return null;
    if (typeof value === "string") return { body: value };
    if (Array.isArray(value)) return { bullets: value };
    if (!isObject(value)) return null;

    if (value.skipped) return { skipped: true, skipReason: value.skipReason || "" };

    return {
      title: value.title,
      body: value.body,
      steps: value.steps ? asArray(value.steps) : undefined,
      bullets: value.bullets ? asArray(value.bullets) : undefined,
      prompts: value.prompts ? asArray(value.prompts) : undefined,
      skipped: value.skipped,
      skipReason: value.skipReason
    };
  }

  /**
   * Convert legacy Waypoint Scenes lesson shape to canonical WEF lesson.
   */
  function fromLegacyLesson(legacy, meta) {
    meta = meta || {};
    var fieldParts = [];
    if (legacy.fieldExercise) fieldParts.push(legacy.fieldExercise);
    if (legacy.reflection) fieldParts.push(legacy.reflection);

    var sections = {
      howItWorks: normalizeSection({ steps: legacy.steps || [] }),
      fieldObservations: normalizeSection(
        fieldParts.length === 1
          ? fieldParts[0]
          : fieldParts.length > 1
            ? { prompts: fieldParts }
            : null
      ),
      challenge: normalizeSection(legacy.challenge)
    };

    if (legacy.what) sections.what = normalizeSection(legacy.what);
    if (legacy.why) sections.why = normalizeSection(legacy.why);
    if (legacy.summary) {
      sections.what = sections.what || normalizeSection(legacy.summary);
    }

    return normalizeLesson({
      id: legacy.id,
      title: legacy.title,
      domains: legacy.domains || meta.domains || ["photography", "field-skills"],
      level: legacy.level || meta.level || "beginner",
      durationMinutes: legacy.durationMinutes,
      sections: sections,
      related: legacy.related
    });
  }

  function fromLegacyCurriculum(legacy) {
    if (!legacy || !legacy.tracks) return { version: VERSION, tracks: [] };

    return normalizeCurriculum({
      version: VERSION,
      product: legacy.product || "scenes",
      mission: legacy.mission,
      intro: legacy.intro,
      tracks: legacy.tracks.map(function (track) {
        return {
          id: track.id,
          title: track.title,
          subtitle: track.subtitle,
          domains: track.domains,
          lessons: (track.lessons || []).map(function (lesson) {
            return fromLegacyLesson(lesson, {
              domains: track.domains,
              level: track.level
            });
          })
        };
      })
    });
  }

  /**
   * Ensure lesson matches canonical shape; fill defaults.
   */
  function normalizeLesson(lesson) {
    if (!lesson || !lesson.id || !lesson.title) {
      return null;
    }

    var sections = {};
    var raw = lesson.sections || {};

    SECTION_KEYS.forEach(function (key) {
      if (key === "related") return;
      if (key === "quiz") {
        sections.quiz = raw.quiz || { status: "future", items: [] };
        return;
      }
      sections[key] = normalizeSection(raw[key]);
    });

    return {
      id: String(lesson.id),
      title: String(lesson.title),
      subtitle: lesson.subtitle || "",
      domains: asArray(lesson.domains).length ? asArray(lesson.domains) : ["field-skills"],
      level: LEVELS.indexOf(lesson.level) >= 0 ? lesson.level : "beginner",
      durationMinutes: typeof lesson.durationMinutes === "number" ? lesson.durationMinutes : null,
      summary: lesson.summary || "",
      sections: sections,
      related: asArray(lesson.related || raw.related)
    };
  }

  function resolveProduct(curriculum) {
    if (curriculum.product) return curriculum.product;
    if (global.WDS && global.WDS.core && typeof global.WDS.core.getProduct === "function") {
      return global.WDS.core.getProduct();
    }
    return "scenes";
  }

  function normalizeCurriculum(curriculum) {
    var tracks = (curriculum.tracks || []).map(function (track) {
      return {
        id: track.id,
        title: track.title,
        subtitle: track.subtitle || "",
        domains: asArray(track.domains),
        lessons: (track.lessons || [])
          .map(normalizeLesson)
          .filter(Boolean)
      };
    });

    var index = buildLessonIndex(tracks);

    return {
      version: curriculum.version || VERSION,
      product: resolveProduct(curriculum),
      mission: curriculum.mission || "",
      intro: curriculum.intro || "",
      tracks: tracks,
      index: index
    };
  }

  function buildLessonIndex(tracks) {
    var index = {};
    tracks.forEach(function (track) {
      track.lessons.forEach(function (lesson) {
        index[lesson.id] = {
          lesson: lesson,
          trackId: track.id,
          trackTitle: track.title
        };
      });
    });
    return index;
  }

  function validateLesson(lesson) {
    var errors = [];
    var normalized = normalizeLesson(lesson);
    if (!normalized) {
      errors.push("Lesson requires id and title.");
      return { ok: false, errors: errors, lesson: null };
    }

    var hasContent = SECTION_KEYS.some(function (key) {
      if (key === "related" || key === "quiz") return false;
      var s = normalized.sections[key];
      return s && !s.skipped && (s.body || (s.steps && s.steps.length) || (s.bullets && s.bullets.length) || (s.prompts && s.prompts.length));
    });

    if (!hasContent) {
      errors.push("Lesson \"" + normalized.id + "\" has no section content.");
    }

    if (!normalized.domains.length) {
      errors.push("Lesson \"" + normalized.id + "\" needs at least one domain.");
    }

    normalized.domains.forEach(function (d) {
      if (!DOMAINS[d]) errors.push("Unknown domain: " + d);
    });

    return { ok: errors.length === 0, errors: errors, lesson: normalized };
  }

  function validateCurriculum(curriculum) {
    var errors = [];
    var normalized = normalizeCurriculum(curriculum);

    if (!normalized.tracks.length) {
      errors.push("Curriculum has no tracks.");
    }

    normalized.tracks.forEach(function (track) {
      if (!track.id || !track.title) errors.push("Track requires id and title.");
      track.lessons.forEach(function (lesson) {
        var result = validateLesson(lesson);
        if (!result.ok) errors = errors.concat(result.errors);
      });
    });

    return { ok: errors.length === 0, errors: errors, curriculum: normalized };
  }

  function sectionHasContent(section) {
    if (!section || section.skipped) return false;
    return !!(
      section.body ||
      (section.steps && section.steps.length) ||
      (section.bullets && section.bullets.length) ||
      (section.prompts && section.prompts.length)
    );
  }

  function renderSectionBody(section) {
    var html = "";

    if (section.body) {
      html += "<p>" + escapeHtml(section.body) + "</p>";
    }

    if (section.steps && section.steps.length) {
      html += "<ol class=\"wef-steps\">";
      section.steps.forEach(function (step, i) {
        html +=
          "<li><span class=\"wef-step-num\" aria-hidden=\"true\">" + (i + 1) +
          "</span><span>" + escapeHtml(step) + "</span></li>";
      });
      html += "</ol>";
    }

    if (section.bullets && section.bullets.length) {
      html += "<ul class=\"wef-bullets\">";
      section.bullets.forEach(function (item) {
        html += "<li>" + escapeHtml(item) + "</li>";
      });
      html += "</ul>";
    }

    if (section.prompts && section.prompts.length) {
      html += "<div class=\"wef-prompts\">";
      section.prompts.forEach(function (prompt, i) {
        html +=
          "<div class=\"wef-prompt\">" +
            "<span class=\"wef-prompt-label\">Prompt " + (i + 1) + "</span>" +
            "<p>" + escapeHtml(prompt) + "</p>" +
          "</div>";
      });
      html += "</div>";
    }

    return html;
  }

  function renderSection(key, section, options) {
    options = options || {};
    if (key === "related") return renderRelated(section, options);
    if (key === "quiz") return renderQuiz(section, options);

    if (!section) return "";
    if (section.skipped) {
      if (options.showSkipped) {
        return (
          "<section class=\"wef-section wef-section--" + SECTION_MODIFIERS[key] + " is-skipped\" aria-label=\"" + escapeHtml(SECTION_LABELS[key]) + "\">" +
            "<h5 class=\"wef-section-label\">" + escapeHtml(section.title || SECTION_LABELS[key]) + "</h5>" +
            "<p class=\"wef-skipped\">" + escapeHtml(section.skipReason || "Not applicable for this lesson.") + "</p>" +
          "</section>"
        );
      }
      return "";
    }

    if (!sectionHasContent(section)) return "";

    var label = section.title || SECTION_LABELS[key];
    var body = renderSectionBody(section);
    if (!body) return "";

    return (
      "<section class=\"wef-section wef-section--" + SECTION_MODIFIERS[key] + "\" aria-labelledby=\"wef-" + escapeHtml(options.lessonId) + "-" + key + "\">" +
        "<h5 class=\"wef-section-label\" id=\"wef-" + escapeHtml(options.lessonId) + "-" + key + "\">" + escapeHtml(label) + "</h5>" +
        "<div class=\"wef-section-body\">" + body + "</div>" +
      "</section>"
    );
  }

  function renderRelated(related, options) {
    related = asArray(related);
    if (!related.length) return "";

    var links = related.map(function (ref) {
      var id = typeof ref === "string" ? ref : ref.id || ref.lessonId;
      var title = typeof ref === "object" ? ref.title : "";
      if (!id) return "";

      if (!title && options.index && options.index[id]) {
        title = options.index[id].lesson.title;
      }

      return (
        "<a href=\"#" + escapeHtml(id) + "\" class=\"wef-related-link\" data-lesson-id=\"" + escapeHtml(id) + "\">" +
          escapeHtml(title || id) +
        "</a>"
      );
    }).join("");

    if (!links) return "";

    return (
      "<section class=\"wef-section wef-section--related\" aria-labelledby=\"wef-" + escapeHtml(options.lessonId) + "-related\">" +
        "<h5 class=\"wef-section-label\" id=\"wef-" + escapeHtml(options.lessonId) + "-related\">" + escapeHtml(SECTION_LABELS.related) + "</h5>" +
        "<div class=\"wef-related-links\">" + links + "</div>" +
      "</section>"
    );
  }

  function renderQuiz(quiz) {
    quiz = quiz || { status: "future", items: [] };
    if (quiz.status === "future" || !quiz.items || !quiz.items.length) {
      return (
        "<section class=\"wef-section wef-section--quiz is-future\" aria-labelledby=\"wef-quiz-future\">" +
          "<h5 class=\"wef-section-label\" id=\"wef-quiz-future\">" + escapeHtml(SECTION_LABELS.quiz) + "</h5>" +
          "<p class=\"wef-quiz-future\">" + escapeHtml(quiz.futureMessage || "Quiz questions are coming soon — revisit after your next outing.") + "</p>" +
        "</section>"
      );
    }

    var items = quiz.items.map(function (item, i) {
      return (
        "<div class=\"wef-quiz-item\" data-quiz-index=\"" + i + "\">" +
          "<p class=\"wef-quiz-question\">" + escapeHtml(item.question) + "</p>" +
          "<ul class=\"wef-quiz-choices\">" +
          (item.choices || []).map(function (choice, j) {
            return "<li><button type=\"button\" class=\"wef-quiz-choice\" data-choice=\"" + j + "\">" + escapeHtml(choice) + "</button></li>";
          }).join("") +
          "</ul>" +
        "</div>"
      );
    }).join("");

    return (
      "<section class=\"wef-section wef-section--quiz\" aria-labelledby=\"wef-quiz\">" +
        "<h5 class=\"wef-section-label\" id=\"wef-quiz\">" + escapeHtml(SECTION_LABELS.quiz) + "</h5>" +
        items +
      "</section>"
    );
  }

  function renderDomainTags(domains) {
    return domains.map(function (d) {
      var meta = DOMAINS[d] || { label: d };
      return "<span class=\"wef-domain-tag\" data-domain=\"" + escapeHtml(d) + "\">" + escapeHtml(meta.label) + "</span>";
    }).join("");
  }

  function renderLessonMeta(lesson) {
    var parts = [];
    if (lesson.level) {
      parts.push("<span class=\"wef-meta-level\">" + escapeHtml(lesson.level) + "</span>");
    }
    if (lesson.durationMinutes) {
      parts.push("<span class=\"wef-meta-duration\">" + lesson.durationMinutes + " min</span>");
    }
    if (!parts.length) return "";
    return "<div class=\"wef-lesson-meta\">" + parts.join("") + "</div>";
  }

  function renderLesson(lesson, options) {
    options = options || {};
    var normalized = normalizeLesson(lesson);
    if (!normalized) return "";

    var sectionsHtml = SECTION_KEYS.map(function (key) {
      if (key === "related") {
        return renderRelated(normalized.related, {
          lessonId: normalized.id,
          index: options.index
        });
      }
      if (key === "quiz") {
        return renderQuiz(normalized.sections.quiz);
      }
      return renderSection(key, normalized.sections[key], {
        lessonId: normalized.id,
        showSkipped: options.showSkipped
      });
    }).join("");

    return (
      "<article class=\"wef-lesson\" id=\"" + escapeHtml(normalized.id) + "\" data-lesson-id=\"" + escapeHtml(normalized.id) + "\" data-search-text=\"" + escapeHtml(normalized.title + " " + normalized.domains.join(" ")) + "\">" +
        "<header class=\"wef-lesson-header\">" +
          "<div class=\"wef-domain-tags\" aria-label=\"Topics\">" + renderDomainTags(normalized.domains) + "</div>" +
          "<h4 class=\"wef-lesson-title\">" + escapeHtml(normalized.title) + "</h4>" +
          (normalized.subtitle ? "<p class=\"wef-lesson-subtitle\">" + escapeHtml(normalized.subtitle) + "</p>" : "") +
          renderLessonMeta(normalized) +
        "</header>" +
        "<div class=\"wef-lesson-sections\">" + sectionsHtml + "</div>" +
      "</article>"
    );
  }

  function renderTrack(track, options) {
    options = options || {};
    return (
      "<section class=\"wef-track glass-panel\" aria-labelledby=\"wef-track-" + escapeHtml(track.id) + "\">" +
        "<header class=\"wef-track-header\">" +
          "<h3 class=\"wef-track-title\" id=\"wef-track-" + escapeHtml(track.id) + "\">" + escapeHtml(track.title) + "</h3>" +
          (track.subtitle ? "<p class=\"wef-track-sub\">" + escapeHtml(track.subtitle) + "</p>" : "") +
          (track.domains && track.domains.length
            ? "<div class=\"wef-domain-tags wef-domain-tags--track\">" + renderDomainTags(track.domains) + "</div>"
            : "") +
        "</header>" +
        "<div class=\"wef-lessons\">" +
          track.lessons.map(function (lesson) {
            return renderLesson(lesson, options);
          }).join("") +
        "</div>" +
      "</section>"
    );
  }

  function renderIntro(curriculum) {
    if (!curriculum.mission && !curriculum.intro) return "";
    return (
      "<div class=\"wef-intro glass-panel\">" +
        (curriculum.mission ? "<p class=\"wef-mission\">" + escapeHtml(curriculum.mission) + "</p>" : "") +
        (curriculum.intro ? "<p class=\"wef-intro-text\">" + escapeHtml(curriculum.intro) + "</p>" : "") +
      "</div>"
    );
  }

  function renderCurriculum(mount, curriculum, options) {
    if (!mount) return null;
    options = options || {};

    var source = options.legacy ? fromLegacyCurriculum(curriculum) : normalizeCurriculum(curriculum);
    var validation = validateCurriculum(source);

    if (!validation.ok && options.strict) {
      console.warn("[WEF] Curriculum validation:", validation.errors);
    }

    var normalized = validation.curriculum;
    var renderOpts = { index: normalized.index, showSkipped: options.showSkipped };

    mount.innerHTML =
      "<div class=\"wef-curriculum\" data-wef-version=\"" + escapeHtml(normalized.version) + "\">" +
        (options.hideIntro ? "" : renderIntro(normalized)) +
        "<div class=\"wef-tracks\">" +
          normalized.tracks.map(function (track) {
            return renderTrack(track, renderOpts);
          }).join("") +
        "</div>" +
      "</div>";

    bindRelatedLinks(mount);
    return normalized;
  }

  function bindRelatedLinks(root) {
    if (!root) return;
    root.querySelectorAll(".wef-related-link").forEach(function (link) {
      link.addEventListener("click", function (e) {
        var id = link.getAttribute("data-lesson-id");
        var target = id && document.getElementById(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: "smooth", block: "start" });
          target.classList.add("is-highlighted");
          setTimeout(function () { target.classList.remove("is-highlighted"); }, 2000);
        }
      });
    });
  }

  function findLesson(id, curriculum) {
    var normalized = normalizeCurriculum(curriculum);
    return normalized.index[id] || null;
  }

  function filterByDomain(curriculum, domain) {
    var normalized = normalizeCurriculum(curriculum);
    return normalized.tracks.map(function (track) {
      return {
        track: track,
        lessons: track.lessons.filter(function (lesson) {
          return lesson.domains.indexOf(domain) >= 0;
        })
      };
    }).filter(function (row) { return row.lessons.length; });
  }

  function getSectionLabels(overrides) {
    var labels = {};
    SECTION_KEYS.forEach(function (key) {
      labels[key] = (overrides && overrides[key]) || SECTION_LABELS[key];
    });
    return labels;
  }

  global.WDS = global.WDS || {};
  global.WDS.education = {
    VERSION: VERSION,
    SECTION_KEYS: SECTION_KEYS,
    SECTION_LABELS: SECTION_LABELS,
    DOMAINS: DOMAINS,
    LEVELS: LEVELS,
    normalizeLesson: normalizeLesson,
    normalizeCurriculum: normalizeCurriculum,
    fromLegacyLesson: fromLegacyLesson,
    fromLegacyCurriculum: fromLegacyCurriculum,
    validateLesson: validateLesson,
    validateCurriculum: validateCurriculum,
    renderLesson: renderLesson,
    renderTrack: renderTrack,
    renderCurriculum: renderCurriculum,
    findLesson: findLesson,
    filterByDomain: filterByDomain,
    getSectionLabels: getSectionLabels,
    escapeHtml: escapeHtml
  };

  /** Alias for direct imports */
  global.WaypointEducation = global.WDS.education;
})(window);
