from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.api.files import router as files_router
from app.api.conversations import (
    router as conversations_router,
    projects_router,
)
from app.api.chat import router as chat_router
from app.api.artifacts import router as artifacts_router
from app.api.skills import router as skills_router
from app.api.connectors import router as connectors_router
from app.api.models import router as models_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(files_router)
app.include_router(conversations_router)
app.include_router(projects_router)
app.include_router(chat_router)
app.include_router(artifacts_router)
app.include_router(skills_router)
app.include_router(connectors_router)
app.include_router(models_router)

@app.get("/health")
async def health():
    return {"status": "ok"}
