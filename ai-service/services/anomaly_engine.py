import re
from typing import List, Dict, Any

def scan_anomalies(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Scan records for input irregularities, formatting issues, and numerical outliers.
    """
    anomalies = []

    for idx, rec in enumerate(records):
        rec_id = str(rec.get("_id") or rec.get("id") or f"idx_{idx}")
        rec_num = rec.get("recordNumber", "N/A")
        data = rec.get("data", {})
        if not isinstance(data, dict):
            data = {}

        issues = []

        # 1. Name Checks
        name = str(data.get("full_name") or data.get("name") or data.get("beneficiary_name") or "").strip()
        if not name:
            issues.append({
                "field": "name",
                "severity": "High",
                "message": "Missing primary subject name",
                "action": "Complete individual registration details"
            })
        elif len(name) < 2 or re.search(r'[0-9!@#$%^&*()_+={}\[\]|\\:;"<>,.?/~`]', name):
            issues.append({
                "field": "name",
                "severity": "Medium",
                "message": f"Suspicious name format with numbers or special characters: '{name}'",
                "action": "Verify government ID spelling"
            })

        # 2. Phone Formatting Check
        phone = str(data.get("phone") or data.get("phone_number") or "").strip()
        if phone:
            digits = re.sub(r'[^0-9]', '', phone)
            if len(digits) < 7 or len(digits) > 15:
                issues.append({
                    "field": "phone",
                    "severity": "Medium",
                    "message": f"Non-standard phone number length ({len(digits)} digits): '{phone}'",
                    "action": "Format with country and area code"
                })

        # 3. Numeric Outlier Checks (Quantity / Amount)
        for key, val in data.items():
            if "quantity" in key.lower() or "amount" in key.lower() or "disbursed" in key.lower():
                try:
                    num_val = float(re.sub(r'[^0-9.]', '', str(val)))
                    if "quantity" in key.lower() and num_val > 500:
                        issues.append({
                            "field": key,
                            "severity": "High",
                            "message": f"Unusually large aid quantity: {num_val}",
                            "action": "Confirm if bulk dispatch or single recipient"
                        })
                    elif "amount" in key.lower() and num_val > 1_000_000:
                        issues.append({
                            "field": key,
                            "severity": "Medium",
                            "message": f"High value grant transaction: ${num_val:,.2f}",
                            "action": "Verify institutional grant charter"
                        })
                except (ValueError, TypeError):
                    pass

        # 4. Incomplete Demographic Check
        if not phone and not data.get("address"):
            issues.append({
                "field": "contact",
                "severity": "Low",
                "message": "Neither phone number nor physical address is present",
                "action": "Capture location during next relief drive"
            })

        if issues:
            anomalies.append({
                "recordId": rec_id,
                "recordNumber": rec_num,
                "recordType": rec.get("recordTypeId", {}).get("name") if isinstance(rec.get("recordTypeId"), dict) else "Record",
                "issuesCount": len(issues),
                "issues": issues
            })

    return anomalies
