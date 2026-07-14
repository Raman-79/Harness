from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import uuid
import traceback
from app.agent.factory import stream_agent
from app.agent.artifacts.detector import detect_artifacts
from app.database import AsyncSessionLocal
from app.models import Conversation, Message, Artifact, ArtifactVersion
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

            # Stop signal — just acknowledge and move on. The streaming generator
            # can't actually be cancelled mid-yield, so the next "chat" payload
            # simply supersedes the in-flight one.
            if action == "stop":
                await websocket.send_json({"type": "info", "data": "stopping"})
                continue

            if action in ["approve", "reject"]:
                await websocket.send_json(
                    {"type": "info", "data": f"Action {action} received"}
                )
                continue

            conversation_id = payload.get("conversation_id")
            text = payload.get("text", "")
            file_ids = payload.get("file_ids") or []
            use_sandbox = payload.get("use_sandbox", False)
            model_id = payload.get("model_id")
            style = payload.get("style")
            enable_web_search = payload.get("enable_web_search", False)
            enable_thinking = payload.get("enable_thinking", False)
            project_id = payload.get("project_id")

            async with AsyncSessionLocal() as db:
                if not conversation_id:
                    conversation_id = str(uuid.uuid4())
                    db.add(Conversation(id=conversation_id, title=(text or "New chat")[:60]))
                else:
                    # Touch updated_at when a new message lands.
                    conv = await db.get(Conversation, conversation_id)
                    if conv is None:
                        db.add(Conversation(id=conversation_id, title=(text or "New chat")[:60]))
                    else:
                        from datetime import datetime
                        conv.updated_at = datetime.utcnow()

                user_message = Message(
                    conversation_id=conversation_id,
                    role="user",
                    content=text,
                )
                db.add(user_message)
                await db.commit()
                user_message_id = user_message.id

            # Stream from the agent, with the optional RAG context.
            full_response = ""
            try:
                async for chunk in stream_agent(
                    settings,
                    conversation_id,
                    text,
                    file_ids=file_ids if file_ids else None,
                    use_sandbox=use_sandbox,
                    model_id=model_id,
                    style=style,
                    enable_web_search=enable_web_search,
                    enable_thinking=enable_thinking,
                    project_id=project_id,
                ):
                    full_response += chunk
                    await websocket.send_json({"type": "token", "data": chunk})

                # Persist assistant message
                async with AsyncSessionLocal() as db:
                    assistant_message = Message(
                        conversation_id=conversation_id,
                        role="assistant",
                        content=full_response,
                    )
                    db.add(assistant_message)
                    await db.commit()
                    assistant_message_id = assistant_message.id

                # Detect artifacts in the response. Each >5-line code block
                # becomes an Artifact + first ArtifactVersion row.
                artifacts = detect_artifacts(full_response)
                if artifacts:
                    async with AsyncSessionLocal() as db:
                        for a in artifacts:
                            artifact_id = str(uuid.uuid4())
                            db.add(
                                Artifact(
                                    id=artifact_id,
                                    conversation_id=conversation_id,
                                    message_id=assistant_message_id,
                                    title=f"{a['language']} artifact",
                                    language=a["language"],
                                )
                            )
                            db.add(
                                ArtifactVersion(
                                    id=str(uuid.uuid4()),
                                    artifact_id=artifact_id,
                                    content=a["content"],
                                    language=a["language"],
                                    version_number=1,
                                )
                            )
                            await websocket.send_json(
                                {
                                    "type": "artifact",
                                    "data": {
                                        "id": artifact_id,
                                        "conversation_id": conversation_id,
                                        "title": f"{a['language']} artifact",
                                        "language": a["language"],
                                        "content": a["content"],
                                    },
                                }
                            )
                        await db.commit()

                await websocket.send_json(
                    {"type": "done", "conversation_id": conversation_id}
                )

            except Exception as e:
                with open("traceback_inner.log", "w") as f:
                    traceback.print_exc(file=f)
                traceback.print_exc()
                await websocket.send_json({"type": "error", "data": str(e)})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        with open("traceback.log", "w") as f:
            traceback.print_exc(file=f)
        traceback.print_exc()
        try:
            await websocket.send_json({"type": "error", "data": str(e)})
        except Exception:
            pass
