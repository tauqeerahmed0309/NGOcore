from fastapi import APIRouter, Depends, Body
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from security import verify_service_secret
from services.dedup_engine import scan_duplicates
from services.anomaly_engine import scan_anomalies

router = APIRouter(prefix="/clean", tags=["Data Cleaning"], dependencies=[Depends(verify_service_secret)])

class DeduplicateRequest(BaseModel):
    records: List[Dict[str, Any]] = Field(..., description="Array of record objects to analyze")
    threshold: Optional[float] = Field(0.70, ge=0.5, le=1.0, description="Minimum confidence match score")

class AnomalyRequest(BaseModel):
    records: List[Dict[str, Any]] = Field(..., description="Array of record objects to inspect")

@router.post("/deduplicate")
async def deduplicate_records(payload: DeduplicateRequest):
    """
    Scan records for phonetic and fuzzy duplicates across beneficiary profiles.
    """
    duplicates = scan_duplicates(payload.records, threshold=payload.threshold)
    return {
        "success": True,
        "scanned_count": len(payload.records),
        "duplicates_found": len(duplicates),
        "duplicate_pairs": duplicates
    }

@router.post("/anomalies")
async def detect_anomalies(payload: AnomalyRequest):
    """
    Scan records for demographic omissions, formatting irregularities, and numeric outliers.
    """
    anomalies = scan_anomalies(payload.records)
    return {
        "success": True,
        "scanned_count": len(payload.records),
        "anomalies_found": len(anomalies),
        "flagged_records": anomalies
    }
