# Recommendations Before Public Beta

**Date:** 2026-07-18  
**Commit status:** Not committed.

---

## Do before broad invite

1. **Owner review + commit** this hardening block (when ready).  
2. **Manual smoke** on real devices: Dashboard Today, ForageCast Conditions/Weather, Savant Discover/Cellar, Sheds Map pan/zoom, Volunteer Discover, SignalTerrain summary/live, Steepleaf explore.  
3. **Airplane-mode check** — confirm offline banner + cached/honesty states, not blank spinners.  
4. **Fix or quarantine** photo-pipeline / kiosk if shown in beta directory (or label “experimental”).  
5. **Lighthouse pass** on Dashboard + ForageCast Conditions; record baselines in `PLATFORM-PERFORMANCE-AUDIT.md`.

## Do soon after closed beta starts

1. Split `wds.js` into critical vs deferred specialty dashboards.  
2. Consolidate Volunteer weather onto `wds-weather-service`.  
3. Sheds map degraded-tile UI + optional MapView long-term plan.  
4. Studio **Diagnostics** page: `providerSnapshot()`, build version, online state.  
5. Pause background polling when `document.hidden`.

## Explicitly defer

- Accounts / cloud sync  
- Service worker full offline shell  
- AI features that invent live conditions  
- Visual redesign of apps already in recovery

## Beta messaging (product)

> Waypoint Studio is local-first. Live outdoor data depends on public providers. When live data is unavailable, we show cached or educational context and say so.

---

## Success bar for “comfortable inviting beta users”

- [x] Shared timeouts / retries / coalescing  
- [x] Offline banner + cache fallback on shared fetch  
- [x] Provider health visible in key Settings  
- [x] Route audit clean (0 broken local refs after Sheds fix)  
- [x] Automated reliability tests green  
- [ ] Field CWV baselines recorded  
- [ ] Sheds map degradation UX  
- [ ] Dashboard bundle trim started  

**Overall:** Suitable for **closed technical beta** with honest expectations. Not yet “set and forget” public launch without the checklist above.
