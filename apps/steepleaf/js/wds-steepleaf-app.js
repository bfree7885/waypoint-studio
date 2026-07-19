/**
 * Steepleaf — Product Recovery Phase 1 application shell.
 * Private on-device tea companion. No fabricated journals.
 */
(function (global) {
  "use strict";

  var NAV = [
    ["home", "Home"],
    ["brew", "Today's Brew"],
    ["collection", "My Collection"],
    ["sessions", "Brewing Sessions"],
    ["journal", "Tea Journal"],
    ["discover", "Discover"],
    ["learning", "Learning"],
    ["search", "Search"],
    ["settings", "Settings"]
  ];

  function Store() {
    return global.WaypointSteepleaf;
  }
  function Guides() {
    return global.SteepleafGuides;
  }
  function Briefing() {
    return global.SteepleafBriefing;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function parseHash() {
    var h = String(global.location.hash || "").replace(/^#/, "");
    if (!h) return { panel: "home", id: null, step: null };
    var parts = h.split("/");
    var panel = parts[0] || "home";
    if (panel === "overview" || panel === "today") panel = "home";
    if (panel === "catalog") panel = "collection";
    if (panel === "tea") return { panel: "tea", id: parts[1] || null, step: null };
    if (panel === "session") return { panel: "session", id: parts[1] || null, step: null };
    if (panel === "learn") return { panel: "learning", id: parts[1] || null, step: null };
    if (panel === "brew" && parts[1] === "timer") {
      return { panel: "brew", id: parts[2] || null, step: "timer" };
    }
    return { panel: panel, id: parts[1] || null, step: parts[2] || null };
  }

  function setHash(panel, id, step) {
    var h = panel;
    if (id) h += "/" + id;
    if (step) h += "/" + step;
    global.location.hash = h;
  }

  function typeOptions(selected) {
    return (Store().TEA_TYPES || [])
      .map(function (t) {
        return (
          '<option value="' +
          esc(t.id) +
          '"' +
          (selected === t.id ? " selected" : "") +
          ">" +
          esc(t.label) +
          "</option>"
        );
      })
      .join("");
  }

  function formatDate(iso) {
    if (!iso) return "—";
    try {
      var d = new Date(iso);
      return d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return String(iso).slice(0, 16);
    }
  }

  function stars(n) {
    if (n == null || n === "") return "—";
    var r = Math.max(0, Math.min(5, Math.round(Number(n))));
    return "★".repeat(r) + "☆".repeat(5 - r) + " (" + r + "/5)";
  }

  function mount(root) {
    if (!root) return;
    if (!Store()) {
      root.innerHTML =
        '<div class="sl-app" role="alert"><h1>Steepleaf failed to load</h1><p>Models are missing. Check script order.</p></div>';
      return;
    }

    var state = {
      q: "",
      collectionFilter: "all",
      collectionSort: "updated",
      collectionOrigin: "",
      brewDraft: null,
      timer: null,
      timerRemain: 0,
      timerRunning: false,
      learnId: null,
      saveMsg: "",
      flash: ""
    };

    function flash(msg) {
      state.flash = msg || "";
    }

    function navHtml() {
      var route = parseHash();
      return (
        '<nav class="sl-nav" aria-label="Steepleaf">' +
        "<ul>" +
        NAV.map(function (p) {
          var cur =
            route.panel === p[0] ||
            (route.panel === "tea" && p[0] === "collection") ||
            (route.panel === "session" && (p[0] === "sessions" || p[0] === "journal"));
          return (
            "<li><a href=\"#" +
            p[0] +
            "\"" +
            (cur ? ' aria-current="page"' : "") +
            ">" +
            esc(p[1]) +
            "</a></li>"
          );
        }).join("") +
        "</ul></nav>"
      );
    }

    function homePanel() {
      var brief = Briefing().buildBriefing();
      var rec = brief.recommendation;
      return (
        '<section class="sl-brief" aria-labelledby="sl-today-title">' +
        '<p class="sl-eyebrow">Today\'s Tea</p>' +
        '<h1 id="sl-today-title" class="sl-title">What should I brew today?</h1>' +
        '<p class="sl-meta">' +
        esc(formatDate(brief.generatedAt)) +
        " · " +
        esc(String((brief.counts && brief.counts.teas) || 0)) +
        " teas · " +
        esc(String((brief.counts && brief.counts.brews) || 0)) +
        " sessions · private on this device</p>" +
        '<ul class="sl-brief-list">' +
        (brief.bullets || [])
          .map(function (b) {
            return "<li>" + esc(b) + "</li>";
          })
          .join("") +
        "</ul>" +
        (rec
          ? '<div class="sl-rec">' +
            "<p><strong>Recommended:</strong> " +
            esc(rec.tea.name) +
            "</p>" +
            '<p class="sl-why">' +
            esc((rec.reasons && rec.reasons[0]) || "") +
            "</p>" +
            '<p><a class="wds-btn wds-btn--primary" href="#brew/' +
            encodeURIComponent(rec.tea.id) +
            '">Start today\'s brew</a> ' +
            '<a class="wds-btn wds-btn--ghost" href="#tea/' +
            encodeURIComponent(rec.tea.id) +
            '">View tea</a></p></div>'
          : '<div class="sl-rec"><p><a class="wds-btn wds-btn--primary" href="#collection">Add a tea to your collection</a></p></div>') +
        "</section>" +
        '<section class="sl-quick">' +
        "<h2>Quick paths</h2>" +
        '<div class="sl-quick-grid">' +
        '<a href="#brew">Today\'s Brew</a>' +
        '<a href="#collection">My Collection</a>' +
        '<a href="#sessions">Sessions</a>' +
        '<a href="#learning">Learning</a>' +
        "</div></section>"
      );
    }

    function brewPanel() {
      var route = parseHash();
      var teas = Store().listTeas();
      var teaId = route.id || (state.brewDraft && state.brewDraft.teaId) || "";
      var tea = teaId ? Store().getTea(teaId) : null;
      var guide = tea ? Guides().guideForType(tea.type) : null;
      var prefs = Store().getPreferences();

      if (!teas.length) {
        return (
          "<h1 class=\"sl-title\">Today's Brew</h1>" +
          '<p class="sl-lead">Add a tea you own before starting a session. Steepleaf will not invent one for you.</p>' +
          '<p><a class="wds-btn wds-btn--primary" href="#collection">Open collection</a></p>'
        );
      }

      if (!tea) {
        return (
          "<h1 class=\"sl-title\">Today's Brew</h1>" +
          '<p class="sl-lead">Choose a tea. Guidance explains why — not a single correct taste.</p>' +
          '<ul class="sl-pick-list">' +
          teas
            .slice(0, 40)
            .map(function (t) {
              return (
                "<li><a href=\"#brew/" +
                encodeURIComponent(t.id) +
                "\"><strong>" +
                esc(t.name) +
                "</strong>" +
                (t.type ? " · " + esc(Guides().typeLabel(t.type)) : "") +
                (t.favorite ? " · ★" : "") +
                "</a></li>"
              );
            })
            .join("") +
          "</ul>"
        );
      }

      var prev = Store().brewsForTea(tea.id)[0] || null;
      var draft = state.brewDraft && state.brewDraft.teaId === tea.id ? state.brewDraft : null;
      var temp = draft && draft.waterTempC != null ? draft.waterTempC : guide ? guide.tempC : 90;
      var steep = draft && draft.steepSeconds != null ? draft.steepSeconds : guide ? guide.steepSeconds : 120;
      var leaf = draft && draft.leafGrams != null ? draft.leafGrams : "";
      var water = draft && draft.waterMl != null ? draft.waterMl : "";
      var vessel = (draft && draft.vessel) || prefs.defaultVessel || "gaiwan";

      return (
        "<h1 class=\"sl-title\">Today's Brew</h1>" +
        '<p class="sl-lead">Brewing <strong>' +
        esc(tea.name) +
        "</strong>" +
        (tea.type ? " · " + esc(Guides().typeLabel(tea.type)) : "") +
        "</p>" +
        (guide
          ? '<div class="sl-guide-card">' +
            "<h2>Suggested starting point</h2>" +
            "<ul class=\"sl-kv\">" +
            "<li><span>Temperature</span><strong>" +
            esc(guide.tempRange) +
            "</strong></li>" +
            "<li><span>Steep time</span><strong>~" +
            esc(String(guide.steepSeconds)) +
            "s</strong></li>" +
            "<li><span>Leaf</span><strong>" +
            esc(guide.leafHint) +
            "</strong></li>" +
            "<li><span>Infusions</span><strong>" +
            esc(guide.infusions) +
            "</strong></li>" +
            "<li><span>Expected profile</span><strong>" +
            esc(guide.flavors) +
            "</strong></li>" +
            "</ul>" +
            '<p class="sl-why"><strong>Why:</strong> ' +
            esc(guide.why) +
            "</p>" +
            (prev
              ? '<p class="sl-meta">Revisit previous notes from ' +
                esc(formatDate(prev.brewedAt)) +
                ' · <a href="#session/' +
                encodeURIComponent(prev.id) +
                '">Open last session</a></p>'
              : '<p class="sl-meta">No previous session for this tea yet.</p>') +
            "</div>"
          : "") +
        '<form id="sl-brew-form" class="sl-form" data-tea="' +
        esc(tea.id) +
        '">' +
        "<label>Water °C <input name=\"temp\" type=\"number\" min=\"40\" max=\"100\" value=\"" +
        esc(String(temp)) +
        "\"/></label>" +
        "<label>Leaf grams <input name=\"leaf\" type=\"number\" step=\"0.1\" min=\"0\" value=\"" +
        esc(String(leaf)) +
        "\" placeholder=\"optional\"/></label>" +
        "<label>Water ml <input name=\"water\" type=\"number\" min=\"0\" value=\"" +
        esc(String(water)) +
        "\" placeholder=\"optional\"/></label>" +
        "<label>Steep seconds <input name=\"steep\" type=\"number\" min=\"0\" value=\"" +
        esc(String(steep)) +
        "\"/></label>" +
        "<label>Vessel <input name=\"vessel\" value=\"" +
        esc(vessel) +
        "\"/></label>" +
        '<div class="sl-actions">' +
        '<button type="button" class="wds-btn wds-btn--primary" id="sl-start-timer">Start timer</button> ' +
        '<button type="submit" class="wds-btn wds-btn--ghost">Save session without timer</button>' +
        "</div></form>" +
        '<div id="sl-timer-panel" class="sl-timer" hidden>' +
        '<p class="sl-timer-display" aria-live="polite">0:00</p>' +
        '<div class="sl-actions">' +
        '<button type="button" class="wds-btn wds-btn--primary" id="sl-timer-toggle">Pause</button> ' +
        '<button type="button" class="wds-btn wds-btn--ghost" id="sl-timer-done">Finish &amp; note</button>' +
        "</div></div>" +
        '<form id="sl-session-complete" class="sl-form" hidden>' +
        "<h2>Session notes</h2>" +
        "<label>Infusions completed <input name=\"infusions\" type=\"number\" min=\"1\" value=\"1\"/></label>" +
        "<label>Mood <select name=\"mood\"><option value=\"\">—</option>" +
        Guides().MOODS.map(function (m) {
          return "<option>" + esc(m) + "</option>";
        }).join("") +
        "</select></label>" +
        "<label>Rating (1–5) <input name=\"rating\" type=\"number\" min=\"1\" max=\"5\"/></label>" +
        "<label>Flavor notes <input name=\"flavors\" placeholder=\"floral, sweet, mineral\"/></label>" +
        "<label>Notes <textarea name=\"notes\" rows=\"3\" placeholder=\"What stood out?\"></textarea></label>" +
        '<button type="submit" class="wds-btn wds-btn--primary">Save session</button></form>'
      );
    }

    function filteredCollection() {
      var list = Store().listTeas();
      if (state.collectionFilter === "favorites") {
        list = list.filter(function (t) {
          return t.favorite;
        });
      } else if (state.collectionFilter !== "all") {
        list = list.filter(function (t) {
          return t.type === state.collectionFilter;
        });
      }
      if (state.collectionOrigin) {
        var o = state.collectionOrigin.toLowerCase();
        list = list.filter(function (t) {
          return (
            String(t.origin || "")
              .toLowerCase()
              .indexOf(o) >= 0 ||
            String(t.region || "")
              .toLowerCase()
              .indexOf(o) >= 0 ||
            String(t.vendor || "")
              .toLowerCase()
              .indexOf(o) >= 0
          );
        });
      }
      if (state.collectionSort === "name") {
        list = list.slice().sort(function (a, b) {
          return String(a.name).localeCompare(String(b.name));
        });
      } else if (state.collectionSort === "type") {
        list = list.slice().sort(function (a, b) {
          return String(a.type || "").localeCompare(String(b.type || ""));
        });
      } else if (state.collectionSort === "year") {
        list = list.slice().sort(function (a, b) {
          return Number(b.harvestYear || 0) - Number(a.harvestYear || 0);
        });
      }
      return list;
    }

    function collectionPanel() {
      var list = filteredCollection();
      return (
        "<h1 class=\"sl-title\">My Collection</h1>" +
        '<p class="sl-lead">Your private shelf — search, filter, and sort without leaving the page.</p>' +
        '<form id="sl-collection-filters" class="sl-form sl-form--inline">' +
        "<label>Type <select name=\"type\"><option value=\"all\">All</option><option value=\"favorites\"" +
        (state.collectionFilter === "favorites" ? " selected" : "") +
        ">Favorites</option>" +
        typeOptions(state.collectionFilter === "favorites" || state.collectionFilter === "all" ? "" : state.collectionFilter) +
        "</select></label>" +
        "<label>Sort <select name=\"sort\">" +
        [
          ["updated", "Recently updated"],
          ["name", "Name"],
          ["type", "Type"],
          ["year", "Harvest year"]
        ]
          .map(function (o) {
            return (
              "<option value=\"" +
              o[0] +
              "\"" +
              (state.collectionSort === o[0] ? " selected" : "") +
              ">" +
              o[1] +
              "</option>"
            );
          })
          .join("") +
        "</select></label>" +
        "<label>Origin / vendor <input name=\"origin\" value=\"" +
        esc(state.collectionOrigin) +
        "\" placeholder=\"Yunnan, vendor…\"/></label>" +
        '<button type="submit" class="wds-btn wds-btn--ghost">Apply</button></form>' +
        '<p class="sl-meta">' +
        list.length +
        " teas</p>" +
        (list.length
          ? '<ul class="sl-tea-list">' +
            list
              .map(function (t) {
                return (
                  "<li><a href=\"#tea/" +
                  encodeURIComponent(t.id) +
                  "\"><strong>" +
                  esc(t.name) +
                  "</strong>" +
                  (t.favorite ? " ★" : "") +
                  "</a>" +
                  "<span>" +
                  esc(
                    [Guides().typeLabel(t.type), t.origin, t.harvestYear, t.remainingQuantity]
                      .filter(Boolean)
                      .join(" · ") || "Details pending"
                  ) +
                  "</span>" +
                  ' <a class="sl-inline" href="#brew/' +
                  encodeURIComponent(t.id) +
                  '">Brew</a></li>'
                );
              })
              .join("") +
            "</ul>"
          : '<p class="sl-empty">No teas match. Add one below, or clear filters.</p>') +
        '<details class="sl-add" open>' +
        "<summary>Add tea</summary>" +
        '<form id="sl-add-tea" class="sl-form">' +
        "<label>Name <input name=\"name\" required placeholder=\"Aged shou puer cake\"/></label>" +
        "<label>Type <select name=\"type\"><option value=\"\">—</option>" +
        typeOptions("") +
        "</select></label>" +
        "<label>Origin <input name=\"origin\" placeholder=\"Yunnan\"/></label>" +
        "<label>Region <input name=\"region\"/></label>" +
        "<label>Harvest year <input name=\"year\" type=\"number\" min=\"1900\" max=\"2100\"/></label>" +
        "<label>Vendor <input name=\"vendor\"/></label>" +
        "<label>Storage <input name=\"storage\" placeholder=\"Kitchen tin / shelf\"/></label>" +
        "<label>Remaining <input name=\"qty\" placeholder=\"~50 g\"/></label>" +
        "<label><input type=\"checkbox\" name=\"favorite\"/> Favorite</label>" +
        "<label>Purchase date <input name=\"purchaseDate\" type=\"date\"/></label>" +
        "<label>Notes <textarea name=\"notes\" rows=\"2\"></textarea></label>" +
        '<button type="submit" class="wds-btn wds-btn--primary">Save to collection</button></form></details>'
      );
    }

    function teaDetail(id) {
      var t = Store().getTea(id);
      if (!t) return '<p role="alert">Tea not found in your collection.</p>';
      var sessions = Store().brewsForTea(t.id);
      var guide = Guides().guideForType(t.type);
      return (
        '<p><a href="#collection">← Collection</a></p>' +
        "<h1 class=\"sl-title\">" +
        esc(t.name) +
        (t.favorite ? " ★" : "") +
        "</h1>" +
        '<ul class="sl-kv">' +
        "<li><span>Type</span><strong>" +
        esc(Guides().typeLabel(t.type) || "—") +
        "</strong></li>" +
        "<li><span>Origin</span><strong>" +
        esc(t.origin || "—") +
        (t.region ? " · " + esc(t.region) : "") +
        "</strong></li>" +
        "<li><span>Harvest</span><strong>" +
        esc(t.harvestYear || "—") +
        "</strong></li>" +
        "<li><span>Vendor</span><strong>" +
        esc(t.vendor || "—") +
        "</strong></li>" +
        "<li><span>Storage</span><strong>" +
        esc(t.storageLocation || "—") +
        "</strong></li>" +
        "<li><span>Remaining</span><strong>" +
        esc(t.remainingQuantity || "—") +
        "</strong></li>" +
        "</ul>" +
        (t.notes ? "<p>" + esc(t.notes) + "</p>" : "") +
        (guide
          ? '<p class="sl-why"><strong>Brew tip:</strong> ' + esc(guide.why) + "</p>"
          : "") +
        '<p class="sl-actions"><a class="wds-btn wds-btn--primary" href="#brew/' +
        encodeURIComponent(t.id) +
        '">Brew this tea</a> ' +
        '<button type="button" class="wds-btn wds-btn--ghost" data-toggle-fav="' +
        esc(t.id) +
        '">' +
        (t.favorite ? "Unfavorite" : "Favorite") +
        "</button> " +
        '<button type="button" class="wds-btn wds-btn--ghost" data-del-tea="' +
        esc(t.id) +
        '">Remove</button></p>' +
        "<h2>Sessions with this tea</h2>" +
        (sessions.length
          ? '<ul class="sl-session-list">' +
            sessions
              .map(function (s) {
                return (
                  "<li><a href=\"#session/" +
                  encodeURIComponent(s.id) +
                  "\">" +
                  esc(formatDate(s.brewedAt)) +
                  "</a> · " +
                  esc(stars(s.rating)) +
                  "</li>"
                );
              })
              .join("") +
            "</ul>"
          : '<p class="sl-empty">No sessions yet.</p>')
      );
    }

    function sessionsPanel() {
      var brews = Store().listBrews();
      return (
        "<h1 class=\"sl-title\">Brewing Sessions</h1>" +
        '<p class="sl-lead">History of what you actually steeped — parameters, notes, and change over time.</p>' +
        (brews.length
          ? '<ul class="sl-session-list">' +
            brews
              .map(function (b) {
                var tea = Store().getTea(b.teaId);
                return (
                  "<li><a href=\"#session/" +
                  encodeURIComponent(b.id) +
                  "\"><strong>" +
                  esc((tea && tea.name) || b.teaNameSnapshot || "Unknown tea") +
                  "</strong></a>" +
                  "<span>" +
                  esc(formatDate(b.brewedAt)) +
                  (b.waterTempC != null ? " · " + b.waterTempC + "°C" : "") +
                  (b.steepSeconds != null ? " · " + b.steepSeconds + "s" : "") +
                  (b.rating != null ? " · " + stars(b.rating) : "") +
                  "</span></li>"
                );
              })
              .join("") +
            "</ul>"
          : '<p class="sl-empty">No sessions yet. <a href="#brew">Start today\'s brew</a>.</p>')
      );
    }

    function sessionDetail(id) {
      var b = Store().getBrew(id);
      if (!b) return '<p role="alert">Session not found.</p>';
      var tea = Store().getTea(b.teaId);
      var prevList = Store().brewsForTea(b.teaId).filter(function (x) {
        return x.id !== b.id && String(x.brewedAt) < String(b.brewedAt);
      });
      var prev = prevList[0] || null;
      var cmp = Briefing().compareSessions(b, prev);
      return (
        '<p><a href="#sessions">← Sessions</a></p>' +
        "<h1 class=\"sl-title\">" +
        esc((tea && tea.name) || b.teaNameSnapshot || "Brew session") +
        "</h1>" +
        '<p class="sl-meta">' +
        esc(formatDate(b.brewedAt)) +
        "</p>" +
        '<ul class="sl-kv">' +
        "<li><span>Temperature</span><strong>" +
        esc(b.waterTempC != null ? b.waterTempC + "°C" : "—") +
        "</strong></li>" +
        "<li><span>Leaf / water</span><strong>" +
        esc(
          [b.leafGrams != null ? b.leafGrams + " g" : null, b.waterMl != null ? b.waterMl + " ml" : null]
            .filter(Boolean)
            .join(" / ") || "—"
        ) +
        "</strong></li>" +
        "<li><span>Steep</span><strong>" +
        esc(b.steepSeconds != null ? b.steepSeconds + "s" : "—") +
        "</strong></li>" +
        "<li><span>Infusions</span><strong>" +
        esc(b.infusionCount || "—") +
        "</strong></li>" +
        "<li><span>Vessel</span><strong>" +
        esc(b.vessel || "—") +
        "</strong></li>" +
        "<li><span>Mood</span><strong>" +
        esc(b.mood || "—") +
        "</strong></li>" +
        "<li><span>Rating</span><strong>" +
        esc(stars(b.rating)) +
        "</strong></li>" +
        "<li><span>Flavors</span><strong>" +
        esc((b.flavorNotes || []).join(", ") || "—") +
        "</strong></li>" +
        "</ul>" +
        (b.notes ? "<p>" + esc(b.notes) + "</p>" : "") +
        (cmp
          ? "<h2>Compared with previous brew</h2><ul class=\"sl-brief-list\">" +
            cmp.lines
              .map(function (l) {
                return "<li>" + esc(l) + "</li>";
              })
              .join("") +
            "</ul>" +
            (prev
              ? '<p class="sl-meta"><a href="#session/' +
                encodeURIComponent(prev.id) +
                '">Open previous session</a></p>'
              : "")
          : "<h2>Compared with previous brew</h2><p class=\"sl-empty\">This is your first logged session for this tea.</p>") +
        '<p><button type="button" class="wds-btn wds-btn--ghost" data-del-brew="' +
        esc(b.id) +
        '">Delete session</button></p>'
      );
    }

    function journalPanel() {
      var brews = Store().listBrews().filter(function (b) {
        return b.notes || (b.flavorNotes && b.flavorNotes.length) || b.mood || b.rating != null;
      });
      return (
        "<h1 class=\"sl-title\">Tea Journal</h1>" +
        '<p class="sl-lead">Sessions with notes, mood, flavors, or ratings — your tasting diary.</p>' +
        (brews.length
          ? '<ul class="sl-session-list">' +
            brews
              .map(function (b) {
                var tea = Store().getTea(b.teaId);
                return (
                  "<li><a href=\"#session/" +
                  encodeURIComponent(b.id) +
                  "\"><strong>" +
                  esc((tea && tea.name) || b.teaNameSnapshot || "Tea") +
                  "</strong></a>" +
                  "<span>" +
                  esc(formatDate(b.brewedAt)) +
                  (b.mood ? " · " + b.mood : "") +
                  "</span>" +
                  (b.notes ? "<p>" + esc(b.notes.slice(0, 160)) + (b.notes.length > 160 ? "…" : "") + "</p>" : "") +
                  "</li>"
                );
              })
              .join("") +
            "</ul>"
          : '<p class="sl-empty">No journal entries yet. Finish a brew and add a note — nothing is fabricated for you.</p>')
      );
    }

    function discoverPanel() {
      var teas = Store().listTeas();
      var ownedTypes = {};
      teas.forEach(function (t) {
        if (t.type) ownedTypes[t.type] = (ownedTypes[t.type] || 0) + 1;
      });
      var guides = Guides().BREW_GUIDES;
      var styles = Object.keys(guides).map(function (id) {
        return { id: id, g: guides[id], owned: ownedTypes[id] || 0 };
      });
      return (
        "<h1 class=\"sl-title\">Discover</h1>" +
        '<p class="sl-lead">Explore styles gently. This is not a shop and not a social feed — only education and gaps in <em>your</em> shelf.</p>' +
        '<ul class="sl-discover">' +
        styles
          .map(function (s) {
            return (
              "<li><strong>" +
              esc(s.g.label) +
              "</strong>" +
              "<p>" +
              esc(s.g.flavors) +
              "</p>" +
              '<p class="sl-why">' +
              esc(s.g.why) +
              "</p>" +
              '<p class="sl-meta">' +
              (s.owned
                ? "You have " + s.owned + " in collection · <a href=\"#collection\">Browse</a>"
                : "Not in your collection yet — add one when you buy it, or read about it in Learning.") +
              "</p></li>"
            );
          })
          .join("") +
        "</ul>"
      );
    }

    function learningPanel() {
      var route = parseHash();
      var topics = Guides().LEARNING;
      var id = route.id || state.learnId;
      var topic = topics.filter(function (t) {
        return t.id === id;
      })[0];
      if (topic) {
        return (
          '<p><a href="#learning">← Learning</a></p>' +
          "<h1 class=\"sl-title\">" +
          esc(topic.title) +
          "</h1>" +
          '<p class="sl-lead">' +
          esc(topic.summary) +
          "</p>" +
          '<ul class="sl-brief-list">' +
          topic.body
            .map(function (p) {
              return "<li>" + esc(p) + "</li>";
            })
            .join("") +
          "</ul>"
        );
      }
      return (
        "<h1 class=\"sl-title\">Learning</h1>" +
        '<p class="sl-lead">Practical tea literacy — categories, processing, water, and vocabulary. Short on purpose.</p>' +
        '<ul class="sl-learn-list">' +
        topics
          .map(function (t) {
            return (
              "<li><a href=\"#learning/" +
              encodeURIComponent(t.id) +
              "\"><strong>" +
              esc(t.title) +
              "</strong></a><span>" +
              esc(t.summary) +
              "</span></li>"
            );
          })
          .join("") +
        "</ul>"
      );
    }

    function searchPanel() {
      var res = Store().searchAll(state.q);
      return (
        "<h1 class=\"sl-title\">Search</h1>" +
        '<form id="sl-search" class="sl-form sl-form--inline">' +
        "<label>Query <input name=\"q\" value=\"" +
        esc(state.q) +
        "\" placeholder=\"name, origin, vendor, notes…\" autofocus/></label>" +
        '<button type="submit" class="wds-btn wds-btn--primary">Search</button></form>' +
        (state.q
          ? '<p class="sl-meta">' +
            res.teas.length +
            " teas · " +
            res.brews.length +
            " sessions</p>" +
            "<h2>Teas</h2>" +
            (res.teas.length
              ? "<ul class=\"sl-tea-list\">" +
                res.teas
                  .slice(0, 40)
                  .map(function (t) {
                    return (
                      "<li><a href=\"#tea/" +
                      encodeURIComponent(t.id) +
                      "\">" +
                      esc(t.name) +
                      "</a></li>"
                    );
                  })
                  .join("") +
                "</ul>"
              : '<p class="sl-empty">No matching teas.</p>') +
            "<h2>Sessions / journal</h2>" +
            (res.brews.length
              ? "<ul class=\"sl-session-list\">" +
                res.brews
                  .slice(0, 40)
                  .map(function (b) {
                    return (
                      "<li><a href=\"#session/" +
                      encodeURIComponent(b.id) +
                      "\">" +
                      esc(b.teaNameSnapshot || "Session") +
                      "</a> · " +
                      esc(formatDate(b.brewedAt)) +
                      "</li>"
                    );
                  })
                  .join("") +
                "</ul>"
              : '<p class="sl-empty">No matching sessions.</p>')
          : '<p class="sl-lead">Search your private collection and journal. Results stay on this device.</p>')
      );
    }

    function settingsPanel() {
      var prefs = Store().getPreferences();
      return (
        "<h1 class=\"sl-title\">Settings</h1>" +
        '<p class="sl-lead">Preferences and private data controls. Nothing syncs unless you export it yourself.</p>' +
        '<form id="sl-prefs" class="sl-form">' +
        "<label>Default vessel <input name=\"vessel\" value=\"" +
        esc(prefs.defaultVessel) +
        "\"/></label>" +
        "<label>Preferred styles (comma type ids) <input name=\"types\" value=\"" +
        esc((prefs.preferredTypes || []).join(", ")) +
        "\" placeholder=\"green, oolong\"/></label>" +
        '<button type="submit" class="wds-btn wds-btn--primary">Save preferences</button></form>' +
        "<h2>Your data</h2>" +
        '<p class="sl-actions">' +
        '<button type="button" class="wds-btn wds-btn--ghost" id="sl-export">Export JSON</button> ' +
        '<label class="wds-btn wds-btn--ghost">Import JSON<input type="file" id="sl-import" accept="application/json,.json" hidden/></label> ' +
        '<button type="button" class="wds-btn wds-btn--ghost" id="sl-clear">Clear all Steepleaf data</button></p>' +
        '<p class="sl-meta">Storage keys: teas, brews, preferences — all local.</p>' +
        (state.flash ? '<p class="sl-flash" role="status">' + esc(state.flash) + "</p>" : "")
      );
    }

    function body() {
      var route = parseHash();
      if (route.panel === "home") return homePanel();
      if (route.panel === "brew") return brewPanel();
      if (route.panel === "collection") return collectionPanel();
      if (route.panel === "tea") return teaDetail(route.id);
      if (route.panel === "sessions") return sessionsPanel();
      if (route.panel === "session") return sessionDetail(route.id);
      if (route.panel === "journal") return journalPanel();
      if (route.panel === "discover") return discoverPanel();
      if (route.panel === "learning") return learningPanel();
      if (route.panel === "search") return searchPanel();
      if (route.panel === "settings") return settingsPanel();
      return homePanel();
    }

    function stopTimer() {
      if (state.timer) {
        clearInterval(state.timer);
        state.timer = null;
      }
      state.timerRunning = false;
    }

    function formatRemain(sec) {
      var s = Math.max(0, Math.round(sec));
      var m = Math.floor(s / 60);
      var r = s % 60;
      return m + ":" + (r < 10 ? "0" : "") + r;
    }

    function paint() {
      try {
        if (global.performance && performance.mark) performance.mark("sl-paint");
      } catch (e0) { /* noop */ }
      root.innerHTML =
        '<div class="sl-app">' +
        '<div class="sl-shell">' +
        navHtml() +
        '<div class="sl-main" id="sl-main">' +
        body() +
        "</div></div>" +
        '<p class="sl-disclaimer">Private on this device. Recommendations explain their reasons. Steepleaf never invents tasting journals.</p></div>';
      bind();
      root.removeAttribute("aria-busy");
    }

    function bind() {
      var route = parseHash();

      var col = root.querySelector("#sl-collection-filters");
      if (col) {
        col.addEventListener("submit", function (ev) {
          ev.preventDefault();
          var fd = new FormData(col);
          state.collectionFilter = String(fd.get("type") || "all");
          state.collectionSort = String(fd.get("sort") || "updated");
          state.collectionOrigin = String(fd.get("origin") || "");
          paint();
        });
      }

      var add = root.querySelector("#sl-add-tea");
      if (add) {
        add.addEventListener("submit", function (ev) {
          ev.preventDefault();
          var fd = new FormData(add);
          var tea = Store().createTea({
            name: String(fd.get("name") || "").trim(),
            type: String(fd.get("type") || "") || null,
            origin: String(fd.get("origin") || "") || null,
            region: String(fd.get("region") || "") || null,
            harvestYear: fd.get("year") || null,
            vendor: String(fd.get("vendor") || "") || null,
            storageLocation: String(fd.get("storage") || "") || null,
            remainingQuantity: String(fd.get("qty") || "") || null,
            favorite: !!fd.get("favorite"),
            purchaseDate: String(fd.get("purchaseDate") || "") || null,
            notes: String(fd.get("notes") || "") || null
          });
          if (!tea.name || tea.name === "Untitled tea") return;
          Store().saveTea(tea);
          setHash("tea", tea.id);
        });
      }

      root.querySelectorAll("[data-toggle-fav]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var t = Store().getTea(btn.getAttribute("data-toggle-fav"));
          if (!t) return;
          t.favorite = !t.favorite;
          Store().saveTea(t);
          paint();
        });
      });

      root.querySelectorAll("[data-del-tea]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (!global.confirm("Remove this tea from your collection?")) return;
          Store().deleteTea(btn.getAttribute("data-del-tea"));
          setHash("collection");
        });
      });

      root.querySelectorAll("[data-del-brew]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (!global.confirm("Delete this brew session?")) return;
          Store().deleteBrew(btn.getAttribute("data-del-brew"));
          setHash("sessions");
        });
      });

      var brewForm = root.querySelector("#sl-brew-form");
      var timerPanel = root.querySelector("#sl-timer-panel");
      var completeForm = root.querySelector("#sl-session-complete");

      function captureDraft() {
        if (!brewForm) return null;
        var fd = new FormData(brewForm);
        return {
          teaId: brewForm.getAttribute("data-tea"),
          waterTempC: fd.get("temp") !== "" ? Number(fd.get("temp")) : null,
          leafGrams: fd.get("leaf") !== "" ? Number(fd.get("leaf")) : null,
          waterMl: fd.get("water") !== "" ? Number(fd.get("water")) : null,
          steepSeconds: fd.get("steep") !== "" ? Number(fd.get("steep")) : null,
          vessel: String(fd.get("vessel") || "") || null
        };
      }

      function showComplete() {
        if (timerPanel) timerPanel.hidden = true;
        if (completeForm) completeForm.hidden = false;
        stopTimer();
      }

      if (brewForm) {
        brewForm.addEventListener("submit", function (ev) {
          ev.preventDefault();
          state.brewDraft = captureDraft();
          showComplete();
        });
      }

      var startBtn = root.querySelector("#sl-start-timer");
      if (startBtn && brewForm && timerPanel) {
        startBtn.addEventListener("click", function () {
          state.brewDraft = captureDraft();
          state.timerRemain = Number(state.brewDraft.steepSeconds) || 0;
          if (state.timerRemain <= 0) state.timerRemain = 60;
          timerPanel.hidden = false;
          if (completeForm) completeForm.hidden = true;
          var display = timerPanel.querySelector(".sl-timer-display");
          var toggle = root.querySelector("#sl-timer-toggle");
          stopTimer();
          state.timerRunning = true;
          if (display) display.textContent = formatRemain(state.timerRemain);
          if (toggle) toggle.textContent = "Pause";
          state.timer = setInterval(function () {
            if (!state.timerRunning) return;
            state.timerRemain -= 1;
            if (display) display.textContent = formatRemain(state.timerRemain);
            if (state.timerRemain <= 0) {
              stopTimer();
              if (display) display.textContent = "0:00 — done";
              if (toggle) toggle.textContent = "Done";
              try {
                if (global.navigator && navigator.vibrate) navigator.vibrate(200);
              } catch (e1) { /* noop */ }
            }
          }, 1000);
        });
      }

      var toggle = root.querySelector("#sl-timer-toggle");
      if (toggle) {
        toggle.addEventListener("click", function () {
          if (state.timerRemain <= 0) {
            showComplete();
            return;
          }
          state.timerRunning = !state.timerRunning;
          toggle.textContent = state.timerRunning ? "Pause" : "Resume";
        });
      }

      var done = root.querySelector("#sl-timer-done");
      if (done) {
        done.addEventListener("click", function () {
          showComplete();
        });
      }

      if (completeForm) {
        completeForm.addEventListener("submit", function (ev) {
          ev.preventDefault();
          var draft = state.brewDraft || captureDraft() || {};
          var fd = new FormData(completeForm);
          var flavors = String(fd.get("flavors") || "")
            .split(",")
            .map(function (s) {
              return s.trim();
            })
            .filter(Boolean);
          var brew = Store().createBrew({
            teaId: draft.teaId || (brewForm && brewForm.getAttribute("data-tea")),
            waterTempC: draft.waterTempC,
            leafGrams: draft.leafGrams,
            waterMl: draft.waterMl,
            steepSeconds: draft.steepSeconds,
            vessel: draft.vessel,
            infusionCount: fd.get("infusions") !== "" ? Number(fd.get("infusions")) : 1,
            mood: String(fd.get("mood") || "") || null,
            rating: fd.get("rating") !== "" ? Number(fd.get("rating")) : null,
            flavorNotes: flavors,
            notes: String(fd.get("notes") || "") || null
          });
          Store().saveBrew(brew);
          state.brewDraft = null;
          stopTimer();
          setHash("session", brew.id);
        });
      }

      var search = root.querySelector("#sl-search");
      if (search) {
        search.addEventListener("submit", function (ev) {
          ev.preventDefault();
          state.q = String(new FormData(search).get("q") || "");
          paint();
        });
      }

      var prefs = root.querySelector("#sl-prefs");
      if (prefs) {
        prefs.addEventListener("submit", function (ev) {
          ev.preventDefault();
          var fd = new FormData(prefs);
          var types = String(fd.get("types") || "")
            .split(",")
            .map(function (s) {
              return s.trim();
            })
            .filter(Boolean);
          Store().setPreferences({
            defaultVessel: String(fd.get("vessel") || "gaiwan"),
            preferredTypes: types
          });
          flash("Preferences saved.");
          paint();
        });
      }

      var exp = root.querySelector("#sl-export");
      if (exp) {
        exp.addEventListener("click", function () {
          var blob = new Blob([JSON.stringify(Store().exportBundle(), null, 2)], {
            type: "application/json"
          });
          var a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "steepleaf-export-" + new Date().toISOString().slice(0, 10) + ".json";
          a.click();
          flash("Export downloaded.");
          paint();
        });
      }

      var imp = root.querySelector("#sl-import");
      if (imp) {
        imp.addEventListener("change", function () {
          var file = imp.files && imp.files[0];
          if (!file) return;
          var reader = new FileReader();
          reader.onload = function () {
            try {
              var data = JSON.parse(String(reader.result || ""));
              var res = Store().importBundle(data, "merge");
              flash(res.ok ? "Import merged." : res.error || "Import failed.");
            } catch (e) {
              flash("Import failed — invalid JSON.");
            }
            paint();
          };
          reader.readAsText(file);
        });
      }

      var clear = root.querySelector("#sl-clear");
      if (clear) {
        clear.addEventListener("click", function () {
          if (!global.confirm("Clear all Steepleaf teas and sessions on this device?")) return;
          Store().clearAll();
          flash("Local Steepleaf data cleared.");
          setHash("home");
          paint();
        });
      }
    }

    if (!global.location.hash) setHash("home");
    global.addEventListener("hashchange", function () {
      stopTimer();
      paint();
    });
    try {
      if (global.performance && performance.mark) performance.mark("sl-mount");
    } catch (e2) { /* noop */ }
    paint();
  }

  global.WDS = global.WDS || {};
  global.WDS.steepleafApp = { mount: mount, NAV: NAV };
})(typeof window !== "undefined" ? window : globalThis);
