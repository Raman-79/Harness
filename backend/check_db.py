import asyncio
from app.database import AsyncSessionLocal
from app.models import Message
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Message).order_by(Message.created_at.desc()).limit(10))
        messages = result.scalars().all()
        for m in reversed(messages):
            print(f"[{m.role}]: {m.content}")

if __name__ == "__main__":
    asyncio.run(main())
