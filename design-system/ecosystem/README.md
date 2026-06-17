# Waypoint Studio Ecosystem Layer

Central inheritance for all products — no duplicated homepage or FGDS markup.

## Files

| File | Purpose |
|------|---------|
| [`product-registry.json`](product-registry.json) | Per-product sections, templates, domains |
| [`product-home-shell.html`](product-home-shell.html) | Copy-paste thin HTML for new apps |
| [`../js/wds-ecosystem.js`](../js/wds-ecosystem.js) | Renders shared home from registry + content |
| [`../scripts/write-product-shells.py`](../scripts/write-product-shells.py) | Regenerate placeholder app `index.html` files |

## Audit

[`docs/PRODUCT-FGDS-AUDIT.md`](../../docs/PRODUCT-FGDS-AUDIT.md) — per-product inheritance matrix.

## New product checklist

1. Add product to `product-registry.json`
2. Run `python3 design-system/scripts/write-product-shells.py` (extend script) or copy `product-home-shell.html`
3. Link `design-system/css/wds.css` + `wds.js`
4. `WDS.ecosystem.initProductHome({ product: 'slug', base: '../../design-system/' })`

## Browse

Serve from repo root:

- http://localhost:8080/apps/foragecast/ — live shared inheritance demo
