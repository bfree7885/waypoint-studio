(function (global) {
  "use strict";

  var GROUPS = [
    {
      id: "intelligence",
      title: "Scene intelligence",
      subtitle: "",
      features: [
        {
          id: "depth-estimation",
          title: "Automatic depth",
          description: "Depth maps from a single frame for true layer separation."
        },
        {
          id: "object-masking",
          title: "Object masking",
          description: "Isolate sky, water, trees, and subjects for targeted motion."
        }
      ]
    },
    {
      id: "motion",
      title: "Motion & atmosphere",
      subtitle: "",
      features: [
        {
          id: "tree-animation",
          title: "Tree animation",
          description: "Independent sway on masked canopy layers."
        },
        {
          id: "moving-clouds",
          title: "Moving clouds",
          description: "Cloud motion matched to sky geometry."
        },
        {
          id: "rippling-water-ai",
          title: "Rippling water",
          description: "Believable surface distortion on water regions."
        },
        {
          id: "animated-waterfalls",
          title: "Waterfalls",
          description: "Flowing cascade motion on detected falls."
        },
        {
          id: "wildlife-insertion",
          title: "Wildlife placement",
          description: "Subtle, natural wildlife in compatible scenes."
        }
      ]
    },
    {
      id: "sky",
      title: "Sky & night",
      subtitle: "",
      features: [
        {
          id: "moon-phases",
          title: "Moon phases",
          description: "Moon placement matched to sky perspective."
        },
        {
          id: "aurora",
          title: "Aurora",
          description: "Northern lights tuned to the horizon."
        },
        {
          id: "milky-way",
          title: "Milky Way",
          description: "Night-sky enhancement and galactic arc compositing."
        },
        {
          id: "meteor-showers",
          title: "Meteor showers",
          description: "Streaking meteors with natural timing."
        }
      ]
    },
    {
      id: "transform",
      title: "Transformation",
      subtitle: "",
      features: [
        {
          id: "season-conversion",
          title: "Season conversion",
          description: "Shift foliage, light, and atmosphere between seasons."
        },
        {
          id: "timelapse-creation",
          title: "Time-lapse",
          description: "Day-to-night and weather-progression sequences."
        }
      ]
    },
    {
      id: "export",
      title: "Export & delivery",
      subtitle: "",
      features: [
        {
          id: "video-export",
          title: "Video export",
          description: "Looping WebM or MP4 from your full effect stack."
        },
        {
          id: "live-photos",
          title: "Live Photos",
          description: "Short motion clips for phone lock screens."
        },
        {
          id: "desktop-wallpapers",
          title: "Desktop wallpapers",
          description: "High-resolution animated wallpapers."
        }
      ]
    }
  ];

  function getAllFeatures() {
    var all = [];
    GROUPS.forEach(function (group) {
      group.features.forEach(function (feature) {
        all.push({
          groupId: group.id,
          groupTitle: group.title,
          id: feature.id,
          title: feature.title,
          description: feature.description
        });
      });
    });
    return all;
  }

  function getGroup(id) {
    var i;
    for (i = 0; i < GROUPS.length; i++) {
      if (GROUPS[i].id === id) return GROUPS[i];
    }
    return null;
  }

  function createCard(feature) {
    var card = document.createElement("article");
    card.className = "coming-soon-card";
    card.setAttribute("data-feature", feature.id);

    var badge = document.createElement("span");
    badge.className = "coming-soon-badge";
    badge.textContent = "On the horizon";

    var title = document.createElement("h4");
    title.className = "coming-soon-title";
    title.textContent = feature.title;

    var desc = document.createElement("p");
    desc.className = "coming-soon-desc";
    desc.textContent = feature.description;

    card.appendChild(badge);
    card.appendChild(title);
    card.appendChild(desc);

    return card;
  }

  function buildPanel(container, options) {
    if (!container) return;
    options = options || {};
    container.innerHTML = "";

    var groups = GROUPS;
    if (options.groupId) {
      var single = getGroup(options.groupId);
      groups = single ? [single] : [];
    }

    groups.forEach(function (group) {
      var section = document.createElement("div");
      section.className = "coming-soon-group";
      section.setAttribute("data-group", group.id);

      var head = document.createElement("div");
      head.className = "coming-soon-group-head";

      var groupTitle = document.createElement("h3");
      groupTitle.className = "coming-soon-group-title";
      groupTitle.textContent = group.title;

      head.appendChild(groupTitle);

      if (group.subtitle) {
        var groupSub = document.createElement("p");
        groupSub.className = "coming-soon-group-sub muted";
        groupSub.textContent = group.subtitle;
        head.appendChild(groupSub);
      }

      section.appendChild(head);

      var grid = document.createElement("div");
      grid.className = "coming-soon-grid";

      group.features.forEach(function (feature) {
        grid.appendChild(createCard(feature));
      });

      section.appendChild(grid);
      container.appendChild(section);
    });
  }

  global.WaypointComingSoon = {
    GROUPS: GROUPS,
    getAllFeatures: getAllFeatures,
    getGroup: getGroup,
    buildPanel: buildPanel
  };
})(window);
