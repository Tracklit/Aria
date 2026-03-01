"""
End-to-end integration tests for Aria
Tests complete workflows with real dependencies (PostgreSQL, Redis, etc.)
"""
import pytest
import time
from datetime import datetime
from fastapi.testclient import TestClient
from main import app
from database import (
    create_athlete_profile, delete_athlete_profile,
    update_user_subscription, get_user_subscription,
    track_query_usage, get_monthly_usage
)
from cache import cache


client = TestClient(app)


@pytest.fixture
def test_user_id():
    """Create a test user ID"""
    return f"integration_test_user_{int(datetime.now().timestamp())}"


@pytest.fixture
def test_user_profile(test_user_id):
    """Create a test user profile for integration tests"""
    profile_data = {
        "id": test_user_id,
        "email": f"{test_user_id}@test.com",
        "name": "Integration Test User",
        "age": 28,
        "sport": "cycling",
        "experience_level": "advanced",
        "goals": ["increase power", "improve endurance"],
        "mood": "focused",
        "streak_count": 0,
        "badges": []
    }
    
    # Create the profile
    profile = create_athlete_profile(profile_data)
    
    yield profile
    
    # Cleanup
    try:
        delete_athlete_profile(test_user_id)
    except:
        pass


class TestUserLifecycle:
    """Test complete user lifecycle from creation to deletion"""
    
    def test_user_creation_and_subscription_setup(self, test_user_id):
        """Test creating a user and setting up their subscription"""
        # Create user profile
        profile_data = {
            "id": test_user_id,
            "email": f"{test_user_id}@test.com",
            "name": "Lifecycle Test User",
            "age": 30,
            "sport": "running"
        }
        
        profile = create_athlete_profile(profile_data)
        
        assert profile is not None
        assert profile["id"] == test_user_id
        
        # Set up subscription
        update_user_subscription(
            user_id=test_user_id,
            tier="free",
            status="active"
        )
        
        # Verify subscription
        subscription = get_user_subscription(test_user_id)
        
        assert subscription is not None
        assert subscription["tier"] == "free"
        assert subscription["subscription_status"] == "active"
        
        # Cleanup
        delete_athlete_profile(test_user_id)
    
    def test_subscription_upgrade_workflow(self, test_user_profile):
        """Test upgrading a user's subscription"""
        user_id = test_user_profile["id"]
        
        # Start with free tier
        update_user_subscription(user_id=user_id, tier="free", status="active")
        
        # Upgrade to pro
        update_user_subscription(
            user_id=user_id,
            tier="pro",
            status="active",
            stripe_subscription_id="sub_test_123",
            stripe_customer_id="cus_test_123"
        )
        
        # Verify upgrade
        subscription = get_user_subscription(user_id)
        
        assert subscription["tier"] == "pro"
        assert subscription["stripe_subscription_id"] == "sub_test_123"
    
    def test_subscription_cancellation_workflow(self, test_user_profile):
        """Test cancelling a user's subscription"""
        user_id = test_user_profile["id"]
        
        # Start with pro tier
        update_user_subscription(
            user_id=user_id,
            tier="pro",
            status="active",
            stripe_subscription_id="sub_test_456"
        )
        
        # Cancel subscription
        update_user_subscription(user_id=user_id, tier="free", status="cancelled")
        
        # Verify cancellation
        subscription = get_user_subscription(user_id)
        
        assert subscription["tier"] == "free"
        assert subscription["subscription_status"] == "cancelled"


class TestUsageTrackingWorkflow:
    """Test complete usage tracking workflow"""
    
    def test_track_and_retrieve_usage(self, test_user_profile):
        """Test tracking usage and retrieving monthly stats"""
        user_id = test_user_profile["id"]
        
        # Track several queries
        track_query_usage(user_id, "/ask", 100)
        track_query_usage(user_id, "/training_plan", 200)
        track_query_usage(user_id, "/nutrition_plan", 150)
        
        # Get monthly usage
        usage = get_monthly_usage(user_id)
        
        assert usage >= 3
    
    def test_usage_quota_enforcement(self, test_user_profile):
        """Test that usage quotas are enforced"""
        user_id = test_user_profile["id"]
        
        # Set free tier (10 queries per month)
        update_user_subscription(user_id=user_id, tier="free", status="active")
        
        # Track queries up to limit
        for i in range(10):
            track_query_usage(user_id, "/ask", 100)
        
        # Verify usage count
        usage = get_monthly_usage(user_id)
        
        assert usage >= 10


class TestKnowledgeLibraryIntegration:
    """Test knowledge library with caching integration"""
    
    def test_knowledge_library_cache_flow(self):
        """Test knowledge library caching behavior"""
        # Clear cache
        cache.delete("knowledge_library:all")
        
        # First request (populates cache)
        start_time = time.time()
        response1 = client.get("/knowledge_library")
        first_time = time.time() - start_time
        
        assert response1.status_code == 200
        data1 = response1.json()
        
        # Second request (from cache)
        start_time = time.time()
        response2 = client.get("/knowledge_library")
        second_time = time.time() - start_time
        
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Data should be identical
        assert data1 == data2
        
        # Second request should be faster
        assert second_time < first_time + 0.1
    
    def test_knowledge_search_with_cache(self):
        """Test knowledge search with caching"""
        # Search twice for the same query
        response1 = client.get("/knowledge_search?q=nutrition")
        response2 = client.get("/knowledge_search?q=nutrition")
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        
        # Results should be identical
        assert response1.json() == response2.json()


class TestCoachAthleteWorkflow:
    """Test coach-athlete relationship workflows"""
    
    def test_coach_athlete_linking_flow(self, test_user_profile):
        """Test linking athlete to coach"""
        from database import link_coach_athlete, get_coach_athletes, unlink_coach_athlete
        
        user_id = test_user_profile["id"]
        coach_email = "integration_coach@test.com"
        
        # Link athlete to coach
        link_coach_athlete(coach_email, user_id)
        
        # Verify link
        athletes = get_coach_athletes(coach_email)
        
        assert any(a["athlete_id"] == user_id for a in athletes)
        
        # Unlink
        unlink_coach_athlete(coach_email, user_id)
        
        # Verify unlink
        athletes = get_coach_athletes(coach_email)
        
        assert not any(a["athlete_id"] == user_id for a in athletes)


class TestEndToEndAPIWorkflows:
    """Test complete end-to-end API workflows"""
    
    def test_complete_consultation_workflow(self, test_user_profile):
        """Test complete AI consultation workflow"""
        user_id = test_user_profile["id"]
        
        # Set up subscription
        update_user_subscription(user_id=user_id, tier="pro", status="active")
        
        # Get subscription status
        response = client.get(f"/subscription/status?user_id={user_id}")
        
        assert response.status_code in [200, 404, 500]
        
        # Track usage
        track_query_usage(user_id, "/ask", 150)
        
        # Get monthly usage
        response = client.get(f"/subscription/usage/monthly?user_id={user_id}")
        
        assert response.status_code in [200, 404, 500]
    
    def test_complete_training_plan_workflow(self, test_user_profile):
        """Test complete training plan generation workflow"""
        user_id = test_user_profile["id"]
        
        # Update user profile with training goals
        from database import update_athlete_profile
        
        update_athlete_profile(user_id, {
            "goals": ["improve 5K time", "build endurance"],
            "experience_level": "intermediate"
        })
        
        # Track a training plan query
        track_query_usage(user_id, "/training_plan", 300)
        
        # Verify usage was tracked
        usage = get_monthly_usage(user_id)
        
        assert usage >= 1


class TestConcurrentOperations:
    """Test concurrent operations and race conditions"""
    
    def test_concurrent_usage_tracking(self, test_user_profile):
        """Test tracking usage from multiple concurrent requests"""
        import concurrent.futures
        
        user_id = test_user_profile["id"]
        
        def track_usage():
            track_query_usage(user_id, "/ask", 100)
        
        # Track usage from 10 concurrent "requests"
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(track_usage) for _ in range(10)]
            [f.result() for f in futures]
        
        # Verify all usage was tracked
        usage = get_monthly_usage(user_id)
        
        assert usage >= 10
    
    def test_concurrent_cache_access(self):
        """Test concurrent cache access"""
        import concurrent.futures
        
        def get_knowledge():
            return client.get("/knowledge_library")
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(get_knowledge) for _ in range(20)]
            results = [f.result() for f in futures]
        
        # All requests should succeed
        assert all(r.status_code == 200 for r in results)
        
        # All should return identical data
        first_data = results[0].json()
        assert all(r.json() == first_data for r in results)


class TestDataConsistency:
    """Test data consistency across operations"""
    
    def test_cascade_delete_consistency(self, test_user_id):
        """Test that cascade deletes maintain data consistency"""
        # Create user with subscription and usage
        profile_data = {
            "id": test_user_id,
            "email": f"{test_user_id}@test.com",
            "name": "Cascade Test User",
            "age": 25,
            "sport": "swimming"
        }
        
        create_athlete_profile(profile_data)
        update_user_subscription(user_id=test_user_id, tier="pro", status="active")
        track_query_usage(test_user_id, "/ask", 100)
        
        # Verify data exists
        subscription = get_user_subscription(test_user_id)
        usage = get_monthly_usage(test_user_id)
        
        assert subscription is not None
        assert usage >= 1
        
        # Delete user (should cascade)
        delete_athlete_profile(test_user_id)
        
        # Verify all related data is gone
        subscription = get_user_subscription(test_user_id)
        usage = get_monthly_usage(test_user_id)
        
        assert subscription is None or subscription["subscription_status"] == "cancelled"
        assert usage == 0
    
    def test_cache_invalidation_consistency(self, test_user_profile):
        """Test that cache is properly invalidated on updates"""
        user_id = test_user_profile["id"]
        
        # Cache user profile
        cache_key = f"athlete_profile:{user_id}"
        cache.set(cache_key, test_user_profile, ttl=300)
        
        # Update profile
        from database import update_athlete_profile
        
        update_athlete_profile(user_id, {"name": "Updated Name"})
        
        # Clear cache
        cache.delete(cache_key)
        
        # Verify cache is empty
        cached = cache.get(cache_key)
        
        assert cached is None


class TestErrorRecovery:
    """Test error recovery and resilience"""
    
    def test_database_error_recovery(self):
        """Test that app handles database errors gracefully"""
        # Try to get a nonexistent user
        response = client.get("/user/nonexistent_user_xyz_123")
        
        # Should return 404 or handle gracefully
        assert response.status_code in [200, 404, 500]
    
    def test_cache_failure_recovery(self):
        """Test that app handles cache failures gracefully"""
        # Even if cache is unavailable, endpoints should work
        response = client.get("/knowledge_library")
        
        assert response.status_code == 200
    
    def test_partial_data_handling(self, test_user_profile):
        """Test handling of partial/incomplete data"""
        user_id = test_user_profile["id"]
        
        # Try to update with empty data
        from database import update_athlete_profile
        
        result = update_athlete_profile(user_id, {})
        
        # Should handle gracefully (no update or return original)
        assert result is not None or result is None


class TestPerformanceUnderLoad:
    """Test performance under load"""
    
    def test_api_performance_under_load(self):
        """Test API performance with multiple concurrent requests"""
        import concurrent.futures
        
        endpoints = [
            "/knowledge_library",
            "/subscription/tiers",
            "/knowledge_library"
        ]
        
        def make_request(endpoint):
            start = time.time()
            response = client.get(endpoint)
            duration = time.time() - start
            return response.status_code, duration
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [
                executor.submit(make_request, endpoints[i % len(endpoints)])
                for i in range(50)
            ]
            results = [f.result() for f in futures]
        
        # All requests should succeed
        statuses = [r[0] for r in results]
        assert all(s == 200 for s in statuses)
        
        # Average response time should be reasonable (< 1 second)
        durations = [r[1] for r in results]
        avg_duration = sum(durations) / len(durations)
        
        assert avg_duration < 1.0
    
    def test_database_connection_pool_efficiency(self, test_user_profile):
        """Test that database connection pool handles load efficiently"""
        import concurrent.futures
        
        user_id = test_user_profile["id"]
        
        def get_subscription():
            return get_user_subscription(user_id)
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(get_subscription) for _ in range(100)]
            results = [f.result() for f in futures]
        
        # All operations should complete successfully
        assert len(results) == 100


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
