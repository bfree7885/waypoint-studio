# SignalTerrain — Topic Model

**Status:** Active foundation  
**Schema:** `design-system/signalterrain/schema-topic-v1.json`  
**Vision:** [SIGNALTERRAIN-VISION.md](SIGNALTERRAIN-VISION.md)

Everything important in SignalTerrain becomes a **topic**. Topics evolve — they are not disposable news cards.

---

## What is a topic?

A durable unit of understanding. Examples:

- A CVE  
- A threat group (literacy — not a hunting dossier game)  
- A malware family (awareness)  
- A radio frequency or band  
- A satellite  
- A protocol  
- A government agency  
- A research paper  
- A communication system  
- A cloud provider  
- An infrastructure event class  
- A standard or RFC  

Ids use the prefix `st_` (SignalTerrain topic).

---

## Knowledge structure (every topic)

| Section | Purpose |
|---------|---------|
| **Overview** | Plain-language what this is |
| **Timeline** | How the topic evolved (events, revisions) |
| **Historical context** | Longer arc — why it exists |
| **Related topics** | Via relationship engine |
| **Primary sources** | Original citations |
| **Government references** | Advisories, agencies, regulations (when relevant) |
| **Research** | Papers and studies |
| **Technical documentation** | Specs, RFCs, manuals |
| **Waypoint Analysis** | Labeled Perspective — editorial judgment |
| **Confidence** | Trust / SI confidence labels |
| **Known facts** | What we treat as established *for this topic* |
| **Unknowns** | Required honesty |
| **Future things to watch** | Calm watch-list notes — not panic countdowns |

Aligns with [Trust Framework](WAYPOINT-TRUST-FRAMEWORK.md) and [Knowledge Platform](WAYPOINT-KNOWLEDGE-PLATFORM.md) Perspective rules.

---

## Topic record (summary)

Required for Foundation samples:

- `id`, `workspace`, `kind`, `title`, `summary`  
- `overview`  
- `confidence` + `unknowns` (min 1)  
- `waypointAnalysis` (Perspective; may be `sample` / `not-applicable`)  
- `verification.status`  
- `meta.status` (`sample` | `draft` | `active` | `archived`)

Optional but first-class in the schema: timeline, historicalContext, sources, governmentRefs, research, technicalDocs, knownFacts, watchFor, tags, relatedKnowledgeIds, signalCardIds.

---

## Topic kinds

Controlled list in schema (extensible carefully):

`vulnerability` · `threat-actor` · `malware-family` · `advisory` · `frequency` · `propagation` · `satellite` · `protocol` · `agency` · `research-paper` · `standard` · `provider` · `infrastructure` · `campaign` · `organization` · `signal-system` · `other`

---

## Evolution rule

Prefer **updating a topic** over creating near-duplicate cards for the same entity. Timeline entries capture change. News-like flashes belong on Signal Cards attached to the topic — not as replacement topics.

---

## Samples

Demo graph: `design-system/signalterrain/samples/demo-graph.json`  
Surface: `apps/signalterrain/topics.html`

Educational samples are labeled `meta.status: sample` and must not be presented as live intelligence.

---

## Related

- [SIGNALTERRAIN-RELATIONSHIP-MODEL.md](SIGNALTERRAIN-RELATIONSHIP-MODEL.md)  
- [SIGNALTERRAIN-EDITORIAL-STANDARDS.md](SIGNALTERRAIN-EDITORIAL-STANDARDS.md)  
- [SIGNAL-INTELLIGENCE-ENGINE.md](SIGNAL-INTELLIGENCE-ENGINE.md)
