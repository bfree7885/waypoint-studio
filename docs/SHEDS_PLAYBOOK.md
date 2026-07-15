# Waypoint Studio Sheds Playbook v1.0

> Product standards for ethical antler shed hunting and wildlife respect.

Sheds (catalog: shed hunting) supports species knowledge, private finds,
seasonal awareness, and wildlife ethics—without trophy culture.

Complements: Engineering, Product Standards, UI/UX, QA, Performance,
Accessibility, Security, Release, and Lessons Learned playbooks.

------------------------------------------------------------------------

# Product Mission

Help people **observe and understand** ungulate ecology and shed seasons so
they practice respectful outdoor skill—valuing empty-handed miles, legality,
and habitat care over bragging rights.

Sheds exists for humility and learning. It is not a trophy case, not a public
find map for strangers, and not a baiting guide.

------------------------------------------------------------------------

# Target Users

- Ethical shed hunters building season knowledge
- Wildlife-minded hikers learning sign and habitat
- Mentors teaching regulations-aware outdoor practice
- Stewards who care about wintering wildlife stress

------------------------------------------------------------------------

# Non-Negotiable Principles

1. **Wildlife ethics first**—no baiting, harassment, or harmful tactics.
2. **Regulations awareness**—encourage checking local rules; never override law.
3. **Seasonality and animal stress** inform guidance timing and tone.
4. **No leaderboards, public trophy walls, or find popularity contests.**
5. **Exact find coordinates private by default**—never broadcast pins.
6. **Empty-handed effort counts**—success is not only antlers.
7. **Mapping serves personal memory and ethics**, not invasion of private land.
8. **Honest uncertainty** about forecasts and “hot spots.”

------------------------------------------------------------------------

# UX Expectations

- Education on species, season, and ethics appears before extraction framing
- Personal finds feel like a private journal
- Maps default to privacy-preserving views
- Guidance mentions land access permission and winter wildlife needs
- Empty states celebrate learning preparation, not FOMO
- Tone stays respectful—never mocking animals or competitors

------------------------------------------------------------------------

# Loading and Error States

| State | Expectation |
|-------|-------------|
| Season/forecast loading | Updating with uncertainty; no “guaranteed sheds” |
| Map tiles unavailable | Honest offline/unavailable; personal notes still accessible |
| Find save failure | Clear error; do not claim stored |
| Regulations content missing | Direct users to official sources; do not invent legality |

Anti-patterns: public heatmaps of precise finds; gamified kill/shed scores;
tips that encourage trespass or harassment.

------------------------------------------------------------------------

# AI Behavior

- Explain habitat, seasonality, and sign interpretation with humility
- Personalize practice tips from user notes—not invented scout reports
- Refuse coaching that implies baiting, chasing, or illegal access
- Label predictive “likelihood” language as speculative
- Encourage ethics and patience as skill

------------------------------------------------------------------------

# Data Quality Expectations

- Finds store private location precision intentionally
- Species and season content distinguish evidence-based ecology from lore
- Forecast-like views are estimates with visible limits
- User content remains separable from editorial education
- No silent conversion of private finds into public feeds

------------------------------------------------------------------------

# Accessibility Expectations

- Core education and journal flows keyboard accessible
- Map alternatives: list/journal access to personal finds without relying on
  color alone
- Ethics and regulation callouts in document order
- Touch-friendly logging for field use

------------------------------------------------------------------------

# Performance Expectations

- Landing and education content paint quickly even while maps load
- Personal journal remains responsive as finds grow
- Map layers lazy-load; offline journal still opens
- Avoid heavy social graph features that do not belong in this product

------------------------------------------------------------------------

# Release Quality Gates

- [ ] No public precise-find sharing defaults
- [ ] No trophy/leaderboard mechanics in core UX
- [ ] Ethics and legality language intact on touched surfaces
- [ ] Private save/reload of finds verified when features exist
- [ ] Forecast/uncertainty honesty checked
- [ ] Mobile journal/education usable
- [ ] Accessibility smoke on primary education path

Foundation surfaces may ship incomplete tools; they must not ship unethical
engagement patterns “temporarily.”

------------------------------------------------------------------------

# Future Extensibility

Sheds may grow richer private mapping, season briefings, or species modules.
Extensions should deepen ethics and ecology—not spectator sports.

Avoid prescribing GIS stacks; preserve privacy-by-default and wildlife respect.

------------------------------------------------------------------------

# Versioning

**Sheds Playbook v1.0.** Living product handbook. Update when ethics,
regulation-guidance, or find-privacy rules change.
