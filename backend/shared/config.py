"""MedGuard AI - Configuration Management

Central application settings loaded from environment variables or .env file.
Uses Pydantic BaseSettings for strong typing, automatic validation, and default values.
"""

from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base backend directory path (used for resolving relative storage & .env paths)
BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Application runtime configuration."""

    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        extra="allow",
        case_sensitive=False,
    )

    # Database Configuration
    DATABASE_URL: str = "postgresql://localhost:5432/medguard"

    # Authentication & Security
    JWT_SECRET: str = "medguard_secret_jwt_key_super_secure_random_string_2026"
    JWT_SECRET_KEY: str = "medguard_secret_jwt_key_super_secure_random_string_2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200

    # AI & Vision Models
    GEMMA_API_KEY: str = ""
    GEMMA_API_URL: str = ""
    GEMMA_MODEL: str = "gemma-4-26b-a4b-it"
    PRIMARY_VISION_MODEL: str = "gemma-4-26b-a4b-it"
    FALLBACK_VISION_MODEL: str = "gemini-3.8-flash"

    # Hybrid OCR Confidence Thresholds
    OCR_MEDICINE_NAME_THRESHOLD: float = 80.0
    OCR_STRENGTH_THRESHOLD: float = 80.0
    OCR_BATCH_THRESHOLD: float = 80.0
    OCR_DATE_THRESHOLD: float = 80.0

    # SMTP Email Settings
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@medguard.io"

    # CORS & File Storage Settings
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
    STORAGE_DIR: str = str(BACKEND_DIR / "storage")

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def clean_database_url(self) -> str:
        url = self.DATABASE_URL.strip()
        if url.startswith("postgres://"):
            url = "postgresql://" + url[len("postgres://"):]
        return url


settings = Settings()

if settings.STORAGE_DIR.startswith("./"):
    settings.STORAGE_DIR = str(BACKEND_DIR / settings.STORAGE_DIR.replace("./", ""))
