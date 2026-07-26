# Production Asset Audit

**Generated:** 2026-07-26T20:52:31.124Z

- HTML refs checked: **555**
- CSS @import edges: **54**
- wds.js modules: **164**
- Missing: **0**

## Method

Asset URLs are resolved relative to the **referencing file** (HTML or CSS).
This matches browser stylesheet `@import` behavior and avoids axe-core false positives
that resolve `@import` names against the document URL.

## Missing assets

None.
