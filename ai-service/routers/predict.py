from fastapi import APIRouter, Depends
from typing import List, Optional
from pydantic import BaseModel, Field
from security import verify_service_secret
from services.analytics_engine import forecast_aid_demand

router = APIRouter(prefix="/predict", tags=["Forecasting & Predictions"], dependencies=[Depends(verify_service_secret)])

class DemandForecastRequest(BaseModel):
    historical_counts: List[int] = Field(..., description="Chronological sequence of past distribution counts")
    periods_ahead: Optional[int] = Field(3, ge=1, le=12, description="Number of months to forecast ahead")

@router.post("/demand")
async def predict_demand(payload: DemandForecastRequest):
    """
    Project future aid relief demand and recommended buffer inventory.
    """
    forecast = forecast_aid_demand(payload.historical_counts, periods_ahead=payload.periods_ahead)
    return {
        "success": True,
        "forecast_results": forecast
    }
