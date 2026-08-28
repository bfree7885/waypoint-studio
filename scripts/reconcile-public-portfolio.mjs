#!/usr/bin/env node
/**
 * Public portfolio reconciliation helpers.
 * - Slim nav-registry to the five active efforts
 * - Embed nav-registry into wds-app-nav-config.js
 * - Replace discontinued public HTML with silent redirects
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function walkHtml(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkHtml(p, files);
    else if (ent.name.endsWith(".html")) files.push(p);
  }
  return files;
}

function silentRedirectHtml(canonical) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, follow">
  <link rel="canonical" href="${canonical}">
  <meta http-equiv="refresh" content="0;url=${canonical}">
  <title>Waypoint Studio</title>
  <script>location.replace(${JSON.stringify(canonical)});</script>
</head>
<body>
  <p><a href="${canonical}">Continue to Waypoint Studio</a></p>
</body>
</html>
`;
}

const HOME = "https://waypointstudio.org/";
const DECK = "https://waypointstudio.org/side-trails/waypoint-deck/";

const DISCONTINUED_TREES = [
  "incubator",
  "volunteer",
  "side-trails/openroad-pa",
  "side-trails/signalterrain",
  "side-trails/global-signals",
  "apps/signalterrain",
  "apps/fieldry",
  "apps/foragecast",
  "apps/steepleaf",
  "apps/savant-sommelier",
  "apps/waypoint-volunteer",
  "apps/landscape-interpretation",
  "apps/terrainbound",
  "apps/cyber"
];

const command = process.argv[2] || "all";

if (command === "nav" || command === "all") {
  const navPath = path.join(ROOT, "design-system/ecosystem/nav-registry.json");
  const nav = JSON.parse(fs.readFileSync(navPath, "utf8"));
  nav.version = "3.0.0";
  nav.studioPrimaryNav = [
    { id: "dashboard", label: "Dashboard", href: "/apps/dashboard/", hint: "What’s happening outside today" },
    { id: "scenes", label: "Scenes", href: "/apps/scenes/", hint: "Explore and understand what you see" },
    { id: "sheds", label: "Sheds", href: "/apps/shed-hunting/map/", hint: "Map-first shed hunting" },
    { id: "deck", label: "Deck", href: "/side-trails/waypoint-deck/", hint: "Offline field computing" },
    { id: "articles", label: "Articles", href: "/articles/", hint: "Stories and field reading" },
    { id: "support", label: "Support", href: "/support.html", hint: "Help and honest answers" },
    { id: "about", label: "About", href: "/about.html", hint: "Studio mission" }
  ];
  nav.architectureNavLabels = ["Dashboard", "Scenes", "Sheds", "Deck", "Articles", "Support", "About"];
  nav.homePrimary = ["dashboard", "scenes", "sheds"];
  nav.homeIncubator = [];
  nav.homeSideTrails = [];
  nav.homeSupporting = [];
  nav.homePaused = [];
  nav.homeDeck = ["waypoint-deck"];
  nav.publicAppIds = ["dashboard", "scenes", "sheds", "waypoint-deck"];

  const keep = new Set(["dashboard", "scenes", "sheds"]);
  nav.apps = (nav.apps || []).filter((a) => keep.has(a.id)).map((a) => {
    const next = { ...a };
    next.related = (a.related || []).filter((id) => keep.has(id));
    next.publicSurface = true;
    return next;
  });

  if (!nav.apps.some((a) => a.id === "waypoint-deck")) {
    nav.apps.push({
      id: "waypoint-deck",
      title: "Waypoint Deck",
      shortTitle: "Deck",
      icon: "deck",
      route: "side-trails/waypoint-deck/",
      match: ["/side-trails/waypoint-deck"],
      category: "outdoor",
      description: "Offline-first Linux field computer — local maps, knowledge, and field tools when the network is optional.",
      status: "in-development",
      features: [
        {
          id: "overview",
          label: "Overview",
          href: "side-trails/waypoint-deck/"
        }
      ],
      purpose: "A local-first field computer, distinct from Waypoint Studio’s web apps.",
      maturity: "In development",
      startHere: {
        label: "Read Waypoint Deck",
        href: "side-trails/waypoint-deck/"
      },
      journeys: ["observe", "understand"],
      related: ["dashboard", "scenes", "sheds"],
      publicSurface: true
    });
  }

  fs.writeFileSync(navPath, JSON.stringify(nav, null, 2) + "\n");

  const configJs = `/**
 * Waypoint Studio — App navigation config (embedded from nav-registry.json)
 * Edit design-system/ecosystem/nav-registry.json, then regenerate or keep in sync.
 */
(function (global) {
  "use strict";
  global.WDS = global.WDS || {};
  global.WDS.APP_NAV_CONFIG = ${JSON.stringify(nav, null, 2)};
})(typeof window !== "undefined" ? window : globalThis);
`;
  fs.writeFileSync(path.join(ROOT, "design-system/js/platform/wds-app-nav-config.js"), configJs);
  console.log("Updated nav-registry.json and wds-app-nav-config.js");
}

if (command === "redirects" || command === "all") {
  let count = 0;
  for (const rel of DISCONTINUED_TREES) {
    const abs = path.join(ROOT, rel);
    for (const file of walkHtml(abs)) {
      fs.writeFileSync(file, silentRedirectHtml(HOME));
      count += 1;
    }
  }
  const sideTrailsIndex = path.join(ROOT, "side-trails/index.html");
  fs.writeFileSync(sideTrailsIndex, silentRedirectHtml(DECK));
  count += 1;
  console.log("Wrote silent redirects for", count, "HTML files");
}
