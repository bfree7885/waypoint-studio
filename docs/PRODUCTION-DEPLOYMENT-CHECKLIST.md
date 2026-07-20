# Deployment Checklist — Production Recovery Sprint 1

**Before deploy (local)**

- [ ] `node automation/validate-production-assets.mjs` exits 0  
- [ ] `node automation/validate-production-links.mjs` exits 0  
- [ ] `node automation/test-production-recovery.mjs` exits 0  
- [ ] `node automation/test-production-repair.mjs` exits 0  
- [ ] Smoke: Studio Home, Dashboard, ForageCast, Fieldry, Photo Coach, Sheds → map, Savant, Steepleaf explore  
- [ ] Confirm `/map/` redirect page present  
- [ ] Confirm live engine URLs are `/data/live.json` (not app-relative)  
- [ ] Airplane-mode: apps show Retry boot failure, not blank infinite loading  

**Deploy**

- [ ] Commit + push to `main` (owner) — Pages job runs asset/link validation then publishes  
- [ ] Confirm Actions → Deploy GitHub Pages succeeded  

**After deploy**

- [ ] Production: `/data/live.json` 200  
- [ ] Production: `/map/` redirects to Sheds map  
- [ ] Dashboard network: `/data/live.json` (not `/apps/dashboard/data/...`)  
- [ ] Dashboard: no NWS `point=0.0000,0.0000` on cold start  
- [ ] ForageCast: no “null, …” region label  
- [ ] Steepleaf explore usable or Retry  
- [ ] Re-run closed-beta framing (not public beta)

**Do not claim**

- Public beta readiness from infrastructure alone  
- Laboratory CWV scores without Lighthouse  
