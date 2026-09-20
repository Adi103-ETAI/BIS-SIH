"""Rate limits (docs/05 §2 rate classes).

Upstash Redis (fixed window) when BIS_UPSTASH_REDIS_REST_URL/TOKEN are set,
else in-memory token buckets (single-process dev). Same interface either way.
"""

import logging
import time

log = logging.getLogger(__name__)

RATE_CLASSES: dict[str, tuple[int, int]] = {
    # name: (max_hits, window_seconds)
    "search_anon": (10, 60),
    "search_auth": (30, 60),
    "auth": (10, 60),
}

_buckets: dict[tuple[str, str], list[float]] = {}
_redis = None
_redis_configured: bool | None = None


def _redis_client():
    global _redis, _redis_configured
    if _redis_configured is None:
        from app.core.settings import get_settings

        s = get_settings()
        if s.upstash_redis_rest_url and s.upstash_redis_rest_token:
            from upstash_redis import Redis

            _redis = Redis(url=s.upstash_redis_rest_url, token=s.upstash_redis_rest_token)
            _redis_configured = True
        else:
            _redis_configured = False
    return _redis


def reset_redis_cache() -> None:  # test hook
    global _redis, _redis_configured
    _redis, _redis_configured = None, None


def check_rate_limit(rate_class: str, key: str, now: float | None = None) -> tuple[bool, int]:
    """Returns (allowed, retry_after_seconds)."""
    limit, window = RATE_CLASSES[rate_class]
    client = _redis_client()
    if client is not None:
        try:
            return _redis_check(client, rate_class, key, limit, window)
        except Exception as exc:  # never break requests on cache failure
            log.warning("redis rate-limit failed, falling back to memory: %s", exc)
    return _memory_check(rate_class, key, limit, window, now)


def _redis_check(client, rate_class: str, key: str, limit: int, window: int) -> tuple[bool, int]:
    bucket = f"rl:{rate_class}:{key}:{int(time.time()) // window}"
    count = client.incr(bucket)
    if count == 1:
        client.expire(bucket, window)
    if count > limit:
        ttl = client.ttl(bucket)
        return False, ttl if isinstance(ttl, int) and ttl > 0 else window
    return True, 0


def _memory_check(rate_class: str, key: str, limit: int, window: int,
                  now: float | None = None) -> tuple[bool, int]:
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
