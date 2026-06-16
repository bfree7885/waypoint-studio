# MVP Release Checklist

**Mission:** Observe. Understand. Create. Share.  
**Target:** v0.1.0 public MVP  
**Launch readiness score (post-review):** 82 / 100

---

## Release checklist

### Core product
- [x] Living Scene — upload, presets, Effects Studio, live preview
- [x] Interactive Parallax — mouse/touch/tilt, presets, calm defaults
- [x] Photography — portfolio, modal, workflow buttons
- [x] Learn — 101/102 curriculum framework
- [x] Export — preview + PNG snapshot download
- [x] Real portfolio images in `assets/Images/` (3 wired for soft launch; remaining SVG placeholders)

### Quality
- [x] Upload validation + workspace error banner
- [x] Image state sync (Living Scene ↔ Parallax)
- [x] Studio sidebar dimmed until image loaded
- [x] Tab keyboard navigation (arrow keys)
- [x] Modal focus trap (Photography)
- [x] Skip link + scroll-margin for sticky topbar
- [x] `prefers-reduced-motion` respected in JS loops
- [ ] Full mobile device test (iOS tilt permission)
- [ ] Cross-browser: Safari, Firefox, Chrome

### Docs
- [x] Root README
- [x] CHANGELOG.md
- [x] `.ai-agents/` roles

---

## Remaining tasks (post-MVP polish)

| Priority | Task |
|----------|------|
| High | Wire remaining portfolio entries to `assets/Images/` |
| High | Mobile tab navigation (scroll + short labels) — done v0.1.0 prep |
| High | WDS.gallery for Collections — done v0.1.0 prep |
| High | Video export (stub exists) |
| Medium | True parallax depth layers / subject masking |
| Medium | Learn tab illustrations or short inline videos |
| Low | PWA manifest + offline shell |
| Low | Analytics-free usage telemetry opt-in |

---

## Suggested commits

1. `feat: premium studio shell, learn curriculum, and QA fixes`  
2. `feat(motion): natural drift for fog, rain, snow, fireflies, camera`  
3. `feat(export): add PNG snapshot download`  
4. `docs: MVP release checklist and changelog`  

---

## Future milestones

| Version | Focus |
|---------|--------|
| **v0.1.0** | MVP — five tabs, snapshot export, portfolio |
| **v0.2.0** | Real assets, education polish, performance pass |
| **v0.3.0** | Video export loop, parallax export |
| **v0.4.0** | AI depth / scene intelligence (Coming Soon items) |

---

## Launch readiness rubric

| Area | Score | Notes |
|------|-------|-------|
| Core workflows | 90% | Upload → preset → export path complete |
| Design polish | 80% | Premium shell applied; icons still minimal |
| Motion quality | 82% | Subtle defaults; room for per-effect art pass |
| Education | 75% | Framework + copy; needs media |
| Accessibility | 72% | Improved focus + tabs; audit screen readers |
| Performance | 85% | No build step; canvas scales with DPR cap |

**Overall: 78 / 100** — acceptable for public MVP with clear roadmap messaging.
