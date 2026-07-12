import os
import hashlib
from app.config import settings
from app.ingestion.parsers import parse_file, UnsupportedFormatError
from app.ingestion.chunker import chunk_text
from app.ingestion.embedder import embed_and_store
from app.database import AsyncSessionLocal
from app.models import File, FileChunkMeta
from sqlalchemy.future import select

def compute_hash(path: str) -> str:
    hasher = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hasher.update(chunk)
    return hasher.hexdigest()

async def process_file(file_id: str, temp_path: str, filename: str, mime_type: str):
    try:
        content_hash = compute_hash(temp_path)
        
        async with AsyncSessionLocal() as db:
            # check for duplicate
            result = await db.execute(select(File).filter(File.content_hash == content_hash))
            existing_file = result.scalars().first()
            if existing_file and existing_file.id != file_id:
                pass
            
            dest_dir = os.path.join(settings.UPLOAD_DIR, file_id)
            os.makedirs(dest_dir, exist_ok=True)
            dest_path = os.path.join(dest_dir, filename)
            os.rename(temp_path, dest_path)
            
            pages = parse_file(dest_path, mime_type)
            chunks = chunk_text(pages)
            await embed_and_store(chunks, file_id, filename)
            
            for chunk in chunks:
                meta = chunk["metadata"]
                db.add(FileChunkMeta(
                    file_id=file_id,
                    chunk_index=meta.get("chunk_index", 0),
                    page=meta.get("page"),
                    char_start=0,
                    char_end=len(chunk["text"])
                ))
            
            db_file = await db.get(File, file_id)
            if db_file:
                db_file.status = "ready"
                db_file.content_hash = content_hash
            await db.commit()
            
    except Exception as e:
        async with AsyncSessionLocal() as db:
            db_file = await db.get(File, file_id)
            if db_file:
                db_file.status = f"error: {str(e)}"
            await db.commit()
