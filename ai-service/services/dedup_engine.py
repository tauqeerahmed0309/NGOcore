import re
from typing import List, Dict, Any, Tuple

def normalize_text(text: Any) -> str:
    """Normalize text by stripping whitespace, punctuation, and lowercase."""
    if text is None:
        return ""
    text_str = str(text).strip().lower()
    # Remove honorifics
    text_str = re.sub(r'^(mr\.|mrs\.|ms\.|dr\.|shri|smt)\s+', '', text_str)
    # Remove non-alphanumeric except spaces
    text_str = re.sub(r'[^a-z0-9\s]', '', text_str)
    return re.sub(r'\s+', ' ', text_str).strip()

def soundex(name: str) -> str:
    """
    Compute American Soundex phonetic code for a name string.
    Phonetically similar names produce identical Soundex codes.
    """
    clean_name = re.sub(r'[^a-zA-Z]', '', name).upper()
    if not clean_name:
        return "0000"

    soundex_mapping = {
        'B': '1', 'F': '1', 'P': '1', 'V': '1',
        'C': '2', 'G': '2', 'J': '2', 'K': '2', 'Q': '2', 'S': '2', 'X': '2', 'Z': '2',
        'D': '3', 'T': '3',
        'L': '4',
        'M': '5', 'N': '5',
        'R': '6'
    }

    first_letter = clean_name[0]
    tail = clean_name[1:]

    encoded_tail = ""
    prev_code = soundex_mapping.get(first_letter, "")

    for char in tail:
        code = soundex_mapping.get(char, "")
        if code != "" and code != prev_code:
            encoded_tail += code
        prev_code = code

    code = first_letter + encoded_tail
    return (code + "0000")[:4]

def levenshtein_similarity(s1: str, s2: str) -> float:
    """Calculate Levenshtein ratio between two strings (0.0 to 1.0)."""
    if not s1 and not s2:
        return 1.0
    if not s1 or not s2:
        return 0.0

    m, n = len(s1), len(s2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if s1[i - 1] == s2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])

    dist = dp[m][n]
    max_len = max(m, n)
    return round(1.0 - (dist / max_len), 4)

def normalize_phone(phone: Any) -> str:
    """Extract numeric digits from phone string."""
    if phone is None:
        return ""
    return re.sub(r'[^0-9]', '', str(phone))

def extract_primary_fields(record: Dict[str, Any]) -> Dict[str, Any]:
    """Helper to extract common field identifiers regardless of exact schema naming."""
    data = record.get("data", {})
    if not isinstance(data, dict):
        data = {}

    name = (
        data.get("full_name") or
        data.get("name") or
        data.get("patient_name") or
        data.get("beneficiary_name") or
        data.get("donor_name") or
        ""
    )

    phone = data.get("phone") or data.get("phone_number") or data.get("contact") or ""
    national_id = data.get("national_id") or data.get("id_number") or data.get("aadhaar") or ""
    address = data.get("address") or data.get("location") or ""

    return {
        "name": normalize_text(name),
        "raw_name": str(name),
        "phone": normalize_phone(phone),
        "national_id": normalize_text(national_id),
        "address": normalize_text(address)
    }

def scan_duplicates(records: List[Dict[str, Any]], threshold: float = 0.75) -> List[Dict[str, Any]]:
    """
    Compare pairs of records and detect likely duplicates using multi-attribute fuzzy matching.
    """
    duplicates = []
    n = len(records)
    if n < 2:
        return []

    # Pre-extract normalized fields
    extracted = [extract_primary_fields(rec) for rec in records]

    for i in range(n):
        for j in range(i + 1, n):
            rec_a = records[i]
            rec_b = records[j]
            ext_a = extracted[i]
            ext_b = extracted[j]

            reasons = []
            score_components = []

            # 1. Name Match (Levenshtein + Soundex)
            name_a, name_b = ext_a["name"], ext_b["name"]
            if name_a and name_b:
                lev_score = levenshtein_similarity(name_a, name_b)
                soundex_match = soundex(name_a) == soundex(name_b)

                if soundex_match and lev_score > 0.6:
                    reasons.append(f"Phonetic name match (Soundex: {soundex(name_a)}, Similarity: {int(lev_score*100)}%)")
                    score_components.append(max(lev_score, 0.85) * 0.45)
                elif lev_score > 0.7:
                    reasons.append(f"Fuzzy name match ({int(lev_score*100)}%)")
                    score_components.append(lev_score * 0.45)
                else:
                    score_components.append(lev_score * 0.20)
            else:
                score_components.append(0.0)

            # 2. Phone Match
            phone_a, phone_b = ext_a["phone"], ext_b["phone"]
            if phone_a and phone_b:
                if phone_a == phone_b:
                    reasons.append("Exact phone number match")
                    score_components.append(0.35)
                elif len(phone_a) >= 7 and len(phone_b) >= 7 and phone_a[-7:] == phone_b[-7:]:
                    reasons.append(f"Matching last 7 phone digits (***{phone_a[-4:]})")
                    score_components.append(0.30)
                else:
                    score_components.append(0.0)
            else:
                score_components.append(0.0)

            # 3. National ID Match
            id_a, id_b = ext_a["national_id"], ext_b["national_id"]
            if id_a and id_b:
                if id_a == id_b and not id_a.startswith("redacted"):
                    reasons.append("Exact identification number match")
                    score_components.append(0.20)
                elif len(id_a) >= 4 and len(id_b) >= 4 and id_a[-4:] == id_b[-4:]:
                    reasons.append(f"Matching identification suffix (...{id_a[-4:]})")
                    score_components.append(0.15)
                else:
                    score_components.append(0.0)
            else:
                score_components.append(0.0)

            # Composite confidence
            total_confidence = round(sum(score_components), 4)

            # Boost confidence if both Name and Phone or ID strongly match
            if len(reasons) >= 2 and total_confidence >= 0.60:
                total_confidence = min(round(total_confidence * 1.25, 4), 0.99)

            if total_confidence >= threshold and len(reasons) > 0:
                duplicates.append({
                    "record_a": {
                        "id": str(rec_a.get("_id") or rec_a.get("id")),
                        "recordNumber": rec_a.get("recordNumber", "N/A"),
                        "name": ext_a["raw_name"] or "Unknown",
                        "phone": ext_a["phone"] or "N/A",
                        "createdAt": rec_a.get("createdAt")
                    },
                    "record_b": {
                        "id": str(rec_b.get("_id") or rec_b.get("id")),
                        "recordNumber": rec_b.get("recordNumber", "N/A"),
                        "name": ext_b["raw_name"] or "Unknown",
                        "phone": ext_b["phone"] or "N/A",
                        "createdAt": rec_b.get("createdAt")
                    },
                    "confidence_score": total_confidence,
                    "confidence_percentage": f"{int(total_confidence * 100)}%",
                    "reasons": reasons,
                    "recommended_action": "Merge Records" if total_confidence >= 0.85 else "Manual Caseworker Review"
                })

    # Sort descending by confidence score
    duplicates.sort(key=lambda x: x["confidence_score"], reverse=True)
    return duplicates
