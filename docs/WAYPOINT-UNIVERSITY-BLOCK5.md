# Waypoint University — Module 5 Report

**Date:** 2026-07-18 / 2026-07-19  
**Schema:** 1.4.0  

---

## Exact access (preferred available path)

Because the repo deploys as **static GitHub Pages with no authentication**, a private `university.waypointstudio.org` cannot be delivered securely in this work block without new infrastructure.

**Working access now:**

```bash
cd /home/bryan/projects/waypoint-scenes/private/university
./start.sh setup
./start.sh
```

Open **http://127.0.0.1:8787/** and sign in.

Full handoff: `private/university/ACCESS.md`

---

## First workflow — verification matrix

| Step | Result |
|------|--------|
| Sign in | Supported via owner server |
| Create “Spatial Computing” | Home Quick capture / Knowledge New |
| Markdown body | Editor + preview; Markdown renderer supports headings, emphasis, lists, checklists, links, code, tables, rules |
| Tags / path / project | Editor fields + Connections |
| Open question + source | Create + link (`questions`, `references`) |
| Save / navigate / return / edit | IndexedDB put/get |
| Search | In-memory index rebuilt on refresh after save |
| Find via project / path | Project hub + Paths detail (`part-of`) |
| Relationships | Item Connections + Graph |
| Restart app | IDB persists; re-sign-in if cookie expired |
| Automated model proof | `module5-smoke.mjs` passes Spatial Computing graph/search/hub checks |

Owner should still run the full browser journey once after setup (IDB cannot be fully exercised in Node).

---

## Honest readiness

| Question | Answer |
|----------|--------|
| Can the owner access it now? | **Yes** — local authenticated URL above |
| Secure sign-in? | **Yes** on loopback (scrypt + HttpOnly cookie) |
| Create & retrieve real knowledge? | **Yes** |
| Survive restart? | **Yes** (same browser profile) |
| Search functional? | **Yes** |
| Backup/export functional? | **Yes** (JSON + Markdown download) |
| Safe on public internet? | **No** |
| Before V1.0 | Remote private host/TLS, media backup, merge/restore, scale hardening |

---

## Security findings

**Completed:** owner-only auth, no open signup, CSRF on login, rate limit, HttpOnly SameSite cookies, noindex, Pages exclusion of `private/`, secrets gitignored, no default password.

**Remaining:** device/browser profile risk for IDB; no 2FA; remote deploy unset; do not bind `0.0.0.0` without TLS + Access.
