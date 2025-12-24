"""
Test Redis and Celery connectivity
Run this before starting the application to verify setup
"""
import os
import sys
from dotenv import load_dotenv

load_dotenv()

def test_redis():
    """Test Redis connection"""
    print("\n🔍 Testing Redis Connection...")
    try:
        import redis
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
        client = redis.from_url(redis_url, decode_responses=True, socket_timeout=5)
        
        # Test ping
        response = client.ping()
        if response:
            print("✅ Redis connection successful!")
            
            # Test basic operations
            client.set("test:key", "test_value", ex=10)
            value = client.get("test:key")
            if value == "test_value":
                print("✅ Redis read/write operations working!")
            
            # Get info
            info = client.info()
            print(f"✅ Redis version: {info.get('redis_version')}")
            print(f"✅ Memory used: {info.get('used_memory_human')}")
            print(f"✅ Connected clients: {info.get('connected_clients')}")
            
            return True
        else:
            print("❌ Redis ping failed")
            return False
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        print("\n💡 Make sure Redis is running:")
        print("   Docker: docker run -d -p 6379:6379 redis:7-alpine")
        print("   Or install locally and run: redis-server")
        return False

def test_database():
    """Test database connection"""
    print("\n🔍 Testing Database Connection...")
    try:
        sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))
        from database_extensions import db_pool
        
        conn = db_pool.getconn()
        cursor = conn.cursor()
        
        # Test query
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        print(f"✅ Database connection successful!")
        print(f"✅ PostgreSQL version: {version[:50]}...")
        
        # Check if companion tables exist
        cursor.execute("""
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_name IN ('conversations', 'training_sessions_log', 'progress_metrics', 
                                 'drill_library', 'goals', 'proactive_suggestions')
        """)
        count = cursor.fetchone()[0]
        print(f"✅ Found {count}/6 companion tables")
        if count < 6:
            print("⚠️  Some tables missing - run migrations: python scripts/run_migrations.py")
        
        cursor.close()
        db_pool.putconn(conn)
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("\n💡 Check DATABASE_URL in .env file")
        return False

def test_celery():
    """Test Celery configuration"""
    print("\n🔍 Testing Celery Configuration...")
    try:
        from scripts.celery_tasks import celery_app, test_task
        
        print("✅ Celery app imported successfully!")
        print(f"✅ Broker: {celery_app.conf.broker_url[:50]}...")
        print(f"✅ Backend: {celery_app.conf.result_backend[:50]}...")
        
        # Test task
        print("\n🧪 Testing Celery task execution...")
        result = test_task.delay()
        task_result = result.get(timeout=10)
        
        if task_result.get("status") == "success":
            print("✅ Celery test task executed successfully!")
            return True
        else:
            print("❌ Celery test task failed")
            return False
    except Exception as e:
        print(f"❌ Celery test failed: {e}")
        print("\n💡 Make sure Celery worker is running:")
        print("   celery -A scripts.celery_tasks worker --loglevel=info --pool=solo")
        return False

def test_cache_utils():
    """Test cache utilities"""
    print("\n🔍 Testing Cache Utilities...")
    try:
        sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))
        from cache_utils import set_cached, get_cached, delete_cached, get_cache_stats
        
        # Test operations
        test_key = "test:health_check"
        test_value = {"status": "ok", "timestamp": "2025-01-15"}
        
        # Set
        if set_cached(test_key, test_value, 60):
            print("✅ Cache SET operation working!")
        
        # Get
        cached = get_cached(test_key)
        if cached == test_value:
            print("✅ Cache GET operation working!")
        
        # Delete
        if delete_cached(test_key):
            print("✅ Cache DELETE operation working!")
        
        # Stats
        stats = get_cache_stats()
        if stats.get("status") == "active":
            print("✅ Cache statistics available!")
            print(f"   Total keys: {stats.get('total_keys')}")
            print(f"   Used memory: {stats.get('used_memory')}")
        
        return True
    except Exception as e:
        print(f"❌ Cache utilities test failed: {e}")
        return False

def test_ai_logic():
    """Test AI logic imports"""
    print("\n🔍 Testing AI Logic Module...")
    try:
        sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))
        from ai_companion_logic import (
            generate_proactive_suggestions,
            analyze_training_patterns,
            recommend_drills_for_user,
            analyze_goal_progress,
            schedule_smart_check_ins,
            analyze_user_comprehensive
        )
        
        print("✅ All AI logic functions imported successfully!")
        print("   - generate_proactive_suggestions")
        print("   - analyze_training_patterns")
        print("   - recommend_drills_for_user")
        print("   - analyze_goal_progress")
        print("   - schedule_smart_check_ins")
        print("   - analyze_user_comprehensive")
        
        return True
    except Exception as e:
        print(f"❌ AI logic import failed: {e}")
        return False

def main():
    """Run all health checks"""
    print("=" * 60)
    print("ARIA HEALTH CHECK")
    print("=" * 60)
    
    results = {
        "Redis": test_redis(),
        "Database": test_database(),
        "Cache Utilities": test_cache_utils(),
        "AI Logic": test_ai_logic(),
        "Celery": test_celery(),  # Run last since it requires worker
    }
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    for component, status in results.items():
        icon = "✅" if status else "❌"
        print(f"{icon} {component}: {'PASS' if status else 'FAIL'}")
    
    all_passed = all(results.values())
    
    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 ALL CHECKS PASSED! Aria is ready to run.")
    else:
        print("⚠️  SOME CHECKS FAILED. Review errors above.")
        print("\nNext steps:")
        if not results["Redis"]:
            print("1. Start Redis: docker run -d -p 6379:6379 redis:7-alpine")
        if not results["Database"]:
            print("2. Check DATABASE_URL in .env and run migrations")
        if not results["Celery"]:
            print("3. Start Celery worker: celery -A scripts.celery_tasks worker --pool=solo --loglevel=info")
    print("=" * 60)
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
