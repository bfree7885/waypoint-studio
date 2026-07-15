# Waypoint Studio Security Playbook v1.0

> Privacy-first security and safety standards for the platform.

Waypoint Studio holds location context, photos, notes, and curiosity-rich
local data. Security here is inseparable from Product Standards: privacy is
the default, and trust dies if we mishandle user data or quietly phone home.

Complements:

- `docs/PRODUCT_STANDARDS.md` — privacy and trust
- `docs/ENGINEERING-PLAYBOOK.md` — security reviewer role
- `docs/QA_PLAYBOOK.md` — severity for privacy/security defects
- `docs/RELEASE_PLAYBOOK.md` — ship blockers
- `docs/LESSONS_LEARNED.md`

------------------------------------------------------------------------

# Mission

Protect people and their data while keeping the product local-first, honest,
and usable.

Security work should reduce harm without introducing surveillance,
engagement-tracking, or complexity that pushes users toward unsafe workarounds.

------------------------------------------------------------------------

# Security Philosophy

1. **Privacy is a security feature.** Collect less; retain less; transmit less.
2. **Local-first whenever practical.** Prefer on-device state over accounts and
   servers when product goals allow.
3. **Defense in depth.** Validate inputs, encode outputs, minimize trust in
   third parties.
4. **Fail closed on secrets; fail open on curiosity.** Never leak credentials;
   do allow offline learning with honest degradation.
5. **No security theater.** Warnings must be accurate; CSP and headers must be
   real, not cargo-culted.
6. **Assume browsers are hostile environments.** XSS, open redirects, and
   dependency abuse are material.

------------------------------------------------------------------------

# Privacy-First Architecture

## Defaults

- Location remains on-device unless the user knowingly shares it
- Photos and libraries prefer local catalogs over mandatory cloud sync
- Permissions are requested in context with plain-language purpose
- Analytics and tracking are absent by default; if ever introduced, they must
  be explicit, minimal, and documented in Product Standards updates

## Data classes (conceptual)

| Class | Examples | Handling |
|-------|----------|----------|
| Sensitive personal | Precise location, personal photos | Local; minimize export; careful logging |
| Operational | Region ids, UI settings | Local storage OK; avoid cross-site leakage |
| Public reference | Species essays, regional guides | May load from content engine or CDN-like paths |
| Provider metadata | Weather statuses, trail names | Treat as untrusted input for XSS |

------------------------------------------------------------------------

# Local-First Guidance

- Design features that work without an account
- Persist preferences in well-namespaced local storage keys
- Document migration for storage schema changes (runtime migration patterns)
- When network providers are used (weather, maps tiles, geocoders), send only
  what the provider needs; avoid attaching identity

If a future sync or account layer appears, it must be opt-in and layered atop
local ownership—not a rewrite that forces cloud dependency for core tools.

------------------------------------------------------------------------

# Input Validation

Validate at boundaries:

- Location search strings and coordinates
- File uploads (type, size expectations; handle bad files calmly)
- URL parameters and hash routes
- JSON from content engine and third-party providers
- Messages posted to workers or `postMessage` peers (explicit origin checks)

Treat all external JSON as hostile. Missing fields should degrade honestly—
never eval provider text.

------------------------------------------------------------------------

# Output Encoding

- Prefer textContent / safe templating patterns over string-built HTML when
  inserting untrusted strings
- If HTML assembly is required, escape user- and provider-derived strings
- Sanitize or strictly allowlist any markdown/HTML rendering paths
- Never inject unsanitized query parameters into HTML or script URLs

XSS in a local-first app still matters: it can exfiltrate local data and photos.

------------------------------------------------------------------------

# Secrets Management

- No API keys with broad power embedded in public frontend code unless the
  key is designed for public restriction and documented as such
- Prefer provider configurations that do not require secret keys in the browser
- `.env` and credential files stay out of git; never stage them in commits
- Rotated or leaked secrets trigger immediate owner notification

Agents and humans: do not commit credentials, tokens, or private photo dumps.

------------------------------------------------------------------------

# Dependency Review

When adding or upgrading dependencies:

- Prefer small, known modules over novelty frameworks
- Check maintenance status and unusual install scripts
- Avoid packages that pull telemetry by default
- Record why a dependency is worth its supply-chain risk

Static site architecture reduces some server risk but increases the importance
of XSS-safe dependencies and careful CDN/font sources.

------------------------------------------------------------------------

# CSP Guidance

Content Security Policy should tighten over time as the platform stabilizes.

## Direction of travel

- Default to disallowing inline script where feasible
- Allowlist trusted script/style origins consciously
- Restrict `frame-ancestors` / framing as appropriate
- Avoid `unsafe-eval` unless absolutely required and documented

CSP breakages should be fixed by removing unsafe patterns—not by casually
disabling the policy.

If a page cannot yet adopt a strict CSP, document the gap rather than claiming
a strong posture.

------------------------------------------------------------------------

# Authentication Principles

Today many surfaces are offline-capable and accountless. When authentication
exists or is introduced:

- Prefer standard, well-understood protocols over inventing cryptosystems
- Session tokens stay HttpOnly/Secure when server-backed sessions appear
- Personal libraries must not become world-readable by guessing IDs
- Logout and session revocation behave predictably

Do not fake an authenticated experience client-side with only obscurity.

------------------------------------------------------------------------

# Authorization Principles

- Authorization decisions belong where data is authoritative (future servers)
  or in clear client ownership models (this device’s local data)
- UI hiding is not authorization
- Shared links or export bundles must not accidentally include private GPS
  traces without consent flows
- Admin or debug panels must not appear in production UX without protection

------------------------------------------------------------------------

# Logging

## Allowed

- Anonymous technical diagnostics on-device (build id, feature flags, non-precise
  region labels)
- Error messages that help recovery without dumping PII

## Disallowed

- Shipping precise coordinates to third-party log drains without consent
- Logging photo binaries or EXIF-heavy payloads to remote sinks
- Console spam that includes secrets or tokens

Debug snapshots for local troubleshooting should default to local storage and
avoid automatic remote upload.

------------------------------------------------------------------------

# Error Handling

Security-aware error handling:

- Do not leak proprietary pathnames, secret env values, or provider keys in UI
- Distinguish “permission denied”, “offline”, and “provider unavailable”
  without sarcastic or misleading blame
- Failed cryptographic or integrity checks must stop unsafe use of the data

Pair with UI/UX and QA playbooks so errors remain calm and recoverable.

------------------------------------------------------------------------

# Threat-Oriented Notes for This Codebase

| Risk | Why it matters here | Mitigation mindset |
|------|---------------------|--------------------|
| XSS via provider HTML | Weather / trail names / user notes | Escape, CSP, avoid raw HTML sinks |
| Stuck overlays | Blocks consent and navigation | Hide rules, focus return, QA smoke |
| Open redirects | Launcher / return URLs | Allowlist internal destinations |
| Dependency compromise | Shared `node_modules` tooling | Minimal deps, review upgrades |
| Location privacy | Core of outdoor intelligence | On-device storage; transparent prompts |

------------------------------------------------------------------------

# Security Review Checklist

- [ ] No secrets or credentials in the change set
- [ ] Untrusted strings encoded/escaped at HTML boundaries
- [ ] Uploads and external JSON handled as untrusted
- [ ] Permissions prompts remain clear and necessary
- [ ] Logging avoids PII / precise location exfiltration
- [ ] New network calls justified; destinations understood
- [ ] Dependencies added consciously with short rationale
- [ ] CSP / safety headers not weakened without documentation
- [ ] Authz not assumed from UI-only checks (if auth exists)
- [ ] Error paths do not leak sensitive internals
- [ ] Privacy posture matches Product Standards
- [ ] Findings severity-aligned with QA Playbook (privacy = high)

------------------------------------------------------------------------

# Versioning

**Security Playbook v1.0.** Living document. Update when auth, sync, CSP, or
provider posture materially changes.
