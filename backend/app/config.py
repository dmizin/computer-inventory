"""
Configuration settings for Computer Inventory System backend
"""
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator
import os


class Settings(BaseSettings):
    """Application configuration settings"""

    # Application
    app_name: str = "Computer Inventory System"
    app_version: str = "1.0.0"
    debug: bool = False

    # Database
    database_url: str = Field(
        default="postgresql://inventory_user:password@localhost/inventory",
        description="PostgreSQL database URL"
    )

    # API Keys - comma-separated list of bcrypt hashed API keys
    api_keys: str = Field(
        default="",
        description="Comma-separated list of hashed API keys"
    )

    # CORS - as string that will be parsed into list
    cors_origins: str = Field(
        default="http://localhost:3000",
        description="Comma-separated list of allowed CORS origins"
    )

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    reload: bool = False

    # Logging
    log_level: str = "INFO"

    # Pagination
    default_page_size: int = 20
    max_page_size: int = 100

    @field_validator("cors_origins", mode="before")
    @classmethod
    def validate_cors_origins(cls, v):
        """Parse CORS origins from string or return as-is if already list"""
        if isinstance(v, str):
            if not v.strip():
                return "http://localhost:3000"
            return v.strip()
        return v

    @field_validator("api_keys", mode="before")
    @classmethod
    def validate_api_keys(cls, v):
        """Validate API keys format"""
        if not v or not v.strip():
            return ""

        # Validate that all keys look like bcrypt hashes
        keys = [k.strip() for k in v.split(',') if k.strip()]
        for key in keys:
            if not key.startswith('$2b$'):
                raise ValueError(f"API key must be bcrypt hashed: {key[:10]}...")
        return v

    def get_cors_origins_list(self) -> List[str]:
        """Get CORS origins as a list"""
        if isinstance(self.cors_origins, str):
            return [origin.strip() for origin in self.cors_origins.split(',') if origin.strip()]
        return self.cors_origins if isinstance(self.cors_origins, list) else []

    def get_api_key_hashes(self) -> List[str]:
        """Get list of API key hashes"""
        if not self.api_keys:
            return []
        return [k.strip() for k in self.api_keys.split(',') if k.strip()]

    # Pydantic V2 configuration
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding='utf-8',
        case_sensitive=False
    )

    # 1Password Connect Integration
    onepassword_enabled: bool = Field(False, description="Enable 1Password Connect integration")
    op_connect_host: Optional[str] = Field(None, description="1Password Connect server URL")
    op_api_token: Optional[str] = Field(None, description="1Password Connect API token")
    op_vault_name: str = Field("Computer-Inventory", description="1Password vault name")
    op_secret_template: str = Field("asset-{asset_id}", description="Template for secret names")

    # 1Password connection testing
    op_connection_timeout: int = Field(10, description="Connection timeout in seconds")


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Dependency to get settings"""
    return settings


# Development helper function
def generate_api_key() -> tuple[str, str]:
    """
    Generate a new API key and its bcrypt hash
    Returns: (plain_key, hashed_key)
    """
    import secrets
    import bcrypt

    plain_key = secrets.token_urlsafe(32)
    hashed_key = bcrypt.hashpw(plain_key.encode(), bcrypt.gensalt()).decode()

    return plain_key, hashed_key


if __name__ == "__main__":
    # Helper script to generate API keys
    print("Generating new API key...")
    plain, hashed = generate_api_key()
    print(f"Plain key (use in requests): {plain}")
    print(f"Hashed key (add to API_KEYS env var): {hashed}")
    print("\nAdd this to your .env file:")
    print(f"API_KEYS={hashed}")
