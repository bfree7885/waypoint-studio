# RC3 Owner Visual Review

**Branch:** `recovery/rc3-consolidation`  
**Preview:** local static server (not production)  
**Generated:** 2026-07-21  
**Do not merge / do not deploy from this checklist alone.**

---

## How to preview

Canonical repo uses the README static server (no build step):

```bash
cd ~/Projects/waypoint-studio
git checkout recovery/rc3-consolidation
python3 -m http.server 8080
```

| Item | Value |
|------|--------|
| **URL** | http://127.0.0.1:8080/ |
| **Port** | `8080` |
| **Trailing slashes** | Prefer trailing `/` for app directories (`/apps/dashboard/`). `about.html` has no trailing slash. |
| **Deep links** | Work directly (e.g. `/apps/scenes/photo-coach/` → Photo Coach). |
| **Clarity redirects** | `/dashboard/`, `/scenes/`, `/sheds/`, `/volunteer/` → deep `/apps/*` routes. |

Screenshots (gitignored review artifacts):

`automation/artifacts/rc3-owner-review/desktop/`  
`automation/artifacts/rc3-owner-review/mobile/`  
Machine JSON: `automation/artifacts/rc3-owner-review/route-review.json`

---

## Route verification (local)

| Route | Result | Title (approx) | H1 | Maturity / labels | Nav (6) | Notes |
|-------|--------|----------------|----|-------------------|---------|-------|
| `/` | 200 | Observe. Discover. Understand. | Observe. Discover. Understand. | Free / Flagship badges on cards | Consistent | Take + Articles + Incubator present |
| `/apps/dashboard/` | 200 | Outdoor Dashboard… | Dashboard | Live product | Consistent | External weather API may 429 locally |
| `/apps/scenes/` | 200 | Scenes — Flagship photography | Observe. Discover. Understand how you see. | Available / Experimental / Preview cards | Consistent | |
| `/apps/scenes/photo-coach/` | 200 → `/apps/photo-coach/` | Photo Coach | How did today’s shoot go? | — | Consistent | Deep link OK |
| `/apps/shed-hunting/` | 200 | Sheds — Flagship field craft | Sheds | **Flagship** | Consistent | |
| `/apps/waypoint-volunteer/` | 200 | Volunteer — What good… | Volunteer | **Free** | Consistent | |
| `/articles/` | 200 | Articles | Articles | Categories + samples | Consistent | Manifest loads after hub URL fix |
| `/incubator/` | 200 | Incubator | Future products, held quietly | Foundation / Early access | Consistent | |
| `/about.html` | 200 | About | About | — | Consistent | |
| `/dashboard/` | 200 → `/apps/dashboard/` | (Dashboard) | Dashboard | — | Consistent | Redirect OK |
| `/scenes/` | 200 → `/apps/scenes/` | (Scenes) | … | — | Consistent | Redirect OK |
| `/sheds/` | 200 → `/apps/shed-hunting/` | (Sheds) | Sheds | — | Consistent | Redirect OK |
| `/volunteer/` | 200 → `/apps/waypoint-volunteer/` | (Volunteer) | Volunteer | — | Consistent | Redirect OK |

Primary navigation on all checked surfaces: **Dashboard · Scenes · Sheds · Volunteer · Articles · About**.

---

## Homepage checklist

- [ ] Mission is **Observe. Discover. Understand.**
- [ ] Tagline is **Capture what you find. Learn why it matters.**
- [ ] Four primary products dominate (not a prototype directory)
- [ ] **Dashboard** is first
- [ ] Incubator is restrained (not peer Launch cards)
- [ ] Supporting projects (ForageCast, Fieldry, Landscape Interpretation) do not compete
- [ ] Waypoint’s Take is visible
- [ ] Articles are visible
- [ ] No false claims about unfinished capabilities
- [ ] Visual identity feels coherent (park visitor center × photography magazine)

## Product checklist

- [ ] Dashboard still feels functional (Today Outside / widgets / Take)
- [ ] Scenes feels photography-first (Photo Coach path clear)
- [ ] Sheds still feels like a flagship field product
- [ ] Volunteer remains clearly free and useful (“What good can I do today?”)
- [ ] Articles support products (not a fifth flagship)
- [ ] Incubator preserves future ideas without distracting from the company

## Design checklist

- [ ] Aurora influence is present but restrained
- [ ] Text is readable
- [ ] Contrast is sufficient
- [ ] Mobile layout is credible
- [ ] No generic SaaS appearance
- [ ] No excessive gradients or neon
- [ ] No obvious mixed design systems

---

## Clear defects fixed during review prep

1. **Articles hub 404** — `mountHub` requested `articles/manifest.json` while already under `/articles/`. Fixed to `url: "manifest.json"`.
2. **Mobile horizontal overflow (Dashboard + primary nav)** — global header lacked `flex-wrap`; recovery panel could expand past the viewport. Constrained recovery width/overflow; primary nav takes full width on small screens.
3. **Incorrect maturity labels** — Sheds/Volunteer foundation JSON still said “Foundation” after RC3 framing. Updated to Flagship / Free and taught foundation `statusLabel` those statuses.

## Documented concerns (not changed — subjective or external)

| Concern | Notes |
|---------|--------|
| Dashboard console **429** | Provider rate limit when loading live weather locally — not a UI copy bug. |
| Mobile primary nav density | Six uppercase links wrap into a second row; usable but visually busy — owner taste. |
| Homepage lime **Open** CTAs | High-contrast accent; Aurora-aligned but strong — owner taste. |
| Scenes card maturity mix | Available / Experimental / Preview on one page is honest but busy — owner taste. |
| Articles category names | Still include Create / Share category scaffolds — historical IA, not company mission. |
| Dark-first studio chrome | Coherent, but some product pages (Dashboard recovery) use lighter parchment widgets inside — intentional WDS mix; confirm it does not feel like two systems. |
| Inter font on public pages | Still present via Google Fonts; not Inter-as-default-stack alone, but not a bespoke display everywhere. |

---

## Rollback / safety

- Branch only: `recovery/rc3-consolidation`
- Tag: `pre-rc3-consolidation-2026-07`
- CNAME / Pages / DNS: unchanged
- Production (`main`): unchanged
