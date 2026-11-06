import { useEffect, useRef } from "react";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { Map, NavigationControl, ScaleControl, setWorkerUrl, type GeoJSONSource, type MapLayerMouseEvent } from "maplibre-gl";
import { basemap, initialRegion } from "../honesty";
import type { LngLat } from "../types";

setWorkerUrl(maplibreWorkerUrl);

type PointCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: Record<string, never>;
    geometry: { type: "Point"; coordinates: [number, number] };
  }>;
};

const EMPTY: PointCollection = { type: "FeatureCollection", features: [] };

type MapCanvasProps = {
  selection: LngLat | null;
  frameToken: number;
  onSelect: (point: LngLat) => void;
  onTileState: (state: "ready" | "unavailable") => void;
};

function selectionData(point: LngLat | null): PointCollection {
  if (!point) {
    return EMPTY;
  }
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [point.lng, point.lat] },
      },
    ],
  };
}

function frameRegion(map: Map) {
  const region = initialRegion();
  map.fitBounds(
    [
      [region.west, region.south],
      [region.east, region.north],
    ],
    { padding: 48, animate: false, duration: 0 },
  );
}

export default function MapCanvas({ selection, frameToken, onSelect, onTileState }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const selectionRef = useRef(selection);
  const onSelectRef = useRef(onSelect);
  const onTileStateRef = useRef(onTileState);
  selectionRef.current = selection;
  onSelectRef.current = onSelect;
  onTileStateRef.current = onTileState;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let styleLoaded = false;
    const map = new Map({
      container,
      style: basemap().style_url,
      attributionControl: {},
      pitchWithRotate: false,
      dragRotate: false,
      touchPitch: false,
      fadeDuration: 0,
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false, visualizePitch: false }), "top-right");
    map.addControl(new ScaleControl({ maxWidth: 120, unit: "imperial" }), "bottom-left");

    map.on("load", () => {
      styleLoaded = true;
      onTileStateRef.current("ready");
      map.addSource("selection", { type: "geojson", data: selectionData(selectionRef.current) });
      map.addLayer({
        id: "selection-point",
        type: "circle",
        source: "selection",
        paint: {
          "circle-radius": 7,
          "circle-color": "#1f3a32",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#f7f3eb",
        },
      });
      frameRegion(map);
      map.getCanvas().style.cursor = "crosshair";
    });

    map.on("error", () => {
      if (!styleLoaded) {
        onTileStateRef.current("unavailable");
      }
    });

    map.on("click", (event: MapLayerMouseEvent) => {
      onSelectRef.current({ lng: event.lngLat.lng, lat: event.lngLat.lat });
    });

    const timer = window.setTimeout(() => {
      if (!styleLoaded) {
        onTileStateRef.current("unavailable");
      }
    }, 12000);

    return () => {
      window.clearTimeout(timer);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource("selection") as GeoJSONSource | undefined;
    source?.setData(selectionData(selection));
  }, [selection]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      return;
    }
    frameRegion(map);
  }, [frameToken]);

  return <div ref={containerRef} className="map-canvas" />;
}
