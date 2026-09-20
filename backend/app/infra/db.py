"""Database engine. Supabase URL in prod, SQLite file on laptop (no Docker needed)."""

import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.domain.auth import Base


def database_url() -> str:
    url = os.environ.get("BIS_DATABASE_URL", "")
    if url:
        return url
    data = Path(__file__).resolve().parents[2] / "data"
    data.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{data}/app.db"


def get_engine(echo: bool = False):
    url = database_url()
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(url, connect_args=connect_args, echo=echo, pool_pre_ping=True)


def init_db(engine=None) -> None:
    """create_all + role seeds. Alembic owns schema evolution once Supabase lands."""
    from app.domain.auth import ROLES, Role

    engine = engine or get_engine()
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    with Session() as db:
        existing = {r.code for r in db.query(Role).all()}
        for code in ROLES:
            if code not in existing:
                db.add(Role(code=code, description=f"{code} role"))
        db.commit()


def session_factory(engine=None):
    return sessionmaker(bind=engine or get_engine(), expire_on_commit=False)


def db_session(engine=None):
    """Request-scoped session generator. Import this (not copies) everywhere."""
    db = session_factory(engine)()
    try:
        yield db
    finally:
        db.close()
