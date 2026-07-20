# Fieldry Recovery Report — Sprint 7

## Goal

Make Fieldry a dependable shared observation notebook: fast outdoor capture, durable drafts, honest storage failures, responsive history filters, and WOS-aligned records that other apps can read via the platform ledger — without inventing new product categories or speculative AI.

## Evidence used

From `audits/live-site-qa/` (2026-07-19):

| Finding | Severity | Sprint 7 response |
| --- | --- | --- |
| Fieldry shell ~6.9; closed-beta capable | Baseline | Hardened capture/save/filter UX |
| Systemic `wds-*.css` 404s under `/apps/fieldry/` | P2 platform | Unchanged (pages still paint via `wds.css`); map-free SPA |
| Location matrix includes Fieldry | OK | GPS capture promoted + accuracy |
| A11y contrast studio-wide | P2 | Form status/alerts + focusable sticky save; contrast still inherits WDS tokens |

## Before → After

| Area | Before | After |
| --- | --- | --- |
| New observation | Long single form; GPS buried | Quick capture + collapsed details; GPS primary |
| Drafts | Lost on refresh/hash change | Autosaved draft + restore |
| Save failures | Silent `setItem` throw risk | Quota messaging; no false “saved” |
| History filters | Apply-only | Live filter + date range |
| Platform deep link | `#/observation/` (broken) | `#/obs/` + alias |
| Duplicate | None | Detail → Duplicate |

## Cross-app honesty

Fieldry **writes** WOS to `waypoint-fieldry-observations-v1`. Sheds / ForageCast keep separate stores. `WDS.platformObservations` remains a **read-only** ledger. No silent schema merge this sprint.

## Verification

```bash
node automation/test-fieldry-sprint7.mjs
node automation/test-fieldry-mvp.mjs
```
