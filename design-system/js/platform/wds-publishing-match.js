/**
 * Waypoint Publishing — deterministic discovery → story matching.
 * Editorial rules only. No embeddings / LLMs. Empty match is success.
 * Authority: docs/SCENES-PUBLISHING.md · docs/PRODUCT-DIRECTION.md
 */
(function (global) {
  "use strict";

  var VERSION = "1.0.0-publishing-match";
  var catalog = null;

  function num(v) {
    if (v == null) return null;
    if (typeof v === "number" && isFinite(v)) return v;
    var n = parseFloat(String(v));
    return isFinite(n) ? n : null;
  }

  function storyById(id) {
    var stories = (catalog && catalog.stories) || [];
    for (var i = 0; i < stories.length; i++) {
      if (stories[i].id === id) return stories[i];
    }
    return null;
  }

  function setCatalog(next) {
    catalog = next || null;
    return catalog;
  }

  function getCatalog() {
    return catalog;
  }

  function signalBlob(signals) {
    var parts = [];
    (signals || []).forEach(function (s) {
      if (!s) return;
      parts.push(String(s.id || ""), String(s.title || ""), String(s.summary || ""), String(s.category || ""));
      (s.evidence || []).forEach(function (e) {
        if (e && e.metric) parts.push(String(e.metric));
        if (e && e.value != null) parts.push(String(e.value));
      });
    });
    return parts.join(" ").toLowerCase();
  }

  function keywordHit(blob, keywords) {
    if (!blob || !keywords || !keywords.length) return null;
    for (var i = 0; i < keywords.length; i++) {
      var k = String(keywords[i] || "").toLowerCase();
      if (k && blob.indexOf(k) >= 0) return k;
    }
    return null;
  }

  function quietHumidCool(platform, now) {
    if (!platform || !platform.weatherRef || !platform.weatherRef.meta || platform.weatherRef.meta.isPlaceholder) {
      return null;
    }
    var cur = platform.weatherRef.current || {};
    var humidity = num(cur.humidity);
    var wind = cur.wind ? num(cur.wind.speed) : null;
    var temp = num(cur.temperature);
    if (humidity == null || humidity < 85) return null;
    if (wind != null && wind > 8) return null;
    if (temp != null && temp > 72) return null;
    var when = now instanceof Date ? now : new Date(now || Date.now());
    var hour = when.getHours();
    /* Dawn–morning window is when valley fog is most observable */
    if (hour >= 10 && hour < 20) return null;
    return {
      rule: "quiet-humid-cool",
      evidence:
        "Humidity " +
        Math.round(humidity) +
        "%" +
        (wind != null ? " · wind " + Math.round(wind) + " mph" : "") +
        (temp != null ? " · " + Math.round(temp) + "°F" : "") +
        " · editorial match (not a fog forecast)"
    };
  }

  /**
   * @param {object} ctx
   * @param {object[]} [ctx.signals] — Happening Now / intel signals
   * @param {object} [ctx.platform]
   * @param {Date|number|string} [ctx.now]
   * @param {string[]} [ctx.topics] — explicit editorial topics
   * @returns {object|null} match card or null
   */
  function matchDiscovery(ctx) {
    ctx = ctx || {};
    if (!catalog || !Array.isArray(catalog.stories)) return null;
    var blob = signalBlob(ctx.signals);
    var topics = (ctx.topics || []).map(function (t) {
      return String(t || "").toLowerCase();
    });
    var i;
    var story;
    var disc;
    var hit;

    /* 1) Explicit signal keywords (strongest) */
    for (i = 0; i < catalog.stories.length; i++) {
      story = catalog.stories[i];
      disc = story.discovery || {};
      hit = keywordHit(blob, disc.signalKeywords);
      if (hit) {
        return buildMatch(story, disc.why, "signal:" + hit);
      }
    }

    /* 2) Explicit topic list from caller */
    if (topics.length) {
      for (i = 0; i < catalog.stories.length; i++) {
        story = catalog.stories[i];
        var st = story.topics || [];
        for (var t = 0; t < topics.length; t++) {
          if (st.indexOf(topics[t]) >= 0) {
            return buildMatch(story, (story.discovery && story.discovery.why) || "Related Waypoint story", "topic:" + topics[t]);
          }
        }
      }
    }

    /* 3) Conservative condition rule (labeled inference) */
    for (i = 0; i < catalog.stories.length; i++) {
      story = catalog.stories[i];
      disc = story.discovery || {};
      if (disc.conditionRule === "quiet-humid-cool") {
        var cond = quietHumidCool(ctx.platform, ctx.now);
        if (cond) {
          return buildMatch(story, disc.why, cond.evidence);
        }
      }
    }

    return null;
  }

  function buildMatch(story, why, basedOn) {
    return {
      id: story.id,
      title: story.title,
      href: story.href,
      format: story.format || "story",
      series: story.series || "deep-forest-dispatch",
      seriesLabel: "Deep Forest Dispatch",
      why: why || "",
      basedOn: basedOn || "",
      videoHref: story.videoHref || null,
      scenesHref: story.scenesHref || "/apps/scenes/",
      relatedStoryIds: story.relatedStoryIds || []
    };
  }

  function relatedFor(storyId) {
    var story = storyById(storyId);
    if (!story) return [];
    return (story.relatedStoryIds || [])
      .map(storyById)
      .filter(Boolean)
      .map(function (s) {
        return {
          id: s.id,
          title: s.title,
          href: s.href,
          format: s.format,
          videoHref: s.videoHref || null
        };
      });
  }

  function storiesByTopic(topic) {
    var want = String(topic || "").toLowerCase();
    if (!want || !catalog) return [];
    return (catalog.stories || []).filter(function (s) {
      return (s.topics || []).indexOf(want) >= 0;
    });
  }

  function browseGroups() {
    if (!catalog || !catalog.browseTaxonomy) return [];
    return catalog.browseTaxonomy.map(function (g) {
      var seen = {};
      var items = [];
      (g.topics || []).forEach(function (topic) {
        storiesByTopic(topic).forEach(function (s) {
          if (seen[s.id]) return;
          seen[s.id] = true;
          items.push(s);
        });
      });
      return { id: g.id, label: g.label, stories: items };
    }).filter(function (g) {
      return g.stories.length > 0;
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.publishingMatch = {
    version: VERSION,
    setCatalog: setCatalog,
    getCatalog: getCatalog,
    matchDiscovery: matchDiscovery,
    relatedFor: relatedFor,
    storyById: storyById,
    storiesByTopic: storiesByTopic,
    browseGroups: browseGroups
  };
})(typeof window !== "undefined" ? window : global);
