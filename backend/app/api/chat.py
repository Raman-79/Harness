from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import uuid
import traceback
from app.agent.factory import stream_agent
from app.database import AsyncSessionLocal
from app.models import Conversation, Message
from app.config import settings
import asyncio

router = APIRouter(prefix="/chat", tags=["chat"])

@router.websocket("/stream")
async def chat_stream(websocket: WebSocket):
    await websocket.accept()
    
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            
            action = payload.get("action", "chat")
            
            # Simple approval handler for HITL (stub implementation)
            if action in ["approve", "reject"]:
                await websocket.send_json({"type": "info", "data": f"Action {action} received"})
                continue
                
            conversation_id = payload.get("conversation_id")
            text = payload.get("text", "")
            use_sandbox = payload.get("use_sandbox", False)
            
            async with AsyncSessionLocal() as db:
                if not conversation_id:
                    conversation_id = str(uuid.uuid4())
                    db.add(Conversation(id=conversation_id, title=text[:30]))
                    await db.commit()
                
                db.add(Message(conversation_id=conversation_id, role="user", content=text))
                await db.commit()
            
            # Use stream_agent from factory
            full_response = ""
            try:
                async for chunk in stream_agent(settings, conversation_id, text, use_sandbox=use_sandbox):
                    full_response += chunk
                    await websocket.send_json({"type": "token", "data": chunk})
                    
                # Save assistant response to DB
                async with AsyncSessionLocal() as db:
                    db.add(Message(conversation_id=conversation_id, role="assistant", content=full_response))
                    await db.commit()
                    
                await websocket.send_json({"type": "done", "conversation_id": conversation_id})
                
            except Exception as e:
                traceback.print_exc()
                await websocket.send_json({"type": "error", "data": str(e)})
            
    except WebSocketDisconnect:
        pass
    except Exception as e:
        traceback.print_exc()
        try:
            await websocket.send_json({"type": "error", "data": str(e)})
        except:
            pass
