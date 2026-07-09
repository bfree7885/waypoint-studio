#!/usr/bin/env node
/**
 * Runs the live engine repeatedly and checks for stability signals:
 * memory growth, timing drift, unhandled rejections, and health regressions.
 */
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ENGINE = path.join(__dirname, "waypoint-live-engine.mjs");
const HEALTH_PATH = path.join(ROOT, "data", "health.json");
const CYCLES = Number(process.env.WAYPOINT_RESILIENCE_CYCLES || 20);

const issues = [];
let unhandled = 0;

process.on("unhandledRejection", () => {
  unhandled += 1;
});

function readHealth() {
  try {
    return JSON.parse(fs.readFileSync(HEALTH_PATH, "utf8"));
  } catch {
    return null;
  }
}

function runEngine() {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const child = spawn(process.execPath, [ENGINE], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env }
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({
        code,
        durationMs: Date.now() - started,
        stdout,
        stderr,
        health: readHealth()
      });
    });
  });
}

async function main() {
  const durations = [];
  const rssSeries = [];
  const healthLabels = [];
  const failureCounts = [];
  let prevHealth = readHealth();

  console.log("Waypoint live engine resilience validation");
  console.log("Cycles:", CYCLES);
  console.log("Engine:", ENGINE);
  console.log("");

  for (let i = 1; i <= CYCLES; i++) {
    const result = await runEngine();
    durations.push(result.durationMs);

    if (result.code !== 0 && result.code != null) {
      issues.push("cycle " + i + ": engine exited with code " + result.code);
    }
    if (result.stderr && /error|failed/i.test(result.stderr)) {
      issues.push("cycle " + i + ": stderr reported errors");
    }

    const health = result.health;
    if (!health || !health.overall) {
      issues.push("cycle " + i + ": missing health.json overall block");
    } else {
      const label = health.overall.label || health.overall.status;
      healthLabels.push(label);
      const moduleFailures = Object.values(health.modules || {})
        .reduce((sum, m) => sum + (m.failureCount || 0), 0);
      failureCounts.push(moduleFailures);
      if (health.runtime && health.runtime.memory && health.runtime.memory.rss) {
        rssSeries.push(health.runtime.memory.rss);
      }
      if (health.overall.status === "stale") {
        issues.push("cycle " + i + ": overall health became STALE");
      }
    }

    if (prevHealth && health) {
      const prevModules = prevHealth.modules || {};
      const nextModules = health.modules || {};
      Object.keys(nextModules).forEach((name) => {
        const prev = prevModules[name];
        const next = nextModules[name];
        if (prev && prev.status === "fallback" && next.status === "live" && next.recoveryAt) {
          // automatic recovery observed — good
        }
      });
    }
    prevHealth = health;

    const dur = result.durationMs;
    const label = health && health.overall ? (health.overall.label || health.overall.status) : "unknown";
    console.log(
      String(i).padStart(2, "0") + "/" + CYCLES +
      "  " + String(dur).padStart(5) + " ms" +
      "  health=" + label +
      "  failures=" + (failureCounts[failureCounts.length - 1] || 0)
    );
  }

  const minDur = Math.min(...durations);
  const maxDur = Math.max(...durations);
  const avgDur = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
  const rssGrowth = rssSeries.length >= 2 ? rssSeries[rssSeries.length - 1] - rssSeries[0] : 0;

  if (unhandled > 0) issues.push("unhandled promise rejections: " + unhandled);
  if (maxDur > avgDur * 3 && maxDur > 60000) {
    issues.push("timing spike detected: max " + maxDur + " ms vs avg " + avgDur + " ms");
  }
  if (rssGrowth > 50 * 1024 * 1024) {
    issues.push("memory RSS grew by " + Math.round(rssGrowth / (1024 * 1024)) + " MB across runs");
  }

  const uniqueHealth = [...new Set(healthLabels)];
  console.log("");
  console.log("Summary");
  console.log("-------");
  console.log("Duration ms: min=" + minDur + " avg=" + avgDur + " max=" + maxDur);
  console.log("Health labels seen:", uniqueHealth.join(", ") || "none");
  console.log("Final failureCount total:", failureCounts[failureCounts.length - 1] || 0);
  console.log("RSS series (last):", rssSeries.length ? rssSeries[rssSeries.length - 1] : "n/a");

  if (issues.length) {
    console.log("");
    console.log("Issues:");
    issues.forEach((issue) => console.log(" - " + issue));
    process.exitCode = 1;
    return;
  }

  console.log("");
  console.log("PASS — " + CYCLES + " consecutive engine cycles completed without stability issues.");
}

main().catch((err) => {
  console.error("validation failed:", err && err.message ? err.message : err);
  process.exit(1);
});
