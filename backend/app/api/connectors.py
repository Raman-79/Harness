from fastapi import APIRouter

router = APIRouter(prefix="/connectors", tags=["connectors"])

@router.get("/")
async def list_connectors():
    return [{"id": "figma", "name": "Figma", "status": "disconnected"}]

@router.post("/{connector_id}/connect")
async def connect_connector(connector_id: str):
    return {"status": "success", "url": "https://example.com/oauth"}

@router.get("/{connector_id}/callback")
async def connector_callback(connector_id: str, code: str):
    return {"status": "success"}

@router.post("/{connector_id}/disconnect")
async def disconnect_connector(connector_id: str):
    return {"status": "success"}
