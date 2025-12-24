# database.py
"""
Database connection pool and utilities for Aria API
Connects to TrackLit's Azure PostgreSQL Flexible Server
"""

import os
import logging
from typing import Optional, Dict, Any, List
from contextlib import contextmanager
import psycopg2
from psycopg2 import pool, extras
from psycopg2.extensions import connection as Connection
import json
from keyvault_helper import get_env_with_keyvault_resolution

logger = logging.getLogger(__name__)

# Database configuration from environment
# Note: DATABASE_URL with Key Vault references is resolved at runtime in _get_connection_params
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "tracklit")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_SSL_MODE = os.getenv("DB_SSL_MODE", "require")

# Pool configuration
DB_MIN_CONNECTIONS = int(os.getenv("DB_MIN_CONNECTIONS", "2"))
DB_MAX_CONNECTIONS = int(os.getenv("DB_MAX_CONNECTIONS", "20"))

class DatabasePool:
    """
    PostgreSQL connection pool for TrackLit database
    Provides thread-safe connection management
    """
    
    def __init__(self):
        self.connection_pool = None
        self._initialize_pool()
    
    def _get_connection_params(self) -> Dict[str, Any]:
        """Build connection parameters from environment"""
        # Resolve Key Vault references at runtime, not at module load
        database_url = get_env_with_keyvault_resolution("DATABASE_URL")
        if database_url:
            # Parse DATABASE_URL if provided
            return {"dsn": database_url}
        elif all([DB_HOST, DB_USER, DB_PASSWORD]):
            # Build from individual parameters
            return {
                "host": DB_HOST,
                "port": int(DB_PORT),
                "database": DB_NAME,
                "user": DB_USER,
                "password": DB_PASSWORD,
                "sslmode": DB_SSL_MODE,
                "connect_timeout": 10
            }
        else:
            raise ValueError(
                "Database configuration incomplete. Provide either DATABASE_URL "
                "or DB_HOST, DB_USER, DB_PASSWORD"
            )
    
    def _initialize_pool(self):
        """Initialize the connection pool"""
        try:
            conn_params = self._get_connection_params()
            
            self.connection_pool = pool.ThreadedConnectionPool(
                minconn=DB_MIN_CONNECTIONS,
                maxconn=DB_MAX_CONNECTIONS,
                **conn_params
            )
            
            logger.info(
                "Database connection pool initialized",
                extra={
                    "min_connections": DB_MIN_CONNECTIONS,
                    "max_connections": DB_MAX_CONNECTIONS,
                    "database": DB_NAME
                }
            )
            
            # Test connection
            self._test_connection()
            
        except Exception as e:
            logger.error(f"Failed to initialize database pool: {e}")
            self.connection_pool = None
            raise
    
    def _test_connection(self):
        """Test database connectivity"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.close()
            self.return_connection(conn)
            logger.info("Database connection test successful")
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
            raise
    
    def get_connection(self) -> Connection:
        """
        Get a connection from the pool
        
        Returns:
            PostgreSQL connection object
        """
        if not self.connection_pool:
            raise Exception("Database connection pool not initialized")
        
        try:
            return self.connection_pool.getconn()
        except Exception as e:
            logger.error(f"Failed to get database connection: {e}")
            raise
    
    def return_connection(self, connection: Connection):
        """
        Return a connection to the pool
        
        Args:
            connection: Connection object to return
        """
        if not self.connection_pool:
            logger.warning("Cannot return connection: pool not initialized")
            return
        
        try:
            self.connection_pool.putconn(connection)
        except Exception as e:
            logger.error(f"Failed to return database connection: {e}")
    
    def close_all_connections(self):
        """Close all connections in the pool"""
        if self.connection_pool:
            self.connection_pool.closeall()
            logger.info("All database connections closed")
    
    @contextmanager
    def get_cursor(self, commit: bool = False):
        """
        Context manager for database operations
        
        Usage:
            with db_pool.get_cursor(commit=True) as cursor:
                cursor.execute("INSERT INTO ...")
        
        Args:
            commit: Whether to commit the transaction automatically
        """
        conn = self.get_connection()
        cursor = conn.cursor(cursor_factory=extras.RealDictCursor)
        
        try:
            yield cursor
            if commit:
                conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Database operation failed: {e}")
            raise
        finally:
            cursor.close()
            self.return_connection(conn)
    
    def execute_query(self, query: str, params: tuple = None) -> List[Dict]:
        """
        Execute a SELECT query and return results as list of dicts
        
        Args:
            query: SQL query string
            params: Query parameters (optional)
            
        Returns:
            List of dictionaries (rows)
        """
        with self.get_cursor() as cursor:
            cursor.execute(query, params)
            results = cursor.fetchall()
            return [dict(row) for row in results]
    
    def execute_one(self, query: str, params: tuple = None) -> Optional[Dict]:
        """
        Execute a SELECT query and return first result
        
        Args:
            query: SQL query string
            params: Query parameters (optional)
            
        Returns:
            Dictionary (single row) or None
        """
        with self.get_cursor() as cursor:
            cursor.execute(query, params)
            result = cursor.fetchone()
            return dict(result) if result else None
    
    def execute_write(self, query: str, params: tuple = None) -> int:
        """
        Execute an INSERT/UPDATE/DELETE query
        
        Args:
            query: SQL query string
            params: Query parameters (optional)
            
        Returns:
            Number of affected rows
        """
        with self.get_cursor(commit=True) as cursor:
            cursor.execute(query, params)
            return cursor.rowcount
    
    def execute_insert_returning(self, query: str, params: tuple = None) -> Optional[Dict]:
        """
        Execute INSERT query with RETURNING clause
        
        Args:
            query: SQL query string with RETURNING
            params: Query parameters (optional)
            
        Returns:
            Dictionary with returned columns
        """
        with self.get_cursor(commit=True) as cursor:
            cursor.execute(query, params)
            result = cursor.fetchone()
            return dict(result) if result else None
    
    def health_check(self) -> Dict[str, Any]:
        """
        Check database health
        
        Returns:
            Dictionary with health status
        """
        try:
            with self.get_cursor() as cursor:
                # Check connection
                cursor.execute("SELECT 1 as ok")
                result = cursor.fetchone()
                
                # Get database info
                cursor.execute("""
                    SELECT 
                        version() as version,
                        current_database() as database,
                        current_user as user
                """)
                db_info = cursor.fetchone()
                
                # Get connection pool stats
                pool_info = {
                    "available": len(self.connection_pool._pool) if self.connection_pool else 0,
                    "min_connections": DB_MIN_CONNECTIONS,
                    "max_connections": DB_MAX_CONNECTIONS
                }
                
                return {
                    "status": "healthy",
                    "connected": True,
                    "database": dict(db_info) if db_info else {},
                    "pool": pool_info
                }
        
        except Exception as e:
            return {
                "status": "unhealthy",
                "connected": False,
                "error": str(e)
            }

# Initialize global database pool
db_pool = DatabasePool()

# Legacy function for backwards compatibility
def get_db_connection():
    """
    Get a database connection from the pool.
    IMPORTANT: Caller must return the connection using db_pool.return_connection(conn)
    or use the context manager db_pool.get_cursor() instead.
    """
    return db_pool.get_connection()

# Database utility functions for Aria specific operations

def get_athlete_profile(user_id: str) -> Optional[Dict]:
    """
    Get athlete profile from TrackLit database
    
    Args:
        user_id: User ID
        
    Returns:
        Athlete profile dictionary or None
    """
    query = """
        SELECT 
            u.id,
            u.email,
            u.role,
            u.first_name,
            u.last_name,
            ap.date_of_birth,
            ap.gender,
            ap.height_cm,
            ap.weight_kg,
            ap.primary_events,
            ap.preferences
        FROM users u
        LEFT JOIN athlete_profiles ap ON u.id = ap.user_id
        WHERE u.id = %s AND u.is_active = true
    """
    return db_pool.execute_one(query, (user_id,))

def get_user_subscription(user_id: str) -> Dict:
    """
    Get user subscription information
    
    Args:
        user_id: User ID
        
    Returns:
        Subscription dictionary
    """
    query = """
        SELECT 
            user_id,
            tier,
            subscription_status,
            billing_cycle_start,
            next_billing_date,
            stripe_subscription_id,
            stripe_customer_id
        FROM user_subscriptions
        WHERE user_id = %s
    """
    result = db_pool.execute_one(query, (user_id,))
    
    if not result:
        # Return default free tier
        return {
            "user_id": user_id,
            "tier": "free",
            "subscription_status": "active",
            "billing_cycle_start": None,
            "next_billing_date": None
        }
    
    return result

def update_user_subscription(user_id: str, tier: str, **kwargs) -> bool:
    """
    Update user subscription
    
    Args:
        user_id: User ID
        tier: Subscription tier (free, pro, star)
        **kwargs: Additional fields to update
        
    Returns:
        True if successful
    """
    # Check if subscription exists
    existing = db_pool.execute_one(
        "SELECT user_id FROM user_subscriptions WHERE user_id = %s",
        (user_id,)
    )
    
    if existing:
        # Update existing
        set_clause = "tier = %s, updated_at = NOW()"
        params = [tier]
        
        for key, value in kwargs.items():
            set_clause += f", {key} = %s"
            params.append(value)
        
        params.append(user_id)
        query = f"UPDATE user_subscriptions SET {set_clause} WHERE user_id = %s"
        
        db_pool.execute_write(query, tuple(params))
    else:
        # Insert new
        fields = ["user_id", "tier", "created_at", "updated_at"]
        values = [user_id, tier, "NOW()", "NOW()"]
        placeholders = ["%s", "%s", "NOW()", "NOW()"]
        
        for key, value in kwargs.items():
            fields.append(key)
            values.append(value)
            placeholders.append("%s")
        
        query = f"""
            INSERT INTO user_subscriptions ({', '.join(fields)})
            VALUES ({', '.join(placeholders)})
        """
        
        db_pool.execute_write(query, tuple([v for v in values if v != "NOW()"]))
    
    return True

def track_query_usage(user_id: str, endpoint: str, tokens_consumed: int = 0):
    """
    Track API query usage
    
    Args:
        user_id: User ID
        endpoint: API endpoint
        tokens_consumed: Number of tokens used
    """
    subscription = get_user_subscription(user_id)
    tier = subscription.get("tier", "free")
    
    query = """
        INSERT INTO query_usage (
            user_id, 
            endpoint, 
            query_timestamp, 
            tokens_consumed,
            subscription_tier,
            request_cost
        ) VALUES (%s, %s, NOW(), %s, %s, %s)
    """
    
    cost = tokens_consumed * 0.00001  # Rough estimate
    
    db_pool.execute_write(
        query,
        (user_id, endpoint, tokens_consumed, tier, cost)
    )

def get_monthly_usage(user_id: str) -> int:
    """
    Get user's monthly query usage
    
    Args:
        user_id: User ID
        
    Returns:
        Number of queries this month
    """
    query = """
        SELECT COUNT(*) as count
        FROM query_usage
        WHERE user_id = %s
        AND query_timestamp >= date_trunc('month', CURRENT_DATE)
        AND endpoint IN ('ask', 'ask_media', 'generate_plan', 'training_readiness')
    """
    
    result = db_pool.execute_one(query, (user_id,))
    return result.get("count", 0) if result else 0

# Database migration utilities

def create_Aria_tables():
    """
    Create Aria-specific tables if they don't exist
    (Supplements TrackLit's existing schema)
    """
    queries = [
        # User subscriptions table
        """
        CREATE TABLE IF NOT EXISTS user_subscriptions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            tier VARCHAR(20) NOT NULL DEFAULT 'free',
            subscription_status VARCHAR(20) DEFAULT 'active',
            billing_cycle_start DATE,
            next_billing_date DATE,
            stripe_subscription_id VARCHAR(255),
            stripe_customer_id VARCHAR(255),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id)
        )
        """,
        
        # Query usage tracking
        """
        CREATE TABLE IF NOT EXISTS query_usage (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            endpoint VARCHAR(100) NOT NULL,
            query_timestamp TIMESTAMP DEFAULT NOW(),
            tokens_consumed INTEGER DEFAULT 0,
            subscription_tier VARCHAR(20),
            request_cost DECIMAL(10, 6) DEFAULT 0.0
        )
        """,
        
        # Index for query usage
        """
        CREATE INDEX IF NOT EXISTS idx_query_usage_user_date 
        ON query_usage(user_id, query_timestamp DESC)
        """,
        
        # API keys table
        """
        CREATE TABLE IF NOT EXISTS api_keys (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            key_hash VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(200),
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            last_used TIMESTAMP,
            is_active BOOLEAN DEFAULT true
        )
        """,
        
        # Index for API keys
        """
        CREATE INDEX IF NOT EXISTS idx_api_keys_hash 
        ON api_keys(key_hash) WHERE is_active = true
        """
    ]
    
    for query in queries:
        try:
            db_pool.execute_write(query)
            logger.info("Table created or already exists")
        except Exception as e:
            logger.error(f"Failed to create table: {e}")
            raise

# =============================================================================
# ATHLETE PROFILE FUNCTIONS
# =============================================================================

def create_athlete_profile(profile_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create a new athlete profile
    
    Args:
        profile_data: Dictionary with profile information
        
    Returns:
        Created profile with ID
    """
    query = """
        INSERT INTO athlete_profiles (
            user_id, name, gender, email, age, training_goal, injury_status,
            sleep_hours, sleep_quality, coach_mode, training_days_per_week,
            mood, streak_count, badges, created_at
        ) VALUES (
            %(user_id)s, %(name)s, %(gender)s, %(email)s, %(age)s, 
            %(training_goal)s, %(injury_status)s, %(sleep_hours)s, 
            %(sleep_quality)s, %(coach_mode)s, %(training_days_per_week)s,
            %(mood)s, %(streak_count)s, %(badges)s, NOW()
        ) RETURNING *
    """
    
    # Set defaults
    profile_data.setdefault('mood', 'neutral')
    profile_data.setdefault('streak_count', 0)
    profile_data.setdefault('badges', [])
    
    return db_pool.execute_one(query, profile_data)

def update_athlete_profile(user_id: int, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Update athlete profile
    
    Args:
        user_id: User ID
        updates: Dictionary of fields to update
        
    Returns:
        Updated profile or None
    """
    # Build dynamic UPDATE query
    set_clauses = []
    params = {'user_id': user_id}
    
    for key, value in updates.items():
        if key != 'user_id':  # Don't update user_id
            set_clauses.append(f"{key} = %({key})s")
            params[key] = value
    
    if not set_clauses:
        return get_athlete_profile(user_id)
    
    query = f"""
        UPDATE athlete_profiles 
        SET {', '.join(set_clauses)}
        WHERE user_id = %(user_id)s
        RETURNING *
    """
    
    return db_pool.execute_one(query, params)

def delete_athlete_profile(user_id: int) -> bool:
    """
    Delete athlete profile (cascades to related data)
    
    Args:
        user_id: User ID
        
    Returns:
        True if deleted, False otherwise
    """
    query = "DELETE FROM athlete_profiles WHERE user_id = %(user_id)s"
    rows_affected = db_pool.execute_write(query, {'user_id': user_id})
    return rows_affected > 0

def update_athlete_mood(user_id: int, mood: str) -> Optional[Dict[str, Any]]:
    """Update athlete mood"""
    query = """
        UPDATE athlete_profiles 
        SET mood = %(mood)s
        WHERE user_id = %(user_id)s
        RETURNING *
    """
    return db_pool.execute_one(query, {'user_id': user_id, 'mood': mood})

# =============================================================================
# KNOWLEDGE LIBRARY FUNCTIONS
# =============================================================================

def get_knowledge_items(limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    """Get all knowledge library items with pagination"""
    query = """
        SELECT * FROM knowledge_library 
        ORDER BY created_at DESC
        LIMIT %(limit)s OFFSET %(offset)s
    """
    return db_pool.execute_query(query, {'limit': limit, 'offset': offset})

def get_knowledge_item_by_id(item_id: int) -> Optional[Dict[str, Any]]:
    """Get single knowledge library item by ID"""
    query = "SELECT * FROM knowledge_library WHERE id = %(item_id)s"
    return db_pool.execute_one(query, {'item_id': item_id})

def create_knowledge_item(item_data: Dict[str, Any]) -> Dict[str, Any]:
    """Create new knowledge library item"""
    query = """
        INSERT INTO knowledge_library (title, summary, tags, url, created_at)
        VALUES (%(title)s, %(summary)s, %(tags)s, %(url)s, NOW())
        RETURNING *
    """
    return db_pool.execute_one(query, item_data)

def update_knowledge_item(item_id: int, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update knowledge library item"""
    set_clauses = []
    params = {'item_id': item_id}
    
    for key, value in updates.items():
        if key != 'id':
            set_clauses.append(f"{key} = %({key})s")
            params[key] = value
    
    if not set_clauses:
        return get_knowledge_item_by_id(item_id)
    
    query = f"""
        UPDATE knowledge_library 
        SET {', '.join(set_clauses)}
        WHERE id = %(item_id)s
        RETURNING *
    """
    
    return db_pool.execute_one(query, params)

def delete_knowledge_item(item_id: int) -> bool:
    """Delete knowledge library item"""
    query = "DELETE FROM knowledge_library WHERE id = %(item_id)s"
    rows_affected = db_pool.execute_write(query, {'item_id': item_id})
    return rows_affected > 0

def search_knowledge_items(search_query: str) -> List[Dict[str, Any]]:
    """Search knowledge library by title"""
    query = """
        SELECT * FROM knowledge_library 
        WHERE title ILIKE %(search)s OR summary ILIKE %(search)s
        ORDER BY created_at DESC
        LIMIT 50
    """
    return db_pool.execute_query(query, {'search': f'%{search_query}%'})

# =============================================================================
# COACH-ATHLETE RELATIONSHIP FUNCTIONS
# =============================================================================

def get_coach_athletes(coach_email: str) -> List[Dict[str, Any]]:
    """Get all athletes linked to a coach"""
    query = """
        SELECT ca.*, ap.name as athlete_name, ap.email as athlete_email
        FROM coach_athletes ca
        JOIN athlete_profiles ap ON ca.athlete_id = ap.user_id
        WHERE ca.coach_email = %(coach_email)s
        ORDER BY ca.created_at DESC
    """
    return db_pool.execute_query(query, {'coach_email': coach_email})

def link_coach_athlete(coach_email: str, athlete_id: int) -> Dict[str, Any]:
    """Link a coach to an athlete"""
    query = """
        INSERT INTO coach_athletes (coach_email, athlete_id, created_at)
        VALUES (%(coach_email)s, %(athlete_id)s, NOW())
        ON CONFLICT (coach_email, athlete_id) DO UPDATE 
        SET created_at = NOW()
        RETURNING *
    """
    return db_pool.execute_one(query, {
        'coach_email': coach_email,
        'athlete_id': athlete_id
    })

def unlink_coach_athlete(coach_email: str, athlete_id: int) -> bool:
    """Unlink a coach from an athlete"""
    query = """
        DELETE FROM coach_athletes 
        WHERE coach_email = %(coach_email)s AND athlete_id = %(athlete_id)s
    """
    rows_affected = db_pool.execute_write(query, {
        'coach_email': coach_email,
        'athlete_id': athlete_id
    })
    return rows_affected > 0

# =============================================================================
# QUERY USAGE DETAILED FUNCTIONS  
# =============================================================================

def get_query_usage_details(user_id: int, start_date: Any, end_date: Any) -> List[Dict[str, Any]]:
    """Get detailed query usage for a date range"""
    query = """
        SELECT * FROM query_usage
        WHERE user_id = %(user_id)s
        AND query_timestamp >= %(start_date)s
        AND query_timestamp <= %(end_date)s
        ORDER BY query_timestamp DESC
    """
    return db_pool.execute_query(query, {
        'user_id': user_id,
        'start_date': start_date,
        'end_date': end_date
    })

# =============================================================================
# TABLE CREATION FOR MISSING TABLES
# =============================================================================

def create_additional_tables():
    """Create additional tables needed for full functionality"""
    queries = [
        # Knowledge library table
        """
        CREATE TABLE IF NOT EXISTS knowledge_library (
            id SERIAL PRIMARY KEY,
            title VARCHAR(500) NOT NULL,
            summary TEXT NOT NULL,
            tags TEXT[] DEFAULT '{}',
            url VARCHAR(1000),
            created_at TIMESTAMP DEFAULT NOW()
        )
        """,
        
        # Coach-athlete relationships
        """
        CREATE TABLE IF NOT EXISTS coach_athletes (
            id SERIAL PRIMARY KEY,
            coach_email VARCHAR(255) NOT NULL,
            athlete_id INTEGER NOT NULL REFERENCES athlete_profiles(user_id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(coach_email, athlete_id)
        )
        """,
        
        # Indexes
        """
        CREATE INDEX IF NOT EXISTS idx_knowledge_title 
        ON knowledge_library USING gin(to_tsvector('english', title))
        """,
        
        """
        CREATE INDEX IF NOT EXISTS idx_coach_athletes_email 
        ON coach_athletes(coach_email)
        """
    ]
    
    for query in queries:
        try:
            db_pool.execute_write(query)
            logger.info("Additional table created or already exists")
        except Exception as e:
            logger.error(f"Failed to create additional table: {e}")

# Initialize Aria tables on import (safe to run multiple times)
try:
    create_Aria_tables()
    create_additional_tables()
except Exception as e:
    logger.warning(f"Could not create Aria tables: {e}")
