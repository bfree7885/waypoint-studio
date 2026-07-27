# Production Asset Audit

**Generated:** 2026-07-27T00:41:24.444Z

- HTML refs checked: **559**
- CSS @import edges: **54**
- wds.js modules: **165**
- Missing: **0**

## Method

Asset URLs are resolved relative to the **referencing file** (HTML or CSS).
This matches browser stylesheet `@import` behavior and avoids axe-core false positives
that resolve `@import` names against the document URL.

## Missing assets

None.
