"""Load the shared honesty contract used by the API and the web app."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

CONTRACT_PATH = Path(__file__).resolve().parents[2] / "shared" / "honesty.json"


@lru_cache(maxsize=1)
def honesty() -> dict[str, Any]:
    with CONTRACT_PATH.open(encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise RuntimeError("Honesty contract must be a JSON object.")
    return data
