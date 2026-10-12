"""Runtime status that stays honest when optional services are absent."""

from __future__ import annotations

import os
from typing import Literal

from app.copy import honesty

DatabaseState = Literal["not_configured", "configured_unused"]


def database_status() -> tuple[DatabaseState, str]:
    url = os.environ.get("DATABASE_URL", "").strip()
    messages = honesty()["database"]
    if not url:
        return "not_configured", str(messages["not_configured"])
    return "configured_unused", str(messages["configured_unused"])
