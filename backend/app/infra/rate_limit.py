"""In-memory token-bucket rate limits (docs/05 §2 rate classes).

Stage 2 scope: search_anon (10/min/IP). Redis-backed buckets arrive with the
compose stack (Stage 3+); interface stays the same.
"""

import time

RATE_CLASSES: dict[str, tuple[int, int]] = {
    # name: (max_hits, window_seconds)
    "search_anon": (10, 60),
    "search_auth": (30, 60),
}

_buckets: dict[tuple[str, str], list[float]] = {}


def check_rate_limit(rate_class: str, key: str, now: float | None = None) -> tuple[bool, int]:
    """Returns (allowed, retry_after_seconds)."""
    limit, window = RATE_CLASSES[rate_class]
    now = now if now is not None else time.monotonic()
    bucket_key = (rate_class, key)
    hits = [t for t in _buckets.get(bucket_key, []) if t > now - window]
    if len(hits) >= limit:
        retry_after = max(1, int(hits[0] + window - now))
        _buckets[bucket_key] = hits
        return False, retry_after
    hits.append(now)
    _buckets[bucket_key] = hits
    return True, 0


def reset_rate_limits() -> None:
    _buckets.clear()
