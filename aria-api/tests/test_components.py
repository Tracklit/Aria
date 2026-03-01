# test_components.py
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

print("=== ENVIRONMENT VARIABLES ===")
print(f"REDIS_HOST: {os.getenv('REDIS_HOST')}")
print(f"REDIS_PORT: {os.getenv('REDIS_PORT')}")
print(f"REDIS_PASSWORD: {'SET' if os.getenv('REDIS_PASSWORD') else 'NOT SET'}")
print(f"OPENAI_API_KEY: {'SET' if os.getenv('OPENAI_API_KEY') else 'NOT SET'}")
print(f"DATABASE_URL: {'SET' if os.getenv('DATABASE_URL') else 'NOT SET'}")
print("=" * 30)

# Test Redis connection
print("\n=== TESTING REDIS CONNECTION ===")
try:
    from cache import cache
    is_connected = cache.is_connected()
    print(f"Redis connected: {is_connected}")
    
    if is_connected:
        # Test basic operations
        test_key = "test_component"
        test_value = {"test": True, "timestamp": "now"}
        
        # Test set
        set_success = cache.set(test_key, test_value, ttl=60)
        print(f"Cache set operation: {set_success}")
        
        # Test get
        retrieved = cache.get(test_key)
        print(f"Cache get operation: {retrieved is not None}")
        
        # Test delete
        delete_success = cache.delete(test_key)
        print(f"Cache delete operation: {delete_success}")
        
        # Get stats
        stats = cache.get_stats()
        print(f"Redis version: {stats.get('redis_version', 'unknown')}")
        print(f"Memory used: {stats.get('memory_used', 'unknown')}")
    else:
        print("❌ Redis connection failed - check your credentials")
        
except Exception as e:
    print(f"❌ Redis test failed: {e}")

# Test rate limiter
print("\n=== TESTING RATE LIMITER ===")
try:
    from rate_limit import rate_limiter
    print("✅ Rate limiter initialized successfully")
    
    # Test rate limiter functionality
    from fastapi import Request
    from unittest.mock import MagicMock
    
    # Create mock request
    mock_request = MagicMock(spec=Request)
    mock_request.client.host = "127.0.0.1"
    mock_request.headers = {}
    
    # Test rate limiting
    result = rate_limiter.check_rate_limit(mock_request, "test_endpoint", 10, 60)
    print(f"Rate limit check: {result.get('allowed', False)}")
    
except Exception as e:
    print(f"❌ Rate limiter test failed: {e}")

# Test wearable integration
print("\n=== TESTING WEARABLE INTEGRATION ===")
try:
    from wearable_integration import wearable_integrator
    print("✅ Wearable integration loaded successfully")
    print("Note: Full functionality requires Terra API credentials")
except ImportError:
    print("⚠️  Wearable integration not available (wearable_integration.py not found)")
except Exception as e:
    print(f"❌ Wearable integration test failed: {e}")

print("\n=== TEST SUMMARY ===")
print("If Redis shows 'False', check your .env file and Redis credentials")
print("If other components failed, check the error messages above")
print("Run 'uvicorn main:app --reload' to start the full API")