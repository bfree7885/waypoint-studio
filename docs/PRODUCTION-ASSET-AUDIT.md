# Production Asset Audit

**Generated:** 2026-07-20T04:29:09.429Z

- HTML refs checked: **526**
- CSS @import edges: **53**
- wds.js modules: **129**
- Missing: **0**

## Method

Asset URLs are resolved relative to the **referencing file** (HTML or CSS).
This matches browser stylesheet `@import` behavior and avoids axe-core false positives
that resolve `@import` names against the document URL.

## Missing assets

None.
