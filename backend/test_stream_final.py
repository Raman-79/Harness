import asyncio
from app.config import settings
from app.agent.factory import stream_agent
from langchain_core.messages import HumanMessage
from app.agent.mcp_manager import mcp_manager

async def main():
    await mcp_manager.connect("filesystem")
    print("Testing stream_agent directly...")
    async for chunk in stream_agent(
        settings=settings,
        conversation_id="test-128",
        message="read dummy.txt in the allowed directories",
    ):
        print(f"YIELDED: {repr(chunk)}")

if __name__ == "__main__":
    asyncio.run(main())
