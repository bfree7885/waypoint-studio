/**
 * Waypoint Scenes — Portfolio Health · Descriptive portfolio comparison
 *
 * Never declares a winner. Handles missing data and identical portfolios.
 */
(function (global) {
  "use strict";

  function Engine() {
    return global.WaypointScenesHealthEngine;
  }
  function Catalog() {
    return global.WaypointScenesHealthCatalog;
  }

  function summarizePortfolio(portfolio, libraryImages) {
    var analysis = Engine().analyze({
      scope: "one",
      portfolios: [portfolio],
      portfolioIds: [portfolio.id],
      libraryImages: libraryImages || []
    });
    var live = (portfolio.imageIds || []).length;
    var orientations = {};
    var seasons = {};
    (analysis.insights || []).forEach(function () {});
    // Pull coverage-backed simple stats from rows via re-collect
    var ctx = Engine().collectScope({
      scope: "one",
      portfolios: [portfolio],
      portfolioIds: [portfolio.id],
      libraryImages: libraryImages || []
    });
    ctx.rows.forEach(function (r) {
      if (r.orientation) orientations[r.orientation] = (orientations[r.orientation] || 0) + 1;
      if (r.season) seasons[r.season] = (seasons[r.season] || 0) + 1;
    });
    return {
      id: portfolio.id,
      title: portfolio.title || "Untitled",
      purpose: portfolio.purpose || null,
      imageCount: live,
      coverImageId: portfolio.coverImageId || null,
      orientations: orientations,
      seasons: seasons,
      coverage: analysis.coverage,
      insightCounts: {
        concentration: analysis.insights.filter(function (i) {
          return i.category === "concentration";
        }).length,
        repetition: analysis.insights.filter(function (i) {
          return i.category === "repetition";
        }).length,
        underrepresentation: analysis.insights.filter(function (i) {
          return i.category === "underrepresentation";
        }).length
      }
    };
  }

  /**
   * @param {object[]} portfolios length 2+
   * @param {object[]} libraryImages
   */
  function compare(portfolios, libraryImages) {
    portfolios = portfolios || [];
    if (portfolios.length < 2) {
      return {
        ok: false,
        message: "Select at least two portfolios to compare.",
        rows: [],
        notes: []
      };
    }

    var summaries = portfolios.map(function (p) {
      return summarizePortfolio(p, libraryImages);
    });

    var notes = [];
    var identical =
      summaries.length === 2 &&
      summaries[0].imageCount === summaries[1].imageCount &&
      JSON.stringify((portfolios[0].imageIds || []).slice().sort()) ===
        JSON.stringify((portfolios[1].imageIds || []).slice().sort());

    if (identical) {
      notes.push({
        kind: "identical",
        text: "These portfolios currently reference the same images in the same membership set. Differences may still exist in title, purpose, cover, or order."
      });
    }

    var rows = [
      {
        label: "Image count",
        values: summaries.map(function (s) {
          return String(s.imageCount);
        })
      },
      {
        label: "Purpose",
        values: summaries.map(function (s) {
          return s.purpose || "Not set";
        })
      },
      {
        label: "Cover assigned",
        values: summaries.map(function (s) {
          return s.coverImageId ? "Yes" : "No";
        })
      },
      {
        label: "Capture-date coverage",
        values: summaries.map(function (s) {
          return s.coverage.captureDate.pct + "%";
        })
      },
      {
        label: "Subject-label coverage",
        values: summaries.map(function (s) {
          return s.coverage.subject.pct + "%";
        })
      },
      {
        label: "Concentration insights",
        values: summaries.map(function (s) {
          return String(s.insightCounts.concentration);
        })
      },
      {
        label: "Repetition insights",
        values: summaries.map(function (s) {
          return String(s.insightCounts.repetition);
        })
      }
    ];

    // Orientation descriptive note
    var orientNotes = summaries.map(function (s) {
      var keys = Object.keys(s.orientations);
      if (!keys.length) return "Orientation data unavailable";
      return keys
        .map(function (k) {
          return k + " " + s.orientations[k];
        })
        .join(", ");
    });
    rows.push({ label: "Orientation mix", values: orientNotes });

    var seasonNotes = summaries.map(function (s) {
      var keys = Object.keys(s.seasons);
      if (!keys.length) return "Season data unavailable (dates missing or sparse)";
      return keys
        .map(function (k) {
          return k + " " + s.seasons[k];
        })
        .join(", ");
    });
    rows.push({ label: "Season mix (when dated)", values: seasonNotes });

    notes.push({
      kind: "principle",
      text: "Comparison is descriptive only. Neither portfolio is ranked, scored, or declared a winner."
    });

    // Guard banned language
    var blob = notes
      .map(function (n) {
        return n.text;
      })
      .join(" ");
    if (Catalog().containsBanned(blob)) {
      throw new Error("Banned language in comparison");
    }

    return {
      ok: true,
      portfolios: summaries,
      rows: rows,
      notes: notes,
      identicalMembership: identical
    };
  }

  global.WaypointScenesHealthCompare = {
    compare: compare,
    summarizePortfolio: summarizePortfolio
  };
})(typeof window !== "undefined" ? window : globalThis);
