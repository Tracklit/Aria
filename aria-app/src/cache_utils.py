"""
Redis caching utilities for Aria
Provides caching decorators and functions for performance optimization
"""
import redis
import json
import os
import logging
from functools import wraps
from typing import Optional, Any, Callable
from datetime import timedelta

logger = logging.getLogger(__name__)

# Initialize Redis connection
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

try:
    redis_client = redis.from_url(
        REDIS_URL,
        decode_responses=True,
        socket_connect_timeout=5,
        socket_timeout=5
    )
    redis_client.ping()
    logger.info("✅ Redis connection established")
except Exception as e:
    logger.warning(f"⚠️ Redis unavailable: {e}. Caching disabled.")
    redis_client = None

# =============================================================================
# CACHE KEY BUILDERS
# =============================================================================

def build_key(namespace: str, identifier: str, *args) -> str:
    """Build standardized cache key"""
    parts = [namespace, str(identifier)] + [str(arg) for arg in args]
    return ":".join(parts)

# =============================================================================
# CORE CACHING FUNCTIONS
# =============================================================================

def get_cached(key: str) -> Optional[Any]:
    """Get value from cache"""
    if not redis_client:
        return None
    
    try:
        value = redis_client.get(key)
        if value:
            return json.loads(value)
        return None
    except Exception as e:
        logger.error(f"Cache get error for {key}: {e}")
        return None

def set_cached(key: str, value: Any, ttl_seconds: int = 3600) -> bool:
    """Set value in cache with TTL"""
    if not redis_client:
        return False
    
    try:
        serialized = json.dumps(value, default=str)
        redis_client.setex(key, ttl_seconds, serialized)
        return True
    except Exception as e:
        logger.error(f"Cache set error for {key}: {e}")
        return False

def delete_cached(key: str) -> bool:
    """Delete value from cache"""
    if not redis_client:
        return False
    
    try:
        redis_client.delete(key)
        return True
    except Exception as e:
        logger.error(f"Cache delete error for {key}: {e}")
        return False

def delete_pattern(pattern: str) -> int:
    """Delete all keys matching pattern"""
    if not redis_client:
        return 0
    
    try:
        keys = redis_client.keys(pattern)
        if keys:
            return redis_client.delete(*keys)
        return 0
    except Exception as e:
        logger.error(f"Cache pattern delete error for {pattern}: {e}")
        return 0

# =============================================================================
# CACHING DECORATOR
# =============================================================================

def cached(namespace: str, ttl_seconds: int = 3600, key_builder: Optional[Callable] = None):
    """
    Decorator to cache function results
    
    Args:
        namespace: Cache namespace (e.g., "drills", "progress")
        ttl_seconds: Time to live in seconds
        key_builder: Optional function to build custom cache key from args
    
    Example:
        @cached("drills:recommended", ttl_seconds=3600)
        async def get_recommended_drills(user_id: int):
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Build cache key
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                # Default: use first arg as identifier
                identifier = args[0] if args else "default"
                cache_key = build_key(namespace, identifier)
            
            # Try to get from cache
            cached_value = get_cached(cache_key)
            if cached_value is not None:
                logger.debug(f"Cache HIT: {cache_key}")
                return cached_value
            
            # Cache miss - call function
            logger.debug(f"Cache MISS: {cache_key}")
            result = await func(*args, **kwargs)
            
            # Store in cache
            set_cached(cache_key, result, ttl_seconds)
            
            return result
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Build cache key
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                identifier = args[0] if args else "default"
                cache_key = build_key(namespace, identifier)
            
            # Try to get from cache
            cached_value = get_cached(cache_key)
            if cached_value is not None:
                logger.debug(f"Cache HIT: {cache_key}")
                return cached_value
            
            # Cache miss - call function
            logger.debug(f"Cache MISS: {cache_key}")
            result = func(*args, **kwargs)
            
            # Store in cache
            set_cached(cache_key, result, ttl_seconds)
            
            return result
        
        # Return appropriate wrapper based on function type
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator

# =============================================================================
# SPECIFIC CACHE INVALIDATION
# =============================================================================

def invalidate_user_cache(user_id: int):
    """Invalidate all cached data for a user"""
    patterns = [
        f"drills:recommended:{user_id}",
        f"progress:analytics:{user_id}*",
        f"achievements:{user_id}*",
        f"sessions:summary:{user_id}*",
        f"goals:{user_id}*",
        f"nutrition:daily:{user_id}*",
        f"mental:log:{user_id}*",
        f"calendar:{user_id}*",
    ]
    
    total_deleted = 0
    for pattern in patterns:
        deleted = delete_pattern(pattern)
        total_deleted += deleted
    
    logger.info(f"Invalidated {total_deleted} cache entries for user {user_id}")
    return total_deleted

def invalidate_drills_cache(user_id: Optional[int] = None):
    """Invalidate drill recommendation cache"""
    if user_id:
        pattern = f"drills:recommended:{user_id}"
    else:
        pattern = "drills:recommended:*"
    
    return delete_pattern(pattern)

def invalidate_progress_cache(user_id: int):
    """Invalidate progress analytics cache"""
    pattern = f"progress:analytics:{user_id}*"
    return delete_pattern(pattern)

def invalidate_achievements_cache(user_id: int):
    """Invalidate achievements cache"""
    pattern = f"achievements:{user_id}*"
    return delete_pattern(pattern)

def invalidate_mental_cache():
    """Invalidate mental exercises cache (global)"""
    pattern = "mental:exercises:*"
    return delete_pattern(pattern)

# =============================================================================
# CACHE WARMING (Optional - for frequently accessed data)
# =============================================================================

async def warm_cache_for_user(user_id: int):
    """Pre-populate cache with frequently accessed user data"""
    from ai_companion_logic import recommend_drills_for_user
    from database_extensions import get_progress_analytics, get_achievements
    
    try:
        # Warm drill recommendations
        drills = await recommend_drills_for_user(user_id)
        key = build_key("drills", "recommended", user_id)
        set_cached(key, drills, 3600)
        
        # Warm progress analytics
        progress = await get_progress_analytics(user_id, days=30)
        key = build_key("progress", "analytics", user_id, 30)
        set_cached(key, progress, 1800)
        
        # Warm achievements
        achievements = await get_achievements(user_id, days=90)
        key = build_key("achievements", user_id, 90)
        set_cached(key, achievements, 3600)
        
        logger.info(f"✅ Cache warmed for user {user_id}")
        return True
    except Exception as e:
        logger.error(f"Error warming cache for user {user_id}: {e}")
        return False

# =============================================================================
# CACHE STATISTICS
# =============================================================================

def get_cache_stats() -> dict:
    """Get Redis cache statistics"""
    if not redis_client:
        return {"status": "disabled"}
    
    try:
        info = redis_client.info()
        return {
            "status": "active",
            "used_memory": info.get("used_memory_human"),
            "connected_clients": info.get("connected_clients"),
            "total_keys": redis_client.dbsize(),
            "uptime_days": info.get("uptime_in_days"),
            "hit_rate": _calculate_hit_rate(info)
        }
    except Exception as e:
        logger.error(f"Error getting cache stats: {e}")
        return {"status": "error", "message": str(e)}

def _calculate_hit_rate(info: dict) -> str:
    """Calculate cache hit rate percentage"""
    hits = info.get("keyspace_hits", 0)
    misses = info.get("keyspace_misses", 0)
    total = hits + misses
    
    if total == 0:
        return "N/A"
    
    rate = (hits / total) * 100
    return f"{rate:.2f}%"

# =============================================================================
# HEALTH CHECK
# =============================================================================

def is_cache_healthy() -> bool:
    """Check if Redis is healthy"""
    if not redis_client:
        return False
    
    try:
        redis_client.ping()
        return True
    except Exception:
        return False
