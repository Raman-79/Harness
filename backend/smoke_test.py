import asyncio, websockets, json, uuid

async def test():
    async with websockets.connect("ws://localhost:8000/chat/stream") as ws:
        await ws.send(json.dumps({"conversation_id": str(uuid.uuid4()), "text": "Hello", "use_sandbox": False}))
        while True:
            data = json.loads(await ws.recv())
            msg_type = data.get("type", "")
            msg_data = str(data.get("data", ""))[:80]
            print(f"{msg_type}: {msg_data}")
            if msg_type in ("done", "error"):
                break

asyncio.run(test())
