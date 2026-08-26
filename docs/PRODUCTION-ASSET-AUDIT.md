# Production Asset Audit

**Generated:** 2026-08-26T04:13:00.531Z

- HTML refs checked: **867**
- CSS @import edges: **55**
- wds.js modules: **172**
- Missing: **0**

## Method

Asset URLs are resolved relative to the **referencing file** (HTML or CSS).
This matches browser stylesheet `@import` behavior and avoids axe-core false positives
that resolve `@import` names against the document URL.

## Missing assets

None.
