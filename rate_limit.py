# rate_limit.py
import time
import json
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException
from cache import cache
import logging
from datetime import datetime, timedelta
from database import get_user_subscription, get_monthly_usage, track_query_usage as db_track_query_usage

logger = logging.getLogger(__name__)

class RateLimiter:
    """Enhanced rate limiting system with subscription tier management for Aria API"""
    
    def __init__(self):
        self.cache = cache
    
    def _get_client_id(self, request: Request) -> str:
        """Get client identifier from request"""
        # Try to get user_id from request body (for authenticated requests)
        if hasattr(request, '_json_body'):
            body = request._json_body
            if isinstance(body, dict) and 'user_id' in body:
                return f"user:{body['user_id']}"
        
        # Try to get user_id from form data (for file uploads)
        if hasattr(request, '_form_data'):
            form_data = request._form_data
            if isinstance(form_data, dict) and 'user_id' in form_data:
                return f"user:{form_data['user_id']}"
        
        # Try to get user_id from path parameters
        if hasattr(request, 'path_params'):
            if 'user_id' in request.path_params:
                return f"user:{request.path_params['user_id']}"
        
        # Try to extract from URL path
        path_segments = request.url.path.split('/')
        for i, segment in enumerate(path_segments):
            if segment in ['user', 'subscription', 'usage', 'wearables'] and i + 1 < len(path_segments):
                # Check if next segment looks like a user ID (UUID pattern or similar)
                potential_user_id = path_segments[i + 1]
                if len(potential_user_id) > 10:  # Simple check for user ID length
                    return f"user:{potential_user_id}"
        
        # Fall back to IP address
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown"
        
        return f"ip:{client_ip}"
    
    def _get_rate_limit_key(self, client_id: str, endpoint: str, window: str) -> str:
        """Generate Redis key for rate limiting"""
        return f"rate_limit:{client_id}:{endpoint}:{window}"
    
    def _get_monthly_usage_key(self, user_id: str) -> str:
        """Generate Redis key for monthly usage tracking"""
        current_month = datetime.now().strftime("%Y-%m")
        return f"monthly_usage:{user_id}:{current_month}"
    
    def _get_current_window(self, window_size: int) -> int:
        """Get current time window"""
        return int(time.time()) // window_size
    
    def get_user_subscription(self, user_id: str) -> Dict[str, Any]:
        """Get user subscription information from database with caching"""
        cache_key = f"subscription:{user_id}"
        cached_subscription = self.cache.get(cache_key)
        
        if cached_subscription:
            return cached_subscription
        
        try:
            # Fetch from PostgreSQL using database.py
            subscription = get_user_subscription(user_id)
            
            if subscription:
                # Cache for 5 minutes
                self.cache.set(cache_key, subscription, ttl=300)
                return subscription
            
            # Default to free tier if no subscription found
            default_subscription = {
                "user_id": user_id,
                "tier": "free",
                "monthly_query_count": 0,
                "subscription_status": "active"
            }
            self.cache.set(cache_key, default_subscription, ttl=300)
            return default_subscription
            
        except Exception as e:
            logger.error(f"Error fetching subscription for user {user_id}: {e}")
            # Return default free tier on error
            return {
                "user_id": user_id,
                "tier": "free",
                "monthly_query_count": 0,
                "subscription_status": "active"
            }
    
    def get_monthly_usage(self, user_id: str) -> int:
        """Get current month's query usage for user from database"""
        usage_key = self._get_monthly_usage_key(user_id)
        
        # Try cache first
        cached_usage = self.cache.get(usage_key)
        if cached_usage is not None:
            return cached_usage
        
        # Fetch from database using database.py
        db_usage = get_monthly_usage(user_id)
        
        # Cache for 1 minute
        self.cache.set(usage_key, db_usage, ttl=60)
        
        return db_usage
    
    def increment_monthly_usage(self, user_id: str) -> int:
        """Increment monthly usage counter in database and cache"""
        # Track in database
        db_track_query_usage(user_id)
        
        # Update cache
        usage_key = self._get_monthly_usage_key(user_id)
        new_usage = self.get_monthly_usage(user_id)  # This will fetch fresh from DB
        
        return new_usage
    
    def check_subscription_limit(self, user_id: str, endpoint: str) -> Dict[str, Any]:
        """Check if user is within their subscription tier limits"""
        subscription = self.get_user_subscription(user_id)
        tier = subscription.get("tier", "free")
        monthly_usage = self.get_monthly_usage(user_id)
        
        # Get limits for this tier and endpoint
        tier_limits = SUBSCRIPTION_LIMITS.get(tier, SUBSCRIPTION_LIMITS["free"])
        endpoint_limits = tier_limits.get(endpoint, tier_limits.get("default", {}))
        
        monthly_limit = endpoint_limits.get("monthly_queries", 1)
        
        # Check monthly limit (unlimited = -1)
        if monthly_limit != -1 and monthly_usage >= monthly_limit:
            return {
                "allowed": False,
                "reason": "monthly_limit_exceeded",
                "monthly_usage": monthly_usage,
                "monthly_limit": monthly_limit,
                "tier": tier,
                "upgrade_required": True
            }
        
        return {
            "allowed": True,
            "monthly_usage": monthly_usage,
            "monthly_limit": monthly_limit,
            "tier": tier,
            "queries_remaining": monthly_limit - monthly_usage if monthly_limit != -1 else -1
        }
    
    def check_rate_limit(
        self, 
        request: Request, 
        endpoint: str, 
        max_requests: int = None, 
        window_seconds: int = 60
    ) -> Dict[str, Any]:
        """
        Enhanced rate limiting with subscription tier support
        
        Args:
            request: FastAPI request object
            endpoint: Endpoint identifier
            max_requests: Override for max requests (uses tier limits if None)
            window_seconds: Time window in seconds
        
        Returns:
            Dictionary with rate limit status
        """
        if not self.cache.is_connected():
            logger.warning("Redis not connected, skipping rate limiting")
            return {
                "allowed": True,
                "requests_made": 0,
                "requests_remaining": max_requests or 100,
                "reset_time": int(time.time()) + window_seconds,
                "retry_after": None
            }
        
        try:
            client_id = self._get_client_id(request)
            current_window = self._get_current_window(window_seconds)
            
            # For authenticated users, check subscription limits first
            if client_id.startswith("user:"):
                user_id = client_id.split(":", 1)[1]
                
                # Check subscription-based monthly limits
                subscription_check = self.check_subscription_limit(user_id, endpoint)
                if not subscription_check["allowed"]:
                    return subscription_check
                
                # Get tier-specific rate limits
                tier = subscription_check["tier"]
                tier_limits = SUBSCRIPTION_LIMITS.get(tier, SUBSCRIPTION_LIMITS["free"])
                endpoint_config = tier_limits.get(endpoint, tier_limits.get("default", {}))
                effective_limit = endpoint_config.get("rate_per_minute", 1)
                
            else:
                # For unauthenticated requests, use default limits
                effective_limit = max_requests or RATE_LIMITS.get(endpoint, {}).get("max_requests", 10)
            
            # Redis key for this client/endpoint/window
            rate_key = self._get_rate_limit_key(client_id, endpoint, str(current_window))
            
            # Get current count
            current_count = self.cache.get(rate_key)
            if current_count is None:
                current_count = 0
            
            # Check if rate limit exceeded
            if current_count >= effective_limit:
                reset_time = (current_window + 1) * window_seconds
                retry_after = reset_time - int(time.time())
                
                return {
                    "allowed": False,
                    "reason": "rate_limit_exceeded",
                    "requests_made": current_count,
                    "requests_remaining": 0,
                    "reset_time": reset_time,
                    "retry_after": max(retry_after, 1)
                }
            
            # Increment counter
            new_count = current_count + 1
            self.cache.set(rate_key, new_count, ttl=window_seconds * 2)
            
            # For authenticated users with AI endpoints, increment monthly usage
            if client_id.startswith("user:") and endpoint in ["ask", "ask_media", "generate_plan", "training_readiness"]:
                user_id = client_id.split(":", 1)[1]
                self.increment_monthly_usage(user_id)
            
            reset_time = (current_window + 1) * window_seconds
            
            result = {
                "allowed": True,
                "requests_made": new_count,
                "requests_remaining": effective_limit - new_count,
                "reset_time": reset_time,
                "retry_after": None
            }
            
            # Add subscription info for authenticated users
            if client_id.startswith("user:"):
                result.update(subscription_check)
            
            return result
            
        except Exception as e:
            logger.error(f"Rate limiting error: {e}")
            return {
                "allowed": True,
                "requests_made": 0,
                "requests_remaining": max_requests or 100,
                "reset_time": int(time.time()) + window_seconds,
                "retry_after": None,
                "error": str(e)
            }
    
    def get_rate_limit_info(self, client_id: str, endpoint: str, window_seconds: int = 60) -> Dict[str, Any]:
        """Get current rate limit status for a client/endpoint"""
        if not self.cache.is_connected():
            return {"error": "Rate limiting not available"}
        
        try:
            current_window = self._get_current_window(window_seconds)
            rate_key = self._get_rate_limit_key(client_id, endpoint, str(current_window))
            
            current_count = self.cache.get(rate_key)
            if current_count is None:
                current_count = 0
            
            reset_time = (current_window + 1) * window_seconds
            
            result = {
                "requests_made": current_count,
                "reset_time": reset_time,
                "window_seconds": window_seconds,
                "current_window": current_window
            }
            
            # Add subscription info for authenticated users
            if client_id.startswith("user:"):
                user_id = client_id.split(":", 1)[1]
                subscription_info = self.check_subscription_limit(user_id, endpoint)
                result.update(subscription_info)
            
            return result
            
        except Exception as e:
            return {"error": str(e)}
    
    def reset_user_limits(self, user_id: str, endpoint: str = None) -> int:
        """Reset rate limits for a specific user"""
        if not self.cache.is_connected():
            return 0
        
        try:
            if endpoint:
                # Reset specific endpoint for user
                pattern = f"rate_limit:user:{user_id}:{endpoint}:*"
            else:
                # Reset all endpoints for user
                pattern = f"rate_limit:user:{user_id}:*"
            
            return self.cache.clear_pattern(pattern)
            
        except Exception as e:
            logger.error(f"Error resetting rate limits for user {user_id}: {e}")
            return 0
    
    def get_user_rate_limit_summary(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive rate limit summary for a user"""
        try:
            subscription = self.get_user_subscription(user_id)
            monthly_usage = self.get_monthly_usage(user_id)
            tier = subscription.get("tier", "free")
            tier_limits = SUBSCRIPTION_LIMITS.get(tier, SUBSCRIPTION_LIMITS["free"])
            
            summary = {
                "user_id": user_id,
                "subscription_tier": tier,
                "monthly_usage": monthly_usage,
                "limits": {},
                "status": "active" if subscription.get("subscription_status") == "active" else "inactive"
            }
            
            # Add limits for each endpoint
            for endpoint, config in tier_limits.items():
                if endpoint != "default":
                    monthly_limit = config.get("monthly_queries", -1)
                    remaining = monthly_limit - monthly_usage if monthly_limit != -1 else -1
                    
                    summary["limits"][endpoint] = {
                        "monthly_limit": monthly_limit,
                        "monthly_remaining": remaining,
                        "rate_per_minute": config.get("rate_per_minute", 1),
                        "unlimited": monthly_limit == -1
                    }
            
            return summary
            
        except Exception as e:
            logger.error(f"Error getting rate limit summary for user {user_id}: {e}")
            return {"error": str(e)}

# Initialize global rate limiter
rate_limiter = RateLimiter()

# Enhanced subscription tier limits configuration
SUBSCRIPTION_LIMITS = {
    "free": {
        "ask": {
            "monthly_queries": 1,
            "rate_per_minute": 1,
            "rate_per_hour": 1,
            "rate_per_day": 1
        },
        "ask_media": {
            "monthly_queries": 0,  # No video analysis for free tier
            "rate_per_minute": 0
        },
        "generate_plan": {
            "monthly_queries": 0,  # No plan generation for free tier
            "rate_per_minute": 0
        },
        "training_readiness": {
            "monthly_queries": 0,  # No wearable AI analysis for free tier
            "rate_per_minute": 0
        },
        "default": {
            "monthly_queries": -1,  # Unlimited for non-AI endpoints
            "rate_per_minute": 10,
            "rate_per_hour": 50
        }
    },
    "pro": {
        "ask": {
            "monthly_queries": 15,
            "rate_per_minute": 5,
            "rate_per_hour": 20,
            "rate_per_day": 15
        },
        "ask_media": {
            "monthly_queries": 2,  # 2 video analyses per month
            "rate_per_minute": 1,
            "rate_per_hour": 2
        },
        "generate_plan": {
            "monthly_queries": 3,  # 3 plan generations per month
            "rate_per_minute": 1
        },
        "training_readiness": {
            "monthly_queries": 5,  # 5 wearable AI analyses per month
            "rate_per_minute": 2
        },
        "default": {
            "monthly_queries": -1,  # Unlimited for non-AI endpoints
            "rate_per_minute": 20,
            "rate_per_hour": 100
        }
    },
    "star": {
        "ask": {
            "monthly_queries": -1,  # Unlimited
            "rate_per_minute": 30,
            "rate_per_hour": 100,
            "rate_per_day": -1
        },
        "ask_media": {
            "monthly_queries": -1,  # Unlimited
            "rate_per_minute": 10,
            "rate_per_hour": 30
        },
        "generate_plan": {
            "monthly_queries": -1,  # Unlimited
            "rate_per_minute": 5
        },
        "training_readiness": {
            "monthly_queries": -1,  # Unlimited
            "rate_per_minute": 10
        },
        "default": {
            "monthly_queries": -1,  # Unlimited
            "rate_per_minute": 50,
            "rate_per_hour": 200
        }
    }
}

# Legacy rate limiting configurations (for backward compatibility and unauthenticated requests)
RATE_LIMITS = {
    "ask": {"max_requests": 5, "window_seconds": 60},        # Conservative for unauthenticated
    "ask_media": {"max_requests": 2, "window_seconds": 60},  # Very limited for unauthenticated
    "generate_plan": {"max_requests": 1, "window_seconds": 300}, # Very limited plan generation
    "training_readiness": {"max_requests": 2, "window_seconds": 60}, # Limited wearable analysis
    "general": {"max_requests": 20, "window_seconds": 60},   # General endpoints
    "create_user": {"max_requests": 5, "window_seconds": 300}, # 5 user creations per 5 minutes
    "mood_report": {"max_requests": 10, "window_seconds": 60}, # Mood reports
}

def apply_rate_limit(endpoint: str):
    """Decorator to apply enhanced rate limiting with subscription support to endpoints"""
    def decorator(func):
        async def wrapper(request: Request, *args, **kwargs):
            # Check rate limit with subscription support
            rate_status = rate_limiter.check_rate_limit(request, endpoint)
            
            # If not allowed, raise appropriate HTTP exception
            if not rate_status["allowed"]:
                reason = rate_status.get("reason", "rate_limit_exceeded")
                
                if reason == "monthly_limit_exceeded":
                    # Subscription limit exceeded
                    headers = {
                        "X-Subscription-Tier": rate_status.get("tier", "free"),
                        "X-Monthly-Usage": str(rate_status.get("monthly_usage", 0)),
                        "X-Monthly-Limit": str(rate_status.get("monthly_limit", 1)),
                        "X-Upgrade-Required": "true"
                    }
                    
                    raise HTTPException(
                        status_code=402,  # Payment Required
                        detail={
                            "error": "Monthly query limit exceeded",
                            "message": f"You've used {rate_status['monthly_usage']} of {rate_status['monthly_limit']} monthly queries. Upgrade to continue.",
                            "tier": rate_status["tier"],
                            "upgrade_required": True,
                            "upgrade_url": "/subscription/upgrade"
                        },
                        headers=headers
                    )
                
                else:
                    # Rate limit exceeded
                    headers = {
                        "X-RateLimit-Limit": str(rate_status.get("requests_remaining", 0) + rate_status.get("requests_made", 0)),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(rate_status.get("reset_time", int(time.time()) + 60)),
                        "Retry-After": str(rate_status.get("retry_after", 60))
                    }
                    
                    raise HTTPException(
                        status_code=429,
                        detail={
                            "error": "Rate limit exceeded",
                            "message": f"Too many requests to {endpoint}. Try again in {rate_status.get('retry_after', 60)} seconds.",
                            "retry_after": rate_status.get("retry_after", 60),
                            "reset_time": rate_status.get("reset_time")
                        },
                        headers=headers
                    )
            
            # Execute the endpoint function
            response = await func(request, *args, **kwargs)
            
            # Add rate limit headers to successful responses
            if hasattr(response, 'headers'):
                response.headers["X-RateLimit-Requests-Made"] = str(rate_status.get("requests_made", 0))
                response.headers["X-RateLimit-Requests-Remaining"] = str(rate_status.get("requests_remaining", 0))
                response.headers["X-RateLimit-Reset"] = str(rate_status.get("reset_time", int(time.time()) + 60))
                
                # Add subscription info for authenticated users
                if "tier" in rate_status:
                    response.headers["X-Subscription-Tier"] = rate_status["tier"]
                    if "queries_remaining" in rate_status and rate_status["queries_remaining"] != -1:
                        response.headers["X-Monthly-Queries-Remaining"] = str(rate_status["queries_remaining"])
            
            return response
        
        return wrapper
    return decorator