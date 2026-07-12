#!/usr/bin/env node
/**
 * Wait until an HTTP endpoint responds.
 * Usage: node automation/wait-for-http.mjs http://127.0.0.1:8080 [timeoutMs]
 */
import http from "http";
import https from "https";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const timeoutMs = Number(process.argv[3] || 30000);
const started = Date.now();

function once() {
  return new Promise((resolve) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, (res) => {
      res.resume();
      resolve(res.statusCode && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

while (Date.now() - started < timeoutMs) {
  if (await once()) {
    console.log("ready:", url);
    process.exit(0);
  }
  await new Promise((r) => setTimeout(r, 250));
}

console.error("timeout waiting for", url);
process.exit(1);
