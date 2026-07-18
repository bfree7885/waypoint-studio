# Security Profiles

**Catalog:** `design-system/signalterrain/intelligence/cyber/advisor/security-profiles.json`  
**Schema:** `schema-security-profile-v1.json`  
**Storage:** local `st_security_profile_v1`

---

## Purpose

Describe the operator’s environment so the advisor can emphasize relevant guidance **without changing intelligence facts**.

Users may select **multiple** environments. Profiles remain editable.

---

## Environments (V1)

Home user · Power user · Developer · Photographer · Research workstation · Linux / Windows / Mac workstation · Home lab · Small business · School · Non-profit · Cloud workloads · Virtualization · NAS · Containers · Servers · Networking

---

## Risk tolerance

| Value | Effect on recommendations |
|-------|---------------------------|
| `cautious` | Lifts low-band inventory items toward moderate attention |
| `balanced` | Default |
| `accepting` | Softens high-band toward moderate for calmer pacing |

Never invents urgency. Never hides matched exposures.

---

## Emphasis hints

`emphasisHints` in the catalog map environment ids to kind/tag preferences (similar spirit to briefing audience profiles). Inventory links remain authoritative for exposure matching.
