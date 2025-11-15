"""
Tests for tracklit_integration.py
Tests TrackLit API integration, user sync, session validation, and webhooks
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
from tracklit_integration import (
    TrackLitIntegration, sync_user_profile, validate_session,
    notify_query_usage, get_tracklit_user, webhook_handler,
    batch_sync_users, verify_webhook_signature, tracklit
)


@pytest.fixture
def mock_tracklit_user():
    """Mock TrackLit user data"""
    return {
        "id": "test_user_123",
        "email": "test@example.com",
        "name": "Test User",
        "full_name": "Test User Full",
        "age": 28,
        "primary_sport": "running",
        "experience_level": "intermediate",
        "goals": ["improve 5K", "build endurance"],
        "current_mood": "motivated",
        "streak_days": 7,
        "badges": ["10k_finisher", "consistent_trainer"],
        "subscription": {
            "tier": "pro",
            "status": "active",
            "stripe_subscription_id": "sub_test_123",
            "stripe_customer_id": "cus_test_123"
        }
    }


@pytest.fixture
def mock_session_response():
    """Mock session validation response"""
    return {
        "valid": True,
        "user": {
            "id": "user_456",
            "email": "session_user@example.com",
            "name": "Session User"
        }
    }


class TestTrackLitIntegrationClient:
    """Test TrackLitIntegration client class"""
    
    def test_client_initialization(self):
        """Test that client initializes correctly"""
        client = TrackLitIntegration(
            api_url="https://test.api.com",
            api_key="test_key_123"
        )
        
        assert client.api_url == "https://test.api.com"
        assert client.api_key == "test_key_123"
        assert "Authorization" in client.headers
        assert client.headers["Authorization"] == "Bearer test_key_123"
    
    @patch('tracklit_integration.requests.request')
    def test_make_request_success(self, mock_request):
        """Test successful API request"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"data": "test"}
        mock_request.return_value = mock_response
        
        client = TrackLitIntegration()
        result = client._make_request("GET", "/test")
        
        assert result == {"data": "test"}
        mock_request.assert_called_once()
    
    @patch('tracklit_integration.requests.request')
    def test_make_request_http_error(self, mock_request):
        """Test API request with HTTP error"""
        mock_response = Mock()
        mock_response.status_code = 404
        mock_response.raise_for_status.side_effect = Exception("Not found")
        mock_request.return_value = mock_response
        
        client = TrackLitIntegration()
        result = client._make_request("GET", "/nonexistent")
        
        assert result is None
    
    @patch('tracklit_integration.requests.request')
    def test_make_request_204_no_content(self, mock_request):
        """Test API request returning 204 No Content"""
        mock_response = Mock()
        mock_response.status_code = 204
        mock_request.return_value = mock_response
        
        client = TrackLitIntegration()
        result = client._make_request("DELETE", "/resource")
        
        assert result == {}


class TestSyncUserProfile:
    """Test sync_user_profile function"""
    
    @patch('tracklit_integration.TrackLitIntegration')
    @patch('tracklit_integration.get_athlete_profile')
    @patch('tracklit_integration.update_athlete_profile')
    @patch('tracklit_integration.cache')
    def test_sync_existing_user(
        self, mock_cache, mock_update, mock_get, mock_client_class, mock_tracklit_user
    ):
        """Test syncing an existing user profile"""
        # Setup mocks
        mock_client = Mock()
        mock_client._make_request.return_value = mock_tracklit_user
        mock_client_class.return_value = mock_client
        
        mock_get.return_value = {"id": "test_user_123"}  # User exists
        mock_update.return_value = {"id": "test_user_123", "name": "Test User"}
        
        # Execute
        result = sync_user_profile("test_user_123")
        
        # Verify
        assert result is not None
        assert result["id"] == "test_user_123"
        mock_update.assert_called_once()
        mock_cache.delete.assert_called()
    
    @patch('tracklit_integration.TrackLitIntegration')
    @patch('tracklit_integration.get_athlete_profile')
    @patch('tracklit_integration.create_athlete_profile')
    @patch('tracklit_integration.cache')
    def test_sync_new_user(
        self, mock_cache, mock_create, mock_get, mock_client_class, mock_tracklit_user
    ):
        """Test syncing a new user profile (create)"""
        # Setup mocks
        mock_client = Mock()
        mock_client._make_request.return_value = mock_tracklit_user
        mock_client_class.return_value = mock_client
        
        mock_get.return_value = None  # User doesn't exist
        mock_create.return_value = {"id": "test_user_123", "name": "Test User"}
        
        # Execute
        result = sync_user_profile("test_user_123")
        
        # Verify
        assert result is not None
        mock_create.assert_called_once()
        mock_cache.delete.assert_called()
    
    @patch('tracklit_integration.TrackLitIntegration')
    def test_sync_user_api_error(self, mock_client_class):
        """Test sync when TrackLit API returns error"""
        mock_client = Mock()
        mock_client._make_request.return_value = None  # API error
        mock_client_class.return_value = mock_client
        
        result = sync_user_profile("test_user_123")
        
        assert result is None


class TestValidateSession:
    """Test validate_session function"""
    
    @patch('tracklit_integration.cache')
    def test_validate_session_from_cache(self, mock_cache):
        """Test session validation from cache"""
        cached_user = {"id": "user_123", "email": "cached@example.com"}
        mock_cache.get.return_value = cached_user
        
        result = validate_session("sess_abc123")
        
        assert result == cached_user
        mock_cache.get.assert_called_once()
    
    @patch('tracklit_integration.TrackLitIntegration')
    @patch('tracklit_integration.cache')
    def test_validate_session_from_api(
        self, mock_cache, mock_client_class, mock_session_response
    ):
        """Test session validation from API"""
        mock_cache.get.return_value = None  # Not in cache
        
        mock_client = Mock()
        mock_client._make_request.return_value = mock_session_response
        mock_client_class.return_value = mock_client
        
        result = validate_session("sess_xyz789")
        
        assert result is not None
        assert result["id"] == "user_456"
        mock_cache.set.assert_called_once()
    
    @patch('tracklit_integration.TrackLitIntegration')
    @patch('tracklit_integration.cache')
    def test_validate_invalid_session(self, mock_cache, mock_client_class):
        """Test validation of invalid session"""
        mock_cache.get.return_value = None
        
        mock_client = Mock()
        mock_client._make_request.return_value = {"valid": False}
        mock_client_class.return_value = mock_client
        
        result = validate_session("invalid_session")
        
        assert result is None


class TestNotifyQueryUsage:
    """Test notify_query_usage function"""
    
    @patch('tracklit_integration.TrackLitIntegration')
    def test_notify_usage_success(self, mock_client_class):
        """Test successful usage notification"""
        mock_client = Mock()
        mock_client._make_request.return_value = {"status": "ok"}
        mock_client_class.return_value = mock_client
        
        result = notify_query_usage(
            user_id="user_123",
            query_type="/training_plan",
            tokens_consumed=500,
            metadata={"duration": "12_weeks"}
        )
        
        assert result is True
        mock_client._make_request.assert_called_once()
        
        # Verify payload structure
        call_args = mock_client._make_request.call_args
        payload = call_args[1]["data"]
        
        assert payload["user_id"] == "user_123"
        assert payload["query_type"] == "/training_plan"
        assert payload["tokens_consumed"] == 500
        assert payload["service"] == "aria"
    
    @patch('tracklit_integration.TrackLitIntegration')
    def test_notify_usage_failure(self, mock_client_class):
        """Test usage notification failure"""
        mock_client = Mock()
        mock_client._make_request.return_value = None  # API error
        mock_client_class.return_value = mock_client
        
        result = notify_query_usage("user_123", "/ask", 100)
        
        assert result is False


class TestGetTrackLitUser:
    """Test get_tracklit_user function"""
    
    @patch('tracklit_integration.cache')
    def test_get_user_from_cache(self, mock_cache, mock_tracklit_user):
        """Test getting user from cache"""
        mock_cache.get.return_value = mock_tracklit_user
        
        result = get_tracklit_user("user_123")
        
        assert result == mock_tracklit_user
        mock_cache.get.assert_called_with("tracklit_user:user_123")
    
    @patch('tracklit_integration.TrackLitIntegration')
    @patch('tracklit_integration.cache')
    def test_get_user_from_api(
        self, mock_cache, mock_client_class, mock_tracklit_user
    ):
        """Test getting user from API"""
        mock_cache.get.return_value = None
        
        mock_client = Mock()
        mock_client._make_request.return_value = mock_tracklit_user
        mock_client_class.return_value = mock_client
        
        result = get_tracklit_user("user_123")
        
        assert result == mock_tracklit_user
        mock_cache.set.assert_called_once()
    
    @patch('tracklit_integration.TrackLitIntegration')
    @patch('tracklit_integration.cache')
    def test_get_nonexistent_user(self, mock_cache, mock_client_class):
        """Test getting nonexistent user"""
        mock_cache.get.return_value = None
        
        mock_client = Mock()
        mock_client._make_request.return_value = None
        mock_client_class.return_value = mock_client
        
        result = get_tracklit_user("nonexistent")
        
        assert result is None


class TestWebhookHandler:
    """Test webhook_handler function"""
    
    @patch('tracklit_integration.sync_user_profile')
    def test_handle_user_updated_webhook(self, mock_sync):
        """Test handling user.updated webhook"""
        mock_sync.return_value = {"id": "user_123"}
        
        payload = {"user_id": "user_123", "changes": {"name": "New Name"}}
        result = webhook_handler("user.updated", payload)
        
        assert result is True
        mock_sync.assert_called_once_with("user_123")
    
    @patch('tracklit_integration.update_user_subscription')
    @patch('tracklit_integration.cache')
    def test_handle_subscription_upgraded_webhook(self, mock_cache, mock_update):
        """Test handling subscription.upgraded webhook"""
        payload = {
            "user_id": "user_123",
            "subscription": {
                "tier": "pro",
                "stripe_subscription_id": "sub_123"
            }
        }
        
        result = webhook_handler("subscription.upgraded", payload)
        
        assert result is True
        mock_update.assert_called_once()
        mock_cache.delete.assert_called_with("subscription:user_123")
    
    @patch('tracklit_integration.update_user_subscription')
    @patch('tracklit_integration.cache')
    def test_handle_subscription_cancelled_webhook(self, mock_cache, mock_update):
        """Test handling subscription.cancelled webhook"""
        payload = {"user_id": "user_123"}
        
        result = webhook_handler("subscription.cancelled", payload)
        
        assert result is True
        mock_update.assert_called_with(
            user_id="user_123",
            tier="free",
            status="cancelled"
        )
    
    @patch('tracklit_integration.delete_athlete_profile')
    @patch('tracklit_integration.cache')
    def test_handle_user_deleted_webhook(self, mock_cache, mock_delete):
        """Test handling user.deleted webhook"""
        mock_delete.return_value = True
        
        payload = {"user_id": "user_123"}
        result = webhook_handler("user.deleted", payload)
        
        assert result is True
        mock_delete.assert_called_once_with("user_123")
        mock_cache.delete.assert_called()
    
    @patch('tracklit_integration.update_athlete_profile')
    @patch('tracklit_integration.cache')
    def test_handle_training_completed_webhook(self, mock_cache, mock_update):
        """Test handling training.completed webhook"""
        payload = {
            "user_id": "user_123",
            "training": {
                "new_streak": 10,
                "badges": ["consistent_trainer", "10k_finisher"]
            }
        }
        
        result = webhook_handler("training.completed", payload)
        
        assert result is True
        mock_update.assert_called_once()
    
    def test_handle_unknown_webhook(self):
        """Test handling unknown webhook type"""
        payload = {"user_id": "user_123"}
        result = webhook_handler("unknown.event", payload)
        
        assert result is False
    
    def test_handle_webhook_missing_user_id(self):
        """Test handling webhook without user_id"""
        payload = {"some_field": "value"}
        result = webhook_handler("user.updated", payload)
        
        assert result is False


class TestBatchSyncUsers:
    """Test batch_sync_users function"""
    
    @patch('tracklit_integration.sync_user_profile')
    def test_batch_sync_all_successful(self, mock_sync):
        """Test batch sync where all users succeed"""
        mock_sync.return_value = {"id": "user"}
        
        user_ids = ["user_1", "user_2", "user_3"]
        results = batch_sync_users(user_ids)
        
        assert len(results) == 3
        assert all(results.values())
        assert mock_sync.call_count == 3
    
    @patch('tracklit_integration.sync_user_profile')
    def test_batch_sync_partial_failure(self, mock_sync):
        """Test batch sync with some failures"""
        # First succeeds, second fails, third succeeds
        mock_sync.side_effect = [
            {"id": "user_1"},
            None,
            {"id": "user_3"}
        ]
        
        user_ids = ["user_1", "user_2", "user_3"]
        results = batch_sync_users(user_ids)
        
        assert results["user_1"] is True
        assert results["user_2"] is False
        assert results["user_3"] is True
    
    @patch('tracklit_integration.sync_user_profile')
    def test_batch_sync_with_exceptions(self, mock_sync):
        """Test batch sync handling exceptions"""
        mock_sync.side_effect = [
            {"id": "user_1"},
            Exception("API error"),
            {"id": "user_3"}
        ]
        
        user_ids = ["user_1", "user_2", "user_3"]
        results = batch_sync_users(user_ids)
        
        assert results["user_1"] is True
        assert results["user_2"] is False  # Exception handled
        assert results["user_3"] is True


class TestVerifyWebhookSignature:
    """Test verify_webhook_signature function"""
    
    @patch('tracklit_integration.TRACKLIT_WEBHOOK_SECRET', 'test_secret')
    def test_verify_valid_signature(self):
        """Test verifying a valid webhook signature"""
        import hmac
        import hashlib
        
        payload = b'{"event": "test"}'
        expected_sig = hmac.new(
            b'test_secret',
            payload,
            hashlib.sha256
        ).hexdigest()
        
        result = verify_webhook_signature(payload, expected_sig)
        
        assert result is True
    
    @patch('tracklit_integration.TRACKLIT_WEBHOOK_SECRET', 'test_secret')
    def test_verify_invalid_signature(self):
        """Test verifying an invalid webhook signature"""
        payload = b'{"event": "test"}'
        invalid_sig = "invalid_signature_123"
        
        result = verify_webhook_signature(payload, invalid_sig)
        
        assert result is False
    
    @patch('tracklit_integration.TRACKLIT_WEBHOOK_SECRET', '')
    def test_verify_signature_no_secret_configured(self):
        """Test verification when no secret is configured"""
        payload = b'{"event": "test"}'
        
        result = verify_webhook_signature(payload, "any_signature")
        
        # Should return True when secret not configured (skip verification)
        assert result is True


class TestSingletonInstance:
    """Test singleton tracklit instance"""
    
    def test_singleton_exists(self):
        """Test that singleton instance exists"""
        assert tracklit is not None
        assert isinstance(tracklit, TrackLitIntegration)
    
    def test_singleton_has_methods(self):
        """Test that singleton has required methods"""
        assert hasattr(tracklit, '_make_request')
        assert callable(tracklit._make_request)


class TestEdgeCases:
    """Test edge cases and error scenarios"""
    
    @patch('tracklit_integration.TrackLitIntegration')
    def test_sync_user_with_minimal_data(self, mock_client_class):
        """Test syncing user with minimal TrackLit data"""
        minimal_user = {
            "id": "user_123",
            "email": "minimal@example.com"
        }
        
        mock_client = Mock()
        mock_client._make_request.return_value = minimal_user
        mock_client_class.return_value = mock_client
        
        # Should handle gracefully with defaults
        result = sync_user_profile("user_123")
        
        # Result depends on database function behavior
    
    def test_webhook_handler_with_empty_payload(self):
        """Test webhook handler with empty payload"""
        result = webhook_handler("user.updated", {})
        
        assert result is False
    
    @patch('tracklit_integration.TrackLitIntegration')
    def test_api_timeout_handling(self, mock_client_class):
        """Test handling of API timeout"""
        mock_client = Mock()
        mock_client._make_request.side_effect = Exception("Timeout")
        mock_client_class.return_value = mock_client
        
        # Should not raise exception
        result = notify_query_usage("user_123", "/ask", 100)
        
        # Should handle gracefully


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
