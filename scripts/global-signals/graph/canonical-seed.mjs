/**
 * Evidence-backed canonical knowledge graph seed.
 * Edges are coded only from documented public structural facts / official roles.
 * No AI-invented relationships.
 */

export const ENTITY_TYPES = [
  "Country",
  "Region",
  "Port",
  "Canal",
  "Strait",
  "Commodity",
  "Industry",
  "Company",
  "Infrastructure",
  "Energy Asset",
  "Trade Route",
  "Policy",
  "Tariff",
  "Sanction",
  "Conflict",
  "Event",
  "Citizen Impact"
];

/** @type {{id:string,type:string,label:string,summary:string}[]} */
export const SEED_ENTITIES = [
  { id: "gse_country_us", type: "Country", label: "United States", summary: "Major importer/exporter and sanctions/trade-policy issuer." },
  { id: "gse_country_cn", type: "Country", label: "China", summary: "Major manufacturing and commodity demand center." },
  { id: "gse_country_tw", type: "Country", label: "Taiwan", summary: "Concentrated advanced semiconductor fabrication capacity." },
  { id: "gse_country_sa", type: "Country", label: "Saudi Arabia", summary: "Major crude oil exporter." },
  { id: "gse_region_mideast", type: "Region", label: "Middle East", summary: "Energy export region with critical maritime chokepoints." },
  { id: "gse_strait_hormuz", type: "Strait", label: "Strait of Hormuz", summary: "Maritime chokepoint for a large share of seaborne crude oil." },
  { id: "gse_canal_suez", type: "Canal", label: "Suez Canal", summary: "Canal linking Red Sea and Mediterranean container/energy routes." },
  { id: "gse_canal_panama", type: "Canal", label: "Panama Canal", summary: "Canal linking Pacific and Atlantic container routes." },
  { id: "gse_port_la_lb", type: "Port", label: "Los Angeles / Long Beach ports", summary: "Major US West Coast container gateway." },
  { id: "gse_commodity_crude", type: "Commodity", label: "Crude oil", summary: "Primary energy commodity transported via maritime chokepoints." },
  { id: "gse_commodity_lng", type: "Commodity", label: "LNG", summary: "Seaborne natural gas commodity." },
  { id: "gse_commodity_chips", type: "Commodity", label: "Semiconductors", summary: "Intermediate good for electronics, autos, and industrial systems." },
  { id: "gse_commodity_steel", type: "Commodity", label: "Steel", summary: "Industrial input frequently targeted by tariffs." },
  { id: "gse_commodity_containers", type: "Commodity", label: "Container freight", summary: "Unit of seaborne manufactured goods transport." },
  { id: "gse_industry_energy", type: "Industry", label: "Energy", summary: "Upstream/midstream energy and fuels." },
  { id: "gse_industry_shipping", type: "Industry", label: "Shipping", summary: "Maritime logistics and vessel operators." },
  { id: "gse_industry_semiconductors", type: "Industry", label: "Semiconductors", summary: "Chip design, fabrication, packaging." },
  { id: "gse_industry_automotive", type: "Industry", label: "Automotive", summary: "Vehicle manufacturing dependent on chips, steel, logistics." },
  { id: "gse_industry_retail", type: "Industry", label: "Retail", summary: "Consumer goods distribution dependent on container freight." },
  { id: "gse_industry_agriculture", type: "Industry", label: "Agriculture", summary: "Food production and trade." },
  { id: "gse_industry_technology", type: "Industry", label: "Technology", summary: "Devices and cloud hardware dependent on semiconductors." },
  { id: "gse_route_asia_us", type: "Trade Route", label: "Asia–US West Coast route", summary: "Primary container corridor into US West Coast ports." },
  { id: "gse_infra_grid_us", type: "Infrastructure", label: "US power grid", summary: "Critical electricity infrastructure." },
  { id: "gse_policy_ofac", type: "Policy", label: "OFAC sanctions programs", summary: "US Treasury sanctions administration." },
  { id: "gse_policy_export_controls", type: "Policy", label: "US export controls", summary: "Commerce/BIS export and entity-list controls." },
  { id: "gse_citizen_fuel", type: "Citizen Impact", label: "Fuel prices", summary: "Household transportation and heating fuel costs." },
  { id: "gse_citizen_food", type: "Citizen Impact", label: "Food prices", summary: "Grocery and staple food costs." },
  { id: "gse_citizen_electronics", type: "Citizen Impact", label: "Electronics", summary: "Device availability and pricing." },
  { id: "gse_citizen_travel", type: "Citizen Impact", label: "Travel", summary: "Transport cost and schedule effects." },
  { id: "gse_citizen_goods", type: "Citizen Impact", label: "Consumer goods", summary: "Shelf availability for imported goods." },
  { id: "gse_citizen_jobs", type: "Citizen Impact", label: "Jobs", summary: "Employment effects in exposed industries." },
  { id: "gse_citizen_transport", type: "Citizen Impact", label: "Transportation", summary: "Freight and passenger transport conditions." },
  { id: "gse_citizen_utilities", type: "Citizen Impact", label: "Utilities", summary: "Electricity and related utility costs/reliability." },
  { id: "gse_citizen_medicines", type: "Citizen Impact", label: "Medicines", summary: "Pharmaceutical supply and access." },
  { id: "gse_citizen_housing", type: "Citizen Impact", label: "Housing", summary: "Housing cost pressure via materials/energy/jobs." },
  { id: "gse_citizen_insurance", type: "Citizen Impact", label: "Insurance", summary: "Premiums and coverage after disasters/conflict risk." }
];

function edge(id, from, to, relationshipType, direction, confidence, derivationMethod, evidence, lastVerifiedAt) {
  return {
    id,
    from,
    to,
    relationshipType,
    direction,
    confidence,
    derivationMethod,
    evidence,
    lastVerifiedAt,
    updatedAt: lastVerifiedAt
  };
}

const VERIFIED = "2024-01-01T00:00:00.000Z";

/**
 * Structural edges with explicit evidence. Confidence is High/Medium for
 * well-documented public facts; never invented.
 */
export function buildSeedEdges(now = VERIFIED) {
  const e = (id, from, to, type, dir, conf, method, label, url, notes) =>
    edge(id, from, to, type, dir, conf, method, { kind: "documented_public_fact", label, url, notes }, now);

  return [
    e(
      "gsr_tw_produces_chips",
      "gse_country_tw",
      "gse_commodity_chips",
      "produces",
      "directed",
      "High",
      "documented_trade_structure",
      "Industry concentration of advanced semiconductor fabrication in Taiwan (public industry fact)",
      "https://www.bis.doc.gov/",
      "Structural production concentration used for literacy; not a forecast."
    ),
    e(
      "gsr_chips_industry",
      "gse_commodity_chips",
      "gse_industry_semiconductors",
      "defines",
      "directed",
      "High",
      "coded_rule",
      "Commodity-to-industry identity mapping",
      "https://www.census.gov/naics/",
      "Coded taxonomy link."
    ),
    e(
      "gsr_chips_to_tech",
      "gse_commodity_chips",
      "gse_industry_technology",
      "inputs",
      "directed",
      "High",
      "documented_trade_structure",
      "Semiconductors are intermediate inputs to electronics/tech hardware",
      "https://www.bis.doc.gov/",
      "Documented intermediate-good dependency."
    ),
    e(
      "gsr_chips_to_auto",
      "gse_commodity_chips",
      "gse_industry_automotive",
      "inputs",
      "directed",
      "High",
      "documented_trade_structure",
      "Automotive electronics require semiconductors",
      "https://www.bis.doc.gov/",
      "Documented intermediate-good dependency."
    ),
    e(
      "gsr_hormuz_transports_crude",
      "gse_strait_hormuz",
      "gse_commodity_crude",
      "transports",
      "directed",
      "High",
      "known_infrastructure_dependency",
      "Strait of Hormuz is a major seaborne crude oil transit chokepoint (EIA)",
      "https://www.eia.gov/todayinenergy/detail.php?id=61025",
      "EIA Today in Energy chokepoint reporting."
    ),
    e(
      "gsr_crude_to_energy",
      "gse_commodity_crude",
      "gse_industry_energy",
      "feeds",
      "directed",
      "High",
      "coded_rule",
      "Crude oil feeds energy industry",
      "https://www.eia.gov/",
      "Commodity-industry mapping."
    ),
    e(
      "gsr_crude_affects_fuel",
      "gse_commodity_crude",
      "gse_citizen_fuel",
      "affects",
      "directed",
      "Medium",
      "coded_rule",
      "Crude price/supply can affect retail fuel costs (not automatic)",
      "https://www.eia.gov/petroleum/",
      "Rule-coded; confidence Medium — retail pass-through is not guaranteed."
    ),
    e(
      "gsr_crude_affects_transport_cost",
      "gse_commodity_crude",
      "gse_citizen_transport",
      "affects",
      "directed",
      "Medium",
      "coded_rule",
      "Fuel inputs affect transportation costs",
      "https://www.eia.gov/petroleum/",
      "Rule-coded dependency."
    ),
    e(
      "gsr_suez_route",
      "gse_canal_suez",
      "gse_commodity_containers",
      "transports",
      "directed",
      "High",
      "known_infrastructure_dependency",
      "Suez Canal is a major container shipping artery",
      "https://www.eia.gov/todayinenergy/detail.php?id=61025",
      "Public chokepoint/trade-route fact."
    ),
    e(
      "gsr_panama_route",
      "gse_canal_panama",
      "gse_commodity_containers",
      "transports",
      "directed",
      "High",
      "known_infrastructure_dependency",
      "Panama Canal is a major inter-ocean container artery",
      "https://pancanal.com/",
      "Canal authority operational role (public)."
    ),
    e(
      "gsr_containers_shipping",
      "gse_commodity_containers",
      "gse_industry_shipping",
      "defines",
      "directed",
      "High",
      "coded_rule",
      "Container freight is the shipping industry unit of carriage",
      "https://www.census.gov/foreign-trade/",
      "Coded mapping."
    ),
    e(
      "gsr_containers_retail",
      "gse_commodity_containers",
      "gse_industry_retail",
      "inputs",
      "directed",
      "Medium",
      "coded_rule",
      "Imported consumer goods move primarily in containers",
      "https://www.census.gov/foreign-trade/",
      "Rule-coded logistics dependency."
    ),
    e(
      "gsr_retail_to_goods",
      "gse_industry_retail",
      "gse_citizen_goods",
      "affects",
      "directed",
      "Medium",
      "coded_rule",
      "Retail logistics stress can affect consumer goods availability",
      "https://www.census.gov/retail/",
      "Rule-coded; not automatic scarcity."
    ),
    e(
      "gsr_ports_route",
      "gse_port_la_lb",
      "gse_route_asia_us",
      "terminates",
      "directed",
      "High",
      "known_infrastructure_dependency",
      "LA/LB is a primary Asia–US West Coast gateway",
      "https://www.portoflosangeles.org/",
      "Port authority public role."
    ),
    e(
      "gsr_route_containers",
      "gse_route_asia_us",
      "gse_commodity_containers",
      "carries",
      "directed",
      "High",
      "known_infrastructure_dependency",
      "Asia–US West Coast route carries containerized goods",
      "https://www.portoflosangeles.org/",
      "Infrastructure dependency."
    ),
    e(
      "gsr_ofac_sanctions",
      "gse_policy_ofac",
      "gse_country_us",
      "administered_by",
      "directed",
      "Observed",
      "authoritative_dataset",
      "OFAC administers US sanctions programs (Treasury)",
      "https://ofac.treasury.gov/",
      "Authoritative institutional fact."
    ),
    e(
      "gsr_export_controls_chips",
      "gse_policy_export_controls",
      "gse_commodity_chips",
      "constrains",
      "directed",
      "High",
      "authoritative_dataset",
      "US export controls constrain advanced semiconductor items (BIS)",
      "https://www.bis.doc.gov/",
      "Authoritative policy scope."
    ),
    e(
      "gsr_steel_tariff_exposure",
      "gse_commodity_steel",
      "gse_industry_automotive",
      "inputs",
      "directed",
      "High",
      "documented_trade_structure",
      "Steel is a major automotive manufacturing input",
      "https://www.commerce.gov/",
      "Documented industrial input."
    ),
    e(
      "gsr_energy_utilities",
      "gse_industry_energy",
      "gse_citizen_utilities",
      "affects",
      "directed",
      "Medium",
      "coded_rule",
      "Energy industry conditions can affect utility costs",
      "https://www.eia.gov/",
      "Rule-coded; pass-through varies."
    ),
    e(
      "gsr_tech_electronics",
      "gse_industry_technology",
      "gse_citizen_electronics",
      "affects",
      "directed",
      "Medium",
      "coded_rule",
      "Technology hardware supply can affect electronics availability",
      "https://www.census.gov/",
      "Rule-coded."
    ),
    e(
      "gsr_shipping_travel",
      "gse_industry_shipping",
      "gse_citizen_travel",
      "affects",
      "directed",
      "Low",
      "coded_rule",
      "Severe maritime disruption can affect travel schedules/costs indirectly",
      "https://www.eia.gov/todayinenergy/detail.php?id=61025",
      "Indirect; Low confidence."
    ),
    e(
      "gsr_sa_crude",
      "gse_country_sa",
      "gse_commodity_crude",
      "exports",
      "directed",
      "High",
      "documented_trade_structure",
      "Saudi Arabia is a major crude oil exporter (EIA)",
      "https://www.eia.gov/",
      "Documented trade structure."
    ),
    e(
      "gsr_mideast_hormuz",
      "gse_region_mideast",
      "gse_strait_hormuz",
      "contains",
      "directed",
      "Observed",
      "authoritative_dataset",
      "Strait of Hormuz is in the Middle East maritime region",
      "https://www.eia.gov/todayinenergy/detail.php?id=61025",
      "Geographic fact."
    )
  ];
}

/** Keyword → entity activation rules (explicitly coded, not ML). */
export const ACTIVATION_RULES = [
  {
    pattern: /\bofac\b|\bsanctions?\b|\bblocked person\b|\bsdn list\b/i,
    entityIds: ["gse_policy_ofac", "gse_country_us"],
    eventTypes: ["sanctions"]
  },
  // Chip/export-control activation requires semiconductor-specific language (not any EAR notice).
  {
    pattern:
      /\b(semiconductors?|chipmakers?|advanced nodes?|wafer fabs?|entity list)\b|\bexport controls?\b.*\b(semiconductor|chip|wafer|advanced computing)\b|\b(semiconductor|chip|wafer|advanced computing)\b.*\bexport controls?\b/i,
    entityIds: ["gse_policy_export_controls", "gse_commodity_chips", "gse_industry_semiconductors", "gse_country_tw"],
    eventTypes: ["export_import_controls"]
  },
  {
    pattern: /\bsection 232\b|\bsection 301\b|\b(steel|aluminum|aluminium|copper)\b.*\b(tariff|duties|duty)\b|\b(tariff|duties|duty)\b.*\b(steel|aluminum|aluminium|copper)\b/i,
    entityIds: ["gse_commodity_steel", "gse_industry_automotive", "gse_country_us"],
    eventTypes: ["tariffs", "trade_policy"]
  },
  {
    pattern: /\bpharmaceutical|medicines?\b.*\b(tariff|duties)\b|\b(tariff|duties)\b.*\bpharmaceutical/i,
    entityIds: ["gse_citizen_medicines", "gse_country_us"],
    eventTypes: ["tariffs"]
  },
  { pattern: /\bhormuz\b/i, entityIds: ["gse_strait_hormuz", "gse_commodity_crude", "gse_industry_energy"], eventTypes: null },
  { pattern: /\bsuez\b/i, entityIds: ["gse_canal_suez", "gse_commodity_containers", "gse_industry_shipping"], eventTypes: null },
  { pattern: /\bpanama canal\b/i, entityIds: ["gse_canal_panama", "gse_commodity_containers"], eventTypes: null },
  {
    pattern: /\bport of los angeles\b|\blong beach\b|\bla\/lb\b/i,
    entityIds: ["gse_port_la_lb", "gse_route_asia_us", "gse_commodity_containers"],
    eventTypes: ["port_shipping_disruption"]
  },
  {
    pattern: /\bearthquakes?\b|\btsunamis?\b|\bhurricanes?\b|\btyphoons?\b|\bfloods?\b|\bdroughts?\b|\bwildfires?\b/i,
    entityIds: ["gse_citizen_insurance", "gse_citizen_housing"],
    eventTypes: ["natural_disaster"]
  },
  {
    pattern: /\bcrude oil\b|\boil price\b|\bpetroleum\b|\bopec\b/i,
    entityIds: ["gse_commodity_crude", "gse_industry_energy", "gse_citizen_fuel"],
    eventTypes: ["energy"]
  },
  {
    pattern: /\bcyber(?:security)?\b|\bransomware\b|\bcritical infrastructure\b.*\bcyber\b/i,
    entityIds: ["gse_infra_grid_us", "gse_industry_technology"],
    eventTypes: ["cyber"]
  }
];
