# ADR-001 — Waypoint Engineering OS

## Status

Accepted — 2026-07-12

## Context

One-off coding prompts no longer scale for platform work spanning deploy, shell, CI, and multiple apps.

## Decision

Introduce an in-repo engineering operating system under `engineering/`:

- Orchestrator owns sequencing and assignment
- Specialized agent role contracts (YAML)
- Mutable process state in JSON (backlog, sprints, gates, pipeline)
- Playbooks for Start/Continue Sprint, production review/fix, release planning

## Consequences

- Future work should enter via backlog + sprint commands
- Agents must not self-select tasks
- Application code is unchanged by this ADR; only process infrastructure is added
