# Application Scorecards — Sprint 10

Scores are **RC1-honest** (0–10).  
**Rec:** Invite / Hold / Retired / Educational-only.

| Application | Ready | Rel | Perf | UX | A11y | Maint | Docs | Overall | Rec |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Studio Home | 7.5 | 7.0 | 8.0 | 7.5 | 4.5 | 7.0 | 8.0 | **7.2** | Invite |
| Dashboard | 7.0 | 6.5 | 5.0 | 7.0 | 4.5 | 6.0 | 8.0 | **6.5** | Invite (caveat cold start) |
| Scenes hub | 7.0 | 7.0 | 7.5 | 7.0 | 4.5 | 6.5 | 6.5 | **6.8** | Invite as-is |
| Photo Coach | 6.5 | 6.0 | 6.5 | 6.5 | 4.0 | 6.0 | 6.0 | **6.2** | Invite as-is |
| Photo Library | 7.0 | 6.0 | 7.5 | 7.0 | 4.5 | 6.0 | 6.0 | **6.5** | Invite as-is |
| Hidden Landscapes | 6.5 | 6.0 | 7.0 | 6.5 | 4.0 | 6.0 | 6.0 | **6.2** | Invite experimental |
| Sheds | 7.5 | 7.0 | 6.5 | 7.5 | 4.5 | 7.0 | 8.0 | **7.1** | Invite field beta |
| ForageCast | 7.0 | 6.5 | 5.5 | 7.0 | 4.0 | 6.5 | 8.0 | **6.5** | Invite (honest labels) |
| Fieldry | 8.0 | 7.5 | 7.5 | 7.5 | 4.5 | 7.0 | 8.0 | **7.3** | Invite |
| SignalTerrain | 7.0 | 6.5 | 6.0 | 7.0 | 4.5 | 6.5 | 8.0 | **6.5** | Invite Cyber Live |
| Steepleaf | 7.0 | 7.0 | 6.0 | 7.0 | 4.5 | 6.5 | 8.0 | **6.8** | Invite private tea |
| Savant Sommelier | 7.5 | 7.5 | 7.0 | 8.0 | 4.5 | 7.0 | 8.0 | **7.0** | Invite educational |
| Volunteer | 7.0 | 7.0 | 7.0 | 7.0 | 4.5 | 7.0 | 8.0 | **6.8** | Invite discovery (demo catalog) |
| Landscape Interpretation | 7.0 | 7.5 | 7.5 | 8.0 | 5.0 | 7.0 | 8.0 | **7.1** | Educational-only invite |
| Knowledge | 7.5 | 7.0 | 7.0 | 7.0 | 3.5 | 7.0 | 7.5 | **6.8** | Invite (contrast worst case) |
| Contact | 7.5 | 7.5 | 8.0 | 7.0 | 4.5 | 7.5 | 8.0 | **7.2** | Invite |
| Support | 7.5 | 7.5 | 8.0 | 7.0 | 4.5 | 7.5 | 7.5 | **7.2** | Invite |
| About | 7.5 | 8.0 | 8.0 | 7.5 | 4.5 | 8.0 | 7.5 | **7.3** | Invite |
| Privacy | 7.5 | 8.0 | 8.0 | 7.5 | 4.5 | 8.0 | 7.5 | **7.3** | Invite |
| Animal Vision | 7.0 | 6.0 | 7.5 | 7.0 | 4.0 | 6.0 | 5.5 | **6.4** | Invite lightly |
| Terrainbound | — | — | — | — | — | — | — | **n/a** | Retired (honest) |

### Dimension key

- **Ready** — feature completeness for stated mission  
- **Rel** — startup / failure honesty  
- **Perf** — cold start / navigation  
- **UX** — clarity for mission question  
- **A11y** — axe + touch (platform contrast caps almost everything)  
- **Maint** — code clarity / shared platform use  
- **Docs** — recovery + product docs  

### Notes that prevent score inflation

- **Overall** is the rounded mean of the seven dimension scores (honest caps already applied in-dimension).  
- Steepleaf jumped from QA **4.9** on boot hangs; tree fixes are real but **not live-reproven** → capped ~6.8.  
- Dashboard/ForageCast claimed ~7.0 but cold path still heavy → **6.5**.  
- Knowledge has severe contrast node density → a11y **3.5**.  
- Volunteer/LI demo/educational limits are intentional — scores reflect honesty, not feature poverty alone. Landscape Interpretation remains **Educational-only invite** despite a mid-7s mean.
