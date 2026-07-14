import asyncio
from app.config import settings
from app.agent.factory import build_agent
from langchain_core.messages import HumanMessage
from app.agent.mcp_manager import mcp_manager

async def main():
    await mcp_manager.connect("filesystem")
    agent = build_agent(
        settings=settings,
        use_sandbox=False,
    )
    human = HumanMessage(content="Please read dummy.txt in the allowed directories")
    
    async for event in agent.astream_events(
        {"messages": [human]}, config={"configurable": {"thread_id": "test-127"}}, version="v2"
    ):
        if event["event"] == "on_chat_model_stream":
            chunk = event["data"]["chunk"]
            print(f"STREAM: type={type(chunk.content)} val={repr(chunk.content)}")
            if hasattr(chunk, 'tool_call_chunks'):
                print(f"TOOL CHUNKS: {chunk.tool_call_chunks}")

if __name__ == "__main__":
    asyncio.run(main())
