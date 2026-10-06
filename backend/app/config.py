from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Local development (docker-compose): built from separate parts
    postgres_user: str = "subasta"
    postgres_password: str = ""
    postgres_db: str = "subastacampo"
    postgres_host: str = "localhost"
    postgres_port: int = 5432

    # Production: full connection string provided by the hosting platform
    database_url_env: str | None = Field(default=None, validation_alias="DATABASE_URL")

    jwt_secret: str
    jwt_expire_minutes: int = 60 * 24  # token lasts 1 day

    cors_origins: list[str] = ["http://localhost:4200"]

    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")

    @property
    def database_url(self) -> str:
        if self.database_url_env:
            url = self.database_url_env
            # Hosting platforms use postgres:// or postgresql://; SQLAlchemy needs the psycopg driver
            for prefix in ("postgres://", "postgresql://"):
                if url.startswith(prefix):
                    return "postgresql+psycopg://" + url[len(prefix):]
            return url
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )


settings = Settings()
