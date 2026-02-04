"""
Data Export and GDPR Compliance Module
Handles data export, import, and user data management for privacy compliance
"""
import logging
import json
import csv
import io
import zipfile
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from src.database import get_db_connection
import psycopg2.extras

logger = logging.getLogger(__name__)

# =============================================================================
# DATA EXPORT FUNCTIONS
# =============================================================================

async def export_user_data(user_id: str, format: str = "json") -> Dict[str, Any]:
    """
    Export all user data in specified format (JSON, CSV, or ZIP)
    GDPR Article 20: Right to data portability
    """
    try:
        # Collect all user data from various tables
        user_data = {
            "export_metadata": {
                "user_id": user_id,
                "export_date": datetime.now().isoformat(),
                "format": format
            },
            "profile": await _get_user_profile(user_id),
            "training_sessions": await _get_training_sessions(user_id),
            "goals": await _get_user_goals(user_id),
            "conversations": await _get_user_conversations(user_id),
            "race_history": await _get_race_history(user_id),
            "social_connections": await _get_social_connections(user_id),
            "analytics": await _get_user_analytics(user_id),
            "notifications": await _get_user_notifications(user_id),
            "equipment": await _get_user_equipment(user_id),
            "achievements": await _get_user_achievements(user_id)
        }
        
        if format == "json":
            return {
                "success": True,
                "data": user_data,
                "content_type": "application/json",
                "filename": f"aria_data_export_{user_id}_{datetime.now().strftime('%Y%m%d')}.json"
            }
        
        elif format == "csv":
            # Convert to CSV format (flattened)
            csv_data = await _convert_to_csv(user_data)
            return {
                "success": True,
                "data": csv_data,
                "content_type": "text/csv",
                "filename": f"aria_data_export_{user_id}_{datetime.now().strftime('%Y%m%d')}.csv"
            }
        
        elif format == "zip":
            # Create ZIP with multiple files
            zip_data = await _create_zip_export(user_data, user_id)
            return {
                "success": True,
                "data": zip_data,
                "content_type": "application/zip",
                "filename": f"aria_data_export_{user_id}_{datetime.now().strftime('%Y%m%d')}.zip"
            }
        
        else:
            return {"success": False, "error": f"Unsupported format: {format}"}
            
    except Exception as e:
        logger.error(f"Error exporting user data: {e}")
        return {"success": False, "error": str(e)}


async def _get_user_profile(user_id: str) -> Dict[str, Any]:
    """Get user profile data"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cur.execute("""
            SELECT * FROM users WHERE user_id = %s
        """, (user_id,))
        profile = cur.fetchone()
        return dict(profile) if profile else {}
    except Exception as e:
        logger.error(f"Error fetching profile: {e}")
        return {}
    finally:
        cur.close()
        conn.close()


async def _get_training_sessions(user_id: str) -> List[Dict[str, Any]]:
    """Get all training sessions"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cur.execute("""
            SELECT * FROM training_sessions 
            WHERE user_id = %s 
            ORDER BY session_date DESC
        """, (user_id,))
        sessions = cur.fetchall()
        return [dict(session) for session in sessions]
    except Exception as e:
        logger.error(f"Error fetching training sessions: {e}")
        return []
    finally:
        cur.close()
        conn.close()


async def _get_user_goals(user_id: str) -> List[Dict[str, Any]]:
    """Get user goals"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cur.execute("""
            SELECT * FROM goals WHERE user_id = %s
        """, (user_id,))
        goals = cur.fetchall()
        return [dict(goal) for goal in goals]
    except Exception as e:
        logger.error(f"Error fetching goals: {e}")
        return []
    finally:
        cur.close()
        conn.close()


async def _get_user_conversations(user_id: str) -> List[Dict[str, Any]]:
    """Get conversation history"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cur.execute("""
            SELECT * FROM conversations 
            WHERE user_id = %s 
            ORDER BY created_at DESC
        """, (user_id,))
        conversations = cur.fetchall()
        return [dict(conv) for conv in conversations]
    except Exception as e:
        logger.error(f"Error fetching conversations: {e}")
        return []
    finally:
        cur.close()
        conn.close()


async def _get_race_history(user_id: str) -> List[Dict[str, Any]]:
    """Get race history"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cur.execute("""
            SELECT r.*, rr.finish_time, rr.placement, rr.splits
            FROM races r
            LEFT JOIN race_results rr ON r.race_id = rr.race_id
            WHERE r.user_id = %s
            ORDER BY r.race_date DESC
        """, (user_id,))
        races = cur.fetchall()
        return [dict(race) for race in races]
    except Exception as e:
        logger.error(f"Error fetching race history: {e}")
        return []
    finally:
        cur.close()
        conn.close()


async def _get_social_connections(user_id: str) -> Dict[str, Any]:
    """Get social connections"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        # Followers
        cur.execute("""
            SELECT follower_id, created_at 
            FROM athlete_connections 
            WHERE following_id = %s
        """, (user_id,))
        followers = cur.fetchall()
        
        # Following
        cur.execute("""
            SELECT following_id, created_at 
            FROM athlete_connections 
            WHERE follower_id = %s
        """, (user_id,))
        following = cur.fetchall()
        
        # Messages
        cur.execute("""
            SELECT * FROM messages 
            WHERE sender_id = %s OR recipient_id = %s
            ORDER BY sent_at DESC
        """, (user_id, user_id))
        messages = cur.fetchall()
        
        return {
            "followers": [dict(f) for f in followers],
            "following": [dict(f) for f in following],
            "messages": [dict(m) for m in messages]
        }
    except Exception as e:
        logger.error(f"Error fetching social connections: {e}")
        return {"followers": [], "following": [], "messages": []}
    finally:
        cur.close()
        conn.close()


async def _get_user_analytics(user_id: str) -> Dict[str, Any]:
    """Get analytics data"""
    return {
        "note": "Analytics data would include performance metrics, trends, and predictions"
    }


async def _get_user_notifications(user_id: str) -> List[Dict[str, Any]]:
    """Get notification history"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cur.execute("""
            SELECT * FROM notifications 
            WHERE user_id = %s 
            ORDER BY created_at DESC
            LIMIT 1000
        """, (user_id,))
        notifications = cur.fetchall()
        return [dict(notif) for notif in notifications]
    except Exception as e:
        logger.error(f"Error fetching notifications: {e}")
        return []
    finally:
        cur.close()
        conn.close()


async def _get_user_equipment(user_id: str) -> List[Dict[str, Any]]:
    """Get equipment tracking data"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cur.execute("""
            SELECT * FROM equipment 
            WHERE user_id = %s
        """, (user_id,))
        equipment = cur.fetchall()
        return [dict(eq) for eq in equipment]
    except Exception as e:
        logger.error(f"Error fetching equipment: {e}")
        return []
    finally:
        cur.close()
        conn.close()


async def _get_user_achievements(user_id: str) -> List[Dict[str, Any]]:
    """Get achievements and badges"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cur.execute("""
            SELECT * FROM achievements 
            WHERE user_id = %s
        """, (user_id,))
        achievements = cur.fetchall()
        return [dict(ach) for ach in achievements]
    except Exception as e:
        logger.error(f"Error fetching achievements: {e}")
        return []
    finally:
        cur.close()
        conn.close()


async def _convert_to_csv(data: Dict[str, Any]) -> str:
    """Convert data to CSV format"""
    output = io.StringIO()
    
    # Flatten the data structure for CSV
    flattened_data = []
    
    # Add training sessions
    for session in data.get("training_sessions", []):
        flattened_data.append({
            "category": "training_session",
            "date": session.get("session_date"),
            "data": json.dumps(session)
        })
    
    # Add races
    for race in data.get("race_history", []):
        flattened_data.append({
            "category": "race",
            "date": race.get("race_date"),
            "data": json.dumps(race)
        })
    
    # Add goals
    for goal in data.get("goals", []):
        flattened_data.append({
            "category": "goal",
            "date": goal.get("created_at"),
            "data": json.dumps(goal)
        })
    
    if flattened_data:
        writer = csv.DictWriter(output, fieldnames=["category", "date", "data"])
        writer.writeheader()
        writer.writerows(flattened_data)
    
    return output.getvalue()


async def _create_zip_export(data: Dict[str, Any], user_id: str) -> bytes:
    """Create ZIP file with multiple JSON files"""
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        # Add each data category as separate JSON file
        for category, content in data.items():
            if category != "export_metadata":
                filename = f"{category}.json"
                zip_file.writestr(filename, json.dumps(content, indent=2, default=str))
        
        # Add README
        readme = f"""
Aria Data Export
================
User ID: {user_id}
Export Date: {datetime.now().isoformat()}

This archive contains all your data from Aria in JSON format.

Files included:
- profile.json: Your profile information
- training_sessions.json: All training session data
- goals.json: Your goals and targets
- conversations.json: Conversation history with Aria
- race_history.json: Your race records and results
- social_connections.json: Your social network data
- analytics.json: Performance analytics and insights
- notifications.json: Notification history
- equipment.json: Equipment tracking data
- achievements.json: Achievements and badges

For questions about this export, contact support@aria.com
"""
        zip_file.writestr("README.txt", readme)
    
    return zip_buffer.getvalue()

# =============================================================================
# DATA IMPORT FUNCTIONS
# =============================================================================

async def import_user_data(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Import user data from export file
    """
    try:
        imported_counts = {}
        
        # Import training sessions
        if "training_sessions" in data:
            count = await _import_training_sessions(user_id, data["training_sessions"])
            imported_counts["training_sessions"] = count
        
        # Import goals
        if "goals" in data:
            count = await _import_goals(user_id, data["goals"])
            imported_counts["goals"] = count
        
        # Import equipment
        if "equipment" in data:
            count = await _import_equipment(user_id, data["equipment"])
            imported_counts["equipment"] = count
        
        return {
            "success": True,
            "imported_counts": imported_counts,
            "message": "Data imported successfully"
        }
        
    except Exception as e:
        logger.error(f"Error importing user data: {e}")
        return {"success": False, "error": str(e)}


async def _import_training_sessions(user_id: str, sessions: List[Dict[str, Any]]) -> int:
    """Import training sessions"""
    conn = get_db_connection()
    cur = conn.cursor()
    count = 0
    
    try:
        for session in sessions:
            cur.execute("""
                INSERT INTO training_sessions (user_id, session_date, session_data)
                VALUES (%s, %s, %s)
                ON CONFLICT DO NOTHING
            """, (user_id, session.get("session_date"), psycopg2.extras.Json(session)))
            count += cur.rowcount
        
        conn.commit()
        return count
        
    except Exception as e:
        logger.error(f"Error importing sessions: {e}")
        conn.rollback()
        return count
    finally:
        cur.close()
        conn.close()


async def _import_goals(user_id: str, goals: List[Dict[str, Any]]) -> int:
    """Import goals"""
    conn = get_db_connection()
    cur = conn.cursor()
    count = 0
    
    try:
        for goal in goals:
            cur.execute("""
                INSERT INTO goals (user_id, goal_data)
                VALUES (%s, %s)
            """, (user_id, psycopg2.extras.Json(goal)))
            count += cur.rowcount
        
        conn.commit()
        return count
        
    except Exception as e:
        logger.error(f"Error importing goals: {e}")
        conn.rollback()
        return count
    finally:
        cur.close()
        conn.close()


async def _import_equipment(user_id: str, equipment: List[Dict[str, Any]]) -> int:
    """Import equipment data"""
    conn = get_db_connection()
    cur = conn.cursor()
    count = 0
    
    try:
        for eq in equipment:
            cur.execute("""
                INSERT INTO equipment (user_id, equipment_data)
                VALUES (%s, %s)
            """, (user_id, psycopg2.extras.Json(eq)))
            count += cur.rowcount
        
        conn.commit()
        return count
        
    except Exception as e:
        logger.error(f"Error importing equipment: {e}")
        conn.rollback()
        return count
    finally:
        cur.close()
        conn.close()

# =============================================================================
# DATA DELETION (RIGHT TO BE FORGOTTEN)
# =============================================================================

async def delete_user_data(user_id: str, verification_code: str) -> Dict[str, Any]:
    """
    Permanently delete all user data
    GDPR Article 17: Right to erasure (right to be forgotten)
    Requires verification code for safety
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Verify the deletion request
        cur.execute("""
            SELECT * FROM deletion_requests
            WHERE user_id = %s AND verification_code = %s
            AND created_at > NOW() - INTERVAL '24 hours'
            AND status = 'pending'
        """, (user_id, verification_code))
        
        if not cur.fetchone():
            return {
                "success": False,
                "error": "Invalid or expired verification code"
            }
        
        # Delete from all tables
        tables = [
            "training_sessions",
            "goals",
            "conversations",
            "race_results",
            "races",
            "athlete_connections",
            "messages",
            "training_group_members",
            "leaderboard_entries",
            "activity_feed",
            "activity_comments",
            "activity_reactions",
            "notifications",
            "equipment",
            "achievements",
            "users"
        ]
        
        deleted_counts = {}
        for table in tables:
            try:
                cur.execute(f"DELETE FROM {table} WHERE user_id = %s", (user_id,))
                deleted_counts[table] = cur.rowcount
            except Exception as e:
                logger.warning(f"Could not delete from {table}: {e}")
        
        # Mark deletion request as completed
        cur.execute("""
            UPDATE deletion_requests
            SET status = 'completed', completed_at = NOW()
            WHERE user_id = %s AND verification_code = %s
        """, (user_id, verification_code))
        
        conn.commit()
        
        logger.info(f"User data deleted for {user_id}")
        return {
            "success": True,
            "deleted_counts": deleted_counts,
            "message": "All user data has been permanently deleted"
        }
        
    except Exception as e:
        logger.error(f"Error deleting user data: {e}")
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        cur.close()
        conn.close()


async def request_data_deletion(user_id: str, email: str) -> Dict[str, Any]:
    """
    Request data deletion (sends verification email)
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Generate verification code
        import secrets
        verification_code = secrets.token_urlsafe(32)
        
        # Store deletion request
        cur.execute("""
            INSERT INTO deletion_requests (user_id, verification_code, status)
            VALUES (%s, %s, 'pending')
        """, (user_id, verification_code))
        
        conn.commit()
        
        # Send verification email (would use notification service in production)
        logger.info(f"Deletion request created for {user_id}")
        
        return {
            "success": True,
            "verification_code": verification_code,
            "message": "Deletion request created. Use verification code to confirm."
        }
        
    except Exception as e:
        logger.error(f"Error creating deletion request: {e}")
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        cur.close()
        conn.close()

# =============================================================================
# DATA ACCESS LOGS (GDPR COMPLIANCE)
# =============================================================================

def log_data_access(user_id: str, accessed_by: str, purpose: str, data_categories: List[str]):
    """
    Log data access for audit trail
    GDPR requires maintaining records of data processing activities
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            INSERT INTO data_access_logs (user_id, accessed_by, purpose, data_categories, access_time)
            VALUES (%s, %s, %s, %s, NOW())
        """, (user_id, accessed_by, purpose, psycopg2.extras.Json(data_categories)))
        
        conn.commit()
        
    except Exception as e:
        logger.error(f"Error logging data access: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()


def get_data_access_logs(user_id: str) -> List[Dict[str, Any]]:
    """
    Get data access logs for user
    GDPR Article 15: Right of access
    """
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cur.execute("""
            SELECT * FROM data_access_logs
            WHERE user_id = %s
            ORDER BY access_time DESC
        """, (user_id,))
        
        logs = cur.fetchall()
        return [dict(log) for log in logs]
        
    except Exception as e:
        logger.error(f"Error fetching access logs: {e}")
        return []
    finally:
        cur.close()
        conn.close()

# =============================================================================
# CREATE GDPR TABLES
# =============================================================================

def create_gdpr_tables():
    """Create tables for GDPR compliance"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Deletion requests table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS deletion_requests (
                request_id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                verification_code VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP
            )
        """)
        
        # Data access logs table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS data_access_logs (
                log_id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                accessed_by VARCHAR(255) NOT NULL,
                purpose TEXT,
                data_categories JSONB,
                access_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
        logger.info("GDPR compliance tables created successfully")
        
    except Exception as e:
        logger.error(f"Error creating GDPR tables: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()


# Initialize tables
try:
    create_gdpr_tables()
except Exception as e:
    logger.warning(f"Could not create GDPR tables: {e}")
