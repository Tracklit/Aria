"""
Celery configuration for Aria background tasks
Handles periodic AI analysis, suggestion generation, and check-in scheduling
"""
from celery import Celery
from celery.schedules import crontab
import os
import sys
import asyncio
import logging

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from dotenv import load_dotenv
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Celery
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

celery_app = Celery(
    'aria_companion',
    broker=REDIS_URL,
    backend=REDIS_URL
)

# Celery configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes max per task
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=100,
)

# Schedule periodic tasks
celery_app.conf.beat_schedule = {
    # Generate proactive suggestions every 6 hours
    'generate-proactive-suggestions': {
        'task': 'celery_tasks.generate_all_suggestions',
        'schedule': crontab(minute=0, hour='*/6'),  # Every 6 hours
    },
    
    # Analyze training patterns daily at 2 AM
    'analyze-training-patterns': {
        'task': 'celery_tasks.analyze_all_patterns',
        'schedule': crontab(minute=0, hour=2),  # Daily at 2 AM
    },
    
    # Schedule check-ins daily at 6 AM
    'schedule-smart-check-ins': {
        'task': 'celery_tasks.schedule_all_check_ins',
        'schedule': crontab(minute=0, hour=6),  # Daily at 6 AM
    },
    
    # Analyze goal progress daily at 8 PM
    'analyze-goal-progress': {
        'task': 'celery_tasks.analyze_all_goals',
        'schedule': crontab(minute=0, hour=20),  # Daily at 8 PM
    },
    
    # Recommend drills weekly on Monday at 7 AM
    'recommend-drills-weekly': {
        'task': 'celery_tasks.recommend_all_drills',
        'schedule': crontab(minute=0, hour=7, day_of_week=1),  # Monday 7 AM
    },
    
    # Comprehensive analysis weekly on Sunday at 11 PM
    'comprehensive-analysis-weekly': {
        'task': 'celery_tasks.comprehensive_all_users',
        'schedule': crontab(minute=0, hour=23, day_of_week=0),  # Sunday 11 PM
    },
}

# =============================================================================
# CELERY TASKS
# =============================================================================

def get_active_users():
    """
    Get list of active users for analysis
    You'll need to implement this in database.py
    For now, returns empty list
    """
    from database import db_pool
    try:
        conn = db_pool.getconn()
        cursor = conn.cursor()
        
        # Get users who have logged activity in last 30 days
        cursor.execute("""
            SELECT DISTINCT user_id 
            FROM athletes 
            WHERE created_at > NOW() - INTERVAL '90 days'
            AND active = TRUE
            LIMIT 1000
        """)
        
        users = [row[0] for row in cursor.fetchall()]
        cursor.close()
        db_pool.putconn(conn)
        
        return users
    except Exception as e:
        logger.error(f"Error getting active users: {e}")
        return []

@celery_app.task(name='celery_tasks.generate_all_suggestions')
def generate_all_suggestions():
    """Generate proactive suggestions for all active users"""
    logger.info("🤖 Starting proactive suggestion generation for all users...")
    
    from ai_companion_logic import generate_proactive_suggestions
    
    users = get_active_users()
    success_count = 0
    error_count = 0
    
    for user_id in users:
        try:
            # Run async function in event loop
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            suggestions = loop.run_until_complete(generate_proactive_suggestions(user_id))
            loop.close()
            
            if suggestions:
                success_count += 1
                logger.info(f"✅ Generated {len(suggestions)} suggestions for user {user_id}")
        except Exception as e:
            error_count += 1
            logger.error(f"❌ Error generating suggestions for {user_id}: {e}")
    
    logger.info(f"✅ Suggestion generation complete: {success_count} success, {error_count} errors")
    return {"success": success_count, "errors": error_count, "total": len(users)}

@celery_app.task(name='celery_tasks.analyze_all_patterns')
def analyze_all_patterns():
    """Analyze training patterns for all active users"""
    logger.info("📊 Starting training pattern analysis for all users...")
    
    from ai_companion_logic import analyze_training_patterns
    
    users = get_active_users()
    success_count = 0
    error_count = 0
    
    for user_id in users:
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            analysis = loop.run_until_complete(analyze_training_patterns(user_id))
            loop.close()
            
            if analysis.get("status") != "error":
                success_count += 1
                logger.info(f"✅ Analyzed patterns for user {user_id}")
        except Exception as e:
            error_count += 1
            logger.error(f"❌ Error analyzing patterns for {user_id}: {e}")
    
    logger.info(f"✅ Pattern analysis complete: {success_count} success, {error_count} errors")
    return {"success": success_count, "errors": error_count, "total": len(users)}

@celery_app.task(name='celery_tasks.schedule_all_check_ins')
def schedule_all_check_ins():
    """Schedule smart check-ins for all active users"""
    logger.info("📅 Starting check-in scheduling for all users...")
    
    from ai_companion_logic import schedule_smart_check_ins
    
    users = get_active_users()
    success_count = 0
    error_count = 0
    
    for user_id in users:
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            check_ins = loop.run_until_complete(schedule_smart_check_ins(user_id))
            loop.close()
            
            if check_ins:
                success_count += 1
                logger.info(f"✅ Scheduled {len(check_ins)} check-ins for user {user_id}")
        except Exception as e:
            error_count += 1
            logger.error(f"❌ Error scheduling check-ins for {user_id}: {e}")
    
    logger.info(f"✅ Check-in scheduling complete: {success_count} success, {error_count} errors")
    return {"success": success_count, "errors": error_count, "total": len(users)}

@celery_app.task(name='celery_tasks.analyze_all_goals')
def analyze_all_goals():
    """Analyze goal progress for all active users"""
    logger.info("🎯 Starting goal analysis for all users...")
    
    from ai_companion_logic import analyze_goal_progress
    
    users = get_active_users()
    success_count = 0
    error_count = 0
    
    for user_id in users:
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            analysis = loop.run_until_complete(analyze_goal_progress(user_id))
            loop.close()
            
            if analysis.get("status") != "error":
                success_count += 1
                logger.info(f"✅ Analyzed goals for user {user_id}")
        except Exception as e:
            error_count += 1
            logger.error(f"❌ Error analyzing goals for {user_id}: {e}")
    
    logger.info(f"✅ Goal analysis complete: {success_count} success, {error_count} errors")
    return {"success": success_count, "errors": error_count, "total": len(users)}

@celery_app.task(name='celery_tasks.recommend_all_drills')
def recommend_all_drills():
    """Generate drill recommendations for all active users"""
    logger.info("🏃 Starting drill recommendation for all users...")
    
    from ai_companion_logic import recommend_drills_for_user
    
    users = get_active_users()
    success_count = 0
    error_count = 0
    
    for user_id in users:
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            drills = loop.run_until_complete(recommend_drills_for_user(user_id))
            loop.close()
            
            if drills:
                success_count += 1
                logger.info(f"✅ Recommended {len(drills)} drills for user {user_id}")
        except Exception as e:
            error_count += 1
            logger.error(f"❌ Error recommending drills for {user_id}: {e}")
    
    logger.info(f"✅ Drill recommendation complete: {success_count} success, {error_count} errors")
    return {"success": success_count, "errors": error_count, "total": len(users)}

@celery_app.task(name='celery_tasks.comprehensive_all_users')
def comprehensive_all_users():
    """Run comprehensive analysis for all active users"""
    logger.info("🔄 Starting comprehensive analysis for all users...")
    
    from ai_companion_logic import analyze_user_comprehensive
    
    users = get_active_users()
    success_count = 0
    error_count = 0
    
    for user_id in users:
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            results = loop.run_until_complete(analyze_user_comprehensive(user_id))
            loop.close()
            
            if results.get("status") != "error":
                success_count += 1
                logger.info(f"✅ Comprehensive analysis complete for user {user_id}")
        except Exception as e:
            error_count += 1
            logger.error(f"❌ Error in comprehensive analysis for {user_id}: {e}")
    
    logger.info(f"✅ Comprehensive analysis complete: {success_count} success, {error_count} errors")
    return {"success": success_count, "errors": error_count, "total": len(users)}

# =============================================================================
# MANUAL TASK TRIGGER (for testing)
# =============================================================================

@celery_app.task(name='celery_tasks.test_task')
def test_task():
    """Test task to verify Celery is working"""
    logger.info("✅ Celery test task executed successfully!")
    return {"status": "success", "message": "Celery is working!"}

if __name__ == '__main__':
    print("\n" + "="*60)
    print("ARIA CELERY BACKGROUND TASKS")
    print("="*60)
    print("\nScheduled tasks:")
    for task_name, task_config in celery_app.conf.beat_schedule.items():
        print(f"  - {task_name}: {task_config['schedule']}")
    print("\n" + "="*60)
    print("\nTo run:")
    print("  Worker: celery -A scripts.celery_tasks worker --loglevel=info")
    print("  Beat: celery -A scripts.celery_tasks beat --loglevel=info")
    print("="*60 + "\n")
