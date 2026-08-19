from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import Optional

class Settings(BaseSettings):
    app_name: str = "Lyra Backend"
    database_url: str
    ollama_base_url: str
    ollama_model: str = Field(alias="OLLAMA_LLM_MODEL")
    ollama_api_key: str
    supabase_jwt_secret: Optional[str] = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
