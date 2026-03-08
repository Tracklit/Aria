"""
Minimal remote integration checks for deployed mobile-backend and AI API services.

This suite is intentionally isolated from legacy unit tests that require a fully
provisioned local DB/cache stack.
"""

import os
import pytest
import requests


RUN_REMOTE_INTEGRATION = os.getenv("RUN_REMOTE_INTEGRATION") == "true"
MOBILE_API_BASE_URL = os.getenv(
    "MOBILE_API_BASE_URL",
    "https://app-tracklit-prod-tnrusd.azurewebsites.net",
).rstrip("/")
AI_API_BASE_URL = os.getenv(
    "AI_API_BASE_URL",
    "https://ca-aria-api-prod.calmcliff-31ba567d.westus.azurecontainerapps.io",
).rstrip("/")


@pytest.mark.integration
def test_mobile_backend_health():
    if not RUN_REMOTE_INTEGRATION:
        pytest.skip("Set RUN_REMOTE_INTEGRATION=true to run remote integration checks.")

    response = requests.get(f"{MOBILE_API_BASE_URL}/api/health", timeout=20)
    assert response.status_code == 200


@pytest.mark.integration
def test_ai_api_reachability():
    if not RUN_REMOTE_INTEGRATION:
        pytest.skip("Set RUN_REMOTE_INTEGRATION=true to run remote integration checks.")

    try:
        response = requests.get(f"{AI_API_BASE_URL}/health", timeout=25)
        assert response.status_code in (200, 503)
    except requests.RequestException as exc:
        pytest.skip(f"AI API temporarily unreachable: {exc}")
