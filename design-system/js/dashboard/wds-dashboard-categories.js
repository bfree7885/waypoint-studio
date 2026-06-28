/**
 * Dashboard widget categories — section order for grouped layout
 */
(function (global) {
  "use strict";

  var CATEGORIES = [
    { id: "conditions", label: "Current Conditions", order: 10 },
    { id: "sun-moon", label: "Sun & Moon", order: 20 },
    { id: "safety", label: "Safety", order: 25 },
    { id: "wildlife", label: "Wildlife", order: 30 },
    { id: "water", label: "Water", order: 35 },
    { id: "foraging", label: "Foraging", order: 45 },
    { id: "flora", label: "Flora", order: 55 },
    { id: "trails", label: "Trails", order: 70 },
    { id: "photography", label: "Photography", order: 80 },
    { id: "astronomy", label: "Astronomy", order: 90 },
    { id: "conservation", label: "Conservation", order: 110 },
    { id: "my-dashboard", label: "My Dashboard", order: 120 }
  ];

  function ordered(sectionOrder) {
    var list = CATEGORIES.slice();
    if (sectionOrder && sectionOrder.length) {
      list.sort(function (a, b) {
        var ia = sectionOrder.indexOf(a.id);
        var ib = sectionOrder.indexOf(b.id);
        if (ia === -1) ia = 999;
        if (ib === -1) ib = 999;
        return ia - ib || a.order - b.order;
      });
    } else {
      list.sort(function (a, b) { return a.order - b.order; });
    }
    return list;
  }

  function label(id) {
    var cat = CATEGORIES.filter(function (c) { return c.id === id; })[0];
    return cat ? cat.label : id;
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardCategories = {
    all: function () { return CATEGORIES.slice(); },
    ordered: ordered,
    label: label,
    defaultSectionOrder: function () {
      return CATEGORIES.map(function (c) { return c.id; });
    }
  };
})(window);
