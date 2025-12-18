"""
Additional API Endpoints for Aria
Webhooks, social features, analytics, race management, data export, voice, real-time, multi-language
"""
from fastapi import APIRouter, HTTPException, Request, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
import logging
import json

# Import services
from notifications import notification_service
from video_analysis import video_analysis_service
from social_features import *
from advanced_analytics import analytics_service
from src.rate_limit import apply_rate_limit

logger = logging.getLogger(__name__)

# Create routers
webhook_router = APIRouter(prefix="/webhooks", tags=["Webhooks"])
social_router = APIRouter(prefix="/social", tags=["Social"])
analytics_router = APIRouter(prefix="/analytics", tags=["Analytics"])
race_router = APIRouter(prefix="/race", tags=["Race Management"])
export_router = APIRouter(prefix="/export", tags=["Data Export"])
voice_router = APIRouter(prefix="/voice", tags=["Voice"])
realtime_router = APIRouter(prefix="/realtime", tags=["Real-time"])
equipment_router = APIRouter(prefix="/equipment", tags=["Equipment"])
gamification_router = APIRouter(prefix="/gamification", tags=["Gamification"])

# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class WebhookPayload(BaseModel):
    event: str
    data: Dict[str, Any]
    timestamp: Optional[str] = None

class FollowRequest(BaseModel):
    follower_id: str
    following_id: str

class MessageRequest(BaseModel):
    sender_id: str
    recipient_id: str
    message: str

class GroupCreate(BaseModel):
    creator_id: str
    name: str
    description: Optional[str] = None
    is_private: bool = False

class LeaderboardUpdate(BaseModel):
    user_id: str
    leaderboard_type: str
    metric_value: float
    metric_unit: str = "seconds"
    period: str = "all_time"

class ActivityPost(BaseModel):
    user_id: str
    activity_type: str
    activity_data: Dict[str, Any]
    is_public: bool = True

class RaceCreate(BaseModel):
    user_id: str
    race_name: str
    race_date: date
    race_distance: str
    race_location: str
    goal_time: Optional[float] = None

class RaceResult(BaseModel):
    race_id: int
    user_id: str
    finish_time: float
    placement: Optional[int] = None
    notes: Optional[str] = None

class EquipmentLog(BaseModel):
    user_id: str
    equipment_type: str
    brand: str
    model: str
    purchase_date: date
    initial_mileage: float = 0.0

class EquipmentUsage(BaseModel):
    equipment_id: int
    miles_added: float
    date: date

class ChallengeCreate(BaseModel):
    challenge_name: str
    description: str
    challenge_type: str
    start_date: date
    end_date: date
    goal_value: float
    is_public: bool = True

# =============================================================================
# WEBHOOK ENDPOINTS
# =============================================================================

@webhook_router.post("/receive")
async def receive_webhook(payload: WebhookPayload):
    """Receive webhook from TrackLit platform"""
    try:
        logger.info(f"Webhook received: {payload.event}")
        
        # Process based on event type
        if payload.event == "training_session_completed":
            # Trigger proactive analysis
            user_id = payload.data.get("user_id")
            if user_id:
                # Could trigger background analysis task here
                pass
        
        elif payload.event == "goal_created":
            # Send encouragement notification
            user_id = payload.data.get("user_id")
            if user_id:
                await notification_service.send_push_notification(
                    user_id,
                    "🎯 Goal Set!",
                    f"Let's crush this goal together: {payload.data.get('goal_name')}",
                    {"type": "goal_created"}
                )
        
        return {"success": True, "event": payload.event, "processed_at": datetime.now().isoformat()}
        
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@webhook_router.post("/send-test")
async def send_test_webhook():
    """Send test webhook to TrackLit"""
    result = await notification_service.send_webhook(
        "test_event",
        {"message": "Test webhook from Aria", "timestamp": datetime.now().isoformat()}
    )
    return result

# =============================================================================
# SOCIAL ENDPOINTS
# =============================================================================

@social_router.post("/follow")
@apply_rate_limit("general")
async def follow_athlete_endpoint(request: Request, follow_req: FollowRequest):
    """Follow another athlete"""
    result = follow_athlete(follow_req.follower_id, follow_req.following_id)
    
    if result.get("success"):
        # Send notification to followed athlete
        await notification_service.send_push_notification(
            follow_req.following_id,
            "New Follower!",
            f"You have a new follower on Aria",
            {"type": "new_follower", "follower_id": follow_req.follower_id}
        )
    
    return result


@social_router.post("/unfollow")
@apply_rate_limit("general")
async def unfollow_athlete_endpoint(request: Request, follow_req: FollowRequest):
    """Unfollow an athlete"""
    success = unfollow_athlete(follow_req.follower_id, follow_req.following_id)
    return {"success": success}


@social_router.get("/followers/{user_id}")
@apply_rate_limit("general")
async def get_followers_endpoint(request: Request, user_id: str):
    """Get list of followers"""
    followers = get_followers(user_id)
    return {"followers": followers, "count": len(followers)}


@social_router.get("/following/{user_id}")
@apply_rate_limit("general")
async def get_following_endpoint(request: Request, user_id: str):
    """Get list of athletes user is following"""
    following = get_following(user_id)
    return {"following": following, "count": len(following)}


@social_router.post("/message/send")
@apply_rate_limit("general")
async def send_message_endpoint(request: Request, msg_req: MessageRequest):
    """Send direct message"""
    result = send_message(msg_req.sender_id, msg_req.recipient_id, msg_req.message)
    
    if result.get("success"):
        # Send push notification
        await notification_service.send_push_notification(
            msg_req.recipient_id,
            "New Message",
            msg_req.message[:100],
            {"type": "new_message", "sender_id": msg_req.sender_id}
        )
    
    return result


@social_router.get("/messages/{user_id}")
@apply_rate_limit("general")
async def get_messages_endpoint(request: Request, user_id: str, conversation_with: Optional[str] = None):
    """Get messages for user"""
    messages = get_messages(user_id, conversation_with)
    return {"messages": messages, "count": len(messages)}


@social_router.post("/group/create")
@apply_rate_limit("general")
async def create_group_endpoint(request: Request, group: GroupCreate):
    """Create training group"""
    return create_training_group(group.creator_id, group.name, group.description, group.is_private)


@social_router.post("/group/join/{group_id}")
@apply_rate_limit("general")
async def join_group_endpoint(request: Request, group_id: int, user_id: str):
    """Join training group"""
    return join_training_group(user_id, group_id)


@social_router.get("/groups/{user_id}")
@apply_rate_limit("general")
async def get_user_groups_endpoint(request: Request, user_id: str):
    """Get user's training groups"""
    groups = get_user_groups(user_id)
    return {"groups": groups, "count": len(groups)}


@social_router.post("/leaderboard/update")
@apply_rate_limit("general")
async def update_leaderboard_endpoint(request: Request, entry: LeaderboardUpdate):
    """Update leaderboard entry"""
    return update_leaderboard_entry(
        entry.user_id,
        entry.leaderboard_type,
        entry.metric_value,
        entry.metric_unit,
        entry.period
    )


@social_router.get("/leaderboard/{leaderboard_type}")
@apply_rate_limit("general")
async def get_leaderboard_endpoint(
    request: Request,
    leaderboard_type: str,
    period: str = "all_time",
    limit: int = 100
):
    """Get leaderboard rankings"""
    leaderboard = get_leaderboard(leaderboard_type, period, limit)
    return {"leaderboard": leaderboard, "count": len(leaderboard)}


@social_router.get("/leaderboard/{leaderboard_type}/rank/{user_id}")
@apply_rate_limit("general")
async def get_user_rank_endpoint(
    request: Request,
    leaderboard_type: str,
    user_id: str,
    period: str = "all_time"
):
    """Get user's rank"""
    return get_user_rank(user_id, leaderboard_type, period)


@social_router.get("/feed/{user_id}")
@apply_rate_limit("general")
async def get_activity_feed_endpoint(request: Request, user_id: str, limit: int = 50):
    """Get activity feed"""
    feed = get_activity_feed(user_id, limit)
    return {"feed": feed, "count": len(feed)}


@social_router.post("/activity/post")
@apply_rate_limit("general")
async def post_activity_endpoint(request: Request, activity: ActivityPost):
    """Post activity to feed"""
    return post_activity(activity.user_id, activity.activity_type, activity.activity_data, activity.is_public)


@social_router.post("/activity/{activity_id}/react")
@apply_rate_limit("general")
async def add_reaction_endpoint(request: Request, activity_id: int, user_id: str, reaction_type: str = "like"):
    """Add reaction to activity"""
    return add_reaction(user_id, activity_id, reaction_type)


@social_router.post("/activity/{activity_id}/comment")
@apply_rate_limit("general")
async def add_comment_endpoint(request: Request, activity_id: int, user_id: str, comment: str):
    """Add comment to activity"""
    return add_comment(user_id, activity_id, comment)


@social_router.get("/activity/{activity_id}/comments")
@apply_rate_limit("general")
async def get_activity_comments_endpoint(request: Request, activity_id: int):
    """Get activity comments"""
    comments = get_activity_comments(activity_id)
    return {"comments": comments, "count": len(comments)}

# =============================================================================
# ANALYTICS ENDPOINTS
# =============================================================================

@analytics_router.get("/trends/{user_id}")
@apply_rate_limit("general")
async def get_trends_endpoint(
    request: Request,
    user_id: str,
    metric_type: str = "100m_time",
    days: int = 90
):
    """Get performance trends"""
    return await analytics_service.get_performance_trends(user_id, metric_type, days)


@analytics_router.get("/predict-pr/{user_id}")
@apply_rate_limit("general")
async def predict_pr_endpoint(
    request: Request,
    user_id: str,
    event: str = "100m",
    training_days: int = 90
):
    """Predict personal record"""
    return await analytics_service.predict_personal_record(user_id, event, training_days)


@analytics_router.get("/training-load/{user_id}")
@apply_rate_limit("general")
async def training_load_endpoint(request: Request, user_id: str, days: int = 28):
    """Calculate training load and ACWR"""
    return await analytics_service.calculate_training_load(user_id, days)


@analytics_router.get("/percentile/{user_id}")
@apply_rate_limit("general")
async def percentile_endpoint(
    request: Request,
    user_id: str,
    metric_type: str = "100m_time",
    comparison_group: str = "all"
):
    """Get percentile ranking"""
    return await analytics_service.get_percentile_ranking(user_id, metric_type, comparison_group)


@analytics_router.get("/insights/{user_id}")
@apply_rate_limit("general")
async def insights_dashboard_endpoint(request: Request, user_id: str):
    """Get comprehensive insights dashboard"""
    return await analytics_service.generate_insights_dashboard(user_id)

# =============================================================================
# ENHANCED VIDEO ANALYSIS
# =============================================================================

@analytics_router.post("/video/analyze")
@apply_rate_limit("ask_media")
async def analyze_video_endpoint(
    request: Request,
    user_id: str = Form(...),
    video: UploadFile = File(...)
):
    """Analyze video with pose estimation and biomechanics"""
    try:
        video_data = await video.read()
        result = await video_analysis_service.analyze_video_full(
            user_id,
            video_data,
            video.filename
        )
        
        if result.get("success"):
            # Generate feedback
            aggregate_metrics = result.get("aggregate_metrics", {})
            feedback = await video_analysis_service.generate_feedback(aggregate_metrics)
            result["feedback"] = feedback
        
        return result
        
    except Exception as e:
        logger.error(f"Error analyzing video: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# RACE MANAGEMENT ENDPOINTS
# =============================================================================

from race_management import (
    register_race, get_user_races, get_prep_plan, get_race_checklist,
    update_checklist_progress, record_race_result, get_race_results,
    analyze_race_performance, create_warmup_routine, get_warmup_routines
)

@race_router.post("/register")
@apply_rate_limit("general")
async def register_race_endpoint(request: Request, race: RaceCreate):
    """Register for a race"""
    return register_race(
        race.user_id,
        race.race_name,
        race.race_date,
        race.race_distance,
        race.race_location,
        race.goal_time
    )

@race_router.get("/{user_id}/races")
@apply_rate_limit("general")
async def get_races_endpoint(request: Request, user_id: str, status: Optional[str] = None):
    """Get user's races"""
    races = get_user_races(user_id, status)
    return {"races": races, "count": len(races)}

@race_router.get("/{race_id}/prep-plan")
@apply_rate_limit("general")
async def get_prep_plan_endpoint(request: Request, race_id: int):
    """Get race preparation plan"""
    plan = get_prep_plan(race_id)
    return {"plan": plan}

@race_router.get("/{race_id}/checklist")
@apply_rate_limit("general")
async def get_checklist_endpoint(request: Request, race_id: int):
    """Get race day checklist"""
    return get_race_checklist(race_id)

@race_router.post("/{race_id}/checklist/complete")
@apply_rate_limit("general")
async def complete_checklist_item_endpoint(request: Request, race_id: int, item: str):
    """Mark checklist item as completed"""
    success = update_checklist_progress(race_id, item)
    return {"success": success}

@race_router.post("/result")
@apply_rate_limit("general")
async def record_result_endpoint(request: Request, result: RaceResult):
    """Record race result"""
    return record_race_result(
        result.race_id,
        result.user_id,
        result.finish_time,
        result.placement,
        result.notes
    )

@race_router.get("/{user_id}/results")
@apply_rate_limit("general")
async def get_results_endpoint(request: Request, user_id: str):
    """Get race results"""
    results = get_race_results(user_id)
    return {"results": results, "count": len(results)}

# =============================================================================
# DATA EXPORT ENDPOINTS
# =============================================================================

from data_export import export_user_data, import_user_data, delete_user_data, request_data_deletion, get_data_access_logs

@export_router.get("/{user_id}/export")
@apply_rate_limit("general")
async def export_data_endpoint(request: Request, user_id: str, format: str = "json"):
    """Export user data (GDPR Article 20)"""
    return await export_user_data(user_id, format)

@export_router.post("/{user_id}/import")
@apply_rate_limit("general")
async def import_data_endpoint(request: Request, user_id: str, data: Dict[str, Any]):
    """Import user data"""
    return await import_user_data(user_id, data)

@export_router.post("/{user_id}/request-deletion")
@apply_rate_limit("general")
async def request_deletion_endpoint(request: Request, user_id: str, email: str):
    """Request data deletion (GDPR Article 17)"""
    return await request_data_deletion(user_id, email)

@export_router.delete("/{user_id}/delete")
@apply_rate_limit("general")
async def delete_data_endpoint(request: Request, user_id: str, verification_code: str):
    """Permanently delete user data"""
    return await delete_user_data(user_id, verification_code)

@export_router.get("/{user_id}/access-logs")
@apply_rate_limit("general")
async def get_access_logs_endpoint(request: Request, user_id: str):
    """Get data access logs (GDPR Article 15)"""
    logs = get_data_access_logs(user_id)
    return {"logs": logs, "count": len(logs)}

# =============================================================================
# EQUIPMENT TRACKING ENDPOINTS
# =============================================================================

from equipment_tracking import (
    add_equipment, log_equipment_usage, get_user_equipment,
    get_equipment_alerts, retire_equipment, get_equipment_analytics
)

@equipment_router.post("/add")
@apply_rate_limit("general")
async def add_equipment_endpoint(request: Request, equipment: EquipmentLog):
    """Add equipment to inventory"""
    return add_equipment(
        equipment.user_id,
        equipment.equipment_type,
        equipment.brand,
        equipment.model,
        equipment.purchase_date,
        equipment.initial_mileage
    )

@equipment_router.post("/{equipment_id}/log-usage")
@apply_rate_limit("general")
async def log_usage_endpoint(request: Request, equipment_id: int, usage: EquipmentUsage):
    """Log equipment usage"""
    return log_equipment_usage(
        equipment_id,
        usage.user_id,
        usage.miles_added,
        usage.date
    )

@equipment_router.get("/{user_id}/equipment")
@apply_rate_limit("general")
async def get_equipment_endpoint(request: Request, user_id: str, status: Optional[str] = None):
    """Get user's equipment"""
    equipment = get_user_equipment(user_id, status)
    return {"equipment": equipment, "count": len(equipment)}

@equipment_router.get("/{user_id}/alerts")
@apply_rate_limit("general")
async def get_alerts_endpoint(request: Request, user_id: str):
    """Get equipment replacement alerts"""
    alerts = get_equipment_alerts(user_id)
    return {"alerts": alerts, "count": len(alerts)}

@equipment_router.post("/{equipment_id}/retire")
@apply_rate_limit("general")
async def retire_equipment_endpoint(request: Request, equipment_id: int, user_id: str, notes: Optional[str] = None):
    """Retire equipment"""
    return retire_equipment(equipment_id, user_id, notes)

@equipment_router.get("/{user_id}/analytics")
@apply_rate_limit("general")
async def equipment_analytics_endpoint(request: Request, user_id: str):
    """Get equipment analytics"""
    return get_equipment_analytics(user_id)

# =============================================================================
# GAMIFICATION ENDPOINTS
# =============================================================================

from gamification import (
    award_xp, get_user_level_info, update_streak, get_user_achievements,
    create_virtual_race, register_for_virtual_race, get_active_virtual_races
)

@gamification_router.post("/xp/award")
@apply_rate_limit("general")
async def award_xp_endpoint(request: Request, user_id: str, action_type: str, description: Optional[str] = None):
    """Award XP for action"""
    return award_xp(user_id, action_type, description)

@gamification_router.get("/{user_id}/level")
@apply_rate_limit("general")
async def get_level_endpoint(request: Request, user_id: str):
    """Get user level and XP info"""
    return get_user_level_info(user_id)

@gamification_router.post("/{user_id}/streak")
@apply_rate_limit("general")
async def update_streak_endpoint(request: Request, user_id: str):
    """Update training streak"""
    return update_streak(user_id)

@gamification_router.get("/{user_id}/achievements")
@apply_rate_limit("general")
async def get_achievements_endpoint(request: Request, user_id: str):
    """Get user achievements"""
    achievements = get_user_achievements(user_id)
    return {"achievements": achievements, "count": len(achievements)}

@gamification_router.post("/virtual-race/create")
@apply_rate_limit("general")
async def create_virtual_race_endpoint(request: Request, challenge: ChallengeCreate):
    """Create virtual race"""
    return create_virtual_race(
        challenge.challenge_name,
        challenge.description,
        "100m",  # Default distance
        challenge.start_date,
        challenge.end_date,
        500
    )

@gamification_router.post("/virtual-race/{virtual_race_id}/register")
@apply_rate_limit("general")
async def register_virtual_race_endpoint(request: Request, virtual_race_id: int, user_id: str):
    """Register for virtual race"""
    return register_for_virtual_race(user_id, virtual_race_id)

@gamification_router.get("/virtual-races")
@apply_rate_limit("general")
async def get_virtual_races_endpoint(request: Request):
    """Get active virtual races"""
    races = get_active_virtual_races()
    return {"races": races, "count": len(races)}

# Voice and Real-time routers are placeholders - would need Azure Speech Services and WebSocket implementation
@voice_router.get("/status")
async def voice_status():
    """Voice integration status"""
    return {"status": "not_implemented", "message": "Voice integration requires Azure Speech Services"}

@realtime_router.get("/status")
async def realtime_status():
    """Real-time coaching status"""
    return {"status": "not_implemented", "message": "Real-time coaching requires WebSocket implementation"}

# Export all routers
__all__ = [
    "webhook_router",
    "social_router",
    "analytics_router",
    "race_router",
    "export_router",
    "voice_router",
    "realtime_router",
    "equipment_router",
    "gamification_router"
]

