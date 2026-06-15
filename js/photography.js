(function (global) {
  "use strict";

  var MASONRY_SIZES = ["masonry-tall", "masonry-standard", "masonry-wide", "masonry-square"];

  var state = {
    mount: null,
    heroMount: null,
    galleryMount: null,
    categoriesMount: null,
    modalMount: null,
    activeCategory: "all",
    activePhotoId: null,
    lastFocus: null
  };

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(iso) {
    if (!iso) return "";
    try {
      return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    } catch (e) {
      return iso;
    }
  }

  function categoryLabel(id) {
    if (!global.WaypointPhotographyData) return id;
    var cat = global.WaypointPhotographyData.categories().find(function (c) {
      return c.id === id;
    });
    return cat ? cat.label : id;
  }

  function getPhotos() {
    if (!global.WaypointPhotographyData) return [];
    var photos = global.WaypointPhotographyData.byCategory(state.activeCategory);
    var featured = global.WaypointPhotographyData.featured();
    if (state.activeCategory === "all" && featured) {
      return photos.filter(function (p) {
        return p.id !== featured.id;
      });
    }
    return photos;
  }

  function masonryClass(index) {
    return MASONRY_SIZES[index % MASONRY_SIZES.length];
  }

  function renderCategories() {
    if (!state.categoriesMount || !global.WaypointPhotographyData) return;

    var cats = global.WaypointPhotographyData.categories();
    var html = '<button type="button" class="photo-filter-chip is-active" data-category="all" aria-pressed="true">All work</button>';
    cats.forEach(function (cat) {
      var active = state.activeCategory === cat.id;
      html +=
        '<button type="button" class="photo-filter-chip' + (active ? " is-active" : "") + '" ' +
        'data-category="' + cat.id + '" aria-pressed="' + (active ? "true" : "false") + '">' +
        escapeHtml(cat.label) + "</button>";
    });
    state.categoriesMount.innerHTML = html;
  }

  function renderHero() {
    if (!state.heroMount || !global.WaypointPhotographyData) return;
    var photo = global.WaypointPhotographyData.featured();
    if (!photo) {
      state.heroMount.innerHTML = "";
      return;
    }

    state.heroMount.innerHTML =
      '<section class="photo-hero">' +
        '<button type="button" class="photo-hero-hit" data-photo-id="' + photo.id + '" aria-label="View ' + escapeHtml(photo.title) + '">' +
          '<img class="photo-hero-img" src="' + escapeHtml(photo.image) + '" alt="' + escapeHtml(photo.title) + '">' +
          '<div class="photo-hero-scrim" aria-hidden="true"></div>' +
          '<div class="photo-hero-inner">' +
            '<span class="photo-hero-kicker">Featured · ' + escapeHtml(categoryLabel(photo.category)) + "</span>" +
            '<h3 class="photo-hero-title">' + escapeHtml(photo.title) + "</h3>" +
            (photo.caption ? '<p class="photo-hero-caption">' + escapeHtml(photo.caption) + "</p>" : "") +
            '<div class="photo-hero-meta">' +
              (photo.date ? "<span>" + escapeHtml(formatDate(photo.date)) + "</span>" : "") +
              (photo.location ? "<span>" + escapeHtml(photo.location) + "</span>" : "") +
            "</div>" +
            '<span class="photo-hero-cta">View photograph →</span>' +
          "</div>" +
        "</button>" +
        '<div class="photo-hero-actions">' +
          '<button type="button" class="btn btn-secondary btn-sm" data-action="living-scene" data-photo-id="' + photo.id + '">Create Living Scene</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-action="parallax" data-photo-id="' + photo.id + '">Create Interactive Parallax</button>' +
        "</div>" +
      "</section>";
  }

  function photoCardHtml(photo, index) {
    var sizeClass = masonryClass(index);
    return (
      '<article class="photo-card ' + sizeClass + '" data-photo-id="' + photo.id + '">' +
        '<button type="button" class="photo-card-hit" data-photo-id="' + photo.id + '" aria-label="View ' + escapeHtml(photo.title) + '">' +
          '<div class="photo-card-frame">' +
            '<img class="photo-card-img" src="' + escapeHtml(photo.image) + '" alt="" loading="lazy">' +
            '<div class="photo-card-shade" aria-hidden="true"></div>' +
            '<div class="photo-card-overlay">' +
              '<span class="photo-card-category">' + escapeHtml(categoryLabel(photo.category)) + "</span>" +
              '<h3 class="photo-card-title">' + escapeHtml(photo.title) + "</h3>" +
              (photo.location ? '<p class="photo-card-location">' + escapeHtml(photo.location) + "</p>" : "") +
            "</div>" +
          "</div>" +
        "</button>" +
      "</article>"
    );
  }

  function renderGallery() {
    if (!state.galleryMount) return;
    var photos = getPhotos();
    if (!photos.length) {
      state.galleryMount.innerHTML = '<p class="photo-gallery-empty muted">No photographs in this category yet.</p>';
      return;
    }

    state.galleryMount.innerHTML =
      '<div class="photo-masonry">' +
      photos.map(function (photo, i) { return photoCardHtml(photo, i); }).join("") +
      "</div>";
  }

  function metaItem(label, value) {
    if (!value) return "";
    return (
      '<div class="photo-meta-item">' +
        '<span class="photo-meta-label">' + escapeHtml(label) + "</span>" +
        '<span class="photo-meta-value">' + escapeHtml(value) + "</span>" +
      "</div>"
    );
  }

  function lockScroll() {
    document.body.classList.add("photo-modal-open");
  }

  function unlockScroll() {
    document.body.classList.remove("photo-modal-open");
  }

  function renderModal(photoId) {
    if (!state.modalMount || !global.WaypointPhotographyData) return;

    var photo = global.WaypointPhotographyData.get(photoId);
    if (!photo) {
      closeDetail();
      return;
    }

    state.activePhotoId = photoId;
    state.modalMount.hidden = false;
    lockScroll();

    var tagsHtml = "";
    if (photo.tags && photo.tags.length) {
      tagsHtml =
        '<div class="photo-modal-tags">' +
        photo.tags.map(function (tag) {
          return '<span class="photo-tag">' + escapeHtml(tag) + "</span>";
        }).join("") +
        "</div>";
    }

    var fieldPanel = "";
    if (photo.fieldNote) {
      fieldPanel =
        '<section class="photo-modal-field-panel" aria-labelledby="photo-field-heading">' +
          '<div class="photo-modal-field-header">' +
            '<span class="photo-modal-field-mark" aria-hidden="true">✎</span>' +
            '<h3 class="photo-modal-field-title" id="photo-field-heading">Field note</h3>' +
          "</div>" +
          '<div class="photo-modal-field-body">' +
            '<p>' + escapeHtml(photo.fieldNote) + "</p>" +
          "</div>" +
        "</section>";
    } else {
      fieldPanel =
        '<section class="photo-modal-field-panel photo-modal-field-panel-empty" aria-labelledby="photo-field-heading">' +
          '<div class="photo-modal-field-header">' +
            '<span class="photo-modal-field-mark" aria-hidden="true">✎</span>' +
            '<h3 class="photo-modal-field-title" id="photo-field-heading">Field note</h3>' +
          "</div>" +
          '<div class="photo-modal-field-body">' +
            '<p class="muted">No field note recorded for this frame.</p>' +
          "</div>" +
        "</section>";
    }

    state.modalMount.innerHTML =
      '<div class="photo-modal-backdrop" data-modal-close tabindex="-1"></div>' +
      '<div class="photo-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="photo-modal-title">' +
        '<button type="button" class="photo-modal-close" id="photo-modal-close" aria-label="Close photograph">×</button>' +
        '<div class="photo-modal-layout">' +
          '<figure class="photo-modal-figure">' +
            '<div class="photo-modal-image-wrap">' +
              '<img class="photo-modal-img" src="' + escapeHtml(photo.image) + '" alt="' + escapeHtml(photo.title) + '">' +
            "</div>" +
            (photo.caption ? '<figcaption class="photo-modal-caption">' + escapeHtml(photo.caption) + "</figcaption>" : "") +
          "</figure>" +
          '<aside class="photo-modal-aside">' +
            '<header class="photo-modal-header">' +
              '<span class="photo-modal-category">' + escapeHtml(categoryLabel(photo.category)) + "</span>" +
              '<h2 class="photo-modal-title" id="photo-modal-title">' + escapeHtml(photo.title) + "</h2>" +
            "</header>" +
            '<section class="photo-modal-meta-panel" aria-labelledby="photo-meta-heading">' +
              '<h3 class="photo-modal-panel-title" id="photo-meta-heading">Metadata</h3>' +
              '<div class="photo-modal-meta-grid">' +
                metaItem("Date", formatDate(photo.date)) +
                metaItem("Location", photo.location) +
                metaItem("Camera", photo.camera) +
                metaItem("Lens", photo.lens) +
                metaItem("Settings", photo.settings) +
              "</div>" +
            "</section>" +
            fieldPanel +
            tagsHtml +
            '<div class="photo-modal-actions">' +
              '<button type="button" class="btn btn-primary btn-sm" data-action="living-scene" data-photo-id="' + photo.id + '">Create Living Scene</button>' +
              '<button type="button" class="btn btn-secondary btn-sm" data-action="parallax" data-photo-id="' + photo.id + '">Create Interactive Parallax</button>' +
            "</div>" +
          "</aside>" +
        "</div>" +
      "</div>";

    var closeBtn = state.modalMount.querySelector("#photo-modal-close");
    if (closeBtn) closeBtn.focus();
  }

  function closeDetail() {
    state.activePhotoId = null;
    unlockScroll();
    if (state.modalMount) {
      state.modalMount.hidden = true;
      state.modalMount.innerHTML = "";
    }
    if (state.lastFocus && typeof state.lastFocus.focus === "function") {
      state.lastFocus.focus();
      state.lastFocus = null;
    }
  }

  function openPhoto(photoId) {
    state.lastFocus = document.activeElement;
    renderModal(photoId);
  }

  function sendToWorkflow(photoId, mode) {
    var photo = global.WaypointPhotographyData && global.WaypointPhotographyData.get(photoId);
    if (!photo || !global.WaypointSceneApp) return;

    if (mode === "living-scene") {
      global.WaypointSceneApp.loadPhotoForLivingScene(photo.image, photo.title);
    } else if (mode === "parallax") {
      global.WaypointSceneApp.loadPhotoForParallax(photo.image, photo.title);
    }
  }

  function handleClick(e) {
    var actionBtn = e.target.closest("[data-action][data-photo-id]");
    if (actionBtn) {
      e.preventDefault();
      sendToWorkflow(actionBtn.getAttribute("data-photo-id"), actionBtn.getAttribute("data-action"));
      return;
    }

    if (e.target.closest("[data-modal-close]") || e.target.closest("#photo-modal-close")) {
      closeDetail();
      return;
    }

    var photoBtn = e.target.closest(".photo-card-hit, .photo-hero-hit");
    if (photoBtn && photoBtn.getAttribute("data-photo-id")) {
      openPhoto(photoBtn.getAttribute("data-photo-id"));
    }
  }

  function handleCategoryClick(e) {
    var btn = e.target.closest(".photo-filter-chip");
    if (!btn) return;
    state.activeCategory = btn.getAttribute("data-category") || "all";
    closeDetail();
    renderCategories();
    renderGallery();
  }

  function renderAll() {
    renderHero();
    renderCategories();
    renderGallery();
  }

  function init(config) {
    state.mount = config.mount;
    if (!state.mount || !global.WaypointPhotographyData) return;

    state.heroMount = state.mount.querySelector("#photo-hero");
    state.categoriesMount = state.mount.querySelector("#photo-categories");
    state.galleryMount = state.mount.querySelector("#photo-gallery");
    state.modalMount = document.getElementById("photo-modal");

    renderAll();

    state.mount.addEventListener("click", handleClick);
    if (state.modalMount) {
      state.modalMount.addEventListener("click", handleClick);
    }
    if (state.categoriesMount) {
      state.categoriesMount.addEventListener("click", handleCategoryClick);
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && state.activePhotoId) closeDetail();
    });
  }

  global.WaypointPhotography = {
    init: init,
    openPhoto: openPhoto,
    closeDetail: closeDetail
  };
})(window);
