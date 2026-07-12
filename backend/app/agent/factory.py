from typing import AsyncGenerator
from deepagents import create_deep_agent
from deepagents.backends.filesystem import FilesystemBackend
from langchain_cloudflare.chat_models import ChatCloudflareWorkersAI
from langchain_core.messages import BaseMessage, HumanMessage
from langgraph.checkpoint.memory import MemorySaver
from app.agent.tools.rag import retrieve_from_files
from app.agent.prompts import CHAT_SYSTEM_PROMPT
from app.agent.mcp_manager import mcp_manager

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

    # Merge built-in tools with any tools from connected MCP servers
    tools = [retrieve_from_files] + mcp_manager.get_tools()

    agent = create_deep_agent(
        model=model,
        backend=backend,
        tools=tools,
        skills=settings.SKILLS_DIRS,
        system_prompt=CHAT_SYSTEM_PROMPT,
        checkpointer=checkpointer,
        interrupt_on=["execute_python", "execute_command"] if use_sandbox else None,
    )
    return agent

async def stream_agent(settings, conversation_id: str, message: str, use_sandbox: bool = False) -> AsyncGenerator[str, None]:
    agent = build_agent(settings, use_sandbox=use_sandbox)
    config = {"configurable": {"thread_id": conversation_id}}
    
    response = await agent.ainvoke({"messages": [HumanMessage(content=message)]}, config=config)
    final_message = response["messages"][-1]
    
    content = final_message.content
    if isinstance(content, list):
        # Extract text blocks
        text_content = "".join([block.get("text", "") for block in content if isinstance(block, dict) and block.get("type") == "text"])
    else:
        text_content = content
        
    if text_content:
        yield text_content
