import asyncio
from app.config import settings
from app.agent.factory import stream_agent
from langchain_core.messages import HumanMessage

async def main():
    print("Testing stream_agent directly...")
    async for chunk in stream_agent(
        settings=settings,
        conversation_id="test-125",
        message="read the contents of dummy.txt from the allowed directories",
    ):
        print(f"YIELDED: {repr(chunk)}")

if __name__ == "__main__":
    asyncio.run(main())
