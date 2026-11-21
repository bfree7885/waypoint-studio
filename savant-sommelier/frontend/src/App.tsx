import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { fetchAnalysis, fetchHealth, submitSearch } from "./api";

const MapCanvas = lazy(() => import("./components/MapCanvas"));
import {
  basemap,
  classifyExtent,
  extentDetail,
  formatCoordinate,
  initialRegion,
  localPanels,
  messages,
} from "./honesty";
import type { HealthView, LngLat, PanelContent, PanelId, SearchView } from "./types";

const PANEL_ORDER: PanelId[] = ["parcel", "suitability", "varieties", "climate"];

export default function App() {
  const [health, setHealth] = useState<HealthView>({ kind: "checking" });
  const [tiles, setTiles] = useState<"loading" | "ready" | "unavailable">("loading");
  const [selection, setSelection] = useState<LngLat | null>(null);
  const [extentText, setExtentText] = useState<string | null>(null);
  const [panels, setPanels] = useState<PanelContent[]>(() => localPanels());
  const [analysisNote, setAnalysisNote] = useState<string | null>(null);
  const [search, setSearch] = useState<SearchView>({ kind: "idle" });
  const [query, setQuery] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [coordinateError, setCoordinateError] = useState<string | null>(null);
  const [frameToken, setFrameToken] = useState(0);
  const activePoint = useRef<LngLat | null>(null);
  const region = initialRegion();

  useEffect(() => {
    let cancelled = false;
    fetchHealth().then((next) => {
      if (!cancelled) {
        setHealth(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function recordPoint(point: LngLat) {
    activePoint.current = point;
    const localRelation = classifyExtent(point);
    setSelection(point);
    setExtentText(extentDetail(localRelation));
    setPanels(localPanels());
    setAnalysisNote(null);

    const analysis = await fetchAnalysis(point);
    const current = activePoint.current;
    if (!current || current.lng !== point.lng || current.lat !== point.lat) {
      return;
    }
    if (analysis.kind === "ok") {
      setPanels(analysis.panels);
      setExtentText(analysis.extent.detail);
    } else if (analysis.kind === "rejected") {
      setAnalysisNote(messages.unexpected);
    }
  }

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setSearch({ kind: "rejected", query: "" });
      return;
    }
    setSearch({ kind: "loading", query: trimmed });
    void submitSearch(trimmed).then(setSearch);
  }

  function onCoordinate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (latitude.trim() === "" || longitude.trim() === "") {
      setCoordinateError("Enter a latitude and a longitude.");
      return;
    }
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setCoordinateError("Enter a latitude from -90 to 90 and a longitude from -180 to 180.");
      return;
    }
    setCoordinateError(null);
    void recordPoint({ lng, lat });
  }

  return (
    <div className="app">
      <a className="skip" href="#search">
        Skip to property search
      </a>
      <header className="topbar">
        <div className="brand">
          <svg className="mark" viewBox="0 0 32 32" aria-hidden="true">
            <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="16" cy="16" r="2.5" fill="currentColor" />
          </svg>
          <div>
            <h1>Savant Sommelier</h1>
            <p>Land, climate, and wine grapes</p>
          </div>
        </div>
        <div className="status-block">
          <p>Initial region: {region.name}</p>
          <p>{healthLabel(health)}</p>
          <p>{tileLabel(tiles)}</p>
        </div>
      </header>

      <p className="banner" role="note">
        Property listings, parcel records, vineyard suitability, grape varieties, and climate projections are not
        connected. The map is a real basemap. Nothing on it is a parcel boundary or a suitability score.
      </p>

      <main className="workspace">
        <aside className="sidebar">
          <form id="search" className="panel" onSubmit={onSearch}>
            <div className="panel-head">
              <h2>Property search</h2>
              <span className="badge">Not connected</span>
            </div>
            <label htmlFor="property-query">Place or address</label>
            <input
              id="property-query"
              name="query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="City, county, or address"
              autoComplete="off"
              maxLength={200}
            />
            <p className="meta">Search does not look up properties for sale.</p>
            <button type="submit" disabled={search.kind === "loading"}>
              {search.kind === "loading" ? "Searching…" : "Search"}
            </button>
            <div className="result" aria-live="polite">
              <SearchResult search={search} />
            </div>
          </form>

          <form className="panel" onSubmit={onCoordinate}>
            <div className="panel-head">
              <h2>Record a coordinate</h2>
            </div>
            <p className="meta">Type a latitude and longitude, or click the map. This does not look up a parcel.</p>
            <div className="coord-fields">
              <label htmlFor="latitude">
                Latitude
                <input
                  id="latitude"
                  name="latitude"
                  inputMode="decimal"
                  value={latitude}
                  onChange={(event) => setLatitude(event.target.value)}
                />
              </label>
              <label htmlFor="longitude">
                Longitude
                <input
                  id="longitude"
                  name="longitude"
                  inputMode="decimal"
                  value={longitude}
                  onChange={(event) => setLongitude(event.target.value)}
                />
              </label>
            </div>
            {coordinateError ? <p className="meta">{coordinateError}</p> : null}
            <button type="submit">Use this coordinate</button>
          </form>

          {analysisNote ? (
            <p className="banner tight" role="status">
              {analysisNote}
            </p>
          ) : null}

          <div aria-live="polite">
            {PANEL_ORDER.map((id) => {
              const panel = panels.find((item) => item.id === id);
              if (!panel) {
                return null;
              }
              return (
                <section key={panel.id} className="panel" aria-labelledby={`${panel.id}-title`}>
                  <div className="panel-head">
                    <h2 id={`${panel.id}-title`}>{panel.title}</h2>
                    <span className="badge">Not connected</span>
                  </div>
                  {panel.id === "parcel" && selection ? (
                    <>
                      <p className="coord">{formatCoordinate(selection)}</p>
                      <p className="meta">Source: your map click or typed coordinate. Not a parcel.</p>
                      {extentText ? <p>{extentText}</p> : null}
                    </>
                  ) : null}
                  {panel.id !== "parcel" && selection ? <p className="meta">{messages.selectionNote}</p> : null}
                  <p>{panel.detail}</p>
                </section>
              );
            })}
          </div>
        </aside>

        <section className="map-column" aria-label="Basemap">
          <div className="map-stage">
            <Suspense fallback={<p className="map-fallback">Basemap loading</p>}>
              <MapCanvas
                selection={selection}
                frameToken={frameToken}
                onSelect={(point) => {
                  setLatitude(point.lat.toFixed(5));
                  setLongitude(point.lng.toFixed(5));
                  void recordPoint(point);
                }}
                onTileState={setTiles}
              />
            </Suspense>
            <div className="map-tools">
              <p className="map-chip">Basemap only. No parcels or scores are drawn.</p>
              <button type="button" className="secondary" onClick={() => setFrameToken((value) => value + 1)}>
                Show {region.name}
              </button>
            </div>
            {tiles === "unavailable" ? <p className="map-overlay">{messages.mapUnavailable}</p> : null}
          </div>
          <p id="map-note" className="map-note">
            Interactive basemap for the initial region. Pan and zoom continue beyond New York and Pennsylvania. Click
            to record a coordinate. Parcel lines are not drawn.
          </p>
          <p className="attribution">
            Basemap: {basemap().provider} {basemap().style_name} style.{" "}
            {basemap().attribution_links.map((link, index) => (
              <span key={link.href}>
                {index > 0 ? " · " : null}
                <a href={link.href} target="_blank" rel="noopener noreferrer">
                  {link.label}
                </a>
              </span>
            ))}
            . Analysis layers are not connected.
          </p>
        </section>
      </main>
    </div>
  );
}

function healthLabel(health: HealthView): string {
  if (health.kind === "checking") {
    return "Checking the analysis service…";
  }
  if (health.kind === "down") {
    return "Analysis service not running. The map still works.";
  }
  if (health.kind === "untrusted") {
    return "Analysis service response was not usable. No scores are shown.";
  }
  if (health.database === "configured_unused") {
    return "Analysis service ready. Database URL present and unused.";
  }
  return "Analysis service ready. Database not configured.";
}

function tileLabel(tiles: "loading" | "ready" | "unavailable"): string {
  if (tiles === "ready") {
    return "Basemap ready";
  }
  if (tiles === "unavailable") {
    return "Basemap unavailable";
  }
  return "Basemap loading";
}

function SearchResult({ search }: { search: SearchView }) {
  if (search.kind === "idle") {
    return <p className="meta">No search yet.</p>;
  }
  if (search.kind === "loading") {
    return <p>Searching for “{search.query}”.</p>;
  }
  if (search.kind === "api_down") {
    return (
      <p>
        {messages.apiDownSearch} Query kept on this screen: “{search.query}”.
      </p>
    );
  }
  if (search.kind === "rejected") {
    return <p>{search.query ? messages.unexpected : "Enter a place or address."}</p>;
  }
  return (
    <p>
      {search.message} Query: “{search.query}”. Properties returned: {search.resultCount}.
    </p>
  );
}
