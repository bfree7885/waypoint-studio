/**
 * Waypoint Studio — Contact & Support client (v1)
 * Shared form: validation, context prefill, FormSubmit delivery, spam guards.
 */
(function (global) {
  "use strict";

  var DEFAULT_MAIL = "contact@waypointstudio.org";
  var DEFAULT_CONFIG_PATH = "design-system/ecosystem/contact-config.json";
  var RATE_KEY = "waypoint-contact-rate-v1";
  var DRAFT_KEY = "waypoint-contact-draft-v1";
  var MAX_SUBJECT = 200;

  var state = {
    config: null,
    loadedAt: 0,
    submitting: false
  };

  function $(id) {
    return document.getElementById(id);
  }

  function sanitizeLine(s) {
    return String(s == null ? "" : s).replace(/[\r\n\x00]+/g, " ").trim();
  }

  function sanitizeMultiline(s) {
    return String(s == null ? "" : s).replace(/\x00/g, "").trim();
  }

  function mailbox(cfg) {
    return (cfg && cfg.developer && cfg.developer.email) || DEFAULT_MAIL;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function resolveConfigPath() {
    var el = document.querySelector("[data-wcs-config]");
    if (el && el.getAttribute("data-wcs-config")) return el.getAttribute("data-wcs-config");
    var depth = 0;
    var shell = document.querySelector("[data-shell-depth]");
    if (shell) depth = Number(shell.getAttribute("data-shell-depth") || 0) || 0;
    var prefix = depth > 0 ? new Array(depth + 1).join("../") : "";
    return prefix + DEFAULT_CONFIG_PATH;
  }

  function studioRootHref(depth) {
    depth = depth == null ? 0 : depth;
    return depth > 0 ? new Array(depth + 1).join("../") : "./";
  }

  function contactHref(opts, depth) {
    opts = opts || {};
    var base = studioRootHref(depth) + "contact.html";
    var q = [];
    Object.keys(opts).forEach(function (k) {
      if (opts[k] == null || opts[k] === "") return;
      q.push(encodeURIComponent(k) + "=" + encodeURIComponent(String(opts[k])));
    });
    return q.length ? base + "?" + q.join("&") : base;
  }

  async function loadConfig() {
    if (state.config) return state.config;
    var path = resolveConfigPath();
    var res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load contact configuration.");
    state.config = await res.json();
    state.loadedAt = Date.now();
    return state.config;
  }

  function gatherBrowserContext() {
    var buildMeta = document.querySelector('meta[name="waypoint-build"]');
    return {
      pageUrl: location.href,
      pagePath: location.pathname + location.search,
      referrer: document.referrer || "",
      userAgent: navigator.userAgent || "",
      language: navigator.language || "",
      platform: navigator.platform || "",
      viewport: Math.round(window.innerWidth) + "×" + Math.round(window.innerHeight),
      timezone: (Intl.DateTimeFormat().resolvedOptions().timeZone) || "",
      build: buildMeta ? buildMeta.getAttribute("content") : "unknown",
      online: navigator.onLine !== false
    };
  }

  function parseQuery() {
    var out = {};
    var q = location.search.replace(/^\?/, "");
    if (!q) return out;
    q.split("&").forEach(function (pair) {
      var i = pair.indexOf("=");
      if (i < 0) return;
      var k = decodeURIComponent(pair.slice(0, i));
      var v = decodeURIComponent(pair.slice(i + 1).replace(/\+/g, " "));
      out[k] = v;
    });
    return out;
  }

  function readRate() {
    try {
      return JSON.parse(localStorage.getItem(RATE_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function writeRate(arr) {
    try {
      localStorage.setItem(RATE_KEY, JSON.stringify(arr.slice(-20)));
    } catch (e) { /* private mode */ }
  }

  function rateLimitOk(cfg) {
    var max = (cfg.spam && cfg.spam.maxSubmissionsPerHour) || 3;
    var now = Date.now();
    var hourAgo = now - 60 * 60 * 1000;
    var recent = readRate().filter(function (t) { return t > hourAgo; });
    writeRate(recent);
    return recent.length < max;
  }

  function recordSubmission() {
    var recent = readRate();
    recent.push(Date.now());
    writeRate(recent);
  }

  function validate(payload, cfg) {
    var errors = [];
    var spam = cfg.spam || {};
    if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      errors.push({ field: "email", message: "Please enter a valid email so I can reply." });
    }
    if (!payload.category) {
      errors.push({ field: "category", message: "Choose a category." });
    }
    var subject = sanitizeLine(payload.subject);
    if (!subject || subject.length < 3) {
      errors.push({ field: "subject", message: "Add a short subject." });
    }
    if (subject.length > MAX_SUBJECT) {
      errors.push({ field: "subject", message: "Subject is too long (max " + MAX_SUBJECT + " characters)." });
    }
    var msg = sanitizeMultiline(payload.message);
    var minM = spam.minMessageLength || 10;
    var maxM = spam.maxMessageLength || 8000;
    if (msg.length < minM) {
      errors.push({ field: "message", message: "Please write a bit more so I can help." });
    }
    if (msg.length > maxM) {
      errors.push({ field: "message", message: "Message is too long (max " + maxM + " characters)." });
    }
    if (!payload.consent) {
      errors.push({ field: "consent", message: "Please confirm you understand how this message is handled." });
    }
    if (payload.honeypot) {
      errors.push({ field: "honeypot", message: "Spam check failed." });
    }
    var minSec = spam.minSecondsOnPage || 3;
    if (state.loadedAt && Date.now() - state.loadedAt < minSec * 1000) {
      errors.push({ field: "timing", message: "Please wait a moment and try again." });
    }
    if (!rateLimitOk(cfg)) {
      errors.push({ field: "rate", message: "Too many messages from this browser recently. Please try again later." });
    }
    if (!navigator.onLine) {
      errors.push({
        field: "offline",
        message: "You appear offline. Reconnect and try again, or email " + mailbox(cfg) + " directly."
      });
    }
    return errors;
  }

  function categoryLabel(cfg, id) {
    var c = (cfg.categories || []).find(function (x) { return x.id === id; });
    return c ? c.label : id;
  }

  function appLabel(cfg, id) {
    var a = (cfg.apps || []).find(function (x) { return x.id === id; });
    return a ? a.label : id;
  }

  function buildDeliveryBody(payload, cfg, ctx) {
    var subjectClean = sanitizeLine(payload.subject).slice(0, MAX_SUBJECT);
    var subject = "[Waypoint] " + categoryLabel(cfg, payload.category) + ": " + subjectClean;
    var submittedAt = new Date().toISOString();
    var lines = [
      "Category: " + categoryLabel(cfg, payload.category),
      "App: " + (payload.app ? appLabel(cfg, payload.app) : "(none)"),
      "From: " + (sanitizeLine(payload.name) || "(no name)") + " <" + sanitizeLine(payload.email) + ">",
      "Submitted (UTC): " + submittedAt,
      "",
      sanitizeMultiline(payload.message),
      "",
      "— Context —",
      "Source page: " + sanitizeLine(ctx.pagePath || ctx.pageUrl || ""),
      "Production URL: " + sanitizeLine(ctx.pageUrl || ""),
      "Build: " + sanitizeLine(ctx.build || ""),
      "Viewport: " + sanitizeLine(ctx.viewport || ""),
      "Platform: " + sanitizeLine(ctx.platform || ""),
      "Language: " + sanitizeLine(ctx.language || ""),
      "Timezone: " + sanitizeLine(ctx.timezone || ""),
      "Browser: " + sanitizeLine(ctx.userAgent || ""),
      "Include tech details: " + (payload.includeTech ? "yes" : "no")
    ];
    return {
      _subject: subject,
      _template: "table",
      _captcha: "false",
      _honey: "",
      email: sanitizeLine(payload.email),
      name: sanitizeLine(payload.name) || "",
      message: lines.join("\n"),
      category: payload.category,
      app: payload.app || "",
      subject: subjectClean,
      replyto: sanitizeLine(payload.email),
      _replyto: sanitizeLine(payload.email)
    };
  }

  async function deliver(payload, cfg, ctx) {
    var endpoint = (cfg.delivery && (cfg.delivery.overrideEndpoint || cfg.delivery.endpoint)) || "";
    if (!endpoint) throw new Error("No delivery endpoint configured.");

    var body = buildDeliveryBody(payload, cfg, ctx);
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = null;
    if (controller) {
      timer = setTimeout(function () { controller.abort(); }, 20000);
    }

    try {
      var res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(body),
        signal: controller ? controller.signal : undefined
      });
      var data = null;
      try { data = await res.json(); } catch (e) { data = null; }

      if (!res.ok) {
        var err = new Error((data && (data.error || data.message)) || ("Delivery failed (" + res.status + ")."));
        err.status = res.status;
        err.permanent = res.status >= 400 && res.status < 500 && res.status !== 429;
        throw err;
      }
      // FormSubmit often returns HTTP 200 with success:"false" for provider rejection
      var success = data && data.success;
      if (success === false || success === "false") {
        var reject = new Error((data && (data.message || data.error)) || "Delivery was rejected by the email provider.");
        reject.provider = true;
        throw reject;
      }
      return { ok: true, data: data };
    } catch (e) {
      if (e && e.name === "AbortError") {
        var t = new Error("The request timed out. Please try again, or email " + mailbox(cfg) + ".");
        t.timeout = true;
        throw t;
      }
      throw e;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function fillSelect(sel, items, selected) {
    if (!sel) return;
    sel.innerHTML = items.map(function (it) {
      var s = it.id === selected ? " selected" : "";
      return "<option value=\"" + esc(it.id) + "\"" + s + ">" + esc(it.label) + "</option>";
    }).join("");
  }

  function showStatus(el, kind, text) {
    if (!el) return;
    el.hidden = false;
    el.className = "wcs-status wcs-status--" + kind;
    el.setAttribute("role", kind === "err" ? "alert" : "status");
    el.textContent = text;
  }

  function clearFieldErrors(form) {
    form.querySelectorAll("[data-wcs-error]").forEach(function (n) { n.remove(); });
    form.querySelectorAll("[aria-invalid]").forEach(function (n) { n.removeAttribute("aria-invalid"); });
  }

  function setFieldError(form, field, message) {
    var input = form.querySelector("[name=\"" + field + "\"]") || $(field);
    if (input) {
      input.setAttribute("aria-invalid", "true");
      var id = input.id || field;
      var err = document.createElement("p");
      err.className = "wcs-status wcs-status--err";
      err.setAttribute("data-wcs-error", field);
      err.id = id + "-error";
      err.textContent = message;
      input.setAttribute("aria-describedby", err.id);
      var fieldWrap = input.closest(".wds-field") || input.closest(".wcs-check") || input.parentNode;
      fieldWrap.appendChild(err);
    }
  }

  function readForm(form, cfg) {
    var fd = new FormData(form);
    var honey = cfg.spam && cfg.spam.honeypotField ? String(fd.get(cfg.spam.honeypotField) || "") : "";
    return {
      name: String(fd.get("name") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      category: String(fd.get("category") || "").trim(),
      subject: String(fd.get("subject") || "").trim(),
      message: String(fd.get("message") || "").trim(),
      app: String(fd.get("app") || "").trim(),
      includeTech: !!form.querySelector("[name=\"includeTech\"]:checked"),
      consent: !!form.querySelector("[name=\"consent\"]:checked"),
      honeypot: honey
    };
  }

  function applyPrefill(form, cfg) {
    var q = parseQuery();
    var ctx = gatherBrowserContext();

    try {
      var draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
      if (draft && typeof draft === "object") {
        Object.keys(draft).forEach(function (k) {
          if (q[k] == null && draft[k] != null) q[k] = draft[k];
        });
      }
    } catch (e) { /* */ }

    if (q.category && form.category) form.category.value = q.category;
    if (q.app && form.app) form.app.value = q.app;
    if (q.subject && form.subject) form.subject.value = q.subject;
    if (q.message && form.message) form.message.value = q.message;
    if (q.name && form.name) form.name.value = q.name;
    if (q.email && form.email) form.email.value = q.email;

    var preview = $("wcs-context-preview");
    if (preview) {
      preview.textContent =
        "Optional tech context: " + ctx.viewport + " · " + (ctx.build || "build?") +
        (q.app ? " · app=" + q.app : "") +
        (q.page ? " · " + q.page : "");
    }

    var includeTech = form.querySelector("[name=\"includeTech\"]");
    if (includeTech && (q.includeTech === "1" || q.includeTech === "true" || q.app)) {
      includeTech.checked = true;
    }

    return { query: q, context: ctx };
  }

  async function mountForm(form) {
    if (!form) return;
    var cfg = await loadConfig();
    var status = $("wcs-form-status");
    var submitBtn = form.querySelector("[type=\"submit\"]");

    fillSelect(form.category, [{ id: "", label: "Choose a category…" }].concat(cfg.categories || []), "");
    fillSelect(form.app, [{ id: "", label: "Optional — related app" }].concat(cfg.apps || []), "");

    var honeyName = (cfg.spam && cfg.spam.honeypotField) || "company_website";
    if (!form.querySelector("[name=\"" + honeyName + "\"]")) {
      var hp = document.createElement("div");
      hp.className = "wcs-honeypot";
      hp.setAttribute("aria-hidden", "true");
      hp.innerHTML =
        "<label>Company website<input type=\"text\" name=\"" + honeyName +
        "\" tabindex=\"-1\" autocomplete=\"off\"></label>";
      form.appendChild(hp);
    }

    var pre = applyPrefill(form, cfg);

    var emailDisplay = $("wcs-email-display");
    if (emailDisplay && cfg.developer) {
      emailDisplay.textContent = cfg.developer.email;
      emailDisplay.setAttribute("href", "mailto:" + cfg.developer.email);
    }
    var responseEl = $("wcs-response-time");
    if (responseEl && cfg.developer) responseEl.textContent = cfg.developer.responseTime;

    // Persist drafts on input so refresh / failed send keeps typed content
    ["input", "change"].forEach(function (evt) {
      form.addEventListener(evt, function () {
        try {
          var p = readForm(form, cfg);
          sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
            name: p.name,
            email: p.email,
            category: p.category,
            subject: p.subject,
            message: p.message,
            app: p.app,
            includeTech: p.includeTech ? "1" : ""
          }));
        } catch (e) { /* */ }
      });
    });

    form.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      if (state.submitting) return;
      clearFieldErrors(form);
      if (status) status.hidden = true;

      var payload = readForm(form, cfg);
      var ctx = gatherBrowserContext();
      if (pre.query.page) ctx.pagePath = pre.query.page;
      if (!payload.includeTech) {
        ctx = {
          pageUrl: ctx.pageUrl,
          pagePath: ctx.pagePath,
          build: ctx.build,
          viewport: "(omitted)",
          platform: "(omitted)",
          userAgent: "(omitted)",
          language: "(omitted)",
          timezone: "(omitted)",
          online: ctx.online
        };
      }

      var errors = validate(payload, cfg);
      if (errors.length) {
        errors.forEach(function (e) {
          if (e.field === "honeypot" || e.field === "rate" || e.field === "offline" || e.field === "timing") {
            showStatus(status, "err", e.message);
          } else {
            setFieldError(form, e.field, e.message);
          }
        });
        var firstInvalid = form.querySelector("[aria-invalid=\"true\"]");
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      state.submitting = true;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.setAttribute("aria-busy", "true");
      }
      showStatus(status, "info", "Sending…");

      try {
        await deliver(payload, cfg, ctx);
        recordSubmission();
        try { sessionStorage.removeItem(DRAFT_KEY); } catch (e) { /* */ }
        form.reset();
        applyPrefill(form, cfg);
        showStatus(
          status,
          "ok",
          "Message accepted for delivery to the Waypoint Studio inbox. I’ll reply to " +
            payload.email + " as soon as I can. Thank you for writing."
        );
        if (status) status.focus();
      } catch (err) {
        var msg = (err && err.message) || "Something went wrong sending the message.";
        if (err && err.timeout) msg = err.message;
        msg += " You can also email " + mailbox(cfg) + " directly.";
        showStatus(status, "err", msg);
        // Preserve form contents after recoverable failure (do not reset)
        try {
          sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
            name: payload.name,
            email: payload.email,
            category: payload.category,
            subject: payload.subject,
            message: payload.message,
            app: payload.app,
            includeTech: payload.includeTech ? "1" : ""
          }));
        } catch (e2) { /* */ }
      } finally {
        state.submitting = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.removeAttribute("aria-busy");
        }
      }
    });
  }

  function openSupport(opts) {
    opts = opts || {};
    var depth = opts.depth != null ? opts.depth : 0;
    var shell = document.querySelector("[data-shell-depth]");
    if (shell && opts.depth == null) depth = Number(shell.getAttribute("data-shell-depth") || 0) || 0;
    var params = Object.assign({}, opts);
    delete params.depth;
    if (!params.app) {
      var product = document.documentElement.getAttribute("data-product") ||
        (document.querySelector("[data-product]") && document.querySelector("[data-product]").getAttribute("data-product"));
      if (product && product !== "studio-home") params.app = product;
    }
    if (!params.page) params.page = location.pathname + location.search;
    if (params.includeTech == null) params.includeTech = "1";
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(params));
    } catch (e) { /* */ }
    location.href = contactHref(params, depth);
  }

  function boot() {
    var form = $("wcs-contact-form");
    if (form) {
      mountForm(form).catch(function (e) {
        showStatus($("wcs-form-status"), "err", (e && e.message) || "Could not start the contact form.");
      });
    }
  }

  var api = {
    loadConfig: loadConfig,
    gatherBrowserContext: gatherBrowserContext,
    validate: validate,
    deliver: deliver,
    contactHref: contactHref,
    open: openSupport,
    openBug: function (extra) {
      openSupport(Object.assign({ category: "bug", subject: "Bug report" }, extra || {}));
    },
    openFeature: function (extra) {
      openSupport(Object.assign({ category: "feature", subject: "Feature request" }, extra || {}));
    },
    boot: boot,
    _test: {
      rateLimitOk: rateLimitOk,
      readRate: readRate,
      writeRate: writeRate,
      RATE_KEY: RATE_KEY,
      DRAFT_KEY: DRAFT_KEY,
      MAX_SUBJECT: MAX_SUBJECT,
      DEFAULT_MAIL: DEFAULT_MAIL,
      sanitizeLine: sanitizeLine,
      sanitizeMultiline: sanitizeMultiline,
      buildDeliveryBody: buildDeliveryBody,
      parseQuery: parseQuery,
      mailbox: mailbox
    }
  };

  global.WDS = global.WDS || {};
  global.WDS.contact = api;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(typeof window !== "undefined" ? window : globalThis);
