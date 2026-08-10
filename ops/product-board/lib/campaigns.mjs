/**
 * Central Product Board campaign registry.
 * One board, many Waypoint products — never duplicate the board per app.
 */
import fs from "fs";
import path from "path";
import { BOARD_ROOT, REPO_ROOT } from "./paths.mjs";

/** @typedef {{ id: string, title: string, productPath: string, scanRoots: string[], commandRemap: Record<string, string>, mspDoc?: string, productionUrl?: string }} Campaign */

/** @type {Record<string, Campaign>} */
export const CAMPAIGNS = {
  sheds: {
    id: "sheds",
    title: "Sheds",
    productPath: "apps/shed-hunting",
    scanRoots: ["sheds", "apps/shed-hunting"],
    productionUrl: "https://waypointstudio.org/apps/shed-hunting/map/",
    commandRemap: {
      "production-build": "node automation/verify-sheds-production.mjs",
      "platform-foundation":
        "node automation/test-sheds-todays-search.mjs && node automation/test-sheds-observation-heat.mjs && node automation/test-sheds-map.mjs && node automation/test-sheds-field-ux.mjs",
      "browser-smoke": "node automation/test-sheds-live-weather-coldstart.mjs",
      "screenshot-analysis":
        "node automation/test-sheds-visual-board.mjs --mode=screenshot-analysis",
      "dynamic-visual":
        "node automation/test-sheds-visual-board.mjs --mode=dynamic-visual",
      "production-inspection":
        "node automation/test-sheds-visual-board.mjs --mode=production-inspection"
    },
    forceRequired: [
      "browser-smoke",
      "screenshot-analysis",
      "dynamic-visual",
      "production-inspection"
    ],
    mspDoc: null
  },
  signalterrain: {
    id: "signalterrain",
    title: "SignalTerrain",
    productPath: "apps/signalterrain",
    scanRoots: ["apps/signalterrain", "design-system/signalterrain", "design-system/js/signalterrain"],
    productionUrl: "https://waypointstudio.org/apps/signalterrain/",
    commandRemap: {
      "production-build": "node automation/verify-signalterrain-production.mjs",
      "platform-foundation":
        "node automation/test-signalterrain-msp.mjs && node automation/test-signalterrain-foundation.mjs && node automation/test-signalterrain-cyber-live.mjs && node automation/test-signalterrain-landing.mjs"
    },
    mspDoc: "ops/product-board/campaigns/signalterrain-msp.md"
  }
};

export function listCampaigns() {
  return Object.values(CAMPAIGNS);
}

export function getCampaign(id) {
  if (!id) return null;
  return CAMPAIGNS[String(id)] || null;
}

export function campaignScanRoots(id) {
  const c = getCampaign(id);
  return c ? c.scanRoots : null;
}

export function campaignCommandRemap(id) {
  const c = getCampaign(id);
  return c ? c.commandRemap : null;
}

export function assertCampaignProductExists(id) {
  const c = getCampaign(id);
  if (!c) throw new Error(`Unknown campaign: ${id}`);
  const abs = path.join(REPO_ROOT, c.productPath);
  if (!fs.existsSync(abs)) {
    throw new Error(`Campaign product path missing: ${c.productPath} (expected under ${REPO_ROOT})`);
  }
  return abs;
}

export function campaignsRegistryPath() {
  return path.join(BOARD_ROOT, "campaigns.json");
}

export function campaignForceRequired(id) {
  const c = getCampaign(id);
  return c && Array.isArray(c.forceRequired) ? c.forceRequired : [];
}
