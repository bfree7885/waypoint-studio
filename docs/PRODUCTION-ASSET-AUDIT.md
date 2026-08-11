# Production Asset Audit

**Generated:** 2026-08-11T01:50:55.963Z

- HTML refs checked: **690**
- CSS @import edges: **54**
- wds.js modules: **164**
- Missing: **0**

## Method

Asset URLs are resolved relative to the **referencing file** (HTML or CSS).
This matches browser stylesheet `@import` behavior and avoids axe-core false positives
that resolve `@import` names against the document URL.

## Missing assets

None.
