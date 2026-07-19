"""
CLI: python -m photo_pipeline <command>
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="photo_pipeline",
        description="Waypoint Studio Automated Photo Pipeline (local-first)",
    )
    parser.add_argument(
        "--library",
        type=Path,
        default=None,
        help="Photo library root (default: ~/Pictures/Waypoint Library)",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_enq = sub.add_parser("enqueue", help="Enqueue files into analysis queue")
    p_enq.add_argument("files", nargs="+", type=Path)
    p_enq.add_argument("--card", default="manual")

    p_run = sub.add_parser("process", help="Process pending analysis queue")
    p_run.add_argument("--limit", type=int, default=25)

    p_exp = sub.add_parser("export-review", help="Export review-queue.json for UI")
    p_exp.add_argument("--limit", type=int, default=500)

    p_list = sub.add_parser("list", help="List assets")
    p_list.add_argument("--status", default=None)
    p_list.add_argument("--limit", type=int, default=50)

    p_dec = sub.add_parser("decide", help="Record review decision")
    p_dec.add_argument("asset_id")
    p_dec.add_argument(
        "decision",
        choices=["approve", "reject", "needs_editing", "hide"],
    )
    p_dec.add_argument(
        "--publish",
        action="store_true",
        help="On approve, copy derivatives into data/media (explicit only)",
    )
    p_dec.add_argument("--dest", action="append", default=[], help="Destination app (repeatable)")

    p_bulk = sub.add_parser("bulk", help="Bulk decisions")
    p_bulk.add_argument("decision", choices=["approve", "reject", "needs_editing", "hide"])
    p_bulk.add_argument("--ids", nargs="+", required=True)
    p_bulk.add_argument("--publish", action="store_true")
    p_bulk.add_argument("--only-safe", action="store_true")

    p_scan = sub.add_parser(
        "scan-library",
        help="Enqueue existing library images not yet in pipeline DB",
    )
    p_scan.add_argument("--limit", type=int, default=100)

    sub.add_parser("hooks", help="Show future expansion hooks")

    args = parser.parse_args(argv)
    library = args.library

    if args.cmd == "enqueue":
        from .enqueue import enqueue_imported_files

        manifest = enqueue_imported_files(
            args.files, library=library, card_name=args.card
        )
        print(json.dumps(manifest, indent=2))
        return 0

    if args.cmd == "process":
        from .process import process_queue

        result = process_queue(library=library, limit=args.limit)
        print(json.dumps(result, indent=2, default=str))
        return 0 if not result.get("errors") else 1

    if args.cmd == "export-review":
        from .review_export import export_review_bundle

        path = export_review_bundle(library=library, limit=args.limit)
        print(str(path))
        return 0

    if args.cmd == "list":
        from . import catalog

        with catalog.connect(library) as conn:
            assets = catalog.list_assets(conn, status=args.status, limit=args.limit)
        slim = [
            {
                "id": a["id"],
                "status": a["status"],
                "name": a.get("source_name"),
                "privacy": (a.get("privacy") or {}).get("verdict"),
            }
            for a in assets
        ]
        print(json.dumps(slim, indent=2))
        return 0

    if args.cmd == "decide":
        from .approve import set_review_decision

        result = set_review_decision(
            args.asset_id,
            args.decision,
            library=library,
            destinations=args.dest or None,
            publish=args.publish,
        )
        print(json.dumps(result, indent=2, default=str))
        return 0 if result.get("ok") else 1

    if args.cmd == "bulk":
        from .approve import bulk_decide

        result = bulk_decide(
            args.ids,
            args.decision,
            library=library,
            publish=args.publish,
            only_safe=args.only_safe,
        )
        print(json.dumps(result, indent=2, default=str))
        return 0

    if args.cmd == "scan-library":
        return _scan_library(library, args.limit)

    if args.cmd == "hooks":
        from .hooks import future_hooks_manifest

        print(json.dumps(future_hooks_manifest(), indent=2))
        return 0

    return 1


def _scan_library(library: Path | None, limit: int) -> int:
    from .enqueue import enqueue_imported_files
    from .paths import library_root

    root = library or library_root()
    exts = {".arw", ".jpg", ".jpeg", ".png", ".heif", ".hif", ".mov", ".mp4"}
    files: list[Path] = []
    for p in sorted(root.rglob("*")):
        if ".waypoint-pipeline" in p.parts:
            continue
        if p.is_file() and p.suffix.lower() in exts:
            files.append(p)
            if len(files) >= limit:
                break
    if not files:
        print(json.dumps({"enqueued": 0, "message": "No files found"}))
        return 0
    manifest = enqueue_imported_files(files, library=root, card_name="library-scan")
    print(json.dumps({"enqueued": len(manifest["asset_ids"]), "manifest": manifest["id"]}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
