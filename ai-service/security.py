from fastapi import Header, HTTPException, status
from config import settings

async def verify_service_secret(x_service_secret: str = Header(None, alias="X-Service-Secret")):
    """
    Ensure the incoming request includes the valid shared secret header.
    Allows local development bypass if set to development and no header sent in tests.
    """
    if not x_service_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-Service-Secret authorization header"
        )
    
    if x_service_secret != settings.SERVICE_SECRET:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid service secret credentials"
        )
    
    return True
