# cache.py
import redis
import json
import os
from typing import Any, Optional
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AriaCache:
    """Cache system for Aria using Azure Redis Cache (compatible with TrackLit)"""
    
    def __init__(self):
        try:
            # Support multiple Redis configuration methods
            # Method 1: Full Redis URL (Azure format: rediss://...)
            redis_url = os.getenv("REDIS_URL") or os.getenv("REDIS_CONNECTION_STRING")
            
            if redis_url:
                logger.info(f"Using Redis URL configuration")
                try:
                    self.redis = redis.from_url(
                        redis_url,
                        decode_responses=True,
                        socket_connect_timeout=10,
                        socket_timeout=10,
                        socket_keepalive=True,
                        health_check_interval=30
                    )
                    # Test connection
                    self.redis.ping()
                    logger.info("Redis connection successful via URL")
                    return
                except Exception as e:
                    logger.warning(f"Redis URL connection failed: {e}, trying host/port method")
            
            # Method 2: Individual parameters (legacy format)
            host = os.getenv("REDIS_HOST")
            port = os.getenv("REDIS_PORT")
            password = os.getenv("REDIS_PASSWORD")
            db = os.getenv("REDIS_DB", "0")
            
            # Validate required environment variables
            if not host:
                logger.error("REDIS_HOST or REDIS_URL not found in environment variables")
                self.redis = None
                return
                
            if not port:
                logger.error("REDIS_PORT not found in environment variables")
                self.redis = None
                return
                
            if not password:
                logger.warning("REDIS_PASSWORD not found (may be required for Azure Redis)")
                # Don't return, try without password for local dev
            
            # Convert to proper types with validation
            try:
                port = int(port)
                db = int(db)
            except ValueError as e:
                logger.error(f"Invalid port or db value: {e}")
                self.redis = None
                return
            
            logger.info(f"Attempting Redis connection to {host}:{port}")
            
            # Azure Redis Cache typically requires SSL on port 6380
            # Try multiple connection approaches
            connection_configs = [
                # First try: Azure Redis Cache standard (SSL on port 6380)
                {
                    "host": host,
                    "port": 6380 if port == 6379 else port,  # Azure uses 6380 for SSL
                    "password": password,
                    "db": db,
                    "decode_responses": True,
                    "socket_connect_timeout": 10,
                    "socket_timeout": 10,
                    "socket_keepalive": True,
                    "health_check_interval": 30,
                    "ssl": True,
                    "ssl_cert_reqs": None,
                    "ssl_check_hostname": False
                },
                # Second try: Exact port with SSL
                {
                    "host": host,
                    "port": port,
                    "password": password,
                    "db": db,
                    "decode_responses": True,
                    "socket_connect_timeout": 10,
                    "socket_timeout": 10,
                    "ssl": True,
                    "ssl_cert_reqs": None,
                    "ssl_check_hostname": False
                },
                # Third try: No SSL (for local dev or non-SSL Redis)
                {
                    "host": host,
                    "port": port,
                    "password": password,
                    "db": db,
                    "decode_responses": True,
                    "socket_connect_timeout": 10,
                    "socket_timeout": 10
                }
            ]
            
            # Try each configuration until one works
            for i, config in enumerate(connection_configs, 1):
                try:
                    logger.info(f"Trying connection method {i}/{len(connection_configs)}...")
                    self.redis = redis.Redis(**config)
                    
                    # Test connection
                    result = self.redis.ping()
                    logger.info(f"Redis connection successful with method {i}: {result}")
                    logger.info(f"Connected to {host}:{config['port']}, SSL: {config.get('ssl', False)}")
                    return  # Success, exit the method
                    
                except redis.ConnectionError as e:
                    logger.warning(f"Connection method {i} failed: {e}")
                    continue
                except redis.AuthenticationError as e:
                    logger.error(f"Authentication failed with method {i}: {e}")
                    continue
                except Exception as e:
                    logger.warning(f"Method {i} failed with error: {e}")
                    continue
            
            # If all methods failed
            logger.error("All connection methods failed")
            self.redis = None
            
        except Exception as e:
            logger.error(f"Redis connection failed with unexpected error: {e}")
            self.redis = None
    
    def is_connected(self) -> bool:
        """Check if Redis is connected and responsive"""
        try:
            if self.redis is None:
                return False
            
            # Test with a simple ping
            result = self.redis.ping()
            return result is True
            
        except redis.ConnectionError:
            logger.warning("Redis connection lost")
            return False
        except redis.AuthenticationError:
            logger.error("Redis authentication failed during ping")
            return False
        except Exception as e:
            logger.error(f"Redis ping failed: {e}")
            return False
    
    def get(self, key: str) -> Optional[Any]:
        """Get data from cache"""
        if not self.is_connected():
            logger.warning("Redis not connected, skipping cache get")
            return None
            
        try:
            data = self.redis.get(key)
            if data:
                logger.info(f"Cache HIT for key: {key[:50]}...")
                return json.loads(data)
            else:
                logger.info(f"Cache MISS for key: {key[:50]}...")
                return None
                
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error for key {key}: {e}")
            return None
        except redis.RedisError as e:
            logger.error(f"Redis error during get for key {key}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error during cache get for key {key}: {e}")
            return None
    
    def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """Set data in cache with TTL (Time To Live in seconds)"""
        if not self.is_connected():
            logger.warning("Redis not connected, skipping cache set")
            return False
            
        try:
            # Serialize data to JSON
            serialized_data = json.dumps(value, default=str)
            
            # Set with expiration
            result = self.redis.setex(key, ttl, serialized_data)
            
            if result:
                logger.info(f"Cache SET for key: {key[:50]}... (TTL: {ttl}s)")
                return True
            else:
                logger.warning(f"Cache SET failed for key: {key[:50]}...")
                return False
                
        except (TypeError, ValueError) as e:
            logger.error(f"Serialization error for key {key}: {e}")
            return False
        except redis.RedisError as e:
            logger.error(f"Redis error during set for key {key}: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error during cache set for key {key}: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete data from cache"""
        if not self.is_connected():
            logger.warning("Redis not connected, skipping cache delete")
            return False
            
        try:
            result = self.redis.delete(key)
            if result:
                logger.info(f"Cache DELETE successful for key: {key[:50]}...")
                return True
            else:
                logger.info(f"Cache DELETE: key not found: {key[:50]}...")
                return False
                
        except redis.RedisError as e:
            logger.error(f"Redis error during delete for key {key}: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error during cache delete for key {key}: {e}")
            return False
    
    def clear_pattern(self, pattern: str) -> int:
        """Clear all keys matching a pattern (use carefully!)"""
        if not self.is_connected():
            logger.warning("Redis not connected, skipping pattern clear")
            return 0
            
        try:
            # Find keys matching pattern
            keys = list(self.redis.scan_iter(match=pattern))
            
            if keys:
                # Delete all matching keys
                count = self.redis.delete(*keys)
                logger.info(f"Cleared {count} cache keys matching pattern: {pattern}")
                return count
            else:
                logger.info(f"No keys found matching pattern: {pattern}")
                return 0
                
        except redis.RedisError as e:
            logger.error(f"Redis error during pattern clear: {e}")
            return 0
        except Exception as e:
            logger.error(f"Unexpected error during pattern clear: {e}")
            return 0
    
    def get_stats(self) -> dict:
        """Get cache statistics and connection info"""
        if not self.is_connected():
            return {
                "connected": False,
                "error": "Redis connection not available"
            }
            
        try:
            # Get Redis server info
            info = self.redis.info()
            
            # Get database-specific info
            db_info = info.get("keyspace", {})
            current_db = f"db{self.redis.connection_pool.connection_kwargs.get('db', 0)}"
            db_stats = db_info.get(current_db, {})
            
            return {
                "connected": True,
                "redis_version": info.get("redis_version", "unknown"),
                "memory_used": info.get("used_memory_human", "unknown"),
                "total_commands": info.get("total_commands_processed", 0),
                "connected_clients": info.get("connected_clients", 0),
                "uptime_seconds": info.get("uptime_in_seconds", 0),
                "database_keys": db_stats.get("keys", 0),
                "database_expires": db_stats.get("expires", 0),
                "ssl_enabled": hasattr(self.redis.connection_pool.connection_kwargs, 'ssl') and self.redis.connection_pool.connection_kwargs.get('ssl', False),
                "host": self.redis.connection_pool.connection_kwargs.get("host", "unknown"),
                "port": self.redis.connection_pool.connection_kwargs.get("port", "unknown")
            }
            
        except redis.RedisError as e:
            logger.error(f"Redis error getting stats: {e}")
            return {
                "connected": False,
                "error": f"Redis error: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Unexpected error getting cache stats: {e}")
            return {
                "connected": False,
                "error": f"Unexpected error: {str(e)}"
            }
    
    def health_check(self) -> dict:
        """Comprehensive health check for the cache system"""
        try:
            # Test connection
            is_connected = self.is_connected()
            
            if not is_connected:
                return {
                    "status": "unhealthy",
                    "connected": False,
                    "tests": {
                        "ping": False,
                        "set": False,
                        "get": False,
                        "delete": False
                    }
                }
            
            # Test basic operations
            test_key = "health_check_test"
            test_value = {"test": True, "timestamp": "now"}
            
            # Test SET operation
            set_success = self.set(test_key, test_value, ttl=10)
            
            # Test GET operation
            get_result = self.get(test_key)
            get_success = get_result is not None and get_result.get("test") is True
            
            # Test DELETE operation
            delete_success = self.delete(test_key)
            
            # Overall health status
            all_tests_passed = set_success and get_success and delete_success
            
            return {
                "status": "healthy" if all_tests_passed else "degraded",
                "connected": True,
                "tests": {
                    "ping": True,
                    "set": set_success,
                    "get": get_success,
                    "delete": delete_success
                },
                "overall": all_tests_passed
            }
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {
                "status": "unhealthy",
                "connected": False,
                "error": str(e),
                "tests": {
                    "ping": False,
                    "set": False,
                    "get": False,
                    "delete": False
                }
            }

# Initialize global cache instance
cache = AriaCache()

# Log initialization status
if cache.is_connected():
    logger.info("Aria Cache system initialized successfully")
else:
    logger.warning("Aria Cache system initialized but not connected to Redis")