/**
 * Hybrid Summit provider: route → AI or deterministic, then silent fallback.
 */

import { createDeterministicProvider } from "./summit-provider.js";
import { createAiProvider } from "./summit-ai.js";
import { createLocalComposerAdapter, composeLocal } from "./summit-compose.js";
import { validateSummitOutput } from "./summit-validate.js";
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
      const packet = selectSummitPacket({
        ...request,
        recentTurns: request.context?.summitRecent || request.recentTurns || []
      });
      request.packet = packet;
      if (!decision.useAi) {
        return tag(authored.respond(request), {
          provider: "deterministic",
          route: decision,
          packet,
          fallbackReason: ""
        });
      }
      return Promise.resolve()
        .then(() => talker.respond(request))
        .then((reply) =>
          tag(reply, {
            provider: reply.provider || "ai",
            route: decision,
            fallbackReason: "",
            packet,
            rawModel: reply.rawModel || null
          })
        )
        .catch((err) => {
          const local = composeLocal(packet, request.question, curiosity);
          const checked = validateSummitOutput(local, packet, request);
          if (checked.ok) {
            return tag(
              {
                ...checked.reply,
                text: checked.reply.text,
                provider: "deterministic"
              },
              {
                provider: "deterministic",
                route: decision,
                fallbackReason: err.code || err.message || "unavailable",
                packet,
                rawModel: err.raw || null
              }
            );
          }
          return tag(authored.respond(request), {
            provider: "deterministic",
            route: decision,
            fallbackReason: err.code || err.message || "unavailable",
            packet,
            rawModel: err.raw || null
          });
        });
    }
  };
}

function tag(reply, extra) {
  return {
    ...reply,
    provider: extra.provider || reply.provider,
    route: extra.route,
    fallbackReason: extra.fallbackReason || "",
    packet: extra.packet || reply.packet || null,
    rawModel: extra.rawModel || reply.rawModel || null
  };
}
