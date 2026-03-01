"""
Comprehensive tests for database.py module
Tests all CRUD operations, connection pooling, and cascade deletes
"""
import pytest
import psycopg2
from datetime import datetime, timedelta
from database import (
    db_pool, init_db_pool, get_athlete_profile, create_athlete_profile,
    update_athlete_profile, delete_athlete_profile, update_athlete_mood,
    get_user_subscription, update_user_subscription, track_query_usage,
    get_monthly_usage, get_query_usage_details, get_knowledge_items,
    get_knowledge_item_by_id, create_knowledge_item, update_knowledge_item,
    delete_knowledge_item, search_knowledge_items, get_coach_athletes,
    link_coach_athlete, unlink_coach_athlete
)


@pytest.fixture(scope="module")
def test_db():
    """Initialize database connection pool for tests"""
    init_db_pool()
    yield db_pool
    db_pool.closeall()


@pytest.fixture
def test_athlete_data():
    """Sample athlete data for testing"""
    return {
        "id": f"test_user_{datetime.now().timestamp()}",
        "email": f"test_{datetime.now().timestamp()}@example.com",
        "name": "Test Athlete",
        "age": 25,
        "sport": "running",
        "experience_level": "intermediate",
        "goals": ["improve speed", "build endurance"],
        "mood": "motivated",
        "streak_count": 0,
        "badges": []
    }


@pytest.fixture
def test_knowledge_data():
    """Sample knowledge item data for testing"""
    return {
        "title": f"Test Article {datetime.now().timestamp()}",
        "summary": "Test summary for knowledge item",
        "tags": ["test", "running"],
        "url": "https://example.com/test"
    }


class TestConnectionPool:
    """Test database connection pooling"""
    
    def test_connection_pool_exists(self, test_db):
        """Test that connection pool is initialized"""
        assert test_db is not None
        assert hasattr(test_db, 'getconn')
    
    def test_get_connection(self, test_db):
        """Test getting a connection from pool"""
        conn = test_db.getconn()
        assert conn is not None
        assert not conn.closed
        test_db.putconn(conn)
    
    def test_connection_reuse(self, test_db):
        """Test that connections are reused"""
        conn1 = test_db.getconn()
        conn1_id = id(conn1)
        test_db.putconn(conn1)
        
        conn2 = test_db.getconn()
        conn2_id = id(conn2)
        test_db.putconn(conn2)
        
        # Should get the same connection back (reuse)
        assert conn1_id == conn2_id


class TestAthleteProfileCRUD:
    """Test athlete profile CRUD operations"""
    
    def test_create_athlete_profile(self, test_db, test_athlete_data):
        """Test creating an athlete profile"""
        profile = create_athlete_profile(test_athlete_data)
        
        assert profile is not None
        assert profile["id"] == test_athlete_data["id"]
        assert profile["email"] == test_athlete_data["email"]
        assert profile["name"] == test_athlete_data["name"]
        assert profile["mood"] == "motivated"
        assert profile["streak_count"] == 0
        
        # Cleanup
        delete_athlete_profile(test_athlete_data["id"])
    
    def test_get_athlete_profile(self, test_db, test_athlete_data):
        """Test retrieving an athlete profile"""
        # Create profile first
        created = create_athlete_profile(test_athlete_data)
        
        # Retrieve it
        profile = get_athlete_profile(test_athlete_data["id"])
        
        assert profile is not None
        assert profile["id"] == test_athlete_data["id"]
        assert profile["email"] == test_athlete_data["email"]
        
        # Cleanup
        delete_athlete_profile(test_athlete_data["id"])
    
    def test_update_athlete_profile(self, test_db, test_athlete_data):
        """Test updating an athlete profile"""
        # Create profile first
        create_athlete_profile(test_athlete_data)
        
        # Update it
        updates = {
            "name": "Updated Name",
            "age": 26,
            "streak_count": 5
        }
        updated = update_athlete_profile(test_athlete_data["id"], updates)
        
        assert updated is not None
        assert updated["name"] == "Updated Name"
        assert updated["age"] == 26
        assert updated["streak_count"] == 5
        
        # Cleanup
        delete_athlete_profile(test_athlete_data["id"])
    
    def test_update_athlete_mood(self, test_db, test_athlete_data):
        """Test updating athlete mood"""
        # Create profile first
        create_athlete_profile(test_athlete_data)
        
        # Update mood
        updated = update_athlete_mood(test_athlete_data["id"], "tired")
        
        assert updated is not None
        assert updated["mood"] == "tired"
        
        # Cleanup
        delete_athlete_profile(test_athlete_data["id"])
    
    def test_delete_athlete_profile(self, test_db, test_athlete_data):
        """Test deleting an athlete profile"""
        # Create profile first
        create_athlete_profile(test_athlete_data)
        
        # Delete it
        deleted = delete_athlete_profile(test_athlete_data["id"])
        
        assert deleted is True
        
        # Verify it's gone
        profile = get_athlete_profile(test_athlete_data["id"])
        assert profile is None
    
    def test_get_nonexistent_profile(self, test_db):
        """Test retrieving a profile that doesn't exist"""
        profile = get_athlete_profile("nonexistent_user_id")
        assert profile is None


class TestSubscriptionCRUD:
    """Test subscription CRUD operations"""
    
    def test_update_user_subscription(self, test_db, test_athlete_data):
        """Test updating user subscription"""
        # Create athlete first
        create_athlete_profile(test_athlete_data)
        
        # Update subscription
        update_user_subscription(
            user_id=test_athlete_data["id"],
            tier="pro",
            status="active",
            stripe_subscription_id="sub_test123",
            stripe_customer_id="cus_test123"
        )
        
        # Verify subscription
        subscription = get_user_subscription(test_athlete_data["id"])
        
        assert subscription is not None
        assert subscription["tier"] == "pro"
        assert subscription["subscription_status"] == "active"
        assert subscription["stripe_subscription_id"] == "sub_test123"
        
        # Cleanup
        delete_athlete_profile(test_athlete_data["id"])
    
    def test_get_user_subscription(self, test_db, test_athlete_data):
        """Test retrieving user subscription"""
        # Create athlete and subscription
        create_athlete_profile(test_athlete_data)
        update_user_subscription(
            user_id=test_athlete_data["id"],
            tier="elite",
            status="active"
        )
        
        # Retrieve subscription
        subscription = get_user_subscription(test_athlete_data["id"])
        
        assert subscription is not None
        assert subscription["tier"] == "elite"
        
        # Cleanup
        delete_athlete_profile(test_athlete_data["id"])


class TestQueryUsageTracking:
    """Test query usage tracking"""
    
    def test_track_query_usage(self, test_db, test_athlete_data):
        """Test tracking query usage"""
        # Create athlete first
        create_athlete_profile(test_athlete_data)
        
        # Track usage
        track_query_usage(
            user_id=test_athlete_data["id"],
            endpoint="/ask",
            tokens_consumed=150
        )
        
        # Verify usage was tracked
        usage = get_monthly_usage(test_athlete_data["id"])
        assert usage >= 1
        
        # Cleanup
        delete_athlete_profile(test_athlete_data["id"])
    
    def test_get_monthly_usage(self, test_db, test_athlete_data):
        """Test getting monthly usage count"""
        # Create athlete first
        create_athlete_profile(test_athlete_data)
        
        # Track some usage
        track_query_usage(test_athlete_data["id"], "/ask", 100)
        track_query_usage(test_athlete_data["id"], "/ask", 150)
        
        # Get monthly usage
        usage = get_monthly_usage(test_athlete_data["id"])
        
        assert usage >= 2
        
        # Cleanup
        delete_athlete_profile(test_athlete_data["id"])
    
    def test_get_query_usage_details(self, test_db, test_athlete_data):
        """Test getting detailed query usage"""
        # Create athlete first
        create_athlete_profile(test_athlete_data)
        
        # Track usage
        track_query_usage(test_athlete_data["id"], "/ask", 100)
        track_query_usage(test_athlete_data["id"], "/nutrition_plan", 200)
        
        # Get usage details
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        details = get_query_usage_details(
            test_athlete_data["id"],
            start_date.isoformat(),
            end_date.isoformat()
        )
        
        assert len(details) >= 2
        assert any(d["endpoint"] == "/ask" for d in details)
        assert any(d["endpoint"] == "/nutrition_plan" for d in details)
        
        # Cleanup
        delete_athlete_profile(test_athlete_data["id"])


class TestKnowledgeLibraryCRUD:
    """Test knowledge library CRUD operations"""
    
    def test_create_knowledge_item(self, test_db, test_knowledge_data):
        """Test creating a knowledge item"""
        item = create_knowledge_item(test_knowledge_data)
        
        assert item is not None
        assert "id" in item
        assert item["title"] == test_knowledge_data["title"]
        assert item["summary"] == test_knowledge_data["summary"]
        
        # Cleanup
        delete_knowledge_item(item["id"])
    
    def test_get_knowledge_items(self, test_db, test_knowledge_data):
        """Test retrieving knowledge items"""
        # Create some items
        item1 = create_knowledge_item(test_knowledge_data)
        
        # Get items
        items = get_knowledge_items(limit=100, offset=0)
        
        assert isinstance(items, list)
        assert len(items) > 0
        
        # Cleanup
        delete_knowledge_item(item1["id"])
    
    def test_get_knowledge_item_by_id(self, test_db, test_knowledge_data):
        """Test retrieving a specific knowledge item"""
        # Create item
        created = create_knowledge_item(test_knowledge_data)
        
        # Retrieve it
        item = get_knowledge_item_by_id(created["id"])
        
        assert item is not None
        assert item["id"] == created["id"]
        assert item["title"] == test_knowledge_data["title"]
        
        # Cleanup
        delete_knowledge_item(created["id"])
    
    def test_update_knowledge_item(self, test_db, test_knowledge_data):
        """Test updating a knowledge item"""
        # Create item
        created = create_knowledge_item(test_knowledge_data)
        
        # Update it
        updates = {
            "title": "Updated Title",
            "summary": "Updated summary"
        }
        updated = update_knowledge_item(created["id"], updates)
        
        assert updated is not None
        assert updated["title"] == "Updated Title"
        assert updated["summary"] == "Updated summary"
        
        # Cleanup
        delete_knowledge_item(created["id"])
    
    def test_delete_knowledge_item(self, test_db, test_knowledge_data):
        """Test deleting a knowledge item"""
        # Create item
        created = create_knowledge_item(test_knowledge_data)
        
        # Delete it
        deleted = delete_knowledge_item(created["id"])
        
        assert deleted is True
        
        # Verify it's gone
        item = get_knowledge_item_by_id(created["id"])
        assert item is None
    
    def test_search_knowledge_items(self, test_db, test_knowledge_data):
        """Test searching knowledge items"""
        # Create item with specific title
        test_knowledge_data["title"] = "Unique Running Technique XYZ123"
        created = create_knowledge_item(test_knowledge_data)
        
        # Search for it
        results = search_knowledge_items("Running Technique")
        
        assert isinstance(results, list)
        assert any(r["id"] == created["id"] for r in results)
        
        # Cleanup
        delete_knowledge_item(created["id"])


class TestCoachAthleteRelationships:
    """Test coach-athlete relationship management"""
    
    def test_link_coach_athlete(self, test_db, test_athlete_data):
        """Test linking an athlete to a coach"""
        # Create athlete
        create_athlete_profile(test_athlete_data)
        
        # Link to coach
        coach_email = "coach@example.com"
        link_coach_athlete(coach_email, test_athlete_data["id"])
        
        # Verify link exists
        athletes = get_coach_athletes(coach_email)
        
        assert isinstance(athletes, list)
        assert any(a["athlete_id"] == test_athlete_data["id"] for a in athletes)
        
        # Cleanup
        unlink_coach_athlete(coach_email, test_athlete_data["id"])
        delete_athlete_profile(test_athlete_data["id"])
    
    def test_get_coach_athletes(self, test_db, test_athlete_data):
        """Test retrieving coach's athletes"""
        # Create athlete
        create_athlete_profile(test_athlete_data)
        
        # Link to coach
        coach_email = "coach2@example.com"
        link_coach_athlete(coach_email, test_athlete_data["id"])
        
        # Get athletes
        athletes = get_coach_athletes(coach_email)
        
        assert isinstance(athletes, list)
        assert len(athletes) >= 1
        
        # Cleanup
        unlink_coach_athlete(coach_email, test_athlete_data["id"])
        delete_athlete_profile(test_athlete_data["id"])
    
    def test_unlink_coach_athlete(self, test_db, test_athlete_data):
        """Test unlinking an athlete from a coach"""
        # Create athlete
        create_athlete_profile(test_athlete_data)
        
        # Link to coach
        coach_email = "coach3@example.com"
        link_coach_athlete(coach_email, test_athlete_data["id"])
        
        # Unlink
        unlinked = unlink_coach_athlete(coach_email, test_athlete_data["id"])
        
        assert unlinked is True
        
        # Verify link is gone
        athletes = get_coach_athletes(coach_email)
        assert not any(a["athlete_id"] == test_athlete_data["id"] for a in athletes)
        
        # Cleanup
        delete_athlete_profile(test_athlete_data["id"])


class TestCascadeDeletes:
    """Test cascade delete behavior"""
    
    def test_delete_athlete_cascades_subscription(self, test_db, test_athlete_data):
        """Test that deleting athlete also deletes subscription"""
        # Create athlete and subscription
        create_athlete_profile(test_athlete_data)
        update_user_subscription(
            user_id=test_athlete_data["id"],
            tier="pro",
            status="active"
        )
        
        # Verify subscription exists
        subscription = get_user_subscription(test_athlete_data["id"])
        assert subscription is not None
        
        # Delete athlete
        delete_athlete_profile(test_athlete_data["id"])
        
        # Verify subscription is also gone (cascade)
        subscription = get_user_subscription(test_athlete_data["id"])
        assert subscription is None or subscription["subscription_status"] == "cancelled"
    
    def test_delete_athlete_cascades_usage(self, test_db, test_athlete_data):
        """Test that deleting athlete also deletes usage records"""
        # Create athlete and track usage
        create_athlete_profile(test_athlete_data)
        track_query_usage(test_athlete_data["id"], "/ask", 100)
        
        # Verify usage exists
        usage = get_monthly_usage(test_athlete_data["id"])
        assert usage >= 1
        
        # Delete athlete
        delete_athlete_profile(test_athlete_data["id"])
        
        # Verify usage is also gone (cascade)
        usage = get_monthly_usage(test_athlete_data["id"])
        assert usage == 0


class TestEdgeCases:
    """Test edge cases and error handling"""
    
    def test_update_nonexistent_profile(self, test_db):
        """Test updating a profile that doesn't exist"""
        updated = update_athlete_profile("nonexistent_id", {"name": "Test"})
        assert updated is None
    
    def test_delete_nonexistent_profile(self, test_db):
        """Test deleting a profile that doesn't exist"""
        deleted = delete_athlete_profile("nonexistent_id")
        assert deleted is False
    
    def test_get_empty_knowledge_items(self, test_db):
        """Test getting knowledge items when none exist (or checking pagination)"""
        items = get_knowledge_items(limit=1, offset=999999)
        assert isinstance(items, list)
    
    def test_search_with_no_results(self, test_db):
        """Test searching with a query that has no results"""
        results = search_knowledge_items("XYZ123ABC456NONEXISTENT")
        assert isinstance(results, list)
        assert len(results) == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
