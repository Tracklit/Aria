"""
Database Extensions for Aria AI Companion
Additional tables and functions for conversation history, training sessions,
progress tracking, calendar, injuries, drills, goals, nutrition, and mental performance.
"""
import logging
import json
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from src.database import db_pool

logger = logging.getLogger(__name__)

# =============================================================================
# DATABASE SCHEMA CREATION
# =============================================================================

def create_companion_tables():
    """
    Create all companion feature tables
    """
    queries = [
        # =====================================================================
        # 1. CONVERSATION HISTORY
        # =====================================================================
        """
        CREATE TABLE IF NOT EXISTS conversations (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            session_id VARCHAR(255) NOT NULL,
            role VARCHAR(20) NOT NULL,  -- 'user' or 'assistant'
            message TEXT NOT NULL,
            context JSONB,  -- Additional context (mood, wearable data, etc.)
            created_at TIMESTAMP DEFAULT NOW(),
            INDEX idx_conversations_user_session (user_id, session_id, created_at DESC),
            INDEX idx_conversations_user_recent (user_id, created_at DESC)
        )
        """,
        
        # =====================================================================
        # 2. TRAINING SESSIONS
        # =====================================================================
        """
        CREATE TABLE IF NOT EXISTS training_sessions (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            session_date DATE NOT NULL,
            session_type VARCHAR(50),  -- 'speed', 'endurance', 'strength', 'recovery', etc.
            duration_minutes INTEGER,
            distance_meters DECIMAL(10, 2),
            workout_description TEXT,
            splits JSONB,  -- Array of split times
            heart_rate JSONB,  -- {avg, max, zones}
            rpe INTEGER,  -- Rate of Perceived Exertion (1-10)
            notes TEXT,
            mood_before VARCHAR(50),
            mood_after VARCHAR(50),
            injuries_reported TEXT,
            weather_conditions VARCHAR(100),
            location VARCHAR(255),
            coach_feedback TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            INDEX idx_training_sessions_user_date (user_id, session_date DESC)
        )
        """,
        
        # =====================================================================
        # 3. PROGRESS METRICS (for analytics)
        # =====================================================================
        """
        CREATE TABLE IF NOT EXISTS progress_metrics (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            metric_date DATE NOT NULL,
            metric_type VARCHAR(50) NOT NULL,  -- 'pr', 'volume', 'intensity', 'bodyweight'
            metric_value DECIMAL(10, 4),
            metric_unit VARCHAR(20),
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, metric_date, metric_type)
        )
        """,
        
        # =====================================================================
        # 4. CALENDAR EVENTS
        # =====================================================================
        """
        CREATE TABLE IF NOT EXISTS calendar_events (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            event_type VARCHAR(50) NOT NULL,  -- 'training', 'competition', 'rest', 'testing'
            event_title VARCHAR(255) NOT NULL,
            event_date DATE NOT NULL,
            event_time TIME,
            duration_minutes INTEGER,
            description TEXT,
            location VARCHAR(255),
            priority VARCHAR(20),  -- 'low', 'medium', 'high', 'critical'
            completed BOOLEAN DEFAULT FALSE,
            result_notes TEXT,
            reminder_sent BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            INDEX idx_calendar_user_date (user_id, event_date DESC)
        )
        """,
        
        # =====================================================================
        # 5. INJURY TRACKING
        # =====================================================================
        """
        CREATE TABLE IF NOT EXISTS injuries (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            injury_type VARCHAR(100) NOT NULL,
            body_part VARCHAR(100) NOT NULL,
            severity VARCHAR(20),  -- 'minor', 'moderate', 'severe'
            onset_date DATE NOT NULL,
            recovery_date DATE,
            status VARCHAR(20) DEFAULT 'active',  -- 'active', 'recovering', 'recovered'
            description TEXT,
            treatment_plan TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            INDEX idx_injuries_user (user_id, onset_date DESC)
        )
        """,
        
        # Pain tracking (related to injuries)
        """
        CREATE TABLE IF NOT EXISTS pain_logs (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            injury_id INTEGER REFERENCES injuries(id) ON DELETE CASCADE,
            log_date DATE NOT NULL,
            pain_level INTEGER NOT NULL,  -- 1-10 scale
            body_part VARCHAR(100),
            activity_at_time VARCHAR(100),
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            INDEX idx_pain_logs_user_date (user_id, log_date DESC)
        )
        """,
        
        # =====================================================================
        # 6. DRILLS & EXERCISES LIBRARY
        # =====================================================================
        """
        CREATE TABLE IF NOT EXISTS drills_library (
            id SERIAL PRIMARY KEY,
            drill_name VARCHAR(255) NOT NULL,
            drill_category VARCHAR(50),  -- 'warmup', 'technical', 'strength', 'cooldown'
            difficulty_level VARCHAR(20),  -- 'beginner', 'intermediate', 'advanced', 'elite'
            target_muscle_groups TEXT[],
            description TEXT,
            instructions TEXT,
            video_url VARCHAR(500),
            duration_minutes INTEGER,
            equipment_needed TEXT[],
            tags TEXT[],
            created_at TIMESTAMP DEFAULT NOW(),
            INDEX idx_drills_category (drill_category)
        )
        """,
        
        # User-specific drill recommendations
        """
        CREATE TABLE IF NOT EXISTS user_drill_recommendations (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            drill_id INTEGER REFERENCES drills_library(id) ON DELETE CASCADE,
            recommended_by VARCHAR(50),  -- 'ai', 'coach', 'self'
            reason TEXT,
            priority INTEGER DEFAULT 0,
            completed BOOLEAN DEFAULT FALSE,
            completed_date DATE,
            feedback TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            INDEX idx_user_drills (user_id, priority DESC)
        )
        """,
        
        # =====================================================================
        # 7. GOALS TRACKING
        # =====================================================================
        """
        CREATE TABLE IF NOT EXISTS goals (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            goal_type VARCHAR(50),  -- 'time', 'distance', 'competition', 'consistency', 'bodyweight'
            goal_title VARCHAR(255) NOT NULL,
            goal_description TEXT,
            target_value DECIMAL(10, 4),
            target_unit VARCHAR(20),
            target_date DATE,
            current_value DECIMAL(10, 4),
            status VARCHAR(20) DEFAULT 'active',  -- 'active', 'achieved', 'abandoned', 'adjusted'
            priority VARCHAR(20),  -- 'low', 'medium', 'high'
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            achieved_at TIMESTAMP,
            INDEX idx_goals_user_status (user_id, status, target_date)
        )
        """,
        
        # Goal milestones (sub-goals)
        """
        CREATE TABLE IF NOT EXISTS goal_milestones (
            id SERIAL PRIMARY KEY,
            goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
            milestone_title VARCHAR(255) NOT NULL,
            milestone_value DECIMAL(10, 4),
            milestone_date DATE,
            completed BOOLEAN DEFAULT FALSE,
            completed_at TIMESTAMP,
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )
        """,
        
        # =====================================================================
        # 8. NUTRITION TRACKING
        # =====================================================================
        """
        CREATE TABLE IF NOT EXISTS nutrition_logs (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            log_date DATE NOT NULL,
            meal_type VARCHAR(50),  -- 'breakfast', 'lunch', 'dinner', 'snack', 'pre-workout', 'post-workout'
            meal_description TEXT,
            calories INTEGER,
            protein_grams DECIMAL(6, 2),
            carbs_grams DECIMAL(6, 2),
            fats_grams DECIMAL(6, 2),
            hydration_ml INTEGER,
            timing TIME,
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            INDEX idx_nutrition_user_date (user_id, log_date DESC)
        )
        """,
        
        # Hydration tracking
        """
        CREATE TABLE IF NOT EXISTS hydration_logs (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            log_date DATE NOT NULL,
            log_time TIME NOT NULL,
            amount_ml INTEGER NOT NULL,
            beverage_type VARCHAR(50) DEFAULT 'water',
            created_at TIMESTAMP DEFAULT NOW(),
            INDEX idx_hydration_user_date (user_id, log_date DESC)
        )
        """,
        
        # =====================================================================
        # 9. MENTAL PERFORMANCE
        # =====================================================================
        """
        CREATE TABLE IF NOT EXISTS mental_performance_logs (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            log_date DATE NOT NULL,
            log_type VARCHAR(50),  -- 'journal', 'meditation', 'visualization', 'pre-race-prep'
            mood VARCHAR(50),
            stress_level INTEGER,  -- 1-10
            confidence_level INTEGER,  -- 1-10
            focus_quality INTEGER,  -- 1-10
            sleep_quality INTEGER,  -- 1-10
            anxiety_level INTEGER,  -- 1-10
            notes TEXT,
            techniques_used TEXT[],
            duration_minutes INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            INDEX idx_mental_logs_user_date (user_id, log_date DESC)
        )
        """,
        
        # Mental exercises library
        """
        CREATE TABLE IF NOT EXISTS mental_exercises (
            id SERIAL PRIMARY KEY,
            exercise_name VARCHAR(255) NOT NULL,
            exercise_type VARCHAR(50),  -- 'meditation', 'visualization', 'breathing', 'affirmation'
            description TEXT,
            instructions TEXT,
            duration_minutes INTEGER,
            difficulty_level VARCHAR(20),
            audio_url VARCHAR(500),
            tags TEXT[],
            created_at TIMESTAMP DEFAULT NOW()
        )
        """,
        
        # =====================================================================
        # 10. PROACTIVE ENGAGEMENT
        # =====================================================================
        """
        CREATE TABLE IF NOT EXISTS check_ins (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            check_in_type VARCHAR(50),  -- 'scheduled', 'proactive', 'follow-up', 'recovery'
            message TEXT NOT NULL,
            scheduled_for TIMESTAMP NOT NULL,
            sent_at TIMESTAMP,
            responded_at TIMESTAMP,
            response TEXT,
            status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'sent', 'responded', 'dismissed'
            created_at TIMESTAMP DEFAULT NOW(),
            INDEX idx_checkins_user_schedule (user_id, scheduled_for DESC)
        )
        """,
        
        # Proactive suggestions
        """
        CREATE TABLE IF NOT EXISTS proactive_suggestions (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            suggestion_type VARCHAR(50),  -- 'recovery', 'drill', 'nutrition', 'rest', 'mental'
            suggestion_text TEXT NOT NULL,
            reason TEXT,
            priority INTEGER DEFAULT 0,
            shown_at TIMESTAMP,
            acted_upon BOOLEAN DEFAULT FALSE,
            dismissed BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW(),
            INDEX idx_suggestions_user_priority (user_id, priority DESC, created_at DESC)
        )
        """,
        
        # =====================================================================
        # 11. ACHIEVEMENTS & BADGES
        # =====================================================================
        """
        CREATE TABLE IF NOT EXISTS achievements (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            achievement_type VARCHAR(50),
            achievement_name VARCHAR(255) NOT NULL,
            achievement_description TEXT,
            earned_at TIMESTAMP DEFAULT NOW(),
            value_achieved DECIMAL(10, 4),
            celebrated BOOLEAN DEFAULT FALSE,
            INDEX idx_achievements_user (user_id, earned_at DESC)
        )
        """,
        
        # =====================================================================
        # 12. VOICE INTERACTIONS (metadata)
        # =====================================================================
        """
        CREATE TABLE IF NOT EXISTS voice_interactions (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            audio_file_url VARCHAR(500),
            transcription TEXT,
            response_text TEXT,
            response_audio_url VARCHAR(500),
            duration_seconds INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            INDEX idx_voice_user_date (user_id, created_at DESC)
        )
        """
    ]
    
    try:
        with db_pool.get_cursor() as cursor:
            for query in queries:
                try:
                    cursor.execute(query)
                    logger.info(f"Successfully created/verified table")
                except Exception as e:
                    logger.error(f"Failed to create table: {e}")
                    # Continue with other tables even if one fails
                    
        logger.info("All companion tables created/verified successfully")
        return True
    except Exception as e:
        logger.error(f"Error creating companion tables: {e}")
        return False

# =============================================================================
# CONVERSATION HISTORY FUNCTIONS
# =============================================================================

def save_conversation(
    user_id: str,
    session_id: str,
    role: str,
    message: str,
    context: Optional[Dict] = None
) -> Optional[int]:
    """Save a conversation message"""
    query = """
        INSERT INTO conversations (user_id, session_id, role, message, context)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id
    """
    result = db_pool.execute_one(query, (user_id, session_id, role, message, json.dumps(context) if context else None))
    return result.get("id") if result else None

def get_conversation_history(
    user_id: str,
    session_id: Optional[str] = None,
    limit: int = 50
) -> List[Dict]:
    """Get conversation history for a user"""
    if session_id:
        query = """
            SELECT id, session_id, role, message, context, created_at
            FROM conversations
            WHERE user_id = %s AND session_id = %s
            ORDER BY created_at DESC
            LIMIT %s
        """
        params = (user_id, session_id, limit)
    else:
        query = """
            SELECT id, session_id, role, message, context, created_at
            FROM conversations
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT %s
        """
        params = (user_id, limit)
    
    return db_pool.execute_many(query, params)

def get_recent_context(user_id: str, hours: int = 24) -> List[Dict]:
    """Get recent conversation context for continuity"""
    query = """
        SELECT role, message, context, created_at
        FROM conversations
        WHERE user_id = %s 
        AND created_at >= NOW() - INTERVAL '%s hours'
        ORDER BY created_at DESC
        LIMIT 10
    """
    return db_pool.execute_many(query, (user_id, hours))

# =============================================================================
# TRAINING SESSION FUNCTIONS
# =============================================================================

def log_training_session(session_data: Dict) -> Optional[int]:
    """Log a training session"""
    query = """
        INSERT INTO training_sessions (
            user_id, session_date, session_type, duration_minutes, distance_meters,
            workout_description, splits, heart_rate, rpe, notes, mood_before, mood_after,
            injuries_reported, weather_conditions, location, coach_feedback
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        ) RETURNING id
    """
    import json
    params = (
        session_data.get('user_id'),
        session_data.get('session_date'),
        session_data.get('session_type'),
        session_data.get('duration_minutes'),
        session_data.get('distance_meters'),
        session_data.get('workout_description'),
        json.dumps(session_data.get('splits')) if session_data.get('splits') else None,
        json.dumps(session_data.get('heart_rate')) if session_data.get('heart_rate') else None,
        session_data.get('rpe'),
        session_data.get('notes'),
        session_data.get('mood_before'),
        session_data.get('mood_after'),
        session_data.get('injuries_reported'),
        session_data.get('weather_conditions'),
        session_data.get('location'),
        session_data.get('coach_feedback')
    )
    result = db_pool.execute_one(query, params)
    return result.get("id") if result else None

def get_training_sessions(
    user_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 30
) -> List[Dict]:
    """Get training sessions for a user"""
    if start_date and end_date:
        query = """
            SELECT * FROM training_sessions
            WHERE user_id = %s AND session_date BETWEEN %s AND %s
            ORDER BY session_date DESC
            LIMIT %s
        """
        params = (user_id, start_date, end_date, limit)
    else:
        query = """
            SELECT * FROM training_sessions
            WHERE user_id = %s
            ORDER BY session_date DESC
            LIMIT %s
        """
        params = (user_id, limit)
    
    return db_pool.execute_many(query, params)

# =============================================================================
# PROGRESS & ANALYTICS FUNCTIONS
# =============================================================================

def track_progress_metric(user_id: str, metric_type: str, metric_value: float, 
                         metric_unit: str, metric_date: str, notes: Optional[str] = None) -> Optional[int]:
    """Track a progress metric"""
    query = """
        INSERT INTO progress_metrics (user_id, metric_date, metric_type, metric_value, metric_unit, notes)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (user_id, metric_date, metric_type) 
        DO UPDATE SET metric_value = EXCLUDED.metric_value, notes = EXCLUDED.notes
        RETURNING id
    """
    result = db_pool.execute_one(query, (user_id, metric_date, metric_type, metric_value, metric_unit, notes))
    return result.get("id") if result else None

def get_progress_analytics(user_id: str, metric_type: Optional[str] = None, days: int = 90) -> List[Dict]:
    """Get progress analytics for visualization"""
    if metric_type:
        query = """
            SELECT metric_date, metric_type, metric_value, metric_unit, notes
            FROM progress_metrics
            WHERE user_id = %s AND metric_type = %s AND metric_date >= CURRENT_DATE - INTERVAL '%s days'
            ORDER BY metric_date ASC
        """
        params = (user_id, metric_type, days)
    else:
        query = """
            SELECT metric_date, metric_type, metric_value, metric_unit, notes
            FROM progress_metrics
            WHERE user_id = %s AND metric_date >= CURRENT_DATE - INTERVAL '%s days'
            ORDER BY metric_date ASC, metric_type
        """
        params = (user_id, days)
    
    return db_pool.execute_many(query, params)

# =============================================================================
# CALENDAR & SCHEDULING FUNCTIONS
# =============================================================================

def create_calendar_event(event_data: Dict) -> Optional[int]:
    """Create a calendar event"""
    query = """
        INSERT INTO calendar_events (
            user_id, event_type, event_title, event_date, event_time,
            duration_minutes, description, location, priority
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """
    params = (
        event_data['user_id'], event_data['event_type'], event_data['event_title'],
        event_data['event_date'], event_data.get('event_time'), event_data.get('duration_minutes'),
        event_data.get('description'), event_data.get('location'), event_data.get('priority', 'medium')
    )
    result = db_pool.execute_one(query, params)
    return result.get("id") if result else None

def get_calendar_events(user_id: str, start_date: str, end_date: str) -> List[Dict]:
    """Get calendar events for date range"""
    query = """
        SELECT * FROM calendar_events
        WHERE user_id = %s AND event_date BETWEEN %s AND %s
        ORDER BY event_date ASC, event_time ASC
    """
    return db_pool.execute_many(query, (user_id, start_date, end_date))

def update_event_completion(event_id: int, completed: bool, result_notes: Optional[str] = None) -> bool:
    """Mark event as completed"""
    query = """
        UPDATE calendar_events
        SET completed = %s, result_notes = %s, updated_at = NOW()
        WHERE id = %s
    """
    return db_pool.execute(query, (completed, result_notes, event_id))

# =============================================================================
# INJURY TRACKING FUNCTIONS
# =============================================================================

def report_injury(injury_data: Dict) -> Optional[int]:
    """Report a new injury"""
    query = """
        INSERT INTO injuries (
            user_id, injury_type, body_part, severity, onset_date,
            description, treatment_plan, status
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """
    params = (
        injury_data['user_id'], injury_data['injury_type'], injury_data['body_part'],
        injury_data.get('severity', 'moderate'), injury_data['onset_date'],
        injury_data.get('description'), injury_data.get('treatment_plan'), 'active'
    )
    result = db_pool.execute_one(query, params)
    return result.get("id") if result else None

def log_pain(user_id: str, log_date: str, pain_level: int, body_part: str, 
            injury_id: Optional[int] = None, activity: Optional[str] = None, 
            notes: Optional[str] = None) -> Optional[int]:
    """Log pain level"""
    query = """
        INSERT INTO pain_logs (user_id, injury_id, log_date, pain_level, body_part, activity_at_time, notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """
    result = db_pool.execute_one(query, (user_id, injury_id, log_date, pain_level, body_part, activity, notes))
    return result.get("id") if result else None

def get_injury_history(user_id: str, include_recovered: bool = False) -> List[Dict]:
    """Get injury history"""
    if include_recovered:
        query = "SELECT * FROM injuries WHERE user_id = %s ORDER BY onset_date DESC"
    else:
        query = "SELECT * FROM injuries WHERE user_id = %s AND status != 'recovered' ORDER BY onset_date DESC"
    
    return db_pool.execute_many(query, (user_id,))

def get_pain_history(user_id: str, days: int = 30) -> List[Dict]:
    """Get pain history"""
    query = """
        SELECT pl.*, i.injury_type, i.body_part as injury_body_part
        FROM pain_logs pl
        LEFT JOIN injuries i ON pl.injury_id = i.id
        WHERE pl.user_id = %s AND pl.log_date >= CURRENT_DATE - INTERVAL '%s days'
        ORDER BY pl.log_date DESC
    """
    return db_pool.execute_many(query, (user_id, days))

# =============================================================================
# DRILL LIBRARY FUNCTIONS
# =============================================================================

def get_recommended_drills(user_id: str, limit: int = 10) -> List[Dict]:
    """Get recommended drills for user"""
    query = """
        SELECT dr.*, d.drill_name, d.description, d.instructions, d.video_url, d.duration_minutes
        FROM user_drill_recommendations dr
        JOIN drills_library d ON dr.drill_id = d.id
        WHERE dr.user_id = %s AND dr.completed = FALSE
        ORDER BY dr.priority DESC, dr.created_at DESC
        LIMIT %s
    """
    return db_pool.execute_many(query, (user_id, limit))

def add_drill_recommendation(user_id: str, drill_id: int, reason: str, 
                            recommended_by: str = 'ai', priority: int = 0) -> Optional[int]:
    """Add a drill recommendation"""
    query = """
        INSERT INTO user_drill_recommendations (user_id, drill_id, recommended_by, reason, priority)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id
    """
    result = db_pool.execute_one(query, (user_id, drill_id, recommended_by, reason, priority))
    return result.get("id") if result else None

def search_drills(category: Optional[str] = None, difficulty: Optional[str] = None, 
                 tags: Optional[List[str]] = None) -> List[Dict]:
    """Search drills library"""
    conditions = []
    params = []
    
    if category:
        conditions.append("drill_category = %s")
        params.append(category)
    if difficulty:
        conditions.append("difficulty_level = %s")
        params.append(difficulty)
    if tags:
        conditions.append("tags && %s")
        params.append(tags)
    
    where_clause = " AND ".join(conditions) if conditions else "TRUE"
    query = f"SELECT * FROM drills_library WHERE {where_clause} ORDER BY drill_name"
    
    return db_pool.execute_many(query, tuple(params))

# =============================================================================
# GOALS TRACKING FUNCTIONS
# =============================================================================

def create_goal(goal_data: Dict) -> Optional[int]:
    """Create a new goal"""
    query = """
        INSERT INTO goals (
            user_id, goal_type, goal_title, goal_description, target_value,
            target_unit, target_date, current_value, priority, status
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """
    params = (
        goal_data['user_id'], goal_data['goal_type'], goal_data['goal_title'],
        goal_data.get('goal_description'), goal_data.get('target_value'),
        goal_data.get('target_unit'), goal_data.get('target_date'),
        goal_data.get('current_value', 0), goal_data.get('priority', 'medium'), 'active'
    )
    result = db_pool.execute_one(query, params)
    return result.get("id") if result else None

def update_goal_progress(goal_id: int, current_value: float) -> bool:
    """Update goal progress"""
    query = """
        UPDATE goals
        SET current_value = %s, updated_at = NOW()
        WHERE id = %s
    """
    return db_pool.execute(query, (current_value, goal_id))

def get_active_goals(user_id: str) -> List[Dict]:
    """Get active goals"""
    query = """
        SELECT g.*, 
               CASE 
                   WHEN g.target_value > 0 THEN (g.current_value / g.target_value * 100)
                   ELSE 0
               END as progress_percentage
        FROM goals g
        WHERE user_id = %s AND status = 'active'
        ORDER BY priority DESC, target_date ASC
    """
    return db_pool.execute_many(query, (user_id,))

def achieve_goal(goal_id: int) -> bool:
    """Mark goal as achieved"""
    query = """
        UPDATE goals
        SET status = 'achieved', achieved_at = NOW(), updated_at = NOW()
        WHERE id = %s
    """
    return db_pool.execute(query, (goal_id,))

# =============================================================================
# NUTRITION TRACKING FUNCTIONS
# =============================================================================

def log_nutrition(nutrition_data: Dict) -> Optional[int]:
    """Log nutrition entry"""
    query = """
        INSERT INTO nutrition_logs (
            user_id, log_date, meal_type, meal_description, calories,
            protein_grams, carbs_grams, fats_grams, hydration_ml, timing, notes
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """
    params = (
        nutrition_data['user_id'], nutrition_data['log_date'], nutrition_data['meal_type'],
        nutrition_data['meal_description'], nutrition_data.get('calories'),
        nutrition_data.get('protein_grams'), nutrition_data.get('carbs_grams'),
        nutrition_data.get('fats_grams'), nutrition_data.get('hydration_ml'),
        nutrition_data.get('timing'), nutrition_data.get('notes')
    )
    result = db_pool.execute_one(query, params)
    return result.get("id") if result else None

def log_hydration(user_id: str, log_date: str, log_time: str, amount_ml: int, 
                 beverage_type: str = 'water') -> Optional[int]:
    """Log hydration"""
    query = """
        INSERT INTO hydration_logs (user_id, log_date, log_time, amount_ml, beverage_type)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id
    """
    result = db_pool.execute_one(query, (user_id, log_date, log_time, amount_ml, beverage_type))
    return result.get("id") if result else None

def get_daily_nutrition(user_id: str, log_date: str) -> Dict:
    """Get daily nutrition summary"""
    query = """
        SELECT 
            SUM(calories) as total_calories,
            SUM(protein_grams) as total_protein,
            SUM(carbs_grams) as total_carbs,
            SUM(fats_grams) as total_fats,
            SUM(hydration_ml) as total_hydration
        FROM nutrition_logs
        WHERE user_id = %s AND log_date = %s
    """
    result = db_pool.execute_one(query, (user_id, log_date))
    
    # Get hydration logs separately
    hydration_query = """
        SELECT SUM(amount_ml) as hydration_from_logs
        FROM hydration_logs
        WHERE user_id = %s AND log_date = %s
    """
    hydration_result = db_pool.execute_one(hydration_query, (user_id, log_date))
    
    if result:
        result['total_hydration_ml'] = (result.get('total_hydration') or 0) + (hydration_result.get('hydration_from_logs') or 0)
    
    return result or {}

# =============================================================================
# MENTAL PERFORMANCE FUNCTIONS
# =============================================================================

def log_mental_performance(mental_data: Dict) -> Optional[int]:
    """Log mental performance entry"""
    query = """
        INSERT INTO mental_performance_logs (
            user_id, log_date, log_type, mood, stress_level, confidence_level,
            focus_quality, sleep_quality, anxiety_level, notes, techniques_used, duration_minutes
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """
    params = (
        mental_data['user_id'], mental_data['log_date'], mental_data['log_type'],
        mental_data.get('mood'), mental_data.get('stress_level'),
        mental_data.get('confidence_level'), mental_data.get('focus_quality'),
        mental_data.get('sleep_quality'), mental_data.get('anxiety_level'),
        mental_data.get('notes'), mental_data.get('techniques_used'),
        mental_data.get('duration_minutes')
    )
    result = db_pool.execute_one(query, params)
    return result.get("id") if result else None

def get_mental_exercises(exercise_type: Optional[str] = None) -> List[Dict]:
    """Get mental exercises"""
    if exercise_type:
        query = "SELECT * FROM mental_exercises WHERE exercise_type = %s ORDER BY exercise_name"
        return db_pool.execute_many(query, (exercise_type,))
    else:
        query = "SELECT * FROM mental_exercises ORDER BY exercise_type, exercise_name"
        return db_pool.execute_many(query)

# =============================================================================
# PROACTIVE ENGAGEMENT FUNCTIONS
# =============================================================================

def schedule_check_in(user_id: str, check_in_type: str, message: str, scheduled_for: str) -> Optional[int]:
    """Schedule a check-in"""
    query = """
        INSERT INTO check_ins (user_id, check_in_type, message, scheduled_for, status)
        VALUES (%s, %s, %s, %s, 'pending')
        RETURNING id
    """
    result = db_pool.execute_one(query, (user_id, check_in_type, message, scheduled_for))
    return result.get("id") if result else None

def get_pending_check_ins(user_id: str) -> List[Dict]:
    """Get pending check-ins"""
    query = """
        SELECT * FROM check_ins
        WHERE user_id = %s AND status = 'pending' AND scheduled_for <= NOW()
        ORDER BY scheduled_for ASC
    """
    return db_pool.execute_many(query, (user_id,))

def create_proactive_suggestion(user_id: str, suggestion_type: str, suggestion_text: str, 
                               reason: str, priority: int = 0) -> Optional[int]:
    """Create a proactive suggestion"""
    query = """
        INSERT INTO proactive_suggestions (user_id, suggestion_type, suggestion_text, reason, priority)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id
    """
    result = db_pool.execute_one(query, (user_id, suggestion_type, suggestion_text, reason, priority))
    return result.get("id") if result else None

def get_proactive_suggestions(user_id: str, limit: int = 5) -> List[Dict]:
    """Get proactive suggestions"""
    query = """
        SELECT * FROM proactive_suggestions
        WHERE user_id = %s AND shown_at IS NULL AND dismissed = FALSE
        ORDER BY priority DESC, created_at DESC
        LIMIT %s
    """
    return db_pool.execute_many(query, (user_id, limit))

# =============================================================================
# ACHIEVEMENTS FUNCTIONS
# =============================================================================

def record_achievement(user_id: str, achievement_type: str, achievement_name: str, 
                      achievement_description: str, value_achieved: Optional[float] = None) -> Optional[int]:
    """Record an achievement"""
    query = """
        INSERT INTO achievements (user_id, achievement_type, achievement_name, achievement_description, value_achieved)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id
    """
    result = db_pool.execute_one(query, (user_id, achievement_type, achievement_name, achievement_description, value_achieved))
    return result.get("id") if result else None

def get_recent_achievements(user_id: str, days: int = 30) -> List[Dict]:
    """Get recent achievements"""
    query = """
        SELECT * FROM achievements
        WHERE user_id = %s AND earned_at >= NOW() - INTERVAL '%s days'
        ORDER BY earned_at DESC
    """
    return db_pool.execute_many(query, (user_id, days))

# =============================================================================
# VOICE INTERACTION FUNCTIONS
# =============================================================================

def log_voice_interaction(user_id: str, audio_url: str, transcription: str, 
                         response_text: str, response_audio_url: str, 
                         duration: int) -> Optional[int]:
    """Log a voice interaction"""
    query = """
        INSERT INTO voice_interactions (
            user_id, audio_file_url, transcription, response_text, 
            response_audio_url, duration_seconds
        ) VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id
    """
    result = db_pool.execute_one(query, (user_id, audio_url, transcription, response_text, response_audio_url, duration))
    return result.get("id") if result else None


