/**
 * Waypoint University — knowledge health opportunities (not alarms).
 */
(function (global) {
  "use strict";

  function Schema() {
    return global.WU && global.WU.Schema;
  }

  function daysSince(iso) {
    if (!iso) return 9999;
    return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
  }

  function titleKey(t) {
    return String(t || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  /**
   * @param {object} index - from WU.Graph.buildIndex
   * @returns {{ opportunities: Array, summary: object }}
   */
  function analyze(index) {
    var opportunities = [];
    var nodes = Object.keys(index.nodeMap).map(function (id) {
      return index.nodeMap[id];
    });

    var unconnected = nodes.filter(function (n) {
      return (
        n.kind !== "path" &&
        n.kind !== "capture" &&
        (index.adj[n.id] || []).length === 0
      );
    });
    if (unconnected.length) {
      opportunities.push({
        id: "no-connections",
        title: "Topics with no connections",
        blurb: "Linking these will make them discoverable from neighbors.",
        count: unconnected.length,
        items: unconnected.slice(0, 12)
      });
    }

    var needsReview = nodes.filter(function (n) {
      return n.review && n.review.enabled && n.review.dueAt && new Date(n.review.dueAt) <= new Date();
    });
    // Also soft-signal: bookmarked + stale
    var staleBookmarks = nodes.filter(function (n) {
      return n.bookmarked && daysSince(n.lastOpenedAt || n.updatedAt) > 45;
    });
    var reviewItems = needsReview.concat(
      staleBookmarks.filter(function (n) {
        return needsReview.indexOf(n) < 0;
      })
    );
    if (reviewItems.length) {
      opportunities.push({
        id: "needs-review",
        title: "Pages worth revisiting",
        blurb: "Bookmarks you have not opened lately, or items marked for review.",
        count: reviewItems.length,
        items: reviewItems.slice(0, 12)
      });
    }

    var byTitle = Object.create(null);
    nodes.forEach(function (n) {
      var k = titleKey(n.title);
      if (!k || k.length < 4) return;
      if (!byTitle[k]) byTitle[k] = [];
      byTitle[k].push(n);
    });
    var dupes = [];
    Object.keys(byTitle).forEach(function (k) {
      if (byTitle[k].length > 1) dupes = dupes.concat(byTitle[k]);
    });
    if (dupes.length) {
      opportunities.push({
        id: "duplicates",
        title: "Possible duplicate concepts",
        blurb: "Same (or nearly same) titles — consider merging or linking as relates-to.",
        count: dupes.length,
        items: dupes.slice(0, 12)
      });
    }

    var broken = (index.edges || []).filter(function (e) {
      return e.broken;
    });
    if (broken.length) {
      opportunities.push({
        id: "broken-links",
        title: "Broken links",
        blurb: "Relationships point at missing nodes — clean up when convenient.",
        count: broken.length,
        items: broken.slice(0, 8).map(function (e) {
          return {
            id: e.id,
            title: (e.fromId || "?") + " → " + (e.toId || "?") + " (" + e.type + ")",
            kind: "edge"
          };
        })
      });
    }

    var incompleteDefs = nodes.filter(function (n) {
      if (n.kind !== "definition" && n.kind !== "concept") return false;
      var body = String(n.body || "").trim();
      return body.length < 40;
    });
    if (incompleteDefs.length) {
      opportunities.push({
        id: "incomplete-definitions",
        title: "Incomplete definitions",
        blurb: "Short bodies on concepts/definitions — a few sentences will deepen the graph.",
        count: incompleteDefs.length,
        items: incompleteDefs.slice(0, 12)
      });
    }

    var staleResearch = nodes.filter(function (n) {
      var stage = n.research && n.research.stage;
      if (!stage || stage === "conclusions" || stage === "follow-up") return false;
      return daysSince(n.updatedAt) > 30;
    });
    if (staleResearch.length) {
      opportunities.push({
        id: "stale-research",
        title: "Stale research in progress",
        blurb: "Research notes idle mid-workflow — resume or park them.",
        count: staleResearch.length,
        items: staleResearch.slice(0, 12)
      });
    }

    var openQ = nodes.filter(function (n) {
      return (
        n.kind === "question" &&
        (!n.question || n.question.status === "open" || n.question.status === "investigating")
      );
    });
    var heavilyQuestioned = [];
    nodes.forEach(function (n) {
      if (n.kind === "question") return;
      var qs = (index.adj[n.id] || []).filter(function (x) {
        return x.type === "questions" || x.type === "answered-by";
      });
      var qCount = qs.filter(function (x) {
        var other = index.nodeMap[x.otherId];
        return (
          other &&
          other.kind === "question" &&
          (!other.question || other.question.status === "open" || other.question.status === "investigating")
        );
      }).length;
      if (qCount >= 2) heavilyQuestioned.push(Object.assign({}, n, { _qCount: qCount }));
    });
    if (openQ.length || heavilyQuestioned.length) {
      opportunities.push({
        id: "unanswered-questions",
        title: "Topics with unanswered questions",
        blurb: openQ.length + " open questions in the library" + (heavilyQuestioned.length ? "; some topics carry several." : "."),
        count: openQ.length + heavilyQuestioned.length,
        items: heavilyQuestioned
          .slice(0, 6)
          .concat(openQ.slice(0, 6))
          .slice(0, 12)
      });
    }

    return {
      opportunities: opportunities,
      summary: {
        nodes: nodes.length,
        edges: (index.edges || []).filter(function (e) {
          return !e.broken;
        }).length,
        openQuestions: openQ.length,
        unconnected: unconnected.length,
        opportunities: opportunities.length
      }
    };
  }

  global.WU = global.WU || {};
  global.WU.Health = { analyze: analyze, daysSince: daysSince };
})(typeof window !== "undefined" ? window : globalThis);
