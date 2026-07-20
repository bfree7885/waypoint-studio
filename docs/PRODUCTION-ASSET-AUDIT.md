# Production Asset Audit

**Generated:** 2026-07-20T16:40:09.052Z

- HTML refs checked: **529**
- CSS @import edges: **53**
- wds.js modules: **133**
- Missing: **0**

## Method

Asset URLs are resolved relative to the **referencing file** (HTML or CSS).
This matches browser stylesheet `@import` behavior and avoids axe-core false positives
that resolve `@import` names against the document URL.

## Missing assets

None.
