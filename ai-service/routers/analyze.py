from fastapi import APIRouter, Depends
from typing import List, Dict, Any
from pydantic import BaseModel, Field
from security import verify_service_secret
from services.analytics_engine import analyze_vulnerability_clusters

router = APIRouter(prefix="/analyze", tags=["Analytics & Clustering"], dependencies=[Depends(verify_service_secret)])

class VulnerabilityRequest(BaseModel):
    records: List[Dict[str, Any]] = Field(..., description="Array of records to analyze")

@router.post("/vulnerability")
async def analyze_vulnerability(payload: VulnerabilityRequest):
    """
    Cluster records into vulnerability priority tiers and category distributions.
    """
    results = analyze_vulnerability_clusters(payload.records)
    return {
        "success": True,
        "analytics": results
    }
