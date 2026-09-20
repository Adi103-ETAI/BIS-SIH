"""ConversationService: persistence-first Q&A (docs/10, roadmap Stage 5)."""

from datetime import datetime

from sqlalchemy.orm import Session as DbSession

from app.application.rag_orchestrator import RagOrchestrator
from app.domain.conversation import Conversation, Message
from app.domain.search import validate_search_request
from app.infra.knowledge_store import get_store

IMPORT_BATCH_MAX = 50


def _now() -> datetime:
    return datetime.utcnow()


def generate_title(query: str) -> str:
    cleaned = " ".join(query.strip().split())
    return (cleaned[:57] + "…") if len(cleaned) > 60 else cleaned or "New conversation"


def owned_conversation(db: DbSession, user_id: str, conversation_id: str) -> Conversation | None:
    return (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.user_id == user_id,
                Conversation.deleted_at.is_(None))
        .first()
    )


def create_conversation(db: DbSession, user_id: str, title: str | None) -> Conversation:
    conv = Conversation(user_id=user_id, title=title.strip() if title else "New conversation")
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


def _touch(db: DbSession, conv: Conversation, count_delta: int = 0) -> None:
    conv.message_count += count_delta
    conv.last_message_at = _now()
    conv.updated_at = _now()


def ask(db: DbSession, conv: Conversation, query: str, top_k: int) -> tuple[Message, Message]:
    """Persist user row first, run RAG, persist assistant row. Failures persist
    truthfully as status=failed (docs/10 lifecycle)."""
    user_msg = Message(conversation_id=conv.id, role="user", content=query,
                       status="completed", completed_at=_now())
    db.add(user_msg)
    db.flush()
    try:
        result = RagOrchestrator(get_store()).answer(query, top_k)
    except AssertionError as exc:  # citation validation must never leak
        assistant = Message(conversation_id=conv.id, role="assistant", content="",
                            status="failed", error={"code": "RETRIEVAL_FAILED", "message": str(exc)},
                            completed_at=_now())
        db.add(assistant)
        _touch(db, conv, 2)
        if conv.title == "New conversation":
            conv.title = generate_title(query)
        db.commit()
        raise RuntimeError("RETRIEVAL_FAILED")
    assistant = Message(
        conversation_id=conv.id, role="assistant", content=result.answer,
        citations=[c.model_dump() for c in result.citations],
        status="completed", completed_at=_now(),
    )
    db.add(assistant)
    _touch(db, conv, 2)
    if conv.title == "New conversation":
        conv.title = generate_title(query)
    db.commit()
    return user_msg, assistant


def regenerate(db: DbSession, conv: Conversation, message_id: str) -> Message | None:
    """New assistant row for the same user query; prior rows retained."""
    target = (
        db.query(Message)
        .filter(Message.id == message_id, Message.conversation_id == conv.id,
                Message.role == "assistant")
        .first()
    )
    if target is None:
        return None
    prior_user = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id, Message.role == "user",
                Message.created_at <= target.created_at)
        .order_by(Message.created_at.desc())
        .first()
    )
    if prior_user is None:
        return None
    query, _ = validate_search_request(prior_user.content, 8)
    from app.application.rag_orchestrator import RagOrchestrator
    from app.infra.knowledge_store import get_store

    result = RagOrchestrator(get_store()).answer(query, 8)
    assistant = Message(
        conversation_id=conv.id, role="assistant", content=result.answer,
        citations=[c.model_dump() for c in result.citations],
        status="completed", completed_at=datetime.utcnow(),
    )
    db.add(assistant)
    _touch(db, conv, 1)
    db.commit()
    return assistant


def import_entries(db: DbSession, user_id: str, entries: list[dict]) -> tuple[int, int]:
    """Idempotent localStorage import (BE-FR-014). One conversation per entry."""
    imported, skipped = 0, 0
    for entry in entries[:IMPORT_BATCH_MAX]:
        client_id = str(entry.get("client_id", ""))
        query = str(entry.get("query", "")).strip()
        if not client_id or not query:
            skipped += 1
            continue
        if db.query(Message).filter(Message.client_id == client_id).first() is not None:
            skipped += 1
            continue
        try:
            ts = entry.get("timestamp")
            created = datetime.fromtimestamp(ts / 1000) if isinstance(ts, (int, float)) else _now()
        except (OverflowError, OSError, ValueError):
            created = _now()
        conv = Conversation(user_id=user_id, title=str(entry.get("title", ""))[:200] or generate_title(query),
                            created_at=created, updated_at=created)
        db.add(conv)
        db.flush()
        db.add(Message(conversation_id=conv.id, role="user", content=query, status="completed",
                       client_id=client_id, created_at=created, completed_at=created))
        response = entry.get("response") or {}
        if isinstance(response, dict) and response.get("answer"):
            citations = response.get("citations") or []
            db.add(Message(conversation_id=conv.id, role="assistant",
                           content=str(response.get("answer", "")),
                           citations=citations if isinstance(citations, list) else [],
                           status="completed", created_at=created, completed_at=created))
            conv.message_count = 2
        else:
            conv.message_count = 1
        conv.last_message_at = created
        imported += 1
    db.commit()
    return imported, skipped
