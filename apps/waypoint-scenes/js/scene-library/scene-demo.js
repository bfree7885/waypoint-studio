/**
 * Waypoint Scenes — demo seed for Scene Library.
 *
 * Seeds a small, honest set of Scenes using committed sample assets so the
 * library is never an empty dashboard on first open. Sample photos are
 * illustrative — photoCount may exceed the number of materialized thumbnails
 * (mirroring a real large shoot where not every frame is in memory).
 */
(function (global) {
  "use strict";

  // Paths resolve relative to /apps/waypoint-scenes/library/ and /scene/.
  // Using absolute-from-apps paths keeps them stable across depth.
  var ASSET = {
    mist: "/apps/waypoint-scenes/assets/Images/mist-valley.jpg",
    image0: "/apps/waypoint-scenes/assets/Images/image0.jpeg",
    edited: "/apps/waypoint-scenes/assets/Images/Edited-8190413.JPG",
    elk: "/apps/waypoint-scenes/images/portfolio/elk-dawn.svg",
    fern: "/apps/waypoint-scenes/images/portfolio/fern-cathedral.svg",
    thunder: "/apps/waypoint-scenes/images/portfolio/thunderhead.svg",
    fox: "/apps/waypoint-scenes/images/portfolio/red-fox.svg",
    coast: "/apps/waypoint-scenes/images/portfolio/coastal-fog.svg",
    aurora: "/apps/waypoint-scenes/images/portfolio/aurora.svg",
    oldGrowth: "/apps/waypoint-scenes/images/portfolio/old-growth.svg",
    milky: "/apps/waypoint-scenes/images/portfolio/milky-lake.svg",
    trail: "/apps/waypoint-scenes/images/portfolio/trail-journal.svg"
  };

  function photo(opts) {
    return global.WaypointSceneModels.createPhoto(opts);
  }

  function buildDemoScenes() {
    var M = global.WaypointSceneModels;
    var milfordPhotos = [];
    var covers = [ASSET.mist, ASSET.fern, ASSET.oldGrowth, ASSET.image0, ASSET.edited,
      ASSET.elk, ASSET.fox, ASSET.thunder, ASSET.coast, ASSET.milky, ASSET.aurora, ASSET.trail];
    var subjects = ["forest", "river", "mushrooms", "birds", "trail", "light"];
    var focals = [18, 18, 35, 35, 35, 70, 135, 135, 200];
    var hours = [18, 18, 19, 19, 19, 20, 20];

    for (var i = 0; i < 24; i++) {
      var h = hours[i % hours.length];
      var m = (i * 7) % 60;
      var capture = "2026-07-24T" + (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m + ":00.000Z";
      milfordPhotos.push(photo({
        filename: "DSC" + (24000 + i) + ".JPG",
        thumbnailUrl: covers[i % covers.length],
        originalRef: covers[i % covers.length],
        captureTime: capture,
        camera: {
          make: "Sony",
          model: "ILCE-6700",
          lens: i % 3 === 0 ? "Sony E 18-135mm F3.5-5.6 OSS" : (i % 3 === 1 ? "Sony FE 70-200mm F4 G OSS" : "Sigma 18-50mm F2.8 DC DN"),
          iso: [100, 200, 400, 800][i % 4],
          shutter: ["1/125", "1/250", "1/60", "1/500"][i % 4],
          aperture: [2.8, 4, 5.6, 8][i % 4],
          focalLengthMm: focals[i % focals.length]
        },
        subjectHints: [subjects[i % subjects.length], subjects[(i + 2) % subjects.length]],
        favorite: i === 3,
        flag: i === 7 ? "pick" : null,
        rating: i === 3 ? 5 : null
      }));
    }

    var milford = M.createScene({
      id: "scene-demo-milford-woods",
      title: "Milford Woods",
      location: "Milford, Pennsylvania",
      camera: "Sony a6700",
      lens: "Mixed — 18–200mm",
      captureDate: "2026-07-24T18:12:00.000Z",
      createdDate: "2026-07-24T21:40:00.000Z",
      importSource: M.SOURCE.sample,
      coverImageUrl: ASSET.mist,
      thumbnailUrl: ASSET.mist,
      photos: milfordPhotos,
      photoCount: 264,
      favoriteImageId: milfordPhotos[3].id,
      tags: ["woods", "evening", "pennsylvania"],
      storageLocations: ["This device", "Sample"],
      weather: { available: false, placeholder: true },
      notes: "Evening walk along the river after a warm day. Soft side light under the canopy.",
      status: M.STATUS.imported,
      analysisStatus: M.CAPABILITY_STATUS.notStarted,
      isSample: true,
      lastOpenedAt: null
    });

    var dawnPhotos = [
      photo({
        filename: "elk-dawn-01.jpg",
        thumbnailUrl: ASSET.elk,
        originalRef: ASSET.elk,
        captureTime: "2026-06-12T05:42:00.000Z",
        camera: { make: "Sony", model: "ILCE-6700", lens: "Sony FE 70-200mm F4 G OSS", iso: 800, shutter: "1/250", aperture: 4, focalLengthMm: 200 },
        subjectHints: ["wildlife", "elk"],
        favorite: true
      }),
      photo({
        filename: "elk-dawn-02.jpg",
        thumbnailUrl: ASSET.fox,
        originalRef: ASSET.fox,
        captureTime: "2026-06-12T05:55:00.000Z",
        camera: { make: "Sony", model: "ILCE-6700", lens: "Sony FE 70-200mm F4 G OSS", iso: 640, shutter: "1/320", aperture: 4, focalLengthMm: 180 },
        subjectHints: ["wildlife", "fox"]
      }),
      photo({
        filename: "meadow-light.jpg",
        thumbnailUrl: ASSET.aurora,
        originalRef: ASSET.aurora,
        captureTime: "2026-06-12T06:10:00.000Z",
        camera: { make: "Sony", model: "ILCE-6700", lens: "Sony E 18-135mm F3.5-5.6 OSS", iso: 200, shutter: "1/125", aperture: 5.6, focalLengthMm: 35 },
        subjectHints: ["meadow", "light"]
      })
    ];

    var dawn = M.createScene({
      id: "scene-demo-dawn-meadow",
      title: "Dawn Meadow",
      location: "Delaware Water Gap",
      camera: "Sony a6700",
      lens: "70–200mm",
      captureDate: "2026-06-12T05:42:00.000Z",
      createdDate: "2026-06-12T10:00:00.000Z",
      importSource: M.SOURCE.sample,
      coverImageUrl: ASSET.elk,
      thumbnailUrl: ASSET.elk,
      photos: dawnPhotos,
      photoCount: 48,
      favoriteImageId: dawnPhotos[0].id,
      tags: ["wildlife", "dawn"],
      storageLocations: ["This device", "Sample"],
      status: M.STATUS.reviewed,
      analysisStatus: M.CAPABILITY_STATUS.ready,
      isSample: true,
      lastOpenedAt: "2026-07-20T14:00:00.000Z"
    });

    var coastPhotos = [
      photo({
        filename: "coastal-fog-01.jpg",
        thumbnailUrl: ASSET.coast,
        originalRef: ASSET.coast,
        captureTime: "2026-05-03T07:20:00.000Z",
        camera: { make: "Fujifilm", model: "X-T5", lens: "XF 16-55mm F2.8", iso: 200, shutter: "1/60", aperture: 8, focalLengthMm: 23 },
        subjectHints: ["coast", "fog"]
      }),
      photo({
        filename: "thunderhead.jpg",
        thumbnailUrl: ASSET.thunder,
        originalRef: ASSET.thunder,
        captureTime: "2026-05-03T16:40:00.000Z",
        camera: { make: "Fujifilm", model: "X-T5", lens: "XF 16-55mm F2.8", iso: 100, shutter: "1/500", aperture: 8, focalLengthMm: 35 },
        subjectHints: ["sky", "storm"],
        favorite: true
      }),
      photo({
        filename: "milky-lake.jpg",
        thumbnailUrl: ASSET.milky,
        originalRef: ASSET.milky,
        captureTime: "2026-05-03T20:15:00.000Z",
        camera: { make: "Fujifilm", model: "X-T5", lens: "XF 16-55mm F2.8", iso: 1600, shutter: "8s", aperture: 4, focalLengthMm: 16 },
        subjectHints: ["night", "lake"]
      })
    ];

    var coast = M.createScene({
      id: "scene-demo-coastal-fog",
      title: "Coastal Fog",
      location: "Cape May, New Jersey",
      camera: "Fujifilm X-T5",
      lens: "XF 16-55mm",
      captureDate: "2026-05-03T07:20:00.000Z",
      createdDate: "2026-05-04T09:00:00.000Z",
      importSource: M.SOURCE.sample,
      coverImageUrl: ASSET.coast,
      thumbnailUrl: ASSET.coast,
      photos: coastPhotos,
      photoCount: 112,
      favoriteImageId: coastPhotos[1].id,
      tags: ["coast", "fog", "storm"],
      storageLocations: ["This device", "Sample"],
      status: M.STATUS.imported,
      analysisStatus: M.CAPABILITY_STATUS.notStarted,
      isSample: true
    });

    return [milford, dawn, coast];
  }

  function ensureSeeded() {
    var Store = global.WaypointSceneStore;
    var Models = global.WaypointSceneModels;
    if (!Store || !Models) return false;
    var meta = Store.loadMeta();
    var index = Store.loadIndex();
    if (meta.seededAt && index.length) return true;
    var demos = buildDemoScenes();
    demos.forEach(function (s) { Store.upsert(s); });
    meta.seededAt = new Date().toISOString();
    meta.schemaVersion = Models.SCHEMA_VERSION;
    Store.saveMeta(meta);
    return true;
  }

  global.WaypointSceneDemo = {
    ASSET: ASSET,
    buildDemoScenes: buildDemoScenes,
    ensureSeeded: ensureSeeded
  };
})(typeof window !== "undefined" ? window : globalThis);
