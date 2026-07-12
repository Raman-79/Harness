import os
import uuid
import shutil
from fastapi import APIRouter, UploadFile, File as FastAPIFile, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import AsyncSessionLocal
from app.models import File
from app.ingestion.pipeline import process_file
from app.config import settings

router = APIRouter(prefix="/files", tags=["files"])

async def get_db():
    async with AsyncSessionLocal() as db:
        yield db

@router.post("/")
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = FastAPIFile(...),
    db: AsyncSession = Depends(get_db)
):
    file_id = str(uuid.uuid4())
    temp_path = os.path.join(settings.UPLOAD_DIR, f"{file_id}_temp")
    
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    db_file = File(
        id=file_id,
        filename=file.filename,
        mime_type=file.content_type,
        status="processing",
        size_bytes=os.path.getsize(temp_path)
    )
    db.add(db_file)
    await db.commit()
    
    background_tasks.add_task(process_file, file_id, temp_path, file.filename, file.content_type)
    
    return {"file_id": file_id, "status": "processing"}

@router.get("/{file_id}")
async def get_file(file_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(File).filter(File.id == file_id))
    db_file = result.scalars().first()
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
    return db_file
