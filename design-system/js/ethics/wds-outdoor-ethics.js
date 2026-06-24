/**
 * Waypoint Outdoor Ethics Standard (WOES)
 *
 * Company-wide outdoor ethics: LNT, wildlife, foraging, conservation,
 * habitat, private property, research, and citizen science.
 *
 *   WDS.outdoorEthics.evaluateFeature(spec)
 *   WDS.outdoorEthics.fromOipPackage(platform)
 *   WDS.outdoorEthics.annotatePackage(platform)
 *   WDS.outdoorEthics.renderReminder(domain, options)
 *   WDS.outdoorEthics.renderFootnote(platform, options)
 *   WDS.outdoorEthics.citizenScienceDisclosure(options)
 *
 * @see docs/WAYPOINT-OUTDOOR-ETHICS-STANDARD.md
 */
(function (global) {
  "use strict";

  var VERSION = "1.0.0";
  var SCHEMA_ID = "https://waypoint.studio/schemas/outdoor-ethics/v1";
  var DOC_PATH = "docs/WAYPOINT-OUTDOOR-ETHICS-STANDARD.md";

  var DOMAINS = Object.freeze({
    leaveNoTrace: {
      key: "leaveNoTrace",
      label: "Leave No Trace",
      summary: "Minimize impact on trails, soils, water, and communities."
    },
    wildlife: {
      key: "wildlife",
      label: "Wildlife observation",
      summary: "Observe from distance; never bait, harass, or expose dens and nests."
    },
    foraging: {
      key: "foraging",
      label: "Responsible foraging",
      summary: "Positive ID, legal take, sustainable harvest, never share exact harvest spots."
    },
    conservation: {
      key: "conservation",
      label: "Conservation",
      summary: "Stewardship and recovery — support place without extraction mindset."
    },
    habitat: {
      key: "habitat",
      label: "Habitat protection",
      summary: "Protect wetlands, riparian zones, nesting areas, and fragile substrates."
    },
    privateProperty: {
      key: "privateProperty",
      label: "Private property",
      summary: "Permission first; no trespass facilitation in maps or pins."
    },
    research: {
      key: "research",
      label: "Research ethics",
      summary: "Honest sources, tentative language, distinguish editorial from verified data."
    },
    citizenScience: {
      key: "citizenScience",
      label: "Citizen science",
      summary: "Opt-in, private by default, informed consent, revocable sharing."
    }
  });

  var DOMAIN_KEYS = Object.keys(DOMAINS);

  var DEFAULT_REMINDERS = Object.freeze({
    leaveNoTrace: [
      "Stay on durable surfaces when trails are muddy — ravines recover slowly.",
      "Leave rocks, plants, and artifacts as you found them.",
      "Pack out what you pack in."
    ],
    wildlife: [
      "Give wildlife space — especially during nesting and den seasons.",
      "Never bait animals for photos, sheds, or sightings.",
      "Sign and scat are evidence; observe without destroying."
    ],
    foraging: [
      "Identify with confidence — never eat uncertain fungi or plants.",
      "Know regulations and land permission before collecting.",
      "Cut at soil line; leave small specimens; never share exact harvest coordinates publicly."
    ],
    conservation: [
      "Support local stewardship projects and official park guidance.",
      "Recovery and patience matter as much as discovery."
    ],
    habitat: [
      "Wetlands, riparian edges, and cliff nests need extra distance and care.",
      "Stay on trail in fragile plant communities."
    ],
    privateProperty: [
      "Assume permission is required on private land, orchards, and posted parcels.",
      "Waypoint maps show regional context — not an invitation to trespass."
    ],
    research: [
      "Editorial previews are not live surveys — confirm outdoors.",
      "Cite official and institutional sources when sharing research summaries."
    ],
    citizenScience: [
      "Sharing is always optional; your notes stay private by default.",
      "Location may be rounded or hidden to protect you and sensitive species.",
      "You choose what fields to share and may withdraw later."
    ]
  });

  var CONSTITUTIONAL_QUESTIONS = Object.freeze([
    "Does this help someone observe, understand, create, or share meaningfully?",
    "Does this encourage more time outdoors with better questions?",
    "Does this respect privacy and optional participation?",
    "Does this avoid social-media patterns (feeds, likes, rankings)?"
  ]);

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function domainBlock(key, extraReminders) {
    var d = DOMAINS[key];
    var reminders = (DEFAULT_REMINDERS[key] || []).slice();
    if (extraReminders && extraReminders.length) {
      reminders = reminders.concat(extraReminders);
    }
    return {
      summary: d.summary,
      reminders: reminders,
      links: key === "leaveNoTrace"
        ? [{ label: "Leave No Trace Center", href: "https://lnt.org" }]
        : []
    };
  }

  function buildDomains(extra) {
    extra = extra || {};
    var out = {};
    DOMAIN_KEYS.forEach(function (key) {
      out[key] = domainBlock(key, extra[key]);
    });
    return out;
  }

  function citizenScienceEthics(options) {
    options = options || {};
    return {
      optInRequired: true,
      defaultPrivate: true,
      submissionAvailable: !!options.submissionAvailable,
      disclosures: [
        "What: species, date, general location, notes, and media you choose to attach.",
        "Why: education, regional phenology, and optional research partners — named when enrolled.",
        "How used: private by default; shared only with your explicit consent.",
        "Identity: never required; pseudonyms welcome.",
        "Location: county-level or obfuscated unless you choose otherwise.",
        "Revoke: you may delete or withdraw contributions when sync is available."
      ]
    };
  }

  function fromOipPackage(platform) {
    platform = platform || {};
    var regional = null;
    var cons = platform.conservation && platform.conservation.current;
    if (cons) {
      regional = {
        title: cons.title || null,
        summary: cons.summary || null,
        whatYouCanDo: cons.whatYouCanDo || null,
        source: "Regional editorial conservation note"
      };
    }

    var foragingExtra = [];
    if (platform.species && platform.species.active && platform.species.active.length) {
      var names = platform.species.active.map(function (s) {
        return s.name || "";
      }).join(" ").toLowerCase();
      if (/morel|chanterelle|mushroom|fungi|forag/i.test(names)) {
        foragingExtra.push("Regional editorial watch lists are not harvest permits — verify ID and regulations.");
      }
    }

    var wildlifeExtra = [];
    if (platform.calendar && /spring|summer/i.test(String(platform.calendar.season || ""))) {
      wildlifeExtra.push("Nesting and den seasons may apply — extra distance near riparian corridors.");
    }

    return {
      version: VERSION,
      schema: SCHEMA_ID,
      domains: buildDomains({
        foraging: foragingExtra,
        wildlife: wildlifeExtra
      }),
      regional: regional,
      citizenScience: citizenScienceEthics({ submissionAvailable: false }),
      featureEvaluation: {
        documentation: DOC_PATH,
        constitutionalQuestions: CONSTITUTIONAL_QUESTIONS.slice()
      }
    };
  }

  function annotatePackage(platform) {
    if (!platform) return platform;
    platform.ethics = fromOipPackage(platform);
    return platform;
  }

  function evaluateFeature(spec) {
    spec = spec || {};
    var violations = [];
    var warnings = [];
    var domains = spec.domains && spec.domains.length ? spec.domains.slice() : DOMAIN_KEYS.slice();

    if (spec.facilitatesTrespass) {
      violations.push({ domain: "privateProperty", message: "Must not facilitate trespass or private-land targeting." });
    }
    if (spec.gamification) {
      violations.push({ domain: "wildlife", message: "Gamification conflicts with Constitution and wildlife ethics." });
    }
    if (spec.socialFeed) {
      violations.push({ domain: "citizenScience", message: "Social feeds conflict with Constitution privacy philosophy." });
    }
    if (spec.sellsUserData) {
      violations.push({ domain: "citizenScience", message: "Must not sell personal observation streams." });
    }
    if (spec.darkPatterns) {
      violations.push({ domain: "citizenScience", message: "Dark patterns violate informed consent requirements." });
    }
    if (spec.sharesLocationPublicly && !spec.explicitOptIn) {
      violations.push({ domain: "citizenScience", message: "Public location sharing requires explicit opt-in." });
    }
    if (spec.sharesLocationPrecisely && spec.targetsSensitiveSpecies) {
      violations.push({ domain: "habitat", message: "Precise public coordinates for sensitive species are not allowed." });
    }
    if (spec.presentsPredictionsAsFacts) {
      violations.push({ domain: "research", message: "Predictions and editorial content must not be presented as verified facts." });
    }
    if (spec.collectsPersonalData && spec.requiresAccount && !spec.educationalPurpose) {
      warnings.push({ domain: "citizenScience", message: "Requiring accounts for learning-only features needs strong justification." });
    }
    if (spec.autoplayMedia) {
      warnings.push({ domain: "leaveNoTrace", message: "Autoplay conflicts with calm, intentional media standards." });
    }
    if (domains.indexOf("foraging") >= 0 && spec.sharesLocationPrecisely && spec.sharesLocationPublicly) {
      violations.push({ domain: "foraging", message: "Public precise harvest pins violate responsible foraging ethics." });
    }

    return {
      pass: violations.length === 0,
      violations: violations,
      warnings: warnings,
      applicableDomains: domains,
      constitutionalQuestions: CONSTITUTIONAL_QUESTIONS.slice(),
      spec: { name: spec.name || "Unnamed feature" }
    };
  }

  function renderReminder(domain, options) {
    options = options || {};
    var d = DOMAINS[domain];
    if (!d) return "";
    var reminders = DEFAULT_REMINDERS[domain] || [];
    var text = options.text || (reminders.length ? reminders[0] : d.summary);
    return (
      '<p class="wds-ethics-reminder" role="note">' +
        '<span class="wds-ethics-reminder__label">' + escapeHtml(d.label) + "</span>" +
        '<span class="wds-ethics-reminder__text">' + escapeHtml(text) + "</span>" +
      "</p>"
    );
  }

  function renderFootnote(platform, options) {
    options = options || {};
    var ethics = platform && platform.ethics ? platform.ethics : fromOipPackage(platform);
    var domain = options.domain || "leaveNoTrace";
    var d = ethics.domains && ethics.domains[domain] ? ethics.domains[domain] : domainBlock(domain);
    var text = options.text || (d.reminders && d.reminders[0]) || d.summary;
    var regional = ethics.regional && ethics.regional.summary && options.showRegional !== false
      ? ' <span class="wds-ethics-footnote__regional">' + escapeHtml(ethics.regional.summary) + "</span>"
      : "";

    return (
      '<p class="wds-ethics-footnote" role="note">' +
        '<span class="wds-ethics-footnote__tag">Outdoor ethics</span>' +
        '<span class="wds-ethics-footnote__text">' + escapeHtml(text) + "</span>" +
        regional +
      "</p>"
    );
  }

  function citizenScienceDisclosure(options) {
    options = options || {};
    var cs = citizenScienceEthics(options);
    var items = cs.disclosures.map(function (line) {
      return "<li>" + escapeHtml(line) + "</li>";
    }).join("");

    var prefix = cs.submissionAvailable
      ? ""
      : "<p class=\"wds-ethics-cs__soon\"><strong>Submission not yet available.</strong> These principles apply when sharing is offered.</p>";

    return (
      '<div class="wds-ethics-cs" role="note" aria-label="Citizen science ethics">' +
        prefix +
        '<p class="wds-ethics-cs__lead">Optional contribution — private by default. You choose what to share.</p>' +
        "<ul class=\"wds-ethics-cs__list\">" + items + "</ul>" +
      "</div>"
    );
  }

  function renderFeatureReport(result) {
    result = result || { pass: true, violations: [], warnings: [] };
    var lines = [];
    (result.violations || []).forEach(function (v) {
      lines.push('<li class="wds-ethics-report__fail">' + escapeHtml(v.message) + "</li>");
    });
    (result.warnings || []).forEach(function (w) {
      lines.push('<li class="wds-ethics-report__warn">' + escapeHtml(w.message) + "</li>");
    });
    if (!lines.length) {
      lines.push('<li class="wds-ethics-report__pass">No ethics violations detected for this spec.</li>');
    }
    return (
      '<div class="wds-ethics-report" role="status">' +
        '<p class="wds-ethics-report__title">Feature ethics: ' + escapeHtml(result.spec && result.spec.name || "Review") +
        (result.pass ? " — pass" : " — review required") + "</p>" +
        "<ul>" + lines.join("") + "</ul>" +
      "</div>"
    );
  }

  global.WDS = global.WDS || {};
  global.WDS.outdoorEthics = {
    VERSION: VERSION,
    SCHEMA_ID: SCHEMA_ID,
    DOC_PATH: DOC_PATH,
    DOMAINS: DOMAINS,
    DOMAIN_KEYS: DOMAIN_KEYS,
    DEFAULT_REMINDERS: DEFAULT_REMINDERS,
    CONSTITUTIONAL_QUESTIONS: CONSTITUTIONAL_QUESTIONS,
    buildDomains: buildDomains,
    fromOipPackage: fromOipPackage,
    annotatePackage: annotatePackage,
    evaluateFeature: evaluateFeature,
    citizenScienceEthics: citizenScienceEthics,
    citizenScienceDisclosure: citizenScienceDisclosure,
    renderReminder: renderReminder,
    renderFootnote: renderFootnote,
    renderFeatureReport: renderFeatureReport
  };
})(window);
