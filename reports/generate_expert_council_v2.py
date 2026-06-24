#!/usr/bin/env python3
"""Generate Waypoint Studio Expert Council Review V2 PDF."""

import html
import subprocess
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT_HTML = ROOT / "WaypointStudio_ExpertCouncil_Review_V2.html"
OUT_PDF = ROOT / "WaypointStudio_ExpertCouncil_Review_V2.pdf"
PUB_DATE = date.today().strftime("%B %d, %Y")

EXPERTS = [
    ("Outdoor Educator", "Dr. Elena Marsh", [
        ("Strengths", "Clear field-teacher voice in Pike County bundle; weekend investigation and 'try this' prompts; Happening Now uses tentative language appropriately."),
        ("Weaknesses", "Learning is not progressive—users get a dashboard, not a curriculum path. teachersNotebook and weekendFieldInvestigation exist in JSON but are never rendered."),
        ("Critical", "Homepage disables citizen science section while mission claims observation contribution. Skip link targets #main before JS creates it."),
        ("Recommendations", "Add a visible 'This week's field lab' module rendering teachersNotebook; wire relatedLessons to actual lesson pages; enable citizen science block with honest 'coming soon' if submission not ready."),
        ("Severity", [("Critical", "Citizen science absent on primary surface"), ("High", "Unrendered educational content"), ("Medium", "No learning progression")]),
    ]),
    ("Wildlife Biologist", "Dr. James Okonkwo", [
        ("Strengths", "Bear ethics, warbler migration tail, species spotlight depth; Brood X correctly marked not-local for Pike."),
        ("Weaknesses", "Ten counties share Pike phenology—biologically wrong for Sullivan, Monroe plateau timing. Wildlife activity is editorial guesswork without observation feed."),
        ("Critical", "ForageCast prediction scores read like empirical forecasts; black morel 'burn edges' copy conflates ecology."),
        ("Recommendations", "Per-county phenology offsets in bundles; label prediction output 'educational index, not survey data'; add uncertainty bands to species active lists."),
        ("Severity", [("High", "Shared bundle across distinct ecoregions"), ("High", "Prediction misread risk"), ("Medium", "No live wildlife data layer")]),
    ]),
    ("Botanist / Mycologist", "Dr. Priya Nair", [
        ("Strengths", "Morel ethics (cut at soil line), false morel warnings, chanterelle timing watch, Morchella americana naming in field notes."),
        ("Weaknesses", "ForageCast fruitingOutlook duplicates and sometimes contradicts bundle species lists. Rainfall/soil moisture inconsistent between conditions.json and regional profile."),
        ("Critical", "ForageCast heat map could encourage spot-targeting rare fungi—no harvest pressure ethics on map itself."),
        ("Recommendations", "Unify species status across OIP and ForageCast via platform only; add 'never share exact locations' to heat map; cite county mycological society resources."),
        ("Severity", [("Critical", "Foraging map without ethics guardrails"), ("High", "Data inconsistency"), ("Medium", "Taxonomic imprecision in model")]),
    ]),
    ("Earth Scientist / Geologist", "Dr. Robert Chen", [
        ("Strengths", "Elevation bands, watershed names, ravine vs ridge trail guidance; water card acknowledges gauge gap honestly."),
        ("Weaknesses", "Water conditions remain placeholder; no USGS gauge integration; geology absent beyond bioregion label."),
        ("Critical", "None blocking launch for education, but hydrology claims are editorial only."),
        ("Recommendations", "Integrate USGS NWIS or similar for stream levels; add surficial geology layer to OIP geography slice; show data provenance on water card."),
        ("Severity", [("High", "No live hydrology"), ("Medium", "Thin geology education"), ("Low", "Placeholder water card labeled honestly")]),
    ]),
    ("Environmental Scientist", "Dr. Maria Santos", [
        ("Strengths", "Systems thinking in blocks (weather/phenology/wildlife/trails); conservation update ties to DWGNRA."),
        ("Weaknesses", "No air quality, pollen, or fire risk slices; climate context missing; research brief is explicitly placeholder."),
        ("Critical", "Research brief presented in page flow without prominent 'editorial placeholder' badge."),
        ("Recommendations", "Add OIP slices for air quality (AQI API) and fire weather; gate research brief behind 'editorial preview' until sourced; link to regional climate normals."),
        ("Severity", [("High", "Placeholder research presented as section"), ("Medium", "Missing atmospheric environmental layers")]),
    ]),
    ("Conservation Biologist", "Dr. Hannah Reeves", [
        ("Strengths", "Stewardship section, bear attractant guidance, 'photograph don't pick' for laurel in parks."),
        ("Weaknesses", "Six preview apps in Experiences catalog create false completeness; foraging tools without carrying-capacity or rare species warnings."),
        ("Critical", "ForageCast readiness scores could increase harvest pressure on popular edibles."),
        ("Recommendations", "Add conservation status checks to species spotlight; tone down 'high readiness' language to 'conditions may favor'; remove or demote preview apps until they teach ethics."),
        ("Severity", [("Critical", "Harvest encouragement risk"), ("High", "Preview apps dilute trust"), ("Medium", "No T&E species flags")]),
    ]),
    ("GIS Specialist", "Alex Kim", [
        ("Strengths", "WDS.location nearest-region logic; map-view schematic projection; regions-index with coords."),
        ("Weaknesses", "Only Pike bundle; usingNearestBundle is a hack; no real parcel/trail GIS; heat map is schematic not georeferenced."),
        ("Critical", "Users may believe county selection changes ecological content—it mostly changes coords and weather."),
        ("Recommendations", "Truth-in-labeling when nearest bundle used; build county-specific bundle variants; georeference ForageCast zones or label 'conceptual model only'."),
        ("Severity", [("Critical", "False regional precision"), ("High", "Single editorial bundle"), ("Medium", "Schematic map limitations")]),
    ]),
    ("Meteorologist", "Dr. Tom Bradley", [
        ("Strengths", "Open-Meteo integration; editorial fallback when live fails; no fake weather on error."),
        ("Weaknesses", "31-script load before weather; possible double-fetch; moon phase missing; no severe weather alerts."),
        ("Critical", "Thunderstorm copy in editorial may disagree with live forecast without reconciliation layer."),
        ("Recommendations", "Pass OIP weatherRef to UI always; add NWS alerts slice; reconcile editorial narrative when live contradicts; add moon phase from same provider."),
        ("Severity", [("High", "Editorial/live divergence UX"), ("Medium", "No alert layer"), ("Low", "Moon placeholder")]),
    ]),
    ("Ecologist", "Dr. Lisa Fernandez", [
        ("Strengths", "Ecoregion and dominant forest in profile; seasonal watch groups; phenology stage language."),
        ("Weaknesses", "No iNaturalist/ebird phenology validation; Happening Now rules are generic heuristics."),
        ("Critical", "Ecological claims for non-Pike counties are materially the same as Pike."),
        ("Recommendations", "County-specific seasonalWatch arrays; partner phenology data feeds; document ecoregion source (EPA Level III, etc.)."),
        ("Severity", [("Critical", "Ecological homogenization across counties"), ("High", "No external validation")]),
    ]),
    ("Forestry Expert", "Dr. William Hart", [
        ("Strengths", "Northern hardwoods / oak-hickory / hemlock ravine description is locally credible."),
        ("Weaknesses", "No forest health (invasive, dieback), no management context, no snag/standing dead education."),
        ("Critical", "None pre-launch."),
        ("Recommendations", "Add forestry slice: dominant species by elevation band; link to state DCNR resources; invasive species watch (e.g., spotted lanternfly region note)."),
        ("Severity", [("Medium", "Thin forestry depth"), ("Low", "No management context")]),
    ]),
    ("Environmental Data Scientist", "Dr. Anika Patel", [
        ("Strengths", "OIP schema v2 is well-structured; slice status model (placeholder/editorial/live); adapters pattern."),
        ("Weaknesses", "No data lineage UI; no versioning; observations slice is repackaged editorials; dual RI/OIP legacy bridge."),
        ("Critical", "Platform claims 'research-grade' aspiration with zero ingestion pipeline."),
        ("Recommendations", "Publish data dictionary; add provenance to every card; implement observation export schema (Darwin Core subset); remove legacy assembly paths entirely."),
        ("Severity", [("Critical", "No research data pipeline"), ("High", "Technical dual-stack debt"), ("Medium", "No lineage UI")]),
    ]),
    ("Citizen Science Researcher", "Dr. Karen Wu", [
        ("Strengths", "Privacy-first copy; opt-in language; constitution alignment; county-level aggregation stated."),
        ("Weaknesses", "No submission, no QA, no DOI, no metadata standards, homepage citizen science disabled."),
        ("Critical", "Mission pillar 3 (research-grade observations) is entirely unimplemented."),
        ("Recommendations", "Ship read-only 'observation journal' locally before cloud; adopt Darwin Core / Audubon CSV export; partner pilot with university extension."),
        ("Severity", [("Critical", "Citizen science is vaporware"), ("High", "Homepage hides CS section")]),
    ]),
    ("High School Science Teacher", "Mr. Daniel Ortiz", [
        ("Strengths", "Accessible prose; weekday/weekend split; outdoor challenges; teacher tone in ForageCast lessons."),
        ("Weaknesses", "lessons.json is 50 placeholders; no standards alignment (NGSS); no assessments; no age routing."),
        ("Critical", "Students cannot complete a structured lesson end-to-end on the platform."),
        ("Recommendations", "Wire 5 complete NGSS-aligned lessons for Pike County; add printable field sheets; classroom mode without accounts."),
        ("Severity", [("Critical", "No completable lessons"), ("High", "Placeholder lesson library")]),
    ]),
    ("Curriculum Designer", "Dr. Susan Blake", [
        ("Strengths", "Waypoint Method cycle documented; Observe→Reflect loop in constitution."),
        ("Weaknesses", "Homepage is a magazine, not a course; no prerequisites; no mastery tracking; SECTION_ORDER ≠ product-registry IA."),
        ("Critical", "Two parallel information architectures confuse product direction."),
        ("Recommendations", "Pick one IA: dashboard-first or method-first; add 'Week 1–4' seasonal curriculum object in content engine; align registry with SECTION_ORDER."),
        ("Severity", [("High", "IA drift"), ("High", "No curriculum spine"), ("Medium", "Registry mismatch")]),
    ]),
    ("UX Designer", "Jordan Lee", [
        ("Strengths", "Calm visual hierarchy; location bar; loading states on weather; Happening Now sidebar."),
        ("Weaknesses", "11 sections + experiences + methodology = cognitive overload; no mobile nav; research-brief not in nav; full page re-render on location change."),
        ("Critical", "First-time users face location modal + long scroll before understanding what Waypoint is."),
        ("Recommendations", "Collapse homepage to 5 primary zones; sticky mobile nav; progressive disclosure for methodology; preserve scroll position on location change."),
        ("Severity", [("Critical", "Onboarding overload"), ("High", "No mobile navigation"), ("Medium", "Nav/section mismatch")]),
    ]),
    ("UI Designer", "Morgan Ellis", [
        ("Strengths", "Cohesive WDS tokens; warm palette; card system; product accents via data-product."),
        ("Weaknesses", "Heavy placeholder media; inconsistent ws-* vs wds-*; preview apps look like live products."),
        ("Critical", "Placeholder hero and video undermine 'world-class' positioning."),
        ("Recommendations", "Replace top 3 photography placeholders before launch; badge preview apps consistently; finish Scenes→WDS migration."),
        ("Severity", [("High", "Placeholder media dominant"), ("Medium", "Design system split")]),
    ]),
    ("Accessibility Specialist", "Dr. Aisha Rahman", [
        ("Strengths", "Skip link, focus-visible, reduced motion, aria-busy/live, dialog roles on location prompt."),
        ("Weaknesses", "Skip target broken pre-JS; no focus trap in location dialog; raw .md links; small touch targets in top nav."),
        ("Critical", "WCAG 2.2 AA not met for skip link and dialog focus management."),
        ("Recommendations", "Static #main in HTML; implement trapFocus in location prompt; render governance as HTML pages; 44px touch targets."),
        ("Severity", [("Critical", "Skip link failure"), ("High", "Dialog focus trap missing"), ("Medium", "Markdown links")]),
    ]),
    ("Mobile UX Expert", "Chris Alvarez", [
        ("Strengths", "Responsive CSS tokens; readable type scales."),
        ("Weaknesses", "31 deferred scripts on mobile; no hamburger nav; dashboard cards dense on small screens; geolocation UX varies by OS."),
        ("Critical", "Homepage likely fails Core Web Vitals on mid-tier phones."),
        ("Recommendations", "Ship wds-platform.min bundle; lazy-load below-fold sections; test location flow on iOS Safari and Android Chrome."),
        ("Severity", [("Critical", "Performance on mobile"), ("High", "Navigation unusable on small screens")]),
    ]),
    ("Software Architect", "Dr. Neil Gupta", [
        ("Strengths", "OIP single-source-of-truth direction; engine→enrich pattern; adapters; static-first deploy simplicity."),
        ("Weaknesses", "31-script loader; legacy RI bridge; no tests; no CI evident; content engine owns too much."),
        ("Critical", "Refactor velocity will collapse without automated tests around OIP.get()."),
        ("Recommendations", "Add integration tests for OIP; bundle wds.js; delete legacy paths; extract content-engine to pure view layer."),
        ("Severity", [("Critical", "No automated tests"), ("High", "Script waterfall"), ("Medium", "Legacy bridge")]),
    ]),
    ("Front-End Engineer", "Taylor Brooks", [
        ("Strengths", "Clear module boundaries in OIP; weather provider registry; dashboard adapter pattern."),
        ("Weaknesses", "requestAnimationFrame polling for module readiness; no TypeScript; duplicate monthFromDate paths."),
        ("Critical", "Race conditions possible when scripts load out of order on slow networks."),
        ("Recommendations", "Single boot promise; optional TypeScript for OIP schema; service worker for bundle cache."),
        ("Severity", [("High", "Boot race conditions"), ("Medium", "No types"), ("Low", "Polling anti-pattern")]),
    ]),
    ("Product Designer", "Riley Chen", [
        ("Strengths", "Outdoor Intelligence Platform framing is correct; dashboard as trailhead works conceptually."),
        ("Weaknesses", "ForageCast not clearly flagship—homepage leads with generic 'This Week Outdoors'; six preview apps compete for attention."),
        ("Critical", "Product story is 'regional dashboard' not 'learn nature'—mission mismatch at hero level."),
        ("Recommendations", "Hero should state mission in one sentence; elevate ForageCast as 'start here' for foragers; move preview apps to footer catalog."),
        ("Severity", [("High", "Unclear flagship"), ("High", "Mission not in hero"), ("Medium", "Preview noise")]),
    ]),
    ("Product Manager", "Jamie Foster", [
        ("Strengths", "Constitution provides decision filter; OIP enables app convergence."),
        ("Weaknesses", "Scope creep: 8 apps, 11 homepage sections, OIP, WEF, FGDS—small team spread thin."),
        ("Critical", "Public launch now would promise research-grade data that does not exist."),
        ("Recommendations", "Launch as 'Pike County preview' not national platform; postpone 6 preview apps; single KPI: outdoor sessions completed."),
        ("Severity", [("Critical", "Over-scoped launch"), ("High", "False completeness")]),
    ]),
    ("Business Strategist", "Dr. Victoria Hale", [
        ("Strengths", "Defensible niche: ethical outdoor education + regional intelligence + privacy-first; not another social trail app."),
        ("Weaknesses", "Competes with iNaturalist, AllTrails, onX, Merlin—without their data moats."),
        ("Critical", "No subscription or B2B model tied to mission; county bundle is the only IP asset."),
        ("Recommendations", "Partner with land trusts and extension offices; sell regional bundles to schools; avoid engagement metrics."),
        ("Severity", [("High", "Weak data moat today"), ("Medium", "Revenue model unclear")]),
    ]),
    ("Branding Specialist", "Olivia Grant", [
        ("Strengths", "'Observe · Understand · Create · Share' is memorable; warm craft aesthetic; anti-social-media positioning."),
        ("Weaknesses", "Title 'This Week Outdoors' could be any regional blog; Waypoint Studio brand secondary in hero."),
        ("Critical", "Brand does not yet signal 'scientific trust'—placeholders hurt credibility."),
        ("Recommendations", "Unify under Waypoint Studio wordmark in hero; tagline under mission; professional photography investment."),
        ("Severity", [("High", "Weak brand recognition in hero"), ("Medium", "Trust gap from placeholders")]),
    ]),
    ("Technical Writer", "Dr. Paul Mitchell", [
        ("Strengths", "Tentative language in Happening Now; ethics copy is clear; methodology details element."),
        ("Weaknesses", "Governance links to raw Markdown; inconsistent 'placeholder' labeling; prediction disclaimers buried."),
        ("Critical", "Users cannot distinguish editorial from live from placeholder consistently."),
        ("Recommendations", "Unified source badge system on every card; HTML docs site for governance; glossary for uncertain terms."),
        ("Severity", [("High", "Provenance unclear"), ("Medium", "Markdown links")]),
    ]),
    ("Professional Photographer", "Elena Vasquez", [
        ("Strengths", "Photo essay structure planned; hero alt text present; species spotlight plate concept."),
        ("Weaknesses", "Nearly all imagery is placeholder slots; no EXIF storytelling; no regional photographer credit."),
        ("Critical", "Visual credibility requires real photography before major promotion."),
        ("Recommendations", "Commission 12-hero regional set for Pike; field metadata captions; photographer attribution system."),
        ("Severity", [("Critical", "No real photography"), ("High", "Placeholder dominance")]),
    ]),
    ("Nature Photographer", "Marcus Green", [
        ("Strengths", "Captions reference conditions (fog, dawn)—good narrative habit."),
        ("Weaknesses", "No conservation ethics on wildlife proximity; no lens education."),
        ("Critical", "Same as professional photographer—launch visuals are not competitive."),
        ("Recommendations", "Wildlife photography ethics module; link Scenes app as creation outlet for user photos (local only)."),
        ("Severity", [("Critical", "Visual launch gap"), ("Medium", "Ethics module missing")]),
    ]),
    ("Digital Artist", "Sofia Martinez", [
        ("Strengths", "Illustration slots for field guide; schematic heat map is clear."),
        ("Weaknesses", "Generic placeholder labels; no unified illustration style across apps."),
        ("Critical", "None if labeled placeholder."),
        ("Recommendations", "Commission single illustration system (phenology, species, maps); animate sparingly per MOTION.md."),
        ("Severity", [("Medium", "Illustration system absent"), ("Low", "Schematic map OK for MVP")]),
    ]),
    ("QA Engineer", "Dana Wright", [
        ("Strengths", "Graceful weather error states; aria-busy on loads."),
        ("Weaknesses", "No automated test suite visible; cross-browser matrix unknown; rainfall inconsistency is QA miss."),
        ("Critical", "Data contradictions between ForageCast and homepage will erode trust immediately."),
        ("Recommendations", "Add Playwright smoke tests; content consistency CI; location/weather snapshot tests."),
        ("Severity", [("Critical", "Data inconsistency bug"), ("High", "No E2E tests")]),
    ]),
    ("Security & Privacy Engineer", "Dr. Kevin O'Brien", [
        ("Strengths", "Local-only location storage; no accounts; no tracking evident; privacy constitution."),
        ("Weaknesses", "Coords displayed in UI; third-party Open-Meteo calls leak approximate location to API; no CSP headers."),
        ("Critical", "Future observation upload needs threat model now—before architecture sets."),
        ("Recommendations", "Document Open-Meteo privacy in UI; add CSP; design fuzzed location export; local encryption option for field notes."),
        ("Severity", [("High", "Third-party location leak to weather API"), ("High", "No CSP"), ("Medium", "Future upload threat model")]),
    ]),
]

TOP_25 = [
    (1, "Implement citizen science MVP (local journal + export)", "Critical", "Mission pillar 3", "8–12 wk", "Very High"),
    (2, "Replace placeholder hero/photography with real regional assets", "Critical", "Trust and brand", "4–6 wk", "Very High"),
    (3, "County-specific content bundles (not Pike-for-all)", "Critical", "Scientific accuracy", "6–10 wk", "Very High"),
    (4, "Fix accessibility: skip link, dialog focus trap, touch targets", "Critical", "WCAG compliance", "1–2 wk", "High"),
    (5, "Launch as 'Pike County Preview' with honest scope labeling", "Critical", "Expectation management", "1 wk", "Very High"),
    (6, "Bundle/minify WDS (31 scripts → 1–2)", "High", "Mobile performance", "2–4 wk", "High"),
    (7, "Add OIP integration tests + content consistency CI", "High", "Prevent regression", "2–3 wk", "High"),
    (8, "Unified provenance badges (live/editorial/placeholder)", "High", "Honest communication", "1–2 wk", "High"),
    (9, "Render teachersNotebook + weekendFieldInvestigation", "High", "Educational quality", "2 wk", "High"),
    (10, "Wire 5 complete lessons (replace lessons.json placeholders)", "High", "Learning path", "4–8 wk", "Very High"),
    (11, "Demote/remove six preview apps from primary Experiences grid", "High", "Focus", "1 wk", "Medium"),
    (12, "ForageCast ethics guardrails on heat map + soften readiness language", "High", "Conservation", "1 wk", "High"),
    (13, "Reconcile editorial vs live weather narrative", "High", "Scientific trust", "2 wk", "Medium"),
    (14, "Enable homepage citizen science section (even if journal-only)", "High", "Mission alignment", "1 wk", "High"),
    (15, "Mobile navigation pattern", "High", "UX", "2–3 wk", "High"),
    (16, "Collapse homepage sections (5 zones max above fold strategy)", "High", "Cognitive load", "3–4 wk", "High"),
    (17, "USGS water gauge integration for water card", "High", "Earth science credibility", "3–5 wk", "Medium"),
    (18, "Remove legacy RI assembly paths entirely", "Medium", "Tech debt", "1–2 wk", "Medium"),
    (19, "HTML governance docs (not raw .md links)", "Medium", "UX/trust", "1 wk", "Medium"),
    (20, "Moon phase + NWS alerts slices in OIP", "Medium", "Completeness", "2–3 wk", "Medium"),
    (21, "Align product-registry IA with content-engine SECTION_ORDER", "Medium", "Product clarity", "1 wk", "Medium"),
    (22, "TypeScript types for OIP schema", "Medium", "Maintainability", "2–4 wk", "Medium"),
    (23, "Service worker cache for region bundles", "Medium", "Performance", "2 wk", "Medium"),
    (24, "Darwin Core export schema for future observations", "Medium", "Research value", "3–4 wk", "High"),
    (25, "CSP + Open-Meteo privacy disclosure", "Medium", "Privacy", "1 wk", "Medium"),
]

REMOVE = [
    "Six preview experience cards from primary homepage grid (or move to 'Coming laboratories' footer).",
    "Duplicate regional data in ForageCast home.json (weather, season, fruitingOutlook)—consume OIP only.",
    "Raw Markdown governance links in user-facing footers.",
    "includeCitizenScience: false on homepage—either show honest CS or remove mission claim from hero.",
    "Legacy regionalIntelligence assembly paths once OIP tests pass.",
    "research-brief section until non-placeholder sourced content exists (or badge aggressively).",
    "Misleading 'research-grade' language until ingestion pipeline exists.",
]

ADD = [
    "Local observation journal with county-rounded export (no cloud required for v1).",
    "Provenance badge system on every intelligence card.",
    "Pike County Preview scope banner until multi-region bundles ship.",
    "NGSS-aligned lesson spine (5 lessons minimum).",
    "County truth label when usingNearestBundle applies.",
    "ForageCast harvest ethics interstitial (first visit).",
    "Integration test suite for OIP.get() across location modes.",
    "USGS hydrology + NWS alerts as optional OIP slices.",
]

def esc(s):
    return html.escape(str(s))

def build_html():
    parts = []
    parts.append(f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Waypoint Studio Expert Council Review – Version 2</title>
<style>
@page {{ margin: 22mm 18mm 24mm 18mm; @bottom-center {{ content: counter(page); font-size: 9pt; color: #666; }} }}
body {{ font-family: Georgia, 'Times New Roman', serif; font-size: 10.5pt; line-height: 1.45; color: #1a1a1a; margin: 0; }}
.cover {{ page-break-after: always; text-align: center; padding-top: 28%; }}
.cover h1 {{ font-size: 26pt; font-weight: 500; margin: 0 0 12pt; }}
.cover .sub {{ font-size: 13pt; color: #444; margin-bottom: 48pt; }}
.cover .meta {{ font-size: 10pt; color: #666; }}
h2 {{ font-size: 16pt; margin: 24pt 0 10pt; border-bottom: 1px solid #ccc; padding-bottom: 4pt; page-break-after: avoid; }}
h3 {{ font-size: 12pt; margin: 14pt 0 6pt; page-break-after: avoid; }}
h4 {{ font-size: 10.5pt; margin: 10pt 0 4pt; font-style: italic; }}
.toc {{ page-break-after: always; }}
.toc li {{ margin: 4pt 0; }}
.toc a {{ color: inherit; text-decoration: none; }}
table {{ border-collapse: collapse; width: 100%; margin: 10pt 0; font-size: 9pt; }}
th, td {{ border: 1px solid #ccc; padding: 5pt 6pt; text-align: left; vertical-align: top; }}
th {{ background: #f4f4f4; }}
.sev-c {{ color: #a00; font-weight: bold; }}
.sev-h {{ color: #c60; font-weight: bold; }}
.sev-m {{ color: #886; }}
.expert {{ page-break-inside: avoid; margin-bottom: 14pt; border-left: 3px solid #ddd; padding-left: 10pt; }}
ul {{ margin: 4pt 0; padding-left: 18pt; }}
.score {{ font-size: 36pt; font-weight: bold; color: #333; }}
blockquote {{ margin: 12pt 20pt; font-style: italic; color: #444; border-left: 3px solid #999; padding-left: 12pt; }}
</style>
</head>
<body>
<div class="cover">
<h1>Waypoint Studio Expert Council Review</h1>
<p class="sub">Version 2 · Comprehensive Design &amp; Architecture Evaluation</p>
<p class="meta">Publication Date: {esc(PUB_DATE)}<br>Prepared for pre-launch strategic review<br>30 independent expert evaluations · Council consensus</p>
</div>
<div class="toc">
<h2>Table of Contents</h2>
<ol>
<li><a href="#executive">Executive Summary</a></li>
<li><a href="#council">Council Debate &amp; Consensus</a></li>
<li><a href="#experts">Individual Expert Reviews</a></li>
<li><a href="#top25">Top 25 Priority Improvements</a></li>
<li><a href="#remove">Features to Remove</a></li>
<li><a href="#add">Features to Add</a></li>
<li><a href="#vision">Long-Term Vision</a></li>
<li><a href="#verdict">Final Verdict</a></li>
</ol>
</div>
<section id="executive">
<h2>1. Executive Summary</h2>
<p><strong>Overall Score: 58 / 100</strong> (pre-launch maturity for stated world-class ambition)</p>
<p><strong>Current Maturity:</strong> Strong editorial and architectural <em>direction</em>; weak <em>execution depth</em> for public launch at national scale. The Outdoor Intelligence Platform (OIP) refactor is the right bet, but the user-facing product still behaves like a Pike County editorial blog with live weather, not a research-grade environmental intelligence system.</p>
<p><strong>Long-Term Potential:</strong> High—if scope is narrowed, photography and lessons ship, citizen science becomes real, and county bundles are honest. The privacy-first, ethics-forward positioning is differentiated against iNaturalist, AllTrails, and generic weather apps.</p>
<h3>What is excellent (protect)</h3>
<ul>
<li>Constitution and mission clarity (Observe · Understand · Create · Share)</li>
<li>OIP / Regional Intelligence Engine architecture (single source of truth direction)</li>
<li>Pike County editorial bundle quality and field-teacher voice</li>
<li>Privacy-first location model (local storage, no accounts)</li>
<li>Tentative language in Happening Now; honest weather failure states</li>
<li>ForageCast as a genuine outdoor tool (not just marketing)</li>
<li>Waypoint Scenes as a creative outdoor companion</li>
</ul>
<h3>What prevents world-class status today</h3>
<ul>
<li>Mission pillar 3 (research-grade observations) is unimplemented</li>
<li>Placeholder media dominates; trust suffers</li>
<li>Ten counties share one ecological narrative</li>
<li>31-script homepage load; mobile UX incomplete</li>
<li>Six preview apps imply false product completeness</li>
<li>No automated tests; data inconsistencies across surfaces</li>
<li>Homepage disables citizen science while claiming it</li>
</ul>
</section>
<section id="council">
<h2>2. Council Debate &amp; Consensus</h2>
<p>The council debated whether the homepage should remain the primary product or whether ForageCast should be the public flagship. <strong>Consensus:</strong> The homepage is the correct <em>trailhead</em>, but it must be rebranded as a <strong>regional field laboratory dashboard</strong>, not a generic outdoor magazine. ForageCast should be the flagship <em>application</em> linked prominently from zone 2—not buried as one section among eleven.</p>
<p><strong>Resolved disagreement:</strong> Product Manager argued for delaying all apps except Scenes and ForageCast; Conservation Biologist insisted Scenes supports Create mission—<em>kept</em>. Strategist and PM agreed: postpone marketing of preview apps.</p>
<p><strong>Unified critical finding:</strong> Do not launch nationally. Launch <strong>Pike County Preview</strong> with explicit scope labeling until per-county bundles and citizen science exist.</p>
</section>
<section id="experts">
<h2>3. Individual Expert Reviews</h2>
""")

    for role, name, sections in EXPERTS:
        parts.append(f'<div class="expert"><h3>{esc(role)} — {esc(name)}</h3>')
        for title, body in sections:
            if title == "Severity":
                parts.append("<h4>Severity</h4><ul>")
                for sev, item in body:
                    cls = "sev-c" if sev == "Critical" else "sev-h" if sev == "High" else "sev-m"
                    parts.append(f'<li><span class="{cls}">{esc(sev)}</span>: {esc(item)}</li>')
                parts.append("</ul>")
            else:
                parts.append(f"<h4>{esc(title)}</h4><p>{esc(body)}</p>")
        parts.append("</div>")

    parts.append('<section id="top25"><h2>4. Top 25 Priority Improvements</h2><table><tr><th>#</th><th>Improvement</th><th>Severity</th><th>Rationale</th><th>Effort</th><th>Impact</th></tr>')
    for row in TOP_25:
        sev_cls = "sev-c" if row[2] == "Critical" else "sev-h" if row[2] == "High" else "sev-m"
        parts.append(f'<tr><td>{row[0]}</td><td>{esc(row[1])}</td><td class="{sev_cls}">{esc(row[2])}</td><td>{esc(row[3])}</td><td>{esc(row[4])}</td><td>{esc(row[5])}</td></tr>')
    parts.append("</table></section>")

    parts.append("<section id=\"remove\"><h2>5. Features to Remove or Demote</h2><ul>")
    for item in REMOVE:
        parts.append(f"<li>{esc(item)}</li>")
    parts.append("</ul></section>")

    parts.append("<section id=\"add\"><h2>6. Features to Add (Mission-Critical Only)</h2><ul>")
    for item in ADD:
        parts.append(f"<li>{esc(item)}</li>")
    parts.append("</ul></section>")

    parts.append("""<section id="vision">
<h2>7. Long-Term Vision</h2>
<p>Waypoint Studio is becoming an <strong>outdoor intelligence and environmental education platform</strong>—not an app company. Apps (ForageCast, Scenes, future Fieldry) are <em>instruments</em> in a field laboratory; the OIP is the observatory.</p>
<p><strong>Recommended model:</strong> Regional intelligence bundles (editorial + live layers) + privacy-first observation ledger + ethical app suite. Revenue via regional licensing to schools, land trusts, and extension—NOT engagement ads.</p>
<p><strong>Postpone:</strong> Savant Sommelier, SignalTerrain, Terrainbound public marketing until OIP supports their domain slices credibly.</p>
</section>
<section id="verdict">
<h2>8. Final Verdict</h2>
<blockquote>If Waypoint Studio continues on its current trajectory for ten years without addressing the gaps identified here, it will become a well-loved <em>regional field guide website</em> with a beautiful constitution—not the definitive outdoor intelligence and environmental education platform.</blockquote>
<p><strong>What blocks definitiveness:</strong></p>
<ol>
<li><strong>No observation moat.</strong> Without research-grade ingestion, you remain an editorial publisher competing with free blogs and government agencies.</li>
<li><strong>False geographic scale.</strong> Ten counties on one ecological story destroys scientific credibility the moment users leave Pike.</li>
<li><strong>Visual trust gap.</strong> Placeholder media signals 'prototype' to every serious educator and scientist.</li>
<li><strong>Scope creep.</strong> Eight products dilute excellence; the council recommends two public apps plus dashboard.</li>
<li><strong>Performance and accessibility debt.</strong> Mobile users and assistive technology users are second-class today.</li>
</ol>
<p><strong>What could make it definitive:</strong> Own the intersection of <em>ethical outdoor education</em>, <em>hyper-local phenology intelligence</em>, and <em>privacy-first citizen science</em>—with county-scale scientific honesty, world-class photography, and a curriculum that always ends outdoors.</p>
<p><strong>Council recommendation:</strong> Execute the Top 25 in order. Launch Pike County Preview in 90 days. Do not pursue national promotion until citizen science MVP and county bundle honesty ship.</p>
</section>
</body></html>""")
    return "".join(parts)


def main():
    OUT_HTML.write_text(build_html(), encoding="utf-8")
    chrome = "/usr/bin/google-chrome"
    cmd = [
        chrome, "--headless=new", "--disable-gpu", "--no-sandbox",
        f"--print-to-pdf={OUT_PDF}",
        f"file://{OUT_HTML}",
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    print(f"Generated: {OUT_PDF}")
    print(f"HTML source: {OUT_HTML}")


if __name__ == "__main__":
    main()
