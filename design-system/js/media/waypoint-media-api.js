/**
 * Waypoint Shared Media API — website integration
 *
 * Loads data/media/catalog.json (approved assets only).
 * No hardcoded image folders. Apps query by id, tag, destination, or suitability.
 *
 * Usage:
 *   const media = await WaypointMedia.load();
 *   const heroes = media.forDestination('Homepage hero');
 *   const url = media.versionUrl(asset, 'medium');
 */
(function (global) {
  "use strict";

  const DEFAULT_CATALOG = "/data/media/catalog.json";

  function resolveCatalogUrl(explicit) {
    if (explicit) return explicit;
    if (typeof document !== "undefined") {
      const meta = document.querySelector('meta[name="waypoint-media-catalog"]');
      if (meta && meta.content) return meta.content;
    }
    return DEFAULT_CATALOG;
  }

  class WaypointMediaCatalog {
    constructor(data) {
      this.version = data.version || 1;
      this.updatedAt = data.updated_at || null;
      this.policy = data.policy || {};
      this.assets = Array.isArray(data.assets) ? data.assets.slice() : [];
    }

    all() {
      return this.assets.filter((a) => a && a.status === "approved");
    }

    byId(id) {
      return this.all().find((a) => a.id === id) || null;
    }

    forDestination(name) {
      const needle = String(name).toLowerCase();
      return this.all().filter((a) =>
        (a.apps || []).some((d) => String(d).toLowerCase() === needle)
      );
    }

    withTag(tag) {
      const needle = String(tag).toLowerCase();
      return this.all().filter((a) =>
        (a.tags || []).some((t) => String(t).toLowerCase() === needle)
      );
    }

    versionUrl(asset, size, { preferWebp = true, base = "" } = {}) {
      if (!asset || !asset.versions) return null;
      const v = asset.versions[size] || asset.versions.medium || asset.versions.small;
      if (!v) return null;
      const path = preferWebp && v.webp ? v.webp : v.path;
      if (!path) return null;
      if (/^https?:\/\//i.test(path) || path.startsWith("/")) return path;
      return (base ? base.replace(/\/$/, "") + "/" : "/") + path.replace(/^\//, "");
    }

    altText(asset) {
      return (asset && (asset.alt_text || asset.caption)) || "";
    }
  }

  const WaypointMedia = {
    Catalog: WaypointMediaCatalog,
    async load(url) {
      const catalogUrl = resolveCatalogUrl(url);
      const res = await fetch(catalogUrl, { cache: "no-store" });
      if (!res.ok) {
        throw new Error("WaypointMedia: failed to load catalog " + catalogUrl + " (" + res.status + ")");
      }
      const data = await res.json();
      return new WaypointMediaCatalog(data);
    },
  };

  global.WaypointMedia = WaypointMedia;
})(typeof window !== "undefined" ? window : globalThis);
