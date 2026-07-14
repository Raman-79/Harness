import asyncio
import json
from app.config import settings
from app.agent.factory import stream_agent, build_agent
from app.agent.mcp_manager import mcp_manager

async def main():
    print("Connecting filesystem MCP...")
    # Connect
    await mcp_manager.connect("filesystem")
    tools = mcp_manager.get_tools()
    print(f"Loaded tools: {[t.name for t in tools]}")
    
    print("\nAsking agent to read dummy.txt...")
    agent = build_agent(
        settings=settings,
        use_sandbox=False,
    )
    from langchain_core.messages import HumanMessage
    human = HumanMessage(content="Please read the contents of dummy.txt in the C:\\Users\\Sam\\Harness\\backend directory using the filesystem tool.")
    
    response = await agent.ainvoke(
        {"messages": [human]}, config={"configurable": {"thread_id": "test-124"}}
    )
    
    print("\nFINAL MESSAGES:")
    for m in response["messages"]:
        print(f"[{m.type}]: {m.content}")
        if hasattr(m, 'tool_calls') and m.tool_calls:
            print(f"  Tool calls: {m.tool_calls}")
    print("\nDone")

if __name__ == "__main__":
    asyncio.run(main())
