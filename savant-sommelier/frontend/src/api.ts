import { readExtent, readHealth, readPanels, readSearch } from "./honesty";
import type { ExtentRelation, HealthView, LngLat, PanelContent, SearchView } from "./types";

export type AnalysisResult =
  | { kind: "down" }
  | { kind: "rejected" }
  | {
      kind: "ok";
      panels: PanelContent[];
      extent: { relation: ExtentRelation; detail: string };
    };

async function getJson(path: string): Promise<unknown | null> {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchHealth(): Promise<HealthView> {
  const payload = await getJson("/api/v1/health");
  if (payload === null) {
    return { kind: "down" };
  }
  return readHealth(payload);
}

export async function submitSearch(query: string): Promise<SearchView> {
  try {
    const response = await fetch("/api/v1/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    if (response.status === 422) {
      return { kind: "rejected", query };
    }
    if (!response.ok) {
      return { kind: "api_down", query };
    }
    return readSearch(query, await response.json());
  } catch {
    return { kind: "api_down", query };
  }
}

export async function fetchAnalysis(point: LngLat): Promise<AnalysisResult> {
  const params = new URLSearchParams({
    lng: String(point.lng),
    lat: String(point.lat),
  });
  const payload = await getJson(`/api/v1/analysis?${params.toString()}`);
  if (payload === null) {
    return { kind: "down" };
  }
  const panels = readPanels(payload);
  const extent = readExtent(payload);
  if (!panels || !extent) {
    return { kind: "rejected" };
  }
  return { kind: "ok", panels, extent };
}
