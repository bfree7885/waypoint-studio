# Waypoint Studio Product Standards v1.0

> Living product philosophy for every Waypoint Studio application.

Engineering sessions also follow `docs/ENGINEERING-PLAYBOOK.md`. Product
decisions defer to this document when UX, trust, education, or privacy tension
with implementation convenience.

------------------------------------------------------------------------

# Mission

Waypoint Studio exists to help people observe more, understand more, create
with confidence, and share meaningful discoveries.

Our mission is summarized as:

**Observe. Understand. Create. Share.**

Technology should deepen human curiosity—not replace it.

------------------------------------------------------------------------

# Company Philosophy

Every Waypoint Studio product should feel:

- Calm
- Trustworthy
- Honest
- Welcoming
- Curious
- Encouraging
- Thoughtful

Avoid urgency, manipulation, artificial scarcity, engagement tricks, and
unnecessary complexity.

------------------------------------------------------------------------

# Trust

Trust is the product.

Always:

- Distinguish facts from estimates.
- Clearly identify predictions and heuristics.
- Explain uncertainty honestly.
- Show provider failures.
- Use honest loading states.
- Never fabricate data.

------------------------------------------------------------------------

# Privacy

Privacy is the default.

Guiding principles:

- Local-first whenever practical.
- Minimal data collection.
- User ownership of data.
- Transparent permissions.
- Respect location privacy.
- No hidden tracking.

------------------------------------------------------------------------

# User Experience

Products should:

- Render quickly.
- Progressively improve as information becomes available.
- Never appear frozen.
- Clearly communicate loading and errors.
- Favor clarity over feature overload.

------------------------------------------------------------------------

# Education

Waypoint Studio teaches through:

- Observation
- Discovery
- Coaching
- Reflection
- Exploration

Avoid:

- Homework
- Grades
- Quizzes
- Mandatory lessons

Learning should build confidence and curiosity.

------------------------------------------------------------------------

# Artificial Intelligence

AI exists to:

- Notice clearly
- Explain relationships
- Answer questions
- Provide context
- Invite curiosity

AI must remain transparent and never imply certainty it does not possess.

Product-facing AI follows the **Yellowstone ranger** model — never teacher, lecturer, assignment engine, or grading system. Users should leave more curious, informed, and confident — never guilty, behind, or evaluated.

Canonical principles and system preamble: [Waypoint AI Guide](WAYPOINT-AI-GUIDE.md).  
Shared helpers: `design-system/js/ai/wds-ai-guide.js` (`WDS.aiGuide`).  
Presentation pattern: [Waypoint Guide Experience](WAYPOINT-GUIDE-EXPERIENCE.md) · `WDS.guideCard`.  
Editorial companion: [Waypoint Voice](WAYPOINT-VOICE.md).

Engineering agents (code, architecture, CI) follow [AI Team Constitution](AI_TEAM_CONSTITUTION.md) — a separate role.

------------------------------------------------------------------------

# Community

Communities exist for learning and encouragement.

Avoid:

- Likes
- Follower counts
- Popularity contests
- Engagement farming

Participation should always be optional.

------------------------------------------------------------------------

# Scientific Integrity

Products should:

- Respect evidence.
- Communicate uncertainty.
- Distinguish observation from interpretation.
- Avoid pseudoscience.

------------------------------------------------------------------------

# Outdoor Ethics

Respect:

- Wildlife
- Habitats
- Leave No Trace principles
- Private property
- Safe exploration
- Ethical observation

------------------------------------------------------------------------

# Design Language

Every application should share:

- Consistent navigation
- Shared design system
- Accessible typography
- Responsive layouts
- Meaningful animation
- Clear visual hierarchy
- Minimal visual noise

------------------------------------------------------------------------

# Product Ecosystem

Waypoint Studio products form one ecosystem.

Current family includes:

- Dashboard
- Scenes
- Photo Coach
- ForageCast
- Fieldry
- Sheds
- SignalTerrain
- Steepleaf
- Savant Sommelier

Each product has its own purpose while sharing a consistent philosophy, design
language, and engineering standards.

------------------------------------------------------------------------

# Product Quality

Every release should improve at least one of:

- Trust
- Clarity
- Reliability
- Accessibility
- Performance
- Maintainability
- Scientific integrity

------------------------------------------------------------------------

# Decision Framework

When uncertain, prefer the option that best increases:

- Trust
- Clarity
- Learning
- Curiosity
- Kindness
- Privacy
- Accessibility
- Scientific honesty
- Long-term maintainability

------------------------------------------------------------------------

# Non-Negotiable Principles

- Trust is the product.
- Privacy first.
- Local-first whenever practical.
- Honest AI.
- Honest loading.
- Honest errors.
- Never fabricate data.
- Accessibility by default.
- Responsive by default.
- Progressive enhancement.
- Every feature must make the product simpler or more valuable.

------------------------------------------------------------------------

# Versioning

This is a living document.

Future versions should incorporate lessons learned while preserving these core
principles.

## Product lessons

Append concrete product lessons after significant UX/trust work blocks (keep
engineering pattern lessons in `docs/ENGINEERING-PLAYBOOK.md`).

### 2026-07-14 — Dashboard progressive honesty

- Loading tags that say **Updating** feel more honest than endless
  **Loading** once the shell is already visible.
- Provider failures should become visible terminal states; never invent weather
  or trail conditions to fill empty cards.
- Cold start may show a national shell while locating—but must not imply a
  specific place the user did not choose.
