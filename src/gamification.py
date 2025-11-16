"""
Gamification System
Enhanced achievements, XP system, levels, virtual races, and athlete challenges
"""
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, date, timedelta
from database import get_db_connection
import psycopg2.extras

logger = logging.getLogger(__name__)

# XP values for different actions
XP_VALUES = {
    "training_session_completed": 50,
    "goal_achieved": 200,
    "race_completed": 500,
    "personal_record": 1000,
    "streak_7_days": 300,
    "streak_30_days": 1500,
    "video_analyzed": 100,
    "social_post": 25,
    "help_another_athlete": 150,
    "daily_login": 10,
    "challenge_completed": 750
}

# Level thresholds
LEVEL_THRESHOLDS = [
    0, 500, 1200, 2500, 4500, 7500, 12000, 18000, 26000, 36000, 50000
]

# =============================================================================
# DATABASE FUNCTIONS
# =============================================================================

def create_gamification_tables():
    """Create gamification tables"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # User XP and levels
        cur.execute("""
            CREATE TABLE IF NOT EXISTS user_levels (
                user_id VARCHAR(255) PRIMARY KEY,
                total_xp INTEGER DEFAULT 0,
                current_level INTEGER DEFAULT 1,
                current_streak INTEGER DEFAULT 0,
                longest_streak INTEGER DEFAULT 0,
                last_activity_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Enhanced achievements
        cur.execute("""
            CREATE TABLE IF NOT EXISTS achievements (
                achievement_id SERIAL PRIMARY KEY,
                achievement_name VARCHAR(255) UNIQUE NOT NULL,
                description TEXT,
                category VARCHAR(100),
                xp_reward INTEGER DEFAULT 0,
                badge_icon VARCHAR(255),
                rarity VARCHAR(50),
                requirements JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # User achievements
        cur.execute("""
            CREATE TABLE IF NOT EXISTS user_achievements (
                user_achievement_id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                achievement_id INTEGER REFERENCES achievements(achievement_id),
                unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                progress JSONB
            )
        """)
        
        # Virtual races
        cur.execute("""
            CREATE TABLE IF NOT EXISTS virtual_races (
                virtual_race_id SERIAL PRIMARY KEY,
                race_name VARCHAR(255) NOT NULL,
                description TEXT,
                distance VARCHAR(50) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                entry_xp_cost INTEGER DEFAULT 0,
                completion_xp_reward INTEGER DEFAULT 500,
                prize_pool JSONB,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Virtual race participants
        cur.execute("""
            CREATE TABLE IF NOT EXISTS virtual_race_participants (
                participant_id SERIAL PRIMARY KEY,
                virtual_race_id INTEGER REFERENCES virtual_races(virtual_race_id),
                user_id VARCHAR(255) NOT NULL,
                registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completion_time FLOAT,
                completed_at TIMESTAMP,
                placement INTEGER,
                proof_data JSONB
            )
        """)
        
        # Challenges
        cur.execute("""
            CREATE TABLE IF NOT EXISTS challenges (
                challenge_id SERIAL PRIMARY KEY,
                challenge_name VARCHAR(255) NOT NULL,
                description TEXT,
                challenge_type VARCHAR(100) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                goal_value FLOAT NOT NULL,
                goal_unit VARCHAR(50),
                xp_reward INTEGER DEFAULT 300,
                badge_reward VARCHAR(255),
                is_public BOOLEAN DEFAULT TRUE,
                created_by VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Challenge participants
        cur.execute("""
            CREATE TABLE IF NOT EXISTS challenge_participants (
                participant_id SERIAL PRIMARY KEY,
                challenge_id INTEGER REFERENCES challenges(challenge_id),
                user_id VARCHAR(255) NOT NULL,
                current_progress FLOAT DEFAULT 0.0,
                completed BOOLEAN DEFAULT FALSE,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP
            )
        """)
        
        # XP transactions log
        cur.execute("""
            CREATE TABLE IF NOT EXISTS xp_transactions (
                transaction_id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                xp_amount INTEGER NOT NULL,
                action_type VARCHAR(100) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
        logger.info("Gamification tables created successfully")
        
    except Exception as e:
        logger.error(f"Error creating gamification tables: {e}")
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()

# =============================================================================
# XP AND LEVELING SYSTEM
# =============================================================================

def award_xp(user_id: str, action_type: str, description: Optional[str] = None) -> Dict[str, Any]:
    """Award XP to user for an action"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        xp_amount = XP_VALUES.get(action_type, 0)
        
        if xp_amount == 0:
            return {"success": False, "error": f"Unknown action type: {action_type}"}
        
        # Initialize user level if not exists
        cur.execute("""
            INSERT INTO user_levels (user_id, total_xp, current_level)
            VALUES (%s, 0, 1)
            ON CONFLICT (user_id) DO NOTHING
        """, (user_id,))
        
        # Add XP
        cur.execute("""
            UPDATE user_levels
            SET total_xp = total_xp + %s, updated_at = NOW()
            WHERE user_id = %s
            RETURNING total_xp, current_level
        """, (xp_amount, user_id))
        
        user_level = cur.fetchone()
        
        # Log transaction
        cur.execute("""
            INSERT INTO xp_transactions (user_id, xp_amount, action_type, description)
            VALUES (%s, %s, %s, %s)
        """, (user_id, xp_amount, action_type, description))
        
        # Check for level up
        new_level = calculate_level(user_level["total_xp"])
        level_up = False
        
        if new_level > user_level["current_level"]:
            cur.execute("""
                UPDATE user_levels
                SET current_level = %s
                WHERE user_id = %s
            """, (new_level, user_id))
            level_up = True
        
        conn.commit()
        
        result = {
            "success": True,
            "xp_awarded": xp_amount,
            "total_xp": user_level["total_xp"],
            "current_level": new_level if level_up else user_level["current_level"],
            "level_up": level_up
        }
        
        if level_up:
            result["message"] = f"🎉 Level Up! You're now Level {new_level}!"
        
        return result
        
    except Exception as e:
        logger.error(f"Error awarding XP: {e}")
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        cur.close()
        conn.close()


def calculate_level(total_xp: int) -> int:
    """Calculate level based on total XP"""
    level = 1
    for threshold in LEVEL_THRESHOLDS:
        if total_xp >= threshold:
            level += 1
        else:
            break
    return level - 1


def get_user_level_info(user_id: str) -> Dict[str, Any]:
    """Get user level and XP info"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cur.execute("""
            SELECT * FROM user_levels WHERE user_id = %s
        """, (user_id,))
        
        level_info = cur.fetchone()
        
        if not level_info:
            return {
                "total_xp": 0,
                "current_level": 1,
                "xp_to_next_level": LEVEL_THRESHOLDS[1],
                "current_streak": 0,
                "longest_streak": 0
            }
        
        level_info = dict(level_info)
        current_level = level_info["current_level"]
        
        # Calculate XP to next level
        if current_level < len(LEVEL_THRESHOLDS) - 1:
            xp_to_next = LEVEL_THRESHOLDS[current_level + 1] - level_info["total_xp"]
        else:
            xp_to_next = 0  # Max level
        
        level_info["xp_to_next_level"] = xp_to_next
        level_info["progress_percentage"] = ((level_info["total_xp"] - LEVEL_THRESHOLDS[current_level - 1]) / 
                                             (LEVEL_THRESHOLDS[current_level] - LEVEL_THRESHOLDS[current_level - 1])) * 100 if current_level < len(LEVEL_THRESHOLDS) else 100
        
        return level_info
        
    except Exception as e:
        logger.error(f"Error fetching user level info: {e}")
        return {}
    finally:
        cur.close()
        conn.close()


def update_streak(user_id: str) -> Dict[str, Any]:
    """Update user's training streak"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cur.execute("""
            SELECT last_activity_date, current_streak, longest_streak
            FROM user_levels
            WHERE user_id = %s
        """, (user_id,))
        
        level_info = cur.fetchone()
        
        if not level_info:
            # Initialize
            cur.execute("""
                INSERT INTO user_levels (user_id, current_streak, last_activity_date)
                VALUES (%s, 1, CURRENT_DATE)
            """, (user_id,))
            conn.commit()
            return {"success": True, "current_streak": 1, "streak_maintained": True}
        
        last_activity = level_info["last_activity_date"]
        today = date.today()
        
        if last_activity == today:
            # Already counted today
            return {"success": True, "current_streak": level_info["current_streak"], "streak_maintained": True}
        
        elif last_activity == today - timedelta(days=1):
            # Streak continues
            new_streak = level_info["current_streak"] + 1
            new_longest = max(new_streak, level_info["longest_streak"])
            
            cur.execute("""
                UPDATE user_levels
                SET current_streak = %s, longest_streak = %s, last_activity_date = CURRENT_DATE
                WHERE user_id = %s
            """, (new_streak, new_longest, user_id))
            
            # Award streak XP
            if new_streak == 7:
                award_xp(user_id, "streak_7_days", "7-day streak bonus!")
            elif new_streak == 30:
                award_xp(user_id, "streak_30_days", "30-day streak bonus!")
            
            conn.commit()
            return {"success": True, "current_streak": new_streak, "streak_maintained": True, "new_record": new_streak == new_longest}
        
        else:
            # Streak broken
            cur.execute("""
                UPDATE user_levels
                SET current_streak = 1, last_activity_date = CURRENT_DATE
                WHERE user_id = %s
            """, (user_id,))
            conn.commit()
            return {"success": True, "current_streak": 1, "streak_maintained": False, "message": "Streak broken, starting fresh!"}
        
    except Exception as e:
        logger.error(f"Error updating streak: {e}")
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        cur.close()
        conn.close()

# =============================================================================
# ACHIEVEMENTS SYSTEM
# =============================================================================

def create_default_achievements():
    """Create default achievement definitions"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    achievements = [
        ("First Sprint", "Complete your first training session", "training", 50, "🏃", "common", '{"sessions": 1}'),
        ("Dedicated Athlete", "Complete 10 training sessions", "training", 200, "💪", "uncommon", '{"sessions": 10}'),
        ("Century Runner", "Complete 100 training sessions", "training", 2000, "🔥", "epic", '{"sessions": 100}'),
        ("Goal Getter", "Achieve your first goal", "goals", 100, "🎯", "common", '{"goals": 1}'),
        ("Personal Best", "Set a new personal record", "performance", 500, "⚡", "rare", '{"prs": 1}'),
        ("Speed Demon", "Run sub-11 second 100m", "performance", 1500, "🚀", "legendary", '{"time_100m": 11.0}'),
        ("Social Butterfly", "Follow 10 other athletes", "social", 100, "🦋", "uncommon", '{"connections": 10}'),
        ("Helpful Coach", "Give advice to 5 athletes", "social", 300, "🤝", "rare", '{"helped": 5}'),
        ("Early Bird", "Complete 5 morning workouts", "consistency", 150, "🌅", "uncommon", '{"morning_workouts": 5}'),
        ("Night Owl", "Complete 5 evening workouts", "consistency", 150, "🌙", "uncommon", '{"evening_workouts": 5}'),
        ("Streak Master", "Maintain a 30-day streak", "consistency", 1000, "📅", "epic", '{"streak": 30}'),
        ("Race Ready", "Complete your first race", "racing", 500, "🏁", "rare", '{"races": 1}'),
        ("Podium Finish", "Place in top 3 of a race", "racing", 1500, "🥇", "legendary", '{"top_3_finishes": 1}'),
        ("Tech Savvy", "Analyze 5 training videos", "analytics", 250, "📹", "uncommon", '{"videos_analyzed": 5}'),
        ("Data Driven", "View analytics dashboard 10 times", "analytics", 200, "📊", "uncommon", '{"dashboard_views": 10}')
    ]
    
    try:
        for achievement in achievements:
            cur.execute("""
                INSERT INTO achievements 
                (achievement_name, description, category, xp_reward, badge_icon, rarity, requirements)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (achievement_name) DO NOTHING
            """, achievement)
        
        conn.commit()
        logger.info("Default achievements created")
        
    except Exception as e:
        logger.error(f"Error creating achievements: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()


def check_achievement_progress(user_id: str, achievement_name: str) -> bool:
    """Check if user has unlocked an achievement"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        # Check if already unlocked
        cur.execute("""
            SELECT ua.* FROM user_achievements ua
            JOIN achievements a ON ua.achievement_id = a.achievement_id
            WHERE ua.user_id = %s AND a.achievement_name = %s
        """, (user_id, achievement_name))
        
        if cur.fetchone():
            return False  # Already unlocked
        
        # Get achievement requirements
        cur.execute("""
            SELECT * FROM achievements WHERE achievement_name = %s
        """, (achievement_name,))
        
        achievement = cur.fetchone()
        if not achievement:
            return False
        
        # Check requirements (simplified - would need more complex logic in production)
        # For now, auto-award when checked
        
        # Award achievement
        cur.execute("""
            INSERT INTO user_achievements (user_id, achievement_id)
            VALUES (%s, %s)
            RETURNING user_achievement_id
        """, (user_id, achievement["achievement_id"]))
        
        conn.commit()
        
        # Award XP
        award_xp(user_id, "achievement_unlocked", f"Unlocked: {achievement_name}")
        
        logger.info(f"Achievement unlocked: {achievement_name} for user {user_id}")
        return True
        
    except Exception as e:
        logger.error(f"Error checking achievement: {e}")
        conn.rollback()
        return False
    finally:
        cur.close()
        conn.close()


def get_user_achievements(user_id: str) -> List[Dict[str, Any]]:
    """Get all achievements for user"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cur.execute("""
            SELECT a.*, ua.unlocked_at
            FROM user_achievements ua
            JOIN achievements a ON ua.achievement_id = a.achievement_id
            WHERE ua.user_id = %s
            ORDER BY ua.unlocked_at DESC
        """, (user_id,))
        
        achievements = cur.fetchall()
        return [dict(ach) for ach in achievements]
        
    except Exception as e:
        logger.error(f"Error fetching achievements: {e}")
        return []
    finally:
        cur.close()
        conn.close()

# =============================================================================
# VIRTUAL RACES
# =============================================================================

def create_virtual_race(
    race_name: str,
    description: str,
    distance: str,
    start_date: date,
    end_date: date,
    completion_xp_reward: int = 500
) -> Dict[str, Any]:
    """Create a virtual race event"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cur.execute("""
            INSERT INTO virtual_races 
            (race_name, description, distance, start_date, end_date, completion_xp_reward)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING virtual_race_id, race_name
        """, (race_name, description, distance, start_date, end_date, completion_xp_reward))
        
        race = cur.fetchone()
        conn.commit()
        
        return {
            "success": True,
            "race": dict(race),
            "message": f"Virtual race '{race_name}' created"
        }
        
    except Exception as e:
        logger.error(f"Error creating virtual race: {e}")
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        cur.close()
        conn.close()


def register_for_virtual_race(user_id: str, virtual_race_id: int) -> Dict[str, Any]:
    """Register user for virtual race"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cur.execute("""
            INSERT INTO virtual_race_participants (virtual_race_id, user_id)
            VALUES (%s, %s)
            RETURNING participant_id
        """, (virtual_race_id, user_id))
        
        participant = cur.fetchone()
        conn.commit()
        
        return {
            "success": True,
            "participant_id": participant["participant_id"],
            "message": "Successfully registered for virtual race"
        }
        
    except Exception as e:
        logger.error(f"Error registering for virtual race: {e}")
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        cur.close()
        conn.close()


def get_active_virtual_races() -> List[Dict[str, Any]]:
    """Get all active virtual races"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cur.execute("""
            SELECT * FROM virtual_races
            WHERE is_active = TRUE
            AND end_date >= CURRENT_DATE
            ORDER BY start_date ASC
        """)
        
        races = cur.fetchall()
        return [dict(race) for race in races]
        
    except Exception as e:
        logger.error(f"Error fetching virtual races: {e}")
        return []
    finally:
        cur.close()
        conn.close()


# Initialize tables and default data
try:
    create_gamification_tables()
    create_default_achievements()
except Exception as e:
    logger.warning(f"Could not initialize gamification: {e}")
