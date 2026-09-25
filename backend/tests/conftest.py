"""Test isolation: provider calls (HF/OpenRouter) are never made in tests."""

import os

os.environ["BIS_TESTING"] = "1"

from app.core.settings import get_settings  # noqa: E402

get_settings.cache_clear()
