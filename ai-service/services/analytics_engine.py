from typing import List, Dict, Any
from collections import Counter
import math

def analyze_vulnerability_clusters(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Cluster records by vulnerability indicators, category of assistance, and demographic groups.
    """
    total = len(records)
    if total == 0:
        return {
            "total_records": 0,
            "vulnerability_breakdown": {"High": 0, "Moderate": 0, "Standard": 0},
            "category_distribution": {},
            "priority_attention_needed": 0
        }

    vulnerability_scores = []
    categories = []
    genders = []

    high_priority_count = 0

    for rec in records:
        data = rec.get("data", {})
        if not isinstance(data, dict):
            data = {}

        # Calculate a vulnerability score (0 to 100)
        score = 40  # baseline
        cat = data.get("assistance_category") or data.get("category") or "General"
        categories.append(str(cat))

        gender = str(data.get("gender") or "Not Specified")
        genders.append(gender)

        vuln_index = str(data.get("vulnerability_index") or "").lower()
        if "high" in vuln_index:
            score += 45
            high_priority_count += 1
        elif "moderate" in vuln_index:
            score += 25
        else:
            score += 10

        # Special need indicators
        if cat in ["Food Security", "Emergency Cash"]:
            score += 10
        if gender.lower() == "female":
            score += 5

        vulnerability_scores.append(min(score, 100))

    cat_counts = Counter(categories)
    cat_distribution = {k: {"count": v, "percentage": round((v / total) * 100, 1)} for k, v in cat_counts.items()}

    high_need = sum(1 for s in vulnerability_scores if s >= 75)
    mod_need = sum(1 for s in vulnerability_scores if 50 <= s < 75)
    std_need = total - (high_need + mod_need)

    avg_score = round(sum(vulnerability_scores) / total, 1)

    return {
        "total_records": total,
        "average_vulnerability_index": avg_score,
        "vulnerability_breakdown": {
            "High Priority (Score >= 75)": {"count": high_need, "percentage": round((high_need / total) * 100, 1)},
            "Moderate Need (Score 50-74)": {"count": mod_need, "percentage": round((mod_need / total) * 100, 1)},
            "Standard Assistance": {"count": std_need, "percentage": round((std_need / total) * 100, 1)}
        },
        "category_distribution": cat_distribution,
        "recommendations": [
            f"Prioritize immediate food/cash allocation for {high_need} high-vulnerability households.",
            f"Largest aid requirement currently clustered under: {max(cat_counts, key=cat_counts.get) if cat_counts else 'General'}.",
            "Coordinate with field officers to verify identity documents for recipients lacking verified status."
        ]
    }

def forecast_aid_demand(historical_counts: List[int], periods_ahead: int = 3) -> Dict[str, Any]:
    """
    Project future aid demand based on recent trajectory using linear least-squares regression.
    """
    n = len(historical_counts)
    if n < 2:
        baseline = historical_counts[0] if historical_counts else 100
        forecast = [int(baseline * (1 + 0.10 * (i + 1))) for i in range(periods_ahead)]
        return {
            "historical": historical_counts,
            "forecast": forecast,
            "projected_growth_rate": "10.0%",
            "confidence_band": "Estimated (Limited history)"
        }

    x = list(range(n))
    y = historical_counts

    x_mean = sum(x) / n
    y_mean = sum(y) / n

    numerator = sum((x[i] - x_mean) * (y[i] - y_mean) for i in range(n))
    denominator = sum((x[i] - x_mean) ** 2 for i in range(n))

    slope = numerator / denominator if denominator != 0 else 0
    intercept = y_mean - slope * x_mean

    forecast = []
    for step in range(1, periods_ahead + 1):
        future_x = n - 1 + step
        projected = max(int(round(intercept + slope * future_x)), 0)
        forecast.append(projected)

    growth_rate = round(((forecast[-1] - y[-1]) / max(y[-1], 1)) * 100, 1)

    return {
        "historical": historical_counts,
        "forecast": forecast,
        "projected_growth_rate": f"{growth_rate}%",
        "recommended_buffer_stock": int(forecast[-1] * 1.15),
        "planning_period": f"Next {periods_ahead} months"
    }
