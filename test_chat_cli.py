import asyncio
import websockets
import json
import uuid

async def chat():
    uri = "ws://localhost:8000/chat/stream"
    conversation_id = str(uuid.uuid4())
    
    print("Connecting to Forge Chatbot API...")
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected! Type your message (or 'exit' to quit):")
            while True:
                prompt = input("\nYou: ")
                if prompt.lower() in ['exit', 'quit']:
                    break
                    
                payload = {
                    "conversation_id": conversation_id,
                    "text": prompt,
                    "file_ids": []
                }
                await websocket.send(json.dumps(payload))
                
                print("Forge: ", end="", flush=True)
                
                while True:
                    response = await websocket.recv()
                    data = json.loads(response)
                    
                    if data["type"] == "token":
                        print(data["data"], end="", flush=True)
                    elif data["type"] == "done":
                        print()
                        break
                    elif data["type"] == "error":
                        print(f"\n[Error] {data.get('data')}")
                        break
                        
    except ConnectionRefusedError:
        print("\nFailed to connect. Make sure the backend API is running on port 8000.")
        print("You can start it by running: docker compose up api")
    except Exception as e:
        print(f"\nAn error occurred: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(chat())
    except KeyboardInterrupt:
        print("\nExiting...")
