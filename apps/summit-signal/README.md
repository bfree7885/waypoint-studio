# Summit Signal

Waypoint field application for SOTA summit discovery and activation planning.

**V0.1** is the foundation: a mobile-first map of retrieved SOTA summits, summit detail, nearby comparison, and basic search. It is not a finished hiking or radio product.

Canonical documentation: [`docs/summit-signal/V0.1.md`](../../docs/summit-signal/V0.1.md)

## Run locally

From the repository root:

```bash
python3 -m http.server 8080
```

Open `http://127.0.0.1:8080/apps/summit-signal/`.

Optional live SOTA fetch (falls back to the labeled fixture on failure): `?live=1`.

## Tests

```bash
node automation/test-summit-signal-v0-1.mjs
node automation/test-summit-signal-v0-1-map-mobile.mjs
```

## Independence

Summit Signal is an independent application and is not affiliated with or endorsed by Summits on the Air (SOTA).
