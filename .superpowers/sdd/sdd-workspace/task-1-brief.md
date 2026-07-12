## Task 1: Backend stub extension

**Files:**
- Modify: `backend/app/api/connectors.py`

**Interfaces:**
- Produces: `GET /connectors/` returns a list of 4 entries with `id, name, status, transport`. `POST /connectors/{id}/connect` returns `{ status, url? }` where `url` is set for `figma` and omitted for others. `POST /connectors/{id}/disconnect` returns `{ status: "success" }`. `POST /connectors/custom` accepts a JSON body matching the `CustomServerPayload` TypeScript shape and returns a synthesized `Connector` with a new UUID id and `status: "disconnected"`.

- [ ] **Step 1: Replace `backend/app/api/connectors.py` with the extended stub**

```python
import uuid

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/connectors", tags=["connectors"])


class CustomServerIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    transport: str = Field(..., pattern="^(stdio|http|streamable_http)$")
    command: str | None = None
    args: list[str] | None = None
    url: str | None = None
    token: str | None = None
    env: dict[str, str] | None = None


# Predefined registry. Real wiring (connectors.yaml + OAuth) is Phase 4.
REGISTRY = [
    {"id": "figma", "name": "Figma", "status": "disconnected", "transport": "streamable_http"},
    {"id": "gmail", "name": "Gmail", "status": "disconnected", "transport": "http"},
    {"id": "slack", "name": "Slack", "status": "disconnected", "transport": "http"},
    {"id": "canva", "name": "Canva", "status": "disconnected", "transport": "http"},
]


@router.get("/")
async def list_connectors():
    return REGISTRY


@router.post("/{connector_id}/connect")
async def connect_connector(connector_id: str):
    # Only Figma triggers an OAuth URL in the stub. Others flip to connected
    # without a redirect.
    if connector_id == "figma":
        return {"status": "pending", "url": "https://example.com/oauth"}
    return {"status": "connected"}


@router.get("/{connector_id}/callback")
async def connector_callback(connector_id: str, code: str):
    return {"status": "success"}


@router.post("/{connector_id}/disconnect")
async def disconnect_connector(connector_id: str):
    return {"status": "success"}


@router.post("/custom")
async def add_custom_server(payload: CustomServerIn):
    return {
        "id": f"custom-{uuid.uuid4()}",
        "name": payload.name,
        "status": "disconnected",
        "transport": payload.transport,
        "isCustom": True,
    }
```

- [ ] **Step 2: Verify the file imports cleanly**

Run from the repo root:

```bash
cd backend && python -c "from app.api.connectors import router; print(len(router.routes))"
```

Expected: prints `5` (one route each for `list`, `connect`, `callback`, `disconnect`, `custom`).

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/connectors.py
git commit -m "feat(backend): extend connectors stub to list 4 servers + add custom endpoint

Adds POST /connectors/custom for the frontend's add-server flow. Figma
returns an OAuth URL stub; others flip to connected directly. Real
wiring is the Phase 4 follow-up.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

