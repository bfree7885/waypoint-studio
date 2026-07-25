/**
 * Waypoint Scenes — minimal ZIP (STORED) writer
 * No compression, no external dependency, no CDN.
 * Suitable for already-compressed JPEG/PNG + text assets.
 */
(function (global) {
  "use strict";

  function crcTable() {
    var table = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[n] = c >>> 0;
    }
    return table;
  }

  var CRC_TABLE = null;

  function crc32(bytes) {
    if (!CRC_TABLE) CRC_TABLE = crcTable();
    var c = 0xffffffff;
    for (var i = 0; i < bytes.length; i++) {
      c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function strToU8(str) {
    if (typeof TextEncoder !== "undefined") {
      return new TextEncoder().encode(str);
    }
    var out = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 0xff;
    return out;
  }

  function u16(n) {
    var b = new Uint8Array(2);
    b[0] = n & 0xff;
    b[1] = (n >>> 8) & 0xff;
    return b;
  }

  function u32(n) {
    var b = new Uint8Array(4);
    b[0] = n & 0xff;
    b[1] = (n >>> 8) & 0xff;
    b[2] = (n >>> 16) & 0xff;
    b[3] = (n >>> 24) & 0xff;
    return b;
  }

  function concat(parts) {
    var total = 0;
    parts.forEach(function (p) {
      total += p.length;
    });
    var out = new Uint8Array(total);
    var o = 0;
    parts.forEach(function (p) {
      out.set(p, o);
      o += p.length;
    });
    return out;
  }

  /**
   * @param {{name:string, bytes:Uint8Array|string}[]} files
   * @returns {Uint8Array}
   */
  function buildZip(files) {
    var localParts = [];
    var centralParts = [];
    var offset = 0;
    var count = 0;

    (files || []).forEach(function (file) {
      if (!file || !file.name) return;
      var name = String(file.name).replace(/^\/+/, "").replace(/\\/g, "/");
      if (name.indexOf("..") >= 0) throw new Error("Unsafe zip path: " + name);
      var nameBytes = strToU8(name);
      var data =
        typeof file.bytes === "string"
          ? strToU8(file.bytes)
          : file.bytes instanceof Uint8Array
            ? file.bytes
            : new Uint8Array(file.bytes || []);
      var crc = crc32(data);
      var size = data.length;

      var local = concat([
        u32(0x04034b50),
        u16(20),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(crc),
        u32(size),
        u32(size),
        u16(nameBytes.length),
        u16(0),
        nameBytes,
        data
      ]);

      var central = concat([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(crc),
        u32(size),
        u32(size),
        u16(nameBytes.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        nameBytes
      ]);

      localParts.push(local);
      centralParts.push(central);
      offset += local.length;
      count += 1;
    });

    var centralDir = concat(centralParts);
    var end = concat([
      u32(0x06054b50),
      u16(0),
      u16(0),
      u16(count),
      u16(count),
      u32(centralDir.length),
      u32(offset),
      u16(0)
    ]);

    return concat(localParts.concat([centralDir, end]));
  }

  function bytesToBlob(bytes, mime) {
    return new Blob([bytes], { type: mime || "application/zip" });
  }

  global.WaypointScenesPortfolioOutputZip = {
    buildZip: buildZip,
    bytesToBlob: bytesToBlob,
    strToU8: strToU8,
    crc32: crc32
  };
})(typeof window !== "undefined" ? window : globalThis);
