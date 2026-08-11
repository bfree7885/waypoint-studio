/**
 * SignalTerrain Cyber — Signal Intelligence Engine (Product Recovery Phase 2)
 *
 * Transforms normalized live records into enriched intelligence items:
 * enrichment, deeper dedupe hints, correlation, recommendations, risk copy,
 * multi-horizon briefings, trends, timeline, noise flags, persona framework.
 *
 * Pure functions over provider-backed records. Never invents incidents or sources.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { actionToCategory } from "./adaptive-defense.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SIGNAL_ENGINE_VERSION = "2.1.0";

function nowIso() {
  return new Date().toISOString();
}

function daysBetween(a, b) {
  const ms = Math.abs(new Date(b).getTime() - new Date(a).getTime());
  return ms / (1000 * 60 * 60 * 24);
}

function blobOf(rec) {
  return `${rec.title || ""} ${rec.summary || ""} ${(rec.entities?.vendors || []).join(" ")} ${(rec.entities?.products || []).join(" ")}`.toLowerCase();
}

function hourUtc(d = new Date()) {
  return d.getUTCHours();
}

/** Persona framework — architecture for future personalization */
export const PERSONA_FRAMEWORK = {
  version: 1,
  note: "Personas bias ranking and noise thresholds. Adaptive Defense uses live intel; optional local inventory only biases browser re-score — devices are never inspected.",
  personas: [
    {
      id: "windows-admin",
      label: "Windows administrator",
      keywords: ["windows", "active directory", "exchange server", "microsoft exchange", "microsoft", "rdp", "iis", "office"],
      prefer: ["edge", "mail", "identity"]
    },
    {
      id: "linux-admin",
      label: "Linux administrator",
      keywords: ["linux", "ubuntu", "debian", "rhel", "kernel", "ssh", "systemd"],
      prefer: ["server", "ssh"]
    },
    {
      id: "home-lab",
      label: "Home lab",
      keywords: ["router", "nas", "home", "consumer", "iot"],
      prefer: ["exposure"]
    },
    {
      id: "education",
      label: "Education",
      keywords: ["education", "school", "student", "lms"],
      prefer: ["identity", "web"]
    },
    {
      id: "healthcare",
      label: "Healthcare",
      keywords: ["healthcare", "hospital", "medical", "hl7", "ehr", "phr"],
      prefer: ["ransomware", "critical-infra"]
    },
    {
      id: "manufacturing",
      label: "Manufacturing",
      keywords: ["scada", "ics", "ot", "plc", "manufacturing", "industrial"],
      prefer: ["critical-infra", "ot"]
    },
    {
      id: "critical-infrastructure",
      label: "Critical infrastructure",
      keywords: ["energy", "water", "pipeline", "electric", "telecom", "rail", "aviation"],
      prefer: ["critical-infra", "edge"]
    },
    {
      id: "networking",
      label: "Networking",
      keywords: ["firewall", "vpn", "router", "switch", "gateway", "cisco", "fortinet", "palo", "ivanti", "pulse", "check point"],
      prefer: ["edge", "vpn"]
    },
    {
      id: "cloud",
      label: "Cloud",
      keywords: ["aws", "azure", "gcp", "kubernetes", "saas", "cloudflare", "github"],
      prefer: ["cloud", "saas"]
    }
  ]
};

const ATTACK_HINTS = [
  { id: "T1190", label: "Exploit Public-Facing Application", re: /\b(vpn|exchange|gateway|web.?server|file.?transfer|remote)\b/i },
  { id: "T1133", label: "External Remote Services", re: /\b(vpn|rdp|citrix|remote.?desktop|ssh)\b/i },
  { id: "T1486", label: "Data Encrypted for Impact", re: /\bransomware\b/i },
  { id: "T1195", label: "Supply Chain Compromise", re: /\b(supply.?chain|dependency|package|npm|pypi|ci\/cd)\b/i },
  { id: "T1078", label: "Valid Accounts", re: /\b(credential|password|authentication|identity|sso)\b/i },
  { id: "T1566", label: "Phishing", re: /\bphish/i },
  { id: "T1059", label: "Command and Scripting Interpreter", re: /\b(rce|remote.?code|command.?injection)\b/i }
];

export function enrichRecord(rec) {
  const blob = blobOf(rec);
  const cvss = Number(rec.severity?.cvssScore);
  const known = !!rec.exploitation?.knownExploited;
  const ransomware = !!rec.exploitation?.ransomwareLinked;
  const when = rec.updatedAt || rec.publishedAt || rec.retrievedAt;
  const ageDays = when ? daysBetween(when, nowIso()) : 999;

  let severity = rec.severity?.label || "unknown";
  if ((!severity || severity === "unknown") && !Number.isNaN(cvss) && cvss > 0) {
    if (cvss >= 9) severity = "critical";
    else if (cvss >= 7) severity = "high";
    else if (cvss >= 4) severity = "medium";
    else severity = "low";
  }

  const confidence =
    rec.confidence === "confirmed" || rec.confidence === "high"
      ? "high"
      : rec.confidence === "moderate"
        ? "moderate"
        : rec.confidence === "preliminary"
          ? "preliminary"
          : rec.source?.authorityLevel === "official"
            ? "high"
            : "moderate";

  let freshness = "stale";
  if (ageDays <= 2) freshness = "live";
  else if (ageDays <= 14) freshness = "recent";
  else if (ageDays <= 60) freshness = "aging";

  let exploitMaturity = "unknown";
  if (known && rec.source?.providerId === "cisa-kev") exploitMaturity = "known-exploited-official";
  else if (known) exploitMaturity = "known-exploited-reported";
  else if (/\b(poc|proof.?of.?concept|exploit.?code)\b/i.test(blob)) exploitMaturity = "poc-mentioned";
  else exploitMaturity = "not-asserted";

  const platforms = [];
  if (/\b(windows|microsoft exchange|active directory|iis|rdp)\b/i.test(blob) || /\bexchange server\b/i.test(blob)) {
    platforms.push("windows");
  }
  if (/\b(linux|ubuntu|debian|rhel|kernel)\b/i.test(blob)) platforms.push("linux");
  if (/\b(android|ios|mobile)\b/i.test(blob)) platforms.push("mobile");
  if (/\b(aws|azure|gcp|cloud|saas|kubernetes)\b/i.test(blob)) platforms.push("cloud");
  if (/\b(vpn|firewall|router|switch|network|gateway)\b/i.test(blob)) platforms.push("network");
  if (/\b(scada|ics|ot|plc)\b/i.test(blob)) platforms.push("ot");
  if (!(rec.entities?.platforms || []).length && platforms.length) {
    /* keep local only in enrichment */
  }

  const industries = [];
  if (/\b(health|hospital|medical)\b/i.test(blob)) industries.push("healthcare");
  if (/\b(energy|electric|water|pipeline|telecom|rail|aviation)\b/i.test(blob)) industries.push("critical-infrastructure");
  if (/\b(manufactur|industrial|factory)\b/i.test(blob)) industries.push("manufacturing");
  if (/\b(bank|financ|fintech)\b/i.test(blob)) industries.push("finance");
  if (/\b(school|university|education)\b/i.test(blob)) industries.push("education");

  const edge =
    /\b(vpn|firewall|gateway|exchange|remote|rdp|citrix|ivanti|fortinet|pulse|moveit|file.?transfer)\b/i.test(blob);
  const supplyChain = /\b(supply.?chain|dependency|package|npm|pypi|maven|ci\/cd)\b/i.test(blob);

  // Likelihood heuristics — explained, not actuarial
  let smallOrg = 0.25;
  let enterprise = 0.35;
  if (edge) {
    smallOrg += 0.25;
    enterprise += 0.3;
  }
  if (known) {
    smallOrg += 0.2;
    enterprise += 0.25;
  }
  if (ransomware) {
    smallOrg += 0.15;
    enterprise += 0.2;
  }
  if (platforms.includes("cloud")) enterprise += 0.1;
  if (/\b(consumer|home.?router|iot)\b/i.test(blob)) smallOrg += 0.2;
  smallOrg = Math.min(0.95, smallOrg);
  enterprise = Math.min(0.95, enterprise);

  const patchAvailable = !!rec.remediation?.patchesAvailable;
  const mitigationAvailable = !!(
    patchAvailable ||
    (rec.remediation?.mitigations && rec.remediation.mitigations.length) ||
    rec.remediation?.summary
  );

  let operationalImpact = "limited";
  if (rec.type === "service-outage" && !(rec.rawProviderMetadata && rec.rawProviderMetadata.healthy)) {
    operationalImpact = "service-disruption";
  } else if (known && edge) operationalImpact = "high-exposure";
  else if (known) operationalImpact = "elevated";
  else if (severity === "critical" || severity === "high") operationalImpact = "potentially-significant";

  const publicInterest =
    known || ransomware || (severity === "critical" && ageDays <= 14) || rec.type === "service-outage" ? "elevated" : "routine";

  let technicalComplexity = "moderate";
  if (/\b(memory.?corruption|use.?after.?free|race.?condition|deserialization)\b/i.test(blob)) {
    technicalComplexity = "high";
  } else if (edge || /\b(misconfig|default.?credential|auth.?bypass)\b/i.test(blob)) {
    technicalComplexity = "lower-barrier";
  }

  const attackHints = ATTACK_HINTS.filter((h) => h.re.test(blob)).map((h) => ({
    techniqueId: h.id,
    label: h.label,
    confidence: "heuristic",
    note: "Keyword heuristic from public record text — not a confirmed ATT&CK mapping from MITRE."
  }));

  return {
    severity,
    confidence,
    freshness,
    exploitMaturity,
    knownExploitation: known,
    ransomwareAssociated: ransomware,
    industryRelevance: industries,
    affectedPlatforms: platforms.length ? platforms : ["unspecified"],
    operationalImpact,
    patchAvailability: patchAvailable ? "indicated" : mitigationAvailable ? "mitigations-mentioned" : "unknown",
    mitigationAvailability: mitigationAvailable ? "indicated" : "unknown",
    likelihoodSmallOrg: Number(smallOrg.toFixed(2)),
    likelihoodEnterprise: Number(enterprise.toFixed(2)),
    publicInterest,
    technicalComplexity,
    edgeExposure: edge,
    supplyChainContext: supplyChain,
    attackHints,
    ageDays: Math.round(ageDays * 10) / 10
  };
}

function withDefenseCategory(rec, enrichment, recommendation) {
  return Object.assign({}, recommendation, {
    defenseCategory: actionToCategory(recommendation.action, enrichment, rec)
  });
}

export function recommendAction(rec, enrichment) {
  const e = enrichment || rec.enrichment || enrichRecord(rec);
  const score = rec.priority?.score || 0;
  const known = e.knownExploitation;
  const edge = e.edgeExposure;
  const patch = e.patchAvailability === "indicated";
  const outage = rec.type === "service-outage";
  const healthyOutage = outage && rec.rawProviderMetadata && rec.rawProviderMetadata.healthy;

  let recommendation;
  if (healthyOutage) {
    recommendation = {
      action: "ignore",
      label: "No immediate action",
      urgency: "none",
      why: "Public status feed reports no material disruption for this provider."
    };
  } else if (outage) {
    recommendation = {
      action: "increase-monitoring",
      label: "Watch — service status",
      urgency: "now",
      why: "Public cloud/SaaS status indicates degradation — verify customer impact and open vendor status."
    };
  } else if (known && edge) {
    recommendation = {
      action: "patch-immediately",
      label: "Patch / update",
      urgency: "immediate",
      why: "Official known exploitation plus internet-facing / edge context. Prioritize before routine workstation work."
    };
  } else if (known && patch) {
    recommendation = {
      action: "patch-immediately",
      label: "Patch / update",
      urgency: "immediate",
      why: "Known exploited and a patch/fix is indicated by the source."
    };
  } else if (known && !patch) {
    recommendation = {
      action: "disable-exposed-service",
      label: "Mitigate / reduce exposure",
      urgency: "immediate",
      why: "Known exploited without a clear patch signal — restrict exposure and follow vendor mitigations."
    };
  } else if (score >= 70 || e.severity === "critical") {
    recommendation = {
      action: "review-vendor-advisory",
      label: "Review advisory",
      urgency: "today",
      why: "High operational priority — confirm whether affected products are in your environment. This app has not inspected your devices."
    };
  } else if (score >= 45 || e.severity === "high") {
    recommendation = {
      action: "monitor",
      label: "Watch",
      urgency: "this-week",
      why: "Meaningful severity or priority, but not clearly an immediate edge/KEV emergency for all orgs."
    };
  } else if (e.freshness === "stale" && !known && score < 35) {
    recommendation = {
      action: "ignore",
      label: "No immediate action",
      urgency: "none",
      why: "Older, not known-exploited, and low priority — hide by default to reduce noise."
    };
  } else {
    recommendation = {
      action: "investigate-further",
      label: "Review",
      urgency: "when-convenient",
      why: "Worth a skim against inventory; not an automatic emergency from connected sources alone."
    };
  }
  return withDefenseCategory(rec, e, recommendation);
}

export function explainRisk(rec, enrichment) {
  const e = enrichment || rec.enrichment || enrichRecord(rec);
  const vendors = (rec.entities?.vendors || []).join(", ");
  const products = (rec.entities?.products || []).join(", ");
  const who =
    vendors || products
      ? `Organizations running ${[vendors, products].filter(Boolean).join(" / ")}.`
      : "Anyone using products named in the source advisory (entities may be incomplete for RSS items).";

  let likelihood;
  if (e.knownExploitation) {
    likelihood = "Exploitation is already known in the wild per official/connected sources — treat as likely if you are in scope.";
  } else if (e.exploitMaturity === "poc-mentioned") {
    likelihood = "Public text mentions exploit/PoC context — elevated curiosity, not proof of mass exploitation.";
  } else {
    likelihood = "No known-exploitation assertion in connected sources — likelihood depends on exposure and attacker interest.";
  }

  let mitigationDifficulty;
  if (e.patchAvailability === "indicated") {
    mitigationDifficulty = "Often straightforward if a vendor patch is available and change windows allow.";
  } else if (e.mitigationAvailability === "indicated") {
    mitigationDifficulty = "May require configuration changes or temporary exposure reduction — plan carefully.";
  } else if (e.edgeExposure) {
    mitigationDifficulty = "Edge systems can be harder operationally (maintenance windows, HA pairs) even when the fix is clear.";
  } else {
    mitigationDifficulty = "Difficulty unknown until you map the advisory to your exact builds.";
  }

  const recAction = recommendAction(rec, e);
  let patchTiming;
  if (recAction.action === "patch-immediately" || recAction.action === "disable-exposed-service") {
    patchTiming = "Do not wait for a monthly cycle if you are exposed.";
  } else if (recAction.action === "monitor" || recAction.action === "review-vendor-advisory") {
    patchTiming = "Can often wait for a planned window after you confirm relevance — still track KEV deadlines.";
  } else {
    patchTiming = "Usually can wait; revisit if exploitation evidence appears.";
  }

  return {
    whoIsAffected: who,
    howLikelyExploitation: likelihood,
    howDifficultMitigation: mitigationDifficulty,
    patchImmediately: recAction.urgency === "immediate",
    canItWait: recAction.urgency !== "immediate" && recAction.urgency !== "now",
    plainSummary: `${who} ${likelihood} ${patchTiming}`,
    recommendation: recAction
  };
}

export function noiseScore(rec, enrichment) {
  const e = enrichment || rec.enrichment || enrichRecord(rec);
  const score = rec.priority?.score || 0;
  let noise = 0;
  if (rec.type === "service-outage" && rec.rawProviderMetadata?.healthy) noise += 80;
  if (!e.knownExploitation && score < 35) noise += 40;
  if (e.freshness === "stale" && !e.knownExploitation) noise += 25;
  if (e.publicInterest === "routine" && score < 45) noise += 15;
  if (e.knownExploitation || e.ransomwareAssociated || e.edgeExposure) noise -= 40;
  if (score >= 70) noise -= 30;
  noise = Math.max(0, Math.min(100, noise));
  return {
    score: noise,
    hideByDefault: noise >= 55,
    reason:
      noise >= 55
        ? "Low operational signal relative to other items — hidden unless you show noise."
        : "Surfaced by default based on exploitation, priority, or freshness."
  };
}

/**
 * Secondary dedupe: merge near-duplicate titles without CVE when same provider family.
 * Primary CVE merge already happened upstream.
 */
export function mergeNarrativeDuplicates(records) {
  const out = [];
  const seen = new Map();
  for (const rec of records) {
    const cves = (rec.identifiers?.cves || []).map((c) => c.toUpperCase());
    if (cves.length) {
      out.push(rec);
      continue;
    }
    const key = `${rec.type}|${(rec.title || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .slice(0, 80)}`;
    if (seen.has(key)) {
      const primary = seen.get(key);
      primary.supportingSources = primary.supportingSources || [
        {
          providerId: primary.source?.providerId,
          providerName: primary.source?.providerName,
          sourceUrl: primary.source?.sourceUrl
        }
      ];
      primary.supportingSources.push({
        providerId: rec.source?.providerId,
        providerName: rec.source?.providerName,
        sourceUrl: rec.source?.sourceUrl
      });
      primary.enrichment = primary.enrichment || enrichRecord(primary);
      primary.enrichment.mergedDuplicates = (primary.enrichment.mergedDuplicates || 0) + 1;
      continue;
    }
    seen.set(key, rec);
    out.push(rec);
  }
  return out;
}

export function correlateRecords(records) {
  const byCve = new Map();
  const relationships = [];
  const entities = [];
  const entitySeen = new Set();

  function ensureEntity(id, kind, title, extra = {}) {
    if (entitySeen.has(id)) return;
    entitySeen.add(id);
    entities.push({ id, kind, title, ...extra });
  }

  for (const rec of records) {
    const cves = (rec.identifiers?.cves || []).map((c) => String(c).toUpperCase());
    for (const cve of cves) {
      if (!byCve.has(cve)) byCve.set(cve, []);
      byCve.get(cve).push(rec.id);
      ensureEntity(`cve:${cve}`, "cve", cve);
      relationships.push({
        type: "mentions-cve",
        from: rec.id,
        to: `cve:${cve}`,
        evidence: "identifier"
      });
    }
    if (rec.exploitation?.knownExploited) {
      for (const cve of cves) {
        relationships.push({
          type: "listed-in-kev",
          from: `cve:${cve}`,
          to: "catalog:cisa-kev",
          evidence: "exploitation.knownExploited"
        });
      }
      ensureEntity("catalog:cisa-kev", "catalog", "CISA KEV");
    }
    if (rec.exploitation?.ransomwareLinked) {
      relationships.push({
        type: "ransomware-associated",
        from: rec.id,
        to: "theme:ransomware",
        evidence: "KEV ransomware flag or equivalent"
      });
      ensureEntity("theme:ransomware", "theme", "Ransomware-associated vulnerabilities");
    }
    if (rec.type === "service-outage") {
      const vendor = (rec.entities?.vendors || ["cloud"])[0];
      const vid = `vendor:${String(vendor).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      ensureEntity(vid, "vendor", vendor);
      relationships.push({ type: "outage-affects", from: rec.id, to: vid, evidence: "service-outage record" });
    }
    if (rec.type === "security-advisory" || rec.type === "software-security-release") {
      for (const cve of cves) {
        relationships.push({
          type: "advisory-covers",
          from: rec.id,
          to: `cve:${cve}`,
          evidence: "CVE extracted from advisory"
        });
      }
    }
    const hints = rec.enrichment?.attackHints || enrichRecord(rec).attackHints;
    for (const h of hints) {
      const tid = `attack:${h.techniqueId}`;
      ensureEntity(tid, "attack-technique", `${h.techniqueId} ${h.label}`, {
        note: h.note
      });
      relationships.push({
        type: "heuristic-attack-map",
        from: rec.id,
        to: tid,
        evidence: "keyword heuristic",
        confidence: "heuristic"
      });
    }
    for (const v of rec.entities?.vendors || []) {
      const vid = `vendor:${String(v).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      ensureEntity(vid, "vendor", v);
      relationships.push({ type: "affects-vendor", from: rec.id, to: vid, evidence: "entity extraction" });
    }
  }

  // Cross-link records sharing CVEs
  for (const [cve, ids] of byCve.entries()) {
    if (ids.length < 2) continue;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        relationships.push({
          type: "same-cve",
          from: ids[i],
          to: ids[j],
          via: cve,
          evidence: "shared CVE identifier"
        });
      }
    }
  }

  return {
    version: 1,
    generatedAt: nowIso(),
    entityCount: entities.length,
    relationshipCount: relationships.length,
    entities: entities.slice(0, 2000),
    relationships: relationships.slice(0, 5000),
    note: "Automatic correlation from identifiers and heuristics. ATT&CK links are heuristic unless marked otherwise."
  };
}

export function buildOperationalBriefings(records, previousBrief, providers) {
  const visible = records.filter((r) => !(r.noise && r.noise.hideByDefault));
  const top = visible.slice(0, 12);
  const kevNew = records.filter((r) => {
    if (!r.exploitation?.knownExploited) return false;
    const when = r.publishedAt;
    return when && daysBetween(when, nowIso()) <= 30;
  });
  const outages = records.filter(
    (r) => r.type === "service-outage" && !(r.rawProviderMetadata && r.rawProviderMetadata.healthy)
  );
  const ransomware = records.filter((r) => r.exploitation?.ransomwareLinked);

  function pack(kind, title, bullets, actions) {
    return {
      kind,
      title,
      generatedAt: nowIso(),
      whatChanged: bullets,
      whyItMatters: bullets.slice(0, 2),
      whoShouldCare: [
        kevNew.length ? "Operators of internet-facing or edge systems" : null,
        ransomware.length ? "Organizations tracking ransomware-exposed software" : null,
        outages.length ? "Teams dependent on affected cloud/SaaS providers" : null,
        "Anyone matching the named vendors/products in top items"
      ].filter(Boolean),
      recommendedActions: actions,
      expectedFuture: [
        kevNew.length
          ? "Expect continued KEV additions and vendor patches for newly listed items."
          : "Watch for official exploitation confirmations on high-severity items.",
        outages.length
          ? "Cloud/SaaS incidents may resolve within hours — re-check status pages."
          : "No major unresolved cloud status signals in the current artifact."
      ],
      basedOnRecordIds: top.slice(0, 8).map((r) => r.id)
    };
  }

  const morningBullets = [
    top[0] ? `Lead item: ${top[0].title}` : "No high-signal items in the current artifact.",
    kevNew.length ? `${kevNew.length} KEV dateAdded entries in ~30 days deserve edge review.` : "No recent KEV dateAdded surge in this slice.",
    outages.length ? `${outages.length} active public cloud/SaaS status signal(s).` : "No major cloud outages indicated.",
    ransomware.length ? `${ransomware.length} ransomware-associated KEV flags present.` : null
  ].filter(Boolean);

  const actions = top
    .slice(0, 5)
    .map((r) => {
      const rec = r.recommendation || recommendAction(r, r.enrichment);
      return { recordId: r.id, action: rec.action, label: rec.label, why: rec.why };
    });

  const h = hourUtc();
  const morning = pack("morning", "Morning Brief", morningBullets, actions);
  const evening = pack(
    "evening",
    "Evening Brief",
    [
      `Day close: ${visible.filter((r) => (r.priority?.score || 0) >= 70).length} high-signal items remain in view.`,
      outages.length ? `Still watching ${outages.length} status signal(s).` : "Cloud status picture remains calm in this artifact.",
      "Re-check any Immediate recommendations before change freezes overnight."
    ],
    actions.slice(0, 4)
  );
  const weekly = pack(
    "weekly",
    "Weekly Summary",
    [
      `${records.length} verified records in the live artifact after dedupe.`,
      `${kevNew.length} KEV additions (≈30 days by dateAdded) in this set.`,
      `${ransomware.length} ransomware-associated entries.`,
      previousBrief?.recommendation
        ? `Prior recommendation was: ${previousBrief.recommendation}`
        : "No prior brief recommendation on file."
    ],
    actions
  );
  const critical = pack(
    "critical",
    "Critical Alerts",
    records
      .filter((r) => r.priority?.band === "Immediate" || (r.enrichment?.knownExploitation && r.enrichment?.edgeExposure))
      .slice(0, 8)
      .map((r) => r.title),
    records
      .filter((r) => r.recommendation?.urgency === "immediate")
      .slice(0, 6)
      .map((r) => ({
        recordId: r.id,
        action: r.recommendation.action,
        label: r.recommendation.label,
        why: r.recommendation.why
      }))
  );

  // Prefer time-of-day default
  const activeKind = h >= 11 && h < 18 ? "morning" : h >= 18 || h < 4 ? "evening" : "morning";

  return {
    version: 1,
    activeKind,
    morning,
    evening,
    weekly,
    critical,
    providerCaveats: (providers || [])
      .filter((p) => p.status === "error" || p.status === "planned")
      .map((p) => ({ providerId: p.providerId, status: p.status, note: p.latestError || p.meta?.note || p.status }))
  };
}

export function analyzeTrends(records, previousRecords) {
  const prev = previousRecords || [];
  const count = (pred) => records.filter(pred).length;
  const prevCount = (pred) => prev.filter(pred).length;

  const trends = [];

  function trend(id, label, nowN, thenN, interpret) {
    const delta = nowN - thenN;
    let direction = "stable";
    if (delta >= 3) direction = "up";
    else if (delta <= -3) direction = "down";
    trends.push({
      id,
      label,
      current: nowN,
      previous: thenN,
      delta,
      direction,
      interpretation: interpret(direction, nowN, delta)
    });
  }

  trend(
    "ransomware-flags",
    "Ransomware-associated KEV flags",
    count((r) => r.exploitation?.ransomwareLinked),
    prevCount((r) => r.exploitation?.ransomwareLinked),
    (dir, n) =>
      dir === "up"
        ? `Ransomware-linked catalog pressure is higher (${n} items). Favor edge and backup readiness.`
        : n > 0
          ? `${n} ransomware-associated items remain in view — still material, not necessarily accelerating.`
          : "No ransomware-associated flags in this artifact."
  );

  trend(
    "edge-exposure",
    "Edge / VPN / mail / gateway context",
    count((r) => r.enrichment?.edgeExposure),
    prevCount((r) => r.enrichment?.edgeExposure),
    (dir, n) =>
      dir === "up"
        ? "More items mention edge-exposed software — patch appliances before workstations."
        : n
          ? `${n} edge-context items remain worth tracking.`
          : "Few edge-context items in the current set."
  );

  const exchange = count((r) => /\b(microsoft exchange|exchange server)\b/i.test(blobOf(r)));
  const prevExchange = prevCount((r) => /\b(microsoft exchange|exchange server)\b/i.test(blobOf(r)));
  trend("exchange", "Microsoft Exchange mentions", exchange, prevExchange, (dir, n) =>
    n > 0
      ? dir === "up"
        ? "Exchange-related signal is rising — mail admins should prioritize review."
        : `${n} Exchange-related item(s) in the artifact.`
      : "No Exchange-focused items in this slice."
  );

  const health = count((r) => (r.enrichment?.industryRelevance || []).includes("healthcare"));
  const prevHealth = prevCount((r) => (r.enrichment?.industryRelevance || []).includes("healthcare"));
  trend("healthcare", "Healthcare-context wording", health, prevHealth, (dir, n) =>
    n > 0
      ? "Healthcare context appears in source text — relevant for clinical environments; not proof of a dedicated campaign."
      : "Little healthcare-specific wording in this artifact."
  );

  const vpn = count((r) => /\b(vpn|ivanti|fortinet|pulse.?secure|citrix)\b/i.test(blobOf(r)));
  const prevVpn = prevCount((r) => /\b(vpn|ivanti|fortinet|pulse.?secure|citrix)\b/i.test(blobOf(r)));
  trend("vpn", "VPN / remote access mentions", vpn, prevVpn, (dir, n) =>
    n > 0
      ? dir === "up"
        ? "VPN/remote-access mentions are elevated — treat internet-facing access gear as first priority."
        : `${n} VPN/remote-access related item(s).`
      : "Few VPN/remote-access mentions right now."
  );

  const cred = count((r) => /\b(credential|password|auth.?bypass|identity)\b/i.test(blobOf(r)));
  const prevCred = prevCount((r) => /\b(credential|password|auth.?bypass|identity)\b/i.test(blobOf(r)));
  trend("credentials", "Credential / auth-bypass wording", cred, prevCred, (dir, n) =>
    n > 0
      ? "Credential/auth themes present — reinforce MFA and reset hygiene where relevant."
      : "No strong credential-theft wording spike in this set."
  );

  return {
    version: 1,
    generatedAt: nowIso(),
    comparedToPrevious: prev.length > 0,
    trends,
    narrative: trends
      .filter((t) => t.current > 0 || t.direction !== "stable")
      .slice(0, 5)
      .map((t) => t.interpretation)
  };
}

export function buildTimeline(records) {
  const events = records
    .map((r) => {
      const at = r.publishedAt || r.updatedAt || r.retrievedAt;
      if (!at) return null;
      let category = "other";
      if (r.exploitation?.knownExploited) category = "kev";
      else if (r.type === "service-outage") category = "outage";
      else if (r.type === "security-advisory" || r.type === "software-security-release") category = "patch-or-advisory";
      else if (r.type === "vulnerability" || r.type === "exploited-vulnerability") category = "vulnerability";
      if (r.exploitation?.ransomwareLinked) category = "ransomware";
      return {
        at,
        recordId: r.id,
        title: r.title,
        category,
        severity: r.enrichment?.severity || r.severity?.label || "unknown",
        band: r.priority?.band,
        score: r.priority?.score,
        vendors: r.entities?.vendors || [],
        industries: r.enrichment?.industryRelevance || [],
        hideByDefault: !!(r.noise && r.noise.hideByDefault)
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)));

  return {
    version: 1,
    generatedAt: nowIso(),
    total: events.length,
    events: events.slice(0, 400),
    filters: {
      categories: ["kev", "vulnerability", "patch-or-advisory", "outage", "ransomware", "other"],
      note: "Filter client-side by date, severity, vendor, industry. Threat-actor filter awaits dedicated actor feeds."
    }
  };
}

export function matchPersonas(rec, enrichment) {
  const e = enrichment || rec.enrichment || enrichRecord(rec);
  const blob = blobOf(rec) + " " + (e.affectedPlatforms || []).join(" ") + " " + (e.industryRelevance || []).join(" ");
  const hits = [];
  for (const p of PERSONA_FRAMEWORK.personas) {
    let score = 0;
    let keywordHits = 0;
    for (const kw of p.keywords) {
      // Word-boundary match avoids "iis"/"exchange" substring traps
      const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")}\\b`, "i");
      if (re.test(blob)) {
        score += 1;
        keywordHits += 1;
      }
    }
    // Prefer bonuses only with keyword evidence (except networking on clear edge exposure)
    if (keywordHits > 0) {
      if (p.prefer.includes("edge") && e.edgeExposure) score += 2;
      if (p.prefer.includes("ransomware") && e.ransomwareAssociated) score += 2;
      if (p.prefer.includes("critical-infra") && (e.industryRelevance || []).includes("critical-infrastructure")) score += 2;
      if (p.prefer.includes("cloud") && (e.affectedPlatforms || []).includes("cloud")) score += 2;
      if (p.prefer.includes("vpn") && /\bvpn\b/i.test(blob)) score += 2;
    } else if (p.id === "networking" && e.edgeExposure) {
      score += 2;
    }
    if (score >= 2) {
      hits.push({ personaId: p.id, label: p.label, score, note: "Heuristic persona relevance — not a user profile claim." });
    }
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, 4);
}

/**
 * Main entry: enrich scored live records into the intelligence layer.
 */
export function buildSignalIntelligence(scoredRecords, options = {}) {
  const started = Date.now();
  const previous = options.previousRecords || [];
  const providers = options.providers || [];
  const previousBrief = options.previousBrief || null;

  let records = mergeNarrativeDuplicates(scoredRecords.map((r) => Object.assign({}, r)));

  records = records.map((rec) => {
    const enrichment = enrichRecord(rec);
    const recommendation = recommendAction(rec, enrichment);
    const risk = explainRisk(rec, enrichment);
    const noise = noiseScore(rec, enrichment);
    const personas = matchPersonas(rec, enrichment);
    return Object.assign({}, rec, {
      enrichment,
      recommendation,
      risk,
      noise,
      personas
    });
  });

  // Re-sort: priority first, but push hidden noise down when equal
  records.sort((a, b) => {
    const hideA = a.noise?.hideByDefault ? 1 : 0;
    const hideB = b.noise?.hideByDefault ? 1 : 0;
    if (hideA !== hideB) return hideA - hideB;
    return (b.priority?.score || 0) - (a.priority?.score || 0);
  });

  const correlation = correlateRecords(records);
  const briefings = buildOperationalBriefings(records, previousBrief, providers);
  const trends = analyzeTrends(records, previous.map((r) => {
    // previous may lack enrichment — enrich lightly for trend compare
    if (r.enrichment) return r;
    return Object.assign({}, r, { enrichment: enrichRecord(r) });
  }));
  const timeline = buildTimeline(records);

  const surfaced = records.filter((r) => !r.noise?.hideByDefault);
  const hidden = records.length - surfaced.length;

  return {
    meta: {
      version: SIGNAL_ENGINE_VERSION,
      generatedAt: nowIso(),
      processingMs: Date.now() - started,
      inputRecords: scoredRecords.length,
      outputRecords: records.length,
      surfacedByDefault: surfaced.length,
      hiddenByDefault: hidden,
      principles: [
        "Enrichment interprets provider facts — does not invent incidents",
        "Dedup prefers CVE identity; narrative merge is secondary",
        "ATT&CK links are heuristic unless proven otherwise",
        "Recommendations are decision support, not compliance mandates",
        "Personas are architectural hooks for future personalization"
      ]
    },
    personaFramework: PERSONA_FRAMEWORK,
    briefings,
    trends,
    timeline,
    correlation: {
      entityCount: correlation.entityCount,
      relationshipCount: correlation.relationshipCount,
      // Keep payload lighter in live.json — full graph also written separately if requested
      relationshipPreview: correlation.relationships.slice(0, 80),
      note: correlation.note
    },
    noise: {
      hideByDefaultCount: hidden,
      policy: "Items with noise.score >= 55 are hidden unless the user enables Show low-signal."
    },
    records
  };
}

export function writeCorrelationBundle(correlation, filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(correlation, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, filePath);
}

export default {
  SIGNAL_ENGINE_VERSION,
  PERSONA_FRAMEWORK,
  enrichRecord,
  recommendAction,
  explainRisk,
  noiseScore,
  mergeNarrativeDuplicates,
  correlateRecords,
  buildOperationalBriefings,
  analyzeTrends,
  buildTimeline,
  matchPersonas,
  buildSignalIntelligence,
  writeCorrelationBundle
};
