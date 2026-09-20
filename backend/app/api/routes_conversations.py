"""Conversation + message endpoints (docs/05 §5.4). Owner or 404 throughout."""

from datetime import datetime

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.application import conversation_service as convs
from app.application.rbac import get_current_user
from app.core.errors import v1_error
from app.domain.search import validate_search_request
from app.infra.db import db_session

router = APIRouter()


def _iso(dt: datetime | None) -> str | None:
    return dt.isoformat() + "Z" if dt else None


def _conv_payload(conv) -> dict:  # type: ignore[no-untyped-def]
    return {"conversation_id": conv.id, "title": conv.title, "status": conv.status,
            "message_count": conv.message_count, "last_message_at": _iso(conv.last_message_at),
            "created_at": _iso(conv.created_at), "updated_at": _iso(conv.updated_at)}


def _msg_payload(msg, conversation_id: str, grounding_status: str = "grounded",
                 confidence: float = 0.0) -> dict:  # type: ignore[no-untyped-def]
    return {"message_id": msg.id, "conversation_id": conversation_id, "role": msg.role,
            "status": msg.status, "content": msg.content, "citations": msg.citations or [],
            "grounding": {"status": grounding_status, "confidence": confidence},
            "error": msg.error, "created_at": _iso(msg.created_at),
            "completed_at": _iso(msg.completed_at)}


def _page(items: list, page: int, limit: int, total: int) -> dict:
    return {"items": items, "page": page, "limit": limit, "total": total}


class CreateBody(BaseModel):
    title: str | None = None


class PatchBody(BaseModel):
    title: str | None = None
    status: str | None = None


class AskBody(BaseModel):
    query: str = ""
    top_k: int = 8


class ImportBody(BaseModel):
    entries: list[dict] = []


def _owned(request: Request, db, user, conversation_id: str):  # type: ignore[no-untyped-def]
    conv = convs.owned_conversation(db, user.id, conversation_id)
    if conv is None:
        return None, v1_error(request, 404, "NOT_FOUND", "Conversation not found")
    return conv, None


@router.post("/api/v1/conversations")
async def create(request: Request, body: CreateBody, db=Depends(db_session),
                 current=Depends(get_current_user)) -> JSONResponse:
    _, user = current
    if user is None:
        return v1_error(request, 401, "UNAUTHENTICATED", "Authentication required")
    conv = convs.create_conversation(db, user.id, body.title)
    return JSONResponse(status_code=201, content=_conv_payload(conv))


@router.get("/api/v1/conversations")
async def list_convs(request: Request, status: str = "active", page: int = 1, limit: int = 20,
                     db=Depends(db_session), current=Depends(get_current_user)) -> JSONResponse:
    _, user = current
    if user is None:
        return v1_error(request, 401, "UNAUTHENTICATED", "Authentication required")
    from app.domain.conversation import Conversation

    limit = max(1, min(limit, 100))
    q = db.query(Conversation).filter(Conversation.user_id == user.id,
                                      Conversation.deleted_at.is_(None))
    if status in ("active", "archived"):
        q = q.filter(Conversation.status == status)
    total = q.count()
    rows = q.order_by(Conversation.last_message_at.desc().nullslast(),
                      Conversation.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return JSONResponse(status_code=200, content=_page([_conv_payload(c) for c in rows], page, limit, total))


@router.get("/api/v1/conversations/{conversation_id}")
async def detail(request: Request, conversation_id: str, db=Depends(db_session),
                 current=Depends(get_current_user)) -> JSONResponse:
    _, user = current
    if user is None:
        return v1_error(request, 401, "UNAUTHENTICATED", "Authentication required")
    conv, err = _owned(request, db, user, conversation_id)
    if err is not None:
        return err
    return JSONResponse(status_code=200, content=_conv_payload(conv))


@router.patch("/api/v1/conversations/{conversation_id}")
async def patch_conv(request: Request, conversation_id: str, body: PatchBody,
                     db=Depends(db_session), current=Depends(get_current_user)) -> JSONResponse:
    _, user = current
    if user is None:
        return v1_error(request, 401, "UNAUTHENTICATED", "Authentication required")
    conv, err = _owned(request, db, user, conversation_id)
    if err is not None:
        return err
    if body.title is not None:
        title = body.title.strip()
        if not (1 <= len(title) <= 200):
            return v1_error(request, 422, "VALIDATION_FAILED", "title must be 1-200 characters")
        conv.title = title
    if body.status is not None:
        if body.status not in ("active", "archived"):
            return v1_error(request, 422, "VALIDATION_FAILED", "status must be active|archived")
        conv.status = body.status
    conv.updated_at = datetime.utcnow()
    db.commit()
    return JSONResponse(status_code=200, content=_conv_payload(conv))


@router.delete("/api/v1/conversations/{conversation_id}")
async def delete_conv(request: Request, conversation_id: str, db=Depends(db_session),
                      current=Depends(get_current_user)) -> JSONResponse:
    _, user = current
    if user is None:
        return v1_error(request, 401, "UNAUTHENTICATED", "Authentication required")
    conv, err = _owned(request, db, user, conversation_id)
    if err is not None:
        return err
    conv.deleted_at = datetime.utcnow()
    db.commit()
    return JSONResponse(status_code=204, content=None)


@router.post("/api/v1/conversations/{conversation_id}/messages")
async def ask(request: Request, conversation_id: str, body: AskBody,
              db=Depends(db_session), current=Depends(get_current_user)) -> JSONResponse:
    _, user = current
    if user is None:
        return v1_error(request, 401, "UNAUTHENTICATED", "Authentication required")
    conv, err = _owned(request, db, user, conversation_id)
    if err is not None:
        return err
    try:
        query, top_k = validate_search_request(body.query, body.top_k)
    except ValueError as exc:
        return v1_error(request, 422, "VALIDATION_FAILED", str(exc))
    try:
        _, assistant = convs.ask(db, conv, query, top_k)
    except RuntimeError:
        return v1_error(request, 502, "RETRIEVAL_FAILED", "Retrieval failed")
    grounded = bool(assistant.citations)
    conf = round(max((c.get("score", 0) for c in (assistant.citations or [])), default=0.0), 2)
    return JSONResponse(
        status_code=201,
        content=_msg_payload(assistant, conv.id, "grounded" if grounded else "insufficient_evidence", conf),
    )


@router.get("/api/v1/conversations/{conversation_id}/messages")
async def list_messages(request: Request, conversation_id: str, page: int = 1, limit: int = 50,
                        order: str = "asc", db=Depends(db_session),
                        current=Depends(get_current_user)) -> JSONResponse:
    _, user = current
    if user is None:
        return v1_error(request, 401, "UNAUTHENTICATED", "Authentication required")
    conv, err = _owned(request, db, user, conversation_id)
    if err is not None:
        return err
    from app.domain.conversation import Message

    limit = max(1, min(limit, 100))
    q = db.query(Message).filter(Message.conversation_id == conv.id)
    total = q.count()
    ordering = Message.created_at.asc() if order != "desc" else Message.created_at.desc()
    rows = q.order_by(ordering).offset((page - 1) * limit).limit(limit).all()
    return JSONResponse(status_code=200, content=_page(
        [{"message_id": m.id, "role": m.role, "content": m.content, "citations": m.citations or [],
          "status": m.status, "created_at": _iso(m.created_at)} for m in rows], page, limit, total))


@router.post("/api/v1/conversations/{conversation_id}/messages/{message_id}/regenerate")
async def regenerate(request: Request, conversation_id: str, message_id: str,
                     db=Depends(db_session), current=Depends(get_current_user)) -> JSONResponse:
    _, user = current
    if user is None:
        return v1_error(request, 401, "UNAUTHENTICATED", "Authentication required")
    conv, err = _owned(request, db, user, conversation_id)
    if err is not None:
        return err
    assistant = convs.regenerate(db, conv, message_id)
    if assistant is None:
        return v1_error(request, 404, "NOT_FOUND", "Message not found")
    return JSONResponse(status_code=201, content=_msg_payload(assistant, conv.id))


@router.post("/api/v1/conversations/import")
async def import_history(request: Request, body: ImportBody, db=Depends(db_session),
                         current=Depends(get_current_user)) -> JSONResponse:
    _, user = current
    if user is None:
        return v1_error(request, 401, "UNAUTHENTICATED", "Authentication required")
    if len(body.entries) > 50:
        return v1_error(request, 422, "VALIDATION_FAILED", "at most 50 entries per call")
    imported, skipped = convs.import_entries(db, user.id, body.entries)
    return JSONResponse(status_code=201, content={"imported": imported, "skipped": skipped})


@router.post("/api/v1/conversations/{conversation_id}/messages:stream")
async def stream_reserved() -> JSONResponse:
    return JSONResponse(status_code=501,
                        content={"error": {"code": "STREAMING_NOT_AVAILABLE",
                                           "message": "Streaming ships post-MVP (OD-019)"}})
