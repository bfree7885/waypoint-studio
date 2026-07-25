/**
 * Waypoint Scenes — Portfolio Website Output · Privacy + sanitize + validate
 * Private by default. Treat all user text as untrusted.
 */
(function (global) {
  "use strict";

  function Catalog() {
    return global.WaypointScenesPortfolioOutputCatalog;
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function sanitizePlainText(s, maxLen) {
    var t = String(s == null ? "" : s)
      .replace(/\0/g, "")
      .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, "");
    if (maxLen && t.length > maxLen) t = t.slice(0, maxLen);
    return t;
  }

  /**
   * Safe portable filename segment — no paths, no traversal.
   */
  function sanitizeFilename(name, fallback) {
    var base = String(name == null ? "" : name)
      .replace(/\\/g, "/")
      .split("/")
      .pop();
    base = base
      .replace(/\0/g, "")
      .replace(/[<>:"|?*\u0000-\u001F]/g, "")
      .replace(/^\.+/, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 64);
    if (!base || base === "." || base === "..") base = fallback || "image";
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(base)) base = "file-" + base;
    return base;
  }

  function collisionSafeName(desired, used) {
    used = used || {};
    var name = desired;
    var i = 2;
    while (used[name]) {
      var dot = desired.lastIndexOf(".");
      if (dot > 0) {
        name = desired.slice(0, dot) + "-" + i + desired.slice(dot);
      } else {
        name = desired + "-" + i;
      }
      i += 1;
    }
    used[name] = true;
    return name;
  }

  /**
   * Public-safe metadata for one library image, honoring visibility flags.
   * Never includes private notes, internal analysis, filenames, or precise GPS unless opted in.
   */
  function publicMetadataForImage(img, visibility) {
    visibility = visibility || {};
    var out = {};
    if (!img) return out;

    if (visibility.captureDate && img.captureDate) {
      out.captureDate = String(img.captureDate).slice(0, 10);
      out.captureDateSource = "embedded-or-import";
    }

    if (visibility.camera && img.camera) {
      var camParts = [];
      if (img.camera.make) camParts.push(String(img.camera.make));
      if (img.camera.model) camParts.push(String(img.camera.model));
      if (camParts.length) out.camera = camParts.join(" ");
    }

    if (visibility.lens && img.camera && img.camera.lens) {
      out.lens = String(img.camera.lens);
    }

    if (visibility.focalLength && img.camera && img.camera.focalLengthMm != null) {
      out.focalLengthMm = img.camera.focalLengthMm;
    }

    // Broad location: user-authored only (tags / subjectHints that look like places are NOT inferred here).
    // We only expose a coarse note when GPS exists AND user opted into precise — otherwise broad is a user field.
    if (visibility.locationBroad && img.locationLabel) {
      out.location = String(img.locationLabel);
      out.locationKind = "user-authored";
    }

    if (visibility.locationPrecise && img.gps && img.gps.lat != null && img.gps.lon != null) {
      out.locationPrecise = {
        lat: img.gps.lat,
        lon: img.gps.lon
      };
      out.locationKind = "embedded-gps";
      out.locationWarning =
        "Precise coordinates are included because you enabled them. Prefer broad location for public galleries.";
    }

    return out;
  }

  function isPrivateFieldKey(key) {
    var banned = {
      filename: true,
      originalFilename: true,
      photographerNotes: true,
      aiNotes: true,
      selectionRationale: true,
      notes: true,
      gps: true,
      originalBlobKey: true,
      thumbBlobKey: true,
      contentFingerprint: true,
      moduleRefs: true,
      legacy: true,
      rating: true,
      favorite: true,
      selectionLabel: true
    };
    return !!banned[key];
  }

  /**
   * Validate project before export.
   * Returns { blocking: [], warnings: [], info: [] }
   */
  function validateProject(project, libraryById) {
    libraryById = libraryById || function () {
      return null;
    };
    var blocking = [];
    var warnings = [];
    var info = [];
    var Cat = Catalog();
    var guide = (Cat && Cat.SIZE_GUIDANCE) || {};

    if (!project) {
      blocking.push({ code: "no-project", message: "No website gallery project to export." });
      return { blocking: blocking, warnings: warnings, info: info };
    }

    var title = (project.title || "").trim();
    if (!title || title === "Untitled gallery") {
      warnings.push({ code: "empty-title", message: "Gallery title is empty or still the default." });
    }
    if (!title) {
      blocking.push({ code: "blank-title", message: "Add a gallery title before export." });
    }

    var visibleIds = (project.imageIds || []).filter(function (id) {
      var c = project.imageContent && project.imageContent[id];
      return !(c && c.hidden);
    });

    if (!visibleIds.length) {
      blocking.push({ code: "no-visible-images", message: "No visible photographs to include." });
    }

    var cover = project.coverImageId;
    if (cover) {
      var coverContent = project.imageContent && project.imageContent[cover];
      if (coverContent && coverContent.hidden) {
        blocking.push({ code: "cover-hidden", message: "Cover image is hidden in this gallery. Choose another cover or unhide it." });
      }
      if (visibleIds.indexOf(cover) < 0) {
        blocking.push({ code: "cover-unavailable", message: "Cover image is not in the visible set." });
      }
      var coverImg = libraryById(cover);
      if (!coverImg) {
        blocking.push({ code: "cover-missing", message: "Cover image is missing from the local library." });
      }
    }

    var missingAlt = 0;
    var missingFiles = [];
    var unsupported = [];
    visibleIds.forEach(function (id) {
      var img = libraryById(id);
      var content = (project.imageContent && project.imageContent[id]) || {};
      if (!img) {
        missingFiles.push(id);
        return;
      }
      var hasMedia =
        (img.media && (img.media.thumbnailDataUrl || img.media.hasThumbnail || img.media.hasOriginal)) ||
        false;
      if (!hasMedia) unsupported.push(id);

      if (content.altDecorative) return;
      if (!content.altText || !String(content.altText).trim()) missingAlt += 1;
    });

    if (missingFiles.length) {
      blocking.push({
        code: "missing-images",
        message:
          missingFiles.length +
          " photograph" +
          (missingFiles.length === 1 ? " is" : "s are") +
          " missing from the local library.",
        imageIds: missingFiles
      });
    }
    if (unsupported.length) {
      warnings.push({
        code: "unsupported-media",
        message: unsupported.length + " frame(s) lack a usable preview or original.",
        imageIds: unsupported
      });
    }
    if (missingAlt > 0) {
      warnings.push({
        code: "missing-alt",
        message:
          missingAlt +
          " visible image" +
          (missingAlt === 1 ? " is" : "s are") +
          " missing alt text. Drafts may continue; fix before sharing publicly."
      });
    }

    var incompleteCaptions = visibleIds.filter(function (id) {
      var c = project.imageContent && project.imageContent[id];
      return !(c && c.caption && String(c.caption).trim());
    }).length;
    if (incompleteCaptions > 0) {
      info.push({
        code: "optional-captions",
        message: incompleteCaptions + " image(s) have no public caption (optional)."
      });
    }

    if (project.metadataVisibility && project.metadataVisibility.locationPrecise) {
      warnings.push({
        code: "precise-location",
        message:
          "Precise GPS is enabled for this export. Coordinates will appear in the package. Prefer broad location for public galleries."
      });
    }

    if (visibleIds.length > (guide.softMaxImages || 80)) {
      warnings.push({
        code: "many-images",
        message:
          "This gallery has " +
          visibleIds.length +
          " visible images. Large exports may be slow or fail in the browser."
      });
    }

    return { blocking: blocking, warnings: warnings, info: info };
  }

  global.WaypointScenesPortfolioOutputPrivacy = {
    escapeHtml: escapeHtml,
    sanitizePlainText: sanitizePlainText,
    sanitizeFilename: sanitizeFilename,
    collisionSafeName: collisionSafeName,
    publicMetadataForImage: publicMetadataForImage,
    isPrivateFieldKey: isPrivateFieldKey,
    validateProject: validateProject
  };
})(typeof window !== "undefined" ? window : globalThis);
