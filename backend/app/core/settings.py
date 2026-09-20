"""Application settings. Env-driven; deployment parameters per docs/20_DEPLOYMENT.md."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="BIS_", env_file=(".env.local", ".env"), extra="ignore")

    app_name: str = "bis-ai-backend"
    environment: str = "dev"  # dev | staging | prod
    log_level: str = "INFO"

    # Data layer (wired in later stages; health reflects reachability)
    database_url: str = "postgresql+psycopg://bis:bis@localhost:5432/bis"
    redis_url: str = "redis://localhost:6379/0"
    s3_endpoint_url: str = "http://localhost:9000"

    # Provider gateways (OD-007/008 — unresolved; used from Stage 3)
    llm_base_url: str = ""
    llm_api_key: str = ""
    embedding_model: str = ""
    embedding_dim: int = 1024

    # Upstash Redis (REST). Empty = in-memory fallback (single-process dev).
    upstash_redis_rest_url: str = ""
    upstash_redis_rest_token: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
