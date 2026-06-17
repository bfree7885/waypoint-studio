#!/usr/bin/env python3
"""Write thin product shells that inherit WDS.ecosystem."""

from pathlib import Path

APPS = {
    "foragecast": ("ForageCast", "Learn when and where life offers itself — field-guide lessons, maps, and patient observation."),
    "fieldry": ("Fieldry", "Your journal on the trail — observation before interpretation, private by default."),
    "shed-hunting": ("Shed Hunting", "Patience, sign, slope, and the ethics of the quiet search."),
    "steepleaf": ("Steepleaf", "Botany with illustrations, species pages, and respect for rare plants."),
    "savant-sommelier": ("Savant Sommelier", "Connect landscape to flavor with attention and respect for place."),
    "signalterrain": ("SignalTerrain", "Navigation and terrain literacy — horizon, coordinates, geology, and astronomy."),
    "terrainbound": ("Terrainbound", "Routes, weather windows, turnaround ethics, and journals that honor turning back."),
}

TEMPLATE = '''<!DOCTYPE html>
<html lang="en" data-product="{slug}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="{desc}">
  <title>{name} — Waypoint Studio</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../../design-system/css/wds.css">
</head>
<body>
  <a class="wds-skip" href="#main">Skip to content</a>
  <div class="wds-app">
    <div id="wds-product-home" data-wds-product="{slug}"></div>
    <footer class="wds-footer">Waypoint Studio · Observe · Understand · Create · Share</footer>
  </div>
  <script src="../../design-system/js/wds.js" defer></script>
  <script defer>
    document.addEventListener("DOMContentLoaded", function () {{
      function boot() {{
        if (window.WDS && WDS.ecosystem) {{
          WDS.ecosystem.initProductHome({{ product: "{slug}", base: "../../design-system/" }});
        }} else {{
          requestAnimationFrame(boot);
        }}
      }}
      boot();
    }});
  </script>
</body>
</html>
'''

for slug, (name, desc) in APPS.items():
    Path(f"apps/{slug}/index.html").write_text(TEMPLATE.format(slug=slug, name=name, desc=desc))
    print(f"apps/{slug}/index.html")
