/**
 * SignalTerrain Cyber Awareness — navigation UI foundations.
 * Placeholder sections with sample data. Not a polished product UI.
 */
(function (global) {
  "use strict";

  var SECTIONS = [
    { id: "overview", label: "Overview" },
    { id: "threats", label: "Threats" },
    { id: "vulnerabilities", label: "Vulnerabilities" },
    { id: "campaigns", label: "Campaigns" },
    { id: "software", label: "Software" },
    { id: "vendors", label: "Vendors" },
    { id: "research", label: "Research" },
    { id: "timeline", label: "Timeline" },
    { id: "collections", label: "Collections" },
    { id: "sources", label: "Sources" },
    { id: "analysis", label: "Analysis" },
    { id: "settings", label: "Settings" }
  ];

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function sectionFromHash() {
    var h = String(global.location.hash || "").replace(/^#/, "");
    if (!h) return "overview";
    for (var i = 0; i < SECTIONS.length; i++) {
      if (SECTIONS[i].id === h) return h;
    }
    return "overview";
  }

  function renderNav(active) {
    return (
      '<nav class="st-cyber-nav" aria-label="Cyber Awareness sections">' +
      "<ul>" +
      SECTIONS.map(function (s) {
        return (
          "<li>" +
          '<a href="#' +
          esc(s.id) +
          '"' +
          (s.id === active ? ' aria-current="page"' : "") +
          ">" +
          esc(s.label) +
          "</a></li>"
        );
      }).join("") +
      "</ul></nav>"
    );
  }

  function listEntities(graph, kinds, title) {
    var items = [];
    kinds.forEach(function (k) {
      items = items.concat(graph.byKind(k));
    });
    if (!items.length) {
      return "<p class=\"st-muted\">No sample records in this section yet.</p>";
    }
    return (
      "<h2>" +
      esc(title) +
      "</h2><ul class=\"st-cyber-list\">" +
      items
        .map(function (e) {
          return (
            "<li><strong>" +
            esc(e.title) +
            "</strong> <span class=\"st-badge\">" +
            esc(e.kind) +
            "</span><p>" +
            esc(e.summary) +
            "</p></li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }

  function renderExplain(e) {
    if (!e || !e.explainability) return "";
    var x = e.explainability;
    function block(label, arr) {
      if (!arr || !arr.length) return "";
      return (
        "<div class=\"st-cyber-explain-block\"><h4>" +
        esc(label) +
        "</h4><ul>" +
        arr.map(function (i) {
          return "<li>" + esc(i) + "</li>";
        }).join("") +
        "</ul></div>"
      );
    }
    return (
      '<section class="st-cyber-explain" aria-label="Explainability">' +
      "<h3>" +
      esc(e.title) +
      "</h3>" +
      "<p><strong>What is it?</strong> " +
      esc(x.whatIsIt) +
      "</p>" +
      "<p><strong>Why it matters?</strong> " +
      esc(x.whyItMatters) +
      "</p>" +
      "<p><strong>Who is affected?</strong> " +
      esc(x.whoIsAffected) +
      "</p>" +
      "<p><strong>What changed?</strong> " +
      esc(x.whatChanged) +
      "</p>" +
      block("Known Facts", x.knownFacts) +
      block("Likely", x.likely) +
      block("Possible", x.possible) +
      block("Unknown", x.unknown) +
      "</section>"
    );
  }

  function renderPriority(score) {
    if (!score) return "";
    return (
      '<section class="st-cyber-priority" aria-label="Priority reasoning">' +
      "<h3>Priority: " +
      esc(score.band) +
      " (" +
      esc(String(score.total)) +
      "/100)</h3>" +
      "<p>" +
      esc(score.summaryWhy) +
      "</p>" +
      "<ul>" +
      (score.contributions || [])
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
      "</ul></section>"
    );
  }

  function renderSection(ctx, active) {
    var graph = ctx.graph;
    var research = ctx.research;
    var Priority = global.WDS.signalTerrainCyberPriority;

    if (active === "overview") {
      var kinds = graph.listKinds();
      var chain = graph.traverseAttentionChain("cy_cve-2021-44228");
      var path = graph.findPath("cy_cve-2017-0144", "cy_ransomware-wannacry");
      return (
        "<h2>Cyber Awareness Intelligence Engine V0.1</h2>" +
        "<p class=\"st-lead\">Educational defensive intelligence — not IDS, SIEM, scanner, or offense. Sample data only.</p>" +
        '<p><a href="brief.html">Open today’s Daily Cyber Brief</a> — calm attention, transparent why.</p>' +
        '<p><a href="explorer.html">Open Cyber Intelligence Explorer</a> — relationships, timeline, map.</p>' +
        "<p>Entity counts: " +
        esc(JSON.stringify(kinds)) +
        "</p>" +
        "<h3>Example traversal — Log4Shell attention chain</h3><ol>" +
        (chain.steps || [])
          .map(function (s) {
            return "<li>" + esc(s.role) + ": " + esc(s.entity.title) + "</li>";
          })
          .join("") +
        "</ol>" +
        "<h3>Example path — EternalBlue → WannaCry</h3><p>" +
        esc((path || []).join(" → ")) +
        "</p>"
      );
    }

    if (active === "threats") {
      return listEntities(graph, ["threat", "malware-family", "ransomware-family", "threat-actor", "exploit-technique"], "Threats & related literacy");
    }
    if (active === "vulnerabilities") {
      var html = listEntities(graph, ["vulnerability", "cve", "kev-entry", "patch", "mitigation"], "Vulnerabilities & defenses");
      var log4 = graph.get("cy_cve-2021-44228");
      var score =
        log4 && log4.priorityInputs && Priority
          ? Priority.score(
              Object.assign({ subjectId: log4.id, id: "cyp_log4shell" }, log4.priorityInputs),
              ctx.factors,
              ctx.rules
            )
          : null;
      return html + renderExplain(log4) + renderPriority(score);
    }
    if (active === "campaigns") {
      return listEntities(graph, ["threat-campaign"], "Campaigns");
    }
    if (active === "software") {
      return listEntities(graph, ["affected-software", "affected-hardware"], "Software & hardware");
    }
    if (active === "vendors") {
      return listEntities(graph, ["vendor-advisory", "source"], "Vendors & publishers");
    }
    if (active === "research") {
      var items = (research && research.items) || [];
      return (
        "<h2>Shared research workspace</h2>" +
        "<p>Reusable across Radio &amp; Cyber — bookmarks, notes, sources, queue.</p>" +
        "<ul class=\"st-cyber-list\">" +
        items
          .map(function (i) {
            return (
              "<li><strong>" +
              esc(i.title) +
              "</strong> <span class=\"st-badge\">" +
              esc(i.kind) +
              " · " +
              esc(i.domain) +
              "</span></li>"
            );
          })
          .join("") +
        "</ul>"
      );
    }
    if (active === "timeline") {
      return listEntities(graph, ["timeline-event"], "Timeline");
    }
    if (active === "collections") {
      var cols = ((research && research.items) || []).filter(function (i) {
        return i.kind === "collection" || i.kind === "bookmark" || i.kind === "queue-item";
      });
      return (
        "<h2>Collections</h2><ul class=\"st-cyber-list\">" +
        cols
          .map(function (i) {
            return "<li><strong>" + esc(i.title) + "</strong> (" + esc(i.kind) + ")</li>";
          })
          .join("") +
        "</ul>"
      );
    }
    if (active === "sources") {
      return listEntities(graph, ["source", "reference"], "Sources") +
        "<h3>Source library (workspace)</h3><ul class=\"st-cyber-list\">" +
        ((research && research.items) || [])
          .filter(function (i) {
            return i.kind === "source-entry";
          })
          .map(function (i) {
            return (
              "<li><strong>" +
              esc(i.title) +
              "</strong> — " +
              esc(i.sourceClass || "") +
              (i.url ? ' · <a href="' + esc(i.url) + '">link</a>' : "") +
              "</li>"
            );
          })
          .join("") +
        "</ul>";
    }
    if (active === "analysis") {
      var subjects = ["cy_cve-2021-44228", "cy_cve-2023-34362", "cy_cve-2017-0144"];
      return (
        "<h2>Analysis — transparent priority</h2>" +
        subjects
          .map(function (id) {
            var e = graph.get(id);
            if (!e || !e.priorityInputs || !Priority) return "";
            var score = Priority.score(
              Object.assign({ subjectId: id, id: "cyp_" + id }, e.priorityInputs),
              ctx.factors,
              ctx.rules
            );
            return "<h3>" + esc(e.title) + "</h3>" + renderPriority(score);
          })
          .join("")
      );
    }
    if (active === "settings") {
      return (
        "<h2>Settings</h2>" +
        "<ul>" +
        "<li>Local-first research workspace (planned persistence)</li>" +
        "<li>No live feeds in V0.1</li>" +
        "<li>No automatic remediation</li>" +
        "<li>Samples remain labeled sample</li>" +
        '<li><a href="brief.html">Daily cyber brief</a></li>' +
        '<li><a href="explorer.html">Cyber intelligence explorer</a></li>' +
        '<li><a href="ingest-health.html">Ingest health (internal diagnostics)</a></li>' +
        "</ul>"
      );
    }
    return "<p>Unknown section.</p>";
  }

  function mount(root, options) {
    options = options || {};
    if (!root) return Promise.reject(new Error("mount root required"));
    root.setAttribute("aria-busy", "true");
    root.innerHTML = '<p class="st-loading">Opening Cyber Awareness…</p>';

    var base = options.base || "../../design-system/signalterrain/intelligence/cyber/";
    var Graph = global.WDS.signalTerrainCyberGraph;
    var Priority = global.WDS.signalTerrainCyberPriority;
    if (!Graph || !Priority) {
      root.innerHTML = '<p role="alert">Cyber runtimes failed to load.</p>';
      root.removeAttribute("aria-busy");
      return Promise.resolve();
    }

    return Promise.all([
      Graph.loadBundle(base + "samples/cyber-intelligence.sample.json"),
      fetch(base + "samples/research-workspace.sample.json").then(function (r) {
        return r.json();
      }),
      Priority.loadRules(base)
    ])
      .then(function (parts) {
        var ctx = {
          graph: parts[0].graph,
          bundle: parts[0].bundle,
          research: parts[1],
          factors: parts[2].factors,
          rules: parts[2].rules
        };

        function paint() {
          var active = sectionFromHash();
          root.innerHTML =
            '<div class="st-cyber">' +
            '<header class="st-demo-header">' +
            "<h1>Cyber Awareness</h1>" +
            '<p class="st-lead">What should I pay attention to today?</p>' +
            '<p class="st-badge">' +
            esc(ctx.bundle.meta.disclaimer) +
            "</p>" +
            "</header>" +
            renderNav(active) +
            '<div class="st-cyber-main">' +
            renderSection(ctx, active) +
            "</div></div>";
          root.removeAttribute("aria-busy");
        }

        paint();
        global.addEventListener("hashchange", paint);
      })
      .catch(function (err) {
        root.innerHTML =
          '<p role="alert">Could not load Cyber Awareness samples. ' +
          esc(err && err.message) +
          "</p>";
        root.removeAttribute("aria-busy");
      });
  }

  global.WDS = global.WDS || {};
  global.WDS.signalTerrainCyber = {
    mount: mount,
    sections: SECTIONS
  };
})(typeof window !== "undefined" ? window : globalThis);
