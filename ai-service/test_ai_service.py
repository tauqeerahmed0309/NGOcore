import unittest
import asyncio
from services.dedup_engine import scan_duplicates, soundex, levenshtein_similarity
from services.anomaly_engine import scan_anomalies
from services.analytics_engine import analyze_vulnerability_clusters, forecast_aid_demand
from routers.clean import deduplicate_records, detect_anomalies, DeduplicateRequest, AnomalyRequest
from routers.analyze import analyze_vulnerability, VulnerabilityRequest
from routers.predict import predict_demand, DemandForecastRequest

class TestAIService(unittest.TestCase):
    def test_soundex_phonetic(self):
        # Phonetically similar names must match
        code_fatima = soundex("Fatima")
        code_fatmah = soundex("Fatmah")
        self.assertEqual(code_fatima, code_fatmah)

        code_smith = soundex("Smith")
        code_smyth = soundex("Smyth")
        self.assertEqual(code_smith, code_smyth)

    def test_levenshtein_similarity(self):
        score_exact = levenshtein_similarity("Mohammad", "Mohammad")
        self.assertEqual(score_exact, 1.0)

        score_slight = levenshtein_similarity("Mohammad", "Mohammed")
        self.assertGreater(score_slight, 0.8)

    def test_deduplication_engine(self):
        records = [
            {
                "_id": "rec_001",
                "recordNumber": "BEN-2026-00001",
                "data": {
                    "full_name": "Fatima Zahra",
                    "phone": "+91 98765 43210",
                    "national_id": "ID-99281-XYZ"
                }
            },
            {
                "_id": "rec_002",
                "recordNumber": "BEN-2026-00002",
                "data": {
                    "full_name": "Fatmah Zahra",
                    "phone": "+91 98765 43210",
                    "national_id": "ID-99281-XYZ"
                }
            },
            {
                "_id": "rec_003",
                "recordNumber": "BEN-2026-00003",
                "data": {
                    "full_name": "Devendra Mishra",
                    "phone": "+91 98765 43210",
                    "national_id": "XXXX XXXX 1122"
                }
            }
        ]

        duplicates = scan_duplicates(records, threshold=0.70)
        self.assertEqual(len(duplicates), 1)
        match = duplicates[0]
        self.assertGreaterEqual(match["confidence_score"], 0.85)
        self.assertIn("rec_001", [match["record_a"]["id"], match["record_b"]["id"]])
        self.assertIn("rec_002", [match["record_a"]["id"], match["record_b"]["id"]])
        self.assertEqual(match["recommended_action"], "Merge Records")

    def test_deduplicate_router_endpoint(self):
        records = [
            {"_id": "1", "recordNumber": "BEN-01", "data": {"full_name": "Ravi Kumar", "phone": "9876543210"}},
            {"_id": "2", "recordNumber": "BEN-02", "data": {"full_name": "Ravee Kumar", "phone": "9876543210"}}
        ]
        payload = DeduplicateRequest(records=records, threshold=0.70)
        response = asyncio.run(deduplicate_records(payload))
        self.assertTrue(response["success"])
        self.assertEqual(response["duplicates_found"], 1)

    def test_anomaly_detection(self):
        records = [
            {
                "_id": "rec_004",
                "recordNumber": "REC-ANOMALY-1",
                "data": {
                    "full_name": "John Doe 123#",
                    "phone": "123", # invalid phone length
                    "quantity": 1200 # outlier
                }
            }
        ]

        anomalies = scan_anomalies(records)
        self.assertEqual(len(anomalies), 1)
        issues = anomalies[0]["issues"]
        self.assertGreaterEqual(len(issues), 2)

        # Test router handler
        payload = AnomalyRequest(records=records)
        response = asyncio.run(detect_anomalies(payload))
        self.assertTrue(response["success"])
        self.assertEqual(response["anomalies_found"], 1)

    def test_vulnerability_clustering(self):
        records = [
            {"data": {"full_name": "Person A", "vulnerability_index": "High Priority", "assistance_category": "Food Security"}},
            {"data": {"full_name": "Person B", "vulnerability_index": "Moderate Need", "assistance_category": "Healthcare"}},
            {"data": {"full_name": "Person C", "vulnerability_index": "Standard", "assistance_category": "Food Security"}}
        ]

        payload = VulnerabilityRequest(records=records)
        response = asyncio.run(analyze_vulnerability(payload))
        self.assertTrue(response["success"])
        analytics = response["analytics"]
        self.assertEqual(analytics["total_records"], 3)
        self.assertIn("High Priority", str(analytics["vulnerability_breakdown"]))

    def test_demand_forecast(self):
        historical = [200, 240, 290, 350, 420]
        payload = DemandForecastRequest(historical_counts=historical, periods_ahead=3)
        response = asyncio.run(predict_demand(payload))
        self.assertTrue(response["success"])
        forecast = response["forecast_results"]["forecast"]
        self.assertEqual(len(forecast), 3)
        self.assertGreater(forecast[-1], historical[-1])

if __name__ == "__main__":
    unittest.main()
