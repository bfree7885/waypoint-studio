export type ExtentRelation = "inside_initial_extent" | "outside_initial_extent";

export type LngLat = {
  lng: number;
  lat: number;
};

export type PanelId = "parcel" | "suitability" | "varieties" | "climate";

export type PanelContent = {
  id: PanelId;
  title: string;
  status: "not_connected";
  detail: string;
};

export type HealthView =
  | { kind: "checking" }
  | { kind: "down" }
  | {
      kind: "ready";
      database: "not_configured" | "configured_unused";
      databaseDetail: string;
    }
  | { kind: "untrusted" };

export type SearchView =
  | { kind: "idle" }
  | { kind: "loading"; query: string }
  | { kind: "not_connected"; query: string; message: string; resultCount: 0 }
  | { kind: "api_down"; query: string }
  | { kind: "rejected"; query: string };
