import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PORT: int = int(os.getenv("PORT", 8000))
    HOST: str = os.getenv("HOST", "127.0.0.1")
    SERVICE_SECRET: str = os.getenv("SERVICE_SECRET", "secure_shared_secret_between_node_and_fastapi")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

settings = Settings()
