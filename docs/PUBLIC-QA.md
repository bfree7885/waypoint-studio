# Public QA — Waypoint Studio

**Date:** 2026-07-18  
**Persona:** First-time visitor who has never seen Waypoint Studio  
**Environment:** Local working tree after Public Platform Reconciliation work block  
**Live production:** May lag until owner approves commit/deploy  

**Verdict:** A careful visitor can understand why the studio exists and discover every marketed platform locally. Remaining blockers are **deploy**, **FormSubmit activation**, and optional SEO/a11y polish.

---

## First impression (homepage)

| Question | Answer |
|----------|--------|
| What is this place? | A studio of calm tools for careful observers |
| What does it help people do? | Observe, understand, create, and share |
| Across what domains? | Nature, photography, outdoor intelligence, stewardship, volunteer service, signal intelligence, learning |
| Can I find the apps without JS? | Yes — static directory is in the HTML |
| Does it feel like hype? | No — plain language, no AI buzzwords |

---

## Product discovery walkthrough

| Product | Can I find it? | Can I explain it after reading the landing (JS off)? | Notes |
|---------|----------------|-----------------------------------------------------|-------|
| Dashboard | Yes | Yes | Outdoor conditions overview |
| Scenes | Yes | Yes | Photography platform; five experiences |
| Photo Coach | Via Scenes + Support + direct URL | Yes | Primary Scenes tool; not a separate Apps grid card |
| Sheds | Yes | Yes | Shed hunting without trophy culture |
| ForageCast | Yes | Yes | Seasonal land companion |
| Fieldry | Yes | Yes | Private life list |
| SignalTerrain | Yes | Yes | Radio & Spectrum + Cyber Awareness |
| Steepleaf | Yes | Yes | Tea literacy foundation |
| Savant Sommelier | Yes | Yes | Vineyard literacy foundation |
| Waypoint Volunteer | Yes (local) | Yes | “What good can I do today?” |

Would a visitor know why the studio exists? **Yes** — About + homepage philosophy + shared privacy stance.

---

## Page checklist

### Marketing

| Page | Loads | Nav | Footer (w/ JS) | Primary CTA | Notes |
|------|-------|-----|----------------|-------------|-------|
| `/` | OK | Shell | OK | App cards | Static apps without JS |
| `/about.html` | OK | Shell | OK | Contact / apps | Philosophy expanded |
| `/support.html` | OK | Shell | OK | Bug / feature | Volunteer card added |
| `/contact.html` | OK | Shell | OK | Send message | Mailto noscript fallback |
| `/privacy.html` | OK | Shell | OK | Choices | Honest third parties |
| `/knowledge.html` | OK | Shell | OK | Filters | Demo fixtures labeled |

### Product landings

| Landing | Static story complete | Routes linked |
|---------|----------------------|---------------|
| Dashboard | Yes | — |
| Scenes | Yes | Experiences |
| Photo Coach (Scenes + live) | Yes | Open coach |
| ForageCast | Yes | Pillars via app when JS on |
| Fieldry | Yes | App when JS on |
| Sheds | Yes | Field map CTA |
| Steepleaf | Yes | — |
| SignalTerrain | Yes | Summary / Topics / Graph |
| Savant | Yes | — |
| Volunteer | Yes | Discover |

---

## Contact pathway QA

| Check | Result |
|-------|--------|
| Visible email `contact@waypointstudio.org` | Present in local HTML |
| Required fields labeled | Yes |
| Validation / status region | Present (`#wcs-form-status`) |
| Categories / apps populate with JS | Yes (config includes Volunteer) |
| Without JS | Mailto instructions shown |
| Mobile layout | Single column form — OK |
| End-to-end delivery on production | **Not re-verified this sprint** — see `CONTACT-PRODUCTION-VERIFICATION-2026-07.md`; owner must activate FormSubmit after deploy |

---

## Technical QA

| Item | Local status |
|------|--------------|
| Responsive marketing layouts | OK (visual spot-check) |
| Dark theme default | OK |
| Light mode | Partial — system CSS; not fully dual-skinned |
| Keyboard / skip link | Skip present; Apps modal needs JS |
| ARIA busy on hydrating mounts | Present |
| Favicon | `favicon.svg` |
| Manifest | `site.webmanifest` |
| Open Graph / Twitter / canonical | Key pages |
| robots.txt | Present |
| sitemap.xml | Present |
| 404.html | Present |
| Structured data JSON-LD | Not added |
| Automated contact tests | 122 PASS |
| Volunteer foundation tests | PASS |

---

## Pretend-first-time answers

**“What does Waypoint Studio build?”**  
Calm software that helps people observe, understand, create, and share — private by default.

**“Is SignalTerrain a hacking tool?”**  
No. Public copy frames Radio & Spectrum literacy and educational Cyber Awareness only.

**“Is Volunteer a scheduling product?”**  
No. It helps you discover what good you can do today.

**“Where do I start outdoors?”**  
Dashboard for conditions; ForageCast / Fieldry / Sheds for land and notes; Scenes for photography.

---

## Remaining issues (post-local fix)

| ID | Issue | Owner next step |
|----|-------|-----------------|
| Q-1 | Live site may not yet include Volunteer / SEO assets / copy | Approve → commit → push → confirm Pages |
| Q-2 | FormSubmit activation / delivery | Follow contact verification checklist |
| Q-3 | Shell chrome without JS | Optional progressive nav later |
| Q-4 | JSON-LD / PNG icons / light-mode polish | Optional follow-up |
| Q-5 | Design-system URLs still public | Optional robots disallow |

---

## Sign-off

| Role | Status |
|------|--------|
| Agent QA (local) | Ready for owner review |
| Owner review | **Pending** |
| Commit / push | **Do not proceed until approved** |
