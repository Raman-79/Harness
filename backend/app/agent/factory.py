from typing import AsyncGenerator
from deepagents import create_deep_agent
from deepagents.backends.filesystem import FilesystemBackend
from langchain_cloudflare.chat_models import ChatCloudflareWorkersAI
from langchain_core.messages import BaseMessage, HumanMessage
from langgraph.checkpoint.memory import MemorySaver
from app.agent.tools.rag import retrieve_from_files
from app.agent.prompts import CHAT_SYSTEM_PROMPT

# In-memory checkpointer for this phase. In production, use a database checkpointer.
checkpointer = MemorySaver()

def build_agent(settings, use_sandbox: bool = False):
    if use_sandbox and settings.SANDBOX_PROVIDER == "e2b":
        from langchain_e2b import E2BSandbox
        backend = E2BSandbox(api_key=settings.E2B_API_KEY, timeout=settings.SANDBOX_EXECUTION_TIMEOUT)
    else:
        backend = FilesystemBackend(root_dir=settings.AGENT_FS_ROOT)
        
    model = ChatCloudflareWorkersAI(
        model=settings.CLOUDFLARE_MODEL_ID,
        api_token=settings.CLOUDFLARE_API_KEY,
        account_id=settings.CLOUDFLARE_ACCOUNT_ID,
    )

    agent = create_deep_agent(
        model=model,
        backend=backend,
        tools=[retrieve_from_files],
        skills=settings.SKILLS_DIRS,
        system_prompt=CHAT_SYSTEM_PROMPT,
        checkpointer=checkpointer,
        interrupt_on=["execute_python", "execute_command"] if use_sandbox else None,
    )
    return agent

async def stream_agent(settings, conversation_id: str, message: str, use_sandbox: bool = False) -> AsyncGenerator[str, None]:
    agent = build_agent(settings, use_sandbox=use_sandbox)
    config = {"configurable": {"thread_id": conversation_id}}
    
    async for event in agent.astream_events({"messages": [HumanMessage(content=message)]}, config=config, version="v2"):
        if event["event"] == "on_chat_model_stream":
            chunk = event["data"]["chunk"]
            if chunk.content:
                yield chunk.content
