#!/usr/bin/env node
/**
 * Build an isolated SignalTerrain V1.1 field-test GitHub Pages artifact.
 *
 * Copies only apps/summit-signal/ plus host-level noindex/robots files.
 * Does not copy Waypoint Studio production, Sheds, or retired cyber SignalTerrain.
 * Does not write a CNAME (companion host stays on github.io).
 *
 * Output: dist/signalterrain-field-test/
 *
 * Env:
 *   GITHUB_SHA / SIGNALTERRAIN_FIELD_TEST_SHA  source commit to stamp
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const HOST_REPO = "bfree7885/waypoint-studio-site";
export const FIELD_TEST_ORIGIN = "https://bfree7885.github.io/waypoint-studio-site";
export const FIELD_TEST_APP_PATH = "/apps/summit-signal/";
export const FIELD_TEST_URL = FIELD_TEST_ORIGIN + FIELD_TEST_APP_PATH;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "apps/summit-signal");
const DIST = path.join(ROOT, "dist/signalterrain-field-test");
const APP_DIST = path.join(DIST, "apps/summit-signal");

function runGit(args) {
  return execSync("git " + args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function resolveSha() {
  const env =
    process.env.SIGNALTERRAIN_FIELD_TEST_SHA ||
    process.env.GITHUB_SHA ||
    process.env.WAYPOINT_BUILD_SHA ||
    "";
  if (/^[0-9a-f]{7,40}$/i.test(env.trim())) return env.trim().toLowerCase();
  try {
    return runGit("rev-parse HEAD");
  } catch (e) {
    return "unknown";
  }
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const ent of fs.readdirSync(from, { withFileTypes: true })) {
    if (ent.name === "." || ent.name === "..") continue;
    const src = path.join(from, ent.name);
    const dst = path.join(to, ent.name);
    if (ent.isDirectory()) copyDir(src, dst);
    else fs.copyFileSync(src, dst);
  }
}

function stampHtml(html, sha) {
  const short = sha.slice(0, 7);
  const label = "SignalTerrain V1.1 · " + short;
  let out = html;
  out = out.replace(
    /<meta name="signalterrain-build" content="[^"]*">/,
    '<meta name="signalterrain-build" content="V1.1 ' + sha + '">'
  );
  out = out.replace(
    /<p class="ss-build" id="ss-field-test-build">[\s\S]*?<\/p>/,
    '<p class="ss-build" id="ss-field-test-build">' + label + "</p>"
  );
  if (!/id="ss-field-test-build"/.test(out)) {
    throw new Error("field-test build stamp target missing in index.html");
  }
  if (!/name="signalterrain-build"/.test(out)) {
    throw new Error("signalterrain-build meta missing in index.html");
  }
  return out;
}

function rootIndex() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Unlisted field-test</title>
</head>
<body>
  <p>Unlisted SignalTerrain V1.1 field-test host. Not a public product launch. Not authenticated. Anyone with the URL may open it.</p>
  <p><a href="apps/summit-signal/">Open the field-test app</a></p>
</body>
</html>
`;
}

function notFound() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="robots" content="noindex, nofollow">
  <title>Not found</title>
</head>
<body>
  <p>Unlisted field-test host. No public catalog.</p>
</body>
</html>
`;
}

function robots() {
  return `User-agent: *
Disallow: /
`;
}

function hostReadme(sha) {
  return `# SignalTerrain V1.1 field-test host

This repository is an **unlisted GitHub Pages field-test host**.

- App: ${FIELD_TEST_URL}
- Source: [waypoint-studio](https://github.com/bfree7885/waypoint-studio) \`apps/summit-signal/\`
- Source SHA: \`${sha}\`
- Posture: **unlisted, not access-controlled**. Not a public product launch.
- Do **not** add a CNAME. This project must stay on github.io.
- Do **not** point this project at \`waypointstudio.org\` or \`shedhunting.org\`.

Publish from waypoint-studio:

\`\`\`
node scripts/prepare-signalterrain-field-test-host.mjs
node scripts/publish-signalterrain-field-test-host.mjs
\`\`\`
`;
}

function main() {
  if (!fs.existsSync(path.join(SRC, "index.html"))) {
    throw new Error("apps/summit-signal/index.html missing");
  }
  fs.rmSync(DIST, { recursive: true, force: true });
  copyDir(SRC, APP_DIST);
  const sha = resolveSha();
  const htmlPath = path.join(APP_DIST, "index.html");
  fs.writeFileSync(htmlPath, stampHtml(fs.readFileSync(htmlPath, "utf8"), sha));
  fs.writeFileSync(
    path.join(APP_DIST, "data/st-field-test-build.json"),
    JSON.stringify(
      {
        product: "SignalTerrain",
        version: "V1.1",
        sourceSha: sha,
        shortSha: sha.slice(0, 7),
        unlisted: true,
        authenticated: false,
        fieldTestUrl: FIELD_TEST_URL
      },
      null,
      2
    ) + "\n"
  );
  fs.writeFileSync(path.join(DIST, ".nojekyll"), "");
  fs.writeFileSync(path.join(DIST, "robots.txt"), robots());
  fs.writeFileSync(path.join(DIST, "index.html"), rootIndex());
  fs.writeFileSync(path.join(DIST, "404.html"), notFound());
  fs.writeFileSync(path.join(DIST, "README.md"), hostReadme(sha));
  if (fs.existsSync(path.join(DIST, "CNAME"))) {
    throw new Error("prepare must not emit a CNAME");
  }
  console.log("prepared", DIST);
  console.log("field-test URL", FIELD_TEST_URL);
  console.log("source SHA", sha);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  }
}
