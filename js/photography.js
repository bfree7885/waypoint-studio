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
    lastFocus: null,
    trapHandler: null
  };

  function galleryApi() {
    return global.WDS && global.WDS.gallery;
  }

  function escapeHtml(str) {
    if (galleryApi()) return galleryApi().escapeHtml(str);
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

  function studioCopy() {
    return global.WaypointStudioCopy || {};
  }

  function actionLabels() {
    var c = studioCopy().collections || {};
    return {
      living: c.bringToLife || "Bring to life",
      parallax: c.feelDepth || "Feel depth"
    };
  }

  function masonryClass(index) {
    return MASONRY_SIZES[index % MASONRY_SIZES.length];
  }

  function renderCategories() {
    if (!state.categoriesMount || !global.WaypointPhotographyData) return;

    var api = galleryApi();
    if (!api) return;

    state.categoriesMount.innerHTML = api.renderFilters(
      global.WaypointPhotographyData.categories(),
      state.activeCategory,
      {
        chipClass: "photo-filter-chip",
        includeAll: true,
        ariaLabel: "Filter collections"
      }
    );
  }

  function renderHero() {
    if (!state.heroMount || !global.WaypointPhotographyData) return;
    var photo = global.WaypointPhotographyData.featured();
    if (!photo) {
      state.heroMount.innerHTML = "";
      return;
    }

    var labels = actionLabels();

    state.heroMount.innerHTML =
      '<section class="photo-hero">' +
        '<button type="button" class="photo-hero-hit wds-gallery__hit" data-photo-id="' + photo.id + '" data-item-id="' + photo.id + '" aria-label="View ' + escapeHtml(photo.title) + '">' +
          '<img class="photo-hero-img" src="' + escapeHtml(photo.image) + '" alt="' + escapeHtml(photo.title) + '">' +
          '<div class="photo-hero-scrim" aria-hidden="true"></div>' +
          '<div class="photo-hero-inner">' +
            '<span class="photo-hero-kicker">' + escapeHtml(categoryLabel(photo.category)) + "</span>" +
            '<h3 class="photo-hero-title">' + escapeHtml(photo.title) + "</h3>" +
            (photo.caption ? '<p class="photo-hero-caption">' + escapeHtml(photo.caption) + "</p>" : "") +
            '<div class="photo-hero-meta">' +
              (photo.date ? "<span>" + escapeHtml(formatDate(photo.date)) + "</span>" : "") +
              (photo.location ? "<span>" + escapeHtml(photo.location) + "</span>" : "") +
            "</div>" +
          "</div>" +
        "</button>" +
        '<div class="photo-hero-actions">' +
          '<button type="button" class="btn btn-secondary btn-sm" data-action="living-scene" data-photo-id="' + photo.id + '">' + escapeHtml(labels.living) + "</button>" +
          '<button type="button" class="btn btn-ghost btn-sm" data-action="parallax" data-photo-id="' + photo.id + '">' + escapeHtml(labels.parallax) + "</button>" +
        "</div>" +
      "</section>";
  }

  function photoCardHtml(photo, index) {
    var sizeClass = masonryClass(index);
    return (
      '<article class="wds-gallery__item photo-card ' + sizeClass + '" data-photo-id="' + photo.id + '">' +
        '<button type="button" class="photo-card-hit wds-gallery__hit" data-photo-id="' + photo.id + '" data-item-id="' + photo.id + '" aria-label="View ' + escapeHtml(photo.title) + '">' +
          '<div class="photo-card-frame">' +
            '<img class="photo-card-img wds-gallery__img" src="' + escapeHtml(photo.image) + '" alt="" loading="lazy">' +
            '<div class="photo-card-shade" aria-hidden="true"></div>' +
            '<div class="photo-card-overlay">' +
              '<span class="photo-card-category">' + escapeHtml(categoryLabel(photo.category)) + "</span>" +
              '<h3 class="photo-card-title">' + escapeHtml(photo.title) + "</h3>" +
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
      state.galleryMount.innerHTML = '<p class="photo-gallery-empty muted">No frames in this collection.</p>';
      return;
    }

    var api = galleryApi();
    if (!api) {
      state.galleryMount.innerHTML = '<p class="photo-gallery-empty muted">Gallery unavailable.</p>';
      return;
    }

    state.galleryMount.innerHTML = api.renderGallery(photos, {
      masonry: true,
      itemRenderer: photoCardHtml
    });
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

  function bindFocusTrap() {
    unbindFocusTrap();
    if (!state.modalMount) return;

    state.trapHandler = function (e) {
      if (e.key !== "Tab" || state.modalMount.hidden) return;
      var dialog = state.modalMount.querySelector(".photo-modal-dialog");
      if (!dialog) return;
      var nodes = dialog.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!nodes.length) return;
      var first = nodes[0];
      var last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", state.trapHandler);
  }

  function unbindFocusTrap() {
    if (state.trapHandler) {
      document.removeEventListener("keydown", state.trapHandler);
      state.trapHandler = null;
    }
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
            '<span class="photo-modal-field-mark" aria-hidden="true"></span>' +
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
            '<span class="photo-modal-field-mark" aria-hidden="true"></span>' +
            '<h3 class="photo-modal-field-title" id="photo-field-heading">Field note</h3>' +
          "</div>" +
          '<div class="photo-modal-field-body">' +
            '<p class="muted">No field note for this frame.</p>' +
          "</div>" +
        "</section>";
    }

    var labels = actionLabels();

    state.modalMount.innerHTML =
      '<div class="photo-modal-backdrop" data-modal-close tabindex="-1"></div>' +
      '<div class="photo-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="photo-modal-title">' +
        '<button type="button" class="photo-modal-close" id="photo-modal-close" aria-label="Close">Close</button>' +
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
              '<h3 class="photo-modal-panel-title" id="photo-meta-heading">Details</h3>' +
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
              '<button type="button" class="btn btn-primary btn-sm" data-action="living-scene" data-photo-id="' + photo.id + '">' + escapeHtml(labels.living) + "</button>" +
              '<button type="button" class="btn btn-secondary btn-sm" data-action="parallax" data-photo-id="' + photo.id + '">' + escapeHtml(labels.parallax) + "</button>" +
            "</div>" +
          "</aside>" +
        "</div>" +
      "</div>";

    var closeBtn = state.modalMount.querySelector("#photo-modal-close");
    if (closeBtn) closeBtn.focus();
    bindFocusTrap();
  }

  function closeDetail() {
    state.activePhotoId = null;
    unbindFocusTrap();
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

  function resolvePhotoId(el) {
    return el.getAttribute("data-photo-id") || el.getAttribute("data-item-id");
  }

  function handleClick(e) {
    var actionBtn = e.target.closest("[data-action][data-photo-id]");
    if (actionBtn) {
      e.preventDefault();
      closeDetail();
      sendToWorkflow(actionBtn.getAttribute("data-photo-id"), actionBtn.getAttribute("data-action"));
      return;
    }

    if (e.target.closest("[data-modal-close]") || e.target.closest("#photo-modal-close")) {
      closeDetail();
      return;
    }

    var photoBtn = e.target.closest(".photo-card-hit, .photo-hero-hit, .wds-gallery__hit");
    if (photoBtn) {
      var id = resolvePhotoId(photoBtn);
      if (id) openPhoto(id);
    }
  }

  function handleCategoryClick(e) {
    var btn = e.target.closest(".photo-filter-chip, [data-category]");
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
