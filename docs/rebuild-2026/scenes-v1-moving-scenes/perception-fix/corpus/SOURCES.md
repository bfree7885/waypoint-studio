# Perception regression corpus

## Real six (permanent)

Canonical files (do not duplicate multi-MP masters in git):

`docs/rebuild-2026/scenes-v1-moving-scenes/real-photo-review/sources/`

| Case | File |
|------|------|
| A cloud | A-cloud-DSC00745.JPG |
| B water | B-water-DSC00314.JPG |
| C fog | C-fog-fogforest.jpg |
| D wildlife | D-wildlife-Robin.JPG |
| E static | E-static-Edited-8190413.JPG |
| F complex | F-complex-mist-valley.jpg |

Harnesses resolve via that directory. Review ZIP includes copies under `perception-fix/corpus/real-six/` for offline QC.

## Hard-negative water

`perception-fix/hard-negative-water/` — sky, cloud-mountain, fog, static rock, dry blue object, tree-trunk sky.

## Positive water

`perception-fix/positive-water/` — lake-shore + auto-edit water fixtures; real B via sources above.

## Stats

See `../confusion-matrix.json`.
