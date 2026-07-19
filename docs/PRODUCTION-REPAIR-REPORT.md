# Production Repair Report — Sprint 1

**Date:** 2026-07-18  
**Commit status:** **Not committed. Not pushed.**

---

## Mission outcome

Repaired confirmed live-site defects that caused **404s**, **blank boots**, **duplicate entry points**, and **weak first paint**. No feature expansion.

---

## P0 fixed — foundation routes becoming site-root 404s

**Bug:** `WDS.platformFoundation.routeHref` treated paths starting with `/` as site-absolute. After foundation remount, Sheds “Open now → Field map” pointed at `/map/` (404) instead of `apps/shed-hunting/map/`.

**Fix:** Strip leading `/` → app-relative. Normalized all `apps/*/data/foundation.json` ready routes to relative paths (`map/`, `learn.html`, etc.).

---

## P1 fixed — shared boot shell

New `WDS.platformBoot` + `wds-platform-boot.css`:

- Product identity, title, detail, progress bar, status  
- Timeout → failure UI with Retry / Studio home / Support  
- Wired into ForageCast shell/home, Savant/Steepleaf/Fieldry landings, FC/Savant/ST subpages  

Replaced empty `#savant-page` busy mounts and “Preparing…” / “Opening outdoor intelligence…” shells.

---

## P1 fixed — routing duplication

- `apps/scenes/photo-coach|hidden-landscapes|photo-library` → **canonical redirects** to live apps  
- Scenes hub + `nav-registry` + `wds-app-nav-config` Photo Coach / HL / Library hrefs → live `apps/photo-coach/` etc.

---

## Content / consistency

- ForageCast home: one boot headline (aligned with product question)  
- Fieldry: static + JS title aligned (“A private life list”)  
- Sheds: removed duplicate intro above foundation hero; primary CTA “Open field map”  
- Volunteer: static lead synced to foundation.json  
- Studio Home: single lead paragraph; trimmed hero legal duplicates (footer remains canonical)  
- Sheds map tools: added About + Privacy  

---

## Automation

```bash
node automation/validate-production-links.mjs   # pre-deploy gate
node automation/test-production-repair.mjs
```

---

## Honest assessment for more beta invites

**Another repair sprint is still recommended before broad invites**, focused on:

1. Dashboard cold-load / bundle split (not addressed here — performance debt)  
2. SignalTerrain cyber “Opening…” pages still mostly custom skels (partially improved via boot injection)  
3. Remaining empty busy warnings from validator (nested volunteer/cyber mounts)  
4. Field CWV measurement  

Core P0 404 + blank boot quality are materially better for closed beta.
