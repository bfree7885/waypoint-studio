# Production Release Engineering Audit (Phase 1)

**Generated:** 2026-07-20 04:33 UTC

## Authoritative paths

| Layer | Value | Evidence |
| --- | --- | --- |
| Audit repo path | `/home/bryan/Projects/waypoint-studio-site/.tmp-audit/waypoint-studio` | cwd |
| Remote | https://github.com/bfree7885/waypoint-studio.git | `git remote -v` |
| `origin/main` | `081965d` | `git rev-parse origin/main` |
| Local HEAD | `03290f5` (ahead 1 checkpoint) | `git status` |
| Production | `761b202` | `<meta name="waypoint-build" content="761b202">` |
| Hosting | GitHub Pages via Actions | DNS 185.199.*; `pages.yml`; `server: GitHub.com` |
| www | 301 → https://waypointstudio.org/ | curl -I |
| http | 301 → https | curl -I |

## Expected path health

`local → commit → origin/main → Actions pages.yml → Pages CDN → waypointstudio.org`

| Stage | Functioning? |
| --- | --- |
| Local → Git | Yes (code on remote) |
| Push to main | Yes |
| Pages build job | **No** (link validator exit 1) |
| Pages deploy | **No** (blocked by build) |
| Production update | **No** (stale `761b202`) |

## Separate clone note
`/home/bryan/Projects/waypoint-studio-site` is a **different** GitHub repo (`waypoint-studio-site`) and is **not** the production source of truth for waypointstudio.org (CNAME + Pages workflow live in `waypoint-studio`).
