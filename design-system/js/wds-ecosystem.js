/**
 * Waypoint Studio — Ecosystem inheritance layer
 * Loads product-registry.json + shared content library.
 * Renders FGDS homepage sections for any product. No per-app duplication.
 *
 * Usage:
 *   WDS.ecosystem.initProductHome({ product: 'foragecast', base: '../../design-system/' });
 */
(function (global) {
  "use strict";

  var registry = null;
  var contentCache = {};
  var config = { base: "" };

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function resolveBase(options) {
    if (options && options.base) return options.base.replace(/\/?$/, "/");
    var script = document.currentScript;
    if (script && script.src) return script.src.replace(/\/js\/[^/]+$/, "/");
    return "design-system/";
  }

  function fetchJson(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error("Failed to load " + url);
      return res.json();
    });
  }

  function getProduct(slug) {
    if (!registry || !registry.products) return null;
    return registry.products[slug] || null;
  }

  function templateUrl(guideKey) {
    if (!registry || !registry.fieldGuideTemplates) return "#";
    return config.base + registry.fieldGuideTemplates[guideKey];
  }

  function filterByDomains(items, domains) {
    if (!items || !items.length) return [];
    if (!domains || !domains.length) return items;
    var domainSet = {};
    domains.forEach(function (d) { domainSet[d] = true; });
    var matched = items.filter(function (item) {
      return item.domain && domainSet[item.domain];
    });
    return matched.length ? matched : items;
  }

  function pick(items, limit) {
    return (items || []).slice(0, limit || 3);
  }

  function loadContent(key) {
    if (contentCache[key]) return Promise.resolve(contentCache[key]);
    var path = registry.contentFiles[key];
    if (!path) return Promise.resolve({ items: [] });
    return fetchJson(config.base + path).then(function (data) {
      contentCache[key] = data;
      return data;
    });
  }

  function blockHead(eyebrow, title, lead) {
    return (
      '<div class="ws-block__head">' +
        (eyebrow ? '<p class="ws-block__eyebrow">' + escapeHtml(eyebrow) + "</p>" : "") +
        '<h2 class="ws-block__title">' + escapeHtml(title) + "</h2>" +
        (lead ? '<p class="ws-block__lead">' + escapeHtml(lead) + "</p>" : "") +
      "</div>"
    );
  }

  function contentCard(item, placeholder) {
    var cls = "ws-content-card" + (placeholder ? " ws-content-card--placeholder" : "");
    var meta = "";
    if (item.durationMinutes) meta = '<span class="ws-content-card__meta">~' + item.durationMinutes + " min</span>";
    if (item.dateline) meta = '<span class="ws-content-card__meta">' + escapeHtml(item.dateline) + "</span>";
    if (item.cadence) meta = '<span class="ws-content-card__meta">' + escapeHtml(item.cadence) + "</span>";
    return (
      '<article class="' + cls + '">' +
        '<span class="ws-content-card__type">' + escapeHtml(item.type || item.guideType || "Content") + "</span>" +
        '<h3 class="ws-content-card__title">' + escapeHtml(item.title) + "</h3>" +
        '<p class="ws-content-card__desc">' + escapeHtml(item.summary) + "</p>" +
        meta +
      "</article>"
    );
  }

  function mediaSlot(label, hint, extraClass) {
    return (
      '<div class="ws-media-slot' + (extraClass ? " " + extraClass : "") + '" role="img" aria-label="' + escapeHtml(label) + '">' +
        '<span class="ws-media-slot__label">' + escapeHtml(label) + "</span>" +
        (hint ? '<p class="ws-media-slot__hint">' + escapeHtml(hint) + "</p>" : "") +
      "</div>"
    );
  }

  function photographyFeatured(product, lesson) {
    var layout = product.photographyLayout || "gallery-grid";
    var caption = lesson
      ? escapeHtml(lesson.title) + " — field evidence frame. Photography is documentation."
      : "Hero photograph — date · place · conditions in caption.";
    return (
      '<section class="ws-block" id="featured-photograph" aria-labelledby="wds-fp-title">' +
        blockHead("Gallery", "Featured photograph", "Evidence frames — " + layout.replace(/-/g, " ") + " layout from shared FGDS.") +
        '<figure class="ws-featured-photo">' +
          mediaSlot("Featured photograph · placeholder", caption, "ws-featured-photo__slot") +
          '<figcaption class="ws-featured-photo__caption"><strong>Field evidence</strong> — ' + caption + " <em>Private by default.</em></figcaption>" +
        "</figure>" +
      "</section>"
    );
  }

  function sectionTodaysLesson(lesson) {
    if (!lesson) lesson = { title: "Before you name anything", summary: "Three minutes outside. List what you hear, what the light is doing, and one question you cannot answer yet.", type: "Lesson", durationMinutes: 12 };
    return (
      '<section class="ws-block" id="todays-lesson" aria-labelledby="wds-tl-title">' +
        blockHead("Learn", "Today's lesson", "One prompt from the Waypoint Learning Cycle — observe before you read.") +
        contentCard(lesson) +
      "</section>"
    );
  }

  function sectionSeasonal(newsItem) {
    var tag = (newsItem && newsItem.dateline) || "Seasonal";
    var title = (newsItem && newsItem.title) || "What the season is offering";
    var body = (newsItem && newsItem.summary) || "Phenology and weather notes from the shared content library.";
    return (
      '<section class="ws-block" id="seasonal-highlight" aria-labelledby="wds-sh-title">' +
        blockHead("Season", "Seasonal highlight", "Phenology and weather — not algorithmic feeds.") +
        '<div class="ws-seasonal">' +
          "<div>" +
            '<span class="ws-seasonal__tag">' + escapeHtml(tag) + "</span>" +
            '<h3 class="wds-display-md" style="margin:0 0 var(--wds-space-2);">' + escapeHtml(title) + "</h3>" +
            '<p class="wds-body">' + escapeHtml(body) + "</p>" +
          "</div>" +
          mediaSlot("Seasonal diagram · placeholder", "Phenology calendar or habitat timing illustration") +
        "</div>" +
      "</section>"
    );
  }

  function sectionFieldGuideSpotlight(product, guide) {
    var templateKey = (product.fieldGuideTemplates && product.fieldGuideTemplates[0]) || "species";
    var href = templateUrl(templateKey);
    var title = (guide && guide.title) || "Field guide entry";
    var summary = (guide && guide.summary) || "Peterson-style plate and quick facts from shared FGDS templates.";
    return (
      '<section class="ws-block" id="field-guide-spotlight" aria-labelledby="wds-fg-title">' +
        blockHead("Field guide", "Field guide spotlight", "Shared template: " + templateKey.replace(/-/g, " ") + ".") +
        '<div class="ws-spotlight">' +
          '<figure class="ws-spotlight__plate">' + mediaSlot("Plate · placeholder", "Illustration or species photograph") + "</figure>" +
          "<div>" +
            '<p class="wds-eyebrow">' + escapeHtml(templateKey.replace(/-/g, " ")) + "</p>" +
            '<h3 class="wds-display-md" style="margin:0 0 var(--wds-space-2);">' + escapeHtml(title) + "</h3>" +
            '<p class="wds-body">' + escapeHtml(summary) + "</p>" +
            '<p style="margin-top:var(--wds-space-4);"><a class="wds-btn wds-btn--secondary wds-btn--sm" href="' + escapeHtml(href) + '">Open FGDS template →</a></p>' +
          "</div>" +
        "</div>" +
      "</section>"
    );
  }

  function sectionRecentNews(items) {
    var cards = pick(items, 3).map(function (item) { return contentCard(item, item.placeholder); }).join("");
    return (
      '<section class="ws-block" id="recent-news" aria-labelledby="wds-news-title">' +
        blockHead("News", "Recent news", "Seasonal dispatches from the shared content library.") +
        '<div class="ws-card-grid">' + cards + "</div>" +
      "</section>"
    );
  }

  function sectionFeaturedVideo(video) {
    if (!video) video = { title: "How to learn like a naturalist", summary: "Observe first. Ask questions. Investigate. Return outside.", durationMinutes: 4 };
    return (
      '<section class="ws-block" id="featured-video" aria-labelledby="wds-vid-title">' +
        blockHead("Videos", "Featured video", "Click to play — never autoplay.") +
        '<div class="ws-video-feature">' +
          '<div class="ws-video-feature__thumb" role="img" aria-label="Video placeholder">' +
            '<span class="ws-video-feature__play" aria-hidden="true">▶</span>' +
            '<span class="ws-media-slot__label">' + (video.durationMinutes || 4) + " min · video · placeholder</span>" +
          "</div>" +
          "<div>" +
            '<h3 class="wds-display-md" style="margin:0 0 var(--wds-space-2);">' + escapeHtml(video.title) + "</h3>" +
            '<p class="wds-body">' + escapeHtml(video.summary) + "</p>" +
          "</div>" +
        "</div>" +
      "</section>"
    );
  }

  function sectionOutdoorChallenge(challenge) {
    if (!challenge) challenge = { title: "The thirty-minute repeat", summary: "Same place, same compass bearing — notice what changed between visits.", cadence: "weekly" };
    return (
      '<section class="ws-block" id="outdoor-challenge" aria-labelledby="wds-ch-title">' +
        blockHead("Investigate", "Outdoor challenge", "No leaderboard. No posting required.") +
        '<article class="ws-challenge-block">' +
          '<p class="wds-eyebrow">' + escapeHtml(challenge.cadence || "This week") + "</p>" +
          '<h3 class="wds-display-md" style="margin:0 0 var(--wds-space-2);">' + escapeHtml(challenge.title) + "</h3>" +
          '<p class="wds-body">' + escapeHtml(challenge.summary) + "</p>" +
          '<ol class="ws-challenge-block__steps">' +
            "<li>Observe first — weather, light, three species or signs.</li>" +
            "<li>Document with one consistent photograph bearing or journal entry.</li>" +
            "<li>Reflect in four sentences. Schedule your return visit.</li>" +
          "</ol>" +
          '<p class="wds-caption" style="margin-top:var(--wds-space-4);"><a href="' + escapeHtml(templateUrl("outdoor-challenge")) + '">FGDS outdoor challenge template →</a></p>' +
        "</article>" +
      "</section>"
    );
  }

  function sectionExploreNearby() {
    return (
      '<section class="ws-block" id="explore-nearby" aria-labelledby="wds-nb-title">' +
        blockHead("Places", "Explore nearby", "Habitat suggestions — location privacy respected by default.") +
        '<ul class="ws-nearby-list">' +
          '<li><span class="ws-nearby-list__distance">nearby</span><div class="ws-nearby-list__body"><strong>Riparian loop · placeholder</strong>Listen for birds; compare bank vegetation zones.</div></li>' +
          '<li><span class="ws-nearby-list__distance">local</span><div class="ws-nearby-list__body"><strong>North slope stand · placeholder</strong>Repeat photography bearing from today\'s lesson.</div></li>' +
        "</ul>" +
      "</section>"
    );
  }

  function sectionLatestResearch(article) {
    if (!article) article = { title: "Phenology shift on sheltered slopes", summary: "Plain-language research brief from the shared content library.", type: "Research" };
    return (
      '<section class="ws-block" id="latest-research" aria-labelledby="wds-res-title">' +
        blockHead("Research", "Latest research", "Why you should care outdoors.") +
        '<article class="ws-research-card">' +
          '<p class="wds-eyebrow">Research brief</p>' +
          '<h3 class="wds-display-md" style="margin:var(--wds-space-2) 0;">' + escapeHtml(article.title) + "</h3>" +
          '<p class="wds-body">' + escapeHtml(article.summary) + "</p>" +
          '<p class="ws-research-card__source"><a href="' + escapeHtml(templateUrl("research-brief")) + '">FGDS research brief template →</a></p>' +
        "</article>" +
      "</section>"
    );
  }

  function sectionFeaturedTool(product) {
    var href = product.toolHref || "../waypoint-scenes/";
    var label = product.toolLabel || "Open " + product.name;
    if (product.slug === "studio") {
      href = product.toolHref;
      label = "Waypoint Scenes";
    }
    return (
      '<section class="ws-block" id="featured-tool" aria-labelledby="wds-tool-title">' +
        blockHead("Tools", "Featured tool", "The workshop — important, but not the whole product.") +
        '<a class="ws-tool-card" href="' + escapeHtml(href) + '">' +
          '<p class="wds-eyebrow">' + escapeHtml(product.name) + "</p>" +
          '<h3 class="ws-tool-card__name">' + escapeHtml(label) + "</h3>" +
          '<p class="ws-tool-card__desc">' + escapeHtml(product.lead) + "</p>" +
          '<span class="ws-tool-card__cta">Open →</span>' +
        "</a>" +
      "</section>"
    );
  }

  function sectionFieldInvestigations(product) {
    var links = (product.fieldGuideTemplates || [])
      .filter(function (t) { return t === "field-investigation" || t === "outdoor-challenge"; })
      .map(function (t) {
        return '<a class="fg-related-card" href="' + escapeHtml(templateUrl(t)) + '"><span class="fg-related-card__type">FGDS</span><span class="fg-related-card__title">' + escapeHtml(t.replace(/-/g, " ")) + "</span></a>";
      }).join("");
    if (!links) return "";
    return (
      '<section class="ws-block" id="field-investigations" aria-labelledby="wds-fi-title">' +
        blockHead("Investigate", "Field investigations", "Shared FGDS investigation templates for this product.") +
        '<div class="fg-related-grid">' + links + "</div>" +
      "</section>"
    );
  }

  function sectionCitizenScience(product) {
    if (!product.citizenScience || !product.citizenScience.enabled) return "";
    var privacyHref = product.studioHref === "/" || product.studioHref === "../../"
      ? (product.slug === "studio" ? "docs/WAYPOINT-STUDIO-CONSTITUTION.md#privacy-philosophy" : "../../docs/WAYPOINT-STUDIO-CONSTITUTION.md#privacy-philosophy")
      : "../../docs/WAYPOINT-STUDIO-CONSTITUTION.md#privacy-philosophy";
    return (
      '<section class="ws-block" id="citizen-science" aria-labelledby="wds-cs-title">' +
        blockHead("Privacy", "Citizen science · private by default", "Optional contribution only — Constitution-compliant.") +
        '<div class="ws-citizen">' +
          "<p class=\"wds-body\"><strong>You own your observations.</strong> Photographs, field notes, and journals belong to you. The default experience is private.</p>" +
          "<p class=\"wds-body\" style=\"margin-top:var(--wds-space-3);\">When you choose to contribute: identity is never required, location privacy is respected, and you may opt out entirely. No likes, followers, or feeds.</p>" +
          '<p class="wds-caption" style="margin-top:var(--wds-space-4);"><a href="' + escapeHtml(privacyHref) + '">Privacy Philosophy</a> · <a href="' + escapeHtml(templateUrl("field-investigation")) + '">Field investigation template</a></p>' +
        "</div>" +
      "</section>"
    );
  }

  function renderTopbar(product) {
    var studioLink = product.slug === "studio"
      ? ""
      : '<a class="wds-btn wds-btn--ghost wds-btn--sm" href="' + escapeHtml(product.studioHref) + '">Waypoint Studio</a>';
    return (
      '<header class="wds-topbar">' +
        '<div class="wds-topbar__inner">' +
          '<a class="wds-brand" href="#main">' +
            '<span class="wds-brand__mark" aria-hidden="true"></span>' +
            '<span class="wds-brand__name">' + escapeHtml(product.name) + "</span>" +
          "</a>" +
          (studioLink ? '<nav class="wds-nav">' + studioLink + "</nav>" : "") +
        "</div>" +
      "</header>"
    );
  }

  function renderHero(product) {
    return (
      '<section class="wds-hero">' +
        '<div class="wds-hero__hearth" aria-hidden="true"></div>' +
        '<div class="wds-hero__inner">' +
          '<p class="wds-eyebrow">' + escapeHtml(product.eyebrow) + "</p>" +
          '<h1 class="wds-display-xl">' + escapeHtml(product.hero) + "</h1>" +
          '<p class="wds-lead">' + escapeHtml(product.lead) + "</p>" +
        "</div>" +
      "</section>"
    );
  }

  function renderSection(sectionId, product, data) {
    switch (sectionId) {
      case "featured-photograph":
        return photographyFeatured(product, data.lessons[0]);
      case "todays-lesson":
        return sectionTodaysLesson(data.lessons[0]);
      case "seasonal-highlight":
        return sectionSeasonal(data.news[0]);
      case "field-guide-spotlight":
        return sectionFieldGuideSpotlight(product, data.fieldGuides[0]);
      case "recent-news":
        return sectionRecentNews(data.news);
      case "featured-video":
        return sectionFeaturedVideo(data.videos[0]);
      case "outdoor-challenge":
        return sectionOutdoorChallenge(data.challenges[0]);
      case "explore-nearby":
        return sectionExploreNearby();
      case "latest-research":
        return sectionLatestResearch(data.articles[0]);
      case "featured-tool":
        return sectionFeaturedTool(product);
      case "field-investigations":
        return sectionFieldInvestigations(product);
      case "citizen-science":
        return sectionCitizenScience(product);
      default:
        return "";
    }
  }

  function applyProductTheme(product) {
    if (global.WDS && global.WDS.core && product.dataProduct) {
      global.WDS.core.setProduct(product.dataProduct);
    } else if (product.dataProduct) {
      document.documentElement.setAttribute("data-product", product.dataProduct);
    }
  }

  function initProductHome(options) {
    options = options || {};
    config.base = resolveBase(options);
    var slug = options.product || (options.mount && options.mount.getAttribute("data-wds-product"));
    var mount = options.mount || document.querySelector("[data-wds-product]");
    if (!mount) return Promise.reject(new Error("WDS.ecosystem: no mount element"));
    if (!slug) slug = mount.getAttribute("data-wds-product");
    if (!slug) return Promise.reject(new Error("WDS.ecosystem: no product slug"));

    mount.setAttribute("aria-busy", "true");

    return fetchJson(config.base + "ecosystem/product-registry.json")
      .then(function (reg) {
        registry = reg;
        var product = getProduct(slug);
        if (!product) throw new Error("Unknown product: " + slug);

        applyProductTheme(product);

        return Promise.all([
          loadContent("lessons"),
          loadContent("news"),
          loadContent("videos"),
          loadContent("challenges"),
          loadContent("articles"),
          loadContent("fieldGuides"),
        ]).then(function (results) {
          var domains = product.contentDomains;
          var data = {
            lessons: filterByDomains(results[0].items, domains),
            news: filterByDomains(results[1].items, domains),
            videos: filterByDomains(results[2].items, domains),
            challenges: filterByDomains(results[3].items, domains),
            articles: filterByDomains(results[4].items, domains),
            fieldGuides: filterByDomains(results[5].items, domains),
          };

          var sections = (product.homepageSections || []).map(function (id) {
            return renderSection(id, product, data);
          }).join("");

          var investigations = "";
          if (product.fieldGuideTemplates && product.fieldGuideTemplates.indexOf("field-investigation") !== -1) {
            investigations = sectionFieldInvestigations(product);
            if (investigations && sections.indexOf('id="citizen-science"') !== -1) {
              sections = sections.replace(
                '<section class="ws-block" id="citizen-science"',
                investigations + '<section class="ws-block" id="citizen-science"'
              );
              investigations = "";
            }
          }

          mount.innerHTML =
            renderTopbar(product) +
            renderHero(product) +
            '<main id="main">' + sections + investigations + "</main>";

          mount.removeAttribute("aria-busy");
          return { product: product, data: data };
        });
      });
  }

  function getInheritance(slug) {
    return fetchJson(config.base + "ecosystem/product-registry.json").then(function (reg) {
      registry = reg;
      return getProduct(slug);
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.ecosystem = {
    initProductHome: initProductHome,
    getProduct: getProduct,
    getInheritance: getInheritance,
    templateUrl: templateUrl,
    filterByDomains: filterByDomains,
  };
})(window);
