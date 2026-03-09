from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings) :
    PROJECT_NAME : str
    API_STR : str
    VERSION : str
    
    POSTGRES_USER : str
    POSTGRES_PASSWORD : str
    POSTGRES_DB : str
    POSTGRES_HOST : str
    POSTGRES_PORT : int
    
    DATABASE_URL : str
    
    JWT_SECRET_KEY : str
    JWT_ALGORITHM : str
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES : int
    
    ADMIN_EMAIL : str
    ADMIN_PASSWORD : str
    
    SMTP_HOST : str
    SMTP_PORT : int
    SMTP_TLS : bool
    SMTP_USER : str
    SMTP_PASSWORD : str
    SMTP_FROM_EMAIL : str
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()