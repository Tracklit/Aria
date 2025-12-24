"""
Social and Community Features for Aria
Athlete interactions, messaging, teams, and leaderboards
"""
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime, timedelta
from src.database import db_pool

logger = logging.getLogger(__name__)


# =============================================================================
# SOCIAL DATABASE OPERATIONS
# =============================================================================

def create_social_tables():
    """Create social feature tables"""
    with db_pool.get_cursor() as cursor:
        # Athletes connections (following/friends)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS athlete_connections (
                connection_id SERIAL PRIMARY KEY,
                follower_user_id VARCHAR(255) NOT NULL,
                following_user_id VARCHAR(255) NOT NULL,
                connection_type VARCHAR(50) DEFAULT 'following',
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(follower_user_id, following_user_id)
            )
        """)
        
        # Direct messages
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                message_id SERIAL PRIMARY KEY,
                sender_user_id VARCHAR(255) NOT NULL,
                recipient_user_id VARCHAR(255) NOT NULL,
                message_text TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_user_id, created_at DESC);
        """)
        
        # Training groups/teams
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS training_groups (
                group_id SERIAL PRIMARY KEY,
                group_name VARCHAR(255) NOT NULL,
                description TEXT,
                creator_user_id VARCHAR(255) NOT NULL,
                is_private BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Group memberships
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS group_members (
                membership_id SERIAL PRIMARY KEY,
                group_id INTEGER REFERENCES training_groups(group_id) ON DELETE CASCADE,
                user_id VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'member',
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(group_id, user_id)
            )
        """)
        
        # Leaderboards
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS leaderboard_entries (
                entry_id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                leaderboard_type VARCHAR(100) NOT NULL,
                metric_value FLOAT NOT NULL,
                metric_unit VARCHAR(50),
                period VARCHAR(50) DEFAULT 'all_time',
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, leaderboard_type, period)
            )
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_leaderboard_type_value ON leaderboard_entries(leaderboard_type, metric_value DESC);
        """)
        
        # Activity feed
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS activity_feed (
                activity_id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                activity_type VARCHAR(100) NOT NULL,
                activity_data JSONB,
                is_public BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_activity_feed_user ON activity_feed(user_id, created_at DESC);
        """)
        
        # Comments on activities
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS activity_comments (
                comment_id SERIAL PRIMARY KEY,
                activity_id INTEGER REFERENCES activity_feed(activity_id) ON DELETE CASCADE,
                user_id VARCHAR(255) NOT NULL,
                comment_text TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Reactions (likes, kudos, etc.)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS activity_reactions (
                reaction_id SERIAL PRIMARY KEY,
                activity_id INTEGER REFERENCES activity_feed(activity_id) ON DELETE CASCADE,
                user_id VARCHAR(255) NOT NULL,
                reaction_type VARCHAR(50) DEFAULT 'like',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(activity_id, user_id, reaction_type)
            )
        """)


# =============================================================================
# CONNECTION MANAGEMENT
# =============================================================================

def follow_athlete(follower_id: str, following_id: str) -> Dict[str, Any]:
    """Follow another athlete"""
    try:
        with db_pool.get_cursor() as cursor:
            cursor.execute("""
                INSERT INTO athlete_connections (follower_user_id, following_user_id, connection_type)
                VALUES (%s, %s, 'following')
                ON CONFLICT (follower_user_id, following_user_id) DO UPDATE
                SET status = 'active'
                RETURNING connection_id
            """, (follower_id, following_id))
            
            result = cursor.fetchone()
            return {"success": True, "connection_id": result[0]}
    except Exception as e:
        logger.error(f"Error following athlete: {e}")
        return {"success": False, "error": str(e)}


def unfollow_athlete(follower_id: str, following_id: str) -> bool:
    """Unfollow an athlete"""
    try:
        with db_pool.get_cursor() as cursor:
            cursor.execute("""
                DELETE FROM athlete_connections
                WHERE follower_user_id = %s AND following_user_id = %s
            """, (follower_id, following_id))
            return True
    except Exception as e:
        logger.error(f"Error unfollowing athlete: {e}")
        return False


def get_followers(user_id: str) -> List[Dict[str, Any]]:
    """Get list of followers"""
    try:
        with db_pool.get_cursor() as cursor:
            cursor.execute("""
                SELECT ac.follower_user_id, ac.created_at, ap.name, ap.age
                FROM athlete_connections ac
                LEFT JOIN athlete_profiles ap ON ac.follower_user_id = ap.user_id
                WHERE ac.following_user_id = %s AND ac.status = 'active'
                ORDER BY ac.created_at DESC
            """, (user_id,))
            
            followers = []
            for row in cursor.fetchall():
                followers.append({
                    "user_id": row[0],
                    "following_since": row[1].isoformat() if row[1] else None,
                    "name": row[2],
                    "age": row[3]
                })
            return followers
    except Exception as e:
        logger.error(f"Error getting followers: {e}")
        return []


def get_following(user_id: str) -> List[Dict[str, Any]]:
    """Get list of athletes user is following"""
    try:
        with db_pool.get_cursor() as cursor:
            cursor.execute("""
                SELECT ac.following_user_id, ac.created_at, ap.name, ap.age
                FROM athlete_connections ac
                LEFT JOIN athlete_profiles ap ON ac.following_user_id = ap.user_id
                WHERE ac.follower_user_id = %s AND ac.status = 'active'
                ORDER BY ac.created_at DESC
            """, (user_id,))
            
            following = []
            for row in cursor.fetchall():
                following.append({
                    "user_id": row[0],
                    "following_since": row[1].isoformat() if row[1] else None,
                    "name": row[2],
                    "age": row[3]
                })
            return following
    except Exception as e:
        logger.error(f"Error getting following: {e}")
        return []


# =============================================================================
# MESSAGING
# =============================================================================

def send_message(sender_id: str, recipient_id: str, message_text: str) -> Dict[str, Any]:
    """Send direct message to another athlete"""
    try:
        with db_pool.get_cursor() as cursor:
            cursor.execute("""
                INSERT INTO messages (sender_user_id, recipient_user_id, message_text)
                VALUES (%s, %s, %s)
                RETURNING message_id, created_at
            """, (sender_id, recipient_id, message_text))
            
            result = cursor.fetchone()
            return {
                "success": True,
                "message_id": result[0],
                "sent_at": result[1].isoformat() if result[1] else None
            }
    except Exception as e:
        logger.error(f"Error sending message: {e}")
        return {"success": False, "error": str(e)}


def get_messages(user_id: str, conversation_with: str = None, limit: int = 50) -> List[Dict[str, Any]]:
    """Get messages for a user"""
    try:
        with db_pool.get_cursor() as cursor:
            if conversation_with:
                cursor.execute("""
                    SELECT message_id, sender_user_id, recipient_user_id, message_text, is_read, created_at
                    FROM messages
                    WHERE (sender_user_id = %s AND recipient_user_id = %s)
                       OR (sender_user_id = %s AND recipient_user_id = %s)
                    ORDER BY created_at DESC
                    LIMIT %s
                """, (user_id, conversation_with, conversation_with, user_id, limit))
            else:
                cursor.execute("""
                    SELECT message_id, sender_user_id, recipient_user_id, message_text, is_read, created_at
                    FROM messages
                    WHERE recipient_user_id = %s
                    ORDER BY created_at DESC
                    LIMIT %s
                """, (user_id, limit))
            
            messages = []
            for row in cursor.fetchall():
                messages.append({
                    "message_id": row[0],
                    "sender_id": row[1],
                    "recipient_id": row[2],
                    "message": row[3],
                    "is_read": row[4],
                    "sent_at": row[5].isoformat() if row[5] else None
                })
            return messages
    except Exception as e:
        logger.error(f"Error getting messages: {e}")
        return []


def mark_message_read(message_id: int, user_id: str) -> bool:
    """Mark message as read"""
    try:
        with db_pool.get_cursor() as cursor:
            cursor.execute("""
                UPDATE messages
                SET is_read = TRUE
                WHERE message_id = %s AND recipient_user_id = %s
            """, (message_id, user_id))
            return True
    except Exception as e:
        logger.error(f"Error marking message as read: {e}")
        return False


# =============================================================================
# TRAINING GROUPS
# =============================================================================

def create_training_group(creator_id: str, name: str, description: str = None, is_private: bool = False) -> Dict[str, Any]:
    """Create a training group"""
    try:
        with db_pool.get_cursor() as cursor:
            cursor.execute("""
                INSERT INTO training_groups (creator_user_id, group_name, description, is_private)
                VALUES (%s, %s, %s, %s)
                RETURNING group_id
            """, (creator_id, name, description, is_private))
            
            group_id = cursor.fetchone()[0]
            
            # Add creator as admin
            cursor.execute("""
                INSERT INTO group_members (group_id, user_id, role)
                VALUES (%s, %s, 'admin')
            """, (group_id, creator_id))
            
            return {"success": True, "group_id": group_id}
    except Exception as e:
        logger.error(f"Error creating training group: {e}")
        return {"success": False, "error": str(e)}


def join_training_group(user_id: str, group_id: int) -> Dict[str, Any]:
    """Join a training group"""
    try:
        with db_pool.get_cursor() as cursor:
            cursor.execute("""
                INSERT INTO group_members (group_id, user_id, role)
                VALUES (%s, %s, 'member')
                ON CONFLICT (group_id, user_id) DO NOTHING
                RETURNING membership_id
            """, (group_id, user_id))
            
            result = cursor.fetchone()
            if result:
                return {"success": True, "membership_id": result[0]}
            return {"success": False, "error": "Already a member"}
    except Exception as e:
        logger.error(f"Error joining training group: {e}")
        return {"success": False, "error": str(e)}


def get_user_groups(user_id: str) -> List[Dict[str, Any]]:
    """Get all groups user is a member of"""
    try:
        with db_pool.get_cursor() as cursor:
            cursor.execute("""
                SELECT tg.group_id, tg.group_name, tg.description, gm.role, 
                       COUNT(DISTINCT gm2.user_id) as member_count
                FROM training_groups tg
                JOIN group_members gm ON tg.group_id = gm.group_id
                LEFT JOIN group_members gm2 ON tg.group_id = gm2.group_id
                WHERE gm.user_id = %s
                GROUP BY tg.group_id, tg.group_name, tg.description, gm.role
            """, (user_id,))
            
            groups = []
            for row in cursor.fetchall():
                groups.append({
                    "group_id": row[0],
                    "group_name": row[1],
                    "description": row[2],
                    "user_role": row[3],
                    "member_count": row[4]
                })
            return groups
    except Exception as e:
        logger.error(f"Error getting user groups: {e}")
        return []


# =============================================================================
# LEADERBOARDS
# =============================================================================

def update_leaderboard_entry(
    user_id: str,
    leaderboard_type: str,
    metric_value: float,
    metric_unit: str = "seconds",
    period: str = "all_time"
) -> Dict[str, Any]:
    """Update leaderboard entry for a user"""
    try:
        with db_pool.get_cursor() as cursor:
            cursor.execute("""
                INSERT INTO leaderboard_entries (user_id, leaderboard_type, metric_value, metric_unit, period)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (user_id, leaderboard_type, period) DO UPDATE
                SET metric_value = EXCLUDED.metric_value,
                    recorded_at = CURRENT_TIMESTAMP
                RETURNING entry_id
            """, (user_id, leaderboard_type, metric_value, metric_unit, period))
            
            entry_id = cursor.fetchone()[0]
            return {"success": True, "entry_id": entry_id}
    except Exception as e:
        logger.error(f"Error updating leaderboard: {e}")
        return {"success": False, "error": str(e)}


def get_leaderboard(
    leaderboard_type: str,
    period: str = "all_time",
    limit: int = 100
) -> List[Dict[str, Any]]:
    """Get leaderboard rankings"""
    try:
        with db_pool.get_cursor() as cursor:
            # Determine if lower is better (e.g., times) or higher is better (e.g., points)
            order = "ASC" if "time" in leaderboard_type.lower() or "100m" in leaderboard_type else "DESC"
            
            cursor.execute(f"""
                SELECT le.user_id, le.metric_value, le.metric_unit, le.recorded_at,
                       ap.name, ap.age, ap.gender,
                       ROW_NUMBER() OVER (ORDER BY le.metric_value {order}) as rank
                FROM leaderboard_entries le
                LEFT JOIN athlete_profiles ap ON le.user_id = ap.user_id
                WHERE le.leaderboard_type = %s AND le.period = %s
                ORDER BY le.metric_value {order}
                LIMIT %s
            """, (leaderboard_type, period, limit))
            
            leaderboard = []
            for row in cursor.fetchall():
                leaderboard.append({
                    "rank": row[7],
                    "user_id": row[0],
                    "value": row[1],
                    "unit": row[2],
                    "recorded_at": row[3].isoformat() if row[3] else None,
                    "athlete_name": row[4],
                    "age": row[5],
                    "gender": row[6]
                })
            return leaderboard
    except Exception as e:
        logger.error(f"Error getting leaderboard: {e}")
        return []


def get_user_rank(user_id: str, leaderboard_type: str, period: str = "all_time") -> Dict[str, Any]:
    """Get user's rank on a specific leaderboard"""
    try:
        leaderboard = get_leaderboard(leaderboard_type, period, limit=1000)
        
        for entry in leaderboard:
            if entry["user_id"] == user_id:
                return {
                    "rank": entry["rank"],
                    "value": entry["value"],
                    "unit": entry["unit"],
                    "total_participants": len(leaderboard)
                }
        
        return {"rank": None, "message": "Not ranked yet"}
    except Exception as e:
        logger.error(f"Error getting user rank: {e}")
        return {"rank": None, "error": str(e)}


# =============================================================================
# ACTIVITY FEED
# =============================================================================

def post_activity(
    user_id: str,
    activity_type: str,
    activity_data: Dict[str, Any],
    is_public: bool = True
) -> Dict[str, Any]:
    """Post activity to feed"""
    try:
        with db_pool.get_cursor() as cursor:
            cursor.execute("""
                INSERT INTO activity_feed (user_id, activity_type, activity_data, is_public)
                VALUES (%s, %s, %s, %s)
                RETURNING activity_id
            """, (user_id, activity_type, json.dumps(activity_data), is_public))
            
            activity_id = cursor.fetchone()[0]
            return {"success": True, "activity_id": activity_id}
    except Exception as e:
        logger.error(f"Error posting activity: {e}")
        return {"success": False, "error": str(e)}


def get_activity_feed(user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Get activity feed for user (including followed athletes)"""
    try:
        with db_pool.get_cursor() as cursor:
            cursor.execute("""
                SELECT af.activity_id, af.user_id, af.activity_type, af.activity_data, af.created_at,
                       ap.name, ap.age,
                       (SELECT COUNT(*) FROM activity_reactions WHERE activity_id = af.activity_id) as reaction_count,
                       (SELECT COUNT(*) FROM activity_comments WHERE activity_id = af.activity_id) as comment_count
                FROM activity_feed af
                LEFT JOIN athlete_profiles ap ON af.user_id = ap.user_id
                WHERE af.is_public = TRUE
                  AND (af.user_id = %s 
                       OR af.user_id IN (
                           SELECT following_user_id 
                           FROM athlete_connections 
                           WHERE follower_user_id = %s AND status = 'active'
                       ))
                ORDER BY af.created_at DESC
                LIMIT %s
            """, (user_id, user_id, limit))
            
            feed = []
            for row in cursor.fetchall():
                feed.append({
                    "activity_id": row[0],
                    "user_id": row[1],
                    "activity_type": row[2],
                    "activity_data": row[3],
                    "created_at": row[4].isoformat() if row[4] else None,
                    "athlete_name": row[5],
                    "athlete_age": row[6],
                    "reaction_count": row[7],
                    "comment_count": row[8]
                })
            return feed
    except Exception as e:
        logger.error(f"Error getting activity feed: {e}")
        return []


def add_reaction(user_id: str, activity_id: int, reaction_type: str = "like") -> Dict[str, Any]:
    """Add reaction to activity"""
    try:
        with db_pool.get_cursor() as cursor:
            cursor.execute("""
                INSERT INTO activity_reactions (activity_id, user_id, reaction_type)
                VALUES (%s, %s, %s)
                ON CONFLICT (activity_id, user_id, reaction_type) DO NOTHING
                RETURNING reaction_id
            """, (activity_id, user_id, reaction_type))
            
            result = cursor.fetchone()
            if result:
                return {"success": True, "reaction_id": result[0]}
            return {"success": False, "error": "Already reacted"}
    except Exception as e:
        logger.error(f"Error adding reaction: {e}")
        return {"success": False, "error": str(e)}


def add_comment(user_id: str, activity_id: int, comment_text: str) -> Dict[str, Any]:
    """Add comment to activity"""
    try:
        with db_pool.get_cursor() as cursor:
            cursor.execute("""
                INSERT INTO activity_comments (activity_id, user_id, comment_text)
                VALUES (%s, %s, %s)
                RETURNING comment_id
            """, (activity_id, user_id, comment_text))
            
            comment_id = cursor.fetchone()[0]
            return {"success": True, "comment_id": comment_id}
    except Exception as e:
        logger.error(f"Error adding comment: {e}")
        return {"success": False, "error": str(e)}


def get_activity_comments(activity_id: int) -> List[Dict[str, Any]]:
    """Get comments for an activity"""
    try:
        with db_pool.get_cursor() as cursor:
            cursor.execute("""
                SELECT ac.comment_id, ac.user_id, ac.comment_text, ac.created_at, ap.name
                FROM activity_comments ac
                LEFT JOIN athlete_profiles ap ON ac.user_id = ap.user_id
                WHERE ac.activity_id = %s
                ORDER BY ac.created_at ASC
            """, (activity_id,))
            
            comments = []
            for row in cursor.fetchall():
                comments.append({
                    "comment_id": row[0],
                    "user_id": row[1],
                    "comment_text": row[2],
                    "created_at": row[3].isoformat() if row[3] else None,
                    "athlete_name": row[4]
                })
            return comments
    except Exception as e:
        logger.error(f"Error getting activity comments: {e}")
        return []
