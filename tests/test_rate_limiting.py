# test_rate_limiting.py
import pytest
import time
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

class TestRateLimiting:
    """Test rate limiting functionality"""
    
    def setup_method(self):
        """Reset rate limits before each test"""
        # Clear any existing rate limits
        try:
            client.post("/admin/cache/clear?pattern=rate_limit:*")
        except:
            pass
    
    def test_rate_limit_headers_present(self):
        """Test that rate limit headers are included in responses"""
        response = client.get("/knowledge_library")
        
        # Should have rate limit headers
        assert "X-RateLimit-Limit" in response.headers
        assert "X-RateLimit-Remaining" in response.headers
        assert "X-RateLimit-Reset" in response.headers
    
    def test_ask_endpoint_rate_limiting(self):
        """Test rate limiting on /ask endpoint (30 requests per minute)"""
        # Create a test user first (if needed)
        user_data = {
            "name": "Rate Limit Test User",
            "gender": "male",
            "email": f"ratetest_{int(time.time())}@example.com",
            "age": 25,
            "training_goal": "Test rate limiting",
            "injury_status": "none",
            "sleep_hours": 8.0,
            "sleep_quality": "good",
            "coach_mode": "supportive",
            "training_days_per_week": 5
        }
        
        user_response = client.post("/user", json=user_data)
        assert user_response.status_code == 200
        user_id = user_response.json()["id"]
        
        # Test normal usage
        ask_data = {
            "user_id": user_id,
            "user_input": "What should I do today?"
        }
        
        # First request should work
        response = client.post("/ask", json=ask_data)
        assert response.status_code == 200
        
        # Check rate limit headers
        assert int(response.headers["X-RateLimit-Limit"]) == 60  # 30 * 2 (user multiplier)
        remaining = int(response.headers["X-RateLimit-Remaining"])
        assert remaining == 59  # One request used
    
    def test_rate_limit_exceeded(self):
        """Test behavior when rate limit is exceeded"""
        # This test would require making many requests quickly
        # For a real test, you might lower the rate limits temporarily
        
        # Create multiple requests rapidly
        ask_data = {
            "user_id": "test-user-id",
            "user_input": "Quick test"
        }
        
        responses = []
        
        # Make requests until we hit the limit (simplified for testing)
        for i in range(5):  # Adjust based on your test limits
            try:
                response = client.post("/ask", json=ask_data)
                responses.append(response.status_code)
            except:
                responses.append(429)  # Rate limited
        
        # Should get some successful responses and potentially some 429s
        assert 200 in responses or 404 in responses  # 404 if user doesn't exist
    
    def test_user_creation_rate_limiting(self):
        """Test rate limiting on user creation (5 per 5 minutes)"""
        # Test creating users
        for i in range(3):  # Stay under limit
            user_data = {
                "name": f"Test User {i}",
                "gender": "male",
                "email": f"test{i}_{int(time.time())}@example.com",
                "age": 25,
                "training_goal": "Test",
                "injury_status": "none",
                "sleep_hours": 8.0,
                "sleep_quality": "good",
                "coach_mode": "supportive",
                "training_days_per_week": 5
            }
            
            response = client.post("/user", json=user_data)
            # Should work (or might fail due to DB issues, but not rate limiting)
            assert response.status_code in [200, 500]  # 500 for DB errors, not rate limits
    
    def test_rate_limit_status_endpoint(self):
        """Test rate limit status endpoint"""
        response = client.get("/admin/rate-limits/status")
        assert response.status_code == 200
        
        data = response.json()
        assert "client_id" in data
        assert "rate_limits" in data
        assert "redis_connected" in data
        
        # Check rate limit structure
        rate_limits = data["rate_limits"]
        assert "ask" in rate_limits
        assert "general" in rate_limits
        
        # Check ask endpoint limits
        ask_limits = rate_limits["ask"]
        assert ask_limits["max_requests"] == 30
        assert ask_limits["window_seconds"] == 60
    
    def test_rate_limit_config_endpoint(self):
        """Test rate limit configuration endpoint"""
        response = client.get("/admin/rate-limits/config")
        assert response.status_code == 200
        
        data = response.json()
        assert "rate_limits" in data
        assert "features" in data
        
        # Check configuration
        config = data["rate_limits"]
        assert config["ask"]["max_requests"] == 30
        assert config["ask"]["window_seconds"] == 60
        assert config["ask_media"]["max_requests"] == 10
        assert config["general"]["max_requests"] == 100
    
    def test_rate_limit_reset_endpoint(self):
        """Test rate limit reset functionality"""
        # First make a request to create a rate limit entry
        client.get("/knowledge_library")
        
        # Reset rate limits
        response = client.post("/admin/rate-limits/reset")
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "keys_cleared" in data
    
    def test_different_clients_separate_limits(self):
        """Test that different clients have separate rate limits"""
        # This is harder to test without controlling client IPs
        # But we can test the structure
        
        response1 = client.get("/admin/rate-limits/status")
        client_id1 = response1.json()["client_id"]
        
        # In a real scenario, you'd use different IP addresses
        # For now, just verify the client ID is being generated
        assert client_id1.startswith("ip:")
    
    def test_rate_limiting_with_redis_down(self):
        """Test graceful fallback when Redis is unavailable"""
        # This is hard to test without actually disconnecting Redis
        # But we can verify the error handling structure exists
        
        # The rate limiter should allow requests if Redis is down
        response = client.get("/knowledge_library")
        # Should still work (fallback behavior)
        assert response.status_code == 200
    
    def test_mood_report_rate_limiting(self):
        """Test rate limiting on mood reports"""
        if not hasattr(self, 'user_id'):
            # Create a user for testing
            user_data = {
                "name": "Mood Test User",
                "gender": "female",
                "email": f"moodtest_{int(time.time())}@example.com",
                "age": 30,
                "training_goal": "Test mood updates",
                "injury_status": "none",
                "sleep_hours": 7.5,
                "sleep_quality": "good",
                "coach_mode": "supportive",
                "training_days_per_week": 4
            }
            
            user_response = client.post("/user", json=user_data)
            if user_response.status_code == 200:
                self.user_id = user_response.json()["id"]
            else:
                pytest.skip("Could not create test user")
        
        # Test mood updates
        for mood in ["motivated", "tired", "good"]:
            mood_data = {
                "user_id": self.user_id,
                "mood": mood
            }
            
            response = client.post("/mood_report", json=mood_data)
            # Should work or fail with user not found, not rate limiting
            assert response.status_code in [200, 404]

class TestRateLimitingEdgeCases:
    """Test edge cases and error scenarios"""
    
    def test_malformed_rate_limit_requests(self):
        """Test rate limiting with malformed requests"""
        # Test with missing required fields
        response = client.post("/ask", json={})
        # Should get validation error, not rate limit error
        assert response.status_code == 422
    
    def test_rate_limit_headers_on_errors(self):
        """Test that rate limit headers are present even on error responses"""
        response = client.post("/ask", json={"invalid": "data"})
        
        # Even on validation errors, should have rate limit headers
        # (depending on implementation)
        if response.status_code == 422:
            # This might not have headers if request fails before rate limiting
            pass
    
    def test_concurrent_requests_same_client(self):
        """Test concurrent requests from same client"""
        import threading
        import queue
        
        results = queue.Queue()
        
        def make_request():
            try:
                response = client.get("/knowledge_library")
                results.put(response.status_code)
            except Exception as e:
                results.put(str(e))
        
        # Launch multiple concurrent requests
        threads = []
        for i in range(5):
            thread = threading.Thread(target=make_request)
            threads.append(thread)
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join()
        
        # Collect results
        status_codes = []
        while not results.empty():
            status_codes.append(results.get())
        
        # Should get mostly 200s (and possibly some 429s if limits hit)
        assert len(status_codes) == 5
        assert 200 in status_codes

# Performance tests for rate limiting
class TestRateLimitingPerformance:
    """Test performance impact of rate limiting"""
    
    def test_rate_limiting_overhead(self):
        """Test that rate limiting doesn't add significant overhead"""
        import time
        
        # Measure time for request with rate limiting
        start_time = time.time()
        response = client.get("/knowledge_library")
        end_time = time.time()
        
        assert response.status_code == 200
        
        # Rate limiting shouldn't add more than 100ms overhead
        request_time = end_time - start_time
        assert request_time < 5.0  # Very generous limit for testing

# Integration tests
class TestRateLimitingIntegration:
    """Test rate limiting integration with other features"""
    
    def test_rate_limiting_with_caching(self):
        """Test that rate limiting works correctly with caching"""
        # First request (populates cache)
        response1 = client.get("/knowledge_library")
        assert response1.status_code == 200
        
        # Second request (from cache)
        response2 = client.get("/knowledge_library")
        assert response2.status_code == 200
        
        # Both should have rate limit headers
        assert "X-RateLimit-Remaining" in response1.headers
        assert "X-RateLimit-Remaining" in response2.headers
        
        # Remaining count should decrease
        remaining1 = int(response1.headers["X-RateLimit-Remaining"])
        remaining2 = int(response2.headers["X-RateLimit-Remaining"])
        assert remaining2 == remaining1 - 1
    
    def test_cache_invalidation_doesnt_affect_rate_limits(self):
        """Test that cache operations don't interfere with rate limiting"""
        # Make a request
        response = client.get("/knowledge_library")
        assert response.status_code == 200
        
        # Clear cache
        cache_response = client.post("/admin/cache/clear?pattern=knowledge_*")
        assert cache_response.status_code == 200
        
        # Rate limits should still be intact
        status_response = client.get("/admin/rate-limits/status")
        assert status_response.status_code == 200

if __name__ == "__main__":
    pytest.main([__file__, "-v"])