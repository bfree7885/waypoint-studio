# Accessibility Summary — Sprint 10

## Source

`audits/live-site-qa/accessibility.md` — axe-core wcag2a/aa on production (2026-07-19).  
Plus recovery-sprint mobile touch-target work (16px inputs / 44px controls on several apps).  
**No full screen-reader audit was run in Sprint 10.**

## Frequency (baseline)

| Rule | Approx. route hits | Severity |
| --- | ---: | --- |
| color-contrast | **102** | Serious / systemic |
| nested-interactive | 7 | Serious (Photo Coach, Hidden Landscapes, …) |
| aria-prohibited-attr | 7 | Serious (e.g. ForageCast) |
| document-title / html-has-lang | 2 each | Likely edge routes |
| aria-required-children | 1 | Isolated |

## What improved in recovery (partial)

- Boot fail UIs with Retry buttons (keyboard-reachable patterns via shared `platformBoot`)
- Clearer `aria-busy` clearing on Dashboard / several apps
- Mobile min touch heights on Volunteer, Savant, Fieldry, Sheds paths
- Home Tab focus was already OK in QA smoke

## What did **not** improve

- **Design-token contrast** across Studio chrome and Knowledge (49 contrast nodes on Knowledge alone)
- Nested interactive patterns in Scenes photography apps
- Full SR/VoiceOver/TalkBack pass
- Map accessibility (Sheds Leaflet) beyond basic role labeling

## Honest RC1 implication

Accessibility is the **hard ceiling** on public RC1. Closed Beta can proceed with known contrast debt **if** invite notes accessibility feedback via Contact (`?category=accessibility`) and a contrast sprint is scheduled before public RC1.

## Recommended a11y next work (priority)

1. Fix token pairs that fail WCAG AA on body text / links / muted labels  
2. Knowledge page density + muted text  
3. Nested interactive cleanup in Photo Coach / Hidden Landscapes  
4. Manual keyboard pass on Discover / Fieldry capture / Sheds map ethics dialog  
5. Screen-reader pass on Dashboard Today Outside and Volunteer Discover
