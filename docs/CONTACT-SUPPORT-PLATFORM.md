# Waypoint Studio — Contact & Support Platform v1

**Status:** Locally corrected to `contact@waypointstudio.org` (Namecheap Private Email). Production Pages still serving prior mailbox until this pass is deployed. FormSubmit activation for the `.org` mailbox not yet end-to-end verified.  
**Do not confuse with a ticketing system.** One shared contact surface for the studio.

---

## Purpose

Give visitors a calm, private way to reach the developer — questions, bugs, features, scientific corrections, privacy concerns — without social feeds or marketing capture.

---

## Architecture

```
Apps / footer deep links
        │
        ▼
 contact.html  ←── wds-contact.js  ←── contact-config.json
        │
        ▼
 FormSubmit AJAX ──► contact@waypointstudio.org
```

| Piece | Path |
|-------|------|
| Config | `design-system/ecosystem/contact-config.json` |
| Client | `design-system/js/platform/wds-contact.js` |
| Styles | `design-system/css/wds-contact.css` (+ footer links in `wds-app-shell.css`) |
| Pages | `contact.html` · `support.html` · `about.html` · `privacy.html` |
| Footer | `wds-app-shell.js` → Contact / Support / Report bug / Request feature / About / Privacy |

**Future hooks** (not built): knowledge-base, issue-tracker, feature-voting, beta-program, research-collaboration, community-feedback — reserved in config.

---

## Email flow

1. User submits the form after validation + consent.
2. Client POSTs JSON to FormSubmit (`https://formsubmit.co/ajax/contact@waypointstudio.org`).
3. Developer receives email with category, app, message, and optional tech context.
4. Failure/timeout surfaces a calm error and mailto fallback.

**Owner activation:** The first live FormSubmit delivery requires confirming the activation email once in the `contact@waypointstudio.org` inbox.

Override: set `delivery.overrideEndpoint` in config for Formspree/Web3Forms if preferred.

---

## Spam protection

- Honeypot field (`company_website`)
- Minimum time-on-page
- Client rate limit (3 / hour / browser via localStorage)
- Required consent + length limits
- Input validation / sanitization in email body construction
- No public attachment upload

---

## Deep links

```
/contact.html?category=bug&app=shed-hunting&includeTech=1&subject=...
```

`WDS.contact.open({ category, app, subject })` and footer “Report bug” links auto-fill context.

---

## Privacy honesty

Privacy page states:

- Local storage defaults for field data
- Map/weather providers see approximate request location
- Contact uses FormSubmit (not E2E encrypted)
- No “zero network” claim

---

## Tests

```bash
node automation/test-contact-platform.mjs
```

---

## See also

- [WAYPOINT-STUDIO-CONSTITUTION.md](WAYPOINT-STUDIO-CONSTITUTION.md) — Privacy Philosophy
- [support.html](../support.html) · [privacy.html](../privacy.html)
