
import asyncio
from app.config import settings
from app.agent.factory import stream_agent

async def main():
    print("Running stream_agent...")
    count = 0
    async for chunk in stream_agent(settings, "test_conv", "Say hello", use_sandbox=False):
        print(f"CHUNK: {repr(chunk)}")
        count += 1
    print(f"Total chunks: {count}")

if __name__ == "__main__":
    asyncio.run(main())

