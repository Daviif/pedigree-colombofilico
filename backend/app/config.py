from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://pedigree:pedigree@localhost:5436/pedigree"
    cors_origins: list[str] = ["http://localhost:5173"]
    # Em produção, SECRET_KEY vem do .env e COOKIE_SECURE=true (só HTTPS).
    secret_key: str = "dev-inseguro-troque-esta-chave-em-producao"
    cookie_secure: bool = False

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
