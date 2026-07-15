# Waypoint Studio Release Playbook v1.0

> How changes become trusted software in people’s hands.

A release is not “git push succeeded.” A release is a conscious decision that
the product still deserves user trust.

Complements:

- `docs/ENGINEERING-PLAYBOOK.md` — commit/push only on owner request; final reports
- `docs/PRODUCT_STANDARDS.md` — quality dimensions that must improve
- `docs/QA_PLAYBOOK.md` — severity, smoke, validation
- `docs/PERFORMANCE_PLAYBOOK.md` — startup and regression risk
- `docs/ACCESSIBILITY_PLAYBOOK.md` — inclusive ship bar
- `docs/SECURITY_PLAYBOOK.md` — privacy and ship blockers
- `docs/UI_UX_PLAYBOOK.md` — interface checklist
- `docs/LESSONS_LEARNED.md` — post-release learning

------------------------------------------------------------------------

# Mission

Ship calmly, reversibly, and honestly.

Prefer smaller, reviewable releases that leave the ecosystem better on at least
one Product Standards quality dimension: trust, clarity, reliability,
accessibility, performance, maintainability, or scientific integrity.

------------------------------------------------------------------------

# Release Philosophy

1. **Owner gates commits and pushes.** Agents never commit or push unless the
   owner explicitly asks (Engineering Playbook).
2. **Trust regressions block.** Fake Live data, stuck dimming overlays, and
   privacy leaks are release blockers.
3. **Document what changed.** Humans and future agents should understand risk.
4. **Prefer roll-forward when safe; plan rollback when not.**
5. **Smoke after ship.** “Works on my machine before push” is not enough for
   meaningful UI changes.
6. **Capture lessons.** Every non-trivial release feeds Lessons Learned.

------------------------------------------------------------------------

# Pre-Release Checklist

## Product and trust

- [ ] Change improves at least one Product Standards quality dimension
- [ ] No fabricated data presented as Live
- [ ] Loading / empty / error copy remains honest
- [ ] Privacy posture unchanged or intentionally improved and documented

## Engineering

- [ ] Root cause understood for bugfix releases
- [ ] Similar defect sweep done for architectural twins
- [ ] Unrelated dirty tree noise excluded from the commit
- [ ] Secrets and credentials absent

## Quality suites

- [ ] Relevant automated tests added/updated and passing
- [ ] QA work-block checklist complete for touched apps
- [ ] Accessibility checklist considered for UI changes
- [ ] Performance checklist considered for boot/render changes
- [ ] Security checklist considered for new inputs, HTML, or network calls

## Documentation

- [ ] User-visible behavior documented (playbook, session note, or reliability
      doc as appropriate)
- [ ] Changelog entry drafted when the release is user-meaningful
- [ ] Lessons Learned updated for non-obvious discoveries

------------------------------------------------------------------------

# Regression Requirements

Before release of risk-bearing changes:

| Change type | Minimum regression |
|-------------|--------------------|
| Overlay / modal / prompt | Hidden-state / dismiss tests or CDP smoke |
| Dashboard boot / OIP | Progressive paint + settle gates covered |
| Trust tags / copy | Reliability or QC copy tests |
| Navigation shell | Smoke across at least two apps |
| Storage schema | Migration path verified with fresh and existing keys |

If automation cannot cover a risk, write a short manual regression script into
the PR/session notes and execute it.

------------------------------------------------------------------------

# Documentation Requirements

Releases that change behavior should update the nearest durable doc:

- Playbooks for process or standards shifts
- Product/session reports for multi-hour work blocks
- Reliability or UX review docs for dashboard semantics
- README only when onboarding or run entrypoints change

Avoid documentation that claims “coming soon” education theater—Product
Standards forbid homework theater and dishonest roadmaps in UI; keep the same
honesty in docs.

------------------------------------------------------------------------

# Versioning

## Source / commit versioning

- Prefer clear, meaningful commit messages (why over chore lists)
- Tag formal releases when communicating outside day-to-day mainline (optional
  but useful for milestones)
- Build metadata (`wds-build`, commit stamps) should remain trustworthy for
  debug snapshots

## Playbook and standards versioning

Foundation documents use explicit versions (v1.0 now). Bump when principles
change; add dated lessons without pretending every edit is a major version.

## App/product versioning

When products expose user-visible versions, keep them monotonic and explain
notable trust or privacy changes in plain language.

------------------------------------------------------------------------

# Changelog Standards

For user-meaningful releases, write changelogs that:

- Lead with user impact (“Dashboard paints widgets before providers finish”)
- Call out trust/privacy-sensitive changes explicitly
- Avoid internal jargon without explanation
- Separate Fixes / Improvements / Documentation when helpful

Do not bury “we stopped inventing Live weather” under refactor notes.

Example shape:

```text
## Summary
- …

## Fixes
- …

## Notes / Risks
- …
```

------------------------------------------------------------------------

# Rollback Planning

Before high-risk releases, answer:

1. How do we identify that the release is bad (smoke symptom)?
2. How do we revert (git revert, redeploy previous artifact, disable feature)?
3. What user-local state might be incompatible after rollback (storage keys)?
4. Who decides to roll back (owner)?

## Storage compatibility

- Additive schema changes beat incompatible rewrites
- Migrations should tolerate downgrade or at least fail closed with a recovery
  path
- Never silently delete user libraries or photos as a “fix”

------------------------------------------------------------------------

# Smoke Testing

Execute the QA Playbook smoke matrix on the packaged or deployed result—not
only on an unclean working tree.

Hard-fail smoke:

- Permanent dimming / dead overlay
- Shell never appears
- Console exceptions on load for primary apps
- Location impossible to set or dismiss with fallback

For Dashboard-specific releases, confirm progressive structure appears and at
least one module reaches a non-Updating terminal or an honest waiting state
without freezing the page.

------------------------------------------------------------------------

# Monitoring After Release

Even for static / local-first distribution:

- Watch for immediate owner/user reports in the first hours after announcement
- Re-run smoke on a clean clone or fresh browser profile when feasible
- Check that build stamps on status/debug surfaces match the intended commit
  when those surfaces are used

If hosted endpoints or providers are involved, watch for elevated error rates
or quota incidents after shipping request-path changes.

------------------------------------------------------------------------

# Post-Release Review

Within a reasonable window after a meaningful release:

1. What improved for users?
2. What residual risks remain?
3. Did any severity escape smoke?
4. What lesson enters `docs/LESSONS_LEARNED.md`?
5. Are playbook checklists still accurate?

Keep the tone blameless and specific. Prefer one sharp lesson over a vague
“needs more testing.”

------------------------------------------------------------------------

# Release Checklist

### Decide

- [ ] Owner approves that this changeset is the release candidate
- [ ] Severity board clear of unaccepted S1/S2 issues

### Verify

- [ ] Pre-release checklist complete
- [ ] Automated tests for risk areas green
- [ ] Manual smoke complete on candidate

### Publish

- [ ] Commit message / changelog accurate (when committing)
- [ ] Push only on explicit owner request
- [ ] Unrelated dirty files excluded

### Confirm

- [ ] Post-push smoke or clean-profile check
- [ ] Lessons Learned / docs updated
- [ ] Known carryover risks communicated

------------------------------------------------------------------------

# Versioning of This Document

**Release Playbook v1.0.** Living document. Update when distribution channels,
versioning schemes, or owner approval norms change.
