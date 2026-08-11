/**
 * SignalTerrain — first real cyber intelligence dashboard.
 * Loads data/cyber/dashboard.json only. Never loads sample/fixture intelligence.
 */
(function (global) {
  "use strict";

  var BANNED = [
    "cyber-intelligence.sample.json",
    "workspace.seed.json",
    "research-workspace.sample.json",
    "mockups/",
    "CVE-SAMPLE"
  ];

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function chipClass(state) {
    var s = String(state || "");
    if (s === "REAL") return "st-chip st-chip--real";
    if (s === "CACHED REAL") return "st-chip st-chip--cached";
    if (s === "NO CURRENT DATA") return "st-chip st-chip--none";
    return "st-chip st-chip--unavailable";
  }

  function fmtWhen(iso) {
    if (!iso) return "—";
    try {
      var d = new Date(iso);
      if (Number.isNaN(d.getTime())) return esc(iso);
      return d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short"
      });
    } catch (e) {
      return esc(iso);
    }
  }

  function fmtTime(iso) {
    if (!iso) return "—";
    try {
      var d = new Date(iso);
      if (Number.isNaN(d.getTime())) return esc(iso);
      return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    } catch (e2) {
      return esc(iso);
    }
  }

  function loadDashboard(url) {
    if (BANNED.some(function (b) { return String(url).indexOf(b) >= 0; })) {
      return Promise.reject(new Error("Refusing sample/fixture path: " + url));
    }
    return fetch(url, { credentials: "same-origin", cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error("Failed to load dashboard data (" + r.status + ")");
      return r.json();
    });
  }

  function renderChanged(items) {
    if (!items || !items.length) {
      return '<p class="st-empty">NO CURRENT DATA — no KEV additions, NVD updates, or CISA advisories with timestamps in the last ~36 hours.</p>';
    }
    return (
      '<ul class="st-changed">' +
      items
        .map(function (it) {
          return (
            "<li>" +
            "<time datetime=\"" +
            esc(it.at || "") +
            "\">" +
            fmtTime(it.at) +
            "</time>" +
            "<div>" +
            "<div>" +
            esc(it.text) +
            ' <span class="' +
            chipClass(it.dataState) +
            '">' +
            esc(it.dataState || "REAL") +
            "</span></div>" +
            (it.sourceUrl
              ? '<div class="st-row__src"><a href="' + esc(it.sourceUrl) + '" rel="noopener noreferrer" target="_blank">Source</a></div>'
              : "") +
            "</div></li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }

  function renderKev(items) {
    if (!items || !items.length) {
      return '<p class="st-empty">SOURCE UNAVAILABLE or NO CURRENT DATA for CISA KEV in this artifact.</p>';
    }
    return (
      '<ul class="st-rows">' +
      items
        .slice(0, 40)
        .map(function (k) {
          var bits = [];
          if (k.vendor) bits.push(esc(k.vendor));
          if (k.product) bits.push(esc(k.product));
          if (k.dateAdded) bits.push("added " + esc(String(k.dateAdded).slice(0, 10)));
          if (k.dueDate) bits.push("due " + esc(k.dueDate));
          if (k.cvssScore != null) bits.push("CVSS " + esc(k.cvssScore));
          if (k.nvdEnriched) bits.push("NVD enriched");
          return (
            "<li>" +
            "<strong>" +
            esc(k.cve || k.title) +
            " — " +
            esc(k.title || "") +
            '</strong> <span class="' +
            chipClass(k.dataState) +
            '">' +
            esc(k.dataState || "REAL") +
            "</span>" +
            '<div class="st-row__meta">' +
            bits.join(" · ") +
            (k.requiredAction ? "<br>Required action: " + esc(k.requiredAction) : "") +
            (k.summary ? "<br>" + esc(String(k.summary).slice(0, 280)) : "") +
            "</div>" +
            '<div class="st-row__src">' +
            '<a href="' +
            esc(k.sourceUrl) +
            '" rel="noopener noreferrer" target="_blank">CISA KEV</a>' +
            (k.nvdUrl
              ? ' · <a href="' + esc(k.nvdUrl) + '" rel="noopener noreferrer" target="_blank">NVD</a>'
              : "") +
            "</div></li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }

  function renderNvd(items) {
    if (!items || !items.length) {
      return '<p class="st-empty">SOURCE UNAVAILABLE or NO CURRENT DATA for recent NVD updates.</p>';
    }
    return (
      '<ul class="st-rows">' +
      items
        .slice(0, 30)
        .map(function (n) {
          return (
            "<li>" +
            "<strong>" +
            esc(n.cve || n.title) +
            '</strong> <span class="' +
            chipClass(n.dataState) +
            '">' +
            esc(n.dataState || "REAL") +
            "</span>" +
            '<div class="st-row__meta">' +
            (n.cvssScore != null ? "CVSS " + esc(n.cvssScore) + " · " : "") +
            (n.lastModified ? "modified " + esc(String(n.lastModified).slice(0, 10)) : "") +
            (n.publishedAt ? " · published " + esc(String(n.publishedAt).slice(0, 10)) : "") +
            (n.description ? "<br>" + esc(String(n.description).slice(0, 280)) : "") +
            "</div>" +
            '<div class="st-row__src"><a href="' +
            esc(n.sourceUrl) +
            '" rel="noopener noreferrer" target="_blank">NVD record</a></div></li>'
          );
        })
        .join("") +
      "</ul>"
    );
  }

  function renderAdvisories(items) {
    if (!items || !items.length) {
      return '<p class="st-empty">SOURCE UNAVAILABLE or NO CURRENT DATA for CISA advisories.</p>';
    }
    return (
      '<ul class="st-rows">' +
      items
        .slice(0, 25)
        .map(function (a) {
          return (
            "<li>" +
            "<strong>" +
            esc(a.title) +
            '</strong> <span class="' +
            chipClass(a.dataState) +
            '">' +
            esc(a.dataState || "REAL") +
            "</span>" +
            '<div class="st-row__meta">' +
            (a.publishedAt ? "Published " + esc(String(a.publishedAt).slice(0, 10)) : "") +
            (a.updatedAt && a.updatedAt !== a.publishedAt
              ? " · Updated " + esc(String(a.updatedAt).slice(0, 10))
              : "") +
            (a.type ? " · " + esc(a.type) : "") +
            (a.description ? "<br>" + esc(String(a.description).slice(0, 280)) : "") +
            "</div>" +
            '<div class="st-row__src"><a href="' +
            esc(a.sourceUrl) +
            '" rel="noopener noreferrer" target="_blank">CISA source</a></div></li>'
          );
        })
        .join("") +
      "</ul>"
    );
  }

  function renderRansomware(block) {
    if (!block || block.dataState === "NO CURRENT DATA" || !(block.items || []).length) {
      return (
        '<p class="st-empty">' +
        esc((block && block.note) || "NO CURRENT DATA — no authoritative ransomware associations in the current KEV slice.") +
        "</p>"
      );
    }
    return (
      '<p class="st-panel__note">' +
      esc(block.note) +
      "</p>" +
      '<ul class="st-rows">' +
      block.items
        .slice(0, 25)
        .map(function (k) {
          return (
            "<li><strong>" +
            esc(k.cve || k.title) +
            "</strong> — " +
            esc(k.ransomwareCampaignAssociation) +
            ' <span class="' +
            chipClass(k.dataState) +
            '">' +
            esc(k.dataState || "REAL") +
            "</span>" +
            '<div class="st-row__src"><a href="' +
            esc(k.sourceUrl) +
            '" rel="noopener noreferrer" target="_blank">CISA KEV</a></div></li>'
          );
        })
        .join("") +
      "</ul>"
    );
  }

  function renderHealth(items) {
    var primary = (items || []).filter(function (s) {
      return s.providerId === "cisa-kev" || s.providerId === "nvd" || s.providerId === "cisa-advisories";
    });
    if (!primary.length) {
      return '<p class="st-empty">SOURCE UNAVAILABLE — source health not present in artifact.</p>';
    }
    return (
      '<div class="st-health">' +
      primary
        .map(function (s) {
          return (
            '<article class="st-health__card">' +
            "<h3>" +
            esc(s.name) +
            '</h3>' +
            '<p><span class="' +
            chipClass(s.dataState) +
            '">' +
            esc(s.dataState) +
            "</span></p>" +
            "<p>Last refresh: " +
            fmtWhen(s.lastRefresh) +
            "</p>" +
            "<p>Last success: " +
            fmtWhen(s.lastSuccessfulAt) +
            "</p>" +
            "<p>Freshness: " +
            esc(s.freshness) +
            " · " +
            (s.success ? "success" : "failure") +
            " · records " +
            esc(s.recordCount) +
            "</p>" +
            (s.sourceUrl
              ? '<p><a href="' + esc(s.sourceUrl) + '" rel="noopener noreferrer" target="_blank">Upstream</a></p>'
              : "") +
            (s.latestError ? "<p>Error: " + esc(s.latestError) + "</p>" : "") +
            "</article>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function mount(root, opts) {
    if (!root) return;
    var url = (opts && opts.dashboardUrl) || "../../../data/cyber/dashboard.json";
    root.setAttribute("aria-busy", "true");
    root.innerHTML = '<p class="st-dash__status" role="status">Loading cyber intelligence…</p>';

    loadDashboard(url)
      .then(function (doc) {
        var meta = doc.meta || {};
        var counts = meta.counts || {};
        root.removeAttribute("aria-busy");
        root.innerHTML =
          '<header class="st-dash__hero">' +
          "<p class=\"st-panel__meta\">SignalTerrain · read-only public cyber intelligence</p>" +
          "<h1>Cyber intelligence dashboard</h1>" +
          "<p>Official CISA KEV, NIST NVD, and CISA advisories — cited, dated, and labeled for honesty. No fabricated threat levels or world attack maps.</p>" +
          '<div class="st-dash__meta">' +
          '<span class="' +
          chipClass(meta.dataState) +
          '">' +
          esc(meta.dataState || meta.trustState || "UNKNOWN") +
          "</span>" +
          "<span class=\"st-chip\">Refreshed " +
          fmtWhen(meta.generatedAt) +
          "</span>" +
          "<span class=\"st-chip\">KEV " +
          esc(counts.kev || 0) +
          "</span>" +
          "<span class=\"st-chip\">NVD " +
          esc(counts.nvd || 0) +
          "</span>" +
          "<span class=\"st-chip\">NVD-enriched KEV " +
          esc(counts.nvdEnrichedKev || 0) +
          "</span>" +
          "<span class=\"st-chip\">Advisories " +
          esc(counts.advisories || 0) +
          "</span>" +
          "</div></header>" +
          '<section class="st-panel" aria-labelledby="st-changed-title">' +
          '<div class="st-panel__head"><h2 id="st-changed-title">What changed today</h2>' +
          '<span class="st-panel__meta">from real timestamps</span></div>' +
          renderChanged(doc.whatChangedToday) +
          "</section>" +
          '<section class="st-panel" aria-labelledby="st-kev-title">' +
          '<div class="st-panel__head"><h2 id="st-kev-title">Actively exploited (CISA KEV)</h2>' +
          '<span class="st-panel__meta">' +
          esc(counts.kev || 0) +
          " entries</span></div>" +
          '<p class="st-panel__note">Primary actively-exploited signal from the official CISA Known Exploited Vulnerabilities catalog.</p>' +
          renderKev(doc.activelyExploitedKev) +
          "</section>" +
          '<section class="st-panel" aria-labelledby="st-nvd-title">' +
          '<div class="st-panel__head"><h2 id="st-nvd-title">New / updated NVD</h2>' +
          '<span class="st-panel__meta">' +
          esc(counts.nvd || 0) +
          " entries</span></div>" +
          renderNvd(doc.newUpdatedNvd) +
          "</section>" +
          '<section class="st-panel" aria-labelledby="st-adv-title">' +
          '<div class="st-panel__head"><h2 id="st-adv-title">CISA advisories</h2>' +
          '<span class="st-panel__meta">' +
          esc(counts.advisories || 0) +
          " entries</span></div>" +
          renderAdvisories(doc.cisaAdvisories) +
          "</section>" +
          '<section class="st-panel" aria-labelledby="st-ransom-title">' +
          '<div class="st-panel__head"><h2 id="st-ransom-title">Ransomware signal</h2>' +
          '<span class="st-panel__meta">' +
          esc((doc.ransomwareSignal && doc.ransomwareSignal.dataState) || "NO CURRENT DATA") +
          "</span></div>" +
          renderRansomware(doc.ransomwareSignal) +
          "</section>" +
          '<section class="st-panel" aria-labelledby="st-health-title">' +
          '<div class="st-panel__head"><h2 id="st-health-title">Source health</h2>' +
          '<span class="st-panel__meta">name · refresh · freshness · success/failure</span></div>' +
          renderHealth(doc.sourceHealth) +
          "</section>" +
          '<section class="st-panel" aria-labelledby="st-absent-title">' +
          '<div class="st-panel__head"><h2 id="st-absent-title">Honest absences</h2></div>' +
          "<ul class=\"st-absences\">" +
          "<li>" +
          esc((doc.absences && doc.absences.threatLevel) || "NO CURRENT DATA for composite threat level.") +
          "</li>" +
          "<li>" +
          esc((doc.absences && doc.absences.worldAttackMap) || "NO CURRENT DATA for world attack map.") +
          "</li>" +
          "</ul></section>" +
          '<footer class="st-dash__footer">' +
          "<p>Beta · read-only defensive awareness · not a SIEM, SOC, or subscriber product claim.</p>" +
          "<p>Deeper feed views: <a href=\"../../../apps/signalterrain/cyber/live.html\">Live cyber intelligence</a></p>" +
          "</footer>";
      })
      .catch(function (err) {
        root.removeAttribute("aria-busy");
        root.innerHTML =
          '<p role="alert">Could not load cyber intelligence: ' +
          esc(err && err.message ? err.message : err) +
          '. <button type="button" id="st-dash-retry">Retry</button></p>';
        var btn = root.querySelector("#st-dash-retry");
        if (btn) btn.addEventListener("click", function () { mount(root, opts); });
      });
  }

  global.WDS = global.WDS || {};
  global.WDS.signalTerrainDashboard = { mount: mount, BANNED_SAMPLE_PATHS: BANNED };
})(typeof window !== "undefined" ? window : globalThis);
