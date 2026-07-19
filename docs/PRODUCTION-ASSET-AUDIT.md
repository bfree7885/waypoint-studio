# Production Asset Audit

**Generated:** 2026-07-19T14:54:47.991Z

- HTML refs checked: **515**
- CSS @import edges: **49**
- wds.js modules: **120**
- Missing: **0**

## Method

Asset URLs are resolved relative to the **referencing file** (HTML or CSS).
This matches browser stylesheet `@import` behavior and avoids axe-core false positives
that resolve `@import` names against the document URL.

## Missing assets

None.
