# Production Asset Audit

**Generated:** 2026-07-21T03:23:09.186Z

- HTML refs checked: **558**
- CSS @import edges: **54**
- wds.js modules: **150**
- Missing: **0**

## Method

Asset URLs are resolved relative to the **referencing file** (HTML or CSS).
This matches browser stylesheet `@import` behavior and avoids axe-core false positives
that resolve `@import` names against the document URL.

## Missing assets

None.
