#!/usr/bin/env node
/**
 * Local/CI helper — thin wrapper around inject-build-metadata.mjs.
 *
 * Production Pages deploys must call inject-build-metadata.mjs with GITHUB_SHA.
 * This script remains for local smoke/bootstrap convenience and must NOT be used
 * to create "stamp commits" that embed a parent SHA into a child commit.
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inject = path.join(__dirname, "inject-build-metadata.mjs");

const env = {
  ...process.env,
  WAYPOINT_BUILD_SOURCE: process.env.WAYPOINT_BUILD_SOURCE || (process.env.GITHUB_ACTIONS ? "github-actions" : "local")
};

const result = spawnSync(process.execPath, [inject, ...process.argv.slice(2)], {
  stdio: "inherit",
  env
});

process.exit(result.status == null ? 1 : result.status);
