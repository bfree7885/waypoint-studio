# Waypoint Knowledge Platform V1

**Status:** Active foundation  
**Tagline:** The best information, thoughtfully organized.  
**Audience:** Every Waypoint Studio product, editors, and future AI that surfaces reading  

This is the curated knowledge operating layer for Waypoint Studio.

It is **not** a generic news feed.  
It is **not** a scraper.  
It is **not** an AI that summarizes random articles.  
It is **not** a chatbot.

It is a **modern digital field library**: quality over quantity, depth over speed, understanding over engagement.

---

## Mission

Every Waypoint app should become a trusted place to understand its subject — not because it has the most content, but because it has the **best** content.

Users should think:

> “I trust that if Waypoint highlights something, it’s worth my time.”

---

## Philosophy

Waypoint is a guide.

Guides do not overwhelm people with hundreds of links.  
They point out what matters.  
Explain why.  
Provide context.  
Respect uncertainty.  
Encourage curiosity.

Reading supports observation. It never interrupts field work.  
Entry points use Guide Experience language: *Why this matters · Worth noticing · Related research · Background · If you’re curious* — never *Next lesson · Required reading · Complete this*.

See: [Waypoint Constitution](WAYPOINT-CONSTITUTION.md) · [Guide Experience](WAYPOINT-GUIDE-EXPERIENCE.md) · [Waypoint Voice](WAYPOINT-VOICE.md).

---

## Two complementary layers

| Layer | Purpose | Path |
|-------|---------|------|
| **Curated research** | Papers, reports, guides, advisories as calm reading cards | `design-system/knowledge/curated/` |
| **Entity knowledge** | Species, habitats, concepts apps can query (`kn_*`) | `design-system/knowledge/` |

Do not conflate them. Curated cards may *link* to entity ids via `relatedEntityIds`.

Primary curated overview (shorter): [Waypoint Knowledge](WAYPOINT-KNOWLEDGE.md).  
Editorial process: [Waypoint Editorial Standards](WAYPOINT-EDITORIAL-STANDARDS.md).

---

## Knowledge entry model

Schema: `design-system/knowledge/curated/schema-v1.json`  
Ids: `wk_*`

| Field | Role |
|-------|------|
| title | Clear, specific title |
| sourceName / sourceType | Who published it; category from taxonomy |
| publicationDate | ISO date or year |
| authors | Named contributors |
| topics | Subject tags (prefer product `knowledgeCategories`) |
| products | Which apps this supports |
| summary | **Source Summary** — what the publication says |
| keyFindings | Bullet findings from the source |
| whyItMatters | Field / product relevance |
| waypointAnalysis | **Waypoint Perspective** (stored field; UI label = Perspective) |
| limitations | Uncertainty, scope, conflicts |
| relatedEntries / relatedEntityIds | Related curated + entity knowledge |
| originalUrl | Link to the original |
| reviewStatus | `verified` · `editorial-draft` · `demonstration` · `archived` · `needs-review` |
| contextualHooks | Optional product hooks for “Why this may matter” |

### Never blur these layers

| Layer | Meaning |
|-------|---------|
| **Source Summary** | What the publication says |
| **Waypoint Perspective** | Why it matters for this app, field use, and where uncertainty remains |
| **Limitations** | What we do not know or cannot claim |

Demonstration fixtures must use `reviewStatus: "demonstration"` and must never be presented as verified research.

---

## Source taxonomy

Canonical list: `design-system/knowledge/curated/taxonomy.json`

| Category | Typical use |
|----------|-------------|
| Research | Peer-reviewed primary work |
| Review Article | Scholarly synthesis |
| Field Guide | Identification / field practice |
| Government | Agency reports, advisories, regulations |
| University | Extension and academic outreach |
| Professional Organization | Professional society guidance |
| Technical Standard | Specs and standards documents |
| Book | Long-form references |
| Case Study | Situated investigations |
| Historical Reference | Historical primary/secondary material |
| Expert Commentary | Named expert interpretation (labeled) |
| Editorial | Waypoint editorial (rare; clearly labeled) |
| Demonstration | Fixture only — never verified |

Mapped to schema `sourceType` values for storage.

---

## Reading experience

- Calm, editorial, readable (~42rem measure)  
- Intentionally selected entries — no endless scroll feed  
- No algorithmic ranking, breaking-news theater, likes, or streaks  
- Progressive disclosure on compact cards  
- Original source link when available  

UI:

- CSS: `design-system/css/wds-knowledge.css`  
- JS: `design-system/js/knowledge/wds-knowledge-curated.js` → `WDS.knowledgeCurated`  
- Demo / library page: `knowledge.html`

---

## Product integration strategy

Knowledge **supports**; it never interrupts.

### Entry points (preferred labels)

- Why this matters  
- Worth noticing  
- Related research  
- Background  
- If you’re curious  

### Runtime helpers

```js
const bundle = await WDS.knowledgeCurated.loadDemo();
const sheds = WDS.knowledgeCurated.filterByProduct(bundle, "sheds");
const hooked = WDS.knowledgeCurated.byHook(bundle, "sheds-south-aspect");
mount.innerHTML = WDS.knowledgeCurated.renderRelatedReading(bundle, {
  product: "sheds",
  hookId: "sheds-south-aspect",
  heading: "If you're curious",
  compact: true
});
WDS.knowledgeCurated.bindToggles(mount);
```

### Per-product topics (examples)

| Product | Example categories |
|---------|-------------------|
| Sheds | Habitat, deer biology, wildlife management, terrain, forest ecology |
| Fieldry | Taxonomy, phenology, ecology, conservation, ID, citizen science |
| ForageCast | Fungi, plants, succession, permaculture, orchards, weather ecology |
| Photo Coach / Scenes | Composition, perception, camera science, animal vision, IR/UV |
| SignalTerrain | Spectrum, cybersecurity literacy, space weather, infrastructure |

Full lists: `product-framework.json` → `knowledgeCategories`.

### Registry

`sharedEngines.waypoint-knowledge-curated` — consumers include studio, sheds, scenes, photo-coach, fieldry, foragecast, signalterrain.

Apps should load `wds-knowledge-curated.js` only when showing reading — not on every map paint.

---

## Future vision (same model)

Architecture must grow without schema breakage toward:

- Saved articles · personal notes · collections  
- Cross-product related reading · research timelines · topic pages  
- Expert interviews · books · papers · government advisories  

Add fields under optional extensions later; do not invent a second competing model.

---

## Entity knowledge API (complement)

```js
WDS.knowledge.configure({ base: "design-system/knowledge/" });
await WDS.knowledge.preloadDemo();
await WDS.knowledge.get("kn_chanterelle");
await WDS.knowledge.search("oak", { domain: "sheds" });
```

Details: historical entity sections remain valid; curated reading is the V1 user-facing library experience.

---

## Success criteria

Users should leave thinking:

- “I learned something valuable.”  
- “I understand this subject better.”  
- “I’m glad someone already found the important information.”  
- “I want to come back because I trust the curation — not because the app is trying to keep me scrolling.”

Build for years without sacrificing quality or Waypoint philosophy.

---

## Related documents

- [Waypoint Knowledge](WAYPOINT-KNOWLEDGE.md)  
- [Waypoint Editorial Standards](WAYPOINT-EDITORIAL-STANDARDS.md)  
- [Editorial Standards](EDITORIAL-STANDARDS.md) (general)  
- [Research Integrity](RESEARCH-INTEGRITY.md)  
- [Product Framework](WAYPOINT-PRODUCT-FRAMEWORK.md)  
- [Waypoint Constitution](WAYPOINT-CONSTITUTION.md)  
- [Guide Experience](WAYPOINT-GUIDE-EXPERIENCE.md)  
