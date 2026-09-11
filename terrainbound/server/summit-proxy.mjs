#!/usr/bin/env node
/**
 * Optional Summit AI proxy. Keys stay on the server.
 *   SUMMIT_API_KEY=... SUMMIT_AI_URL=... SUMMIT_AI_MODEL=... node terrainbound/server/summit-proxy.mjs
 * Default: disabled / no key. The game remains fully playable without this process.
 */
import http from "node:http";

const PORT = Number(process.env.SUMMIT_PROXY_PORT || 8787);
const UPSTREAM = process.env.SUMMIT_AI_URL || "";
const KEY = process.env.SUMMIT_API_KEY || "";
const MODEL = process.env.SUMMIT_AI_MODEL || "local-small";

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:8085");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method !== "POST" || req.url !== "/summit-ai") {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not-found" }));
    return;
  }
  if (!KEY || !UPSTREAM) {
    res.writeHead(503, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "unconfigured" }));
    return;
  }
  const body = await readBody(req);
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "malformed" }));
    return;
  }
  try {
    const upstream = await fetch(UPSTREAM, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: payload.prompt || "" },
          { role: "user", content: payload.question || "" }
        ]
      })
    });
    const data = await upstream.json();
    const text = data.choices?.[0]?.message?.content || data.response || "";
    res.writeHead(upstream.ok ? 200 : 502, { "content-type": "application/json" });
    res.end(typeof text === "string" && text.trim().startsWith("{") ? text : JSON.stringify({ response: String(text || "") }));
  } catch {
    res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "upstream" }));
  }
});

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Summit proxy on 127.0.0.1:${PORT} (configured=${Boolean(KEY && UPSTREAM)} model=${MODEL})`);
});
