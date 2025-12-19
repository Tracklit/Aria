"""
API Endpoints for Aria AI Companion Features
Conversation history, training sessions, progress tracking, calendar, injuries,
drills, goals, nutrition, mental performance, and proactive engagement.
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, date, time
import uuid
import logging

from src.database_extensions import *
from src.rate_limit import apply_rate_limit
from src.cache_utils import (
    get_cached, set_cached, delete_cached, build_key, delete_pattern,
    invalidate_user_cache, invalidate_drills_cache, 
    invalidate_progress_cache, invalidate_achievements_cache,
    invalidate_mental_cache
)
from ai_companion_logic import (
    generate_proactive_suggestions,
    analyze_training_patterns,
    recommend_drills_for_user,
    analyze_goal_progress,
    schedule_smart_check_ins,
    analyze_user_comprehensive
)

logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class ConversationMessage(BaseModel):
    user_id: str
    session_id: Optional[str] = None
    message: str
    context: Optional[Dict] = None

class TrainingSession(BaseModel):
    user_id: str
    session_date: date
    session_type: Optional[str] = None
    duration_minutes: Optional[int] = None
    distance_meters: Optional[float] = None
    workout_description: Optional[str] = None
    splits: Optional[List[float]] = None
    heart_rate: Optional[Dict] = None
    rpe: Optional[int] = None
    notes: Optional[str] = None
    mood_before: Optional[str] = None
    mood_after: Optional[str] = None
    injuries_reported: Optional[str] = None
    weather_conditions: Optional[str] = None
    location: Optional[str] = None

class ProgressMetric(BaseModel):
    user_id: str
    metric_type: str
    metric_value: float
    metric_unit: str
    metric_date: date
    notes: Optional[str] = None

class CalendarEvent(BaseModel):
    user_id: str
    event_type: str
    event_title: str
    event_date: date
    event_time: Optional[time] = None
    duration_minutes: Optional[int] = None
    description: Optional[str] = None
    location: Optional[str] = None
    priority: Optional[str] = "medium"

class InjuryReport(BaseModel):
    user_id: str
    injury_type: str
    body_part: str
    severity: Optional[str] = "moderate"
    onset_date: date
    description: Optional[str] = None
    treatment_plan: Optional[str] = None

class PainLog(BaseModel):
    user_id: str
    log_date: date
    pain_level: int  # 1-10
    body_part: str
    injury_id: Optional[int] = None
    activity_at_time: Optional[str] = None
    notes: Optional[str] = None

class Goal(BaseModel):
    user_id: str
    goal_type: str
    goal_title: str
    goal_description: Optional[str] = None
    target_value: Optional[float] = None
    target_unit: Optional[str] = None
    target_date: Optional[date] = None
    current_value: Optional[float] = 0
    priority: Optional[str] = "medium"

class NutritionLog(BaseModel):
    user_id: str
    log_date: date
    meal_type: str
    meal_description: str
    calories: Optional[int] = None
    protein_grams: Optional[float] = None
    carbs_grams: Optional[float] = None
    fats_grams: Optional[float] = None
    hydration_ml: Optional[int] = None
    timing: Optional[time] = None
    notes: Optional[str] = None

class HydrationLog(BaseModel):
    user_id: str
    log_date: date
    log_time: time
    amount_ml: int
    beverage_type: Optional[str] = "water"

class MentalPerformanceLog(BaseModel):
    user_id: str
    log_date: date
    log_type: str
    mood: Optional[str] = None
    stress_level: Optional[int] = None
    confidence_level: Optional[int] = None
    focus_quality: Optional[int] = None
    sleep_quality: Optional[int] = None
    anxiety_level: Optional[int] = None
    notes: Optional[str] = None
    techniques_used: Optional[List[str]] = None
    duration_minutes: Optional[int] = None

# =============================================================================
# CONVERSATION HISTORY ENDPOINTS
# =============================================================================

@router.post("/conversations")
@apply_rate_limit("general")
async def save_conversation_message(request: Request, msg: ConversationMessage):
    """Save a conversation message"""
    try:
        session_id = msg.session_id or str(uuid.uuid4())
        conversation_id = save_conversation(
            user_id=msg.user_id,
            session_id=session_id,
            role="user",
            message=msg.message,
            context=msg.context
        )
        
        if conversation_id:
            return {
                "success": True,
                "conversation_id": conversation_id,
                "session_id": session_id
            }
        raise HTTPException(status_code=500, detail="Failed to save conversation")
    except Exception as e:
        logger.error(f"Error saving conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/conversations/{user_id}")
async def get_conversations(user_id: str, session_id: Optional[str] = None, limit: int = 50):
    """Get conversation history"""
    try:
        conversations = get_conversation_history(user_id, session_id, limit)
        return {
            "success": True,
            "conversations": conversations,
            "count": len(conversations)
        }
    except Exception as e:
        logger.error(f"Error retrieving conversations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/conversations/{user_id}/context")
async def get_conversation_context(user_id: str, hours: int = 24):
    """Get recent conversation context for continuity"""
    try:
        context = get_recent_context(user_id, hours)
        return {
            "success": True,
            "context": context,
            "hours": hours
        }
    except Exception as e:
        logger.error(f"Error retrieving context: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# TRAINING SESSION ENDPOINTS
# =============================================================================

@router.post("/sessions")
@apply_rate_limit("general")
async def log_session(request: Request, session: TrainingSession):
    """Log a training session"""
    try:
        session_dict = session.model_dump()
        session_id = log_training_session(session_dict)
        
        if session_id:
            # Invalidate caches affected by new session
            invalidate_progress_cache(session.user_id)
            invalidate_drills_cache(session.user_id)
            
            return {
                "success": True,
                "session_id": session_id,
                "message": "Training session logged successfully"
            }
        raise HTTPException(status_code=500, detail="Failed to log session")
    except Exception as e:
        logger.error(f"Error logging session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions/{user_id}")
async def get_sessions(
    user_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 30
):
    """Get training sessions"""
    try:
        sessions = get_training_sessions(user_id, start_date, end_date, limit)
        return {
            "success": True,
            "sessions": sessions,
            "count": len(sessions)
        }
    except Exception as e:
        logger.error(f"Error retrieving sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# PROGRESS & ANALYTICS ENDPOINTS
# =============================================================================

@router.post("/progress/track")
@apply_rate_limit("general")
async def track_metric(request: Request, metric: ProgressMetric):
    """Track a progress metric"""
    try:
        metric_id = track_progress_metric(
            user_id=metric.user_id,
            metric_type=metric.metric_type,
            metric_value=metric.metric_value,
            metric_unit=metric.metric_unit,
            metric_date=str(metric.metric_date),
            notes=metric.notes
        )
        
        if metric_id:
            # Invalidate progress cache
            invalidate_progress_cache(metric.user_id)
            
            return {
                "success": True,
                "metric_id": metric_id,
                "message": "Progress metric tracked successfully"
            }
        raise HTTPException(status_code=500, detail="Failed to track metric")
    except Exception as e:
        logger.error(f"Error tracking metric: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/progress/{user_id}")
async def get_progress(
    user_id: str,
    metric_type: Optional[str] = None,
    days: int = 90
):
    """Get progress analytics (cached 30 minutes)"""
    # Check cache first
    cache_key = build_key("progress", "analytics", user_id, metric_type or "all", days)
    cached_result = get_cached(cache_key)
    if cached_result:
        logger.debug(f"Cache HIT: progress analytics for {user_id}")
        return cached_result
    
    try:
        analytics = get_progress_analytics(user_id, metric_type, days)
        result = {
            "success": True,
            "analytics": analytics,
            "days": days
        }
        
        # Cache for 30 minutes
        set_cached(cache_key, result, 1800)
        
        return result
    except Exception as e:
        logger.error(f"Error retrieving progress: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# CALENDAR ENDPOINTS
# =============================================================================

@router.post("/calendar/events")
@apply_rate_limit("general")
async def create_event(request: Request, event: CalendarEvent):
    """Create a calendar event"""
    try:
        event_dict = event.model_dump()
        event_id = create_calendar_event(event_dict)
        
        if event_id:
            return {
                "success": True,
                "event_id": event_id,
                "message": "Calendar event created successfully"
            }
        raise HTTPException(status_code=500, detail="Failed to create event")
    except Exception as e:
        logger.error(f"Error creating event: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/calendar/{user_id}")
async def get_calendar(user_id: str, start_date: str, end_date: str):
    """Get calendar events"""
    try:
        events = get_calendar_events(user_id, start_date, end_date)
        return {
            "success": True,
            "events": events,
            "count": len(events)
        }
    except Exception as e:
        logger.error(f"Error retrieving calendar: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# INJURY TRACKING ENDPOINTS
# =============================================================================

@router.post("/injuries/report")
@apply_rate_limit("general")
async def report_injury_endpoint(request: Request, injury: InjuryReport):
    """Report a new injury"""
    try:
        injury_dict = injury.model_dump()
        injury_id = report_injury(injury_dict)
        
        if injury_id:
            return {
                "success": True,
                "injury_id": injury_id,
                "message": "Injury reported successfully"
            }
        raise HTTPException(status_code=500, detail="Failed to report injury")
    except Exception as e:
        logger.error(f"Error reporting injury: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/pain/track")
@apply_rate_limit("general")
async def track_pain(request: Request, pain: PainLog):
    """Log pain level"""
    try:
        pain_id = log_pain(
            user_id=pain.user_id,
            log_date=str(pain.log_date),
            pain_level=pain.pain_level,
            body_part=pain.body_part,
            injury_id=pain.injury_id,
            activity=pain.activity_at_time,
            notes=pain.notes
        )
        
        if pain_id:
            return {
                "success": True,
                "pain_log_id": pain_id,
                "message": "Pain level logged successfully"
            }
        raise HTTPException(status_code=500, detail="Failed to log pain")
    except Exception as e:
        logger.error(f"Error logging pain: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/injuries/{user_id}/history")
async def get_injuries(user_id: str, include_recovered: bool = False):
    """Get injury history"""
    try:
        injuries = get_injury_history(user_id, include_recovered)
        return {
            "success": True,
            "injuries": injuries,
            "count": len(injuries)
        }
    except Exception as e:
        logger.error(f"Error retrieving injuries: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/pain/{user_id}/history")
async def get_pain(user_id: str, days: int = 30):
    """Get pain history"""
    try:
        pain_logs = get_pain_history(user_id, days)
        return {
            "success": True,
            "pain_logs": pain_logs,
            "days": days
        }
    except Exception as e:
        logger.error(f"Error retrieving pain history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# DRILL LIBRARY ENDPOINTS
# =============================================================================

@router.get("/drills/recommended/{user_id}")
async def get_drills(user_id: str, limit: int = 10):
    """Get recommended drills (cached 1 hour)"""
    # Check cache first
    cache_key = build_key("drills", "recommended", user_id, limit)
    cached_result = get_cached(cache_key)
    if cached_result:
        logger.debug(f"Cache HIT: drill recommendations for {user_id}")
        return cached_result
    
    try:
        drills = get_recommended_drills(user_id, limit)
        result = {
            "success": True,
            "drills": drills,
            "count": len(drills)
        }
        
        # Cache for 1 hour
        set_cached(cache_key, result, 3600)
        
        return result
    except Exception as e:
        logger.error(f"Error retrieving drills: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/drills/search")
async def search_drills_endpoint(
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    tags: Optional[List[str]] = None
):
    """Search drills library"""
    try:
        drills = search_drills(category, difficulty, tags)
        return {
            "success": True,
            "drills": drills,
            "count": len(drills)
        }
    except Exception as e:
        logger.error(f"Error searching drills: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# GOALS ENDPOINTS
# =============================================================================

@router.post("/goals")
@apply_rate_limit("general")
async def create_goal_endpoint(request: Request, goal: Goal):
    """Create a new goal"""
    try:
        goal_dict = goal.model_dump()
        goal_id = create_goal(goal_dict)
        
        if goal_id:
            # Invalidate user cache since new goal affects recommendations
            invalidate_user_cache(goal.user_id)
            
            return {
                "success": True,
                "goal_id": goal_id,
                "message": "Goal created successfully"
            }
        raise HTTPException(status_code=500, detail="Failed to create goal")
    except Exception as e:
        logger.error(f"Error creating goal: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/goals/{user_id}")
async def get_goals(user_id: str):
    """Get active goals"""
    try:
        goals = get_active_goals(user_id)
        return {
            "success": True,
            "goals": goals,
            "count": len(goals)
        }
    except Exception as e:
        logger.error(f"Error retrieving goals: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/goals/{goal_id}/progress")
@apply_rate_limit("general")
async def update_goal_progress_endpoint(request: Request, goal_id: int, current_value: float):
    """Update goal progress"""
    try:
        success = update_goal_progress(goal_id, current_value)
        if success:
            # Invalidate achievements cache since goal progress may trigger achievement
            # Note: We don't have user_id here, so invalidate all achievements
            delete_pattern("achievements:*")
            
            return {
                "success": True,
                "message": "Goal progress updated successfully"
            }
        raise HTTPException(status_code=500, detail="Failed to update goal")
    except Exception as e:
        logger.error(f"Error updating goal: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# NUTRITION ENDPOINTS
# =============================================================================

@router.post("/nutrition/log")
@apply_rate_limit("general")
async def log_nutrition_endpoint(request: Request, nutrition: NutritionLog):
    """Log nutrition entry"""
    try:
        nutrition_dict = nutrition.model_dump()
        nutrition_id = log_nutrition(nutrition_dict)
        
        if nutrition_id:
            return {
                "success": True,
                "nutrition_id": nutrition_id,
                "message": "Nutrition logged successfully"
            }
        raise HTTPException(status_code=500, detail="Failed to log nutrition")
    except Exception as e:
        logger.error(f"Error logging nutrition: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/hydration/track")
@apply_rate_limit("general")
async def track_hydration(request: Request, hydration: HydrationLog):
    """Log hydration"""
    try:
        hydration_id = log_hydration(
            user_id=hydration.user_id,
            log_date=str(hydration.log_date),
            log_time=str(hydration.log_time),
            amount_ml=hydration.amount_ml,
            beverage_type=hydration.beverage_type
        )
        
        if hydration_id:
            return {
                "success": True,
                "hydration_id": hydration_id,
                "message": "Hydration logged successfully"
            }
        raise HTTPException(status_code=500, detail="Failed to log hydration")
    except Exception as e:
        logger.error(f"Error logging hydration: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/nutrition/{user_id}/daily")
async def get_daily_nutrition_summary(user_id: str, log_date: str):
    """Get daily nutrition summary"""
    try:
        summary = get_daily_nutrition(user_id, log_date)
        return {
            "success": True,
            "summary": summary,
            "date": log_date
        }
    except Exception as e:
        logger.error(f"Error retrieving nutrition: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# MENTAL PERFORMANCE ENDPOINTS
# =============================================================================

@router.post("/mental/log")
@apply_rate_limit("general")
async def log_mental(request: Request, mental: MentalPerformanceLog):
    """Log mental performance entry"""
    try:
        mental_dict = mental.model_dump()
        mental_id = log_mental_performance(mental_dict)
        
        if mental_id:
            return {
                "success": True,
                "mental_log_id": mental_id,
                "message": "Mental performance logged successfully"
            }
        raise HTTPException(status_code=500, detail="Failed to log mental performance")
    except Exception as e:
        logger.error(f"Error logging mental performance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/mental/exercises")
async def get_mental_exercises_endpoint(exercise_type: Optional[str] = None):
    """Get mental exercises (cached 24 hours)"""
    # Check cache first
    cache_key = build_key("mental", "exercises", exercise_type or "all")
    cached_result = get_cached(cache_key)
    if cached_result:
        logger.debug(f"Cache HIT: mental exercises")
        return cached_result
    
    try:
        exercises = get_mental_exercises(exercise_type)
        result = {
            "success": True,
            "exercises": exercises,
            "count": len(exercises)
        }
        
        # Cache for 24 hours (static content)
        set_cached(cache_key, result, 86400)
        
        return result
    except Exception as e:
        logger.error(f"Error retrieving mental exercises: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# PROACTIVE ENGAGEMENT ENDPOINTS
# =============================================================================

@router.get("/suggestions/{user_id}")
async def get_suggestions(user_id: str, limit: int = 5):
    """Get proactive suggestions"""
    try:
        suggestions = get_proactive_suggestions(user_id, limit)
        return {
            "success": True,
            "suggestions": suggestions,
            "count": len(suggestions)
        }
    except Exception as e:
        logger.error(f"Error retrieving suggestions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/check-ins/{user_id}")
async def get_checkins(user_id: str):
    """Get pending check-ins"""
    try:
        checkins = get_pending_check_ins(user_id)
        return {
            "success": True,
            "check_ins": checkins,
            "count": len(checkins)
        }
    except Exception as e:
        logger.error(f"Error retrieving check-ins: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# ACHIEVEMENTS ENDPOINTS
# =============================================================================

@router.get("/achievements/{user_id}")
async def get_achievements(user_id: str, days: int = 30):
    """Get recent achievements (cached 1 hour)"""
    # Check cache first
    cache_key = build_key("achievements", user_id, days)
    cached_result = get_cached(cache_key)
    if cached_result:
        logger.debug(f"Cache HIT: achievements for {user_id}")
        return cached_result
    
    try:
        achievements = get_recent_achievements(user_id, days)
        result = {
            "success": True,
            "achievements": achievements,
            "count": len(achievements),
            "days": days
        }
        
        # Cache for 1 hour
        set_cached(cache_key, result, 3600)
        
        return result
    except Exception as e:
        logger.error(f"Error retrieving achievements: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# AI ANALYSIS ENDPOINTS
# =============================================================================

@router.post("/ai/analyze/{user_id}")
@apply_rate_limit("general")
async def trigger_ai_analysis(request: Request, user_id: str):
    """
    Trigger comprehensive AI analysis for a user
    Generates suggestions, analyzes patterns, recommends drills, checks goals
    """
    try:
        results = await analyze_user_comprehensive(user_id)
        return {
            "success": True,
            "analysis": results
        }
    except Exception as e:
        logger.error(f"Error in AI analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai/suggestions/generate/{user_id}")
@apply_rate_limit("general")
async def generate_suggestions(request: Request, user_id: str):
    """Generate proactive suggestions for a user"""
    try:
        suggestions = await generate_proactive_suggestions(user_id)
        return {
            "success": True,
            "suggestions": suggestions,
            "count": len(suggestions)
        }
    except Exception as e:
        logger.error(f"Error generating suggestions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ai/patterns/{user_id}")
async def analyze_patterns(user_id: str):
    """Analyze training patterns for a user"""
    try:
        patterns = await analyze_training_patterns(user_id)
        return {
            "success": True,
            "patterns": patterns
        }
    except Exception as e:
        logger.error(f"Error analyzing patterns: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai/drills/recommend/{user_id}")
@apply_rate_limit("general")
async def recommend_drills(request: Request, user_id: str):
    """Generate personalized drill recommendations"""
    try:
        drills = await recommend_drills_for_user(user_id)
        return {
            "success": True,
            "drills": drills,
            "count": len(drills)
        }
    except Exception as e:
        logger.error(f"Error recommending drills: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai/goals/analyze/{user_id}")
@apply_rate_limit("general")
async def analyze_goals(request: Request, user_id: str):
    """Analyze goal progress and trigger achievements"""
    try:
        analysis = await analyze_goal_progress(user_id)
        return {
            "success": True,
            "analysis": analysis
        }
    except Exception as e:
        logger.error(f"Error analyzing goals: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai/checkins/schedule/{user_id}")
@apply_rate_limit("general")
async def schedule_checkins(request: Request, user_id: str):
    """Schedule smart check-ins for a user"""
    try:
        check_ins = await schedule_smart_check_ins(user_id)
        return {
            "success": True,
            "check_ins": check_ins,
            "count": len(check_ins)
        }
    except Exception as e:
        logger.error(f"Error scheduling check-ins: {e}")
        raise HTTPException(status_code=500, detail=str(e))
