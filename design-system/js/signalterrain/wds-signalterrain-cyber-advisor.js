/**
 * SignalTerrain Adaptive Cyber Defense Advisor V1.0
 * Strategic reasoning: "What should I do differently today?"
 * Educational, defensive, explainable, privacy-first. No offensive guidance.
 */
(function (global) {
  "use strict";

  var PROFILE_KEY = "st_security_profile_v1";
  var SNAPSHOT_KEY = "st_advisor_snapshot_v1";

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

  function storage() {
    try {
      return global.localStorage;
    } catch (e) {
      return null;
    }
  }

  function GraphApi() {
    return global.WDS && global.WDS.signalTerrainCyberGraph;
  }

  function Priority() {
    return global.WDS && global.WDS.signalTerrainCyberPriority;
  }

  function Inventory() {
    return global.WDS && global.WDS.signalTerrainInventory;
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

  function loadProfile() {
    var s = storage();
    if (!s) return null;
    try {
      var raw = s.getItem(PROFILE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveProfile(profile) {
    var s = storage();
    if (!s) return false;
    profile.updatedAt = new Date().toISOString();
    s.setItem(PROFILE_KEY, JSON.stringify(profile));
    return true;
  }

  function loadSnapshot() {
    var s = storage();
    if (!s) return null;
    try {
      var raw = s.getItem(SNAPSHOT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveSnapshot(snap) {
    var s = storage();
    if (!s) return false;
    s.setItem(SNAPSHOT_KEY, JSON.stringify(snap));
    return true;
  }

  /**
   * Connect intelligence → affected tech → inventory → exposure explanations.
   */
  function analyzeExposure(graph, inventoryItems, profile, options) {
    options = options || {};
    var factors = options.factors || null;
    var rules = options.rules || null;
    profile = profile || {};
    var Inv = Inventory();
    var exposures = [];
    var products = graph.byKind("affected-software").concat(graph.byKind("affected-hardware"));

    (inventoryItems || []).forEach(function (item) {
      products.forEach(function (product) {
        var match = Inv
          ? Inv.matchEntity(item, product)
          : { status: "unknown", method: "none", confidence: "insufficient", reasons: [] };
        if (match.status === "unlikely" || match.status === "unknown") return;

        var cves = [];
        graph.neighbors(product.id, { bidirectional: true }).forEach(function (n) {
          if (
            n.entity &&
            (n.entity.kind === "cve" || n.entity.kind === "vulnerability") &&
            n.edge.type === "affects"
          ) {
            cves.push(n.entity);
          }
        });
        graph.byKind("cve").forEach(function (cve) {
          var hits = graph.neighbors(cve.id, { type: "affects" }).filter(function (n) {
            return n.direction === "out" && n.entity && n.entity.id === product.id;
          });
          if (hits.length) {
            var exists = cves.some(function (c) {
              return c.id === cve.id;
            });
            if (!exists) cves.push(cve);
          }
        });

        cves.forEach(function (cve) {
          var patches = graph
            .neighbors(cve.id, { bidirectional: true })
            .filter(function (n) {
              return n.entity && n.entity.kind === "patch" && n.edge.type === "fixes";
            })
            .map(function (n) {
              return n.entity;
            });
          var facts = [
            "Intelligence entity “" +
              cve.title +
              "” (" +
              cve.id +
              ") is linked to product “" +
              product.title +
              "” via affects.",
            "Inventory item “" + item.name + "” matched product via " + match.method + "."
          ];
          var inferences = [];
          var matters = [];
          var notAffect = [];
          var assumptions = [
            "Inventory accuracy depends on owner entry (discovery=" + (item.discovery || "manual") + ").",
            "Sample intelligence may be historical teaching cases — not a live feed."
          ];
          var missing = [
            "Exact installed version vs fixed version not verified.",
            "Runtime exposure (network-facing vs offline) unknown unless noted."
          ];

          if (match.status === "matched") {
            matters.push(
              "This advisory matters because your inventory explicitly links to " +
                product.title +
                ", which the graph records as affected by " +
                (cve.cveId || cve.title) +
                "."
            );
            inferences.push("Match confidence is high because linkedEntityId was set by the owner.");
          } else {
            matters.push(
              "This advisory may matter because a " +
                match.confidence +
                "-confidence " +
                match.method +
                " suggests your “" +
                item.name +
                "” overlaps “" +
                product.title +
                "”."
            );
            notAffect.push(
              "This advisory probably does not affect you yet if the name/tag overlap is coincidental — confirm the product link."
            );
            inferences.push("Match is inferred, not asserted — treat as a review prompt.");
          }

          if (item.criticality === "low" && (profile.riskTolerance || "balanced") === "accepting") {
            notAffect.push(
              "Given low criticality and accepting risk tolerance, this may be deferrable after a calm review."
            );
          }

          if (patches.length) {
            facts.push(
              "Graph lists patch guidance: " +
                patches
                  .map(function (p) {
                    return p.title;
                  })
                  .join("; ")
            );
          } else {
            missing.push("No patch entity linked in the sample graph for this CVE.");
          }

          var scored = null;
          if (Priority() && cve.priorityInputs && factors && rules) {
            scored = Priority().score(
              Object.assign({ subjectId: cve.id, id: "cyp_adv_" + cve.id }, cve.priorityInputs, {
                ownerInterest: item.importance === "high" ? 4 : item.importance === "low" ? 1 : 2,
                industryRelevance: Math.min(
                  10,
                  (cve.priorityInputs.industryRelevance || 0) + (item.criticality === "critical" ? 2 : 0)
                )
              }),
              factors,
              rules
            );
          }

          var invMatchContribution = {
            factorId: "inventory_match",
            points: match.status === "matched" ? 8 : match.status === "possible" ? 4 : 0,
            reason:
              "Transparent inventory match (" +
              match.method +
              ", " +
              match.confidence +
              ") — not a hidden score."
          };

          exposures.push({
            id: hashId("exp_", item.id + cve.id),
            inventoryItemId: item.id,
            inventoryName: item.name,
            productId: product.id,
            productTitle: product.title,
            intelligenceId: cve.id,
            intelligenceTitle: cve.title,
            cveId: cve.cveId || null,
            patchIds: patches.map(function (p) {
              return p.id;
            }),
            match: {
              status: match.status,
              method: match.method,
              confidence: match.confidence,
              reasons: match.reasons || []
            },
            explanation: {
              mattersBecause: matters,
              probablyDoesNotAffectBecause: notAffect,
              assumptions: assumptions,
              missing: missing,
              facts: facts,
              inferences: inferences
            },
            priority: scored
              ? {
                  band: scored.band,
                  total: Math.min(100, scored.total + invMatchContribution.points),
                  summaryWhy: scored.summaryWhy,
                  contributions: (scored.contributions || []).concat([invMatchContribution])
                }
              : {
                  band: "moderate",
                  total: invMatchContribution.points,
                  summaryWhy: "Inventory match only — full priority factors not loaded.",
                  contributions: [invMatchContribution]
                },
            citations: cve.citations || [],
            severity: cve.severity || "info",
            confidence: cve.confidence || "moderate"
          });
        });
      });
    });

    var linkedProductIds = {};
    exposures.forEach(function (e) {
      linkedProductIds[e.productId] = true;
    });
    graph.byKind("cve").forEach(function (cve) {
      var affected = graph.neighbors(cve.id, { type: "affects" }).filter(function (n) {
        return n.direction === "out" && n.entity;
      });
      if (!affected.length) return;
      var anyLinked = affected.some(function (n) {
        return linkedProductIds[n.entity.id];
      });
      if (anyLinked) return;
      var names = affected.map(function (n) {
        return n.entity.title;
      });
      exposures.push({
        id: hashId("exp_skip_", cve.id),
        inventoryItemId: null,
        inventoryName: null,
        productId: affected[0].entity.id,
        productTitle: affected[0].entity.title,
        intelligenceId: cve.id,
        intelligenceTitle: cve.title,
        cveId: cve.cveId || null,
        patchIds: [],
        match: { status: "unlikely", method: "no-inventory-hit", confidence: "moderate", reasons: [] },
        explanation: {
          mattersBecause: [],
          probablyDoesNotAffectBecause: [
            "This advisory probably does not affect you because none of your inventory items matched affected products (" +
              names.join(", ") +
              ")."
          ],
          assumptions: ["Inventory is complete enough for this sample comparison."],
          missing: ["Undeclared software could still create exposure."],
          facts: ["CVE is present in the intelligence sample."],
          inferences: [
            "Absence of inventory match is treated as low personal relevance — not as “safe forever.”"
          ]
        },
        priority: null,
        citations: cve.citations || [],
        severity: cve.severity || "info",
        confidence: cve.confidence || "moderate",
        safeToIgnoreCandidate: true
      });
    });

    return exposures;
  }

  function generateRecommendations(exposures, season, profile) {
    var recs = [];
    var actionable = (exposures || []).filter(function (e) {
      return e.match && (e.match.status === "matched" || e.match.status === "possible");
    });

    actionable.slice(0, 8).forEach(function (exp) {
      var band = (exp.priority && exp.priority.band) || "moderate";
      if ((profile && profile.riskTolerance) === "cautious" && band === "low") band = "moderate";
      if ((profile && profile.riskTolerance) === "accepting" && band === "high") band = "moderate";

      recs.push({
        meta: {
          version: "0.1.0",
          schema: "https://waypoint.studio/schemas/signalterrain/recommendation/v0.1",
          status: "suggested",
          disclaimer: "Defensive guidance only — human decides. Never auto-executes."
        },
        id: hashId("rec_", exp.intelligenceId + exp.inventoryItemId),
        title: "Review defensive guidance for " + (exp.cveId || exp.intelligenceTitle),
        why:
          (exp.explanation.mattersBecause && exp.explanation.mattersBecause[0]) ||
          "Inventory appears related to an affected product in the shared intelligence graph.",
        who: (profile && profile.environments) || ["SignalTerrain operator"],
        priority: band === "urgent" ? "high" : band,
        evidence: (exp.citations || [])
          .slice(0, 3)
          .map(function (c) {
            return { text: c.label, url: c.url || null };
          })
          .concat([
            {
              text: "Graph exposure " + exp.id + " via " + exp.match.method,
              url: null
            }
          ]),
        action:
          exp.patchIds && exp.patchIds.length
            ? "Read the public vendor/patch guidance linked in the graph, verify backups if the component is critical, then apply available updates in a tested window. No exploit steps. No automatic remediation."
            : "Read the public advisory and inventory whether this component is actually deployed. Confirm versions before acting. No offensive testing.",
        expectedDuration: "15–45 minutes for a calm review",
        dependencies: ["Access to vendor documentation", "Ability to verify inventory versions"],
        confidence: exp.match.confidence === "high" ? "moderate" : "low",
        unknowns: (exp.explanation.missing || []).concat(exp.explanation.assumptions || []).slice(0, 6),
        relatedUioIds: [],
        relatedTopicIds: [exp.intelligenceId, exp.productId].filter(Boolean),
        expiresAt: null,
        autoExecute: false,
        explainability: explainRecommendation(exp, season)
      });
    });

    // Season hygiene recommendations (always defensive)
    if (season && season.id === "season_ransomware") {
      recs.push({
        meta: {
          version: "0.1.0",
          schema: "https://waypoint.studio/schemas/signalterrain/recommendation/v0.1",
          status: "suggested",
          disclaimer: "Seasonal hygiene — educational."
        },
        id: "rec_season-backup-verify",
        title: "Verify backups during a ransomware-awareness season",
        why: "Season signals emphasize disruptive ransomware themes; backup confidence reduces uncertainty without panic.",
        who: (profile && profile.environments) || ["operators"],
        priority: "moderate",
        evidence: [{ text: "Cyber season: " + season.label, url: null }],
        action: "Confirm recent backups completed and that a restore path has been tested. Prefer offline or immutable copies where your practice allows.",
        expectedDuration: "30–90 minutes",
        dependencies: ["Backup system access"],
        confidence: "moderate",
        unknowns: ["No automatic verification of backup integrity in V1."],
        relatedUioIds: [],
        relatedTopicIds: [],
        expiresAt: null,
        autoExecute: false,
        explainability: {
          whySeeingThis: "Active cyber season labeled major ransomware activity.",
          technologies: [],
          sources: ["cyber-seasons.json"],
          confidence: "moderate",
          assumptions: ["Season is educational, derived from sample signal mix."],
          missing: ["Live campaign telemetry (out of scope)."],
          facts: ["Season catalog includes ransomware awareness."],
          inferences: ["Backup review is a proportionate response to the season theme."]
        }
      });
    }

    if (season && season.id === "season_patch_tuesday") {
      recs.push({
        meta: {
          version: "0.1.0",
          schema: "https://waypoint.studio/schemas/signalterrain/recommendation/v0.1",
          status: "suggested",
          disclaimer: "Patch window hygiene."
        },
        id: "rec_season-patch-review",
        title: "Review available vendor patches against inventory",
        why: "Patch-window season: calm review beats alert fatigue.",
        who: (profile && profile.environments) || ["operators"],
        priority: "moderate",
        evidence: [{ text: "Cyber season: " + season.label, url: null }],
        action: "Walk inventory high-criticality items and check public vendor patch notes. Defer low-relevance items explicitly.",
        expectedDuration: "20–60 minutes",
        dependencies: ["Inventory list"],
        confidence: "moderate",
        unknowns: ["Vendor calendars vary."],
        relatedUioIds: [],
        relatedTopicIds: [],
        expiresAt: null,
        autoExecute: false,
        explainability: {
          whySeeingThis: "Season signals favor patches and vendor advisories.",
          technologies: [],
          sources: ["cyber-seasons.json"],
          confidence: "moderate",
          assumptions: ["Sample patch density informs season labeling."],
          missing: ["Your org’s exact patch calendar."],
          facts: [],
          inferences: ["A structured patch review matches the season theme."]
        }
      });
    }

    return recs;
  }

  function explainRecommendation(exp, season) {
    return {
      whySeeingThis:
        "You are seeing this because exposure analysis linked inventory “" +
        (exp.inventoryName || "?") +
        "” to intelligence “" +
        exp.intelligenceTitle +
        "” (" +
        exp.match.status +
        " / " +
        exp.match.method +
        ").",
      technologies: [exp.inventoryName, exp.productTitle].filter(Boolean),
      sources: (exp.citations || []).map(function (c) {
        return c.label;
      }),
      confidence: exp.match.confidence,
      assumptions: exp.explanation.assumptions || [],
      missing: exp.explanation.missing || [],
      facts: exp.explanation.facts || [],
      inferences: exp.explanation.inferences || [],
      seasonId: season && season.id
    };
  }

  function assessPosture(inventoryItems, exposures, season, postureCategories) {
    var items = inventoryItems || [];
    var matched = (exposures || []).filter(function (e) {
      return e.match && (e.match.status === "matched" || e.match.status === "possible");
    });
    var hasNas = items.some(function (i) {
      return i.category === "nas" || (i.tags || []).indexOf("backup") >= 0;
    });
    var hasBrowser = items.some(function (i) {
      return i.category === "browser";
    });
    var hasCloud = items.some(function (i) {
      return i.category === "cloud-provider" || (i.tags || []).indexOf("cloud") >= 0;
    });
    var openPatch = matched.filter(function (e) {
      return e.patchIds && e.patchIds.length;
    }).length;

    function row(id, status, gaps, improvements, confidence) {
      var label =
        ((postureCategories || []).filter(function (c) {
          return c.id === id;
        })[0] || {}).label || id;
      return {
        id: id,
        label: label,
        status: status,
        knownGaps: gaps,
        recommendedImprovements: improvements,
        confidence: confidence
      };
    }

    return [
      row(
        "patch-readiness",
        openPatch ? "Attention — " + openPatch + " inventory-linked items have graph patch neighbors" : "Calm — no inventory-linked patch neighbors in this run",
        openPatch ? ["Version confirmation still missing"] : ["Inventory may be incomplete"],
        openPatch ? ["Review public patch guidance for matched items"] : ["Keep ordinary update cadence"],
        openPatch ? "moderate" : "low"
      ),
      row(
        "backup-confidence",
        hasNas ? "NAS/backup-tagged inventory present" : "No backup target declared in inventory",
        hasNas ? ["Restore test not verified by advisor"] : ["Declare backup targets in inventory"],
        ["Verify restore path manually"],
        hasNas ? "moderate" : "insufficient"
      ),
      row(
        "identity-protection",
        "Not assessed from inventory alone",
        ["No identity inventory model in V1"],
        ["Prefer MFA on critical accounts (general hygiene)"],
        "insufficient"
      ),
      row(
        "browser-hygiene",
        hasBrowser ? "Browser listed" : "No browser in inventory",
        ["Extension inventory unknown"],
        hasBrowser ? ["Keep browser updates current"] : ["Add browser to inventory if used"],
        hasBrowser ? "low" : "insufficient"
      ),
      row(
        "endpoint-protection",
        "Not scored — no endpoint agent claims",
        ["No EDR/AV inventory fields in V1"],
        ["Document endpoint tools in owner notes if relevant"],
        "insufficient"
      ),
      row(
        "network-visibility",
        items.some(function (i) {
          return i.category === "firewall" || i.category === "router";
        })
          ? "Network devices listed"
          : "No network devices declared",
        ["Visibility depth unknown"],
        ["Add routers/firewalls when they matter to you"],
        "low"
      ),
      row(
        "remote-access",
        "Not assessed",
        ["Remote access tools not in sample inventory schema usage"],
        season && season.id === "season_ransomware"
          ? ["Review remote-access exposure during ransomware-awareness seasons"]
          : ["Document remote access paths in notes"],
        "insufficient"
      ),
      row(
        "cloud-security",
        hasCloud ? "Cloud provider listed" : "No cloud provider in inventory",
        ["Shared responsibility details unknown"],
        hasCloud ? ["Review provider status/security bulletins when season suggests"] : [],
        hasCloud ? "low" : "insufficient"
      ),
      row(
        "configuration-health",
        "Owner-maintained",
        ["Advisor does not scan configs"],
        ["Use vendor hardening guides for high-criticality items"],
        "insufficient"
      )
    ];
  }

  function detectSeason(graph, seasonsDoc, hint) {
    var seasons = (seasonsDoc && seasonsDoc.seasons) || [];
    if (hint) {
      var forced = seasons.filter(function (s) {
        return s.id === hint;
      })[0];
      if (forced) {
        return Object.assign({}, forced, {
          detection: "manual-hint",
          narrative: "Season selected for demonstration: " + forced.label
        });
      }
    }
    var blob = "";
    (graph.entities || []).forEach(function (e) {
      blob += " " + e.kind + " " + e.title + " " + (e.summary || "");
    });
    blob = blob.toLowerCase();
    var scores = seasons
      .filter(function (s) {
        return s.id !== "season_quiet";
      })
      .map(function (s) {
        var hits = 0;
        (s.signals || []).forEach(function (sig) {
          if (blob.indexOf(String(sig).toLowerCase()) >= 0) hits += 1;
        });
        return { season: s, hits: hits };
      })
      .sort(function (a, b) {
        return b.hits - a.hits;
      });
    var top = scores[0];
    if (!top || top.hits === 0) {
      var quiet = seasons.filter(function (s) {
        return s.id === "season_quiet";
      })[0];
      return Object.assign({}, quiet, {
        detection: "signal-absence",
        narrative: quiet.explanation
      });
    }
    return Object.assign({}, top.season, {
      detection: "signal-presence",
      signalHits: top.hits,
      narrative: top.season.explanation + " (educational detection from sample signal mix — not a forecast.)"
    });
  }

  function diffSnapshots(previous, current) {
    previous = previous || { exposureIds: [], recommendationIds: [], patchIds: [] };
    current = current || { exposureIds: [], recommendationIds: [], patchIds: [] };
    function setDiff(a, b) {
      var A = {};
      (a || []).forEach(function (x) {
        A[x] = true;
      });
      var added = [];
      var removed = [];
      (b || []).forEach(function (x) {
        if (!A[x]) added.push(x);
      });
      var B = {};
      (b || []).forEach(function (x) {
        B[x] = true;
      });
      (a || []).forEach(function (x) {
        if (!B[x]) removed.push(x);
      });
      return { added: added, removed: removed };
    }
    var exp = setDiff(previous.exposureIds, current.exposureIds);
    var rec = setDiff(previous.recommendationIds, current.recommendationIds);
    var patch = setDiff(previous.patchIds, current.patchIds);
    return {
      newRisks: exp.added,
      resolvedIssues: exp.removed,
      newMitigations: patch.added,
      newPatches: patch.added,
      newVendorGuidance: rec.added.filter(function (id) {
        return String(id).indexOf("rec_") === 0;
      }),
      retiredAdvisories: rec.removed,
      summary:
        exp.added.length || exp.removed.length || patch.added.length
          ? "Changes detected versus the previous advisor snapshot."
          : "No material advisor deltas versus the previous snapshot — unchanged items omitted."
    };
  }

  function generateDailyAdvisor(options) {
    options = options || {};
    var graph = options.graph;
    var inventoryItems = options.inventoryItems || [];
    var profile = options.profile || {
      id: "spf_default",
      environments: ["home-user"],
      riskTolerance: "balanced"
    };
    var seasonsDoc = options.seasonsDoc;
    var postureCategories = options.postureCategories || [];
    var seasonHint = options.seasonHint || null;
    var previous = options.previousSnapshot || loadSnapshot();

    var season = detectSeason(graph, seasonsDoc, seasonHint);
    var exposures = analyzeExposure(graph, inventoryItems, profile, {
      factors: options.factors || null,
      rules: options.rules || null
    });
    var recommendations = generateRecommendations(exposures, season, profile);
    var posture = assessPosture(inventoryItems, exposures, season, postureCategories);

    var matched = exposures.filter(function (e) {
      return e.match && (e.match.status === "matched" || e.match.status === "possible");
    });
    var safe = exposures.filter(function (e) {
      return e.safeToIgnoreCandidate;
    });

    var currentSnap = {
      at: new Date().toISOString(),
      exposureIds: matched.map(function (e) {
        return e.id;
      }),
      recommendationIds: recommendations.map(function (r) {
        return r.id;
      }),
      patchIds: matched.reduce(function (acc, e) {
        return acc.concat(e.patchIds || []);
      }, [])
    };
    var whatChanged = diffSnapshots(previous, currentSnap);
    if (options.persistSnapshot !== false) saveSnapshot(currentSnap);

    var changes = [];
    if (whatChanged.newRisks[0]) changes.push("New inventory-linked exposure: " + whatChanged.newRisks[0]);
    if (whatChanged.newPatches[0]) changes.push("New patch neighbor in graph: " + whatChanged.newPatches[0]);
    if (season) changes.push("Cyber season framing: " + season.label);
    while (changes.length < 3) {
      if (matched[changes.length]) {
        changes.push("Open exposure review: " + matched[changes.length].intelligenceTitle);
      } else break;
    }
    changes = changes.slice(0, 3);

    var actions = recommendations.slice(0, 3).map(function (r) {
      return {
        id: r.id,
        title: r.title,
        action: r.action,
        priority: r.priority,
        explainability: r.explainability
      };
    });

    var learning =
      matched[0]
        ? {
            title: "Learning opportunity: " + matched[0].intelligenceTitle,
            summary:
              "Walk the shared attention chain for this CVE in the explorer — understand affects → advisory → patch without rushing.",
            subjectId: matched[0].intelligenceId
          }
        : {
            title: "Learning opportunity: ordinary hygiene",
            summary: "In a quiet window, practice inventory completeness and backup restore literacy.",
            subjectId: null
          };

    var reviewMinutes = Math.max(5, Math.min(40, 5 + actions.length * 8 + matched.length * 3));

    return {
      meta: {
        version: "1.0.0",
        status: "sample",
        disclaimer:
          "Educational adaptive advisor. Transparent reasoning only. Never auto-remediates. Never offensive."
      },
      id: hashId("adb_", profile.id + season.id + currentSnap.at),
      generatedAt: currentSnap.at,
      profile: profile,
      season: {
        id: season.id,
        label: season.label,
        narrative: season.narrative || season.explanation,
        detection: season.detection
      },
      changes: changes,
      actions: actions,
      safeToIgnore: safe.slice(0, 5).map(function (e) {
        return {
          id: e.intelligenceId,
          title: e.intelligenceTitle,
          reason: (e.explanation.probablyDoesNotAffectBecause || [])[0] || "No inventory match."
        };
      }),
      learning: learning,
      estimatedReviewMinutes: reviewMinutes,
      whatChanged: whatChanged,
      posture: posture,
      recommendations: recommendations,
      exposures: exposures,
      inventoryCount: inventoryItems.length
    };
  }

  /**
   * Architecture stub — does not invent predictive outcomes.
   */
  function simulateDefensiveChange(scenarioId, inputs, context) {
    return {
      status: "architecture-stub",
      scenarioId: scenarioId,
      inputs: inputs || {},
      assumptions: [
        "Simulation rearranges known inventory and known graph links only.",
        "No guaranteed risk reduction."
      ],
      unknowns: [
        "Runtime behavior after change",
        "Side effects on dependent systems",
        "Operator execution quality"
      ],
      projectedExposures: [],
      projectedRecommendations: [],
      confidence: "insufficient",
      message:
        "What-if simulation is designed in simulation-architecture.json but not fully implemented in V1 — refusing unsupported predictions.",
      contextPresent: !!(context && context.graph)
    };
  }

  function mountAdvisor(root, options) {
    options = options || {};
    if (!root) return Promise.reject(new Error("mount root required"));
    root.setAttribute("aria-busy", "true");
    root.innerHTML = '<p class="st-loading">Opening Adaptive Defense Advisor…</p>';

    var base = options.base || "../../design-system/signalterrain/intelligence/cyber/";
    var advisorBase = options.advisorBase || base + "advisor/";
    var G = GraphApi();
    var Inv = Inventory();
    if (!G || !Inv) {
      root.innerHTML = '<p role="alert">Advisor dependencies failed to load (graph/inventory).</p>';
      root.removeAttribute("aria-busy");
      return Promise.resolve();
    }

    var state = {
      inventorySample: "developer-homelab",
      seasonHint: "",
      brief: null
    };

    return Promise.all([
      G.loadBundle(base + "samples/cyber-intelligence.sample.json"),
      loadJson(advisorBase + "security-profiles.json"),
      loadJson(advisorBase + "posture-categories.json"),
      loadJson(advisorBase + "cyber-seasons.json"),
      loadJson(advisorBase + "samples/inventory.developer-homelab.json"),
      loadJson(advisorBase + "samples/inventory.home-user.json"),
      Priority() ? Priority().loadRules(base) : Promise.resolve({ factors: null, rules: null })
    ]).then(function (parts) {
      var graph = parts[0].graph;
      // Attach entities for season detection
      graph.entities = parts[0].bundle.entities;
      var profileCatalog = parts[1];
      var postureCategories = parts[2].categories || [];
      var seasonsDoc = parts[3];
      var invDev = parts[4];
      var invHome = parts[5];
      var rulesPack = parts[6] || {};

      function activeProfile() {
        return (
          loadProfile() || {
            id: "spf_sample-dev",
            label: "Sample developer home lab",
            environments: ["developer", "home-lab", "linux-desktop"],
            riskTolerance: "balanced",
            industry: "software",
            region: "global",
            notes: "Editable sample profile",
            updatedAt: new Date().toISOString()
          }
        );
      }

      function activeInventory() {
        var local = Inv.list();
        if (local.length) return local;
        return state.inventorySample === "home-user" ? invHome.items : invDev.items;
      }

      function run() {
        var profile = activeProfile();
        var brief = generateDailyAdvisor({
          graph: graph,
          inventoryItems: activeInventory(),
          profile: profile,
          seasonsDoc: seasonsDoc,
          postureCategories: postureCategories,
          seasonHint: state.seasonHint || null,
          previousSnapshot: loadSnapshot(),
          factors: rulesPack.factors || null,
          rules: rulesPack.rules || null
        });
        state.brief = brief;
        return brief;
      }

      function paint() {
        var profile = activeProfile();
        var brief = run();
        var inv = activeInventory();

        var envOpts = (profileCatalog.environments || [])
          .map(function (e) {
            var on = (profile.environments || []).indexOf(e.id) !== -1;
            return (
              '<label class="st-x-check"><input type="checkbox" data-env="' +
              esc(e.id) +
              '"' +
              (on ? " checked" : "") +
              " /> " +
              esc(e.label) +
              "</label>"
            );
          })
          .join(" ");

        root.innerHTML =
          '<div class="st-advisor">' +
          '<header class="st-demo-header">' +
          "<h1>Adaptive Cyber Defense Advisor</h1>" +
          '<p class="st-lead">What should I do differently today?</p>' +
          '<p class="st-badge">' +
          esc(brief.meta.disclaimer) +
          "</p>" +
          "</header>" +
          '<section class="st-advisor-panel">' +
          "<h2>Security profile</h2>" +
          '<p class="st-muted">Select multiple environments. Editable. Profiles change emphasis — not facts.</p>' +
          '<div class="st-x-env">' +
          envOpts +
          "</div>" +
          "<label>Risk tolerance <select id=\"st-adv-risk\">" +
          ["cautious", "balanced", "accepting"]
            .map(function (r) {
              return (
                '<option value="' +
                r +
                '"' +
                (profile.riskTolerance === r ? " selected" : "") +
                ">" +
                r +
                "</option>"
              );
            })
            .join("") +
          "</select></label> " +
          '<button type="button" class="st-chip" id="st-adv-save-profile">Save profile</button>' +
          "</section>" +
          '<section class="st-advisor-panel">' +
          "<h2>Technology inventory</h2>" +
          '<p class="st-muted">Shared inventory service · manual in V1 · future automated discovery supported by schema.</p>' +
          "<label>Sample <select id=\"st-adv-inv-sample\">" +
          '<option value="developer-homelab"' +
          (state.inventorySample === "developer-homelab" ? " selected" : "") +
          ">Developer home lab</option>" +
          '<option value="home-user"' +
          (state.inventorySample === "home-user" ? " selected" : "") +
          ">Home user</option></select></label> " +
          '<button type="button" class="st-chip" id="st-adv-load-inv">Load sample into local inventory</button>' +
          '<ul class="st-cyber-list">' +
          inv
            .map(function (it) {
              return (
                "<li><strong>" +
                esc(it.name) +
                "</strong> <span class=\"st-badge\">" +
                esc(it.category) +
                " · " +
                esc(it.criticality) +
                "</span>" +
                (it.linkedEntityId
                  ? ' <span class="st-muted">→ ' + esc(it.linkedEntityId) + "</span>"
                  : "") +
                (it.ownerNotes ? "<p>" + esc(it.ownerNotes) + "</p>" : "") +
                "</li>"
              );
            })
            .join("") +
          "</ul></section>" +
          '<section class="st-advisor-panel">' +
          "<h2>Cyber season</h2>" +
          "<p><strong>" +
          esc(brief.season.label) +
          "</strong></p><p>" +
          esc(brief.season.narrative) +
          "</p>" +
          "<label>Demo season hint <select id=\"st-adv-season\">" +
          '<option value="">Auto-detect</option>' +
          (seasonsDoc.seasons || [])
            .map(function (s) {
              return (
                '<option value="' +
                esc(s.id) +
                '"' +
                (state.seasonHint === s.id ? " selected" : "") +
                ">" +
                esc(s.label) +
                "</option>"
              );
            })
            .join("") +
          "</select></label></section>" +
          '<section class="st-advisor-panel">' +
          "<h2>Personalized daily advisor</h2>" +
          "<p>Estimated review time: <strong>" +
          esc(String(brief.estimatedReviewMinutes)) +
          " minutes</strong></p>" +
          "<h3>Three important changes</h3><ol>" +
          brief.changes
            .map(function (c) {
              return "<li>" + esc(c) + "</li>";
            })
            .join("") +
          "</ol>" +
          "<h3>Three recommended actions</h3><ol>" +
          brief.actions
            .map(function (a) {
              return (
                "<li><strong>" +
                esc(a.title) +
                "</strong> (" +
                esc(a.priority) +
                ")<p>" +
                esc(a.action) +
                "</p>" +
                (a.explainability
                  ? "<details><summary>Why am I seeing this?</summary>" +
                    "<p>" +
                    esc(a.explainability.whySeeingThis) +
                    "</p>" +
                    "<p><strong>Technologies:</strong> " +
                    esc((a.explainability.technologies || []).join(", ")) +
                    "</p>" +
                    "<p><strong>Sources:</strong> " +
                    esc((a.explainability.sources || []).join("; ")) +
                    "</p>" +
                    "<p><strong>Confidence:</strong> " +
                    esc(a.explainability.confidence) +
                    "</p>" +
                    "<p><strong>Assumptions:</strong> " +
                    esc((a.explainability.assumptions || []).join(" · ")) +
                    "</p>" +
                    "<p><strong>Missing:</strong> " +
                    esc((a.explainability.missing || []).join(" · ")) +
                    "</p>" +
                    "<p><strong>Facts:</strong> " +
                    esc((a.explainability.facts || []).join(" · ")) +
                    "</p>" +
                    "<p><strong>Inferences:</strong> " +
                    esc((a.explainability.inferences || []).join(" · ")) +
                    "</p></details>"
                  : "") +
                "</li>"
              );
            })
            .join("") +
          "</ol>" +
          "<h3>Items safe to ignore (for now)</h3><ul>" +
          (brief.safeToIgnore.length
            ? brief.safeToIgnore
                .map(function (s) {
                  return (
                    "<li><strong>" +
                    esc(s.title) +
                    "</strong><p class=\"st-muted\">" +
                    esc(s.reason) +
                    "</p></li>"
                  );
                })
                .join("")
            : "<li class=\"st-muted\">None listed — inventory may already cover teaching cases.</li>") +
          "</ul>" +
          "<h3>Learning opportunity</h3><p><strong>" +
          esc(brief.learning.title) +
          "</strong> — " +
          esc(brief.learning.summary) +
          "</p></section>" +
          '<section class="st-advisor-panel">' +
          "<h2>What changed?</h2><p>" +
          esc(brief.whatChanged.summary) +
          "</p>" +
          "<ul>" +
          "<li>New risks: " +
          esc((brief.whatChanged.newRisks || []).join(", ") || "—") +
          "</li>" +
          "<li>Resolved: " +
          esc((brief.whatChanged.resolvedIssues || []).join(", ") || "—") +
          "</li>" +
          "<li>New patches/mitigations: " +
          esc((brief.whatChanged.newPatches || []).join(", ") || "—") +
          "</li>" +
          "<li>Retired advisories: " +
          esc((brief.whatChanged.retiredAdvisories || []).join(", ") || "—") +
          "</li></ul></section>" +
          '<section class="st-advisor-panel">' +
          "<h2>Exposure analysis</h2>" +
          matchedListHtml(brief.exposures) +
          "</section>" +
          '<section class="st-advisor-panel">' +
          "<h2>Defense posture</h2><ul class=\"st-cyber-list\">" +
          brief.posture
            .map(function (p) {
              return (
                "<li><strong>" +
                esc(p.label) +
                "</strong> <span class=\"st-muted\">conf " +
                esc(p.confidence) +
                "</span><p>" +
                esc(p.status) +
                "</p><p>Gaps: " +
                esc((p.knownGaps || []).join("; ")) +
                "</p><p>Improve: " +
                esc((p.recommendedImprovements || []).join("; ")) +
                "</p></li>"
              );
            })
            .join("") +
          "</ul></section>" +
          '<section class="st-advisor-panel">' +
          "<h2>Simulation (architecture only)</h2>" +
          "<p class=\"st-muted\">Future what-if questions are designed — V1 refuses unsupported predictions.</p>" +
          '<button type="button" class="st-chip" id="st-adv-sim">Try “What changes if I patch today?” stub</button>' +
          '<pre id="st-adv-sim-out" class="st-muted"></pre></section>' +
          "</div>";

        document.getElementById("st-adv-save-profile").addEventListener("click", function () {
          var envs = [];
          root.querySelectorAll("[data-env]").forEach(function (cb) {
            if (cb.checked) envs.push(cb.getAttribute("data-env"));
          });
          if (!envs.length) envs = ["home-user"];
          saveProfile({
            id: profile.id || "spf_local",
            label: profile.label || "Local profile",
            environments: envs,
            riskTolerance: document.getElementById("st-adv-risk").value,
            industry: profile.industry || "software",
            region: profile.region || "global",
            notes: profile.notes || "",
            updatedAt: new Date().toISOString()
          });
          paint();
        });
        document.getElementById("st-adv-load-inv").addEventListener("click", function () {
          state.inventorySample = document.getElementById("st-adv-inv-sample").value;
          Inv.loadSample(
            state.inventorySample === "home-user" ? invHome.items : invDev.items
          );
          paint();
        });
        document.getElementById("st-adv-season").addEventListener("change", function (ev) {
          state.seasonHint = ev.target.value;
          paint();
        });
        document.getElementById("st-adv-sim").addEventListener("click", function () {
          var out = simulateDefensiveChange(
            "sim_patch_today",
            { inventoryItemId: inv[0] && inv[0].id, patchEntityId: "cy_patch-log4j" },
            { graph: graph, inventory: inv, profile: profile }
          );
          document.getElementById("st-adv-sim-out").textContent = JSON.stringify(out, null, 2);
        });

        root.removeAttribute("aria-busy");
      }

      function matchedListHtml(exposures) {
        var rows = (exposures || []).filter(function (e) {
          return e.match && e.match.status !== "unlikely";
        });
        if (!rows.length) {
          return '<p class="st-muted">No inventory-linked exposures in this run.</p>';
        }
        return (
          "<ul class=\"st-cyber-list\">" +
          rows
            .map(function (e) {
              return (
                "<li><strong>" +
                esc(e.intelligenceTitle) +
                "</strong> ↔ " +
                esc(e.inventoryName) +
                ' <span class="st-badge">' +
                esc(e.match.status) +
                " · " +
                esc(e.match.method) +
                "</span>" +
                "<p>" +
                esc((e.explanation.mattersBecause || [])[0] || "") +
                "</p>" +
                (e.explanation.probablyDoesNotAffectBecause &&
                e.explanation.probablyDoesNotAffectBecause[0]
                  ? "<p class=\"st-muted\">" +
                    esc(e.explanation.probablyDoesNotAffectBecause[0]) +
                    "</p>"
                  : "") +
                (e.priority
                  ? "<details><summary>Priority contributions</summary><ul>" +
                    (e.priority.contributions || [])
                      .map(function (c) {
                        return (
                          "<li>" +
                          esc(c.factorId) +
                          " +" +
                          esc(String(c.points)) +
                          " — " +
                          esc(c.reason) +
                          "</li>"
                        );
                      })
                      .join("") +
                    "</ul></details>"
                  : "") +
                "</li>"
              );
            })
            .join("") +
          "</ul>"
        );
      }

      paint();
      return state.brief;
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.signalTerrainCyberAdvisor = {
    analyzeExposure: analyzeExposure,
    generateRecommendations: generateRecommendations,
    assessPosture: assessPosture,
    detectSeason: detectSeason,
    generateDailyAdvisor: generateDailyAdvisor,
    diffSnapshots: diffSnapshots,
    explainRecommendation: explainRecommendation,
    simulateDefensiveChange: simulateDefensiveChange,
    loadProfile: loadProfile,
    saveProfile: saveProfile,
    loadSnapshot: loadSnapshot,
    saveSnapshot: saveSnapshot,
    mountAdvisor: mountAdvisor,
    PROFILE_KEY: PROFILE_KEY,
    SNAPSHOT_KEY: SNAPSHOT_KEY
  };
})(typeof window !== "undefined" ? window : globalThis);
