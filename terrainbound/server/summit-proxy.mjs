/**
 * Local loopback Summit proxy. Keys stay on this machine.
 * Production uses summit-gateway.mjs as a Cloudflare Worker.
 * SUMMIT_DEBUG is unused; ops logs never include student prose.
 *
 *   SUMMIT_API_KEY=... SUMMIT_AI_URL=... SUMMIT_AI_MODEL=... node terrainbound/server/summit-proxy.mjs
 */
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SUMMIT_REPLY_SCHEMA,
  coerceJson,
  handleSummitRequest,
  upstreamBody
} from "./summit-gateway.mjs";

export { SUMMIT_REPLY_SCHEMA, coerceJson, upstreamBody };

const PORT = Number(process.env.SUMMIT_PROXY_PORT || 8787);

function nodeToRequest(req, body) {
  const host = req.headers.host || `127.0.0.1:${PORT}`;
  const url = `http://${host}${req.url || "/"}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
  }
  const method = req.method || "GET";
  const init = { method, headers };
  if (method !== "GET" && method !== "HEAD") init.body = body;
  return new Request(url, init);
}

export const server = http.createServer(async (req, res) => {
  const chunks = [];
  try {
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const request = nodeToRequest(req, body);
    const response = await handleSummitRequest(request, process.env, { allowLocal: true });
    const out = Buffer.from(await response.arrayBuffer());
    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    res.writeHead(response.status, headers);
    res.end(out);
  } catch {
    res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "unavailable" }));
  }
});

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  server.listen(PORT, "127.0.0.1", () => {
    const configured = Boolean(process.env.SUMMIT_API_KEY && process.env.SUMMIT_AI_URL);
    const model = process.env.SUMMIT_AI_MODEL || "openai/gpt-oss-20b";
    console.log(`Summit proxy on 127.0.0.1:${PORT} (configured=${configured} model=${model})`);
  });
}
