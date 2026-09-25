"""Alembic env: Postgres/Supabase only. SQLite dev uses create_all (see infra.db)."""

import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.domain.auth import Base  # noqa: E402

import app.domain.catalogue  # noqa: E402,F401
import app.domain.conversation  # noqa: E402,F401

config = context.config
fileConfig(config.config_file_name)

url = os.environ.get("BIS_DATABASE_URL", "")
if url.startswith("postgresql://"):
    url = "postgresql+psycopg://" + url[len("postgresql://"):]
if not url.startswith("postgresql"):
    raise SystemExit("Alembic runs against Postgres/Supabase only — set BIS_DATABASE_URL.")

engine = create_engine(url, pool_pre_ping=True)


def run_migrations() -> None:
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=Base.metadata)
        with context.begin_transaction():
            context.run_migrations()


run_migrations()
