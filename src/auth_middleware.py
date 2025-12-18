# auth_middleware.py
"""
Authentication middleware for Aria API
Compatible with TrackLit's authentication system
"""

from fastapi import Request, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from typing import Optional, Dict, Any
import os
import logging
from datetime import datetime, timedelta
from src.cache import cache

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)

# JWT Configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Internal API Key for service-to-service authentication
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY")

class AuthMiddleware:
    """
    Authentication middleware for Aria API
    Supports:
    1. JWT tokens from TrackLit platform
    2. API keys for service-to-service calls
    3. Session-based authentication (compatible with Passport.js)
    """
    
    def __init__(self):
        self.secret_key = JWT_SECRET_KEY
        self.algorithm = JWT_ALGORITHM
        self.internal_api_key = INTERNAL_API_KEY
        
        if not self.secret_key:
            logger.warning("JWT_SECRET_KEY not set! Authentication will fail.")
    
    def create_jwt_token(self, user_data: Dict[str, Any], expires_hours: int = JWT_EXPIRATION_HOURS) -> str:
        """
        Create a JWT token for a user
        
        Args:
            user_data: User information (user_id, email, role, etc.)
            expires_hours: Token expiration in hours
            
        Returns:
            JWT token string
        """
        try:
            expiration = datetime.utcnow() + timedelta(hours=expires_hours)
            
            payload = {
                "user_id": user_data.get("user_id") or user_data.get("id"),
                "email": user_data.get("email"),
                "role": user_data.get("role", "athlete"),
                "exp": expiration,
                "iat": datetime.utcnow(),
                "iss": "Aria-api"
            }
            
            token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
            return token
            
        except Exception as e:
            logger.error(f"Error creating JWT token: {e}")
            raise HTTPException(status_code=500, detail="Failed to create authentication token")
    
    def verify_jwt_token(self, token: str) -> Dict[str, Any]:
        """
        Verify and decode a JWT token
        
        Args:
            token: JWT token string
            
        Returns:
            Decoded token payload
            
        Raises:
            HTTPException: If token is invalid or expired
        """
        try:
            # Check cache first for blacklisted tokens
            cache_key = f"blacklist:token:{token[:20]}"
            if cache.get(cache_key):
                raise HTTPException(status_code=401, detail="Token has been revoked")
            
            payload = jwt.decode(
                token, 
                self.secret_key, 
                algorithms=[self.algorithm],
                options={"verify_exp": True}
            )
            
            # Validate required fields
            if not payload.get("user_id"):
                raise HTTPException(status_code=401, detail="Invalid token: missing user_id")
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token: {e}")
            raise HTTPException(status_code=401, detail="Invalid authentication token")
        except Exception as e:
            logger.error(f"Error verifying token: {e}")
            raise HTTPException(status_code=401, detail="Authentication failed")
    
    def verify_api_key(self, api_key: str) -> bool:
        """
        Verify an API key for service-to-service authentication
        
        Args:
            api_key: API key string
            
        Returns:
            True if valid, False otherwise
        """
        if not self.internal_api_key:
            logger.error("INTERNAL_API_KEY not configured")
            return False
        
        return api_key == self.internal_api_key
    
    async def authenticate_request(self, request: Request) -> Dict[str, Any]:
        """
        Authenticate a request using multiple methods
        
        Priority:
        1. API Key (X-API-Key header)
        2. JWT Bearer token (Authorization header)
        3. Session cookie (for TrackLit platform integration)
        
        Args:
            request: FastAPI request object
            
        Returns:
            User information dict
            
        Raises:
            HTTPException: If authentication fails
        """
        # Method 1: Check for API key (highest priority)
        api_key = request.headers.get("X-API-Key")
        if api_key:
            if self.verify_api_key(api_key):
                return {
                    "authenticated": True,
                    "auth_method": "api_key",
                    "service": "internal",
                    "user_id": "system",
                    "role": "system"
                }
            else:
                raise HTTPException(status_code=401, detail="Invalid API key")
        
        # Method 2: Check for JWT token
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                payload = self.verify_jwt_token(token)
                return {
                    "authenticated": True,
                    "auth_method": "jwt",
                    "user_id": payload.get("user_id"),
                    "email": payload.get("email"),
                    "role": payload.get("role", "athlete")
                }
            except HTTPException:
                raise
        
        # Method 3: Check for session cookie (TrackLit integration)
        # This would require coordination with TrackLit's session store
        session_id = request.cookies.get("connect.sid")
        if session_id:
            # Validate session with TrackLit or shared session store
            # For now, we'll skip this as it requires TrackLit's session secret
            logger.debug("Session-based auth not yet implemented")
        
        # No valid authentication found
        raise HTTPException(
            status_code=401, 
            detail="Authentication required. Provide JWT token or API key."
        )
    
    def revoke_token(self, token: str, ttl_seconds: int = 86400):
        """
        Revoke a JWT token by adding it to blacklist
        
        Args:
            token: JWT token to revoke
            ttl_seconds: How long to keep in blacklist (default 24 hours)
        """
        cache_key = f"blacklist:token:{token[:20]}"
        cache.set(cache_key, True, ttl=ttl_seconds)
        logger.info(f"Token revoked: {cache_key}")
    
    def require_role(self, required_roles: list):
        """
        Decorator to require specific user roles
        
        Args:
            required_roles: List of allowed roles (e.g., ['admin', 'coach'])
        """
        async def role_checker(auth_data: Dict = Depends(self.authenticate_request)):
            user_role = auth_data.get("role", "athlete")
            
            if user_role not in required_roles and user_role != "system":
                raise HTTPException(
                    status_code=403,
                    detail=f"Insufficient permissions. Required roles: {', '.join(required_roles)}"
                )
            
            return auth_data
        
        return role_checker

# Initialize global auth middleware
auth_middleware = AuthMiddleware()

# FastAPI Dependencies for route protection
async def require_auth(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Dict[str, Any]:
    """
    FastAPI dependency to require authentication on protected endpoints
    
    Usage:
        @app.get("/protected")
        async def protected_endpoint(auth: dict = Depends(require_auth)):
            user_id = auth["user_id"]
            ...
    """
    return await auth_middleware.authenticate_request(request)

async def optional_auth(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[Dict[str, Any]]:
    """
    FastAPI dependency for optional authentication
    Returns None if not authenticated, user data if authenticated
    
    Usage:
        @app.get("/public-or-private")
        async def endpoint(auth: Optional[dict] = Depends(optional_auth)):
            if auth:
                # Authenticated user
                user_id = auth["user_id"]
            else:
                # Anonymous user
    """
    try:
        return await auth_middleware.authenticate_request(request)
    except HTTPException:
        return None

def require_roles(*roles: str):
    """
    Dependency factory to require specific roles
    
    Usage:
        @app.post("/admin/action")
        async def admin_action(auth: dict = Depends(require_roles("admin", "coach"))):
            ...
    """
    async def role_checker(auth_data: Dict = Depends(require_auth)):
        user_role = auth_data.get("role", "athlete")
        
        if user_role not in roles and user_role != "system":
            raise HTTPException(
                status_code=403,
                detail=f"Insufficient permissions. Required roles: {', '.join(roles)}"
            )
        
        return auth_data
    
    return role_checker

# Utility function to extract user_id from request (for rate limiting)
async def get_user_id_from_request(request: Request) -> Optional[str]:
    """
    Extract user_id from authenticated request or request body
    Used by rate limiting system
    """
    try:
        auth_data = await auth_middleware.authenticate_request(request)
        return auth_data.get("user_id")
    except:
        # Try to get from request body
        if hasattr(request, '_json_body'):
            body = request._json_body
            if isinstance(body, dict):
                return body.get("user_id")
        return None
