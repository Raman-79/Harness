
import asyncio
from app.config import settings
from app.agent.factory import build_agent
from langchain_core.messages import HumanMessage

async def main():
    agent = build_agent(settings, use_sandbox=False)
    config = {"configurable": {"thread_id": "tool_test_1"}}
    msg = "Please use retrieve_from_files tool to find the secret code."
    
    print("Testing tool call...")
    async for event in agent.astream_events({"messages": [HumanMessage(content=msg)]}, config=config, version="v2"):
        print(event["event"], event.get("name"))

if __name__ == "__main__":
    asyncio.run(main())

