
import requests
import asyncio
import websockets
import json
import uuid

WS_URL = "ws://localhost:8000/chat/stream"

async def chat_test():
    conversation_id = str(uuid.uuid4())
    try:
        async with websockets.connect(WS_URL) as ws:
            payload = {
                "conversation_id": conversation_id,
                "text": "What is the secret code for the mission?",
                "use_sandbox": False
            }
            await ws.send(json.dumps(payload))
            
            print("Connected and sent payload.")
            while True:
                response_str = await ws.recv()
                print(f"WS RECV: {response_str}")
                data = json.loads(response_str)
                if data["type"] == "done":
                    break
                elif data["type"] == "error":
                    print(f"Chat error: {data.get('data')}")
                    break
    except Exception as e:
        print(f"WebSocket error: {e}")

if __name__ == "__main__":
    asyncio.run(chat_test())

