/**
 * Waypoint Scenes — Portfolio Website Output · Package builder
 * Generates self-contained static gallery HTML/CSS/JS + image files for ZIP.
 * Progressive enhancement: gallery usable without JS where practical.
 */
(function (global) {
  "use strict";

  function Privacy() {
    return global.WaypointScenesPortfolioOutputPrivacy;
  }
  function Zip() {
    return global.WaypointScenesPortfolioOutputZip;
  }
  function Catalog() {
    return global.WaypointScenesPortfolioOutputCatalog;
  }

  function themeVars(appearance) {
    var dark = !appearance || appearance.theme !== "light";
    if (dark) {
      return {
        bg: "#12151c",
        ink: "#f4f1ea",
        muted: "rgba(244,241,234,0.72)",
        surface: "#1a1f2b",
        border: "rgba(155,143,217,0.22)",
        accent: "#c6ff4d",
        violet: "#9b7ed4"
      };
    }
    return {
      bg: "#f7f5f1",
      ink: "#1a1f2b",
      muted: "rgba(26,31,43,0.68)",
      surface: "#ffffff",
      border: "rgba(26,31,43,0.12)",
      accent: "#5a7a20",
      violet: "#6b4f9a"
    };
  }

  function maxWidthCss(key) {
    if (key === "narrow") return "42rem";
    if (key === "wide") return "72rem";
    return "56rem";
  }

  function buildCss(project) {
    var a = project.appearance || {};
    var t = themeVars(a);
    var gap = a.spacing === "compact" ? "0.85rem" : "1.35rem";
    var dens = a.gridDensity === "dense" ? "140px" : "180px";
    var fit = a.imageFit === "cover" ? "cover" : "contain";
    var align = a.titleAlignment === "center" ? "center" : "left";
    var capDisplay = a.captionVisibility === "hidden" ? "none" : "block";

    return (
      "/* Waypoint Scenes — portable portfolio gallery (local assets only) */\n" +
      ":root{--bg:" +
      t.bg +
      ";--ink:" +
      t.ink +
      ";--muted:" +
      t.muted +
      ";--surface:" +
      t.surface +
      ";--border:" +
      t.border +
      ";--accent:" +
      t.accent +
      ";--violet:" +
      t.violet +
      ";--max:" +
      maxWidthCss(a.maxContentWidth) +
      ";--gap:" +
      gap +
      ";}\n" +
      "*{box-sizing:border-box;}\n" +
      "html{scroll-behavior:smooth;}\n" +
      "@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto;}*{animation:none!important;transition:none!important;}}\n" +
      "body{margin:0;font-family:Georgia,'Times New Roman',serif;background:var(--bg);color:var(--ink);line-height:1.55;}\n" +
      "a{color:var(--violet);}\n" +
      ".skip{position:absolute;left:-9999px;}\n" +
      ".skip:focus{left:1rem;top:1rem;z-index:50;background:var(--surface);padding:.5rem .75rem;}\n" +
      ".wrap{max-width:var(--max);margin:0 auto;padding:clamp(1rem,3vw,2rem);}\n" +
      "header.site{text-align:" +
      align +
      ";margin-bottom:calc(var(--gap)*1.4);}\n" +
      "header.site h1{font-weight:400;font-size:clamp(1.85rem,4.5vw,2.75rem);margin:0 0 .5rem;letter-spacing:-.02em;}\n" +
      "header.site .lead{margin:0;color:var(--muted);max-width:38rem;" +
      (align === "center" ? "margin-left:auto;margin-right:auto;" : "") +
      "}\n" +
      ".trust{font-size:.85rem;color:var(--muted);margin-top:.75rem;}\n" +
      ".hero{margin:0 0 calc(var(--gap)*1.5);}\n" +
      ".hero img{display:block;width:100%;max-height:78vh;object-fit:" +
      fit +
      ";background:var(--surface);}\n" +
      ".grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(" +
      dens +
      ",1fr));gap:var(--gap);list-style:none;margin:0;padding:0;}\n" +
      ".grid a{display:block;color:inherit;text-decoration:none;}\n" +
      ".grid figure{margin:0;background:var(--surface);border:1px solid var(--border);}\n" +
      ".grid img{display:block;width:100%;aspect-ratio:4/3;object-fit:" +
      fit +
      ";background:#0a0c10;}\n" +
      ".grid figcaption,.editorial figcaption{display:" +
      capDisplay +
      ";padding:.65rem .75rem;font-size:.92rem;color:var(--muted);}\n" +
      ".editorial{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:calc(var(--gap)*1.5);}\n" +
      ".editorial figure{margin:0;}\n" +
      ".editorial img{display:block;width:100%;max-height:85vh;object-fit:" +
      fit +
      ";background:var(--surface);}\n" +
      ".editorial .role{font-size:.75rem;letter-spacing:.04em;text-transform:uppercase;color:var(--violet);margin:0 0 .35rem;}\n" +
      ".showcase{list-style:none;margin:0;padding:0;}\n" +
      ".showcase li{margin:0 0 calc(var(--gap)*1.25);}\n" +
      ".showcase img{display:block;width:100%;max-height:92vh;object-fit:" +
      fit +
      ";}\n" +
      ".meta{font-size:.8rem;color:var(--muted);margin-top:.35rem;}\n" +
      ".missing{padding:2rem;border:1px dashed var(--border);color:var(--muted);text-align:center;}\n" +
      "footer.site{margin-top:3rem;padding-top:1rem;border-top:1px solid var(--border);font-size:.85rem;color:var(--muted);}\n" +
      /* lightbox */
      ".viewer[hidden]{display:none!important;}\n" +
      ".viewer{position:fixed;inset:0;background:rgba(8,10,14,.92);z-index:40;display:flex;flex-direction:column;}\n" +
      ".viewer__bar{display:flex;gap:.5rem;align-items:center;justify-content:space-between;padding:.65rem 1rem;color:#f4f1ea;}\n" +
      ".viewer__stage{flex:1;display:flex;align-items:center;justify-content:center;padding:1rem;min-height:0;}\n" +
      ".viewer__stage img{max-width:100%;max-height:100%;object-fit:contain;}\n" +
      ".viewer__cap{padding:.75rem 1rem 1.25rem;color:rgba(244,241,234,.85);text-align:center;}\n" +
      ".viewer button{font:inherit;background:transparent;border:1px solid rgba(244,241,234,.35);color:#f4f1ea;padding:.4rem .7rem;cursor:pointer;}\n" +
      ".viewer button:focus{outline:2px solid var(--accent);outline-offset:2px;}\n"
    );
  }

  function buildViewerJs() {
    return (
      "(function(){\n" +
      "'use strict';\n" +
      "var root=document.getElementById('viewer');\n" +
      "if(!root)return;\n" +
      "var img=document.getElementById('viewer-img');\n" +
      "var cap=document.getElementById('viewer-cap');\n" +
      "var meta=document.getElementById('viewer-meta');\n" +
      "var items=[];\n" +
      "var index=0;\n" +
      "var lastFocus=null;\n" +
      "function collect(){\n" +
      "items=[];\n" +
      "document.querySelectorAll('[data-gallery-item]').forEach(function(el){\n" +
      "items.push({\n" +
      "src:el.getAttribute('href')||el.getAttribute('data-full')||'',\n" +
      "alt:el.getAttribute('data-alt')||'',\n" +
      "caption:el.getAttribute('data-caption')||'',\n" +
      "meta:el.getAttribute('data-meta')||''\n" +
      "});\n" +
      "});\n" +
      "}\n" +
      "function show(i){\n" +
      "if(!items.length)return;\n" +
      "index=(i+items.length)%items.length;\n" +
      "var it=items[index];\n" +
      "img.src=it.src;img.alt=it.alt||'';\n" +
      "cap.textContent=it.caption||'';\n" +
      "if(meta)meta.textContent=it.meta||'';\n" +
      "root.hidden=false;root.setAttribute('aria-hidden','false');\n" +
      "document.getElementById('viewer-close').focus();\n" +
      "}\n" +
      "function close(){\n" +
      "root.hidden=true;root.setAttribute('aria-hidden','true');\n" +
      "img.removeAttribute('src');\n" +
      "if(lastFocus&&lastFocus.focus)lastFocus.focus();\n" +
      "}\n" +
      "document.addEventListener('click',function(ev){\n" +
      "var a=ev.target.closest&&ev.target.closest('[data-gallery-item]');\n" +
      "if(a){\n" +
      "ev.preventDefault();\n" +
      "collect();\n" +
      "lastFocus=a;\n" +
      "var href=a.getAttribute('href');\n" +
      "var i=0;for(;i<items.length;i++){if(items[i].src===href)break;}\n" +
      "show(i);\n" +
      "}\n" +
      "});\n" +
      "document.getElementById('viewer-close').addEventListener('click',close);\n" +
      "document.getElementById('viewer-prev').addEventListener('click',function(){show(index-1);});\n" +
      "document.getElementById('viewer-next').addEventListener('click',function(){show(index+1);});\n" +
      "document.addEventListener('keydown',function(ev){\n" +
      "if(root.hidden)return;\n" +
      "if(ev.key==='Escape')close();\n" +
      "if(ev.key==='ArrowLeft')show(index-1);\n" +
      "if(ev.key==='ArrowRight')show(index+1);\n" +
      "});\n" +
      "})();\n"
    );
  }

  function roleHint(item, index, total, coverId, imageId) {
    if (coverId && imageId === coverId) return "Cover";
    if (index === 0) return "Opening";
    if (index === total - 1) return "Closing";
    var rationale = item && item.selectionRationale ? String(item.selectionRationale).toLowerCase() : "";
    if (rationale.indexOf("hero") >= 0) return "Hero";
    if (rationale.indexOf("detail") >= 0) return "Detail";
    if (rationale.indexOf("environment") >= 0) return "Environmental";
    if (rationale.indexOf("transition") >= 0) return "Transition";
    return "";
  }

  function metaLine(meta) {
    if (!meta) return "";
    var parts = [];
    if (meta.captureDate) parts.push(meta.captureDate);
    if (meta.location) parts.push(meta.location);
    if (meta.locationPrecise) {
      parts.push(meta.locationPrecise.lat.toFixed(5) + ", " + meta.locationPrecise.lon.toFixed(5));
    }
    if (meta.camera) parts.push(meta.camera);
    if (meta.lens) parts.push(meta.lens);
    if (meta.focalLengthMm != null) parts.push(meta.focalLengthMm + "mm");
    return parts.join(" · ");
  }

  /**
   * @param {object} ctx
   *  project, frames:[{imageId, fileName, content, meta, role, missing}], portfolioItemsById
   */
  function buildIndexHtml(ctx) {
    var P = Privacy();
    var esc = P.escapeHtml;
    var project = ctx.project;
    var frames = ctx.frames || [];
    var appearance = project.appearance || {};
    var layout = project.layout || "editorial";
    var coverId = project.coverImageId;
    var showCoverHero = appearance.coverDisplay !== "none" && appearance.coverDisplay !== "inline";

    var coverFrame = null;
    frames.forEach(function (f) {
      if (f.imageId === coverId) coverFrame = f;
    });

    var listClass = layout === "grid" ? "grid" : layout === "showcase" ? "showcase" : "editorial";
    var itemsHtml = frames
      .map(function (f, index) {
        var content = f.content || {};
        var title = content.title ? esc(content.title) : "";
        var caption = content.caption ? esc(content.caption) : "";
        var alt = content.altDecorative ? "" : esc(content.altText || content.title || project.title || "Photograph");
        var meta = metaLine(f.meta);
        var role = f.role ? esc(f.role) : "";
        if (f.missing) {
          return (
            "<li><div class=\"missing\" role=\"img\" aria-label=\"Missing photograph\">Photograph unavailable</div></li>"
          );
        }
        var href = "images/" + esc(f.fileName);
        var figCap =
          (title ? "<strong>" + title + "</strong>" : "") +
          (caption ? (title ? "<br>" : "") + caption : "") +
          (meta ? '<div class="meta">' + esc(meta) + "</div>" : "");
        var roleHtml = layout === "editorial" && role ? '<p class="role">' + role + "</p>" : "";
        var inner =
          roleHtml +
          '<a href="' +
          href +
          '" data-gallery-item data-alt="' +
          alt +
          '" data-caption="' +
          (content.caption ? esc(content.caption) : title) +
          '" data-meta="' +
          esc(meta) +
          '">' +
          '<img src="' +
          href +
          '" alt="' +
          alt +
          '" loading="lazy" decoding="async" width="1200" height="800">' +
          "</a>" +
          (figCap ? "<figcaption>" + figCap + "</figcaption>" : "");
        return "<li><figure>" + inner + "</figure></li>";
      })
      .join("\n");

    var hero = "";
    if (showCoverHero && coverFrame && !coverFrame.missing && layout !== "grid") {
      var c = coverFrame.content || {};
      var calt = c.altDecorative ? "" : esc(c.altText || c.title || project.title || "Cover photograph");
      hero =
        '<div class="hero"><img src="images/' +
        esc(coverFrame.fileName) +
        '" alt="' +
        calt +
        '"></div>';
    }

    return (
      "<!DOCTYPE html>\n" +
      '<html lang="en">\n' +
      "<head>\n" +
      '<meta charset="UTF-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
      "<title>" +
      esc(project.title || "Gallery") +
      "</title>\n" +
      '<meta name="description" content="' +
      esc(project.description || "Portfolio gallery") +
      '">\n' +
      '<meta name="referrer" content="no-referrer">\n' +
      '<link rel="stylesheet" href="styles.css">\n' +
      "</head>\n" +
      "<body>\n" +
      '<a class="skip" href="#gallery">Skip to gallery</a>\n' +
      '<div class="wrap">\n' +
      "<header class=\"site\">\n" +
      "<h1>" +
      esc(project.title || "Gallery") +
      "</h1>\n" +
      (project.description ? '<p class="lead">' + esc(project.description) + "</p>\n" : "") +
      '<p class="trust">Local gallery package — no tracking, no remote scripts.</p>\n' +
      "</header>\n" +
      hero +
      '<main id="gallery">\n' +
      '<ul class="' +
      listClass +
      '">\n' +
      itemsHtml +
      "\n</ul>\n" +
      "</main>\n" +
      '<footer class="site"><p>Exported from Waypoint Scenes as a portable draft. Not published automatically.</p></footer>\n' +
      "</div>\n" +
      '<div id="viewer" class="viewer" hidden aria-hidden="true" role="dialog" aria-modal="true" aria-label="Photograph viewer">\n' +
      '<div class="viewer__bar">\n' +
      '<button type="button" id="viewer-prev">Previous</button>\n' +
      '<button type="button" id="viewer-close">Close</button>\n' +
      '<button type="button" id="viewer-next">Next</button>\n' +
      "</div>\n" +
      '<div class="viewer__stage"><img id="viewer-img" alt=""></div>\n' +
      '<div class="viewer__cap" id="viewer-cap"></div>\n' +
      '<div class="viewer__cap meta" id="viewer-meta"></div>\n' +
      "</div>\n" +
      '<script src="gallery.js"><\/script>\n' +
      "</body>\n" +
      "</html>\n"
    );
  }

  function dataUrlToBytes(dataUrl) {
    if (!dataUrl || dataUrl.indexOf("base64,") < 0) return null;
    var b64 = dataUrl.split("base64,")[1];
    if (typeof atob === "function") {
      var bin = atob(b64);
      var out = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    }
    // Node Buffer path
    if (typeof Buffer !== "undefined") {
      return new Uint8Array(Buffer.from(b64, "base64"));
    }
    return null;
  }

  function extFromMime(mime, fallback) {
    if (mime === "image/png") return "png";
    if (mime === "image/webp") return "webp";
    if (mime === "image/gif") return "gif";
    if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
    return fallback || "jpg";
  }

  /**
   * Resolve image bytes for export. Prefer original when available; else thumbnail.
   * Async when Photo Library engine present; sync thumbnail path for tests.
   */
  function resolveImageBytes(img, opts) {
    opts = opts || {};
    var preferOriginal = opts.preferOriginal !== false;

    function fromThumb() {
      var url = img && img.media && img.media.thumbnailDataUrl;
      if (!url) return Promise.resolve({ missing: true });
      var bytes = dataUrlToBytes(url);
      if (bytes) {
        return Promise.resolve({
          bytes: bytes,
          kind: "thumbnail",
          ext: "jpg",
          approxBytes: bytes.length
        });
      }
      if (typeof fetch === "function") {
        return fetch(url)
          .then(function (r) {
            return r.arrayBuffer();
          })
          .then(function (buf) {
            var b = new Uint8Array(buf);
            return { bytes: b, kind: "thumbnail", ext: "jpg", approxBytes: b.length };
          })
          .catch(function () {
            return { missing: true };
          });
      }
      return Promise.resolve({ missing: true });
    }

    if (!img) return Promise.resolve({ missing: true });

    if (preferOriginal && global.WaypointPhotoLibraryStore && global.WaypointPhotoLibraryStore.getMedia) {
      var key = (img.media && img.media.originalBlobKey) || img.id;
      return global.WaypointPhotoLibraryStore.getMedia(key)
        .then(function (row) {
          if (row && row.blob) {
            return row.blob.arrayBuffer().then(function (buf) {
              var b = new Uint8Array(buf);
              return {
                bytes: b,
                kind: "original",
                ext: extFromMime(img.mimeType || row.blob.type, "jpg"),
                approxBytes: b.length
              };
            });
          }
          return fromThumb();
        })
        .catch(function () {
          return fromThumb();
        });
    }

    return fromThumb();
  }

  /**
   * Build export package files array (not yet zipped).
   */
  function buildPackageFiles(project, framesWithBytes, portfolioItemsById) {
    var P = Privacy();
    var frames = [];
    var usedNames = {};
    (framesWithBytes || []).forEach(function (f, index) {
      var content = (project.imageContent && project.imageContent[f.imageId]) || {};
      if (content.hidden) return;
      var seq = String(index + 1).padStart(3, "0");
      var base = P.sanitizeFilename(
        (content.title || "photo") + "-" + seq,
        "photo-" + seq
      );
      var ext = f.ext || "jpg";
      var fileName = P.collisionSafeName(base + "." + ext, usedNames);
      var item = portfolioItemsById && portfolioItemsById[f.imageId];
      frames.push({
        imageId: f.imageId,
        fileName: fileName,
        content: content,
        meta: f.meta || {},
        role: roleHint(item, frames.length, 0, project.coverImageId, f.imageId),
        missing: !!f.missing,
        bytes: f.bytes || null,
        kind: f.kind || null
      });
    });
    // Fix roles with correct totals
    frames.forEach(function (fr, i) {
      var item = portfolioItemsById && portfolioItemsById[fr.imageId];
      fr.role = roleHint(item, i, frames.length, project.coverImageId, fr.imageId);
    });

    var files = [
      { name: "index.html", bytes: buildIndexHtml({ project: project, frames: frames }) },
      { name: "styles.css", bytes: buildCss(project) },
      { name: "gallery.js", bytes: buildViewerJs() },
      {
        name: "README.txt",
        bytes:
          "Waypoint Scenes — portable portfolio gallery draft\n" +
          "================================================\n\n" +
          "Open index.html in a browser, or serve this folder with any static file server.\n" +
          "No network required. No analytics or remote scripts.\n" +
          "This package is a draft export — it was not published automatically.\n\n" +
          "Gallery title: " +
          (project.title || "") +
          "\n" +
          "Layout: " +
          (project.layout || "") +
          "\n" +
          "Export version: " +
          ((Catalog() && Catalog().EXPORT_VERSION) || "1.0.0") +
          "\n"
      }
    ];

    frames.forEach(function (fr) {
      if (fr.missing || !fr.bytes) return;
      files.push({ name: "images/" + fr.fileName, bytes: fr.bytes });
    });

    return { files: files, frames: frames };
  }

  function assembleZip(files) {
    return Zip().buildZip(files);
  }

  global.WaypointScenesPortfolioOutputPackage = {
    themeVars: themeVars,
    buildCss: buildCss,
    buildIndexHtml: buildIndexHtml,
    buildViewerJs: buildViewerJs,
    roleHint: roleHint,
    metaLine: metaLine,
    dataUrlToBytes: dataUrlToBytes,
    resolveImageBytes: resolveImageBytes,
    buildPackageFiles: buildPackageFiles,
    assembleZip: assembleZip
  };
})(typeof window !== "undefined" ? window : globalThis);
