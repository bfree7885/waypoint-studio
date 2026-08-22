import fs from "fs";

export function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) {
    if (fallback !== null) return structuredClone(fallback);
    throw new Error(`Missing JSON file: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function writeJson(filePath, data) {
  fs.mkdirSync(pathDirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export function nowIso() {
  return new Date().toISOString();
}

function pathDirname(filePath) {
  const idx = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
  return idx === -1 ? "." : filePath.slice(0, idx);
}

export function nextId(items, prefix) {
  const nums = (items || []).map((t) => {
    const m = String(t.id || "").match(new RegExp(`^${prefix}-(\\d+)$`));
    return m ? Number(m[1]) : 0;
  });
  const n = Math.max(0, ...nums) + 1;
  return `${prefix}-${String(n).padStart(3, "0")}`;
}
