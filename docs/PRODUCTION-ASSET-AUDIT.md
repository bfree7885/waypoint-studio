# Production Asset Audit

**Generated:** 2026-08-26T03:48:15.001Z

- HTML refs checked: **723**
- CSS @import edges: **54**
- wds.js modules: **169**
- Missing: **0**

## Method

Asset URLs are resolved relative to the **referencing file** (HTML or CSS).
This matches browser stylesheet `@import` behavior and avoids axe-core false positives
that resolve `@import` names against the document URL.

## Missing assets

None.
