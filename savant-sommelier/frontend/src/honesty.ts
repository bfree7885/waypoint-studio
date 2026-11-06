import contract from "../../shared/honesty.json";
import type { ExtentRelation, HealthView, LngLat, PanelContent, PanelId, SearchView } from "./types";

const PANEL_IDS: PanelId[] = ["parcel", "suitability", "varieties", "climate"];

export function initialRegion() {
  return contract.initial_region;
}

export function basemap() {
  return contract.basemap;
}

export function classifyExtent(point: LngLat): ExtentRelation {
  const region = contract.initial_region;
  const inside =
    point.lng >= region.west &&
    point.lng <= region.east &&
    point.lat >= region.south &&
    point.lat <= region.north;
  return inside ? "inside_initial_extent" : "outside_initial_extent";
}

export function extentDetail(relation: ExtentRelation): string {
  return contract.extent_detail[relation];
}

export function localPanels(): PanelContent[] {
  return PANEL_IDS.map((id) => ({
    id,
    title: contract.panels[id].title,
    status: "not_connected",
    detail: contract.panels[id].detail,
  }));
}

export function formatCoordinate(point: LngLat): string {
  const latitude = `${Math.abs(point.lat).toFixed(5)}° ${point.lat >= 0 ? "N" : "S"}`;
  const longitude = `${Math.abs(point.lng).toFixed(5)}° ${point.lng >= 0 ? "E" : "W"}`;
  return `${latitude}, ${longitude}`;
}

export function readHealth(payload: unknown): HealthView {
  if (!payload || typeof payload !== "object") {
    return { kind: "down" };
  }
  const body = payload as Record<string, unknown>;
  if (body.status !== "ok" || body.service !== "savant-sommelier") {
    return { kind: "untrusted" };
  }
  if (body.database !== "not_configured" && body.database !== "configured_unused") {
    return { kind: "untrusted" };
  }
  const integrations = body.integrations;
  if (!integrations || typeof integrations !== "object") {
    return { kind: "untrusted" };
  }
  const values = Object.values(integrations as Record<string, unknown>);
  if (values.length === 0 || values.some((value) => value !== "not_connected")) {
    return { kind: "untrusted" };
  }
  return {
    kind: "ready",
    database: body.database,
    databaseDetail: typeof body.database_detail === "string" ? body.database_detail : "",
  };
}

export function readSearch(query: string, payload: unknown): SearchView {
  if (!payload || typeof payload !== "object") {
    return { kind: "api_down", query };
  }
  const body = payload as Record<string, unknown>;
  if (body.status !== "not_connected" || body.result_count !== 0 || typeof body.message !== "string") {
    return { kind: "rejected", query };
  }
  if (Array.isArray(body.results) && body.results.length > 0) {
    return { kind: "rejected", query };
  }
  return {
    kind: "not_connected",
    query: typeof body.query === "string" ? body.query : query,
    message: body.message,
    resultCount: 0,
  };
}

export function readPanels(payload: unknown): PanelContent[] | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const body = payload as Record<string, unknown>;
  const panels = PANEL_IDS.map((id) => {
    const block = body[id];
    if (!block || typeof block !== "object") {
      return null;
    }
    const record = block as Record<string, unknown>;
    if (record.status !== "not_connected" || typeof record.title !== "string" || typeof record.detail !== "string") {
      return null;
    }
    return {
      id,
      title: record.title,
      status: "not_connected" as const,
      detail: record.detail,
    };
  });
  if (panels.some((panel) => panel === null)) {
    return null;
  }
  return panels as PanelContent[];
}

export function readExtent(payload: unknown): { relation: ExtentRelation; detail: string } | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const extent = (payload as Record<string, unknown>).extent;
  if (!extent || typeof extent !== "object") {
    return null;
  }
  const record = extent as Record<string, unknown>;
  if (
    (record.relation !== "inside_initial_extent" && record.relation !== "outside_initial_extent") ||
    typeof record.detail !== "string"
  ) {
    return null;
  }
  return { relation: record.relation, detail: record.detail };
}

export const messages = {
  selectionNote: contract.selection_note,
  unexpected: contract.unexpected_message,
  apiDownSearch: contract.api_down_search,
  mapUnavailable: contract.map_unavailable,
  searchMessage: contract.search_message,
};
