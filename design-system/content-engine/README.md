# Waypoint Content Engine — Data & Renderer

Regional field-guide content bundles. No APIs, no feeds.

**Blueprint:** [`docs/WAYPOINT-CONTENT-ENGINE.md`](../../docs/WAYPOINT-CONTENT-ENGINE.md)

## Files

| File | Role |
|------|------|
| `manifest.json` | Default region id |
| `content-types.json` | Spec for all 10 content types |
| `regions/pike-county-pa.json` | Launch bundle — Northeast PA |
| `../js/wds-content-engine.js` | Client renderer |
| `../css/wds-content-engine.css` | Section styles |

## Usage

```html
<div id="wds-content-engine" data-wds-region="pike-county-pa"></div>
<script src="design-system/js/wds.js" defer></script>
<script>
  document.addEventListener("DOMContentLoaded", function () {
    function boot() {
      if (window.WDS && WDS.contentEngine) {
        WDS.contentEngine.init({
          region: "pike-county-pa",
          base: "design-system/content-engine/",
          mount: document.getElementById("wds-content-engine"),
          wrapMain: false
        });
      } else requestAnimationFrame(boot);
    }
    boot();
  });
</script>
```

Products inherit via `contentEngineRegion` in `product-registry.json` + `WDS.ecosystem.initProductHome()`.

## Add a region

1. Copy `regions/pike-county-pa.json` → `regions/your-county.json`
2. Update `manifest.json` if changing default
3. Set `contentEngineRegion` in product registry

## View locally

- http://localhost:8080/ (root homepage)
- http://localhost:8080/apps/foragecast/ (product shell)
- http://localhost:8080/design-system/content-engine/demo.html
