/**
 * Hybrid Summit provider: route → AI or deterministic, then silent fallback.
 */

import { createDeterministicProvider } from "./summit-provider.js";
import { createAiProvider } from "./summit-ai.js";
import { createLocalComposerAdapter } from "./summit-compose.js";
import { routeSummit } from "./summit-route.js";
import { selectSummitPacket } from "./summit-packet.js";

export function createHybridProvider({
  curriculum,
  concepts,
  curiosity,
  adapter,
  timeoutMs = 3500,
  deterministic,
  ai
} = {}) {
  const authored = deterministic || createDeterministicProvider({ curriculum, concepts });
  const talker =
    ai ||
    createAiProvider({
      adapter: adapter || createLocalComposerAdapter({ curiosity }),
      timeoutMs
    });

  return {
    id: "hybrid",
    authored,
    talker,
    respond(request) {
      const decision = routeSummit(request);
      request.route = decision;
      if (!decision.useAi) {
        return tag(authored.respond(request), {
          provider: "deterministic",
          route: decision,
          fallbackReason: ""
        });
      }
      const packet = selectSummitPacket({
        ...request,
        recentTurns: request.context?.summitRecent || request.recentTurns || []
      });
      request.packet = packet;
      return Promise.resolve()
        .then(() => talker.respond(request))
        .then((reply) =>
          tag(reply, {
            provider: reply.provider || "ai",
            route: decision,
            fallbackReason: "",
            packet
          })
        )
        .catch((err) =>
          tag(authored.respond(request), {
            provider: "deterministic",
            route: decision,
            fallbackReason: err.code || err.message || "unavailable",
            packet
          })
        );
    }
  };
}

function tag(reply, extra) {
  return {
    ...reply,
    provider: extra.provider || reply.provider,
    route: extra.route,
    fallbackReason: extra.fallbackReason || "",
    packet: extra.packet || reply.packet || null
  };
}
