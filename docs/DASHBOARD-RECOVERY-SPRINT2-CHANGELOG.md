# Production Recovery Sprint 2 — Changelog

**Date:** 2026-07-19  
**Scope:** Dashboard reliability & Outdoor Intelligence experience  
**Constraint:** No unrelated app redesign · **DO NOT COMMIT / DO NOT PUSH** (owner ships)

---

## Summary

Dashboard is repositioned as a **Today Outside** outdoor intelligence briefing: interpretive bullets with explicit **Why** lines, clearer provider isolation, less false “Partial success,” panel-question navigation (including Settings), and reduced metric duplication between Weather and Photography.

---

## Changes

### Today Outside (centerpiece)

- Reworked `wds-dashboard-today-summary.js`
  - Eyebrow: **Today Outside**
  - Hero shows verdict + up to **3 preview** bullets with Why
  - Today tab shows full briefing (text + Why)
  - Interpretations for fog/humidity, wind/telephoto, UV, AQI, heat, rivers, wildlife, photography light
- Strengthened `wds-dashboard-brief.js` verdict details (heat, humidity fog, wind)

### Provider reliability

- `classifyBlockStatus` treats **skipped / pending / empty / no-nearby / cached** as non-failures
- Critical trust path = weather + alerts + air quality (rivers/elevation/trails no longer force Partial alone)
- OIP marks point providers **skipped** when coords are absent; trails start as **pending**
- Banner copy: **Partial conditions** + which providers failed vs waiting on location
- `home-boot.js` clears `aria-busy` on success; catches init failure with Retry

### Tabs & dedupe

- Tabs: Today · Weather · Photography · Rivers · Air · Sun & Moon · Alerts · **Settings**
- Each detail tab states its **one question**
- Customize moved into Settings (footer Customize removed)
- Weather outdoor grid: Walking / Hiking / Wildlife only (Photography removed)
- Weather metrics include short Why under humidity / wind / UV
- Photography intro: clock times live under Sun & Moon

### Polish

- Recovery CSS: Why typography, preview clamp, larger touch tabs, panel enter motion, settings layout
- Loading skeleton copy: “Today Outside — building your briefing”

### Tests

- Updated `test-dashboard-reliability.mjs`
- New `test-dashboard-today-outside.mjs`
- Wired into CI

---

## Verification

```bash
node automation/test-dashboard-reliability.mjs
node automation/test-dashboard-today-outside.mjs
node automation/test-production-recovery.mjs
```

All passed locally.
