# Global Watch ↔ Waypoint Studio bridge (frozen)

## Architecture

```
Global Watch
    → standalone repository / application

Waypoint Studio
    → Support
        → Experiences
            → Global Watch bridge (/side-trails/global-watch/)
                → LOCAL http://127.0.0.1:4173
                   (only when the owner is running Global Watch)
```

## Temporary discovery

**Support → Experiences** is a **TEMPORARY field-test discovery path**.  
It is **not** Global Watch’s permanent product location.

## Independence

Global Watch remains architecturally independent. Studio must not copy Global Watch source or embed the app.

## `/side-trails/`

Legacy/unlisted path infrastructure — **not** a current product section. Agents must not treat it as Studio IA.

## Verification rules

- Merged or deployed ≠ discoverable.
- Discoverability claims require walking normal navigation from the **live Home page**.
- Localhost must be labeled **LOCAL**, never described as a public deployment.
- Do not add Global Watch to Home or primary nav without owner instruction.
- Do not deploy a public Global Watch host without owner approval.
