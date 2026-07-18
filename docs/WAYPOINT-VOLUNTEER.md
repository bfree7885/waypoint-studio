# Waypoint Volunteer — Foundation V0.1

**Status:** Active foundation (prototype — no backend integrations)  
**Tagline:** What good can I do today?  
**Product home:** `apps/waypoint-volunteer/`  
**Package:** `design-system/volunteer/`  

Waypoint Volunteer is Waypoint Studio’s **volunteer discovery** platform.

It helps people find meaningful ways to contribute in their communities.

---

## What this is not

- **Not** a volunteer management system (scheduling, hours tracking, admin consoles)  
- **Not** an event registration platform (tickets, RSVP workflows)  
- **Not** social media (likes, follows, public feeds, pressure)  

It is discovery: observe opportunities, understand fit, contribute when ready.

---

## Mission

Answer one simple question:

> **What good can I do today?**

Eventually support calm filters such as:

- What is near me?  
- What matches my interests?  
- What can I do for one hour?  
- What can I do outdoors today?  
- What fits today’s weather?  
- What needs help this weekend?  

V0.1 ships sample data and a discovery prototype — no live feeds.

---

## Philosophy

Aligns with Waypoint Studio: **Observe · Understand · Contribute**.

| Encourage | Avoid |
|-----------|-------|
| Curiosity | Competition |
| Service | Rankings |
| Stewardship | Streaks |
| Community involvement | Gamification |
| Calm fit | Likes / social pressure |

No badges for “most hours.” No leaderboards. Contribution is personal and optional.

Inherits: [Constitution](WAYPOINT-CONSTITUTION.md) · [Outdoor Ethics](WAYPOINT-OUTDOOR-ETHICS-STANDARD.md) · [Guide Experience](WAYPOINT-GUIDE-EXPERIENCE.md) · [Voice](WAYPOINT-VOICE.md).

---

## Architecture

```
Organizations (org_*)
        │
        ▼
 Opportunities (vo_*)  ←→ Skills (skill_*)
        │                    Categories (cat_*)
        ▼
 Discovery filters (“What good can I do today?”)
        │
        ├── Today Outside / Dashboard (future glance)
        └── Deep links from Fieldry, Scenes, ForageCast, SignalTerrain
```

Package contracts live in `design-system/volunteer/`.  
Runtime prototype: `WDS.volunteerDiscover`.

Citizen science opportunities integrate with other Waypoint apps as **discovery links**, not a separate social product.

---

## Data model

### Organization (`schema-organization-v0.1.json`)

`name` · `description` · `website` · `mission` · `categories` · `serviceArea`  
Plus: `id`, `meta`, optional contact notes (non-PII).

### Opportunity (`schema-opportunity-v0.1.json`)

`title` · `description` · `organizationId` · `location` · `setting` (indoor/outdoor/mixed) · `schedule` (recurring/one-time) · `estimatedDuration` · `physicalEffort` · `accessibility` · `weatherSensitive` · `seasonal` · `ageRequirements` · `familyFriendly` · `requiredSkills` · `suggestedClothing` · `suggestedEquipment`  
Plus: categories, confidence/sample status, unknowns when details are thin.

### Skills (`skills.json`)

Photography · GIS · Amateur Radio · SDR · Drone Pilot · Trail Work · Gardening · Habitat Restoration · Wildlife Observation · Teaching · Technology · Mapping · First Aid · Search and Rescue · Data Entry · …

### Categories (`categories.json`)

Animal Rescue · Conservation · Habitat Restoration · Trail Maintenance · Parks · Community Gardens · Food Banks · Education · Museums · Libraries · Search & Rescue · Emergency Preparedness · Disaster Recovery · Citizen Science · Community Events

---

## Discovery experience (V0.1)

Prototype: `apps/waypoint-volunteer/discover.html` (also linked from foundation home).

Calm filters over sample opportunities. Empty and “nothing fits” states are honest — silence over filler.

---

## Roadmap (directional)

| Phase | Goal |
|-------|------|
| **V0.1** | Models, samples, discovery prototype, docs (**this**) |
| **V0.2** | Local bookmarks / saved interests (privacy-first) |
| **V0.3** | Today Outside / Dashboard widget wired to sample → then curated bundles |
| **V1** | Regional curated org/opportunity packs with editorial ownership |
| **Later** | Optional partner feeds with provenance — never scrape dark patterns |

Still never: hours ledgers, social feeds, gamified streaks.

---

## Sample workflows

1. **One hour outdoors** — filter outdoor + ≤1h → trail litter pickup sample.  
2. **Radio-curious** — skill Amateur Radio → ARES / emergency prep sample.  
3. **Family Saturday** — family-friendly + weekend → community garden morning.  
4. **Citizen science bridge** — opportunity links “continue in Fieldry” for surveys (documented, not built).

---

## Integrations

See [WAYPOINT-VOLUNTEER-INTEGRATIONS.md](WAYPOINT-VOLUNTEER-INTEGRATIONS.md).

---

## Success criteria (V0.1)

1. Mission is unmistakable: discovery, not management.  
2. Shared org / opportunity / skill / category models exist.  
3. Realistic samples demonstrate filters.  
4. UI asks “What good can I do today?” without gamification.  
5. Integrations and Today Outside are documented, not faked as live.  
6. No commit/push without owner review.

---

## Related

- Package README: `design-system/volunteer/README.md`  
- App: `apps/waypoint-volunteer/`
