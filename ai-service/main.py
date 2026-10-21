from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from routers import clean, analyze, predict

app = FastAPI(
    title="NGOConnect AI Engine",
    description="Microservice powering phonetic duplicate detection, anomaly isolation, vulnerability clustering, and resource forecasting.",
    version="2.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(clean.router, prefix="/api/v1")
app.include_router(analyze.router, prefix="/api/v1")
app.include_router(predict.router, prefix="/api/v1")

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "NGOConnect AI Engine",
        "version": "2.0.0",
        "environment": settings.ENVIRONMENT
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
