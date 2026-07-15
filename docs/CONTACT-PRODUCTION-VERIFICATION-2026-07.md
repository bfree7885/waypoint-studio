# Contact System — Production Verification Report

**Date:** 2026-07-15  
**Branch:** `main` (local working tree; **not committed**)  
**Correct mailbox:** `contact@waypointstudio.org` (Namecheap Private Email)  
**Incorrect prior mailbox:** `contact@waypoint.studio`  
**Production site:** https://waypointstudio.org  

---

## 1. Executive Summary

Users **cannot yet reliably contact the owner through production** for this corrected pathway.

- **Locally (this working tree):** the shared Contact & Support system targets `contact@waypointstudio.org`, FormSubmit endpoint is correct, validation/failure UX is hardened, privacy copy is honest, and automated tests pass (122).
- **Live production (GitHub Pages):** still serves the prior address `contact@waypoint.studio` on Contact and Privacy until these changes are reviewed, committed, and deployed.
- **FormSubmit activation** for `contact@waypointstudio.org` is **not delivery-verified**. Code cannot activate the mailbox; the owner must complete the activation steps after deploy.

**Verdict:** Production-ready *in repo* after owner review + deploy + FormSubmit activation + second confirmed inbox delivery. Not yet end-to-end operational on the live site.

---

## 2. Address Correction

| File | Old value | New value | Reason |
|------|-----------|-----------|--------|
| `design-system/ecosystem/contact-config.json` | `contact@waypoint.studio` (+ FormSubmit AJAX path) | `contact@waypointstudio.org` | Canonical config / delivery endpoint |
| `design-system/js/platform/wds-contact.js` | Default / fallback `.studio` mailbox | `contact@waypointstudio.org` | Client fallback + mailto/error copy |
| `contact.html` | `mailto:` / visible `.studio` | `.org` | Public contact surface |
| `privacy.html` | `.studio` disclosure + mailto | `.org` + Namecheap notes | Privacy accuracy |
| `docs/CONTACT-SUPPORT-PLATFORM.md` | `.studio` in flow docs | `.org` | Operator documentation |
| `design-system/js/wds-geocode-service.js` | UA contact `.studio` | `.org` | Provider User-Agent identity |
| `design-system/js/weather/wds-nws-alerts-service.js` | UA contact `.studio` | `.org` | Provider User-Agent identity |
| `design-system/js/trails/wds-trail-conditions-service.js` | UA contact `.studio` | `.org` | Provider User-Agent identity |

**Intentionally not changed:** schema `$id` / namespace URIs using `https://waypoint.studio/schemas/...` (identifiers, not mailboxes); unrelated Sync/importer emails.

**Post-correction scan:** repository text sources have **zero** remaining `contact@waypoint.studio` (verified by `automation/test-contact-platform.mjs` address lock).

---

## 3. Activation Status

**FormSubmit for `contact@waypointstudio.org`:** **Awaiting deploy + first production submission + inbox confirmation** (not Activated; not end-to-end delivery verified).

Owner actions still required:

1. Review and approve this working tree (do not include unrelated dirty files).
2. Commit/push so GitHub Pages publishes the `.org` endpoint.
3. Open https://waypointstudio.org/contact.html and confirm visible address is `contact@waypointstudio.org`.
4. Submit one short test message from the live Contact page.
5. Open the Namecheap Private Email inbox for `contact@waypointstudio.org`.
6. Open the FormSubmit confirmation/activation email and click the activation link.
7. Submit a **second** test message.
8. Confirm the second message arrives in the inbox with readable context fields.
9. Only then treat the pathway as Activated + delivery-verified.

---

## 4. Delivery Verification

| Check | Result |
|-------|--------|
| Local config endpoint | `https://formsubmit.co/ajax/contact@waypointstudio.org` |
| Mock success (`success:"true"`) | Pass (automated) |
| Mock rejection (`success:"false"`) | Pass — no false success toast |
| Mock HTTP 500 | Pass — error + mailto fallback path |
| Live production FormSubmit recipient | Still `.studio` until deploy |
| Real inbox receipt (post-activation) | **Not verified** (owner action) |

Delivered body (when tech context included) is structured: category, app, from, UTC timestamp, message, then a short Context block (source page, production URL, build, viewport, platform, language, timezone, browser). Subject lines are sanitized (no raw CR/LF). Honeypot posts `_honey: ""`.

---

## 5. Sitewide Integration

| Surface | Support path | Verified |
|---------|--------------|----------|
| Studio homepage (`index.html`) | Contact / Support / About links | Local |
| Shared app footer (`wds-app-shell.js`) | Contact, Support, Report bug, Request feature, About, Privacy | Local + tests |
| Dashboard | Footer via app shell | Local |
| Scenes / Scene Builder / Photo Coach | Footer (Scenes product) | Local |
| ForageCast / Fieldry / Steepleaf / SignalTerrain / Savant Sommelier | Footer | Local |
| Sheds overview | Footer | Local |
| Sheds map | Explicit Report bug / Request feature / Support | Local |
| Support / About / Privacy / Contact pages | Cross-links | Local HTTP 200 |
| Terrainbound | Retired redirect → Fieldry (no separate form) | Inspected |
| Dashboard root redirect | → `apps/dashboard/` | Inspected |

Deep links prefill `category`, `app`, `subject`, `includeTech`, and preserve `page` when provided. All fields remain editable.

---

## 6. Privacy Review

**Sent (when user submits):** email; optional name; category; subject; message; optional related app; optional browser/viewport/build/UA/platform/language/timezone when “Include tech details” is checked; always basic page URL/path/build markers useful for routing; FormSubmit + mailbox delivery metadata.

**Not attached automatically:** GPS coordinates; private observations; search tracks; photo metadata; uploaded images; localStorage dumps; account secrets.

**Hosting truth:** FormSubmit processes the submission; delivery is to Namecheap Private Email at `contact@waypointstudio.org`. Contact is **not** on-device-only. Attachments are unsupported. Retention follows inbox + provider policies — no claim of zero provider logs or E2E encryption.

---

## 7. Spam and Security Review

| Layer | What it is | Strength |
|-------|------------|----------|
| Honeypot (`company_website`, `aria-hidden`) | Client usability / bot filter | Weak alone |
| Min time-on-page | Client timing guard | Weak alone |
| localStorage rate limit (3/hour) | Browser-local | Bypassable; **not** server security |
| Length limits + validation | UX + injection reduction | Client |
| `sanitizeLine` / multiline null strip | Reduce header/body injection | Client |
| FormSubmit `_honey`, captcha=false (AJAX) | Provider | Provider-dependent |
| Static GitHub Pages | No trusted backend rate limit | Inherent limitation |
| No secrets in client | Endpoint is a public FormSubmit mailbox URL | Expected for this architecture |

CAPTCHA avoided unless abuse forces it later.

---

## 8. Accessibility Results

| Check | Outcome |
|-------|---------|
| Real labels on fields | Pass (markup) |
| Required fields + consent | Pass |
| Field-level errors + `aria-invalid` / `aria-describedby` | Pass (client) |
| Status region `role="alert"` / `status` + focus on success/error | Pass (client) |
| Honeypot `aria-hidden` + `tabindex="-1"` | Pass |
| Reduced-motion CSS | Pass (stylesheet present) |
| Keyboard-only / SR / zoom / HC | **Code-reviewed;** live assistive QA still recommended on owner device after deploy |

---

## 9. Mobile and Browser Results

| Check | Outcome |
|-------|---------|
| Contact CSS + shell safe-area patterns | Present |
| Representative viewports / WebKit / Firefox / Chromium matrix | **Not fully instrumented in this pass** — visual polish previously shipped with Contact CSS; owner should spot-check iPhone Safari after deploy |
| Automated mobile viewport layout assertions | Limited to static structure + local page loads |

---

## 10. Automated Test Results

```bash
node automation/test-contact-platform.mjs
```

**Result:** All contact platform tests passed (**122**).

Coverage includes: address lock, config endpoint, page presence, footer deep links, app shell footers for major apps, validation (empty/invalid/whitespace/overlong/honeypot/offline/rate), sanitization, delivery body fields, mock success/failure, local HTTP link checks for Contact/Support/About/Privacy and category deep links.

---

## 11. Production Verification

| State | Status |
|-------|--------|
| Locally verified (code + config + pages) | Yes |
| Test-suite verified | Yes (122 pass) |
| Awaiting deployment | **Yes** |
| Deployed with `.org` mailbox | **No** (live still `.studio`) |
| Awaiting FormSubmit activation | **Yes** (after deploy) |
| Activated | Unknown / not confirmed |
| End-to-end delivery verified | **No** |

Evidence (live fetch 2026-07-15): production Contact/Privacy still disclose `contact@waypoint.studio`.

---

## 12. Files Changed (this pass — meaningful)

| File | Change |
|------|--------|
| `contact.html` | Correct mailbox display/mailto |
| `privacy.html` | `.org` + Namecheap + honest retention / non-collection list |
| `design-system/ecosystem/contact-config.json` | v1.0.1, `.org` endpoint, apps aliases (`sheds`/`shed-hunting`, `dashboard`, `scene-builder`) |
| `design-system/js/platform/wds-contact.js` | Correct default mail; sanitize; subject max; draft preserve on failure; FormSubmit `success:"false"` handling; richer context body |
| Provider UA strings (geocode / NWS / trails) | Contact email → `.org` |
| `docs/CONTACT-SUPPORT-PLATFORM.md` | Address + activation status |
| `automation/test-contact-platform.mjs` | Expanded production-readiness suite |
| `docs/CONTACT-PRODUCTION-VERIFICATION-2026-07.md` | This report |

**Unrelated dirty tree left alone:** `data/*`, `debug.html`, `status.html`, importer desktop, audit PDF tooling — do not stage with this work.

---

## 13. Remaining Limitations

- GitHub Pages is static — no trusted server-side rate limiting or private form proxy.
- FormSubmit is a third-party delivery hop; availability and abuse controls are theirs.
- Mailbox delivery depends on Namecheap Private Email remaining reachable.
- Client “rate limiting” is advisory only.
- Success means FormSubmit **accepted** the AJAX request — not a cryptographic proof the message is in the inbox (activation and spam folders matter).
- No attachment pipeline.
- Owner still performs human triage; this is not a ticket queue.

---

## 14. Recommended Commit Message

```
Point Contact & Support delivery at contact@waypointstudio.org.

Correct FormSubmit and mailto targets, document Namecheap hosting, harden draft preservation and provider success checks, and expand contact platform tests.
```

**Do not commit or push until owner review.**

---

## Implementation map (Phase 2 inventory)

| Component | File | Current behavior | Production-ready? | Required repair |
|-----------|------|------------------|-------------------|-----------------|
| Config | `design-system/ecosystem/contact-config.json` | Central endpoint + categories + spam | Ready in tree | Deploy |
| Contact client | `design-system/js/platform/wds-contact.js` | Validate, prefill, AJAX deliver, drafts | Ready in tree | Deploy + activation |
| Contact page | `contact.html` | Shared form UI | Ready in tree | Deploy |
| Support | `support.html` | FAQ + deep links | Ready | Deploy if pending |
| About | `about.html` | Mission + Contact link | Ready | — |
| Privacy | `privacy.html` | Honest FormSubmit/Namecheap copy | Ready in tree | Deploy |
| Footer | `wds-app-shell.js` | Contact/Support/bug/feature | Ready | — |
| Sheds map | `apps/shed-hunting/map/index.html` | Direct support links | Ready | — |
| Tests | `automation/test-contact-platform.mjs` | 122 asserts | Ready | Keep green |
| Live Pages | waypointstudio.org | Still wrong mailbox | **No** | Deploy this pass |
