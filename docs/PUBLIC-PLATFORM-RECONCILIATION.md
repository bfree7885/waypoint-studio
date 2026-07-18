# Public Platform Reconciliation

**Date:** 2026-07-18  
**Goal:** Ensure waypointstudio.org accurately represents the current Waypoint Studio platform without inventing products or hiding existing ones.  
**Status:** Local reconciliation complete — **awaiting owner review** (do not commit until approved)

---

## Target platform list

| Platform | Publicly represented? | Where | Notes |
|----------|----------------------|-------|-------|
| Dashboard | Yes | Home, Apps launcher, Support, sitemap | Live outdoor overview |
| Scenes | Yes | Home, Apps launcher, Support | Photography platform |
| Photo Coach | Yes | Scenes landing, Support, live tool `/apps/photo-coach/`, sitemap | **Not a separate top-level Apps card** — intentional: Scenes feature, not a second studio product |
| Sheds | Yes | Home, Apps launcher, Support | Foundation |
| ForageCast | Yes | Home, Apps launcher, Support | Live |
| Fieldry | Yes | Home, Apps launcher, Support | Live |
| SignalTerrain | Yes (strengthened) | Home, Apps launcher, Support, enriched landing | Two major areas now public |
| Steepleaf | Yes | Home, Apps launcher, Support | Foundation |
| Savant Sommelier | Yes | Home, Apps launcher, Support | Foundation |
| Waypoint Volunteer | Yes (completed) | Home, Apps launcher, Support, Contact apps, landing + discover | Was missing from Support/Contact; live deploy pending |

No new products invented. Terrainbound remains retired (not marketed).

---

## Why anything looked missing

| Gap | Why | Resolution |
|-----|-----|------------|
| Volunteer on Support | Support cards hand-maintained; Volunteer shipped after Support list | Added Support card + contact-config app |
| Volunteer on live site | Commit on `main` may not have been Pages-published at audit probe | Deploy after owner approval of this block |
| SignalTerrain “thin” | Nav/description RF-leaning; `capabilityGroups` never rendered in foundation UI | Copy + renderer + static HTML for Radio & Spectrum / Cyber Awareness |
| Photo Coach not in Apps grid | Scenes owns photography experiences; Photo Coach is the primary Scenes tool | Keep under Scenes; keep Support + Scenes entries explicit |
| Strategic docs “four instruments” | Older portfolio focus docs still exist | Public site lists the full family; strategic docs unchanged (vision not rewritten) |

---

## SignalTerrain — public framing

Publicly communicate **two major areas**:

### Radio & Spectrum Intelligence

- SDR  
- Receivers  
- Propagation  
- Monitoring  
- RF observations  

### Cyber Awareness (educational / defensive only)

- Ransomware  
- Zero-day / exploited vulnerabilities  
- Major attacks  
- Outages  
- Advisories  
- Defensive guidance  
- Changing threat priorities  

**Explicit non-claims:** not offensive cybersecurity, not penetration testing, not SIEM/SOC/IDS/IPS as shipped product.

Surfaces updated: `apps/signalterrain/index.html`, `data/foundation.json`, nav-registry / app-nav-config / platform-catalog / product-registry, foundation renderer (`capabilityGroups`).

---

## Waypoint Volunteer — public foundation

Purpose: answer **“What good can I do today?”** — discovery only.

Examples surfaced publicly:

- Animal shelters  
- Conservation / habitat restoration  
- Invasive species removal  
- Bird counts / community science  
- Trail maintenance / park cleanup  
- Environmental organizations  
- Food banks / community events  

Future adaptation (documented, not wired): location, season, weather, current events, skills, available time, interests.

Tone: hopeful, not corporate. No management, registration, or gamification.

---

## Landing page contract (JS optional)

Every application landing should explain without relying on “Loading…”:

| Requirement | Approach |
|-------------|----------|
| What it is | Static H1 + lead |
| Who it helps | Mission / who section |
| Problems | List where applicable |
| Key capabilities | Modules / examples |
| Privacy philosophy | Explicit section |
| Future direction | Explicit section |

Foundation apps: static HTML inside mount + JSON hydration. Live apps: static intro / noscript + progressive enhancement.

---

## Navigation model

Discoverability paths:

1. Homepage directory (static + JS from nav-registry)  
2. Global **Apps** launcher (same registry)  
3. Support application cards  
4. About family paragraph  
5. Sitemap  
6. 404 recovery links  

No orphan marketed products. Local feature nav for SignalTerrain (Topics / Graph / Summary) and Volunteer (Discover).

---

## Homepage & About alignment

| Surface | Message |
|---------|---------|
| Homepage | Observe · Understand · Create · Share across nature, photography, environmental observation, outdoor intelligence, land stewardship, volunteer service, signal intelligence, lifelong learning |
| About | Privacy-first, education-first, curiosity-first, calm technology; no engagement addiction, follower economy, or gamification |

Avoided: marketing hype, AI buzzwords, startup language.

---

## Intentionally unchanged

- Long-term vision documents (Constitution, SI architecture, etc.)  
- Product capability scope (no new features invented)  
- Existing live tool behavior beyond landing copy / progressive static content  
- Unrelated dirty tree files (`data/*`, `debug.html`, audit PDF scripts, etc.)
