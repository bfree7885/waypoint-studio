# Platform Polish RC2 — Owner Review

**Date:** 2026-07-23  
**Scope:** Public Waypoint Studio quality pass before Photography Library  
**Status:** Owner-review document + screenshot evidence committed on `polish/dashboard-rc25-sprint6`. **RC2 product code may still be uncommitted in the working tree — do not treat this docs commit as a full RC2 ship.** **Not deployed.**  
**Authority:** Home · Scenes · Sheds · Articles · About primary nav; Footer RC1.2 Contact · Privacy Policy · Terms  
**Exact path:** `docs/rebuild-2026/platform-polish-rc2-owner-review.md`  
**Related (different sprint):** Dashboard RC2.5 Sprint 6 experience polish review is at `docs/dashboard-rc25-sprint6/OWNER-REVIEW.md` (tracked on the same branch).

---

## Verdict

**Production readiness score: 8.4 / 10**

Platform Polish is **substantially complete** for public chrome and copy. Primary routes speak **Home**, not Dashboard; incubator names stay on the incubator page only; Featured / Scenes / Sheds photography on identity surfaces is real field JPG (not SVG theater). Remaining gaps are mostly secondary (Explore still exists, Support is FAQ-only, interim Terms, unused seasons placeholders, headless offline banner).

---

## Everything reviewed

### Walkthrough surfaces (local `http://127.0.0.1:8765`)

| Surface | Reviewed | Notes |
|---------|----------|-------|
| Home `/` | Yes | Rebuild workspace; quiet chrome; RC1.2 footer |
| Scenes | Yes | Full-bleed hero photo + craft CTAs |
| Sheds landing | Yes | Stage + handoffs |
| Articles hub + sample | Yes | Categories + sample article |
| About | Yes | Privacy rewrite retained; mission polish finished |
| Contact | Yes | Studio inbox framing (privacy pass) |
| Privacy | Yes | Trust footer destinations |
| Terms | Yes | Interim copy de-placeholdered |
| Support | Yes | Kept as FAQ; removed from primary/footer IA earlier |
| Incubator | Yes | Intentionally names early products |
| 404 | Yes | Recovery destinations |
| Settings / Knowledge / Status | Yes | Soft public copy |
| Redirects (`dashboard/`, `volunteer/`, terrainbound) | Yes | Compatibility paths |

### Screenshots

Captured under `docs/rebuild-2026/platform-polish-rc2/`:

| File | Subject |
|------|---------|
| `01-desktop-home.png` | Home (location gate may show without seeded prefs) |
| `02-desktop-home-featured.png` | Home deepeners region |
| `03-desktop-scenes.png` | Scenes hero photography |
| `04-desktop-sheds.png` | Sheds landing |
| `05-desktop-articles.png` | Articles hub |
| `06-desktop-about.png` | About mission |
| `07-desktop-contact.png` | Contact |
| `08-desktop-privacy.png` | Privacy |
| `09-desktop-terms.png` | Terms |
| `10-desktop-support.png` | Support FAQ |
| `11-desktop-incubator.png` | Incubator (SignalTerrain etc. expected) |
| `12-phone-home.png` | Home phone |
| `13-phone-about.png` | About phone |
| `capture-meta.json` | Probe: nav/footer/legacy/broken images |

Automation: `automation/capture-platform-polish-rc2.mjs`

### Quality checks run

- `node automation/test-home-rc1.mjs` — **52 passed**
- `node automation/validate-production-links.mjs` — **0 broken** (6 warnings: article category mounts lack boot shell)
- CDP probe of primary public pages — legacy strings absent except intentional incubator product names
- Identity photography assets: `placeholder: false`; JPGs present for home/scenes/sheds

---

## Everything fixed (this RC2 pass)

Count of distinct polish fixes: **21**

1. **Articles hub** — removed Dashboard / Volunteer copy and links; aligned to Home · Scenes · Sheds; shared contact stylesheet; removed redundant pill nav duplicating primary nav  
2. **Article template** — “Launch Dashboard” → “Open Home”  
3. **Articles manifest** — sample summary no longer names Fieldry / ForageCast as the story  
4. **Sample article** — public CTAs point to Home / Scenes / Sheds  
5. **Incubator** — primaries are Home · Scenes · Sheds · Articles; Volunteer demoted; `noindex`; contact stylesheet  
6. **404** — recovery list matches studio IA (no Coming later / Support orphan prominence); Privacy added  
7. **Settings** — Dashboard / Fieldry / Volunteer public wording softened to Home / device-local language  
8. **About** — kept mission rewrite; removed “Coming later” CTA push; privacy-first voice intact  
9. **Support** — Experiences cards: Contact replaces Coming later / incubator  
10. **Contact app picker** — Dashboard labeled **Home**; incubator/Volunteer apps removed from public form list  
11. **Terms** — removed “placeholder” hero/meta language; interim terms stated honestly  
12. **Status** — Dashboard link labeled Home  
13. **Terrainbound retirement page** — Dashboard → Home  
14. **`dashboard/` redirect** — copy says Home  
15. **Knowledge** — public filters drop Fieldry / SignalTerrain; docs markdown links replaced with About / Articles / Contact  
16. **Explore launcher** — incubator + supporting + Volunteer filtered out of public Explore  
17. **Related apps** — public related blocks filter demoted products; Scenes/Sheds related lists updated  
18. **Workflows** — Sheds no longer recommends Fieldry life-list handoff on public surface  
19. **Nav registry** — Sheds related synced away from Fieldry  
20. **Home RC1 tests** — Support assertion updated for post–Coming later IA  
21. **Capture harness** — `automation/capture-platform-polish-rc2.mjs` for repeatable RC2 evidence  

**Preserved (do not revert):** owner privacy About / Contact / Support wording already in the working tree.

---

## Remaining recommendations (not blocking Photography Library)

1. **Explore button** — still present on Scenes/About/etc.; now filtered, but owners may prefer hiding Explore entirely so primary nav is the only studio IA.  
2. **Support page** — useful FAQ, not in footer; decide whether to keep reachable only from Contact/404 or retire with a redirect to Contact.  
3. **False offline banner in headless Chrome** — `navigator.onLine === false` in automation often shows “You appear offline…”; verify once in a normal desktop browser before treating as a product defect.  
4. **Seasons manifest placeholders** — spring/winter still marked placeholder in `assets/images/home/seasons/manifest.json`; unused by Rebuild Home (identity manifest drives Featured). Safe to leave until Photography Library.  
5. **Article category pages** — link validator warnings: empty `aria-busy` mounts without boot shell.  
6. **Incubator deep links** — `/volunteer/` still redirects into Volunteer app (compatibility). Fine if intentional; otherwise redirect to Home.  
7. **Formal Terms** — interim copy is honest; legal counsel still owed when ready.  
8. **Home location gate** — expected first-run UX; capture seeding of location prefs is imperfect in automation.

---

## Photography (Task 4)

| Surface | Status |
|---------|--------|
| Featured Photography (identity `home`) | Real JPG · `placeholder: false` |
| Scenes hero | Real JPG · field credit visible in capture |
| Sheds stage | Real JPG via identity |
| Public placeholder theater | Not found on primary surfaces |
| Unused seasons placeholders | Documented only; not on Rebuild Home |

No Photography Library architecture started.

---

## Honest assessment — is Platform Polish complete?

**Yes for public product feel** — navigation, footer, About/Contact/Terms/Support/Articles/Incubator, and cross-app recommendations no longer advertise Dashboard / Volunteer / Outdoor OS / incubator products as primary studio destinations.

**Not absolute perfection** — Explore remains, Support is a soft orphan, Terms are interim, automation still sees an offline banner, and a few deep compatibility routes exist. Those are owner-judgment items, not blockers for starting Photography Library.

**Do not ship RC2 product changes without owner review** — privacy rewrite + RC2 HTML/JS polish may still be local-only until explicitly committed and approved.

---

## Session notes

- Root cause of remaining “Fieldry” on Scenes/Sheds/Articles was related-apps + workflows + article sample copy, not primary nav.  
- Internal paths `apps/dashboard/` remain for compatibility; user-visible label is Home.  
- This document + `docs/rebuild-2026/platform-polish-rc2/` evidence are committed so the review path resolves in git; full RC2 code ship is a separate owner decision.
