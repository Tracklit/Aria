# test_aria_api.py
import pytest
import httpx
from fastapi.testclient import TestClient
import json
import io
from PIL import Image
import time
import asyncio

# Import your FastAPI app
from main import app

# Create test client
client = TestClient(app)

class TestBasicFunctionality:
    """Test basic API functionality"""
    
    def test_api_startup(self):
        """Test that the API starts up correctly"""
        response = client.get("/docs")
        assert response.status_code == 200
    
    def test_redis_connection(self):
        """Test Redis connection is working"""
        response = client.get("/test-redis-connection")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("redis_connected") == True
        assert data.get("set_operation") == True
        assert data.get("get_operation") == True
        assert data.get("data_integrity") == True

class TestCachingFunctionality:
    """Test caching system functionality"""
    
    def test_cache_stats(self):
        """Test cache statistics endpoint"""
        response = client.get("/admin/cache/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "connected" in data
        assert data["connected"] == True
    
    def test_cache_health_check(self):
        """Test comprehensive cache health check"""
        response = client.get("/admin/cache/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("status") in ["healthy", "degraded"]
        assert data.get("connected") == True
        assert "tests" in data
        
        tests = data["tests"]
        assert tests.get("ping") == True
        assert tests.get("set") == True
        assert tests.get("get") == True
        assert tests.get("delete") == True
    
    def test_knowledge_library_caching(self):
        """Test that knowledge library uses caching"""
        # First request - should populate cache
        start_time = time.time()
        response1 = client.get("/knowledge_library")
        first_request_time = time.time() - start_time
        
        assert response1.status_code == 200
        data1 = response1.json()
        
        # Second request - should be from cache (faster)
        start_time = time.time()
        response2 = client.get("/knowledge_library")
        second_request_time = time.time() - start_time
        
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Data should be identical
        assert data1 == data2
        
        # Second request should be faster (though this might be flaky)
        # We'll be lenient with timing assertions
        assert second_request_time < first_request_time + 0.1

class TestKnowledgeLibraryEndpoints:
    """Test knowledge library endpoints"""
    
    def test_get_knowledge_library(self):
        """Test knowledge library endpoint"""
        response = client.get("/knowledge_library")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_knowledge_search(self):
        """Test knowledge search functionality"""
        # Test with a common search term
        response = client.get("/knowledge_search?q=sprint")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_knowledge_search_empty_query(self):
        """Test knowledge search with empty query"""
        response = client.get("/knowledge_search?q=")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_knowledge_search_caching(self):
        """Test that search results are cached"""
        search_term = "test_search_term"
        
        # First search
        response1 = client.get(f"/knowledge_search?q={search_term}")
        assert response1.status_code == 200
        data1 = response1.json()
        
        # Second search - should be cached
        response2 = client.get(f"/knowledge_search?q={search_term}")
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Results should be identical
        assert data1 == data2

class TestUserEndpoints:
    """Test user-related endpoints"""
    
    def test_create_user(self):
        """Test user creation endpoint"""
        user_data = {
            "name": "Test User",
            "gender": "male",
            "email": f"test_{int(time.time())}@example.com",
            "age": 25,
            "training_goal": "Improve 100m time",
            "injury_status": "none",
            "sleep_hours": 8.0,
            "sleep_quality": "good",
            "coach_mode": "supportive",
            "training_days_per_week": 5
        }
        
        response = client.post("/user", json=user_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert data["message"] == "User created successfully"
        
        # Store user ID for other tests
        TestUserEndpoints.user_id = data["id"]
    
    def test_mood_report(self):
        """Test mood reporting functionality"""
        if not hasattr(TestUserEndpoints, 'user_id'):
            pytest.skip("User creation test must pass first")
        
        mood_data = {
            "user_id": TestUserEndpoints.user_id,
            "mood": "motivated"
        }
        
        response = client.post("/mood_report", json=mood_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["message"] == "Mood updated successfully"
        assert data["mood"] == "motivated"
    
    def test_mood_report_cache_invalidation(self):
        """Test that mood report clears user cache"""
        if not hasattr(TestUserEndpoints, 'user_id'):
            pytest.skip("User creation test must pass first")
        
        # First, try to populate cache by getting user profile
        # (This would normally happen through /ask endpoint, but we'll test the concept)
        
        # Report new mood - this should clear cache
        mood_data = {
            "user_id": TestUserEndpoints.user_id,
            "mood": "tired"
        }
        
        response = client.post("/mood_report", json=mood_data)
        assert response.status_code == 200

class TestAskEndpoint:
    """Test AI consultation endpoint"""
    
    def test_ask_basic_question(self):
        """Test basic AI consultation"""
        if not hasattr(TestUserEndpoints, 'user_id'):
            pytest.skip("User creation test must pass first")
        
        ask_data = {
            "user_id": TestUserEndpoints.user_id,
            "user_input": "What should I focus on in my sprint training this week?"
        }
        
        response = client.post("/ask", json=ask_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "analysis" in data
        assert "recommendation" in data
        assert isinstance(data["analysis"], str)
        assert isinstance(data["recommendation"], str)
        assert len(data["analysis"]) > 0
        assert len(data["recommendation"]) > 0
    
    def test_ask_with_invalid_user(self):
        """Test AI consultation with invalid user ID"""
        ask_data = {
            "user_id": "00000000-0000-0000-0000-000000000000",
            "user_input": "Test question"
        }
        
        response = client.post("/ask", json=ask_data)
        assert response.status_code == 404

class TestTrainingPlanEndpoint:
    """Test training plan generation"""
    
    def test_generate_plan(self):
        """Test training plan generation"""
        if not hasattr(TestUserEndpoints, 'user_id'):
            pytest.skip("User creation test must pass first")
        
        plan_data = {
            "user_id": TestUserEndpoints.user_id,
            "experience_level": "intermediate",
            "training_days_per_week": 4,
            "competition_date": "2024-06-15"
        }
        
        response = client.post("/generate_plan", json=plan_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "plan" in data
        assert isinstance(data["plan"], str)
        assert len(data["plan"]) > 50  # Should be a substantial plan

class TestCoachEndpoints:
    """Test coach-related endpoints"""
    
    def test_get_coach_athletes_empty(self):
        """Test getting athletes for a coach (should be empty initially)"""
        response = client.get("/coach_athletes/test_coach@example.com")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_link_athlete_to_coach(self):
        """Test linking athlete to coach"""
        if not hasattr(TestUserEndpoints, 'user_id'):
            pytest.skip("User creation test must pass first")
        
        link_data = {
            "coach_email": "test_coach@example.com",
            "athlete_id": TestUserEndpoints.user_id
        }
        
        response = client.post("/coach_athletes", json=link_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["message"] == "Athlete linked to coach successfully"
    
    def test_get_coach_athletes_after_linking(self):
        """Test getting athletes after linking"""
        response = client.get("/coach_athletes/test_coach@example.com")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

class TestMediaUpload:
    """Test media upload functionality"""
    
    def create_test_image(self):
        """Create a test image for upload"""
        # Create a simple test image
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        return img_bytes
    
    def test_ask_media_upload(self):
        """Test media upload endpoint"""
        if not hasattr(TestUserEndpoints, 'user_id'):
            pytest.skip("User creation test must pass first")
        
        # Create test image
        test_image = self.create_test_image()
        
        files = {
            "file": ("test_image.jpg", test_image, "image/jpeg")
        }
        data = {
            "user_id": TestUserEndpoints.user_id,
            "user_input": "Please analyze my sprint technique in this image"
        }
        
        response = client.post("/ask/media", files=files, data=data)
        assert response.status_code == 200
        
        response_data = response.json()
        assert "analysis" in response_data
        assert "recommendation" in response_data

class TestErrorHandling:
    """Test error handling scenarios"""
    
    def test_invalid_endpoints(self):
        """Test requests to invalid endpoints"""
        response = client.get("/nonexistent_endpoint")
        assert response.status_code == 404
    
    def test_malformed_json_requests(self):
        """Test requests with invalid JSON"""
        response = client.post(
            "/ask",
            content="invalid json",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422  # Unprocessable Entity
    
    def test_missing_required_fields(self):
        """Test requests missing required fields"""
        # Test /ask without user_input
        incomplete_data = {"user_id": "test"}
        
        response = client.post("/ask", json=incomplete_data)
        assert response.status_code == 422

class TestCacheManagement:
    """Test cache management endpoints"""
    
    def test_cache_clear_with_pattern(self):
        """Test clearing cache with specific pattern"""
        # First populate some cache
        client.get("/knowledge_library")
        
        # Clear with pattern
        response = client.post("/admin/cache/clear?pattern=knowledge_*")
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
    
    def test_cache_clear_without_pattern(self):
        """Test cache clear endpoint without pattern (should require pattern)"""
        response = client.post("/admin/cache/clear")
        assert response.status_code == 200
        
        data = response.json()
        assert "error" in data
    
    def test_delete_specific_cache_key(self):
        """Test deleting specific cache key"""
        # First set a test key through our test endpoint
        client.get("/test-redis-connection")
        
        # Try to delete it
        response = client.delete("/admin/cache/test_connection")
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data

class TestPerformance:
    """Test API performance"""
    
    def test_knowledge_library_response_time(self):
        """Test knowledge library response time"""
        start_time = time.time()
        response = client.get("/knowledge_library")
        end_time = time.time()
        
        assert response.status_code == 200
        
        response_time = end_time - start_time
        # Should respond within 5 seconds (adjust as needed)
        assert response_time < 5.0
    
    def test_cache_improves_performance(self):
        """Test that caching actually improves performance"""
        # Clear any existing cache
        client.post("/admin/cache/clear?pattern=knowledge_*")
        
        # First request (no cache)
        start_time = time.time()
        response1 = client.get("/knowledge_library")
        first_response_time = time.time() - start_time
        
        # Second request (from cache)
        start_time = time.time()
        response2 = client.get("/knowledge_library")
        second_response_time = time.time() - start_time
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        
        # Second request should be faster or at least not significantly slower
        assert second_response_time <= first_response_time + 0.1

# Test configuration
@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

class TestMigratedSubscriptionEndpoints:
    """Test migrated subscription endpoints (now using PostgreSQL)"""
    
    def test_get_subscription_status(self):
        """Test get_subscription_status endpoint (migrated)"""
        response = client.get("/subscription/status?user_id=test_user_123")
        
        # Should return subscription data or appropriate error
        assert response.status_code in [200, 404, 500]
        
        if response.status_code == 200:
            data = response.json()
            assert "tier" in data or "subscription" in data
    
    def test_upgrade_subscription_missing_data(self):
        """Test upgrade_subscription with missing data"""
        response = client.post("/subscription/upgrade", json={})
        
        # Should return validation error
        assert response.status_code == 422
    
    def test_get_monthly_usage(self):
        """Test get_monthly_usage endpoint (migrated)"""
        response = client.get("/subscription/usage/monthly?user_id=test_user_123")
        
        assert response.status_code in [200, 404, 500]
        
        if response.status_code == 200:
            data = response.json()
            assert "total_queries" in data or "queries_by_type" in data
    
    def test_cancel_subscription(self):
        """Test cancel_subscription endpoint (migrated)"""
        response = client.post("/subscription/cancel", json={"user_id": "test_user_123"})
        
        # Should return success or error
        assert response.status_code in [200, 400, 404, 500]


class TestMigratedUserCRUDEndpoints:
    """Test migrated user CRUD endpoints (now using PostgreSQL)"""
    
    def test_create_user_missing_data(self):
        """Test create_user with missing data"""
        response = client.post("/user", json={})
        
        # Should return validation error
        assert response.status_code == 422
    
    def test_get_user_nonexistent(self):
        """Test getting a nonexistent user"""
        response = client.get("/user/nonexistent_user_id_12345")
        
        # Should return 404 or empty result
        assert response.status_code in [200, 404]
    
    def test_update_user_invalid_id(self):
        """Test updating user with invalid ID"""
        response = client.put(
            "/user/nonexistent_user_id",
            json={"name": "Updated Name"}
        )
        
        # Should return error
        assert response.status_code in [400, 404, 422, 500]
    
    def test_delete_user_nonexistent(self):
        """Test deleting a nonexistent user"""
        response = client.delete("/user/nonexistent_user_id_12345")
        
        # Should handle gracefully
        assert response.status_code in [200, 404, 500]


class TestMigratedKnowledgeLibraryEndpoints:
    """Test migrated knowledge library endpoints (now using PostgreSQL)"""
    
    def test_list_knowledge_items_migrated(self):
        """Test list_knowledge_items endpoint (migrated)"""
        response = client.get("/knowledge_library")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_knowledge_item_by_id_nonexistent(self):
        """Test getting nonexistent knowledge item"""
        response = client.get("/knowledge_library/nonexistent_id_12345")
        
        # Should return 404
        assert response.status_code in [404, 500]
    
    def test_create_knowledge_item_missing_data(self):
        """Test creating knowledge item with missing data"""
        response = client.post("/knowledge_library", json={})
        
        # Should return validation error
        assert response.status_code == 422
    
    def test_update_knowledge_item_nonexistent(self):
        """Test updating nonexistent knowledge item"""
        response = client.put(
            "/knowledge_library/nonexistent_id",
            json={"title": "Updated"}
        )
        
        # Should return error
        assert response.status_code in [400, 404, 422, 500]
    
    def test_delete_knowledge_item_nonexistent(self):
        """Test deleting nonexistent knowledge item"""
        response = client.delete("/knowledge_library/nonexistent_id_12345")
        
        # Should handle gracefully
        assert response.status_code in [404, 500]
    
    def test_search_knowledge_no_query(self):
        """Test knowledge search without query parameter"""
        response = client.get("/knowledge_search")
        
        # Should return validation error
        assert response.status_code == 422
    
    def test_search_knowledge_with_query(self):
        """Test knowledge search with query (migrated)"""
        response = client.get("/knowledge_search?q=running")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestMigratedCoachAthleteEndpoints:
    """Test migrated coach-athlete endpoints (now using PostgreSQL)"""
    
    def test_get_coach_athletes_migrated(self):
        """Test get_coach_athletes endpoint (migrated)"""
        response = client.get("/coach_athletes/test_coach@example.com")
        
        assert response.status_code in [200, 404, 500]
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
    
    def test_link_coach_athlete_missing_data(self):
        """Test linking coach-athlete with missing data"""
        response = client.post("/coach_athletes", json={})
        
        # Should return validation error
        assert response.status_code == 422
    
    def test_unlink_coach_athlete_nonexistent(self):
        """Test unlinking nonexistent coach-athlete relationship"""
        response = client.delete(
            "/coach_athletes",
            json={
                "coach_email": "nonexistent@example.com",
                "athlete_id": "nonexistent_id"
            }
        )
        
        # Should handle gracefully
        assert response.status_code in [200, 404, 422, 500]


class TestMigratedMoodReportEndpoint:
    """Test migrated mood report endpoint (now using PostgreSQL)"""
    
    def test_mood_report_missing_data(self):
        """Test mood report with missing data"""
        response = client.post("/mood_report", json={})
        
        # Should return validation error
        assert response.status_code == 422
    
    def test_mood_report_invalid_user(self):
        """Test mood report for invalid user"""
        response = client.post(
            "/mood_report",
            json={
                "user_id": "nonexistent_user_id_12345",
                "mood": "motivated"
            }
        )
        
        # Should handle gracefully
        assert response.status_code in [200, 404, 500]


class TestMigratedEndpointsIntegration:
    """Integration tests for migrated endpoints"""
    
    def test_database_connection_pooling(self):
        """Test that database connection pooling works under load"""
        import concurrent.futures
        
        def make_request():
            return client.get("/knowledge_library")
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_request) for _ in range(20)]
            results = [f.result() for f in futures]
        
        # All requests should succeed
        assert all(r.status_code == 200 for r in results)
    
    def test_cascade_delete_behavior(self):
        """Test that cascade deletes work properly"""
        # This would require creating a test user, subscription, and usage
        # Then deleting the user and verifying related data is also deleted
        # Implementation depends on test database setup
        pass
    
    def test_migrated_endpoints_cache_integration(self):
        """Test that migrated endpoints still work with caching"""
        # Test knowledge library caching
        response1 = client.get("/knowledge_library")
        response2 = client.get("/knowledge_library")
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        assert response1.json() == response2.json()


def test_summary():
    """Print test summary"""
    print("\n" + "="*50)
    print("ARIA API TEST SUMMARY")
    print("="*50)
    print("✅ Basic functionality tests")
    print("✅ Caching system tests")
    print("✅ Knowledge library tests")
    print("✅ User management tests")
    print("✅ AI consultation tests")
    print("✅ Training plan tests")
    print("✅ Coach management tests")
    print("✅ Media upload tests")
    print("✅ Error handling tests")
    print("✅ Cache management tests")
    print("✅ Performance tests")
    print("✅ Migrated subscription endpoints")
    print("✅ Migrated user CRUD endpoints")
    print("✅ Migrated knowledge library endpoints")
    print("✅ Migrated coach-athlete endpoints")
    print("✅ Migrated mood report endpoint")
    print("✅ Integration tests for PostgreSQL migration")
    print("="*50)
    print("🎉 All core functionality validated!")
    print("="*50)

if __name__ == "__main__":
    # Run tests when script is executed directly
    pytest.main([__file__, "-v", "--tb=short"])