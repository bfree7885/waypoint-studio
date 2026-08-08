#!/usr/bin/env node
/**
 * End-to-end Global Signals live pipeline:
 * ingest → graph → impacts → articles
 */
import { runIngestion } from "./ingest/run.mjs";
import { buildLiveGraph } from "./graph/build.mjs";
import { propagateImpacts } from "./impacts/propagate.mjs";
import { buildLiveArticles } from "./articles/build.mjs";

export async function runLivePipeline() {
  const ingest = await runIngestion();
  const { graph } = buildLiveGraph({ eventsPayload: ingest.payload });
  const impacts = propagateImpacts({ eventsPayload: ingest.payload, graphPayload: graph });
  const articles = buildLiveArticles({
    eventsPayload: ingest.payload,
    impactsPayload: impacts,
    graphPayload: graph,
    statusPayload: ingest.status
  });
  return { ingest, graph, impacts, articles };
}

const isMain = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("run-live-pipeline.mjs");
if (isMain) {
  runLivePipeline()
    .then(({ ingest, graph, impacts, articles }) => {
      console.log(
        JSON.stringify(
          {
            ingestion: {
              events: ingest.payload.counts.deduped,
              activeSources: ingest.status.activeSources,
              failures: ingest.status.sourceFailures.length
            },
            graph: graph.counts,
            impacts: impacts.counts,
            articles: { ...articles.counts, freshness: articles.freshness }
          },
          null,
          2
        )
      );
      if (ingest.status.activeSources === 0) process.exitCode = 2;
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
