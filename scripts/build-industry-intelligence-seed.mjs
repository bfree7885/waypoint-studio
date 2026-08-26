#!/usr/bin/env node
/**
 * Writes curated-baseline Industry Intelligence seed JSON.
 * Not live news — structural intelligence labeled for honesty.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "data/deck-signals/relationships/industries/industries.json");

const C = {
  us: { id: "gsc_united-states", name: "United States", slug: "united-states" },
  cn: { id: "gsc_china", name: "China", slug: "china" },
  tw: { id: "gsc_taiwan", name: "Taiwan", slug: "taiwan" },
  kr: { id: "gsc_south-korea", name: "South Korea", slug: "south-korea" },
  jp: { id: "gsc_japan", name: "Japan", slug: "japan" },
  de: { id: "gsc_germany", name: "Germany", slug: "germany" },
  nl: { id: "gsc_netherlands", name: "Netherlands", slug: "netherlands" },
  sa: { id: "gsc_saudi-arabia", name: "Saudi Arabia", slug: "saudi-arabia" },
  br: { id: "gsc_brazil", name: "Brazil", slug: "brazil" },
  in: { id: "gsc_india", name: "India", slug: "india" },
  au: { id: "gsc_australia", name: "Australia", slug: "australia" },
  ca: { id: "gsc_canada", name: "Canada", slug: "canada" },
  mx: { id: "gsc_mexico", name: "Mexico", slug: "mexico" },
  sg: { id: "gsc_singapore", name: "Singapore", slug: "singapore" },
  ae: { id: "gsc_uae", name: "United Arab Emirates", slug: "uae" },
  fr: { id: "gsc_france", name: "France", slug: "france" },
  uk: { id: "gsc_united-kingdom", name: "United Kingdom", slug: "united-kingdom" },
  cl: { id: "gsc_chile", name: "Chile", slug: "chile" },
  ar: { id: "gsc_argentina", name: "Argentina", slug: "argentina" },
  vn: { id: "gsc_vietnam", name: "Vietnam", slug: "vietnam" },
  id: { id: "gsc_indonesia", name: "Indonesia", slug: "indonesia" },
  ng: { id: "gsc_nigeria", name: "Nigeria", slug: "nigeria" },
  za: { id: "gsc_south-africa", name: "South Africa", slug: "south-africa" },
  qa: { id: "gsc_qatar", name: "Qatar", slug: "qatar" },
  no: { id: "gsc_norway", name: "Norway", slug: "norway" },
  ch: { id: "gsc_switzerland", name: "Switzerland", slug: "switzerland" },
  ie: { id: "gsc_ireland", name: "Ireland", slug: "ireland" },
  my: { id: "gsc_malaysia", name: "Malaysia", slug: "malaysia" },
  th: { id: "gsc_thailand", name: "Thailand", slug: "thailand" },
  pl: { id: "gsc_poland", name: "Poland", slug: "poland" },
  tr: { id: "gsc_turkey", name: "Türkiye", slug: "turkey" },
  eg: { id: "gsc_egypt", name: "Egypt", slug: "egypt" },
  pa: { id: "gsc_panama", name: "Panama", slug: "panama" }
};

const CI = {
  goods: { id: "gsci_availability-of-goods", label: "Availability of goods" },
  inflation: { id: "gsci_inflation-household-costs", label: "Inflation / household costs" },
  transport: { id: "gsci_transportation", label: "Transportation" },
  housing: { id: "gsci_housing", label: "Housing" },
  fuel: { id: "gsci_fuel-prices", label: "Fuel prices" },
  travel: { id: "gsci_travel-costs", label: "Travel costs" },
  employment: { id: "gsci_employment", label: "Employment" },
  food: { id: "gsci_food-prices", label: "Food prices" },
  health: { id: "gsci_healthcare-access", label: "Healthcare access" },
  medicine: { id: "gsci_medicine-availability", label: "Medicine availability" },
  energy: { id: "gsci_energy-reliability", label: "Energy reliability" },
  digital: { id: "gsci_digital-access", label: "Digital access" }
};

const ART = {
  canal: { id: "gsa_demo-canal-slots", headline: "Canal authority reduces daily transit slots after prolonged drought" },
  steel: { id: "gsa_demo-steel-tariff", headline: "Government announces higher tariffs on selected steel imports" },
  ship: { id: "gsa_demo-shipping-diversion", headline: "Carriers divert sailings away from a contested maritime corridor" },
  cyber: { id: "gsa_demo-pipeline-cyber", headline: "Ransomware disrupts a major fuel pipeline operator’s billing systems" },
  port: { id: "gsa_demo-port-labor", headline: "Labor stoppage slows cargo handling at a major coastal port complex" }
};

function country(c, role) {
  return { id: c.id, name: c.name, slug: c.slug, role };
}

function claim(text, confidence, horizon) {
  return { text, confidence, horizon };
}

function item(label, detail, confidence, horizon) {
  return { label, detail, confidence, horizon };
}

function citizen(ci, detail, confidence, horizon) {
  return { id: ci.id, label: ci.label, detail, confidence, horizon };
}

function dep(industryId, name, slug, relation, confidence) {
  return { industryId, name, slug, relation, confidence };
}

function node(label, type, note) {
  return { label, type, note };
}

const industries = [
  {
    id: "gsi_semiconductors",
    slug: "semiconductors",
    name: "Semiconductors",
    tagline: "Foundries, tools, and chip design sit at the center of modern industry.",
    summary:
      "Semiconductors concentrate design, fabrication equipment, specialty chemicals, and advanced packaging into a small set of geographies and firms. Capacity, export controls, and water/energy constraints shape what other industries can ship.",
    whatIsHappening: claim(
      "Leading-edge logic capacity remains concentrated in a few foundries, while governments fund domestic fabs and tighten export controls on advanced tools and chips. Packaging, specialty gases, and EUV tool supply remain tight relative to demand for AI and automotive silicon.",
      "Medium",
      "Months"
    ),
    why: claim(
      "Chips are an intermediate good for nearly every modern product. When lithography tools, photomasks, or advanced packaging nodes bottleneck, Automotive, Technology, Healthcare devices, and Defense electronics feel delayed availability long before consumers see a headline about ‘chips.’",
      "High",
      "Long-term"
    ),
    threats: [
      item("Geographic concentration of advanced fabs", "A small number of sites produce most leading-edge logic; natural disaster, conflict, or energy disruption at those sites would cascade widely.", "Medium", "Long-term"),
      item("Export-control friction", "Licensing regimes on tools and advanced nodes can slow technology transfer and re-route supply graphs without eliminating demand.", "High", "Months"),
      item("Water and power intensity", "Fabs require reliable ultrapure water and stable power; drought or grid stress can constrain utilization.", "Medium", "Weeks")
    ],
    opportunities: [
      item("Mature-node capacity for autos and industrial", "Not every chip needs the newest node; expanding mature capacity can ease Automotive and industrial shortages.", "Medium", "Months"),
      item("Advanced packaging and chiplets", "Heterogeneous integration can stretch existing silicon and create new assembly hubs.", "Medium", "Long-term"),
      item("Diversified specialty chemical routes", "Alternate chemical and gas suppliers reduce single-point failure in fab inputs.", "Low", "Long-term")
    ],
    majorCountries: [
      country(C.tw, "Leading-edge foundry capacity and packaging ecosystem"),
      country(C.kr, "Memory and logic fabrication; equipment demand"),
      country(C.us, "Chip design, EDA software, and new fab investment"),
      country(C.nl, "Critical lithography equipment manufacturing"),
      country(C.jp, "Specialty materials, equipment, and sensors"),
      country(C.cn, "Large demand base and expanding domestic capacity")
    ],
    supplyChain: {
      overview:
        "Design IP and EDA → wafers and specialty chemicals → fab tools → fabrication → advanced packaging/test → OEMs (phones, autos, servers, medical devices).",
      nodes: [
        node("EDA / IP", "design", "Software and IP licenses gate what can be designed."),
        node("Specialty chemicals & gases", "input", "Ultrapure inputs; few qualified suppliers."),
        node("Lithography & process tools", "equipment", "Long lead times; export-sensitive."),
        node("Wafer fab", "manufacturing", "Geographically concentrated leading edge."),
        node("Packaging & test", "manufacturing", "Often separate geography from front-end fab."),
        node("OEM assembly", "downstream", "Technology, Automotive, Healthcare devices.")
      ]
    },
    relatedArticles: [ART.steel, ART.port],
    waypointsTake: {
      whyItMatters:
        "Semiconductor risk is not a gadget story — it is a dependency story. A fab constraint shows up months later as delayed cars, servers, or imaging equipment.",
      analysis:
        "Treat leading-edge concentration as a structural fact, not a daily news pulse. Diversification of mature nodes and packaging can reduce some citizen-facing scarcity without solving geopolitics. Predicted household price effects should stay Low/Unknown confidence until inventory and contract data exist."
    },
    citizenImpacts: [
      citizen(CI.goods, "Electronics and vehicle availability can tighten when OEM allocations slip.", "Low", "Months"),
      citizen(CI.inflation, "Device and auto costs may rise if shortages persist — not automatic.", "Low", "Months"),
      citizen(CI.digital, "Cloud and network capacity growth depends on server silicon availability.", "Medium", "Months"),
      citizen(CI.employment, "Fab construction and supplier ecosystems create regional job effects.", "Medium", "Long-term")
    ],
    topDependencies: [
      dep("gsi_technology", "Technology", "technology", "Consumes logic, memory, and networking silicon", "High"),
      dep("gsi_automotive", "Automotive", "automotive", "MCUs, sensors, and power electronics in vehicles", "High"),
      dep("gsi_energy", "Energy", "energy", "Fabs need stable power; grids need industrial control chips", "Medium"),
      dep("gsi_healthcare", "Healthcare", "healthcare", "Imaging, diagnostics, and connected devices", "Medium")
    ],
    relatedIndustries: ["gsi_technology", "gsi_automotive", "gsi_healthcare", "gsi_construction", "gsi_energy"]
  },
  {
    id: "gsi_energy",
    slug: "energy",
    name: "Energy",
    tagline: "Fuels, grids, and generation that power every other industry.",
    summary:
      "Energy links extraction, refining, pipelines, shipping, electricity generation, and grids. Cyber incidents, weather, and corridor security can move fuel and power availability faster than most other sectors.",
    whatIsHappening: claim(
      "Oil and gas still set much of transport and industrial heat cost, while power grids absorb rising electrification and data-center load. Pipeline cyber risk, maritime corridor diversions, and weather extremes remain recurring stress tests for fuel and electricity reliability.",
      "Medium",
      "Weeks"
    ),
    why: claim(
      "Energy is the universal intermediate. When pipelines pause, tankers divert, or grids strain, Transportation, Shipping, Food cold chains, Construction materials, and households feel cost or reliability pressure.",
      "High",
      "Long-term"
    ),
    threats: [
      item("Critical infrastructure cyber events", "IT/OT incidents can pause physical flows even when malware targets billing systems.", "High", "Days"),
      item("Maritime fuel corridor risk", "Diverted tanker routes raise voyage days and bunker burn.", "Medium", "Weeks"),
      item("Grid congestion and extreme weather", "Heat, cold, or storms can force load shedding or price spikes regionally.", "Medium", "Days")
    ],
    opportunities: [
      item("Grid flexibility and storage", "Batteries and demand response can dampen short spikes without new baseload overnight.", "Medium", "Months"),
      item("Efficiency in industry and buildings", "Lower intensity reduces exposure to fuel shocks.", "Medium", "Long-term"),
      item("Diversified fuel and power routes", "Multiple pipelines, LNG terminals, and interconnectors reduce single chokepoints.", "Medium", "Long-term")
    ],
    majorCountries: [
      country(C.us, "Oil & gas production, refining, pipelines, and large power demand"),
      country(C.sa, "Major crude exporter; OPEC+ coordination relevance"),
      country(C.qa, "LNG export capacity"),
      country(C.no, "North Sea production and European supply relevance"),
      country(C.cn, "Largest energy importer and growing renewables fleet"),
      country(C.de, "Industrial demand and European grid interconnection")
    ],
    supplyChain: {
      overview:
        "Upstream extraction → midstream transport (pipeline/tanker) → refining/generation → distribution → industrial and household end use.",
      nodes: [
        node("Upstream fields", "extraction", "Geopolitically and geologically concentrated."),
        node("Pipelines / tankers", "infrastructure", "Chokepoints and cyber-sensitive operators."),
        node("Refineries / generators", "conversion", "Regional capacity constraints matter."),
        node("Wholesale markets", "market", "Price discovery; not advice."),
        node("Retail fuel & power", "downstream", "Citizen-visible layer.")
      ]
    },
    relatedArticles: [ART.cyber, ART.ship, ART.canal],
    waypointsTake: {
      whyItMatters:
        "Energy shocks travel through logistics and food cold chains before they become ‘inflation’ stories. The first relationship to watch is infrastructure continuity, not spot headlines.",
      analysis:
        "Historical pipeline cyber patterns show precautionary shutdowns can create regional fuel stress within days. Treat predicted household price paths as Medium/Low confidence unless local inventory and allocation data confirm. Diversion of maritime lanes compounds fuel cost for Shipping and Transportation without implying a permanent regime."
    },
    citizenImpacts: [
      citizen(CI.fuel, "Station-level shortages or price spikes are possible when product stops moving.", "Medium", "Days"),
      citizen(CI.energy, "Grid stress can affect heating, cooling, and medical equipment reliability.", "Medium", "Days"),
      citizen(CI.inflation, "Energy is a broad cost pass-through into goods and services — lags vary.", "Low", "Weeks"),
      citizen(CI.transport, "Diesel availability affects freight and local transit.", "Medium", "Days")
    ],
    topDependencies: [
      dep("gsi_shipping", "Shipping", "shipping", "Bunker fuel and tanker movements", "High"),
      dep("gsi_transportation", "Transportation", "transportation", "Fuel for road/rail/air fleets", "High"),
      dep("gsi_food", "Food", "food", "Cold chain and processing energy intensity", "Medium"),
      dep("gsi_technology", "Technology", "technology", "Data centers and cloud power demand", "High")
    ],
    relatedIndustries: ["gsi_shipping", "gsi_transportation", "gsi_construction", "gsi_food", "gsi_technology"]
  },
  {
    id: "gsi_agriculture",
    slug: "agriculture",
    name: "Agriculture",
    tagline: "Crops, livestock, fertilizers, and weather-sensitive production.",
    summary:
      "Agriculture converts land, water, fertilizer, seed, and labor into commodities that feed Food processing and trade. Weather, ports, and fertilizer energy costs are recurring transmission channels.",
    whatIsHappening: claim(
      "Yields and planting decisions remain highly weather-dependent, while fertilizer costs track energy and export policies. Port and canal constraints affect export crop schedules; labor and water stress shape regional production capacity.",
      "Medium",
      "Months"
    ),
    why: claim(
      "Agriculture is the upstream of Food. Disruptions in fertilizer, water, or export corridors show up later as Food prices and Availability of goods — with long lags and many offsets.",
      "High",
      "Long-term"
    ),
    threats: [
      item("Drought and heat stress", "Yield losses and livestock stress can tighten regional balances.", "Medium", "Months"),
      item("Fertilizer and energy cost spikes", "Gas-linked fertilizer economics raise input costs for growers.", "Medium", "Weeks"),
      item("Export corridor delays", "Port labor or canal constraints delay perishable and bulk shipments.", "Medium", "Days")
    ],
    opportunities: [
      item("Water-efficient practices", "Irrigation efficiency and drought-tolerant varieties reduce yield volatility.", "Medium", "Long-term"),
      item("Regional processing near production", "Shorter cold-chain legs can cut spoilage risk.", "Low", "Months"),
      item("Transparent inventory communication", "Honest stock and forecast labeling reduces panic buying pressure.", "Medium", "Weeks")
    ],
    majorCountries: [
      country(C.us, "Major grains, soy, and livestock exporter"),
      country(C.br, "Soy, corn, beef, and sugar export capacity"),
      country(C.in, "Large production and domestic food demand"),
      country(C.cn, "Major importer and large producer"),
      country(C.au, "Wheat and livestock export relevance"),
      country(C.ar, "Soy and grains export corridor")
    ],
    supplyChain: {
      overview:
        "Inputs (seed, fertilizer, fuel, water) → farms → storage/elevators → ports/rail → Food processors and export markets.",
      nodes: [
        node("Fertilizer & seed", "input", "Energy-linked and trade-policy sensitive."),
        node("Farms & ranches", "production", "Weather and labor intensive."),
        node("Storage & elevators", "infrastructure", "Inventory buffers matter."),
        node("Export ports", "logistics", "Shared with Shipping and Retail imports."),
        node("Food processing", "downstream", "Hand-off to Food industry.")
      ]
    },
    relatedArticles: [ART.port, ART.canal],
    waypointsTake: {
      whyItMatters:
        "Agriculture transmits climate and logistics into Food prices slowly — skipping the farm layer makes consumer stories look mysterious.",
      analysis:
        "Port stoppages matter most for perishable and just-in-time export windows. Fertilizer cost pressure is an Energy→Agriculture hop that should not be labeled Observed for household food prices until retail data confirms pass-through."
    },
    citizenImpacts: [
      citizen(CI.food, "Farm-gate or wholesale shifts may reach retail with lags and substitutions.", "Low", "Months"),
      citizen(CI.employment, "Farm and processing labor markets feel regional shocks.", "Medium", "Weeks"),
      citizen(CI.goods, "Export crop delays can affect processed food availability abroad.", "Low", "Weeks")
    ],
    topDependencies: [
      dep("gsi_food", "Food", "food", "Primary downstream buyer of farm commodities", "High"),
      dep("gsi_energy", "Energy", "energy", "Fertilizer, diesel, irrigation power", "High"),
      dep("gsi_shipping", "Shipping", "shipping", "Bulk and containerized ag exports", "High"),
      dep("gsi_transportation", "Transportation", "transportation", "Truck/rail to elevators and ports", "Medium")
    ],
    relatedIndustries: ["gsi_food", "gsi_energy", "gsi_shipping", "gsi_retail", "gsi_transportation"]
  },
  {
    id: "gsi_food",
    slug: "food",
    name: "Food",
    tagline: "Processing, cold chains, and retail shelves between farms and tables.",
    summary:
      "Food converts Agriculture outputs through processing, packaging, cold storage, and Retail distribution. Energy for refrigeration and Shipping/port reliability are first-order dependencies.",
    whatIsHappening: claim(
      "Processors and retailers balance inventory against logistics delays and energy costs. Perishable imports remain sensitive to port dwell time; packaging and labor constraints still shape shelf stability.",
      "Medium",
      "Weeks"
    ),
    why: claim(
      "Food is where Agriculture, Energy, Shipping, and Retail meet the household. Cold-chain breaks and port queues show up as Availability of goods and Food prices more visibly than farm reports alone.",
      "High",
      "Long-term"
    ),
    threats: [
      item("Cold-chain energy and equipment failure", "Refrigeration outages spoil inventory quickly.", "Medium", "Days"),
      item("Port and trucking delays for perishables", "Dwell time exceeds shelf life windows.", "High", "Days"),
      item("Packaging and ingredient shortages", "Upstream commodity or plastics constraints cascade into SKUs.", "Medium", "Weeks")
    ],
    opportunities: [
      item("Local buffer inventory with honest labeling", "Transparent stockouts beat empty-shelf surprise.", "Medium", "Weeks"),
      item("Alternate sourcing and substitution menus", "Processors can reformulate within safety rules.", "Medium", "Months"),
      item("Energy-efficient cold storage", "Lowers exposure to power and fuel spikes.", "Low", "Long-term")
    ],
    majorCountries: [
      country(C.us, "Large processing and retail food system"),
      country(C.nl, "European agri-food trade hub"),
      country(C.br, "Processed meat and sugar export relevance"),
      country(C.cn, "Massive consumption and processing base"),
      country(C.th, "Seafood and processed food exports"),
      country(C.mx, "Fresh produce and processed food trade with North America")
    ],
    supplyChain: {
      overview:
        "Farm commodities → processing plants → cold storage → wholesale → Retail / foodservice → households.",
      nodes: [
        node("Ingredients & packaging", "input", "Tied to Agriculture and chemicals."),
        node("Processing plants", "manufacturing", "Labor and energy intensive."),
        node("Cold storage", "infrastructure", "Power-dependent buffer."),
        node("Wholesale distribution", "logistics", "Truck and rail legs."),
        node("Retail shelves", "downstream", "Citizen interface.")
      ]
    },
    relatedArticles: [ART.port, ART.canal, ART.ship],
    waypointsTake: {
      whyItMatters:
        "Food security narratives often skip logistics. Port labor and canal capacity are Food stories when perishables are in the container mix.",
      analysis:
        "Sample briefs on port stoppages illustrate Days-horizon dwell risk for perishables. Household price effects remain Low confidence until retail scanners and substitution show persistent gaps — avoid treating every logistics delay as Observed inflation."
    },
    citizenImpacts: [
      citizen(CI.food, "Retail prices and promotions adjust when wholesale costs or gaps persist.", "Low", "Weeks"),
      citizen(CI.goods, "Specific SKUs may go sparse before broad baskets move.", "Medium", "Days"),
      citizen(CI.employment, "Food processing and grocery labor feel volume swings.", "Medium", "Weeks")
    ],
    topDependencies: [
      dep("gsi_agriculture", "Agriculture", "agriculture", "Primary commodity inputs", "High"),
      dep("gsi_retail", "Retail", "retail", "Primary consumer distribution channel", "High"),
      dep("gsi_energy", "Energy", "energy", "Processing heat and cold-chain power", "High"),
      dep("gsi_shipping", "Shipping", "shipping", "Imported ingredients and export foods", "Medium")
    ],
    relatedIndustries: ["gsi_agriculture", "gsi_retail", "gsi_shipping", "gsi_energy", "gsi_transportation"]
  },
  {
    id: "gsi_transportation",
    slug: "transportation",
    name: "Transportation",
    tagline: "Road, rail, and air fleets that move people and freight inland.",
    summary:
      "Transportation connects ports, farms, factories, and cities. Fuel availability, vehicle components (including semiconductors), and labor determine how Shipping and Retail shocks propagate inland.",
    whatIsHappening: claim(
      "Freight networks absorb port queues and corridor diversions through trucking and rail. Fuel price sensitivity and vehicle component lead times continue to shape capacity. Passenger travel costs track fuel and schedule reliability.",
      "Medium",
      "Weeks"
    ),
    why: claim(
      "Without inland Transportation, Shipping arrivals and Agriculture harvests do not become Retail inventory. Fuel and labor are the binding constraints that turn distant events into local delays.",
      "High",
      "Long-term"
    ),
    threats: [
      item("Fuel supply interruptions", "Diesel shortages idle fleets and raise haul rates.", "High", "Days"),
      item("Driver and crew shortages", "Labor limits throughput even when roads are open.", "Medium", "Weeks"),
      item("Vehicle parts lead times", "Semiconductor and steel constraints delay fleet renewal.", "Medium", "Months")
    ],
    opportunities: [
      item("Modal flexibility (truck ↔ rail)", "Shifting modes can relieve corridor congestion.", "Medium", "Weeks"),
      item("Idle-reduction and routing efficiency", "Lowers fuel exposure without inventing capacity.", "Medium", "Months"),
      item("Transparent ETA communication", "Honest delay labeling reduces cascading appointments failures.", "High", "Days")
    ],
    majorCountries: [
      country(C.us, "Large trucking, rail, and air networks"),
      country(C.cn, "High-speed rail and freight density"),
      country(C.de, "European logistics hub and auto-linked freight"),
      country(C.in, "Rapid freight growth and dense road networks"),
      country(C.mx, "North American manufacturing corridor trucking"),
      country(C.pl, "European road freight corridor role")
    ],
    supplyChain: {
      overview:
        "Fuel & vehicles → carriers → hubs/terminals → last-mile → shippers (Retail, Food, Manufacturing).",
      nodes: [
        node("Fuel & charging", "input", "Energy industry dependency."),
        node("Vehicles & parts", "equipment", "Automotive + Semiconductors."),
        node("Carriers & crews", "labor", "Capacity binding constraint."),
        node("Hubs & yards", "infrastructure", "Congestion amplifiers."),
        node("Shippers", "downstream", "Retail, Food, Construction.")
      ]
    },
    relatedArticles: [ART.cyber, ART.ship, ART.port],
    waypointsTake: {
      whyItMatters:
        "Transportation is the inland amplifier. Pipeline cyber events and maritime diversions become local when trucks cannot fill or appointments slip.",
      analysis:
        "Treat fuel-related citizen impacts as potentially Medium confidence within Days when product movement pauses. Broader travel-cost predictions should stay Low until carrier fare and schedule data confirm."
    },
    citizenImpacts: [
      citizen(CI.transport, "Local transit and freight reliability affect access to work and goods.", "Medium", "Days"),
      citizen(CI.fuel, "Retail fuel follows wholesale when supply is tight.", "Medium", "Days"),
      citizen(CI.travel, "Air and bus fares can move with fuel and schedule disruption.", "Low", "Weeks"),
      citizen(CI.employment, "Carrier and warehouse employment tracks freight volumes.", "Medium", "Weeks")
    ],
    topDependencies: [
      dep("gsi_energy", "Energy", "energy", "Diesel, jet fuel, and electricity for fleets", "High"),
      dep("gsi_shipping", "Shipping", "shipping", "Port handoff to inland moves", "High"),
      dep("gsi_automotive", "Automotive", "automotive", "Fleet vehicles and parts", "Medium"),
      dep("gsi_retail", "Retail", "retail", "Last-mile and DC replenishment", "High")
    ],
    relatedIndustries: ["gsi_energy", "gsi_shipping", "gsi_automotive", "gsi_retail", "gsi_food"]
  },
  {
    id: "gsi_shipping",
    slug: "shipping",
    name: "Shipping",
    tagline: "Ocean carriers, canals, straits, and port complexes.",
    summary:
      "Shipping moves bulk and containerized trade through canals, straits, and ports. Drought-limited canal slots, security diversions, and labor stoppages are primary stress modes in the sample briefs.",
    whatIsHappening: claim(
      "Carriers continuously rebalance capacity across canals, contested corridors, and alternate Capes. Port labor actions and water-limited canal transit slots create queue dynamics that ripple into Retail, Automotive parts, and Food imports.",
      "Medium",
      "Weeks"
    ),
    why: claim(
      "Most intercontinental trade still travels by sea. A chokepoint delay is a multi-industry delay — Logistics in article tags often means this layer.",
      "High",
      "Long-term"
    ),
    threats: [
      item("Canal capacity cuts (drought or maintenance)", "Fewer daily slots lengthen waits and miss connections.", "High", "Weeks"),
      item("Security-driven corridor diversions", "Longer routes raise voyage days and bunker use.", "High", "Days"),
      item("Port labor stoppages", "Vessel queues and dwell time spike at terminals.", "High", "Days")
    ],
    opportunities: [
      item("Alternate lane planning with honest ETAs", "Reroutes work when shippers accept longer horizons.", "Medium", "Weeks"),
      item("Port productivity and night gates", "Throughput gains reduce queue amplification.", "Medium", "Months"),
      item("Inventory buffers on critical SKUs", "Retail and Auto parts can absorb some delay.", "Medium", "Months")
    ],
    majorCountries: [
      country(C.sg, "Major transshipment hub"),
      country(C.cn, "Largest container port complex throughput"),
      country(C.us, "Major import/export gateways"),
      country(C.pa, "Canal corridor relevance (illustrative drought pattern)"),
      country(C.ae, "Gulf hub and energy shipping"),
      country(C.nl, "European gateway ports")
    ],
    supplyChain: {
      overview:
        "Shipper booking → ocean leg (canal/strait) → destination port → inland Transportation → consignee industries.",
      nodes: [
        node("Booking & empty containers", "planning", "Equipment imbalances matter."),
        node("Ocean voyage", "infrastructure", "Canals and security corridors."),
        node("Port terminals", "infrastructure", "Labor and berth capacity."),
        node("Inland handoff", "logistics", "Trucking/rail to DCs."),
        node("Consignees", "downstream", "Retail, Auto, Food, Construction.")
      ]
    },
    relatedArticles: [ART.canal, ART.ship, ART.port],
    waypointsTake: {
      whyItMatters:
        "Shipping is the spine of Global Signals’ sample relationship stories — canal slots, corridor diversions, and port labor are three distinct hop types into citizen shelves.",
      analysis:
        "Do not collapse every maritime delay into ‘inflation.’ Slot cuts and diversions are High confidence for voyage time; Low confidence for household prices until Retail and Food inventory confirm pass-through. Align article industry tag Logistics with this Shipping node when building graph edges."
    },
    citizenImpacts: [
      citizen(CI.goods, "Imported goods restock more slowly when queues persist.", "Medium", "Weeks"),
      citizen(CI.inflation, "Freight cost pass-through is possible but not automatic.", "Low", "Weeks"),
      citizen(CI.fuel, "Longer voyages can pressure bunker markets — weak household link.", "Low", "Weeks"),
      citizen(CI.employment, "Port and warehouse labor hours swing with vessel arrivals.", "Medium", "Days")
    ],
    topDependencies: [
      dep("gsi_energy", "Energy", "energy", "Bunker fuel and tanker trades", "High"),
      dep("gsi_retail", "Retail", "retail", "Containerized consumer goods", "High"),
      dep("gsi_automotive", "Automotive", "automotive", "Parts and CKD movements", "Medium"),
      dep("gsi_food", "Food", "food", "Perishable and packaged imports/exports", "Medium")
    ],
    relatedIndustries: ["gsi_energy", "gsi_retail", "gsi_transportation", "gsi_agriculture", "gsi_automotive"],
    taxonomyAliases: ["Logistics"]
  },
  {
    id: "gsi_healthcare",
    slug: "healthcare",
    name: "Healthcare",
    tagline: "Care delivery, devices, medicines, and cold-chain logistics.",
    summary:
      "Healthcare depends on medicines, devices, semiconductors in equipment, energy for facilities, and Shipping for APIs and consumables. Access and medicine availability are the citizen-facing outcomes.",
    whatIsHappening: claim(
      "Hospital and clinic operations remain sensitive to device lead times, pharmaceutical API geography, and staffing. Cold-chain integrity for some medicines tracks Energy and Shipping reliability. Digital health systems add Technology dependencies.",
      "Medium",
      "Months"
    ),
    why: claim(
      "Healthcare failures are citizen-visible quickly. Upstream Semiconductor and Shipping delays become Imaging backlog or Medicine availability issues when buffers are thin.",
      "High",
      "Long-term"
    ),
    threats: [
      item("API and sterile injectable shortages", "Concentrated manufacturing can halt specific therapies.", "Medium", "Weeks"),
      item("Device and semiconductor lead times", "Imaging and monitoring equipment delays extend wait lists.", "Medium", "Months"),
      item("Facility energy reliability", "Outages disrupt care and cold storage for medicines.", "Medium", "Days")
    ],
    opportunities: [
      item("Diversified API and fill-finish capacity", "Reduces single-country therapy risk.", "Medium", "Long-term"),
      item("Predictive inventory for critical SKUs", "Honest shortage boards beat surprise stockouts.", "High", "Weeks"),
      item("Interoperable digital records", "Care continuity when patients move — Technology hop.", "Medium", "Long-term")
    ],
    majorCountries: [
      country(C.us, "Large care delivery system and device market"),
      country(C.de, "Medical device and pharma manufacturing"),
      country(C.ch, "Pharma research and production"),
      country(C.in, "Generic API and formulation capacity"),
      country(C.cn, "API manufacturing and device supply"),
      country(C.ie, "Pharma manufacturing hub role")
    ],
    supplyChain: {
      overview:
        "APIs & device components → manufacturing → distribution cold chain → hospitals/pharmacies → patients.",
      nodes: [
        node("APIs & components", "input", "Geographically concentrated for some therapies."),
        node("Fill-finish / device assembly", "manufacturing", "Quality-gated capacity."),
        node("Cold-chain logistics", "logistics", "Energy + Shipping sensitive."),
        node("Providers & pharmacies", "delivery", "Staffing constrained."),
        node("Patients", "citizen", "Access and medicine availability.")
      ]
    },
    relatedArticles: [ART.port, ART.cyber],
    waypointsTake: {
      whyItMatters:
        "Healthcare is where industrial dependencies become personal. A semiconductor delay in an imaging tube is not abstract when wait lists grow.",
      analysis:
        "Keep confidence Low on broad ‘medicine crisis’ claims without SKU-level shortage evidence. Energy reliability for clinics is a clearer Days-horizon hop when grids or fuel are stressed. Never present Waypoint’s Take as clinical or medical advice."
    },
    citizenImpacts: [
      citizen(CI.health, "Appointment and procedure wait times can lengthen when equipment or staff are constrained.", "Medium", "Months"),
      citizen(CI.medicine, "Specific drug shortages affect patients before averages move.", "Medium", "Weeks"),
      citizen(CI.employment, "Care workforce stress affects retention and access.", "Medium", "Months"),
      citizen(CI.energy, "Clinic and home medical device power reliability matters in outages.", "Medium", "Days")
    ],
    topDependencies: [
      dep("gsi_semiconductors", "Semiconductors", "semiconductors", "Imaging, monitors, and connected devices", "Medium"),
      dep("gsi_shipping", "Shipping", "shipping", "APIs, devices, and consumables trade", "Medium"),
      dep("gsi_energy", "Energy", "energy", "Facility power and cold chain", "High"),
      dep("gsi_technology", "Technology", "technology", "EHR, telehealth, and cybersecurity", "Medium")
    ],
    relatedIndustries: ["gsi_semiconductors", "gsi_technology", "gsi_energy", "gsi_shipping", "gsi_retail"]
  },
  {
    id: "gsi_automotive",
    slug: "automotive",
    name: "Automotive",
    tagline: "Vehicles, parts, and assembly plants spanning continents.",
    summary:
      "Automotive combines steel, semiconductors, chemicals, and logistics into assembled vehicles. Tariff, shipping, and chip constraints show up as production pauses and inventory-thin dealer lots.",
    whatIsHappening: claim(
      "Assemblers still manage semiconductor allocations, steel cost shifts, and ocean/rail parts timing. Electrification adds battery mineral and power-electronics dependencies. Just-in-time plants remain sensitive to Shipping and port delays.",
      "Medium",
      "Months"
    ),
    why: claim(
      "Vehicles are a consumer and commercial capital good. Parts delays idle plants; plant idling becomes Employment and Transportation capacity stories.",
      "High",
      "Long-term"
    ),
    threats: [
      item("Semiconductor allocation shortfalls", "Missing MCUs halt lines despite other parts arriving.", "High", "Weeks"),
      item("Steel and materials cost shocks", "Tariffs and input costs pressure BOM budgets.", "Medium", "Months"),
      item("Ocean parts delays", "CKD and component containers stuck in queues.", "Medium", "Weeks")
    ],
    opportunities: [
      item("Dual-sourcing critical electronics", "Reduces single-foundry exposure.", "Medium", "Long-term"),
      item("Regionalized parts footprints", "Nearshoring can cut ocean hop risk for some components.", "Medium", "Long-term"),
      item("Transparent build-slot communication", "Honest wait times beat speculative delivery promises.", "High", "Weeks")
    ],
    majorCountries: [
      country(C.de, "Premium OEMs and supplier base"),
      country(C.jp, "Global OEM and parts networks"),
      country(C.us, "Assembly and large demand market"),
      country(C.cn, "Largest vehicle market and EV supply chain"),
      country(C.mx, "North American assembly and parts"),
      country(C.kr, "OEM and battery-related supply")
    ],
    supplyChain: {
      overview:
        "Raw materials & chips → tier suppliers → assembly plants → distribution → dealers / fleets.",
      nodes: [
        node("Steel & chemicals", "input", "Construction-adjacent materials markets."),
        node("Semiconductors & batteries", "input", "Technology and Energy mineral links."),
        node("Tier 1–3 suppliers", "manufacturing", "Multi-country webs."),
        node("Assembly plants", "manufacturing", "JIT sensitive."),
        node("Dealers & fleets", "downstream", "Citizen and Transportation interface.")
      ]
    },
    relatedArticles: [ART.steel, ART.ship, ART.port],
    waypointsTake: {
      whyItMatters:
        "Automotive is a teaching example of multi-hop dependency: steel tariffs, chip allocations, and shipping diversions can all idle the same plant for different reasons.",
      analysis:
        "Separate Observed plant notices from predicted dealer price effects. Sample steel-tariff brief is Medium confidence for manufacturing cost pressure and Low for household housing/auto sticker outcomes until contracts roll."
    },
    citizenImpacts: [
      citizen(CI.goods, "New vehicle availability and options packages can thin.", "Medium", "Months"),
      citizen(CI.employment, "Plant and supplier employment tracks build rates.", "High", "Weeks"),
      citizen(CI.transport, "Fleet renewal delays affect commercial transport capacity.", "Low", "Months"),
      citizen(CI.inflation, "Transaction prices may firm when inventory is scarce — not guaranteed.", "Low", "Months")
    ],
    topDependencies: [
      dep("gsi_semiconductors", "Semiconductors", "semiconductors", "Vehicle electronics and ADAS", "High"),
      dep("gsi_shipping", "Shipping", "shipping", "Parts and finished vehicle movements", "High"),
      dep("gsi_construction", "Construction", "construction", "Shared steel and materials markets", "Medium"),
      dep("gsi_energy", "Energy", "energy", "Fuel use and EV charging demand", "Medium")
    ],
    relatedIndustries: ["gsi_semiconductors", "gsi_shipping", "gsi_steel-adjacent", "gsi_retail", "gsi_energy"],
    relatedIndustriesResolved: ["gsi_semiconductors", "gsi_shipping", "gsi_construction", "gsi_retail", "gsi_energy", "gsi_technology"]
  },
  {
    id: "gsi_construction",
    slug: "construction",
    name: "Construction",
    tagline: "Materials, labor, and projects that shape housing and infrastructure.",
    summary:
      "Construction converts steel, cement, lumber, equipment, and labor into buildings and infrastructure. Material tariffs and energy costs feed project budgets; Housing is the primary citizen impact channel.",
    whatIsHappening: claim(
      "Project pipelines remain sensitive to steel, cement, and labor availability. Public infrastructure and private housing compete for crews and materials. Energy costs affect materials manufacturing and on-site operations.",
      "Medium",
      "Months"
    ),
    why: claim(
      "Construction is how trade policy and materials shocks become Housing costs — with long lags and local variation. It also builds Energy, Shipping, and Healthcare facilities.",
      "High",
      "Long-term"
    ),
    threats: [
      item("Steel and materials cost spikes", "Tariffs or shortages pressure bids and change orders.", "Medium", "Months"),
      item("Labor scarcity", "Skilled trades limit how fast projects absorb funding.", "High", "Months"),
      item("Equipment and semiconductor-enabled machinery delays", "Crane and controls lead times slip schedules.", "Low", "Months")
    ],
    opportunities: [
      item("Modular and offsite methods", "Can compress schedules when logistics allow.", "Medium", "Long-term"),
      item("Materials substitution with clear codes", "Alternate specs reduce single-commodity exposure.", "Medium", "Months"),
      item("Transparent cost escalation clauses", "Honest contracts beat surprise abandonments.", "High", "Months")
    ],
    majorCountries: [
      country(C.us, "Large residential and infrastructure market"),
      country(C.cn, "Massive materials demand and production"),
      country(C.in, "Rapid urbanization and infrastructure build"),
      country(C.de, "Engineering and materials technology"),
      country(C.tr, "Cement and contractor export role"),
      country(C.au, "Resources and domestic construction demand")
    ],
    supplyChain: {
      overview:
        "Materials producers → distributors → contractors → job sites → owners (housing, industry, public).",
      nodes: [
        node("Steel, cement, lumber", "input", "Trade and Energy intensive."),
        node("Equipment dealers", "equipment", "Capex and lead times."),
        node("Contractors & trades", "labor", "Local binding constraint."),
        node("Job sites", "production", "Weather and permitting."),
        node("Owners & households", "downstream", "Housing and facilities.")
      ]
    },
    relatedArticles: [ART.steel],
    waypointsTake: {
      whyItMatters:
        "Construction is the slow transmitter. A steel tariff may matter for Housing months later — labeling that lag honestly is the product.",
      analysis:
        "Sample steel-tariff brief correctly keeps housing pass-through at Low confidence and Months horizon. Do not upgrade that to Observed without local bid and permit evidence."
    },
    citizenImpacts: [
      citizen(CI.housing, "Build costs and timelines can affect rents and purchase prices with long lags.", "Low", "Months"),
      citizen(CI.employment, "Construction employment tracks project starts.", "High", "Months"),
      citizen(CI.inflation, "Shelter inflation components move slowly and locally.", "Low", "Long-term")
    ],
    topDependencies: [
      dep("gsi_energy", "Energy", "energy", "Materials manufacturing and site power/fuel", "High"),
      dep("gsi_automotive", "Automotive", "automotive", "Shared steel markets and equipment", "Medium"),
      dep("gsi_shipping", "Shipping", "shipping", "Imported materials and machinery", "Medium"),
      dep("gsi_technology", "Technology", "technology", "Building systems and project software", "Low")
    ],
    relatedIndustries: ["gsi_energy", "gsi_automotive", "gsi_shipping", "gsi_retail", "gsi_healthcare"]
  },
  {
    id: "gsi_retail",
    slug: "retail",
    name: "Retail",
    tagline: "The shelf where Shipping, Food, and household demand meet.",
    summary:
      "Retail converts wholesale inventory into household Availability of goods. It inherits Shipping delays, Food cold-chain issues, and Energy costs for stores and last-mile Transportation.",
    whatIsHappening: claim(
      "Retailers manage inventory buffers against ocean and port variability while balancing promotions and labor. E-commerce last-mile remains fuel and wage sensitive. Category shortages often appear SKU-specific before basket-wide.",
      "Medium",
      "Weeks"
    ),
    why: claim(
      "Retail is the citizen dashboard for industrial stress. Empty shelves are more legible than canal notices — Global Signals exists to reconnect them without panic.",
      "High",
      "Long-term"
    ),
    threats: [
      item("Inbound container delays", "DC replenishment slips; promotions fail.", "High", "Weeks"),
      item("Last-mile fuel and labor cost pressure", "Delivery economics tighten.", "Medium", "Weeks"),
      item("Category-specific supplier shocks", "Food or electronics gaps without broad crisis.", "Medium", "Days")
    ],
    opportunities: [
      item("Honest stock and substitution UX", "Builds trust when SKUs are sparse.", "High", "Days"),
      item("Flexible DC networks", "Reroute inventory around congested gateways.", "Medium", "Months"),
      item("Supplier diversification for critical categories", "Reduces single-port exposure.", "Medium", "Long-term")
    ],
    majorCountries: [
      country(C.us, "Large retail and e-commerce demand"),
      country(C.cn, "Manufacturing-linked retail exports and domestic market"),
      country(C.uk, "Import-reliant retail system"),
      country(C.de, "European retail and discounter networks"),
      country(C.jp, "Dense retail and convenience logistics"),
      country(C.in, "Growing modern retail and digital commerce")
    ],
    supplyChain: {
      overview:
        "Suppliers → ocean/air Shipping → DCs → stores / last-mile → households.",
      nodes: [
        node("Suppliers & importers", "upstream", "Multi-industry mix."),
        node("Ports & DCs", "logistics", "Shipping + Transportation."),
        node("Stores & dark stores", "delivery", "Labor and energy."),
        node("Last-mile", "logistics", "Fuel sensitive."),
        node("Households", "citizen", "Availability and prices.")
      ]
    },
    relatedArticles: [ART.canal, ART.ship, ART.port, ART.cyber],
    waypointsTake: {
      whyItMatters:
        "Retail is where relationship intelligence becomes everyday literacy. The goal is calm connection — not a doom shelf feed.",
      analysis:
        "When sample canal or port briefs tag Retail, treat Weeks-horizon goods availability as plausible Medium/Low — never Observed — until shelf and DC data exist. Prefer SKU-level honesty over national averages."
    },
    citizenImpacts: [
      citizen(CI.goods, "Primary interface for noticing delayed restocks.", "Medium", "Weeks"),
      citizen(CI.inflation, "Posted prices and promotions reflect cost pressure unevenly.", "Low", "Weeks"),
      citizen(CI.employment, "Store and warehouse hours track volume.", "Medium", "Weeks"),
      citizen(CI.food, "Grocery categories inherit Food and Agriculture shocks.", "Medium", "Weeks")
    ],
    topDependencies: [
      dep("gsi_shipping", "Shipping", "shipping", "Inbound containers for many categories", "High"),
      dep("gsi_food", "Food", "food", "Grocery assortment", "High"),
      dep("gsi_transportation", "Transportation", "transportation", "DC and last-mile moves", "High"),
      dep("gsi_energy", "Energy", "energy", "Store operations and delivery fuel", "Medium")
    ],
    relatedIndustries: ["gsi_shipping", "gsi_food", "gsi_transportation", "gsi_technology", "gsi_automotive"]
  },
  {
    id: "gsi_technology",
    slug: "technology",
    name: "Technology",
    tagline: "Cloud, software, devices, and digital infrastructure.",
    summary:
      "Technology products and cloud services depend on Semiconductors, Energy for data centers, and Shipping for hardware. Digital access and employment in tech-enabled sectors are citizen outcomes.",
    whatIsHappening: claim(
      "Cloud and AI workloads raise power and advanced silicon demand. Device OEMs still manage memory/logic availability and logistics. Cybersecurity incidents in adjacent critical infrastructure illustrate Technology’s dual role as enabler and risk surface.",
      "Medium",
      "Months"
    ),
    why: claim(
      "Technology multiplies other industries’ productivity and their fragility. When silicon or power constrains cloud growth, Digital access and business continuity feel it; when OT-connected systems fail, Energy and Shipping can pause.",
      "High",
      "Long-term"
    ),
    threats: [
      item("Advanced silicon and memory constraints", "Server and device refresh cycles slip.", "Medium", "Months"),
      item("Data-center power availability", "Interconnection queues limit new capacity.", "High", "Months"),
      item("Cyber risk to dependent infrastructure", "IT compromise can cascade into physical operations.", "High", "Days")
    ],
    opportunities: [
      item("Efficiency in compute and cooling", "Same silicon goes further; lowers Energy intensity.", "Medium", "Months"),
      item("Open standards and portable workloads", "Reduces lock-in during regional outages.", "Medium", "Long-term"),
      item("Honest capability labeling", "Separate demo features from production SLAs.", "High", "Immediate")
    ],
    majorCountries: [
      country(C.us, "Cloud hyperscalers, software, and design leadership"),
      country(C.cn, "Large platform market and hardware manufacturing"),
      country(C.tw, "Foundry link via Semiconductors"),
      country(C.kr, "Memory and consumer electronics"),
      country(C.in, "Services and growing digital market"),
      country(C.ie, "European data-center and tech hub role"),
      country(C.sg, "Regional digital and data hub")
    ],
    supplyChain: {
      overview:
        "Chip & component supply → OEM/ODM assembly → cloud/data centers & devices → software/services → users and dependent industries.",
      nodes: [
        node("Semiconductors", "input", "Core physical constraint."),
        node("OEM/ODM assembly", "manufacturing", "Shipping sensitive."),
        node("Data centers", "infrastructure", "Energy intensive."),
        node("Networks", "infrastructure", "Shared with telecom."),
        node("Applications & users", "downstream", "Digital access.")
      ]
    },
    relatedArticles: [ART.cyber, ART.steel],
    waypointsTake: {
      whyItMatters:
        "Technology is both a consumer industry and an invisible dependency inside Energy, Healthcare, and Retail. Relationship maps should show both faces.",
      analysis:
        "Pipeline cyber sample shows Technology-adjacent risk becoming fuel Availability within Days. Keep predictive claims about digital-service outages Medium/Low unless operator notices confirm scope. Never imply investment advice from cloud demand narratives."
    },
    citizenImpacts: [
      citizen(CI.digital, "Broadband and cloud service quality affect work, learning, and care access.", "Medium", "Weeks"),
      citizen(CI.employment, "Tech and tech-enabled jobs track investment cycles.", "Medium", "Months"),
      citizen(CI.goods, "Device availability follows silicon and Shipping.", "Low", "Months"),
      citizen(CI.energy, "Data-center growth competes for regional power — local effects vary.", "Low", "Long-term")
    ],
    topDependencies: [
      dep("gsi_semiconductors", "Semiconductors", "semiconductors", "Logic, memory, networking silicon", "High"),
      dep("gsi_energy", "Energy", "energy", "Data-center and network power", "High"),
      dep("gsi_shipping", "Shipping", "shipping", "Hardware and component logistics", "Medium"),
      dep("gsi_healthcare", "Healthcare", "healthcare", "Digital health and device software", "Medium")
    ],
    relatedIndustries: ["gsi_semiconductors", "gsi_energy", "gsi_healthcare", "gsi_retail", "gsi_automotive"]
  }
];

// Normalize relatedIndustries: drop unknown ids, prefer resolved lists
for (const ind of industries) {
  const known = new Set(industries.map((i) => i.id));
  const raw = ind.relatedIndustriesResolved || ind.relatedIndustries || [];
  ind.relatedIndustries = [...new Set(raw.filter((id) => known.has(id) && id !== ind.id))];
  delete ind.relatedIndustriesResolved;
}

const payload = {
  version: "1.0.0",
  updatedAt: "2026-08-07T20:00:00Z",
  mode: "curated-baseline",
  modeLabel: "Curated baseline / sample-demo intelligence",
  honesty: {
    banner:
      "Curated baseline intelligence — not a live breaking-news feed. Industry pages synthesize durable structure and labeled sample relationships. They are not real-time event reports.",
    confidenceRules:
      "Observed is reserved for established facts. Predictive threats, opportunities, and citizen-impact hops must never use Observed. Missing or invalid confidence defaults to Unknown.",
    analysisRules:
      "Waypoint’s Take is analysis and interpretation — never established fact. Do not treat curated baseline text as verified live intelligence."
  },
  crossLinks: {
    notes:
      "Industry intelligence is Deck-internal relationship data. It is not a public product surface."
  },
  taxonomies: {
    industryIds: industries.map((i) => i.id),
    articleIndustryLabelMap: {
      Semiconductors: "gsi_semiconductors",
      Energy: "gsi_energy",
      Agriculture: "gsi_agriculture",
      Food: "gsi_food",
      Transportation: "gsi_transportation",
      Shipping: "gsi_shipping",
      Logistics: "gsi_shipping",
      Healthcare: "gsi_healthcare",
      Automotive: "gsi_automotive",
      Construction: "gsi_construction",
      Retail: "gsi_retail",
      Technology: "gsi_technology",
      Manufacturing: null,
      Travel: null,
      Insurance: null
    },
    confidenceAllowed: ["Observed", "High", "Medium", "Low", "Unknown"],
    horizonAllowed: ["Immediate", "Days", "Weeks", "Months", "Long-term", "Unknown"]
  },
  industries
};

fs.writeFileSync(out, JSON.stringify(payload, null, 2) + "\n");
console.log("Wrote", out, "industries:", industries.length);
