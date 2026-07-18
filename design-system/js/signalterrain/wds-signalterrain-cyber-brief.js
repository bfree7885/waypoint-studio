/**
 * SignalTerrain Daily Cyber Intelligence Briefing Engine V0.1
 * Generates calm, explainable briefs — no hardcoded summaries, no black-box scores.
 */
(function (global) {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function loadJson(url) {
    return fetch(url, { credentials: "same-origin" }).then(function (r) {
      if (!r.ok) throw new Error("Failed to load " + url + " (" + r.status + ")");
      return r.json();
    });
  }

  function Priority() {
    return global.WDS && global.WDS.signalTerrainCyberPriority;
  }

  function Ingest() {
    return global.WDS && global.WDS.signalTerrainCyberIngest;
  }

  function hashId(prefix, s) {
    var h = 0;
    var str = String(s || "");
    for (var i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0;
    }
    return prefix + (h >>> 0).toString(16).slice(0, 10);
  }

  function estimateReadingMinutes(text) {
    var words = String(text || "").split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200) || 1);
  }

  function citationKindToReading(kind) {
    if (kind === "vendor") return "vendor";
    if (kind === "government") return "government";
    if (kind === "academic") return "academic";
    if (kind === "technical") return "technical";
    if (kind === "standard") return "standards";
    return "historical";
  }

  function defaultPriorityInputs(entity, scenario) {
    var inputs = Object.assign({}, entity.priorityInputs || {});
    if (!inputs.severity) inputs.severity = entity.severity || "info";
    if (!inputs.confidence) inputs.confidence = entity.confidence || "moderate";
    if (!inputs.knownExploitation) inputs.knownExploitation = "none";
    if (!inputs.publicExploitAvailability) inputs.publicExploitAvailability = "none";
    if (!inputs.patchAvailability) inputs.patchAvailability = "available";
    if (!inputs.recency) inputs.recency = "legacy";
    if (inputs.trustedSourceCount == null) {
      inputs.trustedSourceCount = Math.min(5, (entity.citations || []).length);
    }
    if (inputs.industryRelevance == null) inputs.industryRelevance = 0;
    if (inputs.ownerInterest == null) inputs.ownerInterest = 0;
    if (scenario === "critical-disclosure" && entity.kind === "cve") {
      inputs.recency = inputs.recency === "legacy" ? "current" : inputs.recency;
    }
    if (scenario === "ransomware-campaign" && (entity.kind === "ransomware-family" || entity.kind === "threat-campaign")) {
      inputs.knownExploitation = inputs.knownExploitation === "none" ? "historical" : inputs.knownExploitation;
      inputs.industryRelevance = Math.max(inputs.industryRelevance || 0, 8);
    }
    return inputs;
  }

  function profileWeight(entity, profile) {
    var w = 1;
    var emp = (profile && profile.emphasis) || {};
    if (emp.kinds && emp.kinds[entity.kind] != null) w *= emp.kinds[entity.kind];
    if (emp.industries && entity.industries) {
      entity.industries.forEach(function (ind) {
        if (emp.industries[ind] != null) w *= emp.industries[ind];
      });
    }
    if (emp.productsContains && emp.productsContains.length) {
      var blob = (entity.title + " " + entity.summary + " " + JSON.stringify(entity.aliases || [])).toLowerCase();
      emp.productsContains.forEach(function (needle) {
        if (blob.indexOf(String(needle).toLowerCase()) >= 0) w *= 1.15;
      });
    }
    return w;
  }

  function scoreEntity(entity, profile, factors, rules, scenario) {
    var P = Priority();
    var inputs = defaultPriorityInputs(entity, scenario);
    inputs.subjectId = entity.id;
    inputs.id = "cyp_brief_" + entity.id;
    var score = P.score(inputs, factors, rules);
    var weight = profileWeight(entity, profile);
    var weighted = Math.round(Math.min(100, score.total * weight));
    var contributions = (score.contributions || []).slice();
    if (Math.abs(weight - 1) > 0.001) {
      contributions.push({
        factorId: "profile_emphasis",
        points: weighted - score.total,
        maxPoints: null,
        inputValue: weight,
        reason:
          "Audience profile “" +
          ((profile && profile.label) || (profile && profile.id) || "default") +
          "” applies emphasis multiplier " +
          weight.toFixed(2) +
          " (reorders attention; does not change facts)."
      });
    }
    var bandObj = P.bandFor(weighted, rules.bands || []);
    return {
      score: score,
      weightedTotal: weighted,
      band: bandObj.id || bandObj,
      contributions: contributions,
      summaryWhy: score.summaryWhy
    };
  }

  function buildExplainItem(entity, scored, changes) {
    var x = entity.explainability || {};
    var changeTypes = (changes || []).map(function (c) {
      return c.changeType;
    });
    var whatChanged =
      (changes && changes.length
        ? changes
            .map(function (c) {
              return c.summary;
            })
            .join(" ")
        : null) ||
      x.whatChanged ||
      "No material change asserted since the previous snapshot.";

    var why =
      "Included because transparent priority is “" +
      scored.band +
      "” (" +
      scored.weightedTotal +
      "/100) for this audience profile. " +
      (scored.summaryWhy || "");

    return {
      id: hashId("cbi_", entity.id + scored.band),
      subjectId: entity.id,
      title: entity.title,
      summary: entity.summary,
      whyIncludedToday: why,
      whatChanged: whatChanged,
      whoIsAffected: x.whoIsAffected || "See citations — audience exposure varies.",
      whatIsKnown: (x.knownFacts && x.knownFacts.length ? x.knownFacts : ["Public identifiers and cited sources as listed."]).slice(0, 6),
      whatIsUncertain: (x.unknown && x.unknown.length ? x.unknown : ["Local exposure until inventoried."]).slice(0, 6),
      readNext: (x.readNext || []).slice(0, 6),
      citations: entity.citations || [],
      provenance: (entity.citations || []).map(function (c) {
        return {
          sourceLabel: c.label,
          sourceUrl: c.url || null,
          kind: c.kind,
          verified: c.kind === "government" || c.kind === "vendor"
        };
      }),
      priority: {
        band: scored.band,
        total: scored.weightedTotal,
        summaryWhy: scored.summaryWhy,
        contributions: scored.contributions
      },
      changeTypes: changeTypes,
      readingMinutes: estimateReadingMinutes(entity.summary + " " + (x.whatIsIt || "")),
      readingCategory: citationKindToReading((entity.citations && entity.citations[0] && entity.citations[0].kind) || "technical")
    };
  }

  function sectionShell(def, emptyStates) {
    return {
      id: def.id,
      label: def.label,
      empty: true,
      emptyMessage: (emptyStates.messages && emptyStates.messages[def.id]) || "Nothing to report.",
      items: [],
      narrative: null
    };
  }

  function checkTone(text, toneRules) {
    var flags = [];
    var lower = String(text || "").toLowerCase();
    (toneRules.forbidPhrases || []).forEach(function (p) {
      var needle = String(p).toLowerCase();
      if (!needle) return;
      var hit =
        needle.indexOf(" ") >= 0
          ? lower.indexOf(needle) >= 0
          : new RegExp("\\b" + needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(lower);
      if (hit) flags.push(p);
    });
    return { ok: flags.length === 0, flags: flags };
  }

  function scenarioFilter(entities, scenario) {
    if (scenario === "quiet-day") {
      // Prefer low-noise: patches/info only, exclude critical campaigns from "active" framing
      return {
        entities: entities,
        mode: "quiet",
        forceEmptyActive: true,
        preferKinds: ["patch", "timeline-event", "reference", "source"]
      };
    }
    if (scenario === "patch-tuesday") {
      return {
        entities: entities,
        mode: "patches",
        preferKinds: ["patch", "vendor-advisory", "cve", "affected-software"]
      };
    }
    if (scenario === "critical-disclosure") {
      return {
        entities: entities.filter(function (e) {
          return e.kind === "cve" || e.kind === "vulnerability" || e.kind === "vendor-advisory" || e.kind === "mitigation" || e.kind === "patch" || (e.cveId && e.cveId.indexOf("2021-44228") >= 0);
        }),
        mode: "disclosure",
        focusIds: ["cy_cve-2021-44228", "cy_software-log4j", "cy_patch-log4j", "cy_advisory-log4j-cisa"]
      };
    }
    if (scenario === "ransomware-campaign") {
      return {
        entities: entities.filter(function (e) {
          return (
            e.kind === "ransomware-family" ||
            e.kind === "threat-campaign" ||
            e.kind === "threat" ||
            e.kind === "cve" ||
            e.kind === "patch" ||
            e.kind === "exploit-technique" ||
            e.kind === "industry"
          );
        }),
        mode: "ransomware",
        focusIds: ["cy_ransomware-wannacry", "cy_campaign-notpetya", "cy_cve-2017-0144", "cy_patch-ms17-010"]
      };
    }
    if (scenario === "cloud-outage") {
      // Demonstrate adaptation: infrastructure-flavored empty cyber + research watch
      return {
        entities: entities.filter(function (e) {
          return e.kind === "reference" || e.kind === "source" || e.kind === "timeline-event" || e.kind === "indicator";
        }),
        mode: "outage",
        outageNarrative:
          "This sample models a cloud-provider outage day: cyber vulnerability volume may be quiet while infrastructure awareness matters. Facts below stay educational; outage details would come from status pages (not invented here)."
      };
    }
    return { entities: entities, mode: "custom" };
  }

  function pickTop(scoredList, n) {
    return scoredList
      .slice()
      .sort(function (a, b) {
        return b.scored.weightedTotal - a.scored.weightedTotal;
      })
      .slice(0, n);
  }

  /**
   * Generate a daily brief from entities + transparent priority.
   * previousSnapshot: optional map of subjectId -> prior priorityInputs/severity for change detection.
   */
  function generateBrief(options) {
    options = options || {};
    var entities = options.entities || [];
    var profile = options.profile;
    var factors = options.factors;
    var rules = options.rules;
    var sectionsDoc = options.sections;
    var emptyStates = options.emptyStates;
    var toneRules = options.toneRules || { forbidPhrases: [] };
    var scenario = options.scenario || "custom";
    var previousSnapshot = options.previousSnapshot || {};
    var researchItems = options.researchItems || [];

    var filtered = scenarioFilter(entities, scenario);
    var working = filtered.entities;

    var scored = working
      .filter(function (e) {
        return e && e.id && e.kind !== "confidence" && e.kind !== "severity";
      })
      .map(function (e) {
        var s = scoreEntity(e, profile, factors, rules, scenario);
        var prev = previousSnapshot[e.id];
        var changes = [];
        if (Ingest() && prev) {
          changes = Ingest().detectChanges(
            {
              id: e.id,
              severity: prev.severity || "info",
              products: prev.products || [],
              references: prev.references || [],
              advisoryIds: prev.advisoryIds || [],
              verified: !!prev.verified,
              recordType: prev.recordType || "shared-vulnerability",
              provenance: prev.provenance || [{ connectorId: "conn_brief-history", retrievedAt: prev.at || "2026-07-17T00:00:00Z", sourceLabel: "Prior brief", verified: false }]
            },
            {
              id: e.id,
              severity: e.severity || "info",
              products: e.aliases || [],
              references: (e.citations || []).map(function (c) {
                return c.url || c.label;
              }),
              advisoryIds: e.kind === "kev-entry" ? [e.id] : [],
              verified: e.confidence === "high",
              recordType: "shared-vulnerability",
              provenance: [{ connectorId: "conn_brief-history", retrievedAt: new Date().toISOString(), sourceLabel: "Current brief", verified: false }]
            }
          );
        }
        // Scenario-driven synthetic change labels (documented, not hidden scores)
        if (scenario === "critical-disclosure" && e.id === "cy_cve-2021-44228" && !changes.length) {
          changes = [
            {
              changeType: "severity-revised",
              summary: "Disclosure window: attention elevated for Log4Shell teaching case."
            },
            {
              changeType: "exploitation-confirmed",
              summary: "Known-exploitation literacy signaled via KEV-oriented sources in the sample graph."
            }
          ];
        }
        if (scenario === "patch-tuesday" && e.kind === "patch") {
          changes = changes.concat([
            { changeType: "patch-released", summary: "Patch highlight window — vendor update path is available." }
          ]);
        }
        return { entity: e, scored: s, changes: changes, item: buildExplainItem(e, s, changes) };
      });

    // Focus boost for scenario focusIds (emphasis only — explicit contribution, never hidden)
    if (filtered.focusIds) {
      scored.forEach(function (row) {
        if (filtered.focusIds.indexOf(row.entity.id) >= 0) {
          var focusPts = 8;
          row.scored.weightedTotal = Math.min(100, row.scored.weightedTotal + focusPts);
          row.scored.contributions = (row.scored.contributions || []).concat([
            {
              factorId: "scenario_focus",
              points: focusPts,
              reason: "Central teaching subject for this briefing scenario (emphasis only; facts unchanged)."
            }
          ]);
          if (Priority() && Priority().bandFor && rules && rules.bands) {
            var reb = Priority().bandFor(row.scored.weightedTotal, rules.bands);
            row.scored.band = reb.id || reb;
          }
          row.item.priority.total = row.scored.weightedTotal;
          row.item.priority.band = row.scored.band;
          row.item.priority.contributions = row.scored.contributions;
          row.item.whyIncludedToday +=
            " Focused in this scenario because it is central to the demonstration case (+" +
            focusPts +
            " scenario_focus).";
        }
      });
    }

    var sectionDefs = (sectionsDoc.sections || []).slice().sort(function (a, b) {
      return a.order - b.order;
    });
    var sections = {};
    sectionDefs.forEach(function (def) {
      sections[def.id] = sectionShell(def, emptyStates);
    });

    function fill(id, rows, narrative) {
      var sec = sections[id];
      if (!sec) return;
      sec.items = rows.map(function (r) {
        return r.item;
      });
      sec.empty = sec.items.length === 0;
      if (!sec.empty) sec.emptyMessage = "";
      if (narrative) sec.narrative = narrative;
    }

    var high = pickTop(
      scored.filter(function (r) {
        return r.scored.band === "high" || r.scored.band === "urgent" || r.scored.weightedTotal >= 50;
      }),
      5
    );
    if (filtered.mode === "quiet") {
      high = pickTop(
        scored.filter(function (r) {
          return r.scored.weightedTotal >= 30 && r.scored.weightedTotal < 55;
        }),
        3
      );
    }
    fill("highest-priority", high);

    var changed = scored.filter(function (r) {
      return r.changes && r.changes.length;
    });
    fill("new-since-yesterday", pickTop(changed, 6));

    fill(
      "new-vulnerabilities",
      pickTop(
        scored.filter(function (r) {
          return r.entity.kind === "cve" || r.entity.kind === "vulnerability";
        }),
        filtered.mode === "quiet" ? 0 : 4
      )
    );

    var active = filtered.forceEmptyActive
      ? []
      : pickTop(
          scored.filter(function (r) {
            var ke = (r.entity.priorityInputs && r.entity.priorityInputs.knownExploitation) || "none";
            return ke === "active" || ke === "historical" || r.entity.kind === "kev-entry";
          }),
          4
        );
    fill("active-exploitation", active);

    fill(
      "major-vendor-advisories",
      pickTop(
        scored.filter(function (r) {
          return r.entity.kind === "vendor-advisory";
        }),
        4
      )
    );

    fill(
      "patch-highlights",
      pickTop(
        scored.filter(function (r) {
          return r.entity.kind === "patch" || r.entity.kind === "mitigation";
        }),
        scenario === "patch-tuesday" ? 6 : 3
      )
    );

    var trends = [];
    if (scenario === "ransomware-campaign") {
      trends = pickTop(
        scored.filter(function (r) {
          return r.entity.kind === "ransomware-family" || r.entity.kind === "threat-campaign";
        }),
        3
      );
    } else if (scenario === "cloud-outage") {
      trends = [];
    } else {
      trends = pickTop(
        scored.filter(function (r) {
          return r.entity.kind === "threat-campaign" || r.entity.kind === "malware-family";
        }),
        2
      );
    }
    fill(
      "emerging-trends",
      trends,
      filtered.outageNarrative || null
    );

    // Reading queue from citations + research workspace
    var reading = [];
    scored.forEach(function (r) {
      (r.entity.citations || []).forEach(function (c) {
        var cat = citationKindToReading(c.kind);
        var preferred = (profile.emphasis && profile.emphasis.reading) || [];
        var boost = preferred.indexOf(cat) >= 0 ? 1 : 0;
        reading.push({
          id: hashId("crq_", c.label + r.entity.id),
          title: c.label,
          url: c.url || null,
          category: cat,
          subjectId: r.entity.id,
          estimatedMinutes: estimateReadingMinutes(c.label + " " + r.entity.summary),
          attribution: c.label,
          boost: boost,
          priorityBand: r.scored.band
        });
      });
    });
    researchItems.forEach(function (ri) {
      if (ri.kind === "source-entry" || ri.kind === "queue-item") {
        reading.push({
          id: hashId("crq_", ri.id),
          title: ri.title,
          url: ri.url || null,
          category: ri.sourceClass === "government" ? "government" : ri.sourceClass === "academic" ? "academic" : "technical",
          subjectId: (ri.subjectIds && ri.subjectIds[0]) || null,
          estimatedMinutes: 5,
          attribution: ri.title,
          boost: 1,
          priorityBand: "moderate"
        });
      }
    });
    reading.sort(function (a, b) {
      return b.boost - a.boost || (b.estimatedMinutes || 0) - (a.estimatedMinutes || 0);
    });
    // dedupe by title
    var seenRead = {};
    reading = reading.filter(function (r) {
      var k = r.title.toLowerCase();
      if (seenRead[k]) return false;
      seenRead[k] = true;
      return true;
    }).slice(0, 8);

    fill(
      "research-worth-reading",
      reading.map(function (r) {
        return {
          item: {
            id: r.id,
            subjectId: r.subjectId || "reading",
            title: r.title,
            summary: "Further reading · " + r.category + " · ~" + r.estimatedMinutes + " min",
            whyIncludedToday: "Queued because it supports items in today’s brief and matches this profile’s reading emphasis.",
            whatChanged: "Reading queue refreshed with this briefing.",
            whoIsAffected: "Readers following this audience profile.",
            whatIsKnown: ["Source label: " + r.attribution],
            whatIsUncertain: ["Depth and completeness of the linked document."],
            readNext: r.url ? [r.url] : [],
            citations: [{ label: r.attribution, kind: r.category, url: r.url }],
            provenance: [{ sourceLabel: r.attribution, sourceUrl: r.url, verified: false }],
            priority: {
              band: r.priorityBand || "moderate",
              total: 40,
              summaryWhy: "Reading recommendation — not a vulnerability severity score.",
              contributions: [
                {
                  factorId: "reading_relevance",
                  points: 40,
                  reason: "Matched profile reading preferences and briefing subjects."
                }
              ]
            },
            readingMinutes: r.estimatedMinutes,
            readingCategory: r.category
          }
        };
      })
    );

    fill(
      "things-to-watch",
      pickTop(
        scored.filter(function (r) {
          var watch = (r.entity.explainability && r.entity.explainability.watch) || [];
          return watch.length > 0;
        }),
        4
      )
    );

    // Today's summary narrative — generated from counts, not hardcoded prose library
    var confCounts = { high: 0, moderate: 0, low: 0, speculative: 0, insufficient: 0 };
    scored.forEach(function (r) {
      var c = r.entity.confidence || "moderate";
      if (confCounts[c] == null) confCounts[c] = 0;
      confCounts[c] += 1;
    });
    var summaryBits = [];
    summaryBits.push("Profile: " + (profile.label || profile.id) + ".");
    summaryBits.push("Scenario: " + scenario.replace(/-/g, " ") + ".");
    summaryBits.push(high.length ? high.length + " higher-attention item(s) explained below." : "No high-attention items for this profile.");
    summaryBits.push(changed.length ? changed.length + " item(s) show changes since the prior snapshot." : "Little change since the prior snapshot.");
    if (filtered.outageNarrative) summaryBits.push(filtered.outageNarrative);
    if (profile.summaryHint) summaryBits.push(profile.summaryHint);
    fill("todays-summary", high.slice(0, 1), summaryBits.join(" "));

    var confNarrative =
      "Confidence counts across scored subjects — high " +
      confCounts.high +
      ", moderate " +
      confCounts.moderate +
      ", low " +
      confCounts.low +
      ". Confidence stays separate from severity; sparse sources keep certainty humble.";
    sections["confidence-summary"].narrative = confNarrative;
    sections["confidence-summary"].empty = false;
    sections["confidence-summary"].emptyMessage = "";
    sections["confidence-summary"].items = [
      {
        id: "cbi_confidence",
        subjectId: "confidence",
        title: "Confidence overview",
        summary: confNarrative,
        whyIncludedToday: "Every brief ends with an honest confidence summary.",
        whatChanged: "Recounted for this generation.",
        whoIsAffected: "All readers.",
        whatIsKnown: ["Counts derived from entity confidence labels in this run."],
        whatIsUncertain: ["Labels are only as good as cited sources."],
        readNext: [],
        citations: [],
        provenance: [],
        priority: {
          band: "info",
          total: 0,
          summaryWhy: "Not a priority score — confidence accounting only.",
          contributions: [{ factorId: "confidence_accounting", points: 0, reason: "Informational section." }]
        }
      }
    ];

    var headline =
      scenario === "quiet-day"
        ? "A quieter window — ordinary hygiene still matters"
        : scenario === "patch-tuesday"
          ? "Patch highlights worth a calm review"
          : scenario === "critical-disclosure"
            ? "Critical disclosure teaching case — explained, not sensationalized"
            : scenario === "ransomware-campaign"
              ? "Ransomware awareness — context without alarm"
              : scenario === "cloud-outage"
                ? "Infrastructure-heavy day — cyber volume may be quiet"
                : "Today’s cyber attention brief";

    var allText = headline + " " + summaryBits.join(" ");
    Object.keys(sections).forEach(function (sid) {
      allText += " " + (sections[sid].narrative || "");
      (sections[sid].items || []).forEach(function (it) {
        allText += " " + (it.whyIncludedToday || "") + " " + (it.summary || "");
      });
    });
    var toneCheck = checkTone(allText, toneRules);

    var dashboard = {
      "todays-brief": sections["todays-summary"],
      "priority-changes": sections["new-since-yesterday"],
      "trending-topics": sections["emerging-trends"],
      "threat-landscape": sections["active-exploitation"],
      "vendor-activity": sections["major-vendor-advisories"],
      "learning-corner": sections["research-worth-reading"],
      "recently-updated": sections["new-since-yesterday"],
      "saved-research": {
        id: "saved-research",
        label: "Saved Research",
        empty: researchItems.length === 0,
        emptyMessage: "No saved research workspace items in this sample.",
        items: researchItems.slice(0, 5).map(function (ri) {
          return { title: ri.title, kind: ri.kind, domain: ri.domain };
        })
      }
    };

    return {
      meta: {
        version: "0.1.0",
        schema: "https://waypoint.studio/schemas/signalterrain/cyber/brief/v0.1",
        status: "sample",
        engineVersion: "cyber-brief-0.1.0",
        disclaimer:
          "Educational sample briefing. Transparent priority only — not a live SOC feed, not fear marketing."
      },
      id: hashId("cbr_", scenario + (profile && profile.id) + Date.now()),
      generatedAt: new Date().toISOString(),
      profileId: profile.id,
      scenario: scenario,
      previousBriefId: options.previousBriefId || null,
      headline: headline,
      sections: sections,
      confidenceSummary: { narrative: confNarrative, counts: confCounts },
      readingQueue: reading,
      dashboard: dashboard,
      toneCheck: toneCheck
    };
  }

  function mountBrief(root, options) {
    options = options || {};
    if (!root) return Promise.reject(new Error("mount root required"));
    root.setAttribute("aria-busy", "true");
    root.innerHTML = '<p class="st-loading">Opening today’s cyber brief…</p>';

    var base = options.base || "../../design-system/signalterrain/intelligence/cyber/briefing/";
    var cyberBase = options.cyberBase || "../../design-system/signalterrain/intelligence/cyber/";
    var scenario = options.scenario || "quiet-day";
    var profileId = options.profileId || "general-tech";

    return Promise.all([
      loadJson(base + "sections.json"),
      loadJson(base + "audience-profiles.json"),
      loadJson(base + "empty-states.json"),
      loadJson(base + "tone-rules.json"),
      loadJson(cyberBase + "priority-factors.json"),
      loadJson(cyberBase + "priority-rules.json"),
      loadJson(cyberBase + "samples/cyber-intelligence.sample.json"),
      loadJson(cyberBase + "samples/research-workspace.sample.json"),
      loadJson(base + "samples/" + scenario + ".brief.json").catch(function () {
        return null;
      })
    ])
      .then(function (parts) {
        var sectionsDoc = parts[0];
        var profilesDoc = parts[1];
        var emptyStates = parts[2];
        var toneRules = parts[3];
        var factors = parts[4];
        var rules = parts[5];
        var bundle = parts[6];
        var research = parts[7];
        var cachedSample = parts[8];

        var profile =
          (profilesDoc.profiles || []).filter(function (p) {
            return p.id === profileId;
          })[0] || profilesDoc.profiles[0];

        var previousSnapshot = {};
        if (scenario !== "quiet-day") {
          (bundle.entities || []).forEach(function (e) {
            if (e.severity === "critical") {
              previousSnapshot[e.id] = {
                severity: "elevated",
                products: [],
                references: [],
                advisoryIds: [],
                verified: false,
                at: "2026-07-17T12:00:00Z"
              };
            }
          });
        }

        var brief = generateBrief({
          entities: bundle.entities || [],
          profile: profile,
          factors: factors,
          rules: rules,
          sections: sectionsDoc,
          emptyStates: emptyStates,
          toneRules: toneRules,
          scenario: scenario,
          previousSnapshot: previousSnapshot,
          researchItems: (research && research.items) || []
        });

        // Prefer live generation; sample file is optional annotation
        if (cachedSample && cachedSample.meta && options.preferFile) brief = cachedSample;

        function paint() {
          var dashAnchors = {
            "todays-brief": "todays-summary",
            "priority-changes": "new-since-yesterday",
            "trending-topics": "emerging-trends",
            "threat-landscape": "active-exploitation",
            "vendor-activity": "major-vendor-advisories",
            "learning-corner": "research-worth-reading",
            "recently-updated": "new-since-yesterday",
            "saved-research": "saved-research"
          };
          var panelNav = (sectionsDoc.dashboardPanels || [])
            .map(function (p) {
              var anchor = dashAnchors[p.id] || p.id;
              return '<a href="#' + esc(anchor) + '">' + esc(p.label) + "</a>";
            })
            .join(" · ");

          var profileOpts = (profilesDoc.profiles || [])
            .map(function (p) {
              return (
                '<option value="' +
                esc(p.id) +
                '"' +
                (p.id === profile.id ? " selected" : "") +
                ">" +
                esc(p.label) +
                "</option>"
              );
            })
            .join("");

          var scenarioOpts = [
            "quiet-day",
            "patch-tuesday",
            "critical-disclosure",
            "ransomware-campaign",
            "cloud-outage"
          ]
            .map(function (s) {
              return (
                '<option value="' +
                esc(s) +
                '"' +
                (s === scenario ? " selected" : "") +
                ">" +
                esc(s.replace(/-/g, " ")) +
                "</option>"
              );
            })
            .join("");

          function renderItem(it) {
            if (!it || !it.priority) return "";
            var bandClass =
              it.priority.band === "urgent"
                ? "st-brief-band st-brief-band--urgent"
                : it.priority.band === "high"
                  ? "st-brief-band st-brief-band--high"
                  : "st-brief-band";
            return (
              '<article class="st-brief-item">' +
              "<h3>" +
              esc(it.title) +
              ' <span class="' +
              bandClass +
              '">' +
              esc(it.priority.band) +
              " · " +
              esc(String(it.priority.total)) +
              "</span></h3>" +
              "<p>" +
              esc(it.summary || "") +
              "</p>" +
              "<p><strong>Why today?</strong> " +
              esc(it.whyIncludedToday) +
              "</p>" +
              "<p><strong>What changed?</strong> " +
              esc(it.whatChanged) +
              "</p>" +
              "<p><strong>Who is affected?</strong> " +
              esc(it.whoIsAffected) +
              "</p>" +
              "<p><strong>Known:</strong> " +
              esc((it.whatIsKnown || []).join(" · ")) +
              "</p>" +
              "<p><strong>Uncertain:</strong> " +
              esc((it.whatIsUncertain || []).join(" · ")) +
              "</p>" +
              "<details><summary>Priority contributions</summary><ul>" +
              (it.priority.contributions || [])
                .map(function (c) {
                  return (
                    "<li><strong>" +
                    esc(c.factorId) +
                    "</strong> +" +
                    esc(String(c.points)) +
                    " — " +
                    esc(c.reason) +
                    "</li>"
                  );
                })
                .join("") +
              "</ul></details>" +
              (it.citations && it.citations.length
                ? "<p class=\"st-brief-cite\">Citations: " +
                  it.citations
                    .map(function (c) {
                      return c.url
                        ? '<a href="' + esc(c.url) + '">' + esc(c.label) + "</a>"
                        : esc(c.label);
                    })
                    .join("; ") +
                  "</p>"
                : "") +
              "</article>"
            );
          }

          function renderSection(sec, anchor) {
            if (!sec) return "";
            return (
              '<section class="st-brief-section" id="' +
              esc(anchor || sec.id) +
              '">' +
              "<h2>" +
              esc(sec.label) +
              "</h2>" +
              (sec.narrative ? "<p class=\"st-brief-narrative\">" + esc(sec.narrative) + "</p>" : "") +
              (sec.empty
                ? '<p class="st-brief-empty">' + esc(sec.emptyMessage) + "</p>"
                : (sec.items || []).map(renderItem).join("")) +
              "</section>"
            );
          }

          var order = (sectionsDoc.sections || []).slice().sort(function (a, b) {
            return a.order - b.order;
          });
          var body = order
            .map(function (def) {
              return renderSection(brief.sections[def.id], def.id);
            })
            .join("");

          // Dashboard anchors reuse sections
          var dash =
            '<nav class="st-brief-dashnav" aria-label="Brief dashboard">' +
            panelNav +
            "</nav>";

          root.innerHTML =
            '<div class="st-brief">' +
            '<header class="st-demo-header">' +
            "<h1>" +
            esc(brief.headline) +
            "</h1>" +
            '<p class="st-lead">What should I pay attention to today?</p>' +
            '<p class="st-badge">' +
            esc(brief.meta.disclaimer) +
            "</p>" +
            '<p class="st-brief-meta">Generated ' +
            esc(brief.generatedAt) +
            " · Tone check: " +
            (brief.toneCheck && brief.toneCheck.ok ? "calm" : "flagged") +
            "</p>" +
            '<form class="st-brief-controls" id="st-brief-controls">' +
            '<label>Profile <select name="profile" id="st-brief-profile">' +
            profileOpts +
            "</select></label> " +
            '<label>Scenario <select name="scenario" id="st-brief-scenario">' +
            scenarioOpts +
            "</select></label> " +
            '<button type="submit" class="wds-btn wds-btn--primary wds-btn--sm">Regenerate</button>' +
            "</form>" +
            "</header>" +
            dash +
            body +
            renderSection(brief.dashboard["saved-research"], "saved-research") +
            "</div>";

          var form = document.getElementById("st-brief-controls");
          if (form) {
            form.addEventListener("submit", function (ev) {
              ev.preventDefault();
              var p = document.getElementById("st-brief-profile").value;
              var s = document.getElementById("st-brief-scenario").value;
              mountBrief(root, Object.assign({}, options, { profileId: p, scenario: s }));
            });
          }
          root.removeAttribute("aria-busy");
        }

        paint();
        return brief;
      })
      .catch(function (err) {
        root.innerHTML = '<p role="alert">Could not open briefing. ' + esc(err && err.message) + "</p>";
        root.removeAttribute("aria-busy");
      });
  }

  global.WDS = global.WDS || {};
  global.WDS.signalTerrainCyberBrief = {
    generateBrief: generateBrief,
    buildExplainItem: buildExplainItem,
    scoreEntity: scoreEntity,
    checkTone: checkTone,
    estimateReadingMinutes: estimateReadingMinutes,
    mountBrief: mountBrief,
    scenarioFilter: scenarioFilter
  };
})(typeof window !== "undefined" ? window : globalThis);
