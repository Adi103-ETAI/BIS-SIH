"""Rate-limit backend selection: memory fallback + failure safety."""

from app.infra import rate_limit as rl


def test_memory_fallback_without_credentials(monkeypatch):
    monkeypatch.setattr(rl, "_redis_configured", False)
    monkeypatch.setattr(rl, "_redis", None)
    rl.reset_rate_limits()
    for _ in range(10):
        assert rl.check_rate_limit("search_anon", "k")[0] is True
    allowed, retry = rl.check_rate_limit("search_anon", "k")
    assert allowed is False and retry >= 1
    rl.reset_rate_limits()


def test_redis_failure_falls_back_to_memory(monkeypatch):
    class Boom:
        def incr(self, *_a):
            raise ConnectionError("down")

    monkeypatch.setattr(rl, "_redis_configured", True)
    monkeypatch.setattr(rl, "_redis", Boom())
    rl.reset_rate_limits()
    assert rl.check_rate_limit("search_anon", "k2")[0] is True
    rl.reset_rate_limits()
    monkeypatch.setattr(rl, "_redis_configured", None)
    monkeypatch.setattr(rl, "_redis", None)
