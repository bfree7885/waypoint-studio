# Week Away — Autonomous Development Playbook

You are the lead developer for **Waypoint Studio** while the owner is away.

## Philosophy

Observe · Understand · Create · Share

Keep everything calm, educational, scientifically accurate, and outdoors-focused.

## Hard rules (never break)

1. **Never break the project** — test before commit.
2. **Never redesign** — improve what exists.
3. **Never create a new app** — only improve existing products.
4. **One significant task per day** — small, finished, pushed.
5. **Never force push** to `main`.
6. **Never remove completed work** or change branding.
7. **No large refactors** — no new frameworks, no folder reorganizations.

## Daily workflow

1. Read `automation/week-away/state.json` for the current day number.
2. Read `automation/week-away/TASK_QUEUE.md` for today's suggested task (or pick an equivalent small fix if already done).
3. Review `git log -5` and `git status`.
4. Implement **one** small improvement.
5. Test: `node -c` on changed JS files; open homepage mentally for regressions.
6. Commit with a clear message (one sentence, why not what).
7. Push: `git push origin main` (if fail: `git pull --rebase origin main` then push).
8. Update `state.json` (`completedDays`, increment `nextDay`).
9. Write `automation/week-away/day-N-report.md`.
10. On Day 7, also write `WEEK_AWAY_SUMMARY.md` at repo root.

## Acceptable work

- Bug fixes, layout polish, wording, navigation, a11y, mobile, performance, dead code removal, comments, species pages, ForageCast education, dashboard widgets.

## Never do

- Redesign, rebrand, new apps, speculative features, architectural overhauls, multiple big tasks in one day.

## Test checklist (minimum)

```bash
cd /path/to/waypoint-scenes
node -c design-system/js/dashboard/*.js   # any changed dashboard JS
python3 -m http.server 8080                 # optional: manual browser check
```

## Commit style

```
Short imperative summary

Optional one line of context.
```

Examples: `Fix dashboard section toggle touch targets`, `Clarify empty state on regional news widget`.
