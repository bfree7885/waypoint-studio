/**
 * Related Waypoint product suggestions — quiet, category-driven, no marketing filler.
 */

import { RELATED_PRODUCTS } from "./constants.mjs";

const byId = Object.fromEntries(RELATED_PRODUCTS.map((p) => [p.id, p]));

export function relatedProductsFor(categories, geographicScopes, options = {}) {
  const cats = new Set(categories || []);
  const geo = (geographicScopes || [])[0] || "";
  const picks = [];

  function add(id, reason) {
    if (!byId[id] || picks.find((p) => p.id === id)) return;
    picks.push({ ...byId[id], reason });
  }

  if (cats.has("Weather") || cats.has("Outdoor Safety") || cats.has("Climate")) {
    add("dashboard", "Check current conditions beside this reporting.");
  }
  if (cats.has("Astronomy and Night Sky")) {
    add("dashboard", "Compare night-sky context on Dashboard.");
    add("scenes", "Photograph clear-sky events in Scenes.");
  }
  if (cats.has("Nature Photography") || cats.has("Hidden Landscapes")) {
    add("scenes", "Open related photography craft in Scenes.");
    add("photo-coach", "Use Photo Coach for technique context.");
  }
  if (cats.has("Hidden Landscapes")) {
    add("hidden-landscapes", "Explore infrared and non-visible light work.");
  }
  if (
    cats.has("Wildlife") ||
    cats.has("Birds") ||
    cats.has("Forests and Plants") ||
    cats.has("Fungi") ||
    cats.has("Seasonal Nature")
  ) {
    add("fieldry", "Record a field observation when you verify it outside.");
  }
  if (
    cats.has("Wildlife") &&
    /Hudson Valley|Catskills|Poconos|Tri-State|Northeast|Adirondacks|Northern New Jersey/i.test(geo)
  ) {
    // Only when habitat / seasonal movement / conservation — not general hunting.
    if (
      !options.rejectSheds &&
      /deer|habitat|season|movement|conservation|public.?land|ethical|weather/i.test(
        String(options.textBlob || "")
      )
    ) {
      add("sheds", "Relevant to habitat and seasonal movement notes in Sheds.");
    }
  }
  if (cats.has("Hiking and Trails") || cats.has("Rivers and Water")) {
    add("dashboard", "Pair trail context with live conditions.");
    add("foragecast", "Seasonal land context when foraging literacy applies.");
  }
  if (cats.has("Conservation") || cats.has("Environmental Science")) {
    add("articles", "Stay with the curated field reading feed.");
  }

  if (!picks.length) {
    add("dashboard", "Start from Dashboard conditions when the story is place-based.");
  }

  return picks.slice(0, 3);
}

export function relatedActionLabel(product) {
  if (!product) return null;
  return {
    id: product.id,
    label: product.label,
    href: product.href,
    reason: product.reason || null
  };
}
