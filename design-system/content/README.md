# Shared Content Library

Placeholder catalog for IA development and component testing across Waypoint Studio.

**Standard:** [`docs/FIELD-GUIDE-STANDARDS.md`](../../docs/FIELD-GUIDE-STANDARDS.md)

## Files (50 items each)

| File | Card type |
|------|-----------|
| [`articles.json`](articles.json) | Article cards |
| [`lessons.json`](lessons.json) | Lesson cards |
| [`videos.json`](videos.json) | Video cards |
| [`field-guides.json`](field-guides.json) | Field guide cards |
| [`challenges.json`](challenges.json) | Outdoor challenge cards |
| [`news.json`](news.json) | News / seasonal dispatch cards |

## Item shape

```json
{
  "id": "lesson-001",
  "title": "101 · Before you name anything",
  "summary": "Placeholder summary — observation first, investigation outdoors.",
  "type": "Lesson",
  "domain": "field-skills",
  "season": "late spring",
  "durationMinutes": 12,
  "placeholder": true
}
```

## Regenerate

```bash
python3 design-system/scripts/generate-foundation.py
```

Products replace placeholders with real curriculum and editorial content over time.
