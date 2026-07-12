/**
 * Minimal YAML reader/writer for Waypoint Engineering OS.
 * Supports the subset used under engineering YAML files.
 */
function parseScalar(raw) {
  const v = String(raw ?? "").trim();
  if (v === "" || v === "null" || v === "~") return null;
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  if (v.startsWith("[") && v.endsWith("]")) {
    const inner = v.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((p) => parseScalar(p.trim()));
  }
  return v;
}

function indentOf(line) {
  return line.match(/^ */)[0].length;
}

export function parse(text) {
  const lines = String(text)
    .replace(/\t/g, "  ")
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "" && !l.trim().startsWith("#"));

  let i = 0;

  function parseValue(minIndent) {
    if (i >= lines.length) return null;
    const line = lines[i];
    const ind = indentOf(line);
    if (ind < minIndent) return null;

    if (line.trim().startsWith("- ")) {
      return parseArray(minIndent);
    }
    return parseMap(minIndent);
  }

  function parseArray(minIndent) {
    const arr = [];
    while (i < lines.length) {
      const line = lines[i];
      const ind = indentOf(line);
      if (ind < minIndent) break;
      if (ind > minIndent) break;
      if (!line.trim().startsWith("- ")) break;

      const rest = line.trim().slice(2);
      i += 1;

      // Nested array/map immediately
      if (rest === "") {
        arr.push(parseValue(minIndent + 2));
        continue;
      }

      // "- key: value" starts a map item
      const km = rest.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
      if (km) {
        const obj = {};
        const key = km[1];
        const rhs = km[2];
        if (rhs === "") {
          obj[key] = peekIsCollection(minIndent + 2) ? parseValue(minIndent + 2) : null;
        } else {
          obj[key] = parseScalar(rhs);
        }
        // Continue reading map keys at indent > list indent (typically +2)
        Object.assign(obj, parseMapKeys(minIndent + 2));
        arr.push(obj);
        continue;
      }

      arr.push(parseScalar(rest));
    }
    return arr;
  }

  function peekIsCollection(minIndent) {
    if (i >= lines.length) return false;
    const ind = indentOf(lines[i]);
    if (ind < minIndent) return false;
    return true;
  }

  function parseMap(minIndent) {
    const obj = {};
    Object.assign(obj, parseMapKeys(minIndent));
    return obj;
  }

  function parseMapKeys(minIndent) {
    const obj = {};
    while (i < lines.length) {
      const line = lines[i];
      const ind = indentOf(line);
      if (ind < minIndent) break;
      if (ind > minIndent) {
        // orphan nested content — shouldn't happen if callers recurse
        break;
      }
      if (line.trim().startsWith("- ")) break;

      const m = line.trim().match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
      if (!m) {
        i += 1;
        continue;
      }
      const key = m[1];
      const rhs = m[2];
      i += 1;
      if (rhs === "") {
        if (i < lines.length && indentOf(lines[i]) >= minIndent + 2) {
          obj[key] = parseValue(minIndent + 2);
        } else {
          obj[key] = null;
        }
      } else {
        obj[key] = parseScalar(rhs);
      }
    }
    return obj;
  }

  if (!lines.length) return {};
  if (lines[0].trim().startsWith("- ")) return parseArray(0);
  return parseMap(0);
}

function dump(value, indent = 0) {
  const pad = " ".repeat(indent);
  if (value == null) return "null";
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (value === "" || /[:#\n\[\]{}]|^\s|\s$/.test(value)) return JSON.stringify(value);
    return value;
  }
  if (Array.isArray(value)) {
    if (!value.length) return "[]";
    return value
      .map((item) => {
        if (item != null && typeof item === "object" && !Array.isArray(item)) {
          const keys = Object.keys(item);
          if (!keys.length) return pad + "- {}";
          const [first, ...rest] = keys;
          let out = pad + "- " + first + ": " + inlineOrBlock(item[first], indent + 4, true);
          rest.forEach((k) => {
            out += "\n" + pad + "  " + k + ": " + inlineOrBlock(item[k], indent + 4, false);
          });
          return out;
        }
        if (Array.isArray(item) || (item != null && typeof item === "object")) {
          return pad + "-\n" + dump(item, indent + 2);
        }
        return pad + "- " + dump(item, 0);
      })
      .join("\n");
  }
  if (typeof value === "object") {
    const keys = Object.keys(value);
    if (!keys.length) return "{}";
    return keys
      .map((k) => pad + k + ": " + inlineOrBlock(value[k], indent + 2, false))
      .join("\n");
  }
  return String(value);
}

function inlineOrBlock(v, indent, afterDash) {
  if (v != null && typeof v === "object") {
    const body = dump(v, indent);
    return "\n" + body;
  }
  return dump(v, 0);
}

export function stringify(value) {
  return dump(value, 0) + "\n";
}
