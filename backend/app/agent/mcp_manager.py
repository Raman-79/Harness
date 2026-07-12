"""
MCP Server Manager — manages connections to external MCP servers (Figma, Gmail, etc.)
and exposes their tools to the LangGraph agent.
"""
import os
import json
import asyncio
import logging
from pathlib import Path
from typing import Any
from langchain_mcp_adapters.client import MultiServerMCPClient

logger = logging.getLogger(__name__)

# Persistent config file
_CONFIG_PATH = Path("./data/mcp_servers.json")
_SEED_PATH = Path("../connectors.yaml")  # root-level connectors.yaml


def _load_config() -> dict[str, dict]:
    """Load saved MCP server configs from disk."""
    if _CONFIG_PATH.exists():
        return json.loads(_CONFIG_PATH.read_text())
    # First run — seed from connectors.yaml if it exists
    if _SEED_PATH.exists():
        try:
            import yaml
            raw = yaml.safe_load(_SEED_PATH.read_text()) or {}
            servers = {}
            for name, cfg in (raw.get("mcpServers") or {}).items():
                servers[name] = {
                    "name": name,
                    "command": cfg.get("command", ""),
                    "args": cfg.get("args", []),
                    "env": cfg.get("env", {}),
                    "transport": "stdio",
                }
            _save_config(servers)
            return servers
        except Exception:
            logger.warning("Failed to seed from connectors.yaml", exc_info=True)
    return {}


def _save_config(servers: dict[str, dict]) -> None:
    """Persist server configs to disk."""
    _CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    _CONFIG_PATH.write_text(json.dumps(servers, indent=2))


class MCPManager:
    """
    Singleton that manages MCP server configs and live connections.
    
    Server configs are persisted in data/mcp_servers.json.
    Live connections are held in memory via MultiServerMCPClient.
    """

    def __init__(self) -> None:
        self._servers: dict[str, dict] = _load_config()
        self._connected: dict[str, bool] = {}  # name -> connected?
        self._client: MultiServerMCPClient | None = None
        self._tools: list = []
        self._lock = asyncio.Lock()

    # ── Config CRUD ──────────────────────────────────────────────

    def list_servers(self) -> list[dict]:
        """Return all configured servers with their connection status."""
        result = []
        for name, cfg in self._servers.items():
            result.append({
                **cfg,
                "id": name,
                "status": "connected" if self._connected.get(name) else "disconnected",
            })
        return result

    def get_server(self, name: str) -> dict | None:
        cfg = self._servers.get(name)
        if cfg is None:
            return None
        return {
            **cfg,
            "id": name,
            "status": "connected" if self._connected.get(name) else "disconnected",
        }

    def add_server(self, name: str, config: dict) -> dict:
        """Add a new MCP server config (does NOT connect yet)."""
        config["name"] = name
        config.setdefault("transport", "stdio")
        config.setdefault("command", "")
        config.setdefault("args", [])
        config.setdefault("env", {})
        self._servers[name] = config
        _save_config(self._servers)
        return {**config, "id": name, "status": "disconnected"}

    def remove_server(self, name: str) -> bool:
        """Remove a server config (disconnects first if connected)."""
        if name not in self._servers:
            return False
        self._connected.pop(name, None)
        del self._servers[name]
        _save_config(self._servers)
        return True

    # ── Connection lifecycle ─────────────────────────────────────

    async def connect(self, name: str) -> dict:
        """Start a live connection to the named MCP server."""
        if name not in self._servers:
            raise ValueError(f"Unknown MCP server: {name}")

        async with self._lock:
            self._connected[name] = True
            await self._rebuild_client()

        return self.get_server(name)  # type: ignore

    async def disconnect(self, name: str) -> dict:
        """Tear down the connection to the named MCP server."""
        if name not in self._servers:
            raise ValueError(f"Unknown MCP server: {name}")

        async with self._lock:
            self._connected.pop(name, None)
            await self._rebuild_client()

        return self.get_server(name)  # type: ignore

    async def _rebuild_client(self) -> None:
        """
        Rebuild the MultiServerMCPClient with only the currently-connected
        servers.  This tears down the old client (if any) and creates a fresh one.
        """
        # Tear down old client reference
        if self._client is not None:
            self._client = None
            self._tools = []

        # Build connection dict for connected servers only
        connection_dict: dict[str, Any] = {}
        for name, connected in self._connected.items():
            if not connected:
                continue
            cfg = self._servers.get(name)
            if cfg is None:
                continue

            transport = cfg.get("transport", "stdio")
            if transport == "stdio":
                merged_env = os.environ.copy()
                if "env" in cfg and isinstance(cfg["env"], dict):
                    # Filter out empty string values to avoid type errors in subprocess
                    for k, v in cfg["env"].items():
                        if v:
                            merged_env[k] = str(v)
                
                connection_dict[name] = {
                    "transport": "stdio",
                    "command": cfg["command"],
                    "args": cfg.get("args", []),
                    "env": merged_env,
                }
            elif transport in ("http", "sse"):
                connection_dict[name] = {
                    "transport": transport,
                    "url": cfg.get("url", ""),
                }

        if not connection_dict:
            return

        try:
            client = MultiServerMCPClient(connection_dict)
            self._client = client
            self._tools = await self._client.get_tools()
            logger.info(
                "MCP client rebuilt — %d server(s), %d tool(s)",
                len(connection_dict),
                len(self._tools),
            )
        except Exception:
            logger.error("Failed to rebuild MCP client", exc_info=True)
            self._client = None
            self._tools = []
            # Mark all as errored
            for name in connection_dict:
                self._connected[name] = False

    # ── Tool access ──────────────────────────────────────────────

    def get_tools(self) -> list:
        """Return all LangChain-compatible tools from connected servers."""
        return list(self._tools)

    async def get_server_tools(self, name: str) -> list[str]:
        """Return tool names for a specific server."""
        if not self._connected.get(name):
            return []
        # Filter tools by server name prefix
        return [t.name for t in self._tools if t.name.startswith(name)]


# Module-level singleton
mcp_manager = MCPManager()
