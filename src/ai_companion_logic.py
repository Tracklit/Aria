"""
AI Companion Logic for Aria
Proactive suggestion generation, pattern recognition, and intelligent recommendations
"""
from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Optional
import logging
from database_extensions import (
    get_training_sessions, 
    get_progress_analytics,
    get_injury_history,
    get_pain_history,
    create_proactive_suggestion,
    schedule_check_in,
    get_active_goals,
    update_goal_progress,
    record_achievement,
    get_recommended_drills,
    add_drill_recommendation,
    search_drills,
    achieve_goal
)
from database import get_athlete_profile

logger = logging.getLogger(__name__)

# =============================================================================
# PROACTIVE SUGGESTION GENERATOR
# =============================================================================

async def generate_proactive_suggestions(user_id: str) -> List[Dict[str, Any]]:
    """
    Analyze user activity patterns and generate timely, relevant suggestions
    
    Returns list of generated suggestions
    """
    logger.info(f"Generating proactive suggestions for user: {user_id}")
    suggestions = []
    
    try:
        # Get recent activity data
        today = date.today()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        recent_sessions = get_training_sessions(
            user_id, 
            start_date=str(week_ago),
            limit=20
        )
        
        # Pattern 1: No training this week
        if len(recent_sessions) == 0:
            suggestion = {
                "suggestion_type": "training_reminder",
                "message": "I noticed you haven't logged any training this week. Want to schedule a workout? 🏃",
                "priority": "medium",
                "context": {"action": "schedule_training", "days_inactive": 7}
            }
            suggestions.append(suggestion)
            create_proactive_suggestion(
                user_id=user_id,
                suggestion_type=suggestion["suggestion_type"],
                message=suggestion["message"],
                priority=suggestion["priority"],
                context=suggestion["context"]
            )
        
        # Pattern 2: Consistent training but no progress metrics
        if len(recent_sessions) >= 3:
            recent_metrics = get_progress_analytics(user_id, days=7)
            if not recent_metrics or len(recent_metrics) == 0:
                suggestion = {
                    "suggestion_type": "progress_tracking",
                    "message": "You've been training consistently! Let's track your progress with a time trial. 📊",
                    "priority": "high",
                    "context": {"action": "suggest_time_trial", "sessions_logged": len(recent_sessions)}
                }
                suggestions.append(suggestion)
                create_proactive_suggestion(
                    user_id=user_id,
                    suggestion_type=suggestion["suggestion_type"],
                    message=suggestion["message"],
                    priority=suggestion["priority"],
                    context=suggestion["context"]
                )
        
        # Pattern 3: High RPE consistently (overtraining risk)
        if len(recent_sessions) >= 3:
            high_rpe_sessions = [s for s in recent_sessions if s.get("rpe") and s.get("rpe") >= 8]
            if len(high_rpe_sessions) >= 3:
                suggestion = {
                    "suggestion_type": "recovery_reminder",
                    "message": f"Your last {len(high_rpe_sessions)} sessions were intense (RPE 8+). Consider a recovery day or lighter workout. 💆",
                    "priority": "high",
                    "context": {"action": "suggest_recovery", "high_rpe_count": len(high_rpe_sessions)}
                }
                suggestions.append(suggestion)
                create_proactive_suggestion(
                    user_id=user_id,
                    suggestion_type=suggestion["suggestion_type"],
                    message=suggestion["message"],
                    priority=suggestion["priority"],
                    context=suggestion["context"]
                )
        
        # Pattern 4: Active injury but still training
        injuries = get_injury_history(user_id, include_recovered=False)
        if injuries and len(recent_sessions) > 0:
            injury_parts = [i.get("body_part") for i in injuries]
            suggestion = {
                "suggestion_type": "injury_warning",
                "message": f"You have an active {injury_parts[0]} injury. Make sure to modify your training appropriately. 🩹",
                "priority": "critical",
                "context": {"action": "injury_check", "injured_parts": injury_parts}
            }
            suggestions.append(suggestion)
            create_proactive_suggestion(
                user_id=user_id,
                suggestion_type=suggestion["suggestion_type"],
                message=suggestion["message"],
                priority=suggestion["priority"],
                context=suggestion["context"]
            )
        
        # Pattern 5: Improving pain trend (positive reinforcement)
        if injuries:
            pain_logs = get_pain_history(user_id, days=7)
            if pain_logs and len(pain_logs) >= 2:
                # Check if pain is decreasing
                pain_levels = [p.get("pain_level", 0) for p in pain_logs]
                if pain_levels[0] < pain_levels[-1]:  # Most recent < oldest
                    suggestion = {
                        "suggestion_type": "recovery_progress",
                        "message": "Great news! Your pain levels are decreasing. Keep up with your recovery protocol! 💪",
                        "priority": "low",
                        "context": {"action": "encourage_recovery", "improvement": True}
                    }
                    suggestions.append(suggestion)
                    create_proactive_suggestion(
                        user_id=user_id,
                        suggestion_type=suggestion["suggestion_type"],
                        message=suggestion["message"],
                        priority=suggestion["priority"],
                        context=suggestion["context"]
                    )
        
        logger.info(f"Generated {len(suggestions)} suggestions for user: {user_id}")
        return suggestions
        
    except Exception as e:
        logger.error(f"Error generating suggestions for {user_id}: {e}")
        return []

# =============================================================================
# TRAINING PATTERN ANALYZER
# =============================================================================

async def analyze_training_patterns(user_id: str) -> Dict[str, Any]:
    """
    Analyze training patterns and provide insights
    
    Returns analysis with recommendations
    """
    logger.info(f"Analyzing training patterns for user: {user_id}")
    
    try:
        sessions = get_training_sessions(user_id, limit=30)
        
        if len(sessions) < 5:
            return {"status": "insufficient_data", "message": "Need at least 5 sessions for analysis"}
        
        analysis = {
            "total_sessions": len(sessions),
            "issues": [],
            "recommendations": []
        }
        
        # Calculate training frequency
        if len(sessions) >= 2:
            oldest_date = datetime.fromisoformat(str(sessions[-1]["session_date"]))
            newest_date = datetime.fromisoformat(str(sessions[0]["session_date"]))
            date_range_days = (newest_date - oldest_date).days
            
            if date_range_days > 0:
                frequency = len(sessions) / (date_range_days / 7)  # sessions per week
                analysis["sessions_per_week"] = round(frequency, 1)
                
                # Optimal frequency check
                if frequency < 3:
                    analysis["issues"].append("low_frequency")
                    analysis["recommendations"].append(
                        f"You're averaging {frequency:.1f} sessions per week. Consider adding 1-2 more for optimal progress."
                    )
                    create_proactive_suggestion(
                        user_id=user_id,
                        suggestion_type="training_frequency",
                        message=f"You're averaging {frequency:.1f} sessions per week. Consider adding 1-2 more for optimal progress. 📈",
                        priority="medium",
                        context={"frequency": frequency, "target": 4}
                    )
                
                if frequency > 6:
                    analysis["issues"].append("overtraining_risk")
                    analysis["recommendations"].append(
                        f"You're averaging {frequency:.1f} sessions per week. Make sure you're getting adequate recovery!"
                    )
                    create_proactive_suggestion(
                        user_id=user_id,
                        suggestion_type="overtraining_warning",
                        message=f"You're averaging {frequency:.1f} sessions per week. Make sure you're getting adequate recovery! ⚠️",
                        priority="high",
                        context={"frequency": frequency, "risk": "overtraining"}
                    )
        
        # Workout variety check
        session_types = set([s.get("session_type") for s in sessions if s.get("session_type")])
        analysis["workout_variety"] = len(session_types)
        
        if len(session_types) < 2:
            analysis["issues"].append("low_variety")
            analysis["recommendations"].append(
                "Try mixing up your training! Balance speed work with technique drills and strength training."
            )
            create_proactive_suggestion(
                user_id=user_id,
                suggestion_type="variety_suggestion",
                message="Try mixing up your training! Balance speed work with technique drills and strength training. 🔄",
                priority="medium",
                context={"current_variety": len(session_types)}
            )
        
        # Performance trend analysis (RPE)
        recent_rpe = [s.get("rpe", 0) for s in sessions[:5] if s.get("rpe")]
        if recent_rpe:
            avg_recent_rpe = sum(recent_rpe) / len(recent_rpe)
            analysis["avg_recent_rpe"] = round(avg_recent_rpe, 1)
            
            if avg_recent_rpe >= 8:
                analysis["issues"].append("high_intensity")
                analysis["recommendations"].append(
                    "Your recent sessions have been very intense. Schedule a recovery week soon."
                )
                create_proactive_suggestion(
                    user_id=user_id,
                    suggestion_type="recovery_needed",
                    message="Your recent sessions have been very intense. Schedule a recovery week soon. 🛌",
                    priority="high",
                    context={"avg_rpe": avg_recent_rpe}
                )
        
        # Mood trend analysis
        mood_before_list = [s.get("mood_before") for s in sessions[:10] if s.get("mood_before")]
        mood_after_list = [s.get("mood_after") for s in sessions[:10] if s.get("mood_after")]
        
        if mood_before_list:
            # Count negative moods
            negative_moods = ["tired", "stressed", "anxious", "unmotivated"]
            negative_count = sum(1 for m in mood_before_list if m in negative_moods)
            
            if negative_count >= 5:
                analysis["issues"].append("low_motivation")
                analysis["recommendations"].append(
                    "You've been feeling down before workouts. Consider mental training exercises or adjusting your schedule."
                )
                create_proactive_suggestion(
                    user_id=user_id,
                    suggestion_type="mental_health_check",
                    message="You've been feeling down before workouts. Want to try some mental training exercises? 🧠",
                    priority="medium",
                    context={"negative_mood_count": negative_count}
                )
        
        logger.info(f"Training pattern analysis complete for {user_id}: {len(analysis['issues'])} issues found")
        return analysis
        
    except Exception as e:
        logger.error(f"Error analyzing patterns for {user_id}: {e}")
        return {"status": "error", "message": str(e)}

# =============================================================================
# DRILL RECOMMENDATION ENGINE
# =============================================================================

async def recommend_drills_for_user(user_id: str) -> List[Dict[str, Any]]:
    """
    Generate personalized drill recommendations based on user profile, injuries, and training patterns
    
    Returns list of recommended drills
    """
    logger.info(f"Generating drill recommendations for user: {user_id}")
    
    try:
        athlete_profile = get_athlete_profile(user_id)
        injuries = get_injury_history(user_id, include_recovered=False)
        recent_sessions = get_training_sessions(user_id, limit=5)
        
        recommendations = []
        
        # Determine difficulty level based on experience
        experience_years = athlete_profile.get("experience_years", 0) if athlete_profile else 0
        if experience_years < 2:
            difficulty = "beginner"
        elif experience_years < 5:
            difficulty = "intermediate"
        else:
            difficulty = "advanced"
        
        # Base recommendation: Technique drills for everyone
        technique_drills = search_drills(category="technique", difficulty=difficulty)
        if technique_drills:
            for drill in technique_drills[:2]:
                recommendations.append(drill)
                add_drill_recommendation(
                    user_id=user_id,
                    drill_id=drill["drill_id"],
                    reason=f"Essential technique work for {difficulty} level athletes"
                )
        
        # Injury-aware recommendations
        if injuries:
            injured_parts = [i.get("body_part").lower() for i in injuries]
            
            # Recommend safe alternatives
            if any(part in ["hamstring", "quadriceps", "calf", "achilles"] for part in injured_parts):
                # Lower body injury - focus on upper body and core
                safe_drills = search_drills(category="strength", difficulty=difficulty)
                if safe_drills:
                    for drill in safe_drills[:2]:
                        if drill.get("tags") and any(tag in ["upper_body", "core", "arms"] for tag in drill["tags"]):
                            recommendations.append(drill)
                            add_drill_recommendation(
                                user_id=user_id,
                                drill_id=drill["drill_id"],
                                reason=f"Safe for training with {injured_parts[0]} injury"
                            )
            else:
                # Upper body injury or other - can do speed work
                speed_drills = search_drills(category="speed", difficulty=difficulty)
                if speed_drills:
                    for drill in speed_drills[:2]:
                        recommendations.append(drill)
                        add_drill_recommendation(
                            user_id=user_id,
                            drill_id=drill["drill_id"],
                            reason="Safe speed work during recovery"
                        )
        else:
            # No injuries - full training recommendations
            speed_drills = search_drills(category="speed", difficulty=difficulty)
            if speed_drills:
                for drill in speed_drills[:3]:
                    recommendations.append(drill)
                    add_drill_recommendation(
                        user_id=user_id,
                        drill_id=drill["drill_id"],
                        reason=f"Progressive speed development for {difficulty} athletes"
                    )
        
        # Add variety based on recent session types
        if recent_sessions:
            recent_types = set([s.get("session_type") for s in recent_sessions if s.get("session_type")])
            
            # If only doing one type, suggest variety
            if len(recent_types) <= 1:
                plyometric_drills = search_drills(category="plyometrics", difficulty=difficulty)
                if plyometric_drills:
                    recommendations.append(plyometric_drills[0])
                    add_drill_recommendation(
                        user_id=user_id,
                        drill_id=plyometric_drills[0]["drill_id"],
                        reason="Add variety to your training routine"
                    )
        
        logger.info(f"Generated {len(recommendations)} drill recommendations for {user_id}")
        return recommendations[:10]  # Limit to top 10
        
    except Exception as e:
        logger.error(f"Error generating drill recommendations for {user_id}: {e}")
        return []

# =============================================================================
# GOAL PROGRESS ANALYZER
# =============================================================================

async def analyze_goal_progress(user_id: str) -> Dict[str, Any]:
    """
    Analyze goal progress and trigger celebrations or adjustments
    
    Returns analysis with triggered achievements
    """
    logger.info(f"Analyzing goal progress for user: {user_id}")
    
    try:
        goals = get_active_goals(user_id)
        achievements_triggered = []
        
        for goal in goals:
            goal_id = goal.get("goal_id")
            goal_title = goal.get("goal_title")
            progress = goal.get("progress_percentage", 0)
            target_date = goal.get("target_date")
            
            # Milestone celebrations (25%, 50%, 75%, 100%)
            if 25 <= progress < 30 and not goal.get("milestone_25_awarded"):
                achievement = {
                    "goal_id": goal_id,
                    "milestone": "25%",
                    "title": "25% Progress! 🎯",
                    "description": f"You're 25% of the way to: {goal_title}"
                }
                achievements_triggered.append(achievement)
                record_achievement(
                    user_id=user_id,
                    achievement_type="goal_milestone",
                    title=achievement["title"],
                    description=achievement["description"],
                    badge_icon="🎯"
                )
            
            if 50 <= progress < 55 and not goal.get("milestone_50_awarded"):
                achievement = {
                    "goal_id": goal_id,
                    "milestone": "50%",
                    "title": "Halfway There! 🏃",
                    "description": f"You're 50% of the way to: {goal_title}"
                }
                achievements_triggered.append(achievement)
                record_achievement(
                    user_id=user_id,
                    achievement_type="goal_milestone",
                    title=achievement["title"],
                    description=achievement["description"],
                    badge_icon="🏃"
                )
            
            if 75 <= progress < 80 and not goal.get("milestone_75_awarded"):
                achievement = {
                    "goal_id": goal_id,
                    "milestone": "75%",
                    "title": "Almost There! 🔥",
                    "description": f"You're 75% of the way to: {goal_title}"
                }
                achievements_triggered.append(achievement)
                record_achievement(
                    user_id=user_id,
                    achievement_type="goal_milestone",
                    title=achievement["title"],
                    description=achievement["description"],
                    badge_icon="🔥"
                )
            
            # Goal achieved!
            if progress >= 100:
                achievement = {
                    "goal_id": goal_id,
                    "milestone": "100%",
                    "title": "Goal Achieved! 🏆",
                    "description": f"You did it! {goal_title}"
                }
                achievements_triggered.append(achievement)
                record_achievement(
                    user_id=user_id,
                    achievement_type="goal_completed",
                    title=achievement["title"],
                    description=achievement["description"],
                    badge_icon="🏆"
                )
                # Mark goal as achieved
                achieve_goal(goal_id)
            
            # Behind schedule warning
            if target_date:
                target_dt = datetime.fromisoformat(str(target_date))
                days_remaining = (target_dt.date() - date.today()).days
                
                if 0 < days_remaining < 30 and progress < 70:
                    create_proactive_suggestion(
                        user_id=user_id,
                        suggestion_type="goal_adjustment",
                        message=f"You have {days_remaining} days left for '{goal_title}' but are only {progress:.0f}% there. Let's adjust your training plan! 📅",
                        priority="high",
                        context={
                            "goal_id": goal_id,
                            "days_remaining": days_remaining,
                            "progress": progress
                        }
                    )
        
        logger.info(f"Goal analysis complete for {user_id}: {len(achievements_triggered)} achievements triggered")
        return {
            "achievements_triggered": achievements_triggered,
            "total_goals": len(goals),
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Error analyzing goals for {user_id}: {e}")
        return {"status": "error", "message": str(e)}

# =============================================================================
# SMART CHECK-IN SCHEDULER
# =============================================================================

async def schedule_smart_check_ins(user_id: str) -> List[Dict[str, Any]]:
    """
    Schedule contextually appropriate check-ins based on user behavior
    
    Returns list of scheduled check-ins
    """
    logger.info(f"Scheduling smart check-ins for user: {user_id}")
    
    try:
        check_ins = []
        
        # Morning motivation check-in (daily)
        morning_checkin = schedule_check_in(
            user_id=user_id,
            check_in_type="morning",
            scheduled_time="07:00:00",
            message="Good morning! How are you feeling today? Ready to train? ☀️",
            recurrence="daily"
        )
        if morning_checkin:
            check_ins.append({"type": "morning", "time": "07:00:00", "recurrence": "daily"})
        
        # Post-workout check-in (conditional)
        recent_sessions = get_training_sessions(user_id, limit=1)
        if recent_sessions:
            last_session = recent_sessions[0]
            session_date = datetime.fromisoformat(str(last_session["session_date"]))
            
            # If last session was yesterday and high intensity
            if (date.today() - session_date.date()).days == 1 and last_session.get("rpe", 0) >= 8:
                recovery_checkin = schedule_check_in(
                    user_id=user_id,
                    check_in_type="recovery",
                    scheduled_time="08:00:00",
                    message="How's your recovery after yesterday's intense session? Any soreness? 💪",
                    recurrence="once"
                )
                if recovery_checkin:
                    check_ins.append({"type": "recovery", "time": "08:00:00", "recurrence": "once"})
        
        # Weekly progress review (Sunday evening)
        weekly_checkin = schedule_check_in(
            user_id=user_id,
            check_in_type="weekly_review",
            scheduled_time="18:00:00",
            message="Let's review your week! How did training go? 📊",
            recurrence="weekly"
        )
        if weekly_checkin:
            check_ins.append({"type": "weekly_review", "time": "18:00:00", "recurrence": "weekly"})
        
        # Injury check-in (if active injuries)
        injuries = get_injury_history(user_id, include_recovered=False)
        if injuries:
            injury_checkin = schedule_check_in(
                user_id=user_id,
                check_in_type="injury_status",
                scheduled_time="19:00:00",
                message=f"How's your {injuries[0]['body_part']} feeling today? Let's track your recovery. 🩹",
                recurrence="daily"
            )
            if injury_checkin:
                check_ins.append({"type": "injury_status", "time": "19:00:00", "recurrence": "daily"})
        
        logger.info(f"Scheduled {len(check_ins)} check-ins for {user_id}")
        return check_ins
        
    except Exception as e:
        logger.error(f"Error scheduling check-ins for {user_id}: {e}")
        return []

# =============================================================================
# COMPREHENSIVE USER ANALYSIS
# =============================================================================

async def analyze_user_comprehensive(user_id: str) -> Dict[str, Any]:
    """
    Run comprehensive analysis on user data and generate all recommendations
    
    This is the main function to be called periodically for each user
    """
    logger.info(f"Running comprehensive analysis for user: {user_id}")
    
    try:
        results = {
            "user_id": user_id,
            "timestamp": datetime.now().isoformat(),
            "analysis": {}
        }
        
        # Generate proactive suggestions
        suggestions = await generate_proactive_suggestions(user_id)
        results["analysis"]["suggestions_generated"] = len(suggestions)
        
        # Analyze training patterns
        patterns = await analyze_training_patterns(user_id)
        results["analysis"]["training_patterns"] = patterns
        
        # Recommend drills
        drills = await recommend_drills_for_user(user_id)
        results["analysis"]["drills_recommended"] = len(drills)
        
        # Analyze goal progress
        goals = await analyze_goal_progress(user_id)
        results["analysis"]["goal_analysis"] = goals
        
        # Schedule check-ins
        check_ins = await schedule_smart_check_ins(user_id)
        results["analysis"]["check_ins_scheduled"] = len(check_ins)
        
        logger.info(f"Comprehensive analysis complete for {user_id}")
        return results
        
    except Exception as e:
        logger.error(f"Error in comprehensive analysis for {user_id}: {e}")
        return {"status": "error", "user_id": user_id, "message": str(e)}
