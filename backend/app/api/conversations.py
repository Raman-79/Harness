from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import AsyncSessionLocal
from app.models import Conversation, Message, Project

router = APIRouter(prefix="/conversations", tags=["conversations"])


async def get_db():
    async with AsyncSessionLocal() as db:
        yield db


class CreateConversationBody(BaseModel):
    title: str | None = "New chat"
    project_id: str | None = None


class RenameBody(BaseModel):
    title: str


class StarBody(BaseModel):
    starred: bool


@router.get("/")
async def list_conversations(
    project_id: str | None = None, db: AsyncSession = Depends(get_db)
):
    """List conversations, newest first. Optionally filter by project."""
    stmt = select(Conversation).order_by(Conversation.created_at.desc())
    if project_id is not None:
        stmt = stmt.filter(Conversation.project_id == project_id)
    result = await db.execute(stmt)
    rows = result.scalars().all()
    return [
        {
            "id": c.id,
            "title": c.title,
            "starred": bool(c.starred),
            "project_id": c.project_id,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        }
        for c in rows
    ]


@router.post("/")
async def create_conversation(
    body: CreateConversationBody, db: AsyncSession = Depends(get_db)
):
    import uuid

    conv = Conversation(
        id=str(uuid.uuid4()),
        title=body.title or "New chat",
        project_id=body.project_id,
    )
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return {
        "id": conv.id,
        "title": conv.title,
        "starred": bool(conv.starred),
        "project_id": conv.project_id,
        "created_at": conv.created_at.isoformat() if conv.created_at else None,
        "updated_at": conv.updated_at.isoformat() if conv.updated_at else None,
    }


@router.get("/search")
async def search_conversations(q: str, db: AsyncSession = Depends(get_db)):
    """Substring search across conversation titles plus recent message snippets.
    Real FTS5 lives in Phase 4 — this is a fast LIKE-based fallback that
    works on every backend so the SearchModal isn't blocked on migrations.
    """
    if not q.strip():
        return []

    needle = f"%{q}%"
    conv_rows = (
        await db.execute(select(Conversation).filter(Conversation.title.ilike(needle)))
    ).scalars().all()

    results = []
    seen = set()
    for c in conv_rows:
        seen.add(c.id)
        results.append(
            {
                "conversation": {
                    "id": c.id,
                    "title": c.title,
                    "starred": bool(c.starred),
                    "created_at": c.created_at.isoformat() if c.created_at else None,
                },
                "snippet": (c.title or "")[:120],
            }
        )

    # Then search inside message bodies.
    msg_rows = (
        await db.execute(select(Message).filter(Message.content.ilike(needle)).limit(20))
    ).scalars().all()
    for m in msg_rows:
        if m.conversation_id in seen:
            continue
        seen.add(m.conversation_id)
        c = await db.get(Conversation, m.conversation_id)
        if c is None:
            continue
        idx = m.content.lower().find(q.lower())
        start = max(0, idx - 40) if idx >= 0 else 0
        end = min(len(m.content), idx + 80) if idx >= 0 else 80
        snippet = m.content[start:end]
        results.append(
            {
                "conversation": {
                    "id": c.id,
                    "title": c.title,
                    "starred": bool(c.starred),
                    "created_at": c.created_at.isoformat() if c.created_at else None,
                },
                "snippet": ("…" if start > 0 else "") + snippet + ("…" if end < len(m.content) else ""),
            }
        )

    return results


@router.get("/{conversation_id}")
async def get_conversation(conversation_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Conversation).filter(Conversation.id == conversation_id))
    conversation = result.scalars().first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages_result = await db.execute(
        select(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    messages = messages_result.scalars().all()

    return {
        "conversation": {
            "id": conversation.id,
            "title": conversation.title,
            "starred": bool(conversation.starred),
            "project_id": conversation.project_id,
            "created_at": conversation.created_at.isoformat() if conversation.created_at else None,
            "updated_at": conversation.updated_at.isoformat() if conversation.updated_at else None,
        },
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "citations": m.citations,
                "parent_message_id": m.parent_message_id,
                "branch_id": m.branch_id,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in messages
        ],
    }


@router.patch("/{conversation_id}")
async def rename_conversation(
    conversation_id: str, body: RenameBody, db: AsyncSession = Depends(get_db)
):
    conv = await db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv.title = body.title
    conv.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(conv)
    return {
        "id": conv.id,
        "title": conv.title,
        "starred": bool(conv.starred),
        "created_at": conv.created_at.isoformat() if conv.created_at else None,
    }


@router.delete("/{conversation_id}")
async def delete_conversation(conversation_id: str, db: AsyncSession = Depends(get_db)):
    conv = await db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    # Delete messages first to keep the FK chain clean.
    msgs = (
        await db.execute(select(Message).filter(Message.conversation_id == conversation_id))
    ).scalars().all()
    for m in msgs:
        await db.delete(m)
    await db.delete(conv)
    await db.commit()
    return {"ok": True}


@router.post("/{conversation_id}/star")
async def star_conversation(
    conversation_id: str, body: StarBody, db: AsyncSession = Depends(get_db)
):
    conv = await db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv.starred = body.starred
    await db.commit()
    return {
        "id": conv.id,
        "title": conv.title,
        "starred": bool(conv.starred),
    }


# ----------------------------------------------------------------------------
# Projects
# ----------------------------------------------------------------------------

projects_router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectBody(BaseModel):
    name: str
    description: str | None = None
    custom_instructions: str | None = None


@projects_router.get("/")
async def list_projects(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Project).order_by(Project.created_at.desc()))).scalars().all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "custom_instructions": p.custom_instructions,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in rows
    ]


@projects_router.post("/")
async def create_project(body: ProjectBody, db: AsyncSession = Depends(get_db)):
    import uuid

    p = Project(
        id=str(uuid.uuid4()),
        name=body.name,
        description=body.description,
        custom_instructions=body.custom_instructions,
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return {
        "id": p.id,
        "name": p.name,
        "description": p.description,
        "custom_instructions": p.custom_instructions,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


@projects_router.delete("/{project_id}")
async def delete_project(project_id: str, db: AsyncSession = Depends(get_db)):
    p = await db.get(Project, project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.delete(p)
    await db.commit()
    return {"ok": True}