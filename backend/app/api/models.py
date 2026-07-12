from fastapi import APIRouter
from app.config import settings

router = APIRouter(tags=["models"])


# Curated list of Cloudflare Workers AI models the UI offers. The agent
# uses `settings.CLOUDFLARE_MODEL_ID` by default; users can override
# per-message from the model picker.
AVAILABLE_MODELS = [
    {
        "id": "@cf/moonshotai/kimi-k2.6",
        "label": "Kimi K2.6",
        "description": "Default — balanced reasoning and code.",
    },
    {
        "id": "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
        "label": "Llama 3.3 70B",
        "description": "Fast general-purpose chat.",
    },
    {
        "id": "@cf/meta/llama-3.1-8b-instruct-fast",
        "label": "Llama 3.1 8B",
        "description": "Quickest replies, lower cost.",
    },
]


@router.get("/models")
async def list_models():
    """Return the model list the UI should display in the picker. We always
    surface every entry — the model picker just records which id the user
    selected; if the underlying account doesn't have that model, the agent
    factory will fall back to settings.CLOUDFLARE_MODEL_ID."""
    return AVAILABLE_MODELS