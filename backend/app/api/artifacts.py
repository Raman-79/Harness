from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import AsyncSessionLocal
from app.models import Artifact, ArtifactVersion
from pydantic import BaseModel
import uuid

router = APIRouter(prefix="/artifacts", tags=["artifacts"])


async def get_db():
    async with AsyncSessionLocal() as db:
        yield db


class ArtifactVersionCreate(BaseModel):
    content: str
    language: str = "react"
    title: str = "Untitled Artifact"


def _serialize_artifact(a: Artifact) -> dict:
    return {
        "id": a.id,
        "conversation_id": a.conversation_id,
        "message_id": a.message_id,
        "title": a.title,
        "language": a.language,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "updated_at": a.updated_at.isoformat() if a.updated_at else None,
    }


@router.get("/")
async def list_artifacts(
    conversation_id: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """List artifacts. Without `conversation_id` returns all artifacts
    (admin/debug); usually callers pass it."""
    stmt = select(Artifact).order_by(Artifact.created_at.desc())
    if conversation_id:
        stmt = stmt.filter(Artifact.conversation_id == conversation_id)
    rows = (await db.execute(stmt)).scalars().all()
    return [_serialize_artifact(a) for a in rows]


@router.get("/{artifact_id}")
async def get_artifact(artifact_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Artifact).filter(Artifact.id == artifact_id))
    artifact = result.scalars().first()
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")

    versions_result = await db.execute(
        select(ArtifactVersion)
        .filter(ArtifactVersion.artifact_id == artifact_id)
        .order_by(ArtifactVersion.version_number.desc())
    )
    versions = versions_result.scalars().all()

    return {
        "artifact": _serialize_artifact(artifact),
        "latest_version": {
            "id": versions[0].id,
            "content": versions[0].content,
            "language": versions[0].language,
            "version_number": versions[0].version_number,
            "created_at": versions[0].created_at.isoformat() if versions[0].created_at else None,
        }
        if versions
        else None,
        "history": [
            {
                "id": v.id,
                "version_number": v.version_number,
                "language": v.language,
                "created_at": v.created_at.isoformat() if v.created_at else None,
            }
            for v in versions
        ],
    }


@router.get("/{artifact_id}/versions/{version_number}")
async def get_artifact_version(
    artifact_id: str, version_number: int, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ArtifactVersion)
        .filter(ArtifactVersion.artifact_id == artifact_id)
        .filter(ArtifactVersion.version_number == version_number)
    )
    version = result.scalars().first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    return {
        "id": version.id,
        "artifact_id": version.artifact_id,
        "content": version.content,
        "language": version.language,
        "version_number": version.version_number,
        "created_at": version.created_at.isoformat() if version.created_at else None,
    }


@router.post("/{conversation_id}")
async def create_artifact(
    conversation_id: str, data: ArtifactVersionCreate, db: AsyncSession = Depends(get_db)
):
    artifact_id = str(uuid.uuid4())
    artifact = Artifact(
        id=artifact_id,
        conversation_id=conversation_id,
        title=data.title,
        language=data.language,
    )
    db.add(artifact)

    version = ArtifactVersion(
        id=str(uuid.uuid4()),
        artifact_id=artifact_id,
        content=data.content,
        language=data.language,
        version_number=1,
    )
    db.add(version)

    await db.commit()

    return {"artifact_id": artifact_id, "version": 1}


@router.post("/{artifact_id}/versions")
async def add_artifact_version(
    artifact_id: str, data: ArtifactVersionCreate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ArtifactVersion)
        .filter(ArtifactVersion.artifact_id == artifact_id)
        .order_by(ArtifactVersion.version_number.desc())
    )
    latest = result.scalars().first()

    next_version = (latest.version_number + 1) if latest else 1

    version = ArtifactVersion(
        id=str(uuid.uuid4()),
        artifact_id=artifact_id,
        content=data.content,
        language=data.language,
        version_number=next_version,
    )
    db.add(version)
    await db.commit()

    return {"artifact_id": artifact_id, "version": next_version}