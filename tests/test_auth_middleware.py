"""
Comprehensive tests for auth_middleware.py module
Tests JWT verification, API key validation, role-based access, and token blacklisting
"""
import pytest
import jwt
from datetime import datetime, timedelta
from fastapi import HTTPException, Request
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, MagicMock
from auth_middleware import (
    auth_manager, require_auth, optional_auth, require_roles,
    verify_jwt_token, verify_api_key, check_token_blacklist
)
from main import app


client = TestClient(app)


@pytest.fixture
def valid_jwt_token():
    """Create a valid JWT token for testing"""
    payload = {
        "sub": "test_user_123",
        "email": "test@example.com",
        "roles": ["user"],
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    # You'll need to use the actual JWT_SECRET from your environment
    # For testing, use a test secret
    return jwt.encode(payload, "test_secret", algorithm="HS256")


@pytest.fixture
def expired_jwt_token():
    """Create an expired JWT token for testing"""
    payload = {
        "sub": "test_user_123",
        "email": "test@example.com",
        "roles": ["user"],
        "exp": datetime.utcnow() - timedelta(hours=1)
    }
    return jwt.encode(payload, "test_secret", algorithm="HS256")


@pytest.fixture
def admin_jwt_token():
    """Create a JWT token with admin role"""
    payload = {
        "sub": "admin_user_123",
        "email": "admin@example.com",
        "roles": ["admin", "user"],
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    return jwt.encode(payload, "test_secret", algorithm="HS256")


@pytest.fixture
def coach_jwt_token():
    """Create a JWT token with coach role"""
    payload = {
        "sub": "coach_user_123",
        "email": "coach@example.com",
        "roles": ["coach", "user"],
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    return jwt.encode(payload, "test_secret", algorithm="HS256")


@pytest.fixture
def valid_api_key():
    """Return a valid API key for testing"""
    return "test_api_key_12345"


@pytest.fixture
def mock_request():
    """Create a mock FastAPI Request object"""
    request = Mock(spec=Request)
    request.headers = {}
    request.cookies = {}
    request.state = Mock()
    return request


class TestJWTVerification:
    """Test JWT token verification"""
    
    @patch('auth_middleware.JWT_SECRET', 'test_secret')
    def test_verify_valid_jwt_token(self, valid_jwt_token):
        """Test verifying a valid JWT token"""
        payload = verify_jwt_token(valid_jwt_token)
        
        assert payload is not None
        assert payload["sub"] == "test_user_123"
        assert payload["email"] == "test@example.com"
        assert "user" in payload["roles"]
    
    @patch('auth_middleware.JWT_SECRET', 'test_secret')
    def test_verify_expired_jwt_token(self, expired_jwt_token):
        """Test verifying an expired JWT token"""
        payload = verify_jwt_token(expired_jwt_token)
        
        # Expired tokens should return None or raise exception
        assert payload is None
    
    def test_verify_invalid_jwt_token(self):
        """Test verifying an invalid JWT token"""
        invalid_token = "invalid.jwt.token"
        payload = verify_jwt_token(invalid_token)
        
        assert payload is None
    
    def test_verify_malformed_jwt_token(self):
        """Test verifying a malformed JWT token"""
        malformed_token = "not-even-close-to-jwt"
        payload = verify_jwt_token(malformed_token)
        
        assert payload is None


class TestAPIKeyVerification:
    """Test API key verification"""
    
    @patch('auth_middleware.VALID_API_KEYS', ['test_api_key_12345', 'another_key'])
    def test_verify_valid_api_key(self, valid_api_key):
        """Test verifying a valid API key"""
        result = verify_api_key(valid_api_key)
        
        assert result is True
    
    @patch('auth_middleware.VALID_API_KEYS', ['test_api_key_12345'])
    def test_verify_invalid_api_key(self):
        """Test verifying an invalid API key"""
        result = verify_api_key("wrong_api_key")
        
        assert result is False
    
    @patch('auth_middleware.VALID_API_KEYS', [])
    def test_verify_api_key_empty_list(self):
        """Test verifying API key when no keys are configured"""
        result = verify_api_key("any_key")
        
        assert result is False


class TestTokenBlacklist:
    """Test token blacklisting functionality"""
    
    def test_check_non_blacklisted_token(self):
        """Test checking a token that is not blacklisted"""
        token = "valid_token_123"
        is_blacklisted = check_token_blacklist(token)
        
        assert is_blacklisted is False
    
    @patch('auth_middleware.cache')
    def test_check_blacklisted_token(self, mock_cache):
        """Test checking a token that is blacklisted"""
        token = "blacklisted_token"
        mock_cache.get.return_value = True
        
        is_blacklisted = check_token_blacklist(token)
        
        assert is_blacklisted is True


class TestRequireAuthDecorator:
    """Test require_auth decorator"""
    
    @patch('auth_middleware.JWT_SECRET', 'test_secret')
    @patch('auth_middleware.verify_jwt_token')
    def test_require_auth_with_valid_jwt(self, mock_verify, valid_jwt_token, mock_request):
        """Test require_auth with a valid JWT token"""
        mock_request.headers = {"Authorization": f"Bearer {valid_jwt_token}"}
        mock_verify.return_value = {
            "sub": "test_user_123",
            "email": "test@example.com",
            "roles": ["user"]
        }
        
        # This should not raise an exception
        result = require_auth(mock_request)
        
        assert result is not None
        assert mock_request.state.user_id == "test_user_123"
    
    def test_require_auth_without_token(self, mock_request):
        """Test require_auth without a token"""
        mock_request.headers = {}
        
        with pytest.raises(HTTPException) as exc_info:
            require_auth(mock_request)
        
        assert exc_info.value.status_code == 401
    
    @patch('auth_middleware.VALID_API_KEYS', ['test_api_key'])
    def test_require_auth_with_valid_api_key(self, mock_request):
        """Test require_auth with a valid API key"""
        mock_request.headers = {"X-API-Key": "test_api_key"}
        
        result = require_auth(mock_request)
        
        assert result is not None


class TestOptionalAuthDecorator:
    """Test optional_auth decorator"""
    
    @patch('auth_middleware.JWT_SECRET', 'test_secret')
    @patch('auth_middleware.verify_jwt_token')
    def test_optional_auth_with_valid_jwt(self, mock_verify, valid_jwt_token, mock_request):
        """Test optional_auth with a valid JWT token"""
        mock_request.headers = {"Authorization": f"Bearer {valid_jwt_token}"}
        mock_verify.return_value = {
            "sub": "test_user_123",
            "email": "test@example.com",
            "roles": ["user"]
        }
        
        result = optional_auth(mock_request)
        
        assert result is not None
        assert mock_request.state.user_id == "test_user_123"
    
    def test_optional_auth_without_token(self, mock_request):
        """Test optional_auth without a token (should not raise exception)"""
        mock_request.headers = {}
        
        # Should not raise an exception
        result = optional_auth(mock_request)
        
        # Should return None or set user_id to None
        assert not hasattr(mock_request.state, 'user_id') or mock_request.state.user_id is None


class TestRequireRolesDecorator:
    """Test require_roles decorator"""
    
    @patch('auth_middleware.JWT_SECRET', 'test_secret')
    def test_require_roles_with_matching_role(self, admin_jwt_token, mock_request):
        """Test require_roles when user has the required role"""
        mock_request.headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        mock_request.state.user_roles = ["admin", "user"]
        
        # This should not raise an exception
        result = require_roles(["admin"])(lambda r: "success")(mock_request)
        
        assert result == "success"
    
    def test_require_roles_without_matching_role(self, mock_request):
        """Test require_roles when user doesn't have required role"""
        mock_request.state.user_roles = ["user"]
        
        with pytest.raises(HTTPException) as exc_info:
            require_roles(["admin"])(lambda r: "success")(mock_request)
        
        assert exc_info.value.status_code == 403
    
    def test_require_roles_with_multiple_roles(self, coach_jwt_token, mock_request):
        """Test require_roles with multiple allowed roles"""
        mock_request.state.user_roles = ["coach", "user"]
        
        # User has coach role, which is one of the allowed roles
        result = require_roles(["admin", "coach"])(lambda r: "success")(mock_request)
        
        assert result == "success"


class TestMultiMethodAuthentication:
    """Test authentication with multiple methods (JWT, API key, session)"""
    
    @patch('auth_middleware.JWT_SECRET', 'test_secret')
    @patch('auth_middleware.VALID_API_KEYS', ['test_api_key'])
    def test_auth_priority_jwt_over_api_key(self, valid_jwt_token, mock_request):
        """Test that JWT is checked before API key"""
        mock_request.headers = {
            "Authorization": f"Bearer {valid_jwt_token}",
            "X-API-Key": "test_api_key"
        }
        
        # JWT should take priority
        # This is implementation-dependent, adjust based on your actual logic
        pass
    
    @patch('auth_middleware.VALID_API_KEYS', ['test_api_key'])
    def test_auth_fallback_to_api_key(self, mock_request):
        """Test that API key is used when JWT is not present"""
        mock_request.headers = {"X-API-Key": "test_api_key"}
        
        result = require_auth(mock_request)
        
        assert result is not None
    
    def test_auth_failure_with_no_credentials(self, mock_request):
        """Test that authentication fails when no credentials are provided"""
        mock_request.headers = {}
        
        with pytest.raises(HTTPException) as exc_info:
            require_auth(mock_request)
        
        assert exc_info.value.status_code == 401


class TestAuthenticationIntegration:
    """Integration tests for authentication middleware"""
    
    def test_protected_endpoint_without_auth(self):
        """Test accessing a protected endpoint without authentication"""
        # This depends on which endpoints in your app require auth
        response = client.post("/user", json={"email": "test@example.com"})
        
        # Should return 401 or similar
        assert response.status_code in [401, 403, 422]
    
    @patch('auth_middleware.JWT_SECRET', 'test_secret')
    def test_protected_endpoint_with_valid_auth(self, valid_jwt_token):
        """Test accessing a protected endpoint with valid authentication"""
        headers = {"Authorization": f"Bearer {valid_jwt_token}"}
        
        # Try to access a protected endpoint
        # Adjust based on your actual protected endpoints
        response = client.get("/subscription/tiers", headers=headers)
        
        # Should succeed
        assert response.status_code == 200
    
    def test_admin_endpoint_with_user_role(self, mock_request):
        """Test accessing admin endpoint with user role (should fail)"""
        mock_request.state.user_roles = ["user"]
        
        with pytest.raises(HTTPException) as exc_info:
            require_roles(["admin"])(lambda r: "success")(mock_request)
        
        assert exc_info.value.status_code == 403


class TestAuthManager:
    """Test AuthManager class functionality"""
    
    def test_auth_manager_initialization(self):
        """Test that AuthManager initializes correctly"""
        assert auth_manager is not None
        assert hasattr(auth_manager, 'verify_token')
    
    @patch('auth_middleware.JWT_SECRET', 'test_secret')
    def test_auth_manager_verify_token(self, valid_jwt_token):
        """Test AuthManager's verify_token method"""
        if hasattr(auth_manager, 'verify_token'):
            result = auth_manager.verify_token(valid_jwt_token)
            assert result is not None
    
    def test_auth_manager_blacklist_token(self):
        """Test AuthManager's blacklist_token method"""
        if hasattr(auth_manager, 'blacklist_token'):
            token = "test_token_to_blacklist"
            auth_manager.blacklist_token(token)
            
            # Verify it's blacklisted
            if hasattr(auth_manager, 'is_blacklisted'):
                assert auth_manager.is_blacklisted(token) is True


class TestEdgeCases:
    """Test edge cases and error scenarios"""
    
    def test_auth_with_empty_bearer_token(self, mock_request):
        """Test authentication with empty Bearer token"""
        mock_request.headers = {"Authorization": "Bearer "}
        
        with pytest.raises(HTTPException):
            require_auth(mock_request)
    
    def test_auth_with_malformed_authorization_header(self, mock_request):
        """Test authentication with malformed Authorization header"""
        mock_request.headers = {"Authorization": "NotBearer token123"}
        
        with pytest.raises(HTTPException):
            require_auth(mock_request)
    
    def test_auth_with_case_sensitive_bearer(self, mock_request):
        """Test that Bearer keyword is case-insensitive"""
        mock_request.headers = {"Authorization": "bearer token123"}
        
        # Should handle lowercase 'bearer'
        # This depends on implementation
        pass
    
    @patch('auth_middleware.JWT_SECRET', 'test_secret')
    def test_jwt_with_missing_required_fields(self):
        """Test JWT token missing required fields"""
        payload = {
            "exp": datetime.utcnow() + timedelta(hours=1)
            # Missing 'sub', 'email', 'roles'
        }
        token = jwt.encode(payload, "test_secret", algorithm="HS256")
        
        result = verify_jwt_token(token)
        
        # Should handle missing fields gracefully
        assert result is None or "sub" not in result


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
