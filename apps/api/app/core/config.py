from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_env: str = "development"
    api_debug: bool = True

    database_url: str
    redis_url: str
    celery_broker_url: str
    celery_result_backend: str

    internal_api_url: str | None = None

    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    extraction_provider: str = "openai"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()