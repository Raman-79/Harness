from fastapi import APIRouter

router = APIRouter(prefix="/skills", tags=["skills"])

@router.get("/")
async def list_skills():
    return []

@router.get("/{name}")
async def get_skill(name: str):
    return {"name": name, "description": "Skill details"}

@router.post("/")
async def create_skill():
    return {"status": "success"}

@router.delete("/{name}")
async def delete_skill(name: str):
    return {"status": "success"}
