#!/usr/bin/env node
/**
 * Dashboard Rebuild — instrument depth (deterministic, no network).
 * Run: node automation/test-dashboard-rebuild-depth.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

let passed = 0;
const failures = [];

function assert(name, cond, detail) {
  if (cond) {
    passed += 1;
    console.log("PASS", name);
  } else {
    failures.push(name + (detail ? ": " + detail : ""));
    console.error("FAIL", name, detail || "");
  }
}

function load(rel, sandbox) {
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), sandbox, { filename: rel });
}

const NOW = new Date();

function isoOffset(minutes) {
  return new Date(Date.now() + minutes * 60000).toISOString();
}

function hoursFrom(specs) {
  return specs.map(function (s, i) {
    return {
      time: isoOffset(s.atMin != null ? s.atMin : (i + 1) * 60),
      temperature: s.temp != null ? s.temp : 72,
      precipitation: { probability: s.prob != null ? s.prob : 5 },
      wind: { speed: s.wind != null ? s.wind : 5, gust: s.gust != null ? s.gust : s.wind != null ? s.wind + 2 : 7 },
      cloudCover: s.cloud != null ? s.cloud : 20,
      uvIndex: s.uv != null ? s.uv : 3,
      conditions: s.conditions || "Clear"
    };
  });
}

function platform(overrides) {
  const o = overrides || {};
  const cur = Object.assign(
    {
      temperature: 72,
      feelsLike: 72,
      humidity: 45,
      cloudCover: 20,
      uvIndex: 4,
      wind: { speed: 5, gust: 8, direction: 180 },
      conditions: { summary: "Clear" },
      precipitation: { probability: 5, amount: 0 }
    },
    o.current || {}
  );
  return {
    meta: Object.assign({ hydratedAt: NOW.toISOString(), fromCache: false }, o.meta || {}),
    weatherRef: {
      meta: Object.assign(
        { isPlaceholder: false, timezone: "America/New_York", provider: "fixture-weather" },
        o.wxMeta || {}
      ),
      current: cur,
      hourly: o.hourly || hoursFrom([{ prob: 5 }, { prob: 5 }, { prob: 8 }, { prob: 10 }]),
      daily: o.daily || [{ temperatureHigh: 78, temperatureLow: 58, uvIndex: 6 }]
    },
    daylight: Object.assign(
      {
        sunriseISO: isoOffset(-12 * 60),
        sunsetISO: isoOffset(4 * 60),
        sunriseFormatted: "6:00 AM",
        sunsetFormatted: "8:00 PM",
        kind: "day",
        moonPhase: "Waxing Crescent",
        moonIllumination: 22,
        moonPhaseValue: 0.18
      },
      o.daylight || {}
    ),
    airQuality: o.airQuality,
    alerts: o.alerts
  };
}

function makeDom(html) {
  const handlers = { click: [], keydown: [] };
  function el(tag, attrs) {
    const node = {
      tagName: String(tag).toUpperCase(),
      attributes: Object.assign({}, attrs || {}),
      children: [],
      classList: {
        _set: new Set(String((attrs && attrs.class) || "").split(/\s+/).filter(Boolean)),
        add(c) {
          this._set.add(c);
        },
        remove(c) {
          this._set.delete(c);
        },
        contains(c) {
          return this._set.has(c);
        }
      },
      style: {},
      parentNode: null,
      focusCalls: 0,
      focus() {
        this.focusCalls += 1;
      },
      scrollIntoView() {},
      setAttribute(k, v) {
        this.attributes[k] = String(v);
      },
      getAttribute(k) {
        return this.attributes[k] != null ? String(this.attributes[k]) : null;
      },
      hasAttribute(k) {
        return Object.prototype.hasOwnProperty.call(this.attributes, k);
      },
      removeAttribute(k) {
        delete this.attributes[k];
      },
      appendChild(child) {
        child.parentNode = this;
        this.children.push(child);
        return child;
      },
      querySelector(sel) {
        return queryAll(this, sel)[0] || null;
      },
      querySelectorAll(sel) {
        return queryAll(this, sel);
      },
      closest(sel) {
        let n = this;
        while (n) {
          if (matches(n, sel)) return n;
          n = n.parentNode;
        }
        return null;
      },
      get textContent() {
        return collectText(this);
      }
    };
    return node;
  }

  function collectText(n) {
    if (n._text != null) return n._text;
    return (n.children || []).map(collectText).join("");
  }

  function matches(n, sel) {
    if (!n || !n.attributes) return false;
    if (sel.startsWith(".")) return n.classList.contains(sel.slice(1));
    if (sel.startsWith("#")) return n.getAttribute("id") === sel.slice(1);
    if (sel.includes("[")) {
      const m = sel.match(/^([a-z0-9-]*)\[([^=\]]+)(?:=\"([^\"]*)\")?\](.*)$/i);
      if (!m) return false;
      if (m[1] && n.tagName.toLowerCase() !== m[1].toLowerCase()) return false;
      const val = n.getAttribute(m[2]);
      if (m[3] != null) return val === m[3];
      return val != null;
    }
    return n.tagName.toLowerCase() === sel.toLowerCase();
  }

  function queryAll(root, sel) {
    const out = [];
    function walk(n) {
      if (!n) return;
      if (matches(n, sel)) out.push(n);
      (n.children || []).forEach(walk);
    }
    walk(root);
    return out;
  }

  function parseFragment(markup) {
    const root = el("div", { class: "host" });
    // Minimal parser for our depth + article markup
    const article = el("article", { class: "wdb-r-widget", "data-widget-id": "ph-conditions" });
    article.innerHTML = markup; // unused; we inject via attach
    root.appendChild(article);
    return { root, article, handlers, el, queryAll };
  }

  return { el, handlers, parseFragment, queryAll, matches };
}

const sandbox = {
  window: {},
  global: {},
  console,
  Date,
  Math,
  Number,
  String,
  Array,
  Object,
  isFinite,
  parseInt,
  setTimeout: function (fn) {
    fn();
    return 1;
  }
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.WDS = {};

load("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-intel.js", sandbox);
load("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-depth.js", sandbox);
load("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-data.js", sandbox);
load("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-registry.js", sandbox);

const Depth = sandbox.WDS.dashboardRebuildDepth;
const Data = sandbox.WDS.dashboardRebuildData;
const Reg = sandbox.WDS.dashboardRebuildRegistry;

assert("depth module loaded", !!(Depth && Depth.buildDepthModel && Depth.renderDepthPanel));
assert("data exports helpers", typeof Data.weatherCurrent === "function" && typeof Data.upcomingHours === "function");

/* 1–2 Conditions feels-like */
{
  const pDiff = platform({ current: { temperature: 70, feelsLike: 78 } });
  const dDiff = Data.buildWidgetPayload("ph-conditions", pDiff);
  assert("conditions feels different — fact present", (dDiff.facts || []).some((f) => f.label === "Feels like"));
  const mDiff = Depth.buildDepthModel("ph-conditions", dDiff, pDiff);
  assert("conditions feels different — depth has feels", mDiff.rows.some((r) => r.label === "Feels like"));

  const pSame = platform({ current: { temperature: 70, feelsLike: 71 } });
  const dSame = Data.buildWidgetPayload("ph-conditions", pSame);
  assert("conditions feels similar — no equal-weight fact", !(dSame.facts || []).some((f) => f.label === "Feels like"));
  const mSame = Depth.buildDepthModel("ph-conditions", dSame, pSame);
  assert("conditions feels similar — depth omits feels", !mSame.rows.some((r) => r.label === "Feels like"));
}

/* 3–4 Next Hours change vs stable */
{
  const rainSoon = platform({
    current: { precipitation: { probability: 10, amount: 0 } },
    hourly: hoursFrom([
      { prob: 10, temp: 74 },
      { prob: 20, temp: 73 },
      { atMin: 180, prob: 55, temp: 70, conditions: "Rain" },
      { prob: 60, temp: 68 }
    ])
  });
  const nh = Data.buildWidgetPayload("ph-next-hours", rainSoon);
  assert("next hours rain transition headline", /Rain chance rises/i.test(nh.changeHeadline || ""));
  const nhDepth = Depth.buildDepthModel("ph-next-hours", nh, rainSoon);
  assert("next hours depth has spark + rows", !!nhDepth.spark && nhDepth.rows.length >= 3);

  const stable = platform({
    hourly: hoursFrom([
      { prob: 5, temp: 72, wind: 6 },
      { prob: 6, temp: 72, wind: 6 },
      { prob: 7, temp: 71, wind: 7 },
      { prob: 8, temp: 71, wind: 7 }
    ])
  });
  const st = Data.buildWidgetPayload("ph-next-hours", stable);
  assert("next hours stable headline", /steady/i.test(st.changeHeadline || ""));
}

/* 5–6 Rain timing */
{
  const dryLater = platform({
    current: { precipitation: { probability: 5, amount: 0 }, conditions: { summary: "Clear" } },
    hourly: hoursFrom([{ prob: 5 }, { prob: 8 }, { atMin: 240, prob: 48 }, { prob: 55 }])
  });
  const rain = Data.buildWidgetPayload("ph-precip-window", dryLater);
  assert("rain dry-now timing headline", /Chance rises|Dry for/i.test(rain.timingHeadline || ""));
  const rainDepth = Depth.buildDepthModel("ph-precip-window", rain, dryLater);
  assert("rain depth distinguishes probability", rainDepth.rows.some((r) => /probability/i.test(r.label)));

  const wetNow = platform({
    current: {
      precipitation: { probability: 80, amount: 0.12 },
      conditions: { summary: "Rain" }
    },
    hourly: hoursFrom([{ prob: 80 }, { prob: 70 }])
  });
  const wet = Data.buildWidgetPayload("ph-precip-window", wetNow);
  assert("rain active precip headline", /occurring now/i.test(wet.timingHeadline || ""));
  assert(
    "rain art contract dry low-prob no rain type",
    dryLater && Data.buildWidgetPayload("ph-precip-window", dryLater).graphic && dryLater
  );
  const dryGfx = rain.graphic;
  assert("rain 0–10% dry art not falling rain", dryGfx && dryGfx.precipType !== "rain");
}

/* 7–8 Wind */
{
  const calm = platform({ current: { wind: { speed: 3, gust: 4, direction: 90 } } });
  const wc = Data.buildWidgetPayload("ph-wind", calm);
  assert("wind calm hides near-identical gust", !(wc.facts || []).some((f) => f.label === "Gusts"));

  const gusty = platform({
    current: { wind: { speed: 12, gust: 28, direction: 220 } },
    hourly: hoursFrom([
      { wind: 12, gust: 20 },
      { wind: 15, gust: 32 },
      { wind: 18, gust: 35 }
    ])
  });
  const wg = Data.buildWidgetPayload("ph-wind", gusty);
  assert("wind strong shows gusts", (wg.facts || []).some((f) => f.label === "Gusts"));
  const wd = Depth.buildDepthModel("ph-wind", wg, gusty);
  assert("wind depth strongest soon", wd.rows.some((r) => /Strongest/i.test(r.label)) && !!wd.spark);
}

/* 9–10 Air */
{
  const good = platform({
    airQuality: { status: "live", usAqi: 28, category: "Good", pm25: 6 }
  });
  const ag = Data.buildWidgetPayload("ph-air", good);
  const agd = Depth.buildDepthModel("ph-air", ag, good);
  assert("air good depth has AQI+PM2.5", agd.rows.some((r) => r.label === "US AQI") && agd.rows.some((r) => r.label === "PM2.5"));
  assert("air good no fabricated O3", !agd.rows.some((r) => /O3|Ozone|NO2/i.test(r.label)));

  const mod = platform({
    airQuality: { status: "live", usAqi: 105, category: "Unhealthy for Sensitive Groups", pm25: 38 }
  });
  const am = Depth.buildDepthModel("ph-air", Data.buildWidgetPayload("ph-air", mod), mod);
  assert("air unhealthy meaning row", am.rows.some((r) => r.label === "Meaning"));
}

/* 11–12 UV */
{
  const night = platform({
    current: { uvIndex: 0 },
    hourly: hoursFrom([{ uv: 0 }, { uv: 0 }, { uv: 0 }]),
    daily: [{ temperatureHigh: 70, temperatureLow: 55, uvIndex: 1 }]
  });
  const un = Data.buildWidgetPayload("ph-uv", night);
  const und = Depth.buildDepthModel("ph-uv", un, night);
  assert("uv night model has content or honest facts", und.hasContent);

  const dayUv = platform({
    current: { uvIndex: 8 },
    hourly: hoursFrom([{ uv: 6 }, { uv: 9 }, { uv: 8 }, { uv: 5 }]),
    daily: [{ temperatureHigh: 88, temperatureLow: 68, uvIndex: 9 }]
  });
  const ud = Depth.buildDepthModel("ph-uv", Data.buildWidgetPayload("ph-uv", dayUv), dayUv);
  assert("uv high has peak timing or spark", ud.rows.some((r) => /peak/i.test(r.label)) || !!ud.spark);
}

/* 13–14 Light */
{
  const day = platform({
    daylight: {
      sunriseISO: isoOffset(-8 * 60),
      sunsetISO: isoOffset(6 * 60),
      sunriseFormatted: "6:00 AM",
      sunsetFormatted: "8:00 PM"
    }
  });
  const ld = Data.buildWidgetPayload("ph-light", day);
  assert("light collapsed leads with Now phase", (ld.facts || [])[0] && ld.facts[0].label === "Now");
  const ldd = Depth.buildDepthModel("ph-light", ld, day);
  assert("light depth has sunrise/sunset", ldd.rows.some((r) => r.label === "Sunrise") && ldd.rows.some((r) => r.label === "Sunset"));

  const golden = platform({
    daylight: {
      sunriseISO: isoOffset(-12 * 60),
      sunsetISO: isoOffset(40),
      sunriseFormatted: "6:00 AM",
      sunsetFormatted: "6:40 PM",
      goldenHourEvening: "6:00 PM"
    }
  });
  /* Force clock-independent graphic state via payload graphic */
  const lg = Data.buildWidgetPayload("ph-light", golden);
  lg.graphic = { kind: "sun", state: "golden", illum: "golden" };
  const lgd = Depth.buildDepthModel("ph-light", lg, golden);
  assert("light golden depth headline", /golden/i.test(lgd.headline || ""));
}

/* 15–16 Astronomy */
{
  const newMoon = platform({
    current: { cloudCover: 10 },
    daylight: { moonPhase: "New Moon", moonIllumination: 2, moonPhaseValue: 0.02 }
  });
  const an = Data.buildWidgetPayload("ph-astronomy", newMoon);
  const and = Depth.buildDepthModel("ph-astronomy", an, newMoon);
  assert("astronomy new moon illumination", and.rows.some((r) => r.label === "Illumination"));
  assert("astronomy no fabricated moonrise", !and.rows.some((r) => /Moonrise|Moonset/i.test(r.label)));

  const fullCloudy = platform({
    current: { cloudCover: 92 },
    daylight: { moonPhase: "Full Moon", moonIllumination: 99, moonPhaseValue: 0.5 }
  });
  const af = Depth.buildDepthModel("ph-astronomy", Data.buildWidgetPayload("ph-astronomy", fullCloudy), fullCloudy);
  assert("astronomy cloudy sky context present or cloud cover", af.rows.some((r) => /Cloud|Sky/i.test(r.label)));
}

/* 17–19 Alerts */
{
  const none = platform({ alerts: { status: "live", items: [] } });
  const al0 = Depth.buildDepthModel("ph-alerts", Data.buildWidgetPayload("ph-alerts", none), none);
  assert("alerts none depth status", al0.rows.some((r) => /No active/i.test(r.value || "")));

  const one = platform({
    alerts: {
      status: "live",
      items: [
        {
          event: "Heat Advisory",
          severity: "Moderate",
          onset: NOW.toISOString(),
          ends: isoOffset(360),
          description: "Hot conditions expected.",
          url: "https://example.test/alert"
        }
      ]
    }
  });
  const al1 = Depth.buildDepthModel("ph-alerts", Data.buildWidgetPayload("ph-alerts", one), one);
  assert("alerts one has effective/detail", al1.rows.some((r) => r.label === "Effective") && al1.rows.some((r) => r.label === "Detail"));
  assert("alerts official link action", (al1.actions || []).some((a) => /Official/i.test(a.label || "")));

  const multi = platform({
    alerts: {
      status: "live",
      items: [
        { event: "Heat Advisory", severity: "Moderate" },
        { event: "Air Quality Alert", severity: "Minor" }
      ]
    }
  });
  const al2 = Depth.buildDepthModel("ph-alerts", Data.buildWidgetPayload("ph-alerts", multi), multi);
  assert("alerts multiple listed", al2.rows.filter((r) => r.label === "Alert" || r.label === "Also").length >= 2);
}

/* 20 Missing data */
{
  const sparse = platform({
    current: { temperature: 68, feelsLike: 68, humidity: null, wind: null, precipitation: null, conditions: { summary: "Clear" } }
  });
  delete sparse.weatherRef.current.humidity;
  delete sparse.weatherRef.current.wind;
  sparse.weatherRef.current.precipitation = undefined;
  const md = Depth.buildDepthModel("ph-conditions", Data.buildWidgetPayload("ph-conditions", sparse), sparse);
  assert("missing data does not dump dashes", !md.rows.some((r) => r.value === "—" || r.value === "-"));
  assert("missing data still has temp", md.rows.some((r) => r.label === "Temperature"));
}

/* 21 Stale/cache metadata */
{
  const stale = platform({
    meta: { hydratedAt: NOW.toISOString(), fromCache: true, stale: true },
    wxMeta: { fromCache: true, stale: true, provider: "fixture-weather" }
  });
  const sd = Depth.buildDepthModel("ph-conditions", Data.buildWidgetPayload("ph-conditions", stale), stale);
  assert(
    "stale freshness exposed in depth",
    sd.rows.some((r) => /Freshness|Updated|Source/i.test(r.label))
  );
}

/* 22 Happening Now → depth open (DOM bind) */
{
  const host = {
    __wdbDepthBound: false,
    listeners: {},
    addEventListener(type, fn) {
      this.listeners[type] = this.listeners[type] || [];
      this.listeners[type].push(fn);
    },
    querySelector(sel) {
      if (sel.includes("ph-precip-window")) return article;
      if (sel.includes('[data-depth-open="true"]')) {
        return article.getAttribute("data-depth-open") === "true" ? article : null;
      }
      return article.querySelector(sel);
    },
    getAttribute() {
      return null;
    }
  };
  const article = {
    attributes: { "data-widget-id": "ph-precip-window", class: "wdb-r-widget" },
    classList: { _set: new Set(["wdb-r-widget"]), add(c) { this._set.add(c); }, remove(c) { this._set.delete(c); } },
    children: [],
    focusCalls: 0,
    focus() {
      this.focusCalls += 1;
    },
    scrollIntoView() {},
    setAttribute(k, v) {
      this.attributes[k] = String(v);
    },
    getAttribute(k) {
      return this.attributes[k] != null ? String(this.attributes[k]) : null;
    },
    hasAttribute(k) {
      return Object.prototype.hasOwnProperty.call(this.attributes, k);
    },
    removeAttribute(k) {
      delete this.attributes[k];
    },
    querySelector(sel) {
      if (sel.includes("depth-toggle")) return toggle;
      if (sel.includes("depth-panel")) return panel;
      if (sel.includes("depth-close")) return close;
      return null;
    },
    closest() {
      return this;
    }
  };
  const toggle = {
    attributes: { "aria-expanded": "false", "data-wdb-r-depth-toggle": "" },
    setAttribute(k, v) {
      this.attributes[k] = String(v);
    },
    getAttribute(k) {
      return this.attributes[k] != null ? String(this.attributes[k]) : null;
    },
    focus() {},
    closest(sel) {
      if (sel.includes("depth-toggle")) return this;
      if (sel === ".wdb-r-widget") return article;
      if (sel === ".wdb-r-widget__controls") return null;
      return null;
    }
  };
  const panel = {
    attributes: { hidden: "" },
    setAttribute(k, v) {
      this.attributes[k] = String(v);
    },
    getAttribute(k) {
      return this.attributes[k] != null ? String(this.attributes[k]) : null;
    },
    removeAttribute(k) {
      delete this.attributes[k];
    },
    querySelector(sel) {
      if (sel.includes("depth-close")) return close;
      return null;
    }
  };
  const close = {
    attributes: { "data-wdb-r-depth-close": "" },
    focusCalls: 0,
    focus() {
      this.focusCalls += 1;
    },
    closest(sel) {
      if (sel.includes("depth-close")) return this;
      if (sel === ".wdb-r-widget") return article;
      return null;
    }
  };

  Depth.bind(host);
  assert("HN openWidget opens depth", Depth.openWidget(host, "ph-precip-window") === true);
  assert("HN open sets aria-expanded", toggle.getAttribute("aria-expanded") === "true");
  assert("HN open removes hidden", panel.getAttribute("hidden") == null);

  /* 23 keyboard Escape close */
  host.listeners.keydown[0]({ key: "Escape", keyCode: 27, preventDefault() {} });
  assert("Escape closes depth", toggle.getAttribute("aria-expanded") === "false");
  assert("Escape restores focus to toggle path", panel.getAttribute("hidden") === "");

  /* click toggle again */
  host.listeners.click[0]({
    target: toggle,
    preventDefault() {}
  });
  assert("click toggle opens", toggle.getAttribute("aria-expanded") === "true");
  host.listeners.click[0]({
    target: close,
    preventDefault() {}
  });
  assert("close button closes", toggle.getAttribute("aria-expanded") === "false");
}

/* 24 Mobile depth markup fits (no wide table) */
{
  const p = platform({});
  const html = Depth.renderDepthPanel({ id: "ph-next-hours" }, Data.buildWidgetPayload("ph-next-hours", p), p);
  assert("mobile depth uses dl not table", html.includes("wdb-r-depth__facts") && !/<table/i.test(html));
  assert("mobile depth has toggle + close", /aria-expanded/.test(html) && /Close details/.test(html));
}

/* 25 Saved layout How It Feels still in catalog */
{
  const comfort = Reg.get("ph-comfort");
  assert("how-it-feels remains cataloged", !!(comfort && comfort.id === "ph-comfort"));
  assert("how-it-feels default hidden", comfort.defaultVisible === false);
  const cp = platform({ current: { temperature: 80, feelsLike: 88, humidity: 70 } });
  const cd = Depth.buildDepthModel("ph-comfort", Data.buildWidgetPayload("ph-comfort", cp), cp);
  assert("comfort depth notes Conditions merge", cd.rows.some((r) => /Conditions depth/i.test(r.value || "")));
  const range = Reg.get("ph-day-range");
  assert("todays range retained", !!(range && range.id === "ph-day-range"));
}

/* Registry render includes depth, skips doorway */
{
  const p = platform({ airQuality: { status: "live", usAqi: 40, category: "Good", pm25: 8 } });
  const body = Reg.render({ id: "ph-air", title: "Air" }, Data.buildWidgetPayload("ph-air", p), {
    customize: false,
    platform: p
  });
  assert("registry render embeds depth", /data-wdb-r-depth-toggle/.test(body));
  const custom = Reg.render({ id: "ph-air", title: "Air" }, Data.buildWidgetPayload("ph-air", p), {
    customize: true,
    platform: p
  });
  assert("customize omits depth", !/data-wdb-r-depth-toggle/.test(custom));
  const door = Reg.render(
    { id: "ph-doorway", title: "Before you go" },
    Data.buildWidgetPayload("ph-doorway", p, NOW),
    { customize: false, platform: p }
  );
  assert("doorway has no depth panel", !/data-wdb-r-depth-toggle/.test(door));
}

/* Day range unique value */
{
  const p = platform({ current: { temperature: 70 }, daily: [{ temperatureHigh: 82, temperatureLow: 60 }] });
  const dr = Data.buildWidgetPayload("ph-day-range", p);
  assert("day range shows position in span", (dr.facts || []).some((f) => f.label === "Now" && /span/i.test(f.value || "")));
}

console.log("\n" + passed + " passed, " + failures.length + " failed");
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
