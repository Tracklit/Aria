# Aria AI Companion Implementation Guide

This document provides implementation details for the AI-powered proactive features and intelligent recommendations in Aria.

## Overview

Aria is designed to be a **true AI companion**, not just a reactive chatbot. This requires implementing proactive engagement, pattern recognition, and intelligent suggestions based on user behavior and training data.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Interaction                      │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│              API Endpoints (FastAPI)                     │
│  - Conversation  - Training  - Progress  - Calendar     │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│            AI Logic Layer (To Implement)                 │
│  - Pattern Recognition  - Proactive Suggestions          │
│  - Anomaly Detection   - Goal Progress Analysis         │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│          Database Layer (PostgreSQL)                     │
│  - Conversations  - Sessions  - Progress  - Injuries    │
└─────────────────────────────────────────────────────────┘
```

---

## AI Logic Components to Implement

### 1. Proactive Suggestion Generator

**Purpose:** Analyze user patterns and generate timely, relevant suggestions

**Implementation:** Create `src/ai_companion_logic.py`

```python
from datetime import datetime, timedelta
from database_extensions import (
    get_training_sessions, 
    get_progress_analytics,
    get_injury_history,
    create_proactive_suggestion
)
from database import get_athlete_profile

async def generate_proactive_suggestions(user_id: str):
    """
    Generate proactive suggestions based on user activity patterns
    """
    suggestions = []
    
    # Get recent activity
    recent_sessions = get_training_sessions(
        user_id, 
        start_date=(datetime.now() - timedelta(days=7)).date(),
        limit=10
    )
    
    # Pattern 1: No training this week
    if len(recent_sessions) == 0:
        suggestions.append({
            "suggestion_type": "training_reminder",
            "message": "I noticed you haven't logged any training this week. Want to schedule a workout?",
            "priority": "medium",
            "action": "schedule_training"
        })
    
    # Pattern 2: Consistent training but no progress metrics
    if len(recent_sessions) >= 3:
        recent_metrics = get_progress_analytics(user_id, days=7)
        if not recent_metrics.get("metrics"):
            suggestions.append({
                "suggestion_type": "progress_tracking",
                "message": "You've been training consistently! Let's track your progress with a time trial.",
                "priority": "high",
                "action": "suggest_time_trial"
            })
    
    # Pattern 3: High RPE consistently
    high_rpe_sessions = [s for s in recent_sessions if s.get("rpe", 0) >= 8]
    if len(high_rpe_sessions) >= 3:
        suggestions.append({
            "suggestion_type": "recovery_reminder",
            "message": "Your last few sessions were intense (RPE 8+). Consider a recovery day or lighter workout.",
            "priority": "high",
            "action": "suggest_recovery"
        })
    
    # Pattern 4: Active injury but training
    injuries = get_injury_history(user_id, include_recovered=False)
    if injuries and recent_sessions:
        suggestions.append({
            "suggestion_type": "injury_warning",
            "message": "You have an active injury. Make sure to modify your training appropriately.",
            "priority": "critical",
            "action": "injury_check"
        })
    
    # Pattern 5: Goal deadline approaching
    # TODO: Check goals with target_date within 14 days
    
    # Save suggestions to database
    for suggestion in suggestions:
        create_proactive_suggestion(
            user_id=user_id,
            suggestion_type=suggestion["suggestion_type"],
            message=suggestion["message"],
            priority=suggestion["priority"],
            context={"action": suggestion["action"]}
        )
    
    return suggestions
```

---

### 2. Smart Check-In Scheduler

**Purpose:** Schedule contextually appropriate check-ins based on user behavior

```python
from database_extensions import schedule_check_in

async def schedule_smart_check_ins(user_id: str):
    """
    Schedule check-ins based on user patterns and preferences
    """
    athlete_profile = get_athlete_profile(user_id)
    
    # Morning motivation check-in
    schedule_check_in(
        user_id=user_id,
        check_in_type="morning",
        scheduled_time="07:00:00",
        message="Good morning! How are you feeling today? Ready to train?",
        recurrence="daily"
    )
    
    # Pre-race check-in (for upcoming races)
    # TODO: Query calendar for upcoming race events
    
    # Recovery check-in (after high-intensity training)
    recent_sessions = get_training_sessions(user_id, limit=1)
    if recent_sessions and recent_sessions[0].get("rpe", 0) >= 8:
        schedule_check_in(
            user_id=user_id,
            check_in_type="recovery",
            scheduled_time="08:00:00",  # Next morning
            message="How's your recovery after yesterday's intense session?",
            recurrence="once"
        )
    
    # Weekly progress review
    schedule_check_in(
        user_id=user_id,
        check_in_type="weekly_review",
        scheduled_time="18:00:00",  # Sunday evening
        message="Let's review your week! How did training go?",
        recurrence="weekly"
    )
```

---

### 3. Drill Recommendation Engine

**Purpose:** Recommend specific drills based on user needs, injuries, and goals

```python
from database_extensions import (
    search_drills,
    add_drill_recommendation,
    get_injury_history
)

async def recommend_drills(user_id: str):
    """
    Generate personalized drill recommendations
    """
    athlete_profile = get_athlete_profile(user_id)
    injuries = get_injury_history(user_id, include_recovered=False)
    
    recommendations = []
    
    # Base recommendations by experience level
    difficulty = "beginner" if athlete_profile.get("experience_years", 0) < 2 else "intermediate"
    
    # Technique drills for all users
    technique_drills = search_drills(category="technique", difficulty=difficulty)
    recommendations.extend(technique_drills[:2])
    
    # Avoid drills that stress injured body parts
    if injuries:
        injured_parts = [i.get("body_part") for i in injuries]
        if "hamstring" in injured_parts:
            # Recommend upper body and core work
            safe_drills = search_drills(category="strength", tags=["upper_body", "core"])
            recommendations.extend(safe_drills[:2])
        else:
            # Full training drills
            speed_drills = search_drills(category="speed", difficulty=difficulty)
            recommendations.extend(speed_drills[:2])
    else:
        # No injuries - full speed ahead
        speed_drills = search_drills(category="speed", difficulty=difficulty)
        recommendations.extend(speed_drills[:3])
    
    # Save recommendations
    for drill in recommendations:
        add_drill_recommendation(
            user_id=user_id,
            drill_id=drill["drill_id"],
            reason=f"Personalized for your {difficulty} level and current status"
        )
    
    return recommendations
```

---

### 4. Goal Progress Analyzer

**Purpose:** Track goal progress and trigger celebrations or adjustments

```python
from database_extensions import get_active_goals, record_achievement

async def analyze_goal_progress(user_id: str):
    """
    Analyze goal progress and trigger appropriate actions
    """
    goals = get_active_goals(user_id)
    
    for goal in goals:
        progress = goal.get("progress_percentage", 0)
        
        # Milestone celebrations
        if progress >= 25 and progress < 30:
            record_achievement(
                user_id=user_id,
                achievement_type="goal_milestone",
                title="25% Progress!",
                description=f"You're 25% of the way to: {goal['goal_title']}",
                badge_icon="🎯"
            )
        
        if progress >= 50 and progress < 55:
            record_achievement(
                user_id=user_id,
                achievement_type="goal_milestone",
                title="Halfway There!",
                description=f"You're 50% of the way to: {goal['goal_title']}",
                badge_icon="🏃"
            )
        
        # Goal achieved!
        if progress >= 100:
            record_achievement(
                user_id=user_id,
                achievement_type="goal_completed",
                title="Goal Achieved!",
                description=f"You did it! {goal['goal_title']}",
                badge_icon="🏆"
            )
            # TODO: Mark goal as achieved
        
        # Behind schedule warning
        if goal.get("target_date"):
            days_remaining = (goal["target_date"] - datetime.now().date()).days
            if days_remaining < 30 and progress < 70:
                create_proactive_suggestion(
                    user_id=user_id,
                    suggestion_type="goal_adjustment",
                    message=f"You have {days_remaining} days left for '{goal['goal_title']}'. Let's adjust your training plan.",
                    priority="high"
                )
```

---

### 5. Training Pattern Analyzer

**Purpose:** Identify patterns, anomalies, and optimization opportunities

```python
async def analyze_training_patterns(user_id: str):
    """
    Analyze training patterns and provide insights
    """
    sessions = get_training_sessions(user_id, limit=30)
    
    if len(sessions) < 5:
        return  # Need more data
    
    # Calculate training frequency
    date_range = (sessions[0]["session_date"] - sessions[-1]["session_date"]).days
    frequency = len(sessions) / (date_range / 7)  # sessions per week
    
    # Optimal frequency check
    if frequency < 3:
        create_proactive_suggestion(
            user_id=user_id,
            suggestion_type="training_frequency",
            message=f"You're averaging {frequency:.1f} sessions per week. Consider adding 1-2 more for optimal progress.",
            priority="medium"
        )
    
    if frequency > 6:
        create_proactive_suggestion(
            user_id=user_id,
            suggestion_type="overtraining_warning",
            message=f"You're averaging {frequency:.1f} sessions per week. Make sure you're getting adequate recovery!",
            priority="high"
        )
    
    # Workout variety check
    session_types = set([s.get("session_type") for s in sessions if s.get("session_type")])
    if len(session_types) < 2:
        create_proactive_suggestion(
            user_id=user_id,
            suggestion_type="variety_suggestion",
            message="Try mixing up your training! Balance speed work with technique drills and strength training.",
            priority="medium"
        )
    
    # Performance trend analysis
    recent_rpe = [s.get("rpe", 0) for s in sessions[:5] if s.get("rpe")]
    avg_recent_rpe = sum(recent_rpe) / len(recent_rpe) if recent_rpe else 0
    
    if avg_recent_rpe >= 8:
        create_proactive_suggestion(
            user_id=user_id,
            suggestion_type="recovery_needed",
            message="Your recent sessions have been very intense. Schedule a recovery week soon.",
            priority="high"
        )
```

---

## Background Tasks with Celery

To run these AI logic functions periodically, implement background tasks:

### Installation
```bash
pip install celery redis
```

### Create `src/celery_tasks.py`
```python
from celery import Celery
from celery.schedules import crontab
import os

celery_app = Celery(
    'aria_companion',
    broker=os.getenv('REDIS_URL'),
    backend=os.getenv('REDIS_URL')
)

celery_app.conf.beat_schedule = {
    'generate-proactive-suggestions': {
        'task': 'tasks.generate_all_suggestions',
        'schedule': crontab(hour='*/6'),  # Every 6 hours
    },
    'analyze-training-patterns': {
        'task': 'tasks.analyze_all_patterns',
        'schedule': crontab(hour='2'),  # Daily at 2 AM
    },
    'schedule-check-ins': {
        'task': 'tasks.schedule_all_check_ins',
        'schedule': crontab(hour='6'),  # Daily at 6 AM
    },
    'analyze-goal-progress': {
        'task': 'tasks.analyze_all_goals',
        'schedule': crontab(hour='20'),  # Daily at 8 PM
    }
}

@celery_app.task
def generate_all_suggestions():
    """Generate suggestions for all active users"""
    from database import get_all_active_users
    from ai_companion_logic import generate_proactive_suggestions
    
    users = get_all_active_users()
    for user in users:
        generate_proactive_suggestions(user["user_id"])

@celery_app.task
def analyze_all_patterns():
    """Analyze training patterns for all users"""
    from database import get_all_active_users
    from ai_companion_logic import analyze_training_patterns
    
    users = get_all_active_users()
    for user in users:
        analyze_training_patterns(user["user_id"])

# ... similar tasks for check-ins and goals
```

### Run Celery Worker
```bash
celery -A src.celery_tasks worker --loglevel=info
```

### Run Celery Beat (Scheduler)
```bash
celery -A src.celery_tasks beat --loglevel=info
```

---

## Enhancing Conversations with Context

Modify the `ask_aria` function in `main.py` to use conversation history:

```python
from database_extensions import save_conversation, get_recent_context

@app.post("/aria/ask", tags=["Aria"])
@require_auth
@apply_rate_limit("general")
async def ask_aria(request: Request):
    """Enhanced Aria with conversation memory"""
    user_id = request.state.user_id
    question = request._json_body.get("question")
    
    # Save user message
    session_id = request._json_body.get("session_id") or str(uuid.uuid4())
    save_conversation(
        user_id=user_id,
        session_id=session_id,
        role="user",
        message=question
    )
    
    # Get recent context
    recent_context = get_recent_context(user_id, hours=24)
    
    # Build enhanced prompt with context
    context_summary = "\n".join([
        f"- {c['message']}" for c in recent_context[-5:]
    ])
    
    enhanced_prompt = f"""
    {ARIA_PROMPT}
    
    RECENT CONVERSATION CONTEXT:
    {context_summary}
    
    Current User Question: {question}
    """
    
    # Get AI response
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": enhanced_prompt},
            {"role": "user", "content": question}
        ]
    )
    
    answer = response.choices[0].message.content
    
    # Save AI response
    save_conversation(
        user_id=user_id,
        session_id=session_id,
        role="assistant",
        message=answer
    )
    
    return {
        "answer": answer,
        "session_id": session_id
    }
```

---

## Seed Data for Testing

Create `scripts/seed_companion_data.py`:

```python
from database_extensions import *
from datetime import datetime, date

def seed_drill_library():
    """Populate drill library with common sprinting drills"""
    drills = [
        {
            "drill_name": "A-Skip",
            "category": "technique",
            "difficulty": "beginner",
            "description": "Skipping drill emphasizing knee drive and rhythm",
            "video_url": "https://example.com/a-skip.mp4",
            "instructions": "Skip forward with exaggerated knee lift...",
            "duration_minutes": 5,
            "equipment_needed": None,
            "tags": ["warm-up", "technique", "coordination"]
        },
        {
            "drill_name": "Block Starts",
            "category": "speed",
            "difficulty": "intermediate",
            "description": "Explosive starts from starting blocks",
            "video_url": "https://example.com/blocks.mp4",
            "instructions": "Set blocks at appropriate distances...",
            "duration_minutes": 20,
            "equipment_needed": "starting blocks",
            "tags": ["speed", "power", "acceleration"]
        },
        # Add 20+ more drills
    ]
    
    for drill in drills:
        # Insert into database
        pass

def seed_mental_exercises():
    """Populate mental exercise library"""
    exercises = [
        {
            "exercise_name": "Pre-Race Visualization",
            "exercise_type": "visualization",
            "description": "Visualize perfect race execution",
            "duration_minutes": 5,
            "instructions": "Find a quiet place. Close your eyes...",
            "audio_url": None,
            "difficulty": "beginner"
        },
        # Add more exercises
    ]
    
    for exercise in exercises:
        # Insert into database
        pass

if __name__ == "__main__":
    seed_drill_library()
    seed_mental_exercises()
    print("Companion data seeded successfully!")
```

---

## Testing Checklist

- [ ] Create test user account
- [ ] Test conversation history persistence
- [ ] Log multiple training sessions
- [ ] Track progress metrics and verify analytics
- [ ] Create calendar events
- [ ] Report injury and track pain levels
- [ ] Set goals and update progress
- [ ] Log nutrition and hydration
- [ ] Log mental performance entries
- [ ] Verify proactive suggestions generate
- [ ] Check achievements trigger correctly
- [ ] Test drill recommendations
- [ ] Verify rate limiting works
- [ ] Test error handling for invalid data

---

## Next Implementation Steps

1. **Week 1: AI Logic Core**
   - Implement `ai_companion_logic.py` with pattern recognition
   - Create proactive suggestion generator
   - Test with sample data

2. **Week 2: Background Tasks**
   - Set up Celery for periodic tasks
   - Implement all background analyzers
   - Test scheduling and execution

3. **Week 3: Seed Data & Testing**
   - Create seed scripts for drills and exercises
   - Populate 50+ drills and 20+ mental exercises
   - Comprehensive testing with real user flows

4. **Week 4: Voice Integration**
   - Set up Azure Speech Services
   - Implement voice-to-text endpoint
   - Implement text-to-voice response
   - Test with audio files

5. **Week 5: Polish & Production**
   - Add caching for frequently accessed data
   - Optimize database queries
   - Add comprehensive logging
   - Deploy to production

---

## Performance Optimization

### Caching Strategy
```python
from cache import cache

@app.get("/drills/recommended/{user_id}")
async def get_drills(user_id: str):
    # Check cache first
    cache_key = f"drills:recommended:{user_id}"
    cached = cache.get(cache_key)
    
    if cached:
        return cached
    
    # Generate recommendations
    drills = get_recommended_drills(user_id)
    
    # Cache for 1 hour
    cache.set(cache_key, drills, ttl=3600)
    
    return drills
```

### Database Indexing
All tables already have proper indexes on `user_id` and date columns. Monitor query performance with:

```sql
EXPLAIN ANALYZE SELECT * FROM training_sessions 
WHERE user_id = 'user_123' 
ORDER BY session_date DESC LIMIT 30;
```

---

## Monitoring & Observability

Add logging for AI logic:

```python
import logging
logger = logging.getLogger(__name__)

async def generate_proactive_suggestions(user_id: str):
    logger.info(f"Generating proactive suggestions for user: {user_id}")
    
    try:
        # ... logic ...
        logger.info(f"Generated {len(suggestions)} suggestions for user: {user_id}")
    except Exception as e:
        logger.error(f"Error generating suggestions for {user_id}: {e}")
        raise
```

---

## Conclusion

This implementation guide provides the foundation for transforming Aria from a reactive chatbot into a true AI companion. The key is the proactive AI logic layer that analyzes patterns, predicts needs, and engages users at the right times with relevant suggestions.

For questions or architectural discussions, contact the development team.
