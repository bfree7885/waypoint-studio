# Waypoint Volunteer — Platform Integrations

**Status:** Architecture (documentation only — no runtime integrations in V0.1)  
**Parent:** [WAYPOINT-VOLUNTEER.md](WAYPOINT-VOLUNTEER.md)

Volunteer discovery should feel native to Waypoint Studio: opportunities surface where people already observe and plan — especially **Today Outside** (Dashboard) — without becoming a separate social app.

---

## Today Outside / Dashboard

**Intent:** Surface a few calm volunteer suggestions inside the outdoor briefing — not a second product.

Examples of glance copy:

- Beautiful weather for trail maintenance.  
- Local shelter looking for dog walkers.  
- Community garden volunteer morning tomorrow.  
- River cleanup scheduled this weekend.  
- Pollinator habitat restoration this Saturday.  

**Existing hook:** Dashboard widget `volunteer-opportunities` (`futureProvider: "volunteer-events"`) is a placeholder today.

**Future contract (not implemented):**

```text
Volunteer.todayOutside({ weather, region, interests, durationHint })
  → { bullets[], opportunityIds[], disclaimer }
```

Rules:

- Max small set (density budget like Intelligence Summary).  
- Prefer outdoor + weather-aware when conditions are good.  
- Label Planned / Sample until curated sources exist.  
- Deep-link into Waypoint Volunteer discovery — do not RSVP inside Dashboard.  
- No streaks, no “complete your volunteer quest.”

---

## Fieldry

| Opportunity kinds | Bridge |
|-------------------|--------|
| Habitat restoration | Link Fieldry habitat lessons / maps |
| Invasive species projects | Ethics + ID literacy before pull days |
| Biodiversity surveys | Citizen-science opt-in → Fieldry observation flow |

Volunteer lists the **event**; Fieldry hosts **field practice**. Do not duplicate observation tools inside Volunteer.

---

## Scenes / Photo Coach

| Opportunity kinds | Bridge |
|-------------------|--------|
| Conservation photography | Scenes / Photo Coach for careful looking |
| Repeat photography | Document change over stewardship seasons |
| Project documentation | Gallery ethics — no geotag harm |

Photography skills on opportunities can suggest “bring a camera — refine later in Scenes.”

---

## ForageCast

| Opportunity kinds | Bridge |
|-------------------|--------|
| Stewardship / native planting | Seasonal timing literacy |
| Orchard work | Phenology awareness |
| Community garden seasons | Calendar fit without harvest pressure |

ForageCast explains **when the land is ready**; Volunteer finds **who is hosting the work day**.

---

## SignalTerrain

| Opportunity kinds | Bridge |
|-------------------|--------|
| Emergency preparedness | Org topics / ARES-style literacy |
| Disaster response organizations | Structured events — not rumor |
| Amateur radio volunteer roles | Skill: Amateur Radio / SDR |

SignalTerrain remains intelligence / RF home. Volunteer remains discovery. Cross-link skills and orgs; do not merge products.

---

## Citizen science

Citizen science is a **category** of opportunity and a **bridge** into Fieldry / ethics / observation standards — not a standalone Waypoint social network.

Always optional. Always privacy-aware. Align with [WAYPOINT-OUTDOOR-ETHICS-STANDARD.md](WAYPOINT-OUTDOOR-ETHICS-STANDARD.md).

---

## Non-goals for integrations

- Auto-registering users for events  
- Sharing volunteer activity publicly by default  
- Competitive “impact scores” across apps  
- Scraping partner calendars without agreement  

---

## Related

- [WAYPOINT-VOLUNTEER.md](WAYPOINT-VOLUNTEER.md)  
- Dashboard catalog widget `volunteer-opportunities`  
- [WAYPOINT-CONTENT-ENGINE.md](WAYPOINT-CONTENT-ENGINE.md) — Conservation Update external links until in-app discovery matures
