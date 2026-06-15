(function (global) {
  "use strict";

  var CATEGORIES = [
    { id: "landscapes", label: "Landscapes" },
    { id: "wildlife", label: "Wildlife" },
    { id: "forests", label: "Forests" },
    { id: "weather", label: "Weather" },
    { id: "astronomy", label: "Astronomy" },
    { id: "field-notes", label: "Notes" }
  ];

  var PHOTOS = [
    {
      id: "mist-valley",
      title: "Mist Valley at First Light",
      image: "images/portfolio/mist-valley.svg",
      category: "landscapes",
      date: "2025-03-14",
      location: "Olympic Peninsula, Washington",
      camera: "Sony A7 IV",
      lens: "24–70mm f/2.8",
      settings: "ISO 200 · f/8 · 1/60s",
      caption: "Soft valley fog lifting as the sun finds the ridgeline.",
      fieldNote: "Waited an hour in cold stillness for the mist to part. The light lasted less than two minutes.",
      tags: ["fog", "valley", "dawn", "pacific northwest"]
    },
    {
      id: "elk-dawn",
      title: "Elk at Dawn",
      image: "images/portfolio/elk-dawn.svg",
      category: "wildlife",
      date: "2024-11-02",
      location: "Rocky Mountain National Park, Colorado",
      camera: "Sony A7 IV",
      lens: "100–400mm f/4.5–5.6",
      settings: "ISO 800 · f/5.6 · 1/320s",
      caption: "A bull elk crossing the meadow in early autumn frost.",
      fieldNote: "Kept low behind a fallen log. Wind was in my favor.",
      tags: ["elk", "wildlife", "meadow", "autumn"]
    },
    {
      id: "old-growth",
      title: "Old Growth Cedar",
      image: "images/portfolio/old-growth.svg",
      category: "forests",
      date: "2025-01-19",
      location: "Hoh Rain Forest, Washington",
      camera: "Fujifilm GFX 50S II",
      lens: "32–64mm f/4",
      settings: "ISO 400 · f/11 · 2s",
      caption: "Ancient cedar roots wrapped in moss and filtered green light.",
      fieldNote: "Tripod work in near-darkness. The forest feels like a cathedral when it's quiet.",
      tags: ["cedar", "moss", "rainforest", "long exposure"]
    },
    {
      id: "thunderhead",
      title: "Thunderhead Over Ridge",
      image: "images/portfolio/thunderhead.svg",
      category: "weather",
      date: "2024-07-22",
      location: "Glacier National Park, Montana",
      camera: "Sony A7 IV",
      lens: "16–35mm f/2.8",
      settings: "ISO 100 · f/10 · 1/125s",
      caption: "Anvil cloud building over the Continental Divide.",
      fieldNote: "Storm cells formed fast. Packed up when the first distant thunder rolled.",
      tags: ["storm", "clouds", "mountains", "summer"]
    },
    {
      id: "milky-lake",
      title: "Milky Way Over Still Lake",
      image: "images/portfolio/milky-lake.svg",
      category: "astronomy",
      date: "2024-08-11",
      location: "Crater Lake, Oregon",
      camera: "Sony A7 IV",
      lens: "14mm f/1.8",
      settings: "ISO 3200 · f/1.8 · 20s",
      caption: "Core rising over mirror-still water before moonrise.",
      fieldNote: "No headlamp after setup. Listened to the lake lap against stone all night.",
      tags: ["milky way", "night", "reflection", "astro"]
    },
    {
      id: "trail-journal",
      title: "Trail Journal — Ridge Camp",
      image: "images/portfolio/trail-journal.svg",
      category: "field-notes",
      date: "2025-02-08",
      location: "North Cascades, Washington",
      camera: "iPhone 15 Pro",
      lens: "24mm",
      settings: "ISO 64 · f/1.8 · 1/120s",
      caption: "Notebook, map, and tea at camp before the morning push.",
      fieldNote: "Documenting conditions matters as much as the hero shot. Wind picked up after noon.",
      tags: ["field notes", "camp", "journal", "backcountry"]
    },
    {
      id: "coastal-fog",
      title: "Coastal Fog Line",
      image: "images/portfolio/coastal-fog.svg",
      category: "landscapes",
      date: "2024-10-05",
      location: "Big Sur, California",
      camera: "Sony A7 IV",
      lens: "70–200mm f/2.8",
      settings: "ISO 160 · f/8 · 1/200s",
      caption: "Fog pouring over sea cliffs like a slow waterfall.",
      tags: ["coast", "fog", "cliffs", "pacific"]
    },
    {
      id: "red-fox",
      title: "Red Fox in Meadow Grass",
      image: "images/portfolio/red-fox.svg",
      category: "wildlife",
      date: "2025-04-18",
      location: "Denali National Park, Alaska",
      camera: "Sony A7 IV",
      lens: "200–600mm f/5.6–6.3",
      settings: "ISO 1250 · f/6.3 · 1/800s",
      caption: "Young fox pausing mid-hunt in late evening light.",
      fieldNote: "Patience over pursuit. It returned to the same meadow three evenings in a row.",
      tags: ["fox", "wildlife", "meadow", "alaska"]
    },
    {
      id: "fern-cathedral",
      title: "Fern Cathedral",
      image: "images/portfolio/fern-cathedral.svg",
      category: "forests",
      date: "2024-05-30",
      location: "Redwood National Park, California",
      camera: "Fujifilm GFX 50S II",
      lens: "110mm f/2",
      settings: "ISO 200 · f/4 · 1/30s",
      caption: "Sword ferns beneath old-growth canopy in diffused light.",
      tags: ["ferns", "redwoods", "understory", "green"]
    },
    {
      id: "winter-squall",
      title: "Winter Squall",
      image: "images/portfolio/winter-squall.svg",
      category: "weather",
      date: "2025-01-03",
      location: "Banff National Park, Alberta",
      camera: "Sony A7 IV",
      lens: "24–70mm f/2.8",
      settings: "ISO 400 · f/5.6 · 1/250s",
      caption: "Snow squall crossing the lake before clearing to blue.",
      fieldNote: "Hands numb. The contrast when the storm passed was worth every minute.",
      tags: ["snow", "storm", "winter", "lake"]
    },
    {
      id: "aurora-borealis",
      title: "Aurora Over Frozen Lake",
      image: "images/portfolio/aurora.svg",
      category: "astronomy",
      date: "2024-03-21",
      location: "Interior Alaska",
      camera: "Sony A7 IV",
      lens: "14mm f/1.8",
      settings: "ISO 1600 · f/2 · 8s",
      caption: "Green curtains reflected on black ice.",
      fieldNote: "−18°F. Batteries in the inside pocket. Aurora arrived without warning.",
      tags: ["aurora", "night", "winter", "reflection"]
    },
    {
      id: "first-light-notes",
      title: "First Light — Field Notes",
      image: "images/portfolio/first-light-notes.svg",
      category: "field-notes",
      date: "2024-09-12",
      location: "Wind River Range, Wyoming",
      camera: "Ricoh GR III",
      lens: "18mm f/2.8",
      settings: "ISO 200 · f/5.6 · 1/250s",
      caption: "Gear laid out before a high-alpine start.",
      fieldNote: "Altitude 10,200 ft. Logged temperature, wind, and cloud cover for the week.",
      tags: ["field notes", "alpine", "gear", "morning"]
    }
  ];

  function categories() {
    return CATEGORIES.slice();
  }

  function all() {
    return PHOTOS.slice();
  }

  function get(id) {
    return PHOTOS.find(function (p) {
      return p.id === id;
    }) || null;
  }

  function featured() {
    return get("mist-valley") || PHOTOS[0];
  }

  function byCategory(categoryId) {
    if (!categoryId || categoryId === "all") return all();
    return PHOTOS.filter(function (p) {
      return p.category === categoryId;
    });
  }

  global.WaypointPhotographyData = {
    categories: categories,
    all: all,
    get: get,
    featured: featured,
    byCategory: byCategory
  };
})(window);
