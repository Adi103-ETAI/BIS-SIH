"""Application settings. Env-driven; deployment parameters per docs/20_DEPLOYMENT.md."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="BIS_", env_file=(".env.local", ".env"), extra="ignore")

    app_name: str = "bis-ai-backend"
    environment: str = "dev"  # dev | staging | prod
    log_level: str = "INFO"
    testing: bool = False  # BIS_TESTING=1: lexical-only, extractive-only, no provider calls

    # Data layer (wired in later stages; health reflects reachability)
    database_url: str = "postgresql+psycopg://bis:bis@localhost:5432/bis"
    redis_url: str = "redis://localhost:6379/0"
    s3_endpoint_url: str = "http://localhost:9000"

    # Provider gateways: OpenRouter (OpenAI-compatible) + free providers (OD-007).
    llm_base_url: str = "https://openrouter.ai/api/v1"
    llm_api_key: str = ""
    llm_model: str = ""
    embedding_model: str = "BAAI/bge-m3"  # OD-008: best practical pick, GPU-batch on Kaggle
    embedding_dim: int = 1024
    hf_api_token: str = ""  # query-time embeddings via HF Inference (same model => same space)

    # Upstash Redis (REST). Empty = in-memory fallback (single-process dev).
    upstash_redis_rest_url: str = ""
    upstash_redis_rest_token: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
