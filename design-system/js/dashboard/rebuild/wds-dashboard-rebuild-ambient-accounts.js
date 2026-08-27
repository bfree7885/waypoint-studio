/**
 * Waypoint Ambient accounts client — session, entitlement, restrained billing UX.
 * Server is authoritative. Memory cache only. Never localStorage for paid access.
 * Billing failure degrades to free/preview. Discover is not gated.
 */
(function (global) {
  "use strict";

  var PRICE_LABEL = "$4.99/month";
  var sessionCache = {
    auth: "anonymous",
    email: null,
    accountId: null,
    ambient: { entitled: false, status: "none", surface: "none", periodEnd: null }
  };
  var healthCache = { ok: false, stripe: "unknown", liveBilling: false };
  var lastSerialized = "";
  var inflight = null;
  var confirmTimer = null;
  var statusMessage = "";
  var showSignIn = false;
  var emailDraft = "";
  var busy = "";
  var testMagicUrl = "";

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function accountsOrigin() {
    try {
      var meta = global.document && global.document.querySelector('meta[name="waypoint-accounts-origin"]');
      var override = meta && meta.getAttribute("content") ? String(meta.getAttribute("content")).trim() : "";
      if (override) return override.replace(/\/$/, "");
    } catch (e) {
      /* ignore */
    }
    var host = "";
    try {
      host = String((global.location && global.location.hostname) || "");
    } catch (e2) {
      host = "";
    }
    if (host === "waypointstudio.org" || host === "www.waypointstudio.org") {
      return "https://accounts.waypointstudio.org";
    }
    return "http://127.0.0.1:8787";
  }

  function hashQuery() {
    var hash = "";
    try {
      hash = String((global.location && global.location.hash) || "");
    } catch (e) {
      hash = "";
    }
    var i = hash.indexOf("?");
    if (i < 0) return {};
    var out = {};
    try {
      var params = new URLSearchParams(hash.slice(i + 1));
      params.forEach(function (v, k) {
        out[k] = v;
      });
    } catch (e2) {
      /* ignore */
    }
    return out;
  }

  function isEntitled() {
    return !!(sessionCache && sessionCache.ambient && sessionCache.ambient.entitled === true);
  }

  function session() {
    return sessionCache;
  }

  function isMock() {
    return healthCache.stripe === "mock";
  }

  async function fetchJson(path, options) {
    options = options || {};
    var url = accountsOrigin() + path;
    var init = {
      method: options.method || "GET",
      credentials: "include",
      headers: options.headers || {}
    };
    if (options.body) {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    var res = await fetch(url, init);
    var json = null;
    try {
      json = await res.json();
    } catch (e) {
      json = null;
    }
    return { ok: res.ok, status: res.status, json: json || {} };
  }

  async function refreshHealth() {
    try {
      var res = await fetchJson("/v1/health");
      if (res.ok && res.json) {
        healthCache = {
          ok: true,
          stripe: res.json.stripe || "unknown",
          liveBilling: res.json.liveBilling === true
        };
      } else {
        healthCache = { ok: false, stripe: "unknown", liveBilling: false };
      }
    } catch (e) {
      healthCache = { ok: false, stripe: "unknown", liveBilling: false };
    }
    return healthCache;
  }

  async function refresh() {
    if (inflight) return inflight;
    inflight = (async function () {
      var previous = lastSerialized;
      try {
        var res = await fetchJson("/v1/session");
        if (res.ok && res.json && res.json.auth) {
          sessionCache = res.json;
        } else {
          sessionCache = {
            auth: "anonymous",
            email: null,
            accountId: null,
            ambient: { entitled: false, status: "none", surface: "none", periodEnd: null }
          };
        }
      } catch (e) {
        sessionCache = {
          auth: "anonymous",
          email: null,
          accountId: null,
          ambient: { entitled: false, status: "none", surface: "none", periodEnd: null }
        };
      }
      lastSerialized = JSON.stringify(sessionCache);
      inflight = null;
      return lastSerialized !== previous;
    })();
    return inflight;
  }

  function applyQueryMessages() {
    var q = hashQuery();
    if (q.auth === "invalid") statusMessage = "That sign-in link is not valid.";
    else if (q.auth === "reused") statusMessage = "That sign-in link was already used. Request a new one.";
    else if (q.auth === "expired") statusMessage = "That sign-in link expired. Request a new one.";
    else if (q.checkout === "cancel") statusMessage = "Checkout was canceled. Discover is still free.";
    else if (q.checkout === "success" && !isEntitled()) {
      statusMessage = "Confirming subscription…";
    } else if (q.checkout === "success" && isEntitled()) {
      statusMessage = "Waypoint Ambient is active on this account.";
    } else if (q.portal === "canceled") {
      statusMessage = "If cancellation completed, paid watching-over-time will stop after the server updates.";
    }
  }

  function startCheckoutConfirm(onChange) {
    if (confirmTimer) return;
    var q = hashQuery();
    if (q.checkout !== "success") return;
    var attempts = 0;
    confirmTimer = global.setInterval(function () {
      attempts += 1;
      refresh().then(function (changed) {
        if (isEntitled()) {
          statusMessage = "Waypoint Ambient is active on this account.";
          global.clearInterval(confirmTimer);
          confirmTimer = null;
          if (onChange) onChange(true);
          return;
        }
        if (attempts >= 12) {
          statusMessage =
            "Checkout finished, but the subscription is not active yet. Wait a moment and refresh — we will not treat the redirect as payment.";
          global.clearInterval(confirmTimer);
          confirmTimer = null;
          if (onChange) onChange(true);
        } else if (changed && onChange) onChange(true);
      });
    }, 1500);
  }

  function renderChrome() {
    applyQueryMessages();
    var auth = sessionCache.auth || "anonymous";
    var ambient = sessionCache.ambient || {};
    var surface = ambient.surface || "none";
    var entitled = ambient.entitled === true;
    var bits = [];
    bits.push('<div class="wdb-r-ambient__account" data-ambient-account data-auth="' + escapeHtml(auth) + '" data-surface="' + escapeHtml(entitled ? "active" : surface) + '">');
    bits.push('<p class="wdb-r-ambient__account-lede">Waypoint watches local conditions over time and tells you what\'s changing and what\'s worth your attention.</p>');
    bits.push('<p class="wdb-r-ambient__account-price">Waypoint Ambient · ' + PRICE_LABEL + '</p>');
    bits.push('<p class="wdb-r-ambient__account-free">Discover — Today, weather, alerts, and instruments — stays free.</p>');

    if (auth === "anonymous") {
      bits.push('<p class="wdb-r-ambient__account-status">Signed out · preview</p>');
      bits.push('<div class="wdb-r-ambient__account-actions">');
      bits.push('<button type="button" class="wdb-r-ambient__btn" data-ambient-action="signin">Sign in</button>');
      bits.push('<button type="button" class="wdb-r-ambient__btn wdb-r-ambient__btn--primary" data-ambient-action="get">Get Ambient</button>');
      bits.push("</div>");
    } else if (entitled) {
      bits.push('<p class="wdb-r-ambient__account-status">Signed in as ' + escapeHtml(sessionCache.email || "") + " · Ambient active</p>");
      bits.push('<div class="wdb-r-ambient__account-actions">');
      bits.push('<button type="button" class="wdb-r-ambient__btn" data-ambient-action="portal">Manage subscription</button>');
      bits.push('<button type="button" class="wdb-r-ambient__btn" data-ambient-action="logout">Sign out</button>');
      bits.push("</div>");
    } else if (surface === "inactive") {
      bits.push('<p class="wdb-r-ambient__account-status">Signed in as ' + escapeHtml(sessionCache.email || "") + " · Ambient inactive</p>");
      bits.push('<div class="wdb-r-ambient__account-actions">');
      bits.push('<button type="button" class="wdb-r-ambient__btn wdb-r-ambient__btn--primary" data-ambient-action="subscribe">Resubscribe</button>');
      bits.push('<button type="button" class="wdb-r-ambient__btn" data-ambient-action="logout">Sign out</button>');
      bits.push("</div>");
    } else {
      bits.push('<p class="wdb-r-ambient__account-status">Signed in as ' + escapeHtml(sessionCache.email || "") + " · Ambient preview</p>");
      bits.push('<div class="wdb-r-ambient__account-actions">');
      bits.push('<button type="button" class="wdb-r-ambient__btn wdb-r-ambient__btn--primary" data-ambient-action="subscribe">Get Ambient</button>');
      bits.push('<button type="button" class="wdb-r-ambient__btn" data-ambient-action="logout">Sign out</button>');
      bits.push("</div>");
    }

    if (showSignIn && auth === "anonymous") {
      bits.push('<form class="wdb-r-ambient__signin" data-ambient-signin>');
      bits.push('<label class="wdb-r-ambient__signin-label" for="wdb-r-ambient-email">Email</label>');
      bits.push(
        '<input id="wdb-r-ambient-email" class="wdb-r-ambient__signin-input" type="email" name="email" autocomplete="email" required value="' +
          escapeHtml(emailDraft) +
          '">'
      );
      bits.push('<button type="submit" class="wdb-r-ambient__btn wdb-r-ambient__btn--primary"' + (busy === "magic" ? " disabled" : "") + ">Send sign-in link</button>");
      bits.push('<p class="wdb-r-ambient__signin-note">We email a single-use link that expires in 15 minutes. No password.</p>');
      bits.push("</form>");
    }

    bits.push(
      '<p class="wdb-r-ambient__privacy">Waypoint stores the account email. Stripe processes payment; Waypoint does not receive card numbers. Ambient snapshot history stays on this device. This subscription does not create cloud location history, and it does not include future radio or AI features. <a href="../../privacy.html">Privacy</a> · <a href="../../terms.html">Terms</a></p>'
    );
    if (statusMessage) {
      bits.push('<p class="wdb-r-ambient__account-msg" role="status">' + escapeHtml(statusMessage) + "</p>");
    }
    if (testMagicUrl) {
      bits.push(
        '<p class="wdb-r-ambient__account-msg"><a class="wdb-r-ambient__magic-link" data-ambient-test-magic href="' +
          escapeHtml(testMagicUrl) +
          '">Open test-mode sign-in link</a></p>'
      );
    }
    if (busy === "checkout") {
      bits.push('<p class="wdb-r-ambient__account-msg" role="status">Opening checkout…</p>');
    }
    bits.push("</div>");
    return bits.join("");
  }

  function renderPreviewNote() {
    if (isEntitled()) return "";
    return (
      '<p class="wdb-r-ambient__paid-note">Watching conditions over time — recent context and what changed — is Waypoint Ambient, ' +
      PRICE_LABEL +
      ". This preview shows current conditions from the same sources as free Discover.</p>"
    );
  }

  function bind(host, onChange) {
    if (!host || typeof host.querySelector !== "function") return;
    var root = host.querySelector("[data-ambient-account]") || host;
    function paintSoon() {
      if (onChange) onChange();
    }
    root.addEventListener("click", function (ev) {
      var t = ev.target;
      if (!t || !t.getAttribute) return;
      var action = t.getAttribute("data-ambient-action");
      if (!action) return;
      ev.preventDefault();
      if (action === "signin" || action === "get") {
        showSignIn = true;
        if (sessionCache.auth === "authenticated") startCheckout(paintSoon);
        else paintSoon();
        return;
      }
      if (action === "subscribe") {
        startCheckout(paintSoon);
        return;
      }
      if (action === "portal") {
        openPortal(paintSoon);
        return;
      }
      if (action === "logout") {
        logout().then(paintSoon);
      }
    });
    var form = host.querySelector("[data-ambient-signin]");
    if (form) {
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var input = form.querySelector('input[name="email"]');
        var email = input ? String(input.value || "").trim() : "";
        emailDraft = email;
        requestMagicLink(email).then(paintSoon);
      });
    }
  }

  async function requestMagicLink(email) {
    busy = "magic";
    statusMessage = "";
    testMagicUrl = "";
    try {
      await refreshHealth();
      var res = await fetchJson("/v1/auth/magic-link", {
        method: "POST",
        body: { email: email, next: "/apps/dashboard/#/ambient" }
      });
      busy = "";
      if (res.status === 503) {
        statusMessage = "We could not send email just now. Try again in a moment.";
        return;
      }
      statusMessage = "If that address can receive mail, we sent a sign-in link.";
      if (isMock()) {
        try {
          var captured = await fetchJson("/__test/last-magic-link");
          if (captured.ok && captured.json && captured.json.url) {
            testMagicUrl = captured.json.url;
            statusMessage =
              "Test mode (no email provider): use the one-time sign-in link below. Production sends email instead.";
            global.__wpLastMagicLink = captured.json.url;
          }
        } catch (e) {
          /* ignore */
        }
      }
    } catch (e) {
      busy = "";
      statusMessage = "We could not reach the accounts service. Discover still works.";
    }
  }

  async function startCheckout(onChange) {
    if (sessionCache.auth !== "authenticated") {
      showSignIn = true;
      statusMessage = "Sign in with email first. Then you can subscribe to Ambient for " + PRICE_LABEL + ".";
      if (onChange) onChange();
      return;
    }
    busy = "checkout";
    if (onChange) onChange();
    try {
      var res = await fetchJson("/v1/checkout", { method: "POST", body: {} });
      busy = "";
      if (res.status === 401) {
        statusMessage = "Sign in to subscribe.";
        showSignIn = true;
      } else if (!res.ok || !res.json.url) {
        statusMessage = "Checkout is unavailable right now. Discover still works.";
      } else {
        global.location.href = res.json.url;
        return;
      }
    } catch (e) {
      busy = "";
      statusMessage = "Checkout is unavailable right now. Discover still works.";
    }
    if (onChange) onChange();
  }

  async function openPortal(onChange) {
    try {
      var res = await fetchJson("/v1/portal", { method: "POST", body: {} });
      if (!res.ok || !res.json.url) {
        statusMessage = "The billing portal is unavailable right now.";
        if (onChange) onChange();
        return;
      }
      global.location.href = res.json.url;
    } catch (e) {
      statusMessage = "The billing portal is unavailable right now.";
      if (onChange) onChange();
    }
  }

  async function logout() {
    try {
      await fetchJson("/v1/auth/logout", { method: "POST", body: {} });
    } catch (e) {
      /* still clear local cache */
    }
    sessionCache = {
      auth: "anonymous",
      email: null,
      accountId: null,
      ambient: { entitled: false, status: "none", surface: "none", periodEnd: null }
    };
    lastSerialized = JSON.stringify(sessionCache);
    statusMessage = "Signed out. Ambient preview remains available.";
    showSignIn = false;
  }

  function noteAmbientView(onChange) {
    refreshHealth()
      .then(function () {
        return refresh();
      })
      .then(function (changed) {
        applyQueryMessages();
        startCheckoutConfirm(onChange);
        if (changed && onChange) onChange();
      });
  }

  global.WDS = global.WDS || {};
  global.WDS.waypointAccounts = {
    version: "1.0.0",
    accountsOrigin: accountsOrigin,
    isEntitled: isEntitled,
    session: session,
    refresh: refresh,
    refreshHealth: refreshHealth,
    renderChrome: renderChrome,
    renderPreviewNote: renderPreviewNote,
    bind: bind,
    noteAmbientView: noteAmbientView,
    requestMagicLink: requestMagicLink,
    startCheckout: startCheckout,
    openPortal: openPortal,
    logout: logout,
    PRICE_LABEL: PRICE_LABEL,
    applySessionForTests: function (next) {
      sessionCache = next;
      lastSerialized = JSON.stringify(sessionCache);
    }
  };
})(typeof window !== "undefined" ? window : global);
