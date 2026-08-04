/**
 * Waypoint Scenes — Portfolio Health · Analysis engine
 *
 * Deterministic, UI-free, versioned pipeline:
 * collect → normalize → coverage → concentration → underrepresentation →
 * repetition → metadata → purpose → strength → opportunities → confidence.
 *
 * Never invents subjects/seasons/locations. Never emits a universal score.
 */
(function (global) {
  "use strict";

  function Catalog() {
    return global.WaypointScenesHealthCatalog;
  }
  function Signals() {
    return global.WaypointScenesAssistantSignals;
  }
  function Recommend() {
    return global.WaypointScenesAssistantRecommend;
  }

  function pct(part, whole) {
    if (!whole) return 0;
    return Math.round((part / whole) * 100);
  }

  function sortEntries(map) {
    return Object.keys(map)
      .map(function (k) {
        return { key: k, count: map[k] };
      })
      .sort(function (a, b) {
        return b.count - a.count || a.key.localeCompare(b.key);
      });
  }

  function bucketCount(items, keyFn) {
    var map = Object.create(null);
    var idsByKey = Object.create(null);
    (items || []).forEach(function (it) {
      var k = keyFn(it);
      if (k == null || k === "") return;
      map[k] = (map[k] || 0) + 1;
      (idsByKey[k] = idsByKey[k] || []).push(it.id);
    });
    return { map: map, idsByKey: idsByKey, entries: sortEntries(map) };
  }

  function insightId(category, dimension, key) {
    return [category, dimension || "-", key || "-"].join("::");
  }

  function makeInsight(partial) {
    var Cat = Catalog();
    var observation = partial.observation || "";
    if (Cat.containsBanned(observation) || Cat.containsBanned(partial.title) || Cat.containsBanned(partial.whyItMayMatter)) {
      throw new Error("Banned health language: " + (partial.title || observation));
    }
    return {
      id: partial.id || insightId(partial.category, partial.dimension, partial.key),
      category: partial.category,
      dimension: partial.dimension || null,
      title: partial.title,
      observation: observation,
      whyItMayMatter: partial.whyItMayMatter || "This is information about the shape of your work — not a requirement.",
      comparisonBasis: partial.comparisonBasis || "portfolio-internal",
      confidence: partial.confidence || "moderate",
      evidence: Array.isArray(partial.evidence) ? partial.evidence.slice() : [],
      affectedImageIds: Array.isArray(partial.affectedImageIds) ? partial.affectedImageIds.slice() : [],
      suggestedActions: Array.isArray(partial.suggestedActions) ? partial.suggestedActions.slice() : [],
      analysisVersion: Cat.ANALYSIS_VERSION,
      fingerprint: partial.fingerprint || null,
      dismissed: false,
      saved: false,
      notRelevant: false,
      intentionalRepetition: false,
      note: null
    };
  }

  function roleFromItem(item, portfolio, index) {
    if (!item) return null;
    if (item.role) return item.role;
    var rationale = String(item.selectionRationale || item.notes || "").toLowerCase();
    var roles = ["opening", "hero", "supporting", "environmental", "detail", "transition", "cover-candidate", "closing", "alternate"];
    for (var i = 0; i < roles.length; i++) {
      if (rationale.indexOf(roles[i].replace("-", " ")) >= 0 || rationale.indexOf(roles[i]) >= 0) return roles[i];
    }
    if (portfolio && portfolio.coverImageId && item.imageId === portfolio.coverImageId) return "cover-candidate";
    if (index === 0) return null; // don't invent opening
    return null;
  }

  /**
   * Normalize one image + optional portfolio membership into an analysis row.
   */
  function normalizeImage(img, membership) {
    var Sig = Signals();
    var Cat = Catalog();
    var s = Sig.collectSignals(img);
    if (!s) return null;
    var season = Cat.seasonFromCapture(img.captureDate);
    var tod = Cat.timeOfDayFromCapture(img.captureDate);
    var focal = s.camera && s.camera.focalLengthMm != null ? s.camera.focalLengthMm : null;
    var focalBucket = null;
    if (focal != null && isFinite(Number(focal))) {
      var f = Number(focal);
      if (f < 35) focalBucket = "wide";
      else if (f <= 70) focalBucket = "standard";
      else focalBucket = "telephoto";
    }
    var subjects = [];
    (s.tags || []).forEach(function (t) {
      if (t && subjects.indexOf(String(t).toLowerCase()) < 0) subjects.push(String(t).toLowerCase());
    });
    (s.subjectHints || []).forEach(function (t) {
      if (t && subjects.indexOf(String(t).toLowerCase()) < 0) subjects.push(String(t).toLowerCase());
    });
    var gps = img.gps && img.gps.lat != null && img.gps.lon != null
      ? { lat: img.gps.lat, lon: img.gps.lon }
      : null;
    var shootId = (s.coach && s.coach.shootId) || (img.moduleRefs && img.moduleRefs.photoCoach && img.moduleRefs.photoCoach.shootId) || null;

    return {
      id: img.id,
      signals: s,
      subjects: subjects,
      season: season,
      timeOfDay: tod,
      orientation: s.aspect,
      focalBucket: focalBucket,
      lens: s.camera && s.camera.lens ? String(s.camera.lens) : null,
      cameraModel: s.camera && (s.camera.model || s.camera.make)
        ? String(s.camera.model || s.camera.make)
        : null,
      gps: gps,
      shootId: shootId,
      collectionIds: s.collectionIds || [],
      role: membership && membership.role ? membership.role : null,
      inPortfolio: !!(membership && membership.inPortfolio),
      missingMedia: !!s.missingMedia,
      stale: !!(membership && membership.stale),
      favorite: !!s.favorite,
      selectionLabel: s.selectionLabel,
      rating: s.rating,
      coachAnalyzed: !!(s.coach && s.coach.analyzed),
      hasCaptureDate: s.captureTime != null,
      hasCamera: !!s.camera,
      hasFocal: focal != null,
      hasLens: !!(s.camera && s.camera.lens),
      hasGps: !!gps,
      hasSubject: subjects.length > 0,
      hasOrientation: !!s.aspect,
      width: img.width != null ? img.width : null,
      height: img.height != null ? img.height : null
    };
  }

  function collectScope(input) {
    input = input || {};
    var Cat = Catalog();
    var portfolios = Array.isArray(input.portfolios) ? input.portfolios : [];
    var libraryImages = Array.isArray(input.libraryImages) ? input.libraryImages : [];
    var byId = Object.create(null);
    libraryImages.forEach(function (img) {
      byId[img.id] = img;
    });

    var scope = input.scope || "one"; // one | multiple | all | library
    var selectedIds = Array.isArray(input.portfolioIds) ? input.portfolioIds.slice() : [];
    if (scope === "all") {
      selectedIds = portfolios.map(function (p) {
        return p.id;
      });
    }
    var selectedPortfolios = portfolios.filter(function (p) {
      return selectedIds.indexOf(p.id) >= 0;
    });

    var portfolioImageIds = [];
    var membership = Object.create(null);
    var staleIds = [];
    selectedPortfolios.forEach(function (p) {
      (p.imageIds || []).forEach(function (id, index) {
        if (portfolioImageIds.indexOf(id) < 0) portfolioImageIds.push(id);
        var item = (p.items || []).filter(function (it) {
          return it.imageId === id;
        })[0];
        var role = roleFromItem(item, p, index);
        var stale = !byId[id];
        if (stale) staleIds.push(id);
        membership[id] = {
          inPortfolio: true,
          role: role,
          stale: stale,
          portfolioIds: ((membership[id] && membership[id].portfolioIds) || []).concat([p.id])
        };
      });
    });

    var truncatedPortfolio = false;
    if (portfolioImageIds.length > Cat.MAX_PORTFOLIO_IMAGES) {
      portfolioImageIds = portfolioImageIds.slice(0, Cat.MAX_PORTFOLIO_IMAGES);
      truncatedPortfolio = true;
    }

    var rows = [];
    portfolioImageIds.forEach(function (id) {
      var img = byId[id];
      if (!img) {
        rows.push({
          id: id,
          stale: true,
          inPortfolio: true,
          missingMedia: true,
          subjects: [],
          signals: null
        });
        return;
      }
      rows.push(normalizeImage(img, membership[id]));
    });

    var libraryRows = [];
    var libSlice = libraryImages;
    var truncatedLibrary = false;
    if (libSlice.length > Cat.MAX_LIBRARY_COMPARE) {
      libSlice = libSlice.slice(0, Cat.MAX_LIBRARY_COMPARE);
      truncatedLibrary = true;
    }
    libSlice.forEach(function (img) {
      libraryRows.push(normalizeImage(img, membership[img.id] || { inPortfolio: false }));
    });

    var assistantSessions = Array.isArray(input.assistantSessions) ? input.assistantSessions : [];
    var coachSessions = Array.isArray(input.coachSessions) ? input.coachSessions : [];
    var builderSessions = Array.isArray(input.builderSessions) ? input.builderSessions : [];
    var enabledDimensions = Array.isArray(input.enabledDimensions)
      ? input.enabledDimensions.slice()
      : Catalog().DIMENSIONS.map(function (d) {
          return d.id;
        });
    var excludeIncomplete = !!input.excludeIncompleteMetadataDimensions;

    return {
      scope: scope,
      portfolios: selectedPortfolios,
      portfolioIds: selectedIds,
      rows: rows,
      libraryRows: libraryRows,
      staleIds: staleIds,
      truncatedPortfolio: truncatedPortfolio,
      truncatedLibrary: truncatedLibrary,
      assistantSessions: assistantSessions,
      coachSessions: coachSessions,
      builderSessions: builderSessions,
      enabledDimensions: enabledDimensions,
      excludeIncomplete: excludeIncomplete,
      libraryTotal: libraryImages.length
    };
  }

  function signalCoverage(ctx) {
    var n = ctx.rows.length || 1;
    function rate(pred) {
      var c = 0;
      ctx.rows.forEach(function (r) {
        if (pred(r)) c++;
      });
      return { count: c, of: ctx.rows.length, pct: pct(c, ctx.rows.length) };
    }
    return {
      captureDate: rate(function (r) {
        return r.hasCaptureDate;
      }),
      orientation: rate(function (r) {
        return r.hasOrientation;
      }),
      subject: rate(function (r) {
        return r.hasSubject;
      }),
      camera: rate(function (r) {
        return r.hasCamera;
      }),
      lens: rate(function (r) {
        return r.hasLens;
      }),
      focal: rate(function (r) {
        return r.hasFocal;
      }),
      gps: rate(function (r) {
        return r.hasGps;
      }),
      coach: rate(function (r) {
        return r.coachAnalyzed;
      }),
      role: rate(function (r) {
        return !!r.role;
      }),
      missingMedia: rate(function (r) {
        return r.missingMedia || r.stale;
      }),
      imageCount: ctx.rows.length,
      portfolioCount: ctx.portfolios.length,
      libraryCompareCount: ctx.libraryRows.length,
      libraryTotal: ctx.libraryTotal
    };
  }

  function dimEnabled(ctx, id, coverageOk) {
    if (ctx.enabledDimensions.indexOf(id) < 0) return false;
    if (ctx.excludeIncomplete && !coverageOk) return false;
    return true;
  }

  function buildConcentration(ctx, coverage) {
    var out = [];
    var live = ctx.rows.filter(function (r) {
      return !r.stale;
    });
    if (live.length < 2) return out;

    function addDominant(dimension, label, bucket, minShare, minCount) {
      if (!bucket.entries.length) return;
      var top = bucket.entries[0];
      var share = pct(top.count, live.length);
      if (top.count < (minCount || 2) || share < (minShare || 40)) return;
      var ids = bucket.idsByKey[top.key] || [];
      out.push(
        makeInsight({
          category: "concentration",
          dimension: dimension,
          key: top.key,
          title: label + " concentration",
          observation:
            "Your current portfolio leans heavily toward " +
            top.key +
            " (" +
            top.count +
            " of " +
            live.length +
            ", " +
            share +
            "%).",
          whyItMayMatter:
            "This may be a deliberate style. Review it only if you want a broader range. This pattern may be intentional.",
          comparisonBasis: "portfolio-internal",
          confidence: share >= 60 && coverageOkShare(dimension) ? "higher" : "moderate",
          evidence: [
            { signal: dimension, label: label, value: top.key + " × " + top.count },
            { signal: "share", label: "Share of portfolio", value: share + "%" }
          ],
          affectedImageIds: ids,
          suggestedActions: ["open-affected", "mark-intentional", "save", "dismiss"],
          fingerprint: dimension + ":" + top.key + ":" + top.count
        })
      );
    }

    function coverageOkShare(dim) {
      if (dim === "subject") return coverage.subject.pct >= 50;
      if (dim === "season" || dim === "time-of-day" || dim === "date-range") return coverage.captureDate.pct >= 50;
      if (dim === "orientation") return coverage.orientation.pct >= 50;
      if (dim === "camera") return coverage.camera.pct >= 40;
      if (dim === "lens") return coverage.lens.pct >= 40;
      if (dim === "focal") return coverage.focal.pct >= 40;
      if (dim === "location") return coverage.gps.pct >= 40;
      if (dim === "role") return coverage.role.pct >= 40;
      return true;
    }

    if (dimEnabled(ctx, "subject", coverage.subject.pct >= 30)) {
      var subj = bucketCount(live, function (r) {
        return r.subjects[0] || null;
      });
      // Also count multi-tag frequency for dominant tag across all
      var tagMap = Object.create(null);
      var tagIds = Object.create(null);
      live.forEach(function (r) {
        r.subjects.forEach(function (t) {
          tagMap[t] = (tagMap[t] || 0) + 1;
          (tagIds[t] = tagIds[t] || []).push(r.id);
        });
      });
      var tagEntries = sortEntries(tagMap);
      if (tagEntries.length) {
        subj = { map: tagMap, idsByKey: tagIds, entries: tagEntries };
      }
      addDominant("subject", "Subject", subj, 35, 2);
    }

    if (dimEnabled(ctx, "season", coverage.captureDate.pct >= 30)) {
      addDominant(
        "season",
        "Season",
        bucketCount(live, function (r) {
          return r.season;
        }),
        40,
        2
      );
    }

    if (dimEnabled(ctx, "orientation", coverage.orientation.pct >= 30)) {
      addDominant(
        "orientation",
        "Orientation",
        bucketCount(live, function (r) {
          return r.orientation;
        }),
        55,
        2
      );
    }

    if (dimEnabled(ctx, "time-of-day", coverage.captureDate.pct >= 30)) {
      addDominant(
        "time-of-day",
        "Time of day",
        bucketCount(live, function (r) {
          return r.timeOfDay;
        }),
        45,
        2
      );
    }

    if (dimEnabled(ctx, "role", coverage.role.pct >= 20)) {
      addDominant(
        "role",
        "Role",
        bucketCount(live, function (r) {
          return r.role;
        }),
        40,
        2
      );
    }

    if (dimEnabled(ctx, "camera", coverage.camera.pct >= 20)) {
      addDominant(
        "camera",
        "Camera",
        bucketCount(live, function (r) {
          return r.cameraModel;
        }),
        50,
        2
      );
    }

    if (dimEnabled(ctx, "lens", coverage.lens.pct >= 20)) {
      addDominant(
        "lens",
        "Lens",
        bucketCount(live, function (r) {
          return r.lens;
        }),
        50,
        2
      );
    }

    if (dimEnabled(ctx, "focal", coverage.focal.pct >= 20)) {
      addDominant(
        "focal",
        "Focal range",
        bucketCount(live, function (r) {
          return r.focalBucket;
        }),
        50,
        2
      );
    }

    if (dimEnabled(ctx, "shoot", true)) {
      addDominant(
        "shoot",
        "Shoot",
        bucketCount(live, function (r) {
          return r.shootId;
        }),
        40,
        2
      );
    }

    if (dimEnabled(ctx, "collection", true)) {
      var colMap = Object.create(null);
      var colIds = Object.create(null);
      live.forEach(function (r) {
        (r.collectionIds || []).forEach(function (cid) {
          colMap[cid] = (colMap[cid] || 0) + 1;
          (colIds[cid] = colIds[cid] || []).push(r.id);
        });
      });
      addDominant("collection", "Collection", { map: colMap, idsByKey: colIds, entries: sortEntries(colMap) }, 40, 2);
    }

    if (dimEnabled(ctx, "location", coverage.gps.pct >= 20)) {
      // Coarse location buckets only when GPS exists — never invent places
      addDominant(
        "location",
        "Location cluster",
        bucketCount(live, function (r) {
          if (!r.gps) return null;
          return r.gps.lat.toFixed(1) + "," + r.gps.lon.toFixed(1);
        }),
        40,
        2
      );
    }

    return out;
  }

  function buildUnderrepresentation(ctx, coverage) {
    var out = [];
    var live = ctx.rows.filter(function (r) {
      return !r.stale;
    });
    var lib = ctx.libraryRows || [];
    if (live.length < 1 || lib.length < 3) return out;

    function compareBuckets(dimension, label, keyFn, minLib, coverageOk) {
      if (!dimEnabled(ctx, dimension, coverageOk)) return;
      var port = bucketCount(live, keyFn);
      var library = bucketCount(lib, keyFn);
      library.entries.forEach(function (e) {
        if (e.count < (minLib || 3)) return;
        var inPort = port.map[e.key] || 0;
        if (inPort > 0) return;
        var libIds = library.idsByKey[e.key] || [];
        out.push(
          makeInsight({
            category: "underrepresentation",
            dimension: dimension,
            key: e.key,
            title: "Fewer images representing " + e.key,
            observation:
              "You have fewer images representing " +
              e.key +
              " in this portfolio. Your library contains " +
              e.count +
              " with this signal, but none are included here.",
            whyItMayMatter:
              "This is an opportunity, not a requirement. Include them only if they serve your purpose.",
            comparisonBasis: "library-vs-portfolio",
            confidence: e.count >= 6 && coverageOk ? "higher" : "moderate",
            evidence: [
              { signal: "library-count", label: "In your library", value: String(e.count) },
              { signal: "portfolio-count", label: "In this portfolio", value: "0" },
              { signal: dimension, label: label, value: e.key }
            ],
            affectedImageIds: libIds.slice(0, 12),
            suggestedActions: ["open-affected", "send-builder", "save", "dismiss", "not-relevant"],
            fingerprint: "under:" + dimension + ":" + e.key + ":" + e.count
          })
        );
      });
    }

    compareBuckets(
      "season",
      "Season",
      function (r) {
        return r.season;
      },
      3,
      coverage.captureDate.pct >= 20 || lib.filter(function (r) {
        return r.hasCaptureDate;
      }).length >= 3
    );

    compareBuckets(
      "orientation",
      "Orientation",
      function (r) {
        return r.orientation;
      },
      3,
      true
    );

    compareBuckets(
      "subject",
      "Subject",
      function (r) {
        return r.subjects[0] || null;
      },
      3,
      true
    );

    // Purpose-linked soft underrepresentation (roles)
    var purposeText =
      (ctx.portfolios[0] && (ctx.portfolios[0].purpose || ctx.portfolios[0].description)) || null;
    var note = Catalog().purposeNote(purposeText);
    if (note && note.id === "hiking-outdoor-journal") {
      var envCount = live.filter(function (r) {
        return r.role === "environmental" || r.subjects.some(function (t) {
          return /trail|alpine|ridge|forest|outdoor|hike/.test(t);
        });
      }).length;
      if (envCount === 0 && live.length >= 3) {
        out.push(
          makeInsight({
            category: "underrepresentation",
            dimension: "role",
            key: "environmental",
            title: "Few environmental views in this hiking journal",
            observation:
              "You have fewer images representing environmental or trail context in this hiking / outdoor journal portfolio, based on roles and tags that are present.",
            whyItMayMatter:
              "This is an opportunity, not a requirement. Environmental frames can help a journal read as a place — only if you want that.",
            comparisonBasis: "purpose-signals",
            confidence: "lower",
            evidence: [
              { signal: "purpose", label: "Purpose", value: note.id },
              { signal: "environmental-count", label: "Environmental / trail-tagged in portfolio", value: "0" }
            ],
            affectedImageIds: [],
            suggestedActions: ["send-builder", "dismiss", "not-relevant"],
            fingerprint: "under:purpose:environmental"
          })
        );
      }
    }

    if (note && (note.id === "photography-website" || note.id === "gallery-presentation")) {
      var hasClosing = live.some(function (r) {
        return r.role === "closing";
      });
      var hasCover = ctx.portfolios.some(function (p) {
        return !!p.coverImageId;
      });
      if (!hasClosing && coverage.role.pct >= 20) {
        out.push(
          makeInsight({
            category: "underrepresentation",
            dimension: "role",
            key: "closing",
            title: "No clear closing image recorded",
            observation:
              "You have fewer images representing a closing role in this portfolio — no frame currently carries a closing role note.",
            whyItMayMatter:
              "This pattern may be intentional. Add a closing role only if it helps your presentation.",
            comparisonBasis: "purpose-signals",
            confidence: "lower",
            evidence: [{ signal: "role", label: "Closing roles", value: "0" }],
            affectedImageIds: [],
            suggestedActions: ["send-builder", "dismiss"],
            fingerprint: "under:role:closing"
          })
        );
      }
      if (!hasCover) {
        out.push(
          makeInsight({
            category: "underrepresentation",
            dimension: "role",
            key: "cover",
            title: "No cover assignment yet",
            observation: "This portfolio does not have a cover image assigned yet.",
            whyItMayMatter: "A cover is optional. Assign one when you know which frame should introduce the set.",
            comparisonBasis: "purpose-signals",
            confidence: "higher",
            evidence: [{ signal: "coverImageId", label: "Cover", value: "none" }],
            affectedImageIds: [],
            suggestedActions: ["open-portfolio", "dismiss"],
            fingerprint: "under:cover:none"
          })
        );
      }
    }

    return out;
  }

  function buildRepetition(ctx) {
    var out = [];
    if (!Recommend() || !Signals()) return out;
    var liveImgs = [];
    var byId = Object.create(null);
    ctx.rows.forEach(function (r) {
      if (r.stale || !r.signals) return;
      byId[r.id] = r;
      liveImgs.push(r.signals);
    });
    if (liveImgs.length < 2) return out;

    var groups = Recommend().buildGroups(liveImgs);
    groups.forEach(function (g) {
      if (!g.imageIds || g.imageIds.length < 2) return;
      var kindLabel =
        g.kind === "duplicate"
          ? "Near-duplicate cluster"
          : g.kind === "burst"
            ? "Burst group"
            : "Similar-frame group";
      out.push(
        makeInsight({
          category: "repetition",
          dimension: "similar-group",
          key: g.id,
          title: kindLabel,
          observation:
            g.imageIds.length +
            " selected images belong to the same " +
            (g.kind || "similar") +
            " group. " +
            (g.reason || "They share similarity signals already used by Portfolio Assistant."),
          whyItMayMatter:
            "This pattern may be intentional. You can keep all, choose a representative, or compare in Portfolio Coach.",
          comparisonBasis: "portfolio-internal",
          confidence: g.strength === "exact" ? "higher" : g.kind === "burst" ? "moderate" : "lower",
          evidence: [
            { signal: "group-kind", label: "Group kind", value: g.kind || "similar" },
            { signal: "group-strength", label: "Strength", value: g.strength || "metadata" },
            { signal: "count", label: "Frames in group", value: String(g.imageIds.length) }
          ],
          affectedImageIds: g.imageIds.slice(),
          suggestedActions: [
            "open-affected",
            "compare-coach",
            "mark-intentional",
            "choose-representative",
            "send-builder",
            "remove-with-confirm",
            "save",
            "dismiss"
          ],
          fingerprint: "rep:" + g.kind + ":" + g.imageIds.slice().sort().join(",")
        })
      );
    });

    // Consecutive similar in portfolio order
    var order = [];
    ctx.portfolios.forEach(function (p) {
      (p.imageIds || []).forEach(function (id) {
        if (order.indexOf(id) < 0) order.push(id);
      });
    });
    var groupOf = Object.create(null);
    groups.forEach(function (g) {
      g.imageIds.forEach(function (id) {
        groupOf[id] = g.id;
      });
    });
    for (var i = 0; i < order.length - 1; i++) {
      var a = order[i];
      var b = order[i + 1];
      if (groupOf[a] && groupOf[a] === groupOf[b]) {
        out.push(
          makeInsight({
            category: "repetition",
            dimension: "similar-group",
            key: "consec-" + groupOf[a],
            title: "Consecutive similar images",
            observation:
              "Two consecutive images in your current order belong to the same similar-frame group. This portfolio emphasizes similar frames next to each other.",
            whyItMayMatter:
              "This may be intentional pacing. Consider reviewing only if you want more breathing room.",
            comparisonBasis: "portfolio-internal",
            confidence: "moderate",
            evidence: [
              { signal: "order-index", label: "Positions", value: i + 1 + "–" + (i + 2) },
              { signal: "group", label: "Group", value: groupOf[a] }
            ],
            affectedImageIds: [a, b],
            suggestedActions: ["open-affected", "compare-coach", "mark-intentional", "dismiss"],
            fingerprint: "rep:consec:" + groupOf[a] + ":" + a + ":" + b
          })
        );
        break; // one consecutive insight is enough
      }
    }

    // Repeated roles
    var roleBucket = bucketCount(
      ctx.rows.filter(function (r) {
        return r.role;
      }),
      function (r) {
        return r.role;
      }
    );
    roleBucket.entries.forEach(function (e) {
      if (e.count < 3) return;
      if (e.key === "supporting" || e.key === "alternate") return; // supporting naturally repeats
      out.push(
        makeInsight({
          category: "repetition",
          dimension: "role",
          key: e.key,
          title: "Repeated " + e.key + " roles",
          observation:
            "Multiple images (" + e.count + ") carry the same " + e.key + " role in this portfolio.",
          whyItMayMatter: "This pattern may be intentional. Review roles only if you want clearer differentiation.",
          comparisonBasis: "portfolio-internal",
          confidence: "lower",
          evidence: [{ signal: "role", label: "Role", value: e.key + " × " + e.count }],
          affectedImageIds: roleBucket.idsByKey[e.key] || [],
          suggestedActions: ["open-affected", "mark-intentional", "dismiss"],
          fingerprint: "rep:role:" + e.key + ":" + e.count
        })
      );
    });

    return out;
  }

  function buildMetadata(ctx, coverage) {
    var out = [];
    var n = ctx.rows.length;
    if (!n) {
      out.push(
        makeInsight({
          category: "metadata",
          dimension: "coverage",
          key: "empty",
          title: "No images to summarize metadata for",
          observation: "This portfolio has no images yet, so metadata coverage cannot be summarized.",
          whyItMayMatter: "Metadata coverage is about labels and EXIF presence — not photographic quality.",
          comparisonBasis: "portfolio-internal",
          confidence: "higher",
          evidence: [],
          affectedImageIds: [],
          suggestedActions: ["dismiss"],
          fingerprint: "meta:empty"
        })
      );
      return out;
    }

    function coverageInsight(key, label, cov, note) {
      out.push(
        makeInsight({
          category: "metadata",
          dimension: key,
          key: key,
          title: label + " coverage",
          observation:
            label +
            " is present on " +
            cov.count +
            " of " +
            cov.of +
            " portfolio images (" +
            cov.pct +
            "%). " +
            (note || "Metadata is incomplete, so related observations have lower confidence.") +
            " Metadata coverage is not photography quality.",
          whyItMayMatter:
            "Use this to decide whether to repair labels or EXIF — not as a judgment of your photographs.",
          comparisonBasis: "portfolio-internal",
          confidence: cov.pct >= 70 ? "higher" : cov.pct >= 30 ? "moderate" : "lower",
          evidence: [
            { signal: key, label: label + " present", value: cov.count + " / " + cov.of },
            { signal: "distinction", label: "Note", value: "Metadata ≠ photo quality" }
          ],
          affectedImageIds: ctx.rows
            .filter(function (r) {
              if (key === "captureDate") return !r.hasCaptureDate;
              if (key === "subject") return !r.hasSubject;
              if (key === "camera") return !r.hasCamera;
              if (key === "gps") return !r.hasGps;
              if (key === "orientation") return !r.hasOrientation;
              return false;
            })
            .map(function (r) {
              return r.id;
            }),
          suggestedActions: ["open-affected", "save", "dismiss"],
          fingerprint: "meta:" + key + ":" + cov.count + "/" + cov.of
        })
      );
    }

    coverageInsight("captureDate", "Capture date", coverage.captureDate);
    coverageInsight("subject", "Subject labels", coverage.subject);
    coverageInsight("camera", "Camera metadata", coverage.camera);
    coverageInsight("orientation", "Orientation / dimensions", coverage.orientation);
    if (coverage.gps.pct === 0) {
      out.push(
        makeInsight({
          category: "metadata",
          dimension: "location",
          key: "gps-absent",
          title: "Location metadata unavailable",
          observation:
            "Location (GPS) metadata is not present on these portfolio images. Location concentration and underrepresentation are unavailable — places are never invented.",
          whyItMayMatter: "Metadata is incomplete, so this observation has lower confidence for location questions.",
          comparisonBasis: "portfolio-internal",
          confidence: "higher",
          evidence: [{ signal: "gps", label: "GPS present", value: "0 / " + n }],
          affectedImageIds: [],
          suggestedActions: ["dismiss"],
          fingerprint: "meta:gps:0"
        })
      );
    } else {
      coverageInsight("gps", "Location (GPS)", coverage.gps);
    }

    if (coverage.missingMedia.count > 0 || ctx.staleIds.length) {
      var missingIds = ctx.rows
        .filter(function (r) {
          return r.missingMedia || r.stale;
        })
        .map(function (r) {
          return r.id;
        });
      out.push(
        makeInsight({
          category: "metadata",
          dimension: "missing-refs",
          key: "missing",
          title: "Missing files or stale references",
          observation:
            (missingIds.length || ctx.staleIds.length) +
            " portfolio reference" +
            (missingIds.length === 1 ? "" : "s") +
            " point to missing media or ids no longer in your library index.",
          whyItMayMatter:
            "This is a catalog integrity note — not a quality score. Review references when you have time.",
          comparisonBasis: "portfolio-internal",
          confidence: "higher",
          evidence: [
            { signal: "stale", label: "Stale ids", value: String(ctx.staleIds.length) },
            { signal: "missingMedia", label: "Missing media rows", value: String(coverage.missingMedia.count) }
          ],
          affectedImageIds: missingIds,
          suggestedActions: ["open-affected", "remove-with-confirm", "dismiss"],
          fingerprint: "meta:missing:" + missingIds.length
        })
      );
    }

    out.push(
      makeInsight({
        category: "metadata",
        dimension: "coach",
        key: "photo-coach",
        title: "Photo Coach analysis coverage",
        observation:
          "Photo Coach analysis is present on " +
          coverage.coach.count +
          " of " +
          coverage.coach.of +
          " portfolio images. Soft coach signals are assistive only.",
        whyItMayMatter: "Coach coverage affects strength-pattern confidence — never a universal grade for the portfolio.",
        comparisonBasis: "portfolio-internal",
        confidence: "moderate",
        evidence: [{ signal: "coach", label: "Analyzed", value: coverage.coach.count + " / " + coverage.coach.of }],
        affectedImageIds: [],
        suggestedActions: ["dismiss"],
        fingerprint: "meta:coach:" + coverage.coach.count
      })
    );

    return out;
  }

  function buildPurposeAlignment(ctx, coverage) {
    var out = [];
    ctx.portfolios.forEach(function (p) {
      var note = Catalog().purposeNote(p.purpose);
      if (!note) {
        out.push(
          makeInsight({
            category: "purpose-alignment",
            dimension: "purpose",
            key: p.id + ":none",
            title: "Purpose not set",
            observation:
              "Portfolio “" +
              (p.title || "Untitled") +
              "” does not have a purpose recorded yet. Purpose alignment stays unavailable until you name one.",
            whyItMayMatter: "A purpose helps describe the set — it is not a grade.",
            comparisonBasis: "insufficient",
            confidence: "higher",
            evidence: [],
            affectedImageIds: [],
            suggestedActions: ["open-portfolio", "dismiss"],
            fingerprint: "purpose:none:" + p.id
          })
        );
        return;
      }
      var live = ctx.rows.filter(function (r) {
        return !r.stale && (!r.membership || (r.membership.portfolioIds || []).indexOf(p.id) >= 0 || ctx.portfolios.length === 1);
      });
      // For multi-portfolio scope, filter rows belonging to this portfolio
      if (ctx.portfolios.length > 1) {
        live = ctx.rows.filter(function (r) {
          return !r.stale;
        });
      }
      var parts = [];
      parts.push(note.summary);
      if (p.coverImageId) parts.push("A cover image is assigned.");
      else parts.push("No cover image is assigned yet.");
      var keepFav = live.filter(function (r) {
        return r.favorite || r.selectionLabel === "keep";
      }).length;
      if (keepFav) {
        parts.push(
          "Your selections include " + keepFav + " Keep/favorite-marked frame" + (keepFav === 1 ? "" : "s") + "."
        );
      }
      if (note.id === "calendar-image-set") {
        if (coverage.captureDate.pct < 30) {
          parts.push(
            "Capture dates are sparse, so month diversity cannot be assessed honestly — months are never invented."
          );
        } else {
          var months = bucketCount(live, function (r) {
            return r.signals && r.signals.captureMonth;
          });
          parts.push("Dated frames currently span " + months.entries.length + " distinct month" + (months.entries.length === 1 ? "" : "s") + ".");
        }
      }
      out.push(
        makeInsight({
          category: "purpose-alignment",
          dimension: "purpose",
          key: p.id + ":" + note.id,
          title: "Purpose alignment · " + (p.title || "Untitled"),
          observation: "This portfolio emphasizes a “" + note.id + "” direction. " + parts.join(" "),
          whyItMayMatter:
            "Alignment notes are descriptive. They do not invent competition rules or guarantee print or web quality.",
          comparisonBasis: "purpose-signals",
          confidence: coverage.captureDate.pct >= 40 || keepFav > 0 ? "moderate" : "lower",
          evidence: [
            { signal: "purpose", label: "Purpose", value: note.id },
            { signal: "looks-for", label: "Soft looks-for", value: (note.looksFor || []).join("; ") }
          ],
          affectedImageIds: live.slice(0, 8).map(function (r) {
            return r.id;
          }),
          suggestedActions: ["open-portfolio", "send-builder", "save", "dismiss"],
          fingerprint: "purpose:" + p.id + ":" + note.id
        })
      );
    });
    return out;
  }

  function buildStrength(ctx) {
    var out = [];
    var live = ctx.rows.filter(function (r) {
      return !r.stale;
    });
    if (!live.length) return out;

    var preferred = live.filter(function (r) {
      return r.favorite || r.selectionLabel === "keep" || (r.rating != null && r.rating >= 4);
    });
    if (preferred.length) {
      var orient = bucketCount(preferred, function (r) {
        return r.orientation;
      });
      var subj = bucketCount(preferred, function (r) {
        return r.subjects[0] || null;
      });
      var bits = [];
      if (orient.entries[0]) bits.push(orient.entries[0].key + " orientation");
      if (subj.entries[0]) bits.push("subject label “" + subj.entries[0].key + "”");
      var season = bucketCount(preferred, function (r) {
        return r.season;
      });
      if (season.entries[0]) bits.push(season.entries[0].key + " captures");
      out.push(
        makeInsight({
          category: "strength",
          dimension: "user-decisions",
          key: "preferences",
          title: "Patterns in your selections",
          observation:
            "Your selections suggest a preference for " +
            (bits.length ? bits.join(" and ") : "frames you already marked Keep, favorite, or highly rated") +
            " (" +
            preferred.length +
            " of " +
            live.length +
            " carry strong personal signals).",
          whyItMayMatter:
            "These are your decisions reflected back — not a definitive style claim or artistic ranking.",
          comparisonBasis: "user-decisions",
          confidence: preferred.length >= 3 ? "higher" : "moderate",
          evidence: [
            { signal: "preferred-count", label: "Keep / favorite / high rating", value: String(preferred.length) }
          ],
          affectedImageIds: preferred.map(function (r) {
            return r.id;
          }),
          suggestedActions: ["open-affected", "save", "dismiss"],
          fingerprint: "strength:pref:" + preferred.length
        })
      );
    }

    // Assistant strong candidates overlap
    var strongIds = {};
    (ctx.assistantSessions || []).forEach(function (sess) {
      var recs = (sess.recommendations || sess.output && sess.output.recommendations) || [];
      (recs || []).forEach(function (rec) {
        if (rec.category === "strong-candidate" || (rec.categoryId === "strong-candidate")) {
          strongIds[rec.imageId || rec.id] = true;
        }
      });
      // alternate shape
      if (sess.decisions) {
        Object.keys(sess.decisions).forEach(function (id) {
          if (sess.decisions[id] && sess.decisions[id].preferred) strongIds[id] = true;
        });
      }
    });
    var strongInPort = live.filter(function (r) {
      return strongIds[r.id];
    });
    if (strongInPort.length) {
      out.push(
        makeInsight({
          category: "strength",
          dimension: "assistant",
          key: "strong-overlap",
          title: "Overlap with Assistant strong candidates",
          observation:
            "Your current portfolio includes " +
            strongInPort.length +
            " frame" +
            (strongInPort.length === 1 ? "" : "s") +
            " that Portfolio Assistant previously marked as strong candidates in a review session.",
          whyItMayMatter:
            "Assistant categories are soft priors. Your taste remains the authority.",
          comparisonBasis: "user-decisions",
          confidence: "moderate",
          evidence: [{ signal: "assistant-strong", label: "Strong-candidate overlap", value: String(strongInPort.length) }],
          affectedImageIds: strongInPort.map(function (r) {
            return r.id;
          }),
          suggestedActions: ["open-affected", "dismiss"],
          fingerprint: "strength:asst:" + strongInPort.length
        })
      );
    }

    // Coach notes presence
    var notes = [];
    (ctx.coachSessions || []).forEach(function (s) {
      if (s.notes && s.notes.length) notes = notes.concat(s.notes);
      if (s.personalNotes && s.personalNotes.length) notes = notes.concat(s.personalNotes);
    });
    if (notes.length) {
      out.push(
        makeInsight({
          category: "strength",
          dimension: "coach-notes",
          key: "notes",
          title: "Personal coaching notes on hand",
          observation:
            "You have " +
            notes.length +
            " personal coaching note" +
            (notes.length === 1 ? "" : "s") +
            " from Portfolio Coach. Your selections suggest you already captured comparative thinking worth revisiting.",
          whyItMayMatter: "Notes are yours — Health only surfaces that they exist.",
          comparisonBasis: "user-decisions",
          confidence: "higher",
          evidence: [{ signal: "coach-notes", label: "Notes", value: String(notes.length) }],
          affectedImageIds: [],
          suggestedActions: ["compare-coach", "save", "dismiss"],
          fingerprint: "strength:notes:" + notes.length
        })
      );
    }

    return out;
  }

  function buildOpportunities(ctx, under, coverage) {
    var out = [];
    // Turn top underrepresentation insights into optional opportunities
    (under || []).slice(0, 5).forEach(function (u) {
      out.push(
        makeInsight({
          category: "opportunity",
          dimension: u.dimension,
          key: "opp-" + u.key,
          title: "Optional: explore " + (u.key || u.dimension),
          observation:
            "You may want to explore more " +
            (u.key || u.dimension) +
            " photographs in a future shoot or edit. " +
            "This is an opportunity, not a requirement.",
          whyItMayMatter:
            "Optional only. Dismiss or mark not relevant anytime — there are no streaks or obligations.",
          comparisonBasis: u.comparisonBasis,
          confidence: u.confidence === "higher" ? "moderate" : "lower",
          evidence: u.evidence.slice(),
          affectedImageIds: u.affectedImageIds.slice(0, 8),
          suggestedActions: ["save", "dismiss", "not-relevant", "send-builder"],
          fingerprint: "opp:" + u.fingerprint
        })
      );
    });

    if (!out.length && coverage.subject.pct < 20 && ctx.rows.length >= 3) {
      out.push(
        makeInsight({
          category: "opportunity",
          dimension: "subject",
          key: "label-more",
          title: "Optional: add subject labels",
          observation:
            "Subject labels are sparse on this portfolio. You may want to explore light tagging in Photo Library so future Health observations can describe what you shoot most — only if that helps you.",
          whyItMayMatter: "This is an opportunity, not a requirement. Labels stay private on this device.",
          comparisonBasis: "portfolio-internal",
          confidence: "lower",
          evidence: [
            { signal: "subject-coverage", label: "Subject label coverage", value: coverage.subject.pct + "%" }
          ],
          affectedImageIds: [],
          suggestedActions: ["dismiss", "not-relevant"],
          fingerprint: "opp:label-more"
        })
      );
    }
    return out;
  }

  function overviewFrom(insights, coverage, ctx) {
    var areas = [];
    function addArea(id, label, status, summary) {
      areas.push({ id: id, label: label, status: status, summary: summary });
    }

    var conc = insights.filter(function (i) {
      return i.category === "concentration" && !i.dismissed;
    });
    if (conc.length) {
      addArea("concentration", "Concentration", "available", conc[0].observation);
    } else {
      addArea("concentration", "Concentration", "unavailable", "No strong concentration pattern with current data.");
    }

    var under = insights.filter(function (i) {
      return i.category === "underrepresentation" && !i.dismissed;
    });
    if (under.length) {
      addArea("underrepresentation", "Underrepresentation", "available", under[0].observation);
    } else {
      addArea(
        "underrepresentation",
        "Underrepresentation",
        "unavailable",
        "No underrepresentation claim with a clear comparison basis right now."
      );
    }

    var rep = insights.filter(function (i) {
      return i.category === "repetition" && !i.dismissed && !i.intentionalRepetition;
    });
    if (rep.length) {
      addArea("repetition", "Repetition", "available", rep[0].observation);
    } else {
      addArea("repetition", "Repetition", "unavailable", "No active repetition groups to review.");
    }

    addArea(
      "metadata",
      "Metadata coverage",
      "available",
      "Capture dates on " +
        coverage.captureDate.pct +
        "% · subjects on " +
        coverage.subject.pct +
        "% · orientation on " +
        coverage.orientation.pct +
        "%. Metadata is not photo quality."
    );

    addArea(
      "orientation",
      "Orientation mix",
      coverage.orientation.pct >= 30 ? "available" : "unavailable",
      coverage.orientation.pct >= 30
        ? "Orientation data present on " + coverage.orientation.pct + "% of frames."
        : "Orientation / dimensions unavailable for most frames."
    );

    if (coverage.gps.pct === 0) {
      addArea("location", "Locations", "unavailable", "Location metadata is not present — places are never invented.");
    }

    if (coverage.captureDate.pct < 20) {
      addArea("season", "Seasons", "unavailable", "Capture dates are sparse — seasons are not invented.");
    } else {
      addArea("season", "Seasons", "available", "Season derived from capture dates when present.");
    }

    addArea(
      "confidence",
      "Analysis confidence",
      "available",
      "Insights use qualitative confidence only (higher / moderate / lower). There is no portfolio score."
    );

    addArea(
      "counts",
      "Image counts",
      "available",
      ctx.portfolios.length +
        " portfolio" +
        (ctx.portfolios.length === 1 ? "" : "s") +
        " · " +
        coverage.imageCount +
        " image" +
        (coverage.imageCount === 1 ? "" : "s") +
        " in scope" +
        (ctx.truncatedPortfolio ? " (truncated for analysis size)" : "") +
        "."
    );

    return { areas: areas, imageCount: coverage.imageCount, portfolioCount: ctx.portfolios.length };
  }

  /**
   * Full analysis entry point.
   * @returns {{analysisVersion, generatedAt, scope, coverage, overview, insights, limitations, signature}}
   */
  function analyze(input) {
    var Cat = Catalog();
    var ctx = collectScope(input);
    var coverage = signalCoverage(ctx);
    var insights = [];

    if (!ctx.portfolios.length && ctx.scope !== "library") {
      return {
        analysisVersion: Cat.ANALYSIS_VERSION,
        generatedAt: new Date().toISOString(),
        scope: ctx.scope,
        portfolioIds: [],
        coverage: coverage,
        overview: {
          areas: [
            {
              id: "empty",
              label: "Portfolios",
              status: "unavailable",
              summary: "No portfolios selected. Create or choose a portfolio to analyze."
            }
          ],
          imageCount: 0,
          portfolioCount: 0
        },
        insights: [],
        limitations: ["No portfolios in scope."],
        signature: "empty",
        truncatedPortfolio: false,
        truncatedLibrary: false
      };
    }

    insights = insights.concat(buildConcentration(ctx, coverage));
    var under = buildUnderrepresentation(ctx, coverage);
    insights = insights.concat(under);
    insights = insights.concat(buildRepetition(ctx));
    insights = insights.concat(buildMetadata(ctx, coverage));
    insights = insights.concat(buildPurposeAlignment(ctx, coverage));
    insights = insights.concat(buildStrength(ctx));
    insights = insights.concat(buildOpportunities(ctx, under, coverage));

    // Ensure every insight has evidence + comparison basis + confidence
    insights.forEach(function (ins) {
      if (!ins.comparisonBasis) ins.comparisonBasis = "insufficient";
      if (!ins.confidence) ins.confidence = "lower";
      if (!ins.evidence) ins.evidence = [];
    });

    var limitations = [];
    if (ctx.truncatedPortfolio) {
      limitations.push(
        "Portfolio image set exceeded " + Cat.MAX_PORTFOLIO_IMAGES + " — analysis used the first " + Cat.MAX_PORTFOLIO_IMAGES + "."
      );
    }
    if (ctx.truncatedLibrary) {
      limitations.push(
        "Library comparison capped at " + Cat.MAX_LIBRARY_COMPARE + " images."
      );
    }
    if (coverage.gps.pct === 0) limitations.push("Location insights unavailable (no GPS).");
    if (coverage.captureDate.pct < 20) limitations.push("Seasonal insights limited (sparse capture dates).");
    if (coverage.subject.pct < 20) limitations.push("Subject insights limited (sparse tags).");
    limitations.push("No universal portfolio score is computed.");

    var signature = [
      Cat.ANALYSIS_VERSION,
      ctx.scope,
      ctx.portfolioIds.slice().sort().join(","),
      ctx.rows
        .map(function (r) {
          return r.id;
        })
        .join(","),
      coverage.captureDate.count,
      coverage.subject.count,
      insights.length
    ].join("|");

    return {
      analysisVersion: Cat.ANALYSIS_VERSION,
      generatedAt: new Date().toISOString(),
      scope: ctx.scope,
      portfolioIds: ctx.portfolioIds.slice(),
      coverage: coverage,
      overview: overviewFrom(insights, coverage, ctx),
      insights: insights,
      limitations: limitations,
      signature: signature,
      truncatedPortfolio: ctx.truncatedPortfolio,
      truncatedLibrary: ctx.truncatedLibrary
    };
  }

  /**
   * Merge fresh analysis with persisted user decisions.
   * Dismissed insights stay dismissed unless fingerprint materially changed.
   */
  function mergePersisted(analysis, persisted) {
    persisted = persisted || {};
    var byId = persisted.insightState || {};
    var insights = (analysis.insights || []).map(function (ins) {
      var prev = byId[ins.id];
      if (!prev) return ins;
      var out = Object.assign({}, ins);
      if (prev.fingerprint && prev.fingerprint !== ins.fingerprint) {
        // Material change — restore visibility but keep note if any
        out.dismissed = false;
        out.saved = !!prev.saved;
        out.notRelevant = false;
        out.intentionalRepetition = !!prev.intentionalRepetition;
        out.note = prev.note || null;
        out.restoredBecauseChanged = true;
      } else {
        out.dismissed = !!prev.dismissed;
        out.saved = !!prev.saved;
        out.notRelevant = !!prev.notRelevant;
        out.intentionalRepetition = !!prev.intentionalRepetition;
        out.note = prev.note || null;
      }
      return out;
    });
    return Object.assign({}, analysis, { insights: insights });
  }

  global.WaypointScenesHealthEngine = {
    analyze: analyze,
    mergePersisted: mergePersisted,
    collectScope: collectScope,
    normalizeImage: normalizeImage,
    makeInsight: makeInsight,
    ANALYSIS_VERSION: Catalog().ANALYSIS_VERSION
  };
})(typeof window !== "undefined" ? window : globalThis);
