from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.agent.mcp_manager import mcp_manager

router = APIRouter(prefix="/connectors", tags=["connectors"])


class AddServerRequest(BaseModel):
    name: str
    command: str = ""
    args: list[str] = []
    env: dict[str, str] = {}
    transport: str = "stdio"  # "stdio" | "http" | "sse"
    url: str | None = None


# ── List all configured MCP servers ──────────────────────────────

@router.get("/")
async def list_connectors():
    """Return every configured MCP server with its connection status."""
    return mcp_manager.list_servers()


# ── Add a new MCP server config ──────────────────────────────────

@router.post("/")
async def add_connector(req: AddServerRequest):
    """Register a new MCP server config (does not connect automatically)."""
    config = req.model_dump(exclude={"name"})
    return mcp_manager.add_server(req.name, config)


# ── Connect to a server ─────────────────────────────────────────

@router.post("/{connector_id}/connect")
async def connect_connector(connector_id: str):
    """Start the MCP server process and establish a live connection."""
    try:
        return await mcp_manager.connect(connector_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Connection failed: {e}")


# ── Disconnect from a server ────────────────────────────────────

@router.post("/{connector_id}/disconnect")
async def disconnect_connector(connector_id: str):
    """Tear down the live connection to the MCP server."""
    try:
        return await mcp_manager.disconnect(connector_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── Delete a server config entirely ─────────────────────────────

@router.delete("/{connector_id}")
async def delete_connector(connector_id: str):
    """Remove an MCP server config. Disconnects first if connected."""
    removed = mcp_manager.remove_server(connector_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Server not found")
    return {"status": "deleted", "id": connector_id}


# ── List tools from a specific server ────────────────────────────

@router.get("/{connector_id}/tools")
async def connector_tools(connector_id: str):
    """List all tools exposed by a specific connected MCP server."""
    server = mcp_manager.get_server(connector_id)
    if server is None:
        raise HTTPException(status_code=404, detail="Server not found")
    tools = await mcp_manager.get_server_tools(connector_id)
    return {"server": connector_id, "tools": tools}
