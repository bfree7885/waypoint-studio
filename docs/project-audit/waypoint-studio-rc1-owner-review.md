# Waypoint Studio RC1 — Owner Review

**Date:** 2026-08-05
**Audience:** Product owner
**Companion audit:** [`waypoint-studio-rc1.md`](./waypoint-studio-rc1.md)
**Branch:** `feature/outdoor-intelligence-engine` @ `a99789c`
**Deployed in this block:** No

---

## Verdict

### Ready with Conditions — closed beta / invite RC1

### Hold — public Version 1.0

Home (Rebuild), Articles, Sheds map, and Scenes craft are real products with honest loading and shared platform layers (Outdoor Intelligence recommendations + Observation Timeline). That is enough for a carefully framed invite.

It is **not** enough to call the whole studio Version 1.0 or to market Learn / Create / Remember / Explore as finished rooms.

---

## What is strong

1. **Home is Rebuild** — `/` and `/apps/dashboard/` share one shell; Outdoor OS is not the public face.
2. **Articles shipped to production** — curated feeds, 12-hour refresh, Field Notes integration, documented production review.
3. **Sheds map-first** — usable field path; private by default.
4. **Scenes craft core** — Photo Coach / library exist; landings mount shared recommendations and timeline.
5. **Shared outdoor intelligence** — deterministic recommendations; no AI pretending to be facts.
6. **Shared observation timeline** — one schema, read-model over existing apps; privacy-conscious UI.
7. **Product standards culture** — trust chips, no fabricated live numbers, progressive shell.

---

## What is weak or incomplete

| Area | Honest status |
| --- | --- |
| Learn | Education pillar, not a product room |
| Create | Direction / previews — not shippable as a claim |
| Remember | Capability only (Fieldry / photos / timeline) |
| Explore | Retired as homepage era; ForageCast remains supporting |
| Importer | Desktop tooling — not a web RC1 surface; dual systems risk |
| Waypoint Daily | In-flight (uncommitted) — intended Home front page |
| Home cold start | Still loads ~167 design-system modules |
| CI | Gates a stale Outdoor OS suite; misses Home Rebuild gates |
| Contrast a11y | Systemic debt still open |
| Scenes creative modules | Living Scenes / Builder = preview |

---

## Conditions for invite RC1

Ship or invite **only if** all of the following are true:

1. Public framing is **Home · Scenes · Sheds · Articles · About** — not Outdoor OS, not seven-room Explore, not “AI outdoor OS.”
2. Honesty language stays: samples, estimates, educational cues, private local data.
3. Articles feed health and `/feeds/waypoint-articles.xml` remain green after the next refresh cycle.
4. Contrast / AA is **not** claimed as certified until CD-3 work lands.
5. CI is retargeted before the next “RC1” marketing push (see blockers below).
6. Waypoint Daily is either finished and reviewed, or left out of messaging so Field Notes ownership stays clear.

---

## Why Version 1.0 is Hold

Public 1.0 implies one coherent product, trustworthy performance, CI that matches the product, and accessibility claims that survive real devices. Today:

- Home pays a boot tax from historical eras still on the critical path.
- CI still asserts Outdoor OS while Home Rebuild suites are local-only.
- Learn / Create / Remember / Explore are not products; marketing them would invent maturity.
- Photography Featured source-of-truth and Scenes suite consistency remain open.
- Live production re-audit after recent platform merges is outstanding.

---

## Highest-priority work before Version 1.0

Ordered for owner decisions:

1. **CI truth** — Gate Rebuild Home + Articles + recommendations + timeline (+ Daily when ready); quarantine Outdoor OS today-outside tests.
2. **Home boot budget** — Defer or drop V2/V3/OS/Recovery from first paint.
3. **Contrast on primary journeys** — Home, Articles, Scenes, Sheds, About.
4. **Live verify** — Production URLs after merge; no “local green = live green.”
5. **Daily finish or cut** — One Home front-page story for Field Notes + Take.
6. **Scenes / photography SoT** — Before flagship photography marketing.
7. **Authority docs** — One product map; incubator labeled; Volunteer demoted consistently.
8. **Importer story** — One public path for bringing photos into the library.

---

## Do not do before 1.0

- Invent Learn / Create / Remember / Explore as primary nav without shipping rooms.
- Reintroduce Outdoor OS or marketing studio-home as the root experience.
- Claim AI-generated field truth; keep Outdoor Intelligence deterministic and labeled.
- Merge dual photo libraries silently.
- Deploy this audit branch as “1.0” without the P0 CI + boot + live verify items.

---

## Owner ask

Approve **Ready with Conditions** for invite RC1 under the framing above, and keep **Hold** on Version 1.0 until the P0 list closes.

Full evidence and surface ratings: [`waypoint-studio-rc1.md`](./waypoint-studio-rc1.md).
