"""Tests for Waypoint photo_pipeline (local, no network)."""
from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from PIL import Image

from photo_pipeline import catalog
from photo_pipeline.accessibility import generate_accessibility
from photo_pipeline.analyze import analyze_image
from photo_pipeline.approve import set_review_decision
from photo_pipeline.classify import classify_destinations
from photo_pipeline.enqueue import enqueue_imported_files
from photo_pipeline.hooks import future_hooks_manifest
from photo_pipeline.privacy import assess_privacy
from photo_pipeline.process import process_asset
from photo_pipeline.scores import score_image
from photo_pipeline.versions import generate_versions


def _make_jpeg(path: Path, color=(40, 120, 200), size=(800, 500)) -> Path:
    img = Image.new("RGB", size, color)
    img.save(path, "JPEG", quality=90)
    return path


class PhotoPipelineTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.library = Path(self.tmp.name) / "library"
        self.library.mkdir()
        self.photo = _make_jpeg(self.library / "sky-lake.jpg")

    def tearDown(self):
        self.tmp.cleanup()

    def test_enqueue_dedupes_by_hash(self):
        m1 = enqueue_imported_files([self.photo], library=self.library, card_name="t")
        m2 = enqueue_imported_files([self.photo], library=self.library, card_name="t2")
        self.assertEqual(len(m1["asset_ids"]), 1)
        self.assertEqual(m1["asset_ids"], m2["asset_ids"])

    def test_process_generates_analysis_and_versions(self):
        manifest = enqueue_imported_files([self.photo], library=self.library)
        aid = manifest["asset_ids"][0]
        with catalog.connect(self.library) as conn:
            result = process_asset(conn, aid, library=self.library)
            self.assertTrue(result["ok"])
            asset = catalog.get_asset(conn, aid)
        self.assertEqual(asset["status"], "needs_review")
        self.assertTrue(asset["analysis"].get("analyzable"))
        self.assertIn("technical", asset["scores"])
        self.assertIn("explanation", asset["scores"]["technical"])
        self.assertFalse(asset["privacy"].get("auto_publish", True))
        deriv = (asset["versions"] or {}).get("derivatives") or {}
        self.assertIn("thumbnail", deriv)
        self.assertTrue(Path(deriv["thumbnail"]["path"]).exists())
        # Original unchanged path still exists
        self.assertTrue(Path(asset["original_path"]).exists())

    def test_privacy_gps_flag(self):
        meta = {"gps": {"latitude": 1.0, "longitude": 2.0}}
        priv = assess_privacy(meta, {"content": {}})
        self.assertIn(priv["verdict"], ("Needs review", "Do not publish"))
        self.assertTrue(any(f["id"] == "gps_present" for f in priv["flags"]))
        self.assertFalse(priv["auto_publish"])

    def test_scores_and_classify_explain(self):
        analysis = analyze_image(self.photo, {})
        scores = score_image(analysis, {"dimensions": {"width": 800, "height": 500}})
        for key in (
            "technical",
            "artistic",
            "educational",
            "website_suitability",
            "background_suitability",
            "hero_suitability",
            "article_suitability",
        ):
            self.assertIn("explanation", scores[key])
        dest = classify_destinations(analysis, scores, {"verdict": "Safe"})
        self.assertTrue(dest["multi_label"])
        self.assertGreaterEqual(len(dest["destinations"]), 1)

    def test_accessibility_editable(self):
        analysis = analyze_image(self.photo, {"date": "2026:07:10 18:00:00", "camera": "Sony"})
        a11y = generate_accessibility({"date": "2026:07:10 18:00:00", "camera": "Sony A7"}, analysis)
        self.assertTrue(a11y["editable"])
        self.assertTrue(a11y["alt_text"])
        self.assertEqual(a11y["season"], "summer")

    def test_approve_without_publish_does_not_write_catalog(self):
        manifest = enqueue_imported_files([self.photo], library=self.library)
        aid = manifest["asset_ids"][0]
        with catalog.connect(self.library) as conn:
            process_asset(conn, aid, library=self.library)
        result = set_review_decision(aid, "approve", library=self.library, publish=False)
        self.assertTrue(result["ok"])
        self.assertIsNone(result.get("published"))

    def test_versions_do_not_replace_original(self):
        before = self.photo.read_bytes()
        generate_versions("testasset", self.photo, library=self.library)
        after = self.photo.read_bytes()
        self.assertEqual(before, after)

    def test_future_hooks_not_implemented(self):
        hooks = future_hooks_manifest()
        self.assertEqual(hooks["implemented"], [])
        self.assertIn("infrared", hooks["hooks"])


if __name__ == "__main__":
    unittest.main()
