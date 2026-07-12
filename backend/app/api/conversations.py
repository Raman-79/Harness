from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import AsyncSessionLocal
from app.models import Conversation, Message

router = APIRouter(prefix="/conversations", tags=["conversations"])

async def get_db():
    async with AsyncSessionLocal() as db:
        yield db

@router.get("/")
async def list_conversations(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Conversation).order_by(Conversation.created_at.desc()))
    return result.scalars().all()

@router.get("/{conversation_id}")
async def get_conversation(conversation_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Conversation).filter(Conversation.id == conversation_id))
    conversation = result.scalars().first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    messages_result = await db.execute(
        select(Message).filter(Message.conversation_id == conversation_id).order_by(Message.created_at.asc())
    )
    messages = messages_result.scalars().all()
    
    return {
        "conversation": conversation,
        "messages": messages
    }
