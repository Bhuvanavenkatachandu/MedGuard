import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

BACKEND_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        extra="allow"
    )

    DATABASE_URL: str = "postgresql://localhost:5432/medguard"
    JWT_SECRET: str = "medguard_secret_jwt_key_super_secure_random_string_2026"
    JWT_SECRET_KEY: str = "medguard_secret_jwt_key_super_secure_random_string_2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200  # 30 days
    GEMMA_API_KEY: str = ""
    GEMMA_API_URL: str = ""
    GEMMA_MODEL: str = "gemma-4-26b-a4b-it"

    # Generic SMTP Email Settings (Optional)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@medguard.io"

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
    STORAGE_DIR: str = str(BACKEND_DIR / "storage")

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def clean_database_url(self) -> str:
        """
        Normalize DATABASE_URL for SQLAlchemy.
        Ensures postgres:// is mapped to postgresql:// (essential for Neon / Heroku URLs)
        """
        url = self.DATABASE_URL.strip()
        if url.startswith("postgres://"):
            url = "postgresql://" + url[len("postgres://"):]
        return url

settings = Settings()

# If STORAGE_DIR is relative, resolve to BACKEND_DIR
if settings.STORAGE_DIR.startswith("./"):
    settings.STORAGE_DIR = str(BACKEND_DIR / settings.STORAGE_DIR.replace("./", ""))
