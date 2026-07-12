# Start Sprint

## Purpose

Open a new sprint from roadmap + backlog under Orchestrator control.

## Command

```bash
node engineering/orchestrator/run.mjs "Start Sprint"
```

## Orchestrator steps

1. Read repo state (`git` branch/HEAD/dirty).
2. Read `knowledge/roadmap.json`.
3. Read `backlog/backlog.json`.
4. Read `production/status.json`.
5. If production health is `down`, abort and require **Fix Production**.
6. Select highest-priority ready/backlog tasks.
7. Create `sprints/sprint-YYYYMMDD.json` and point `sprints/current.json` at it.
8. Set active agent to **CEO**, phase `direction`.

## Human / agent work after command

1. CEO confirms goal and priorities in the sprint file.
2. Product Manager writes/refines acceptance criteria.
3. Run **Continue Sprint** to advance the pipeline.
