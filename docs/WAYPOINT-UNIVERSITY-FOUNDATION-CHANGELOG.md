# Waypoint University — Foundation Changelog

**Work block:** 1 — Foundation  
**Date:** 2026-07-18 / 2026-07-19  
**Status:** Uncommitted — do not push until requested  

---

## Summary

Created a **private** lifelong knowledge OS under `private/university/`, isolated from the public Waypoint Studio suite, with local-first IndexedDB storage, explainable search, Markdown, learning paths, project tags, and relationship architecture.

---

## Added

### Application
- `private/university/index.html` — SPA entry (`noindex`)  
- `private/university/css/wu.css` — calm serif/sans reading UI  
- `private/university/js/wu-schema.js` — kinds, relations, projects, path templates  
- `private/university/js/wu-store.js` — IndexedDB nodes/edges/media/meta/revisions  
- `private/university/js/wu-search.js` — inverted index + match reasons  
- `private/university/js/wu-markdown.js` — Markdown (code, tables, callouts, checklists, math hooks)  
- `private/university/js/wu-app.js` — Home, Capture, Search, Paths, Library, Questions, Projects, Connections, Review stub, Settings  

### Privacy / deploy
- `private/README.md`  
- `robots.txt` — `Disallow: /private/`  
- `.github/workflows/pages.yml` — strip `private/` before Pages upload  

### Documentation
- `docs/WAYPOINT-UNIVERSITY-ARCHITECTURE.md`  
- `docs/WAYPOINT-UNIVERSITY-KNOWLEDGE-MODEL.md`  
- `docs/WAYPOINT-UNIVERSITY-ROADMAP.md`  
- `docs/WAYPOINT-UNIVERSITY-FOUNDATION-CHANGELOG.md`  

---

## Explicitly not built (as requested)

- Spaced repetition UI  
- AI tutoring  
- Flashcards / quizzes  
- Public sharing  

Architecture hooks reserved (`review`, media future flags).

---

## Honest assessment vs Version 1.0

| Criterion | Foundation |
|-----------|------------|
| Capture effortlessly | **Yes** — quick capture + ⌘/Ctrl+K |
| Discover connections | **Yes** — relation vocabulary + connections panel (list, not spatial graph yet) |
| Find anything instantly | **Yes** for thousands; needs worker/virtualization for huge corpora |
| Organize without rigid folders | **Yes** — kinds + links + paths |
| Grow for decades | **Architecture yes**; media backup + revisions UI + scale work remain |

**Verdict:** Ready to start a lifetime of private learning. Not yet V1.0 — see roadmap.
