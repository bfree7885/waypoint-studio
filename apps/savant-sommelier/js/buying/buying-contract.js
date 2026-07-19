/**
 * Savant Sommelier — buying architecture contract.
 * Future retailer / price / availability integration seams only.
 */
(function (global) {
  "use strict";

  var COMPARISON_FIELDS = [
    { id: "retailer", label: "Retailer", status: "contract-ready" },
    { id: "typicalPrice", label: "Typical price", status: "contract-ready" },
    { id: "historicalPricing", label: "Historical pricing", status: "planned" },
    { id: "value", label: "Value signal", status: "planned" },
    { id: "availability", label: "Availability", status: "contract-ready" },
    { id: "shippingRestrictions", label: "Shipping restrictions", status: "contract-ready" }
  ];

  function createOfferQuery(wineRef) {
    wineRef = wineRef || {};
    return {
      version: "0.1.0",
      requestedAt: new Date().toISOString(),
      wineId: wineRef.id || null,
      name: wineRef.name || null,
      vintage: wineRef.vintage || null,
      region: wineRef.region || null,
      fields: COMPARISON_FIELDS.map(function (f) { return f.id; }),
      note: "No live marketplace is wired — query object is ready for future adapters."
    };
  }

  function emptyComparison(wineRef) {
    return {
      status: "architecture-only",
      query: createOfferQuery(wineRef),
      offers: [],
      honesty: "Buying comparisons are not live. Discover teaches styles; cellar tracks your bottles; purchase rails come later."
    };
  }

  function describeFoundation() {
    return {
      version: "0.1.0",
      fields: COMPARISON_FIELDS,
      createOfferQuery: "SavantBuying.createOfferQuery",
      emptyComparison: "SavantBuying.emptyComparison"
    };
  }

  global.SavantBuying = {
    COMPARISON_FIELDS: COMPARISON_FIELDS,
    createOfferQuery: createOfferQuery,
    emptyComparison: emptyComparison,
    describeFoundation: describeFoundation
  };
})(typeof window !== "undefined" ? window : globalThis);
