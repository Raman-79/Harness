from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    CLOUDFLARE_ACCOUNT_ID: str = ""
    CLOUDFLARE_API_KEY: str = ""
    CLOUDFLARE_MODEL_ID: str = "@cf/moonshotai/kimi-k2.6"
    UPLOAD_DIR: str = "./data/uploads"
    CHROMA_DIR: str = "./data/chroma"
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/forge.db"
    MAX_UPLOAD_SIZE_MB: int = 50
    CHUNK_SIZE: int = 800
    CHUNK_OVERLAP: int = 100
    AGENT_FS_ROOT: str = "./data/agent-fs"
    SKILLS_DIRS: list[str] = ["./skills/"]
    E2B_API_KEY: str = ""
    FORGE_ENCRYPTION_KEY: str = ""
    SANDBOX_EXECUTION_TIMEOUT: int = 300
    SANDBOX_PROVIDER: str = "e2b"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
