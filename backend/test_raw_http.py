import asyncio
from app.config import settings
from app.agent.factory import build_agent
from langchain_core.messages import HumanMessage
from app.agent.mcp_manager import mcp_manager

async def main():
    agent = build_agent(
        settings=settings,
        use_sandbox=False,
    )
    human = HumanMessage(content="Please read dummy.txt in the allowed directories")
    
    # We will invoke it and print the raw HTTP stream from Cloudflare
    model = agent.get_model()
    async for chunk in model._astream([human]):
        print(f"RAW CHUNK: {chunk}")
        break

if __name__ == "__main__":
    asyncio.run(main())
