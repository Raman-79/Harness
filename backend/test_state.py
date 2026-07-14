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
    config = {"configurable": {"thread_id": "test-129"}}
    
    try:
        await agent.ainvoke({"messages": [human]}, config=config)
    except Exception as e:
        print(f"Error: {e}")
    
    state = agent.get_state(config)
    for m in state.values["messages"]:
        print(f"\n--- {m.__class__.__name__} ---")
        print(f"Content: {m.content}")
        if hasattr(m, "tool_calls"):
            print(f"Tool Calls: {m.tool_calls}")

if __name__ == "__main__":
    asyncio.run(main())
