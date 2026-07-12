
import asyncio
from app.config import settings
from app.agent.factory import stream_agent

async def main():
    print("Running stream_agent with retrieval...")
    count = 0
    try:
        async for chunk in stream_agent(settings, "test_conv2", "What is the secret code for the mission?", use_sandbox=False):
            print(f"CHUNK: {repr(chunk)}")
            count += 1
    except Exception as e:
        print("EXCEPTION: ", e)
    print(f"Total chunks: {count}")

if __name__ == "__main__":
    asyncio.run(main())

