#!/usr/bin/env node
/**
 * Fetch a live Shed Hunting host (github.io or custom domain) and check
 * overview + map HTML plus local asset URLs.
 *
 * Usage:
 *   SHEDHUNTING_HOST_URL=https://bfree7885.github.io/shedhunting.org/ \
 *     node scripts/verify-shed-hunting-host-url.mjs
 */
import { pathToFileURL } from "node:url";

const BASE = String(process.env.SHEDHUNTING_HOST_URL || "").replace(/\/+$/, "") + "/";

function localRefs(html) {
  const out = [];
  const re = /(?:href|src)="((?!https?:|mailto:|data:|#)[^"]+)"/gi;
  let m;
  while ((m = re.exec(html))) out.push(m[1].split("#")[0]);
  return out;
}

async function get(url) {
  const res = await fetch(url, { redirect: "follow" });
  const text = await res.text();
  return { ok: res.ok, status: res.status, url: res.url, text, type: res.headers.get("content-type") || "" };
}

function resolve(fromUrl, ref) {
  try {
    return new URL(ref, fromUrl).href;
  } catch (e) {
    return null;
  }
}

async function main() {
  if (!process.env.SHEDHUNTING_HOST_URL) {
    console.error("Set SHEDHUNTING_HOST_URL to the temporary Pages origin (trailing slash optional).");
    process.exit(2);
  }
  const failures = [];
  function check(name, cond, detail) {
    if (cond) console.log("PASS", name);
    else {
      failures.push(name + (detail ? ": " + detail : ""));
      console.error("FAIL", name, detail || "");
    }
  }

  const overview = await get(BASE);
  check("overview 200", overview.ok, String(overview.status));
  check("overview is shed host", /data-shed-host="1"/.test(overview.text));
  check("overview Open Map", /href="map\/"/.test(overview.text));
  check("overview Powered by Waypoint → Studio", /https:\/\/waypointstudio\.org\/"/.test(overview.text));
  check("overview has no Scenes nav", !/\/apps\/scenes\//.test(overview.text) && !/>Scenes</.test(overview.text));
  check("overview has no ../../", !/\.\.\/\.\.\//.test(overview.text));

  const mapUrl = new URL("map/", BASE).href;
  const map = await get(mapUrl);
  check("map 200", map.ok, String(map.status));
  check("map leaflet css is local", /vendor\/leaflet\/leaflet\.css/.test(map.text));
  check("map WDS css is local", /vendor\/wds\/wds-experience-v2\.css/.test(map.text));
  check("map Support → Studio", /https:\/\/waypointstudio\.org\/support\.html/.test(map.text));
  check("map has Import JSON", /id="btn-import"/.test(map.text));
  check("map has no paywall", !/Free\/Pro|paywall/i.test(map.text));

  const seen = new Set();
  for (const page of [overview, map]) {
    for (const ref of localRefs(page.text)) {
      const abs = resolve(page.url, ref);
      if (!abs || !abs.startsWith(BASE)) continue;
      if (seen.has(abs)) continue;
      seen.add(abs);
      const asset = await get(abs);
      check("asset " + abs.replace(BASE, ""), asset.ok, String(asset.status));
    }
  }

  if (failures.length) {
    console.error("\n" + failures.length + " failure(s).");
    process.exit(1);
  }
  console.log("\nLive host checks passed against " + BASE);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(function (err) {
    console.error(err);
    process.exit(1);
  });
}
