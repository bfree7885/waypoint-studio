# Future RAW architecture (document only — not built in V1)

V1 Auto Edit finishes **JPEG / PNG / WebP** decoded pixels in the browser.

## Honest limitation

- JPEG highlight/shadow clipping cannot be truly recovered.
- Demosaic / white-balance / tone curves from sensor data are out of scope for V1.
- Product copy must keep saying: JPEG ≠ RAW.

## Future path (desktop companion, not silent cloud)

Preferred stack when RAW is approved:

1. **Ingest** — LibRaw or rawpy decode + embed sidecar metadata.
2. **Develop** — darktable / RawTherapee style ops, or a thin local WASM/native bridge.
3. **Recipe** — reuse `waypoint-auto-edit-recipes-v1` ops list; add `sourceKind: "raw"` + linear-stage params.
4. **Export** — write JPEG/PNG Waypoint Edit; keep RAW file untouched.
5. **Library** — same `originalAssetId` / `editBlobKey` relationship.

Do **not** pretend browser Auto Edit is a RAW developer until this path ships.
