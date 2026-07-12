from fastapi import APIRouter, Depends, HTTPException
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

@router.get("/{artifact_id}")
async def get_artifact(artifact_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Artifact).filter(Artifact.id == artifact_id))
    artifact = result.scalars().first()
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")
        
    versions_result = await db.execute(
        select(ArtifactVersion).filter(ArtifactVersion.artifact_id == artifact_id).order_by(ArtifactVersion.version_number.desc())
    )
    versions = versions_result.scalars().all()
    
    return {
        "artifact": artifact,
        "latest_version": versions[0] if versions else None,
        "history": versions
    }

@router.get("/{artifact_id}/versions/{version_number}")
async def get_artifact_version(artifact_id: str, version_number: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ArtifactVersion)
        .filter(ArtifactVersion.artifact_id == artifact_id)
        .filter(ArtifactVersion.version_number == version_number)
    )
    version = result.scalars().first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    return version

@router.post("/{conversation_id}")
async def create_artifact(conversation_id: str, data: ArtifactVersionCreate, db: AsyncSession = Depends(get_db)):
    artifact_id = str(uuid.uuid4())
    artifact = Artifact(
        id=artifact_id,
        conversation_id=conversation_id,
        title=data.title,
        language=data.language
    )
    db.add(artifact)
    
    version = ArtifactVersion(
        id=str(uuid.uuid4()),
        artifact_id=artifact_id,
        content=data.content,
        version_number=1
    )
    db.add(version)
    
    await db.commit()
    
    return {"artifact_id": artifact_id, "version": 1}

@router.post("/{artifact_id}/versions")
async def add_artifact_version(artifact_id: str, data: ArtifactVersionCreate, db: AsyncSession = Depends(get_db)):
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
        version_number=next_version
    )
    db.add(version)
    await db.commit()
    
    return {"artifact_id": artifact_id, "version": next_version}
