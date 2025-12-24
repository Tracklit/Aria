"""
Pytest configuration and shared fixtures
"""
import sys
import os
from pathlib import Path

# Add src directory to Python path
src_path = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_path))

# Set up minimal environment variables for tests
os.environ.setdefault("JWT_SECRET", "test_secret_key_for_testing")
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/test_db")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("REDIS_HOST", "localhost")
os.environ.setdefault("REDIS_PORT", "6379")
os.environ.setdefault("REDIS_PASSWORD", "")
os.environ.setdefault("REDIS_DB", "0")
os.environ.setdefault("ENVIRONMENT", "test")

# Azure OpenAI credentials (will use from GitHub secrets if available)
if "AZURE_OPENAI_API_KEY" not in os.environ:
    os.environ["AZURE_OPENAI_API_KEY"] = ""
if "AZURE_OPENAI_ENDPOINT" not in os.environ:
    os.environ["AZURE_OPENAI_ENDPOINT"] = ""
if "AZURE_OPENAI_DEPLOYMENT" not in os.environ:
    os.environ["AZURE_OPENAI_DEPLOYMENT"] = "gpt-4o"

# Optional services (tests should work without these)
os.environ.setdefault("STRIPE_SECRET_KEY", "")
os.environ.setdefault("OPENAI_API_KEY", "")

