#!/usr/bin/env python3
"""Generate field guide templates and shared content library for Waypoint Studio."""

import json
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / "field-guide" / "templates"
CONTENT = ROOT / "content"

GUIDES = [
    {
        "file": "species-guide.html",
        "type": "Species Guide",
        "title": "Western Sword Fern",
        "subtitle": "Polystichum munitum — evergreen understory fern of Pacific Northwest forests",
        "facts": [
            ("Family", "Dryopteridaceae"),
            ("Habitat", "Moist forest floor, shaded slopes"),
            ("Height", "60–180 cm fronds"),
            ("Season", "Evergreen; new fiddleheads in spring"),
            ("Range", "Coastal BC to northern California"),
            ("Status", "Common; do not over-collect"),
        ],
        "identify": [
            "Fronds arise from a central crown — never branched like a tree",
            "Each leaflet has a small thumb-like lobe at the base (auricle)",
            "Underside shows rows of round sori (spore dots), not in a continuous line",
            "Stiff, leathery texture compared to lady fern",
        ],
        "why": "Sword fern is a reliable indicator of moist, shaded forest. Where it thrives, soil holds water and canopy cover is intact — clues to whole-ecosystem health.",
        "connect": [
            "Pairs with western red cedar and Douglas-fir canopy structure",
            "Provides cover for Pacific wren and varied thrush",
            "Frond decay feeds forest soil mycorrhizal networks",
            "Often marks the transition from riparian to upland forest",
        ],
        "investigation": [
            "Find five sword ferns on a north-facing slope and five on south-facing — compare frond length and moisture at the base.",
            "Photograph one frond: whole plant, leaflet detail, sori on underside.",
            "Sketch the auricle at the leaflet base — the diagnostic feature.",
            "Return in six weeks: note new fiddleheads or drought stress.",
        ],
        "reflection": "What did you assume about this fern before you looked at the leaflet base? What would you check first next time?",
        "citizen": "Optional: contribute a geotagged photo to a local phenology project. Location rounded to 1 km; identity never required.",
    },
    {
        "file": "habitat-guide.html",
        "type": "Habitat Guide",
        "title": "Riparian Zone",
        "subtitle": "The living edge where water meets land — stream banks, floodplains, and wet margins",
        "facts": [
            ("Definition", "Land adjacent to streams, rivers, or lakes"),
            ("Key feature", "Seasonal flooding and moisture gradient"),
            ("Soil", "Rich alluvium; high organic matter"),
            ("Light", "Variable — open banks to shaded corridors"),
            ("Wildlife", "Highest diversity corridor in many landscapes"),
            ("Threat", "Channelization, grazing, invasive species"),
        ],
        "identify": [
            "Listen for water — even a dry-looking gully may have subsurface flow",
            "Look for alder, willow, cottonwood, or sedges as indicator plants",
            "Notice the line where moss becomes continuous on rocks and soil darkens",
            "Bird activity often concentrates here at dawn",
        ],
        "why": "Riparian zones filter water, stabilize banks, and connect upland forest to aquatic ecosystems. They are classrooms for reading connections.",
        "connect": [
            "Links watershed geology to plant communities",
            "Temperature buffer for aquatic insects and fish",
            "Migration corridor for birds and mammals",
            "Human history often follows water — old trails trace riparian routes",
        ],
        "investigation": [
            "Walk 200 meters of stream edge. Mark three zones: open bank, shrub thicket, overhanging canopy.",
            "Record water clarity, width, and one sign of recent flooding.",
            "Photograph one indicator species in each zone.",
            "Ask: what would change here after three days of heavy rain?",
        ],
        "reflection": "Where does this habitat end? Did you use plants, sound, or soil to decide?",
        "citizen": "Optional: stream temperature or macroinvertebrate survey through a regional watershed program. Anonymous submission preferred.",
    },
    {
        "file": "ecosystem-guide.html",
        "type": "Ecosystem Guide",
        "title": "Temperate Rainforest",
        "subtitle": "Cool, wet forests where precipitation and fog sustain year-round productivity",
        "facts": [
            ("Climate", ">140 cm annual precipitation; mild winters"),
            ("Dominant trees", "Sitka spruce, western hemlock, cedar"),
            ("Structure", "Emergent · canopy · understory · forest floor"),
            ("Keystone", "Fallen logs (nurse logs) seed new trees"),
            ("Region", "Pacific Northwest coastal strip"),
            ("Disturbance", "Windthrow, fire (rare), logging history"),
        ],
        "identify": [
            "Epiphytes (moss, licorice fern) on branches indicate persistent moisture",
            "Multi-layered canopy visible from a single viewpoint",
            "Decaying logs support younger trees growing in a line",
            "Limited mid-day sun on forest floor even in summer",
        ],
        "why": "Temperate rainforests store carbon, hold slope stability, and host species found nowhere else. Understanding structure helps you read any forest patch.",
        "connect": [
            "Ocean fog supplements rainfall inland",
            "Salmon nutrients link marine to terrestrial food webs",
            "Soil mycorrhizae connect tree roots in shared networks",
            "Climate change shifts precipitation timing and drought stress",
        ],
        "investigation": [
            "Stand in one spot for fifteen minutes. Count vertical layers you can see.",
            "Find a nurse log with seedlings — photograph and estimate log age from decay stage.",
            "Measure light at forest floor with a white card at noon.",
            "Return after a dry week: note moss color change on branches.",
        ],
        "reflection": "Which layer drew your attention first? What would a forester notice that you missed?",
        "citizen": "Optional: contribute canopy cover estimates to a long-term forest monitoring plot. No personal data required.",
    },
    {
        "file": "weather-guide.html",
        "type": "Weather Guide",
        "title": "Valley Fog",
        "subtitle": "Radiation and advection fog in low terrain — reading moisture, stability, and light",
        "facts": [
            ("Formation", "Cool air drainage + moisture condensation"),
            ("Peak season", "Autumn and early winter nights"),
            ("Duration", "Often clears mid-morning; may persist in valleys"),
            ("Visibility", "Can drop below 400 m rapidly"),
            ("Sign", "Inversion — warm air above cold pool"),
            ("Safety", "Road frost; navigation disorientation"),
        ],
        "identify": [
            "Fog fills valleys first while ridge tops stay clear",
            "Temperature drops quickly after sunset in low spots",
            "Sound carries farther; scent of damp soil intensifies",
            "Condensation on grass before visible fog in air",
        ],
        "why": "Fog shapes when plants open stomata, when photographers get soft light, and when animals move. It is a daily field condition, not decoration.",
        "connect": [
            "Linked to overnight radiative cooling and wind calm",
            "Reduces evaporation — affects mushroom fruiting",
            "Inversions trap particulates and agricultural smoke",
            "Climate shifts may reduce fog frequency in some regions",
        ],
        "investigation": [
            "At dawn, note fog height on a familiar ridge line — sketch the boundary.",
            "Record temperature at valley floor and 100 m elevation gain.",
            "Photograph the same scene at fog peak and two hours later.",
            "Predict tomorrow's fog using tonight's wind and sky cover.",
        ],
        "reflection": "Did the fog behave as you expected from the previous evening's sky?",
        "citizen": "Optional: submit visibility and fog duration to a local weather observation network. Coordinates optional and rounded.",
    },
    {
        "file": "geology-guide.html",
        "type": "Geology Guide",
        "title": "Columnar Basalt",
        "subtitle": "Hexagonal jointing from slow-cooling lava flows — geometry written in stone",
        "facts": [
            ("Process", "Contraction cracks as basalt cools"),
            ("Typical shape", "Hexagonal columns (4–7 sided)"),
            ("Age example", "Miocene flood basalts of the Columbia Plateau"),
            ("Scale", "Columns from cm to meters across"),
            ("Associated", "Waterfalls, cliff faces, talus slopes"),
            ("Caution", "Unstable talus; respect closed areas"),
        ],
        "identify": [
            "Regular polygonal cross-section when viewed end-on",
            "Vertical or tilted columns like organ pipes",
            "Dark gray to black fine-grained rock; may feel dense and smooth",
            "Often capped by softer sedimentary layers above",
        ],
        "why": "Geology explains slope angle, soil fertility, water flow, and why certain plants grow where they do. Basalt columns are readable evidence of deep time.",
        "connect": [
            "Volcanic history shapes regional topography",
            "Column edges weather faster — microhabitats for lichens",
            "Groundwater follows fracture patterns",
            "Indigenous stories and modern science both address stone origins",
        ],
        "investigation": [
            "Find a column face and count sides on three columns — are they all hexagons?",
            "Photograph wide context + detail of joint pattern.",
            "Sketch how water might flow across this rock face in rain.",
            "Locate this formation on a topographic map.",
        ],
        "reflection": "What surprised you about the scale — larger or smaller than the photos suggested?",
        "citizen": "Optional: geotag a photo for a public geology atlas with location obscured. Participation entirely voluntary.",
    },
    {
        "file": "photography-guide.html",
        "type": "Photography Guide",
        "title": "Reading Forest Light",
        "subtitle": "Exposure, direction, and atmosphere in closed canopy — evidence, not effect",
        "facts": [
            ("Challenge", "High dynamic range; uneven illumination"),
            ("Best windows", "First hour after dawn; overcast diffusion"),
            ("Metering", "Evaluate brightest highlight and deepest shadow"),
            ("White balance", "Shade often reads cool — adjust or embrace"),
            ("Ethics", "Document without disturbing wildlife or trampling"),
            ("Goal", "Evidence frame: what the light was doing"),
        ],
        "identify": [
            "Spot light: single sunbeam on forest floor — expose for beam or accept silhouette",
            "Cloud cover: even tones; colors saturate without harsh contrast",
            "Backlit leaves: translucent chlorophyll glow",
            "Rain: darken trunks; specular highlights on leaves",
        ],
        "why": "Photography in forest is field documentation. A well-exposed frame records conditions your memory will flatten later.",
        "connect": [
            "Links to weather, season, and time of day",
            "Supports phenology and repeat photography studies",
            "Pairs with journal notes for complete evidence",
            "Atmosphere tools in Waypoint Scenes extend — never replace — honest light",
        ],
        "investigation": [
            "Same subject: one frame in open shade, one in spot light, one on overcast day.",
            "Write exposure settings and why you chose them.",
            "Include a notebook or scale object for context.",
            "No post-processing required — compare honesty of each frame.",
        ],
        "reflection": "Which frame best answers: what was the light doing?",
        "citizen": "Optional: contribute repeat-photography pairs to a phenology archive. You retain copyright; sharing is opt-in.",
    },
    {
        "file": "equipment-guide.html",
        "type": "Equipment Guide",
        "title": "Field Notebook Kit",
        "subtitle": "Paper, pencil, and modest tools — enough to record evidence without distraction",
        "facts": [
            ("Notebook", "Water-resistant paper; bound or Rite in the Rain"),
            ("Writing", "Soft pencil (HB–2B) works when wet"),
            ("Scale", "Small ruler or known object in photos"),
            ("Optics", "Hand lens 10× for plants and insects"),
            ("Navigation", "Compass + paper map backup"),
            ("Avoid", "Gear lists that delay going outside"),
        ],
        "identify": [
            "Kit fits in one pocket — if it needs a backpack audit, simplify",
            "Pencil never runs out of ink in cold rain",
            "Rubber band around notebook prevents wind loss",
            "Small bag for one collected leaf sketch — not bulk collection",
        ],
        "why": "Equipment serves observation. The best kit is the one you carry on a walk you would have taken anyway.",
        "connect": [
            "Pairs with Field Notes and Field Investigations",
            "Metadata in margins supports citizen science if you choose",
            "Sketching slows attention — improves identification",
            "Digital tools supplement; paper survives dead batteries",
        ],
        "investigation": [
            "Take only notebook and pencil on a 30-minute walk.",
            "Record date, weather, three observations, one question.",
            "Add one sketch — labels optional on site.",
            "At home, add species names if desired — not required in field.",
        ],
        "reflection": "What did you not miss from your usual gear?",
        "citizen": "No data sharing required for this guide. Your notebook stays private.",
    },
    {
        "file": "research-brief.html",
        "type": "Research Brief",
        "title": "Phenology Shift on Sheltered Slopes",
        "subtitle": "Plain-language summary — why repeat observations at the same place matter",
        "facts": [
            ("Question", "Are spring leaf-out dates advancing on north vs. south slopes?"),
            ("Methods", "Repeat photography + dated field notes over 12 years"),
            ("Sample", "42 fixed plots, Pacific Northwest maritime climate"),
            ("Finding", "South slopes 8–12 days earlier; north slopes more variable"),
            ("Relevance", "Pollinator mismatch risk; drought timing"),
            ("Source", "Placeholder — link to peer-reviewed summary"),
        ],
        "identify": [
            "Research briefs answer: what was asked, how, what was found, why you care outdoors",
            "Look for plain language and local applicability",
            "Check whether citizen data contributed — and how privacy was handled",
        ],
        "why": "Science moves through evidence accumulated over time. You can contribute without being a researcher — by repeating honest observations.",
        "connect": [
            "Links seasonal news to long-term climate patterns",
            "Supports Outdoor Challenge repeat photography",
            "Informs when to expect flowers, insects, and migration",
            "Connects to conservation planning on local slopes",
        ],
        "investigation": [
            "Choose one tree visible from home. Note today's leaf-out stage on a 1–5 scale.",
            "Find the researcher's method section — what would you replicate locally?",
            "Write one question the study raised for your own landscape.",
        ],
        "reflection": "What would change in your hiking calendar if south slopes green two weeks earlier?",
        "citizen": "Optional: enroll in a phenology network with anonymous plot IDs. Review data policy before submitting.",
    },
    {
        "file": "outdoor-challenge.html",
        "type": "Outdoor Challenge",
        "title": "The Thirty-Minute Repeat",
        "subtitle": "Weekly investigation — same place, same bearing, notice what changed",
        "facts": [
            ("Cadence", "Two visits per week, 30 minutes each"),
            ("Duration", "Minimum one week; best across a season"),
            ("Materials", "Notebook, camera, compass or known landmark"),
            ("Rules", "No posting required; no leaderboard"),
            ("Ethics", "Stay on trail; do not collect specimens"),
            ("Goal", "Evidence of change over time"),
        ],
        "identify": [
            "Choose a fixed landmark you can find in any weather",
            "Mark a compass bearing for every photograph",
            "Write conditions first — before interpretation",
        ],
        "why": "Repeat observation is how naturalists and Earth Science classes reveal change that single visits hide.",
        "connect": [
            "Foundation for phenology and climate literacy",
            "Pairs with Gallery and Field Notes",
            "Prepares for optional citizen science contribution",
            "Builds humility — some weeks nothing dramatic happens",
        ],
        "investigation": [
            "Visit 1: weather, three species, one photograph on fixed bearing.",
            "Visit 2: same protocol. What changed? What did not?",
            "Write four sentences. Sketch optional.",
            "Schedule visit 3 for next week before you leave.",
        ],
        "reflection": "Was the unchanged detail as informative as the changed one?",
        "citizen": "Optional: share anonymized repeat photos to a phenology archive. Opt out anytime.",
    },
    {
        "file": "seasonal-journal.html",
        "type": "Seasonal Journal",
        "title": "Late Spring · Week 22",
        "subtitle": "A field season page — phenology, weather, and quiet notes from the trail",
        "facts": [
            ("Season", "Late spring — leaf-out nearing completion below 800 m"),
            ("Daylight", "+3 min/day; evening light holds until 8:30 p.m."),
            ("Temperature", "Cool nights; warm afternoons in clearings"),
            ("Watch for", "First trillium fade; fledgling birds; dry south slopes"),
            ("Journal rule", "Observation before interpretation"),
            ("Privacy", "This page is yours unless you choose to share"),
        ],
        "identify": [
            "Seasonal journal entries include date, place, weather, phenology notes",
            "Sketches and photograph references — not full gear inventories",
            "Questions left open for next visit",
        ],
        "why": "Seasonal journals connect daily walks to long arcs — the way a field teacher tracks a semester outdoors.",
        "connect": [
            "Feeds News and Seasonal Highlight on home pages",
            "Supports repeat photography in Gallery",
            "Informs ForageCast and Steepleaf timing",
            "Optional source for anonymous phenology data",
        ],
        "investigation": [
            "Write today's journal entry: three observations, one question.",
            "Reference one photograph by filename or sketch page number.",
            "Note one species whose timing surprised you this week.",
        ],
        "reflection": "What pattern only becomes visible when you read last month's entries?",
        "citizen": "Sharing seasonal summaries is optional. Aggregate phenology only — never required identity.",
    },
    {
        "file": "field-investigation.html",
        "type": "Field Investigation",
        "title": "The One Square Meter",
        "subtitle": "Beginner ecology investigation — who lives in one meter of ground?",
        "facts": [
            ("Level", "Beginner · 30–45 minutes"),
            ("Place", "Backyard, park edge, or trail margin"),
            ("Materials", "String or sticks, notebook, hand lens optional"),
            ("Driving question", "Who lives here — plants, animals, signs?"),
            ("Safety", "Gloves if soil contact; watch for stinging insects"),
            ("Ethics", "Observe only; do not dig or remove organisms"),
        ],
        "identify": [
            "Mark 1 m² with string at ground level",
            "Count plant species without picking — use lens for small features",
            "Record signs: tracks, scat, chew marks, webs",
            "Photograph wide + one detail with scale",
        ],
        "why": "Ecology begins at the scale you can actually see. One square meter defeats overwhelm and builds honest species awareness.",
        "connect": [
            "Introduces biodiversity metrics used in research",
            "Links to soil, moisture, and light microhabitat",
            "Foundation for intermediate plot surveys",
            "Pairs with WEF Lesson 101 — Observe",
        ],
        "investigation": [
            "BEFORE YOU GO: check weather; confirm permission on private land.",
            "OBSERVE 10 min: sit still. List 5 seen, 3 heard, 1 smelled.",
            "ASK: one question your list raised.",
            "COLLECT EVIDENCE: photo with date and approximate location.",
            "CONNECT: name two relationships between organisms or abiotic factors.",
            "REFLECT: before vs. after — what changed in your understanding?",
            "RETURN: revisit next week; same square if possible.",
        ],
        "reflection": "Did you underestimate or overestimate diversity before you marked the square?",
        "citizen": "Optional: contribute species list to a biodiversity survey with location obscured. Never required.",
    },
]


def render_field_guide(g):
    related_species = [
        ("Species", "Lady Fern", "Compare frond structure"),
        ("Species", "Deer Fern", "Shorter; different sori"),
        ("Species", "Bracken Fern", "Triangular; upland"),
    ]
    related_lessons = [
        ("Lesson 101", "Before you name anything"),
        ("Lesson 102", "Weather writes the landscape"),
        ("Track", "Forest ecology · beginner"),
    ]
    articles = [
        ("Article", "Reading forest floor moisture"),
        ("Article", "Why evergreen matters in winter"),
    ]
    videos = [
        ("4 min", "How to use a hand lens in the field"),
        ("6 min", "Sketching a fern frond"),
    ]

    if g["file"] != "species-guide.html":
        related_species = [(t, n, d) for t, n, d in [
            ("Related", "Placeholder entry", "Link when content exists"),
            ("Related", "Placeholder entry", "Link when content exists"),
        ]]

    facts_html = "\n".join(
        f'            <div class="fg-fact"><span class="fg-fact__label">{l}</span><span class="fg-fact__value">{v}</span></div>'
        for l, v in g["facts"]
    )
    identify_html = "\n".join(f"            <li>{b}</li>" for b in g["identify"])
    connect_html = "\n".join(f"            <li>{b}</li>" for b in g["connect"])
    investigation_html = "\n".join(f"            <li>{s}</li>" for s in g["investigation"])

    species_cards = "\n".join(
        f'            <span class="fg-related-card fg-related-card--placeholder"><span class="fg-related-card__type">{t}</span><span class="fg-related-card__title">{n}</span></span>'
        if "Placeholder" in n
        else f'            <a class="fg-related-card" href="#"><span class="fg-related-card__type">{t}</span><span class="fg-related-card__title">{n}</span></a>'
        for t, n, _ in related_species
    )

    lesson_cards = "\n".join(
        f'            <a class="fg-related-card" href="../../education/README.md"><span class="fg-related-card__type">{t}</span><span class="fg-related-card__title">{n}</span></a>'
        for t, n in related_lessons
    )

    article_cards = "\n".join(
        f'            <span class="fg-related-card fg-related-card--placeholder"><span class="fg-related-card__type">{t}</span><span class="fg-related-card__title">{n}</span></span>'
        for t, n in articles
    )

    return f"""<!DOCTYPE html>
<html lang="en" data-product="scenes">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="{g['title']} — {g['type']} · Waypoint Studio Field Guide">
  <title>{g['title']} — {g['type']} · Waypoint Studio</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../../css/wds.css">
</head>
<body>
  <a class="wds-skip" href="#main">Skip to content</a>
  <div class="wds-app">
    <header class="wds-topbar">
      <div class="wds-topbar__inner">
        <a class="wds-brand" href="../index.html">
          <span class="wds-brand__mark" aria-hidden="true"></span>
          <span class="wds-brand__name">Field Guide</span>
        </a>
        <nav class="wds-nav">
          <a class="wds-btn wds-btn--ghost wds-btn--sm" href="../index.html">All templates</a>
          <a class="wds-btn wds-btn--ghost wds-btn--sm" href="../../../index.html">Waypoint Studio</a>
        </nav>
      </div>
    </header>

    <article class="fg-page" id="main">
      <header class="fg-hero">
        <div class="fg-hero__frame">
          <div class="fg-media-slot fg-media-slot--hero" role="img" aria-label="Hero photograph placeholder">
            <span class="fg-media-slot__icon" aria-hidden="true">◇</span>
            <span class="fg-media-slot__label">Hero photograph · placeholder</span>
            <p class="fg-media-slot__hint">{g['title']} — wide evidence frame with date, place, and conditions in caption</p>
          </div>
        </div>
        <figcaption class="fg-hero__caption"><strong>{g['title']}</strong> — hero caption: date · location · weather · photographer notes. <em>Photography is evidence.</em></figcaption>
      </header>

      <p class="fg-page__type">{g['type']}</p>
      <h1 class="fg-page__title">{g['title']}</h1>
      <p class="fg-page__subtitle">{g['subtitle']}</p>

      <nav class="fg-toc" aria-label="On this page">
        <p class="fg-toc__title">In this guide</p>
        <ol class="fg-toc__list">
          <li><a href="#quick-facts">Quick facts</a></li>
          <li><a href="#identification">Identification</a></li>
          <li><a href="#why">Why it matters</a></li>
          <li><a href="#connect">How it connects</a></li>
          <li><a href="#maps">Maps</a></li>
          <li><a href="#diagrams">Diagrams &amp; illustrations</a></li>
          <li><a href="#investigation">Outdoor investigation</a></li>
          <li><a href="#reflection">Reflection</a></li>
          <li><a href="#related">Related content</a></li>
          <li><a href="#citizen-science">Citizen science</a></li>
        </ol>
      </nav>

      <div class="fg-intro-grid">
        <div>
          <section class="fg-section fg-section--identify" id="identification">
            <div class="fg-section__head"><span class="fg-section__num">I</span><h2 class="fg-section__title">Identification</h2></div>
            <ul class="fg-key-list">{identify_html}
            </ul>
          </section>
        </div>
        <aside class="fg-quick-facts" id="quick-facts">
          <h2 class="fg-quick-facts__title">Quick facts</h2>
{facts_html}
        </aside>
      </div>

      <div class="fg-sections">
        <section class="fg-section fg-section--why" id="why">
          <div class="fg-section__head"><span class="fg-section__num">II</span><h2 class="fg-section__title">Why it matters</h2></div>
          <div class="fg-section__body"><p>{g['why']}</p></div>
        </section>

        <section class="fg-section fg-section--connect" id="connect">
          <div class="fg-section__head"><span class="fg-section__num">III</span><h2 class="fg-section__title">How it connects</h2></div>
          <ul class="fg-key-list">{connect_html}
          </ul>
        </section>

        <section class="fg-section" id="maps">
          <div class="fg-section__head"><span class="fg-section__num">IV</span><h2 class="fg-section__title">Maps</h2></div>
          <div class="fg-media-row">
            <div class="fg-media-slot fg-media-slot--map" role="img" aria-label="Range map placeholder">
              <span class="fg-media-slot__icon" aria-hidden="true">⌗</span>
              <span class="fg-media-slot__label">Range / habitat map · placeholder</span>
              <p class="fg-media-slot__hint">Distribution, aspect, watershed, or site map</p>
            </div>
            <div class="fg-media-slot fg-media-slot--map" role="img" aria-label="Seasonal map placeholder">
              <span class="fg-media-slot__icon" aria-hidden="true">⌗</span>
              <span class="fg-media-slot__label">Season / phenology map · placeholder</span>
              <p class="fg-media-slot__hint">Timing, migration, or bloom calendar</p>
            </div>
          </div>
        </section>

        <section class="fg-section" id="diagrams">
          <div class="fg-section__head"><span class="fg-section__num">V</span><h2 class="fg-section__title">Diagrams &amp; illustrations</h2></div>
          <div class="fg-media-row">
            <figure class="fg-plate">
              <div class="fg-media-slot fg-media-slot--plate" role="img" aria-label="Field guide plate placeholder">
                <span class="fg-media-slot__icon" aria-hidden="true">✦</span>
                <span class="fg-media-slot__label">Peterson-style plate · placeholder</span>
              </div>
              <figcaption class="fg-plate__caption">Diagnostic illustration with labeled features<em>Plate · illustration placeholder</em></figcaption>
            </figure>
            <figure class="fg-plate">
              <div class="fg-media-slot fg-media-slot--diagram" role="img" aria-label="Diagram placeholder">
                <span class="fg-media-slot__icon" aria-hidden="true">◫</span>
                <span class="fg-media-slot__label">Process diagram · placeholder</span>
              </div>
              <figcaption class="fg-plate__caption">Cycle, cross-section, or comparison diagram<em>Diagram · placeholder</em></figcaption>
            </figure>
            <figure class="fg-plate">
              <div class="fg-media-slot fg-media-slot--sketch" role="img" aria-label="Field sketch placeholder">
                <span class="fg-media-slot__icon" aria-hidden="true">✎</span>
                <span class="fg-media-slot__label">Field notebook sketch · placeholder</span>
              </div>
              <figcaption class="fg-plate__caption">Hand-drawn observation from the trail<em>Sketch · placeholder</em></figcaption>
            </figure>
          </div>
        </section>

        <section class="fg-section fg-section--investigation" id="investigation">
          <div class="fg-section__head"><span class="fg-section__num">VI</span><h2 class="fg-section__title">Outdoor investigation</h2></div>
          <ol class="fg-steps">{investigation_html}
          </ol>
        </section>

        <section class="fg-section fg-section--reflection" id="reflection">
          <div class="fg-section__head"><span class="fg-section__num">VII</span><h2 class="fg-section__title">Reflection</h2></div>
          <p>{g['reflection']}</p>
        </section>

        <section class="fg-section" id="related">
          <div class="fg-section__head"><span class="fg-section__num">VIII</span><h2 class="fg-section__title">Related content</h2></div>
          <h3 class="wds-heading" style="font-size: var(--wds-text-md); margin-bottom: var(--wds-space-3);">Related species</h3>
          <div class="fg-related-grid" style="margin-bottom: var(--wds-space-6);">
{species_cards}
          </div>
          <h3 class="wds-heading" style="font-size: var(--wds-text-md); margin-bottom: var(--wds-space-3);">Related lessons</h3>
          <div class="fg-related-grid" style="margin-bottom: var(--wds-space-6);">
{lesson_cards}
          </div>
          <h3 class="wds-heading" style="font-size: var(--wds-text-md); margin-bottom: var(--wds-space-3);">Articles</h3>
          <div class="fg-related-grid" style="margin-bottom: var(--wds-space-6);">
{article_cards}
          </div>
          <h3 class="wds-heading" style="font-size: var(--wds-text-md); margin-bottom: var(--wds-space-3);">Videos</h3>
          <div class="fg-media-row">
            <div class="fg-video-slot" role="img" aria-label="Educational video placeholder">
              <span class="fg-video-slot__play" aria-hidden="true">▶</span>
              <span class="fg-media-slot__label">{videos[0][0]} · video · placeholder</span>
            </div>
            <div class="fg-video-slot" role="img" aria-label="Educational video placeholder">
              <span class="fg-video-slot__play" aria-hidden="true">▶</span>
              <span class="fg-media-slot__label">{videos[1][0]} · video · placeholder</span>
            </div>
          </div>
        </section>

        <section class="fg-section fg-section--citizen" id="citizen-science">
          <div class="fg-section__head"><span class="fg-section__num">IX</span><h2 class="fg-section__title">Citizen science · optional</h2></div>
          <div class="fg-section__body"><p>{g['citizen']}</p><p class="wds-caption" style="margin-top: var(--wds-space-3);">Private by default. Read the <a href="../../../docs/WAYPOINT-STUDIO-CONSTITUTION.md#privacy-philosophy">Privacy Philosophy</a>.</p></div>
        </section>
      </div>
    </article>

    <footer class="wds-footer">Waypoint Studio · Field Guide Design System</footer>
  </div>
</body>
</html>
"""


def generate_content():
    """Generate 50 items each for six content types with realistic titles."""

    def items(prefix, titles, extra=None):
        out = []
        for i, title in enumerate(titles[:50], 1):
            entry = {
                "id": f"{prefix}-{i:03d}",
                "title": title,
                "summary": f"Placeholder summary for {title.lower()} — observation first, investigation outdoors.",
                "type": prefix.replace("-", " ").title(),
                "domain": DOMAINS[i % len(DOMAINS)],
                "season": SEASONS[i % len(SEASONS)],
                "durationMinutes": (i % 12) + 3 if prefix in ("lesson", "video") else None,
                "placeholder": True,
            }
            if extra:
                entry.update(extra(i, title))
            out.append({k: v for k, v in entry.items() if v is not None})
        return out

    DOMAINS = ["species", "habitat", "ecology", "weather", "geology", "photography", "field-skills", "conservation"]
    SEASONS = ["late winter", "early spring", "late spring", "early summer", "late summer", "autumn", "early winter"]

    ARTICLES = [
        "Why fog pools in valleys on clear autumn nights",
        "Reading bark texture on Douglas-fir vs. western red cedar",
        "What lichens tell you about air quality on a short walk",
        "The ethics of photographing nesting birds from the trail",
        "How watershed shape controls where trails stay muddy",
        "First trillium on north-facing slopes — timing notes",
        "When to trust a field guide range map and when to question it",
        "Soil color as evidence of drainage and parent material",
        "Why repeat photography beats a single perfect frame",
        "Listening for dawn chorus layers in suburban greenbelts",
        "Cloud types you can name without an app",
        "Leave-no-trace choices when teaching a field class",
        "How fallen logs become nurseries for the next canopy",
        "Interpreting scat without turning wildlife into a trophy",
        "The difference between habitat and ecosystem in plain language",
        "Why south slopes green before north slopes in spring",
        "Photographing forest light without fighting the contrast",
        "Introduced species vs. native — patience before judgment",
        "What a hand lens reveals on a single fern frond",
        "Reading avalanche paths from summer trail geometry",
        "Phenology notebooks that actually get used",
        "How to write field notes your future self will understand",
        "Citizen science without giving up location privacy",
        "The quiet case for turning back before the summit",
        "Insect sign on leaves — chew, mine, gall, and roll",
        "Estimating stream flow from sound and color",
        "Why moss on only one side of a tree is an oversimplification",
        "Teaching geology with pebbles instead of slideshows",
        "Seasonal shifts in bird song territories on a fixed route",
        "What old-growth structure looks like without measuring trees",
        "Rain shadows and why your valley dries first",
        "Sketching clouds for weather journals",
        "Ethical foraging starts with identification, not recipes",
        "How to compare two map layers without a GIS degree",
        "Wildfire smoke and what it does to evening light",
        "Frog chorus timing and water temperature",
        "Reading talus slope stability for off-trail choices",
        "Why empty journal days still belong in the record",
        "Connecting wine terroir to slope and soil — an ecology primer",
        "Shed antler timing and winter yard behavior",
        "Star navigation when you forget the app",
        "Macro photography as documentation, not collection",
        "How conservation status labels should change behavior",
        "The one-square-meter biodiversity lesson",
        "Tracking seasonal leaf-out with a fixed compass bearing",
        "What research briefs owe field teachers",
        "Building a classroom herbarium without over-collecting",
        "Night sky preservation and trailhead lighting choices",
        "When citizen datasets help — and when they harm",
        "Returning to the same place until it feels like kin",
    ]

    LESSONS = [
        "101 · Before you name anything",
        "102 · Weather writes the landscape",
        "103 · The evidence in a photograph",
        "104 · Maps are stories about water",
        "105 · One square meter of attention",
        "201 · Fern fronds and diagnostic features",
        "202 · Riparian edges as wildlife corridors",
        "203 · Reading valley fog from ridge lines",
        "204 · Basalt columns and cooling geometry",
        "205 · Forest light — expose for honesty",
        "301 · Hand lens protocol in the field",
        "302 · Field notebook metadata that matters",
        "303 · Sketching without becoming an artist",
        "304 · Compass bearings for repeat photos",
        "305 · Sound mapping at dawn",
        "401 · Cloud families and weather prediction",
        "402 · Soil texture by feel — jar test optional",
        "403 · Stream order and watershed vocabulary",
        "404 · Aspect and microclimate on a short hike",
        "405 · Geologic time on a trail cutbank",
        "501 · Ethical distance for wildlife photography",
        "502 · Leave No Trace for field instructors",
        "503 · Private notes vs. shared observations",
        "504 · Introduced species documentation",
        "505 · Conservation status and field behavior",
        "601 · Phenology scoring on a fixed tree",
        "602 · Repeat photography protocol",
        "603 · Optional anonymous contribution",
        "604 · Reading a research brief critically",
        "605 · Designing a seasonal investigation",
        "701 · Mushroom identification humility",
        "702 · Tree bark keys in winter",
        "703 · Bird silhouette identification",
        "704 · Track identification in mud and snow",
        "705 · Aquatic macroinvertebrate sign",
        "801 · Night sky orientation without apps",
        "802 · Tide table literacy for coastal walks",
        "803 · Avalanche terrain recognition intro",
        "804 · Hypothermia risk and turnaround ethics",
        "805 · Group management on field trips",
        "901 · Connecting geology to plant communities",
        "902 · Connecting weather to animal activity",
        "903 · Connecting photography to phenology",
        "904 · Connecting journals to citizen science",
        "905 · The learning cycle review — go back outside",
    ] + [f"906 · Advanced field synthesis {n}" for n in range(1, 6)]

    VIDEOS = [
        "How to learn like a naturalist",
        "Reading slope and aspect on a map",
        "Keeping a field notebook that survives rain",
        "Using a hand lens without rushing",
        "Photographing forest light — three conditions compared",
        "Sketching a leaf in four minutes",
        "Cloud types from a trailhead bench",
        "Riparian zone walk — what to notice first",
        "Basalt columns — reading joint patterns",
        "Repeat photography setup in one location",
        "Dawn chorus sound mapping demo",
        "Soil color and drainage in the field",
        "Ethical wildlife distance — practical demo",
        "Fern identification — frond architecture",
        "Stream flow cues without instruments",
        "Fog formation in a valley demo",
        "Compass walk for beginners",
        "Metadata in field photography",
        "Optional citizen science — what you share",
        "Turning back before the weather wins",
        "Old-growth structure without jargon",
        "Introduced vs. native — field comparison",
        "Phenology scoring on one tree",
        "Night sky — finding north quietly",
        "Macro photography as evidence",
        "Track identification after rain",
        "Winter bark ID walk",
        "Leave No Trace for photographers",
        "How research briefs connect to your walk",
        "Seasonal journal review — patterns emerge",
    ] + [f"Habitat walk series · episode {n}" for n in range(1, 21)]

    FIELD_GUIDES = [
        "Western Sword Fern · species profile",
        "Riparian zone · habitat guide",
        "Temperate rainforest · ecosystem guide",
        "Valley fog · weather guide",
        "Columnar basalt · geology guide",
        "Forest light · photography guide",
        "Field notebook kit · equipment guide",
        "Lady fern · species profile",
        "Deer fern · species profile",
        "Pacific wren · species profile",
        "Varied thrush · species profile",
        "Western red cedar · species profile",
        "Douglas-fir · species profile",
        "Sitka spruce · species profile",
        "Red alder · species profile",
        "Bigleaf maple · species profile",
        "Oregon grape · species profile",
        "Salal · species profile",
        "Trillium · species profile",
        "Chanterelle · species profile (identification only)",
        "Alpine meadow · habitat guide",
        "Coastal fog belt · weather guide",
        "Glacial erratic · geology guide",
        "Talus slope · habitat guide",
        "Estuary margin · ecosystem guide",
        "Prairie oak savanna · ecosystem guide",
        "Winter squall line · weather guide",
        "Reading topographic maps · skills guide",
        "Hand lens field protocol · equipment guide",
        "Macro photography ethics · photography guide",
        "Phenology shift brief · research brief",
        "Salmon nutrient cycle · research brief",
        "Mycorrhizal networks · research brief",
        "Invasive ivy impact · research brief",
        "Night sky at trailhead · astronomy guide",
        "Moon phase and tide intro · astronomy guide",
        "Snowpack water storage · weather guide",
        "Wildfire ecology recovery · ecosystem guide",
        "Beaver pond succession · ecosystem guide",
        "Wetland sedges · habitat guide",
        "Cliff nesting birds · habitat guide",
        "Migration corridor · ecosystem guide",
        "Geology of a waterfall · geology guide",
        "Sandstone vs. basalt weathering · geology guide",
        "Reading avalanche debris · geology guide",
        "Desert varnish · geology guide",
        "Coastal stack formation · geology guide",
        "Lichen communities on rock · species profile",
        "Moss on logs · species profile",
        "Field sketching kit · equipment guide",
    ]

    CHALLENGES = [
        "The thirty-minute repeat",
        "One square meter biodiversity count",
        "Same tree, four sides",
        "Cloud names for today's sky",
        "Morning sound map",
        "Shadow length at local solar noon",
        "After-rain sensory walk",
        "Fixed bearing phenology photo",
        "Three-visit riparian comparison",
        "Hand lens hour on one plant",
        "Track and sign transect",
        "No-phone observation sit",
        "Sketch one leaf, label later",
        "Compass walk without GPS",
        "Night sky from a safe dark site",
        "Soil texture in three microhabitats",
        "Bird count on a 500 m loop",
        "Fog line elevation sketch",
        "Stream cross-section estimate",
        "Bark ID on five native trees",
        "Invasive species single-report",
        "Leave-no-trace audit on a favorite trail",
        "Journal an empty day honestly",
        "Repeat photograph after first frost",
        "Repeat photograph at spring leaf-out",
        "Listen for amphibians at dusk",
        "Measure canopy cover with a card",
        "Document lichen on three substrates",
        "Compare south vs. north slope moisture",
        "Weather journal for one week",
        "Moon phase observation series",
        "Star trail orientation sketch",
        "Estuary tide line change",
        "Beaver sign survey",
        "Dead wood habitat inventory",
        "Pollinator visit count on one flower",
        "Seed dispersal evidence hunt",
        "Fungal fruiting after rain (look, don't pick)",
        "Antler shed ethics walk",
        "Geology pebble origin story",
        "Waterfall spray zone plants",
        "Alpine wildflower timing transect",
        "Snow line elevation weekly",
        "Fire scar regrowth documentation",
        "Citizen science opt-in review",
        "Private journal week — no sharing",
        "Teach one friend the learning cycle",
        "Return to childhood outdoor place",
        "Turn back early — document why",
        "Design your own seasonal challenge",
    ]

    NEWS = [
        "Light lingers longer — late spring phenology note",
        "First trillium fading on north slopes",
        "Valley fog frequency below average this week",
        "Dawn chorus starts ten minutes earlier",
        "Snowpack at 78% of median — east slopes drier",
        "Coho fry visible in lower creek pools",
        "Morel season caution — identification over harvest",
        "Wildfire smoke forecast — photography and health",
        "Elk calving areas — extra distance requested",
        "Tide minus series this weekend — estuary walks",
        "Aurora possible Friday — quiet viewing etiquette",
        "Invasive ivy pull volunteer day (optional)",
        "New research: south slope leaf-out advancing",
        "Owl nest closure on popular trail section",
        "River turbidity high after upstream rain",
        "Huckleberry flower timing early on south aspects",
        "Mushroom fruiting uptick after three wet days",
        "Trail maintenance — reroute protects riparian zone",
        "Citizen science phenology network open enrollment",
        "Night sky event — planet alignment at dusk",
        "Frost advisory for valley bottoms tonight",
        "Heat advisory — turnaround ethics reminder",
        "Salmon run update — creek mouth observation",
        "Bear activity increase — storage and distance",
        "Cougar sign reported — calm field behavior",
        "Eagle nest successful fledging",
        "Beaver dam raises trail flooding risk",
        "Landslide scar fresh on forest road",
        "Glacier retreat photo series seeks repeat contributors",
        "School district adds field lab curriculum pilot",
        "Conservation easement expands riparian buffer",
        "Invasive frog species — report with care",
        "Bat emergence surveys — anonymous counts welcome",
        "Pollen count high — journal allergy vs. ecology",
        "Dry lightning watch — fire awareness",
        "First snow on high ridges — pass timing",
        "Migration report — warblers arriving",
        "Harbor seal pupping — coastal distance",
        "Whale migration sighting line open",
        "Star party at dark-sky site Saturday",
        "Research brief: mycorrhizal drought response",
        "Local herbarium digitization needs volunteers",
        "Trail counter data shows weekday quiet hours",
        "Community science water quality snapshot day",
        "Fungal diversity walk — look, don't collect",
        "Winter bird feeder ethics discussion",
        "Spring amphibian road crossing watch",
        "Summer solstice light note for photographers",
        "Autumn equinox repeat photo invitation",
        "Year-end field journal reflection prompt",
    ]

    GUIDE_TYPES = [
        "species", "habitat", "ecosystem", "weather", "geology",
        "photography", "equipment", "research-brief", "outdoor-challenge",
        "seasonal-journal", "field-investigation",
    ]
    CADENCES = ["daily", "weekly", "monthly", "seasonal"]

    datasets = {
        "articles.json": items("article", ARTICLES),
        "lessons.json": items("lesson", LESSONS),
        "videos.json": items("video", VIDEOS),
        "field-guides.json": items("field-guide", FIELD_GUIDES, lambda i, t: {"guideType": GUIDE_TYPES[i % len(GUIDE_TYPES)]}),
        "challenges.json": items("challenge", CHALLENGES, lambda i, t: {"cadence": CADENCES[i % len(CADENCES)]}),
        "news.json": items("news", NEWS, lambda i, t: {"dateline": SEASONS[i % len(SEASONS)]}),
    }

    CONTENT.mkdir(parents=True, exist_ok=True)
    for name, data in datasets.items():
        path = CONTENT / name
        path.write_text(json.dumps({"version": "1.0.0", "count": len(data), "items": data}, indent=2) + "\n")
        print(f"Wrote {path} ({len(data)} items)")


def main():
    TEMPLATES.mkdir(parents=True, exist_ok=True)
    for g in GUIDES:
        path = TEMPLATES / g["file"]
        path.write_text(render_field_guide(g))
        print(f"Wrote {path}")
    generate_content()
    print("Done.")


if __name__ == "__main__":
    main()
