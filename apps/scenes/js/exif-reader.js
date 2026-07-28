/**
 * JPEG EXIF reader — minimal, no dependencies.
 * Reads common capture metadata for Photo Coach context.
 */
(function (global) {
  "use strict";

  function readUint16(view, offset, little) {
    return little ? view.getUint16(offset, true) : view.getUint16(offset, false);
  }

  function readUint32(view, offset, little) {
    return little ? view.getUint32(offset, true) : view.getUint32(offset, false);
  }

  function rational(view, offset, little) {
    var num = readUint32(view, offset, little);
    var den = readUint32(view, offset + 4, little);
    if (!den) return null;
    return num / den;
  }

  function parseIfd(view, offset, little, tags) {
    if (offset + 2 > view.byteLength) return;
    var count = readUint16(view, offset, little);
    offset += 2;
    for (var i = 0; i < count; i += 1) {
      if (offset + 12 > view.byteLength) break;
      var tag = readUint16(view, offset, little);
      var type = readUint16(view, offset + 2, little);
      var countVal = readUint32(view, offset + 4, little);
      var dataOffset = offset + 8;
      var valueOffset = countVal * (type === 1 || type === 2 || type === 6 || type === 7 ? 1 : type === 3 ? 2 : type === 4 || type === 9 ? 4 : 8) > 4
        ? readUint32(view, dataOffset, little)
        : dataOffset;
      tags[tag] = { type: type, count: countVal, offset: valueOffset, little: little };
      offset += 12;
    }
  }

  function readAscii(view, offset, len) {
    var s = "";
    for (var i = 0; i < len; i += 1) {
      var c = view.getUint8(offset + i);
      if (!c) break;
      s += String.fromCharCode(c);
    }
    return s.trim();
  }

  function tagValue(view, entry) {
    if (!entry) return null;
    var o = entry.offset;
    var little = entry.little;
    if (entry.type === 2) return readAscii(view, o, entry.count);
    if (entry.type === 3 && entry.count === 1) return readUint16(view, o, little);
    if (entry.type === 4 && entry.count === 1) return readUint32(view, o, little);
    if (entry.type === 5 && entry.count === 1) return rational(view, o, little);
    if (entry.type === 5 && entry.count === 2) {
      return { num: rational(view, o, little), den: rational(view, o + 8, little) };
    }
    return null;
  }

  function parseExif(buffer) {
    var view = new DataView(buffer);
    if (view.byteLength < 4) return null;
    if (view.getUint16(0) !== 0xffd8) return null;
    var offset = 2;
    while (offset + 4 < view.byteLength) {
      if (view.getUint8(offset) !== 0xff) break;
      var marker = view.getUint8(offset + 1);
      var len = view.getUint16(offset + 2);
      if (marker === 0xe1) {
        var exifHeader = readAscii(view, offset + 4, 4);
        if (exifHeader === "Exif") {
          var tiff = offset + 10;
          var little = view.getUint16(tiff) === 0x4949;
          var ifd0 = readUint32(view, tiff + 4, little);
          var tags = {};
          parseIfd(view, tiff + ifd0, little, tags);
          var exifIfd = tags[0x8769];
          var gpsIfd = tags[0x8825];
          var exifTags = {};
          var gpsTags = {};
          if (exifIfd) parseIfd(view, tiff + tagValue(view, exifIfd), little, exifTags);
          if (gpsIfd) parseIfd(view, tiff + tagValue(view, gpsIfd), little, gpsTags);

          var dt = tagValue(view, tags[0x0132]) || tagValue(view, exifTags[0x9003]) || tagValue(view, exifTags[0x9004]);
          var make = tagValue(view, tags[0x010f]);
          var model = tagValue(view, tags[0x0110]);
          var iso = tagValue(view, exifTags[0x8827]);
          var focal = tagValue(view, exifTags[0x920a]);
          var exposure = tagValue(view, exifTags[0x829a]);
          var fnum = tagValue(view, exifTags[0x829d]);
          var orient = tagValue(view, tags[0x0112]);

          var lat = null;
          var lng = null;
          if (gpsTags[0x0002] && gpsTags[0x0004]) {
            var latRef = tagValue(view, gpsTags[0x0001]);
            var lngRef = tagValue(view, gpsTags[0x0003]);
            var latParts = [
              tagValue(view, gpsTags[0x0002]),
              tagValue(view, { type: 5, count: 1, offset: gpsTags[0x0002].offset + 8, little: little }),
              tagValue(view, { type: 5, count: 1, offset: gpsTags[0x0002].offset + 16, little: little })
            ];
            var lngParts = [
              tagValue(view, gpsTags[0x0004]),
              tagValue(view, { type: 5, count: 1, offset: gpsTags[0x0004].offset + 8, little: little }),
              tagValue(view, { type: 5, count: 1, offset: gpsTags[0x0004].offset + 16, little: little })
            ];
            if (latParts[0] != null) {
              lat = latParts[0].num + latParts[1].num / 60 + latParts[2].num / 3600;
              if (latRef === "S") lat = -lat;
            }
            if (lngParts[0] != null) {
              lng = lngParts[0].num + lngParts[1].num / 60 + lngParts[2].num / 3600;
              if (lngRef === "W") lng = -lng;
            }
          }

          return {
            dateTime: dt || null,
            make: make || null,
            model: model || null,
            iso: iso != null ? Number(iso) : null,
            focalLengthMm: focal != null ? Math.round(focal * 10) / 10 : null,
            exposureTimeSec: exposure != null ? exposure : null,
            fNumber: fnum != null ? Math.round(fnum * 10) / 10 : null,
            orientation: orient != null ? Number(orient) : null,
            gps: lat != null && lng != null ? { lat: lat, lng: lng } : null,
            hasExif: true,
            trust: "Live"
          };
        }
      }
      offset += 2 + len;
    }
    return { hasExif: false, trust: "Not yet available" };
  }

  function readFromFile(file) {
    if (!file) return Promise.resolve(null);
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = function () {
        try {
          resolve(parseExif(reader.result));
        } catch (e) {
          resolve({ hasExif: false, trust: "Not yet available", error: e.message });
        }
      };
      reader.onerror = function () { resolve(null); };
      reader.readAsArrayBuffer(file.slice(0, Math.min(file.size, 256000)));
    });
  }

  function formatExposure(sec) {
    if (sec == null) return null;
    if (sec >= 1) return sec.toFixed(1) + "s";
    return "1/" + Math.round(1 / sec);
  }

  function formatMeta(meta) {
    if (!meta || !meta.hasExif) return [];
    var lines = [];
    if (meta.make || meta.model) lines.push([meta.make, meta.model].filter(Boolean).join(" "));
    if (meta.focalLengthMm) lines.push(meta.focalLengthMm + "mm");
    if (meta.fNumber) lines.push("f/" + meta.fNumber);
    if (meta.exposureTimeSec) lines.push(formatExposure(meta.exposureTimeSec));
    if (meta.iso) lines.push("ISO " + meta.iso);
    if (meta.dateTime) lines.push(meta.dateTime);
    if (meta.gps) lines.push(meta.gps.lat.toFixed(4) + ", " + meta.gps.lng.toFixed(4));
    return lines;
  }

  global.WaypointExifReader = {
    parseExif: parseExif,
    readFromFile: readFromFile,
    formatMeta: formatMeta,
    formatExposure: formatExposure
  };
})(window);
