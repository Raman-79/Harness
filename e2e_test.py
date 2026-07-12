
import requests
import asyncio
import websockets
import json
import uuid
import time
import sys

API_URL = "http://localhost:8000"
WS_URL = "ws://localhost:8000/chat/stream"

def run_test():
    # 1. Create a dummy file
    filename = "dummy_test.txt"
    content = "The secret code for the mission is ALPHA_BRAVO_99. The captain is Jonathan Doe."
    with open(filename, "w") as f:
        f.write(content)

    print("Uploading file...")
    # 2. Upload file
    with open(filename, "rb") as f:
        files = {"file": (filename, f, "text/plain")}
        res = requests.post(f"{API_URL}/files/", files=files)
        if res.status_code != 200:
            print(f"Failed to upload: {res.text}")
            return False
        
        file_id = res.json()["file_id"]
        print(f"Uploaded successfully. File ID: {file_id}")

    # 3. Poll for ready status
    print("Waiting for file ingestion...")
    ready = False
    for i in range(10):
        res = requests.get(f"{API_URL}/files/{file_id}")
        status = res.json().get("status")
        if status == "ready":
            ready = True
            break
        elif status and status.startswith("error"):
            print(f"File ingestion failed: {status}")
            return False
        time.sleep(1)

    if not ready:
        print("File did not become ready in time.")
        return False

    print("File is ready. Now testing chat...")
    # 4. Chat via WS
    async def chat_test():
        conversation_id = str(uuid.uuid4())
        try:
            async with websockets.connect(WS_URL) as ws:
                payload = {
                    "conversation_id": conversation_id,
                    "text": "What is the secret code for the mission? And who is the captain?",
                    "use_sandbox": False
                }
                await ws.send(json.dumps(payload))
                
                full_response = ""
                while True:
                    response_str = await ws.recv()
                    data = json.loads(response_str)
                    
                    if data["type"] == "token":
                        full_response += data["data"]
                    elif data["type"] == "done":
                        break
                    elif data["type"] == "error":
                        print(f"Chat error: {data.get('data')}")
                        return False
                        
                print("\n--- Assistant Response ---")
                print(full_response)
                print("--------------------------\n")
                
                if "ALPHA_BRAVO_99" in full_response and "Jonathan Doe" in full_response:
                    print("TEST PASSED: Chatbot retrieved the correct information from the dummy file!")
                    return True
                else:
                    print("TEST FAILED: Chatbot did not return the expected information.")
                    return False
        except Exception as e:
            print(f"WebSocket error: {e}")
            return False

    return asyncio.run(chat_test())

if __name__ == "__main__":
    sys.exit(0 if run_test() else 1)

