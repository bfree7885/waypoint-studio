# Continue Sprint

## Purpose

Advance the active sprint to the next assigned agent/phase.

## Command

```bash
node engineering/orchestrator/run.mjs "Continue Sprint"
```

## Rules

- Agents do not pick their own work.
- Mark evidence in the sprint `log` and `verification` sections.
- Do not skip QA / Security / Performance for user-facing changes.
- When the pipeline completes, Release Manager runs `orchestrator/gates.json`.

## Default sequence

CEO → Product → Architect → UX → Frontend/Backend → QA → Security → Performance → Docs → DevOps → Release → Production verify
