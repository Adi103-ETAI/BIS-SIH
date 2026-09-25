"""POST JSON with retries on rate-limit/transient errors (free-tier friendly)."""

import json
import time
import urllib.error
import urllib.request

RETRYABLE = {429, 502, 503, 504}


def post_json(url: str, body: dict, headers: dict, timeout: int = 60,
              retries: int = 3) -> dict:
    data = json.dumps(body).encode()
    last: Exception | None = None
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, data=data, headers=headers)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.load(r)
        except urllib.error.HTTPError as exc:
            last = exc
            if exc.code not in RETRYABLE or attempt == retries:
                raise
            time.sleep(2 ** attempt * 2)  # 2s, 4s, 8s
    raise last  # type: ignore[misc]
