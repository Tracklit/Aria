"""
Race Management System
Handles race registration, preparation plans, race-day guidance, and post-race analysis
"""
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, date, timedelta
from database import get_db_connection
import psycopg2.extras

logger = logging.getLogger(__name__)

# =============================================================================
# DATABASE SCHEMA FUNCTIONS
# =============================================================================

def create_race_tables():
    """Create race management tables"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Races table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS races (
                race_id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                race_name VARCHAR(255) NOT NULL,
                race_date DATE NOT NULL,
                race_distance VARCHAR(50) NOT NULL,
                race_location VARCHAR(255),
                goal_time FLOAT,
                status VARCHAR(50) DEFAULT 'upcoming',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Race preparation plans
        cur.execute("""
            CREATE TABLE IF NOT EXISTS race_prep_plans (
                plan_id SERIAL PRIMARY KEY,
                race_id INTEGER REFERENCES races(race_id),
                week_number INTEGER NOT NULL,
                plan_data JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Race results
        cur.execute("""
            CREATE TABLE IF NOT EXISTS race_results (
                result_id SERIAL PRIMARY KEY,
                race_id INTEGER REFERENCES races(race_id),
                user_id VARCHAR(255) NOT NULL,
                finish_time FLOAT NOT NULL,
                placement INTEGER,
                splits JSONB,
                weather_conditions JSONB,
                notes TEXT,
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Race day checklists
        cur.execute("""
            CREATE TABLE IF NOT EXISTS race_checklists (
                checklist_id SERIAL PRIMARY KEY,
                race_id INTEGER REFERENCES races(race_id),
                checklist_items JSONB NOT NULL,
                completed_items JSONB DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Pre-race warmup routines
        cur.execute("""
            CREATE TABLE IF NOT EXISTS warmup_routines (
                routine_id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                routine_name VARCHAR(255) NOT NULL,
                exercises JSONB NOT NULL,
                duration_minutes INTEGER,
                is_default BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
        logger.info("Race management tables created successfully")
        
    except Exception as e:
        logger.error(f"Error creating race tables: {e}")
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()

# =============================================================================
# RACE CREATION AND MANAGEMENT
# =============================================================================

def register_race(
    user_id: str,
    race_name: str,
    race_date: date,
    race_distance: str,
    race_location: str,
    goal_time: Optional[float] = None
) -> Dict[str, Any]:
    """Register a new race"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cur.execute("""
            INSERT INTO races (user_id, race_name, race_date, race_distance, race_location, goal_time)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING race_id, race_name, race_date, race_distance, status
        """, (user_id, race_name, race_date, race_distance, race_location, goal_time))
        
        race = cur.fetchone()
        conn.commit()
        
        # Generate preparation plan
        generate_prep_plan(race["race_id"], race_date, race_distance)
        
        # Generate race day checklist
        generate_race_checklist(race["race_id"], race_distance)
        
        logger.info(f"Race registered: {race_name} for user {user_id}")
        return {
            "success": True,
            "race": dict(race),
            "message": f"Race '{race_name}' registered successfully"
        }
        
    except Exception as e:
        logger.error(f"Error registering race: {e}")
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        cur.close()
        conn.close()


def get_user_races(user_id: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
    """Get all races for a user"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        if status:
            cur.execute("""
                SELECT * FROM races
                WHERE user_id = %s AND status = %s
                ORDER BY race_date ASC
            """, (user_id, status))
        else:
            cur.execute("""
                SELECT * FROM races
                WHERE user_id = %s
                ORDER BY race_date ASC
            """, (user_id,))
        
        races = cur.fetchall()
        return [dict(race) for race in races]
        
    except Exception as e:
        logger.error(f"Error fetching races: {e}")
        return []
    finally:
        cur.close()
        conn.close()

# =============================================================================
# RACE PREPARATION PLANS
# =============================================================================

def generate_prep_plan(race_id: int, race_date: date, race_distance: str) -> bool:
    """Generate race preparation plan based on distance and date"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        days_until_race = (race_date - date.today()).days
        weeks_until_race = max(1, days_until_race // 7)
        
        # Distance-specific training phases
        training_phases = {
            "100m": {
                "weeks": min(8, weeks_until_race),
                "focus": ["speed", "reaction", "technique", "power"]
            },
            "200m": {
                "weeks": min(10, weeks_until_race),
                "focus": ["speed_endurance", "curve_running", "power", "technique"]
            },
            "400m": {
                "weeks": min(12, weeks_until_race),
                "focus": ["speed_endurance", "lactic_tolerance", "pacing", "mental"]
            }
        }
        
        plan_config = training_phases.get(race_distance, training_phases["100m"])
        plan_weeks = plan_config["weeks"]
        
        # Generate week-by-week plan
        for week in range(1, plan_weeks + 1):
            weeks_out = plan_weeks - week + 1
            
            if weeks_out == 1:
                # Taper week
                plan_data = {
                    "phase": "taper",
                    "volume": "low",
                    "intensity": "moderate",
                    "focus": ["rest", "visualization", "light_technique"],
                    "workouts": [
                        {"day": "Monday", "type": "light_speed", "description": "Short accelerations, 50-60% effort"},
                        {"day": "Tuesday", "type": "active_recovery", "description": "Light jog, mobility work"},
                        {"day": "Wednesday", "type": "technique", "description": "Form drills, starts practice"},
                        {"day": "Thursday", "type": "rest", "description": "Complete rest"},
                        {"day": "Friday", "type": "activation", "description": "Very light warmup, mental prep"},
                        {"day": "Saturday", "type": "race_day", "description": "RACE DAY!"}
                    ]
                }
            elif weeks_out <= 3:
                # Peak phase
                plan_data = {
                    "phase": "peak",
                    "volume": "moderate",
                    "intensity": "high",
                    "focus": plan_config["focus"],
                    "workouts": generate_peak_workouts(race_distance)
                }
            elif weeks_out <= plan_weeks // 2:
                # Build phase
                plan_data = {
                    "phase": "build",
                    "volume": "high",
                    "intensity": "moderate",
                    "focus": plan_config["focus"],
                    "workouts": generate_build_workouts(race_distance)
                }
            else:
                # Base phase
                plan_data = {
                    "phase": "base",
                    "volume": "moderate",
                    "intensity": "low_moderate",
                    "focus": ["aerobic_base", "technique", "strength"],
                    "workouts": generate_base_workouts(race_distance)
                }
            
            cur.execute("""
                INSERT INTO race_prep_plans (race_id, week_number, plan_data)
                VALUES (%s, %s, %s)
            """, (race_id, week, psycopg2.extras.Json(plan_data)))
        
        conn.commit()
        logger.info(f"Preparation plan generated for race {race_id}")
        return True
        
    except Exception as e:
        logger.error(f"Error generating prep plan: {e}")
        conn.rollback()
        return False
    finally:
        cur.close()
        conn.close()


def generate_base_workouts(distance: str) -> List[Dict[str, str]]:
    """Generate base phase workouts"""
    return [
        {"day": "Monday", "type": "easy_run", "description": "30 min easy pace + strength training"},
        {"day": "Tuesday", "type": "technique", "description": "Sprint drills, acceleration work"},
        {"day": "Wednesday", "type": "tempo", "description": "20 min tempo run at moderate pace"},
        {"day": "Thursday", "type": "rest", "description": "Rest or active recovery"},
        {"day": "Friday", "type": "hill_sprints", "description": "6-8 x 60m hill sprints"},
        {"day": "Saturday", "type": "long_run", "description": "40-50 min easy aerobic run"},
        {"day": "Sunday", "type": "rest", "description": "Complete rest"}
    ]


def generate_build_workouts(distance: str) -> List[Dict[str, str]]:
    """Generate build phase workouts"""
    if distance == "100m":
        return [
            {"day": "Monday", "type": "acceleration", "description": "10 x 30m flying starts"},
            {"day": "Tuesday", "type": "strength", "description": "Power-focused gym session"},
            {"day": "Wednesday", "type": "speed_endurance", "description": "6 x 150m @ 95% with full recovery"},
            {"day": "Thursday", "type": "active_recovery", "description": "Light jog + stretching"},
            {"day": "Friday", "type": "block_starts", "description": "8-10 x 40m from blocks"},
            {"day": "Saturday", "type": "tempo", "description": "3 x 200m @ 85% pace"},
            {"day": "Sunday", "type": "rest", "description": "Complete rest"}
        ]
    else:
        return [
            {"day": "Monday", "type": "speed_work", "description": "8 x 100m @ 90% with 2-3 min rest"},
            {"day": "Tuesday", "type": "strength", "description": "Lower body power + core"},
            {"day": "Wednesday", "type": "tempo", "description": "30 min sustained tempo"},
            {"day": "Thursday", "type": "rest", "description": "Rest or yoga"},
            {"day": "Friday", "type": "intervals", "description": f"6 x {distance} @ 95% race pace"},
            {"day": "Saturday", "type": "easy_run", "description": "40 min easy recovery"},
            {"day": "Sunday", "type": "rest", "description": "Complete rest"}
        ]


def generate_peak_workouts(distance: str) -> List[Dict[str, str]]:
    """Generate peak phase workouts"""
    return [
        {"day": "Monday", "type": "race_pace", "description": f"4 x {distance} @ race pace with full recovery"},
        {"day": "Tuesday", "type": "light_strength", "description": "Maintenance strength work"},
        {"day": "Wednesday", "type": "speed_work", "description": "Short accelerations at max effort"},
        {"day": "Thursday", "type": "rest", "description": "Complete rest"},
        {"day": "Friday", "type": "sharpening", "description": "3-4 x 60m @ 98% effort"},
        {"day": "Saturday", "type": "active_recovery", "description": "Light movement, visualization"},
        {"day": "Sunday", "type": "rest", "description": "Complete rest"}
    ]


def get_prep_plan(race_id: int) -> List[Dict[str, Any]]:
    """Get race preparation plan"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cur.execute("""
            SELECT * FROM race_prep_plans
            WHERE race_id = %s
            ORDER BY week_number ASC
        """, (race_id,))
        
        plan = cur.fetchall()
        return [dict(week) for week in plan]
        
    except Exception as e:
        logger.error(f"Error fetching prep plan: {e}")
        return []
    finally:
        cur.close()
        conn.close()

# =============================================================================
# RACE DAY CHECKLIST
# =============================================================================

def generate_race_checklist(race_id: int, race_distance: str) -> bool:
    """Generate race day checklist"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        checklist_items = {
            "pre_race_24h": [
                "Hydrate well (8-10 glasses of water)",
                "Eat familiar carb-rich dinner",
                "Lay out race gear and spikes",
                "Check weather forecast",
                "Review race plan and splits",
                "Get 8+ hours of sleep"
            ],
            "race_morning": [
                "Wake up 3-4 hours before race",
                "Eat light breakfast (2-3 hours before)",
                "Double-check all gear is packed",
                "Arrive at venue 90 minutes early",
                "Check in and get race number"
            ],
            "pre_race_warmup": [
                "Begin warmup 60-75 minutes before race",
                "Light jog 10-15 minutes",
                "Dynamic stretching routine",
                "Sprint drills (A-skips, B-skips, high knees)",
                "3-4 x build-ups (50-80m progressive)",
                "2-3 x race pace starts from blocks",
                "Mental visualization"
            ],
            "final_15_minutes": [
                "Stay warm with layers",
                "Sip water (small amounts)",
                "Final bathroom break",
                "Put on spikes",
                "Report to marshalling area",
                "Final mental prep and breathing"
            ]
        }
        
        cur.execute("""
            INSERT INTO race_checklists (race_id, checklist_items)
            VALUES (%s, %s)
        """, (race_id, psycopg2.extras.Json(checklist_items)))
        
        conn.commit()
        logger.info(f"Race checklist generated for race {race_id}")
        return True
        
    except Exception as e:
        logger.error(f"Error generating checklist: {e}")
        conn.rollback()
        return False
    finally:
        cur.close()
        conn.close()


def get_race_checklist(race_id: int) -> Dict[str, Any]:
    """Get race day checklist"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cur.execute("""
            SELECT * FROM race_checklists
            WHERE race_id = %s
        """, (race_id,))
        
        checklist = cur.fetchone()
        return dict(checklist) if checklist else {}
        
    except Exception as e:
        logger.error(f"Error fetching checklist: {e}")
        return {}
    finally:
        cur.close()
        conn.close()


def update_checklist_progress(race_id: int, completed_item: str) -> bool:
    """Mark checklist item as completed"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            UPDATE race_checklists
            SET completed_items = completed_items || %s::jsonb
            WHERE race_id = %s
        """, (psycopg2.extras.Json([completed_item]), race_id))
        
        conn.commit()
        return True
        
    except Exception as e:
        logger.error(f"Error updating checklist: {e}")
        conn.rollback()
        return False
    finally:
        cur.close()
        conn.close()

# =============================================================================
# RACE RESULTS AND POST-RACE ANALYSIS
# =============================================================================

def record_race_result(
    race_id: int,
    user_id: str,
    finish_time: float,
    placement: Optional[int] = None,
    splits: Optional[Dict[str, float]] = None,
    weather_conditions: Optional[Dict[str, Any]] = None,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    """Record race result"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cur.execute("""
            INSERT INTO race_results 
            (race_id, user_id, finish_time, placement, splits, weather_conditions, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING result_id, finish_time, placement
        """, (
            race_id, user_id, finish_time, placement,
            psycopg2.extras.Json(splits) if splits else None,
            psycopg2.extras.Json(weather_conditions) if weather_conditions else None,
            notes
        ))
        
        result = cur.fetchone()
        
        # Update race status
        cur.execute("""
            UPDATE races
            SET status = 'completed'
            WHERE race_id = %s
        """, (race_id,))
        
        conn.commit()
        
        logger.info(f"Race result recorded for race {race_id}")
        return {
            "success": True,
            "result": dict(result),
            "message": "Race result recorded successfully"
        }
        
    except Exception as e:
        logger.error(f"Error recording race result: {e}")
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        cur.close()
        conn.close()


def get_race_results(user_id: str) -> List[Dict[str, Any]]:
    """Get all race results for user"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cur.execute("""
            SELECT 
                rr.*,
                r.race_name,
                r.race_date,
                r.race_distance,
                r.goal_time
            FROM race_results rr
            JOIN races r ON rr.race_id = r.race_id
            WHERE rr.user_id = %s
            ORDER BY r.race_date DESC
        """, (user_id,))
        
        results = cur.fetchall()
        return [dict(result) for result in results]
        
    except Exception as e:
        logger.error(f"Error fetching race results: {e}")
        return []
    finally:
        cur.close()
        conn.close()


def analyze_race_performance(result_id: int) -> Dict[str, Any]:
    """Analyze race performance and provide insights"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cur.execute("""
            SELECT 
                rr.*,
                r.race_name,
                r.race_distance,
                r.goal_time
            FROM race_results rr
            JOIN races r ON rr.race_id = r.race_id
            WHERE rr.result_id = %s
        """, (result_id,))
        
        result = cur.fetchone()
        if not result:
            return {"error": "Result not found"}
        
        result = dict(result)
        analysis = {
            "result_id": result_id,
            "finish_time": result["finish_time"],
            "goal_achieved": False,
            "insights": []
        }
        
        # Compare to goal
        if result["goal_time"]:
            time_diff = result["finish_time"] - result["goal_time"]
            if time_diff <= 0:
                analysis["goal_achieved"] = True
                analysis["insights"].append(f"🎉 Congratulations! You beat your goal by {abs(time_diff):.2f} seconds!")
            else:
                analysis["insights"].append(f"You were {time_diff:.2f} seconds off your goal. Great effort!")
        
        # Analyze splits if available
        if result.get("splits"):
            splits = result["splits"]
            if "50m" in splits and "100m" in splits:
                first_half = splits["50m"]
                second_half = splits["100m"] - splits["50m"]
                
                if second_half > first_half:
                    analysis["insights"].append("Your second half was slower - focus on maintaining speed endurance.")
                else:
                    analysis["insights"].append("Great pacing! You maintained or increased speed in the second half.")
        
        # Weather impact
        if result.get("weather_conditions"):
            weather = result["weather_conditions"]
            if weather.get("wind_speed", 0) > 2.0:
                analysis["insights"].append("Wind conditions may have affected your time.")
        
        return analysis
        
    except Exception as e:
        logger.error(f"Error analyzing race performance: {e}")
        return {"error": str(e)}
    finally:
        cur.close()
        conn.close()

# =============================================================================
# WARMUP ROUTINES
# =============================================================================

def create_warmup_routine(
    user_id: str,
    routine_name: str,
    exercises: List[Dict[str, Any]],
    duration_minutes: int,
    is_default: bool = False
) -> Dict[str, Any]:
    """Create custom warmup routine"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cur.execute("""
            INSERT INTO warmup_routines (user_id, routine_name, exercises, duration_minutes, is_default)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING routine_id, routine_name
        """, (user_id, routine_name, psycopg2.extras.Json(exercises), duration_minutes, is_default))
        
        routine = cur.fetchone()
        conn.commit()
        
        return {
            "success": True,
            "routine": dict(routine),
            "message": "Warmup routine created successfully"
        }
        
    except Exception as e:
        logger.error(f"Error creating warmup routine: {e}")
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        cur.close()
        conn.close()


def get_warmup_routines(user_id: str) -> List[Dict[str, Any]]:
    """Get user's warmup routines"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cur.execute("""
            SELECT * FROM warmup_routines
            WHERE user_id = %s
            ORDER BY is_default DESC, created_at DESC
        """, (user_id,))
        
        routines = cur.fetchall()
        return [dict(routine) for routine in routines]
        
    except Exception as e:
        logger.error(f"Error fetching warmup routines: {e}")
        return []
    finally:
        cur.close()
        conn.close()


# Initialize tables on import
try:
    create_race_tables()
except Exception as e:
    logger.warning(f"Could not create race tables: {e}")
