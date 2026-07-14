import json
from typing import AsyncGenerator, Optional
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


def _resolve_model(settings, model_id: Optional[str]):
    """Pick the LLM. We accept a model_id override and otherwise fall back
    to the configured Cloudflare model. If the override starts with a
    different provider prefix the caller can extend this later."""
    chosen = model_id or settings.CLOUDFLARE_MODEL_ID
    return ChatCloudflareWorkersAI(
        model=chosen,
        api_token=settings.CLOUDFLARE_API_KEY,
        account_id=settings.CLOUDFLARE_ACCOUNT_ID,
    )


def _build_system_prompt(
    base: str, style: Optional[str], project_id: Optional[str]
) -> str:
    """Compose the system prompt: base + style + project custom instructions."""
    parts = [base]
    if style and style != "default":
        parts.append(
            f"\n[Style preference: {style}. Adjust your tone and formatting accordingly.]"
        )
    if project_id:
        # Custom instructions are loaded at the chat level; here we just leave
        # a hook so the caller can inject them via a project fetch.
        parts.append(
            f"\n[Active project id: {project_id}. Apply any custom instructions from that project.]"
        )
    return "\n".join(parts)


def build_agent(
    settings,
    use_sandbox: bool = False,
    model_id: Optional[str] = None,
    style: Optional[str] = None,
    enable_web_search: bool = False,
    project_id: Optional[str] = None,
):
    if use_sandbox and settings.SANDBOX_PROVIDER == "e2b":
        from langchain_e2b import E2BSandbox

        backend = E2BSandbox(
            api_key=settings.E2B_API_KEY,
            timeout=settings.SANDBOX_EXECUTION_TIMEOUT,
        )
    else:
        backend = FilesystemBackend(root_dir=settings.AGENT_FS_ROOT, virtual_mode=True)

    model = _resolve_model(settings, model_id)

    # Merge built-in tools with any tools from connected MCP servers
    tools = [retrieve_from_files] + mcp_manager.get_tools()

    if enable_web_search:
        # Lazy import so we don't require a search SDK at boot when disabled.
        try:
            from app.agent.tools.web_search import web_search

            tools.append(web_search)
        except ImportError:
            pass

    system_prompt = _build_system_prompt(CHAT_SYSTEM_PROMPT, style, project_id)

    agent = create_deep_agent(
        model=model,
        backend=backend,
        tools=tools,
        skills=settings.SKILLS_DIRS,
        system_prompt=system_prompt,
        checkpointer=checkpointer,
        interrupt_on=["execute_python", "execute_command"] if use_sandbox else None,
    )
    return agent


async def stream_agent(
    settings,
    conversation_id: str,
    message: str,
    file_ids: Optional[list[str]] = None,
    use_sandbox: bool = False,
    model_id: Optional[str] = None,
    style: Optional[str] = None,
    enable_web_search: bool = False,
    enable_thinking: bool = False,
    project_id: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    agent = build_agent(
        settings,
        use_sandbox=use_sandbox,
        model_id=model_id,
        style=style,
        enable_web_search=enable_web_search,
        project_id=project_id,
    )
    config = {"configurable": {"thread_id": conversation_id}}

    # If the caller passed file_ids, attach them as additional_kwargs metadata
    # on the HumanMessage so downstream tools can read them via
    # messages[-1].additional_kwargs. This avoids polluting the model's
    # natural-language input.
    human = HumanMessage(content=message)
    if file_ids:
        human.additional_kwargs = {**(human.additional_kwargs or {}), "file_ids": file_ids}

    async for event in agent.astream_events(
        {"messages": [human]}, config=config, version="v2"
    ):
        if event["event"] == "on_chat_model_stream":
            chunk = event["data"]["chunk"]
            if isinstance(chunk.content, str) and chunk.content:
                yield chunk.content
            elif isinstance(chunk.content, list):
                for block in chunk.content:
                    if isinstance(block, dict) and block.get("type") == "text" and block.get("text"):
                        yield block["text"]
