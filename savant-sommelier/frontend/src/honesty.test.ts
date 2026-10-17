import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { classifyExtent, formatCoordinate, localPanels, readHealth, readPanels, readSearch } from "./honesty";

describe("map frame", () => {
  it("treats Harrisburg as inside the camera frame", () => {
    expect(classifyExtent({ lng: -76.88, lat: 40.27 })).toBe("inside_initial_extent");
  });

  it("treats Fresno as outside the camera frame", () => {
    expect(classifyExtent({ lng: -119.79, lat: 36.74 })).toBe("outside_initial_extent");
  });

  it("formats a western hemisphere click without calling it a parcel", () => {
    expect(formatCoordinate({ lng: -76.5, lat: 42.5 })).toBe("42.50000° N, 76.50000° W");
  });
});

describe("honest readers", () => {
  it("keeps every local panel disconnected", () => {
    const panels = localPanels();
    expect(panels.map((panel) => panel.status)).toEqual([
      "not_connected",
      "not_connected",
      "not_connected",
      "not_connected",
    ]);
    expect(panels.map((panel) => panel.title)).toEqual([
      "Parcel details",
      "Vineyard suitability",
      "Grape varieties",
      "Future climate",
    ]);
  });

  it("rejects a search payload that includes listings", () => {
    const view = readSearch("Finger Lakes", {
      query: "Finger Lakes",
      status: "not_connected",
      result_count: 0,
      message: "Property search is not connected. No listings were retrieved.",
      results: [{ id: "fake-listing" }],
    });
    expect(view.kind).toBe("rejected");
  });

  it("accepts an empty disconnected search", () => {
    const view = readSearch("Finger Lakes", {
      query: "Finger Lakes",
      status: "not_connected",
      result_count: 0,
      message: "Property search is not connected. No listings were retrieved.",
    });
    expect(view).toMatchObject({ kind: "not_connected", resultCount: 0 });
  });

  it("rejects analysis panels that claim a connection", () => {
    expect(
      readPanels({
        parcel: { status: "ready", title: "Parcel details", detail: "Invented parcel" },
        suitability: { status: "not_connected", title: "Vineyard suitability", detail: "None" },
        varieties: { status: "not_connected", title: "Grape varieties", detail: "None" },
        climate: { status: "not_connected", title: "Future climate", detail: "None" },
      }),
    ).toBeNull();
  });

  it("rejects a health payload that marks an integration connected", () => {
    expect(
      readHealth({
        service: "savant-sommelier",
        status: "ok",
        database: "not_configured",
        database_detail: "No database is configured.",
        integrations: { parcels: "connected" },
      }).kind,
    ).toBe("untrusted");
  });
});

describe("attribution stays visible", () => {
  it("uses OpenFreeMap and keeps the attribution control", () => {
    const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
    const map = readFileSync(new URL("./components/MapCanvas.tsx", import.meta.url), "utf8");
    const shared = readFileSync(new URL("../../shared/honesty.json", import.meta.url), "utf8");
    expect(shared).toContain("https://tiles.openfreemap.org/styles/positron");
    expect(shared).toContain("https://www.openstreetmap.org/copyright");
    expect(css).not.toContain("display: none");
    expect(css).not.toContain("display:none");
    expect(map).toContain("attributionControl: {}");
    expect(map).not.toMatch(/attributionControl:\s*false/);
    expect(map).toContain("basemap().style_url");
    expect(map).toContain("setWorkerUrl(maplibreWorkerUrl)");
    expect(map).toContain("maplibre-gl/dist/maplibre-gl-worker.mjs?url");
  });
});
