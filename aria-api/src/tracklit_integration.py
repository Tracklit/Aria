"""
TrackLit Integration Module
Handles integration between Aria and TrackLit platform
Provides functions for user synchronization, session validation, and webhook processing
"""
import os
import requests
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from dotenv import load_dotenv
from src.database import (
    get_athlete_profile, create_athlete_profile, update_athlete_profile,
    get_user_subscription, update_user_subscription
)
from src.cache import cache

load_dotenv()

# TrackLit API configuration
TRACKLIT_API_URL = os.getenv("TRACKLIT_API_URL", "https://api.tracklit.io")
TRACKLIT_API_KEY = os.getenv("TRACKLIT_API_KEY", "")
TRACKLIT_WEBHOOK_SECRET = os.getenv("TRACKLIT_WEBHOOK_SECRET", "")

logger = logging.getLogger(__name__)


class TrackLitIntegration:
    """
    TrackLit integration client for Aria
    Handles all interactions with TrackLit platform
    """
    
    def __init__(self, api_url: str = TRACKLIT_API_URL, api_key: str = TRACKLIT_API_KEY):
        self.api_url = api_url.rstrip('/')
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Optional[Dict]:
        """
        Make HTTP request to TrackLit API
        
        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            endpoint: API endpoint path
            data: Request body data
            params: Query parameters
            
        Returns:
            Response data as dict or None on error
        """
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        
        try:
            response = requests.request(
                method=method,
                url=url,
                headers=self.headers,
                json=data,
                params=params,
                timeout=10
            )
            
            response.raise_for_status()
            
            if response.status_code == 204:
                return {}
            
            return response.json()
            
        except requests.exceptions.HTTPError as e:
            logger.error(f"TrackLit API HTTP error: {e}")
            logger.error(f"Response: {e.response.text if e.response else 'No response'}")
            return None
        except requests.exceptions.RequestException as e:
            logger.error(f"TrackLit API request error: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error calling TrackLit API: {e}")
            return None


def sync_user_profile(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Synchronize user profile from TrackLit to Aria database
    
    Fetches the latest user data from TrackLit API and updates the local
    Aria database to keep profiles in sync.
    
    Args:
        user_id: User ID to synchronize
        
    Returns:
        Updated user profile dict or None on error
        
    Example:
        >>> profile = sync_user_profile("user_123")
        >>> print(profile["name"])
        "John Doe"
    """
    client = TrackLitIntegration()
    
    # Fetch user data from TrackLit
    logger.info(f"Syncing user profile from TrackLit: {user_id}")
    tracklit_user = client._make_request("GET", f"/api/users/{user_id}")
    
    if not tracklit_user:
        logger.error(f"Failed to fetch user from TrackLit: {user_id}")
        return None
    
    try:
        # Check if user exists in Aria
        existing_profile = get_athlete_profile(user_id)
        
        # Map TrackLit fields to Aria fields
        profile_data = {
            "id": tracklit_user.get("id", user_id),
            "email": tracklit_user.get("email"),
            "name": tracklit_user.get("name") or tracklit_user.get("full_name"),
            "age": tracklit_user.get("age"),
            "sport": tracklit_user.get("primary_sport", "running"),
            "experience_level": tracklit_user.get("experience_level", "beginner"),
            "goals": tracklit_user.get("goals", []),
            "mood": tracklit_user.get("current_mood", "neutral"),
            "streak_count": tracklit_user.get("streak_days", 0),
            "badges": tracklit_user.get("badges", [])
        }
        
        if existing_profile:
            # Update existing profile
            updated = update_athlete_profile(user_id, profile_data)
            logger.info(f"Updated user profile from TrackLit: {user_id}")
        else:
            # Create new profile
            updated = create_athlete_profile(profile_data)
            logger.info(f"Created new user profile from TrackLit: {user_id}")
        
        # Sync subscription if available
        if tracklit_user.get("subscription"):
            subscription_data = tracklit_user["subscription"]
            update_user_subscription(
                user_id=user_id,
                tier=subscription_data.get("tier", "free"),
                status=subscription_data.get("status", "active"),
                stripe_subscription_id=subscription_data.get("stripe_subscription_id"),
                stripe_customer_id=subscription_data.get("stripe_customer_id")
            )
            logger.info(f"Synced subscription from TrackLit: {user_id}")
        
        # Clear cache for this user
        cache.delete(f"athlete_profile:{user_id}")
        cache.delete(f"subscription:{user_id}")
        
        return updated
        
    except Exception as e:
        logger.error(f"Error syncing user profile: {e}")
        return None


def validate_session(session_token: str) -> Optional[Dict[str, Any]]:
    """
    Validate TrackLit Passport.js session token
    
    Verifies that a session token from TrackLit's authentication system
    is valid and returns the associated user data.
    
    Args:
        session_token: Passport.js session token from TrackLit
        
    Returns:
        User data dict if valid, None if invalid
        
    Example:
        >>> user = validate_session("sess_abc123")
        >>> if user:
        ...     print(f"Valid session for {user['email']}")
    """
    client = TrackLitIntegration()
    
    # Check cache first
    cache_key = f"tracklit_session:{session_token}"
    cached_user = cache.get(cache_key)
    
    if cached_user:
        logger.debug(f"Session validation from cache: {session_token[:10]}...")
        return cached_user
    
    logger.info(f"Validating TrackLit session: {session_token[:10]}...")
    
    # Validate with TrackLit API
    result = client._make_request(
        "POST",
        "/api/auth/validate-session",
        data={"session_token": session_token}
    )
    
    if not result or not result.get("valid"):
        logger.warning(f"Invalid TrackLit session: {session_token[:10]}...")
        return None
    
    user_data = result.get("user")
    
    if user_data:
        # Cache valid session for 5 minutes
        cache.set(cache_key, user_data, ttl=300)
        logger.info(f"Valid session for user: {user_data.get('id')}")
    
    return user_data


def notify_query_usage(
    user_id: str,
    query_type: str,
    tokens_consumed: int = 0,
    metadata: Optional[Dict] = None
) -> bool:
    """
    Notify TrackLit about Aria query usage via webhook
    
    Sends usage data to TrackLit so they can track Aria integration
    usage across their platform.
    
    Args:
        user_id: User who made the query
        query_type: Type of query (e.g., "/ask", "/training_plan")
        tokens_consumed: Number of AI tokens used
        metadata: Additional usage metadata
        
    Returns:
        True if notification sent successfully, False otherwise
        
    Example:
        >>> success = notify_query_usage(
        ...     user_id="user_123",
        ...     query_type="/training_plan",
        ...     tokens_consumed=500,
        ...     metadata={"plan_duration": "12_weeks"}
        ... )
    """
    client = TrackLitIntegration()
    
    payload = {
        "user_id": user_id,
        "query_type": query_type,
        "tokens_consumed": tokens_consumed,
        "timestamp": datetime.utcnow().isoformat(),
        "service": "Aria",
        "metadata": metadata or {}
    }
    
    logger.info(f"Notifying TrackLit of query usage: {user_id} - {query_type}")
    
    result = client._make_request(
        "POST",
        "/api/webhooks/usage",
        data=payload
    )
    
    if result is not None:
        logger.info(f"Successfully notified TrackLit of usage: {user_id}")
        return True
    else:
        logger.error(f"Failed to notify TrackLit of usage: {user_id}")
        return False


def get_tracklit_user(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Get user details from TrackLit API
    
    Fetches complete user profile from TrackLit including training data,
    subscription status, and recent activity.
    
    Args:
        user_id: TrackLit user ID
        
    Returns:
        User data dict or None on error
        
    Example:
        >>> user = get_tracklit_user("user_123")
        >>> print(user["primary_sport"])
        "cycling"
    """
    client = TrackLitIntegration()
    
    # Check cache first
    cache_key = f"tracklit_user:{user_id}"
    cached_user = cache.get(cache_key)
    
    if cached_user:
        logger.debug(f"TrackLit user from cache: {user_id}")
        return cached_user
    
    logger.info(f"Fetching TrackLit user: {user_id}")
    
    user_data = client._make_request("GET", f"/api/users/{user_id}")
    
    if user_data:
        # Cache for 10 minutes
        cache.set(cache_key, user_data, ttl=600)
        logger.info(f"Fetched TrackLit user: {user_id}")
    else:
        logger.error(f"Failed to fetch TrackLit user: {user_id}")
    
    return user_data


def webhook_handler(event_type: str, payload: Dict[str, Any]) -> bool:
    """
    Process incoming webhooks from TrackLit
    
    Handles various webhook events from TrackLit platform such as:
    - user.updated: User profile changed
    - subscription.upgraded: User upgraded subscription
    - subscription.cancelled: User cancelled subscription
    - user.deleted: User account deleted
    
    Args:
        event_type: Type of webhook event
        payload: Event payload data
        
    Returns:
        True if processed successfully, False otherwise
        
    Example:
        >>> webhook_handler(
        ...     event_type="user.updated",
        ...     payload={"user_id": "user_123", "changes": {...}}
        ... )
        True
    """
    logger.info(f"Processing TrackLit webhook: {event_type}")
    
    try:
        user_id = payload.get("user_id")
        
        if not user_id:
            logger.error(f"Webhook missing user_id: {event_type}")
            return False
        
        if event_type == "user.updated":
            # Sync updated user profile
            result = sync_user_profile(user_id)
            return result is not None
        
        elif event_type == "subscription.upgraded":
            # Update subscription in Aria
            subscription_data = payload.get("subscription", {})
            update_user_subscription(
                user_id=user_id,
                tier=subscription_data.get("tier", "pro"),
                status="active",
                stripe_subscription_id=subscription_data.get("stripe_subscription_id"),
                stripe_customer_id=subscription_data.get("stripe_customer_id")
            )
            cache.delete(f"subscription:{user_id}")
            logger.info(f"Updated subscription from webhook: {user_id}")
            return True
        
        elif event_type == "subscription.cancelled":
            # Cancel subscription in Aria
            update_user_subscription(
                user_id=user_id,
                tier="free",
                status="cancelled"
            )
            cache.delete(f"subscription:{user_id}")
            logger.info(f"Cancelled subscription from webhook: {user_id}")
            return True
        
        elif event_type == "user.deleted":
            # Delete user from Aria (cascade will handle related data)
            from src.database import delete_athlete_profile
            deleted = delete_athlete_profile(user_id)
            cache.delete(f"athlete_profile:{user_id}")
            cache.delete(f"subscription:{user_id}")
            logger.info(f"Deleted user from webhook: {user_id}")
            return deleted
        
        elif event_type == "training.completed":
            # Update user's streak and badges
            training_data = payload.get("training", {})
            update_athlete_profile(user_id, {
                "streak_count": training_data.get("new_streak", 0),
                "badges": training_data.get("badges", [])
            })
            cache.delete(f"athlete_profile:{user_id}")
            logger.info(f"Updated training data from webhook: {user_id}")
            return True
        
        else:
            logger.warning(f"Unknown webhook event type: {event_type}")
            return False
            
    except Exception as e:
        logger.error(f"Error processing webhook {event_type}: {e}")
        return False


def batch_sync_users(user_ids: List[str]) -> Dict[str, bool]:
    """
    Synchronize multiple users from TrackLit in batch
    
    Efficiently syncs multiple user profiles from TrackLit to Aria.
    Useful for periodic synchronization or onboarding.
    
    Args:
        user_ids: List of user IDs to sync
        
    Returns:
        Dict mapping user_id to sync success status
        
    Example:
        >>> results = batch_sync_users(["user_1", "user_2", "user_3"])
        >>> print(f"Synced {sum(results.values())} of {len(results)} users")
    """
    logger.info(f"Starting batch sync of {len(user_ids)} users from TrackLit")
    
    results = {}
    
    for user_id in user_ids:
        try:
            profile = sync_user_profile(user_id)
            results[user_id] = profile is not None
        except Exception as e:
            logger.error(f"Error syncing user {user_id}: {e}")
            results[user_id] = False
    
    successful = sum(results.values())
    logger.info(f"Batch sync complete: {successful}/{len(user_ids)} successful")
    
    return results


def verify_webhook_signature(payload: bytes, signature: str) -> bool:
    """
    Verify webhook signature from TrackLit
    
    Validates that a webhook request actually came from TrackLit by
    verifying the HMAC signature.
    
    Args:
        payload: Raw webhook payload bytes
        signature: Signature from X-TrackLit-Signature header
        
    Returns:
        True if signature is valid, False otherwise
    """
    import hmac
    import hashlib
    
    if not TRACKLIT_WEBHOOK_SECRET:
        logger.warning("TRACKLIT_WEBHOOK_SECRET not configured, skipping verification")
        return True
    
    expected_signature = hmac.new(
        TRACKLIT_WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    is_valid = hmac.compare_digest(expected_signature, signature)
    
    if not is_valid:
        logger.warning("Invalid webhook signature from TrackLit")
    
    return is_valid


# Singleton instance
tracklit = TrackLitIntegration()


if __name__ == "__main__":
    # Quick test of TrackLit integration
    print("=" * 60)
    print("TrackLit Integration Module")
    print("=" * 60)
    
    if not TRACKLIT_API_KEY:
        print("⚠️  TRACKLIT_API_KEY not configured in .env")
    else:
        print(f"✓ API URL: {TRACKLIT_API_URL}")
        print(f"✓ API Key: {TRACKLIT_API_KEY[:10]}...")
    
    print("\nAvailable functions:")
    print("  - sync_user_profile(user_id)")
    print("  - validate_session(session_token)")
    print("  - notify_query_usage(user_id, query_type, tokens)")
    print("  - get_tracklit_user(user_id)")
    print("  - webhook_handler(event_type, payload)")
    print("  - batch_sync_users(user_ids)")
    print("  - verify_webhook_signature(payload, signature)")
    print("=" * 60)
