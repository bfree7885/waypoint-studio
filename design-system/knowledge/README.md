# Knowledge Platform (design-system)

See **[docs/WAYPOINT-KNOWLEDGE-PLATFORM.md](../../docs/WAYPOINT-KNOWLEDGE-PLATFORM.md)** for full architecture.

Quick start:

```js
WDS.knowledge.configure({ base: "design-system/knowledge/" });
await WDS.knowledge.preloadDemo();
await WDS.knowledge.search("chanterelle", { domain: "foragecast" });
```
