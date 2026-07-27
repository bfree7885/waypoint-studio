# Turnaround Sprint 3 — Static Hosting Security and Privacy Hardening

**Date:** 2026-07-26  
**Branch:** `turnaround/sprint-03-security-hardening`  
**Base:** Sprint 2 content tip `7f2681b`  
**Scope:** Honest hardening within GitHub Pages limits — no fake edge header files, no merge/deploy.

Audit issues addressed: **P2-006**, **P3-006** (documented platform CORS), operator follow-through, EXIF/location privacy clarity.

---

## Protections actually implemented

| Control | Mechanism | Enforceable today? |
| --- | --- | --- |
| Referrer policy | `<meta name="referrer" content="strict-origin-when-cross-origin">` | **Yes** (browser meta) |
| Content-Security-Policy | `<meta http-equiv="Content-Security-Policy" …>` on public HTML | **Yes** for allowed meta directives |
| External-link hardening | `wds-security-baseline.js` adds `rel="noopener noreferrer"` | **Yes** |
| Form action allowlist | CSP `form-action 'self' https://formsubmit.co` | **Yes** (meta CSP) |
| `object-src 'none'` / `base-uri 'self'` | Meta CSP | **Yes** |
| Leaflet SRI `crossorigin="anonymous"` | HTML | **Yes** |
| Operator dumps | Remain stubs publicly; full HTML under `private/operator/` (Sprint 2) | **Yes** |
| Privacy copy (EXIF / GPS / uploads / FormSubmit / local storage) | `privacy.html` + Photo Coach trust note | **Yes** (honest UX) |

Canonical policy source: `design-system/security/baseline.json`  
Injector: `scripts/inject-security-meta.mjs` (also run in Pages build)

---

## Hosting limitations (do not over-claim)

Live production probe of `https://waypointstudio.org/` (2026-07-26):

| HTTP header | Present? | Repo-controlled? |
| --- | --- | --- |
| `Strict-Transport-Security` | Yes (`max-age=31556952`) | **No** — GitHub Pages platform |
| `Access-Control-Allow-Origin` | `*` | **No** — platform default; cannot remove from repo alone |
| `Content-Security-Policy` | **No** | Unsupported as HTTP on Pages |
| `X-Frame-Options` | **No** | Unsupported as HTTP on Pages |
| `X-Content-Type-Options` | **No** | Unsupported as HTTP on Pages |
| `Referrer-Policy` | **No** (meta used instead) | Unsupported as HTTP on Pages |
| `Permissions-Policy` | **No** | Unsupported as HTTP on Pages |

**Explicit non-claims**

- No `_headers`, `.htaccess`, `netlify.toml`, or `vercel.json` was added — GitHub Pages would ignore them.
- Meta CSP **does not** include `frame-ancestors` (browsers ignore it in meta). True clickjacking defense requires an edge/CDN that can set HTTP CSP or `X-Frame-Options`.
- MIME sniffing protection (`X-Content-Type-Options: nosniff`) and `Permissions-Policy` are **not** active as HTTP headers and have no valid HTML-meta substitute claimed here.

Evidence: `docs/turnaround/2026-07-26-sprint-03/security-posture.json`

---

## External dependencies reviewed

| Dependency | Role | Notes |
| --- | --- | --- |
| Google Fonts | Typography | Allowed in CSP `style-src` / `font-src` |
| FormSubmit | Contact AJAX relay | Allowed in `form-action` + `connect-src https:`; privacy copy already honest |
| jsDelivr / unpkg Leaflet | Map library | SRI + `crossorigin="anonymous"` on Sheds map / Volunteer discover |
| OpenStreetMap / OpenTopoMap / Carto tiles | Maps | `img-src https:` / `connect-src https:` |
| Open-Meteo, api.weather.gov | Weather / alerts | HTTPS connect |
| Nominatim, ipwho.is, Photon | Geocode / IP fallback | HTTPS connect |
| USGS / Overpass | Water / trails | HTTPS connect |
| Optional OpenWeather / Visual Crossing | Only if runtime `apiKey` configured | **No keys in public repo** |

---

## Secret-scan result

`automation/scan-public-secrets.mjs` → **0 hits**  
Evidence: `docs/turnaround/2026-07-26-sprint-03/secret-scan.json`

Provider API keys for paid weather remain configure-at-runtime only; NVD key stays in engine env (`process.env`), not public bundles.

---

## Privacy messaging updates

- **Privacy page:** new “Photos, EXIF, and location” section — on-device photo analysis, local EXIF/GPS read, geolocation permission, local storage.
- **Photo Coach:** trust note states photographs and EXIF (including GPS tags) are not uploaded to Waypoint servers.
- Contact / FormSubmit wording retained (already accurate).

---

## Tests

| Check | Result |
| --- | --- |
| `scan-public-secrets.mjs` | Pass (0 hits) |
| `check-static-security-posture.mjs` | Pass — classifies HTTP vs meta vs unsupported; no fake header files |
| `validate-production-assets.mjs` | Pass (559 HTML refs, 0 missing) |
| `test-home-rc1.mjs` | Pass (54/54) |
| `smoke-sprint-03-security.mjs` | Pass — home, privacy, contact, support, dashboard, photo-coach, status stub; **0 CSP violations** logged |

Evidence: `docs/turnaround/2026-07-26-sprint-03/browser-smoke.json`

---

## Files of note

- `design-system/security/baseline.json`
- `scripts/inject-security-meta.mjs`
- `design-system/js/platform/wds-security-baseline.js`
- `design-system/js/wds.js` (loads baseline)
- `.github/workflows/pages.yml` (runs injector on deploy artifact)
- `automation/check-static-security-posture.mjs`
- `automation/scan-public-secrets.mjs`
- `automation/smoke-sprint-03-security.mjs`
- Public HTML (116 files) with injected security meta markers
- `privacy.html`, `apps/photo-coach/index.html`

---

## Recommended follow-up (out of scope)

To get true HTTP `CSP` / `X-Frame-Options` / `nosniff` / `Permissions-Policy` and to tighten CORS, put Cloudflare (or similar) in front of Pages and configure Response Header Transform Rules — then update the posture checker’s “true HTTP headers” expectations.
