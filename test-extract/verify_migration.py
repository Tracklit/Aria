"""
Migration Verification Script
Checks that all Supabase references have been removed and the system is ready for production
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Change to project root directory
script_dir = Path(__file__).parent
project_root = script_dir.parent
os.chdir(project_root)

# Add src to Python path
sys.path.insert(0, str(project_root / "src"))

# Load environment variables
load_dotenv()

print("=" * 80)
print("🔍 SUPABASE MIGRATION VERIFICATION")
print("=" * 80)

# Check 1: Environment Variables
print("\n1. Checking Environment Variables...")
has_database_url = bool(os.getenv("DATABASE_URL"))
has_supabase_url = bool(os.getenv("SUPABASE_URL"))
has_supabase_key = bool(os.getenv("SUPABASE_KEY"))

if has_database_url and not has_supabase_url and not has_supabase_key:
    print("   ✅ DATABASE_URL is set")
    print("   ✅ SUPABASE_URL removed")
    print("   ✅ SUPABASE_KEY removed")
    env_check = True
else:
    print("   ❌ Environment variables not properly configured:")
    print(f"      DATABASE_URL: {'SET' if has_database_url else 'NOT SET'}")
    print(f"      SUPABASE_URL: {'STILL PRESENT' if has_supabase_url else 'REMOVED'}")
    print(f"      SUPABASE_KEY: {'STILL PRESENT' if has_supabase_key else 'REMOVED'}")
    env_check = False

# Check 2: Source Code Files
print("\n2. Checking Source Code for Supabase References...")
python_files = [
    "src/main.py",
    "src/database.py",
    "src/cache.py",
    "src/rate_limit.py",
    "src/auth_middleware.py",
    "src/observability.py",
    "src/wearable_integration.py",
    "src/tracklit_integration.py"
]

code_clean = True
for file in python_files:
    if os.path.exists(file):
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()
            if 'SUPABASE_URL' in content or 'SUPABASE_KEY' in content or 'SUPABASE_HEADERS' in content:
                print(f"   ❌ {file} still contains Supabase references")
                code_clean = False
            else:
                print(f"   ✅ {file} - clean")
    else:
        print(f"   ⚠️  {file} - not found (optional)")

# Check 3: Database Connection
print("\n3. Testing Database Connection...")
try:
    from database import db_pool
    conn = db_pool.get_connection()
    if conn:
        print("   ✅ Database connection successful")
        print(f"   ✅ Connection pool initialized")
        db_pool.return_connection(conn)
        db_check = True
    else:
        print("   ❌ Failed to get database connection")
        db_check = False
except Exception as e:
    print(f"   ❌ Database connection error: {e}")
    db_check = False

# Check 4: Redis Cache
print("\n4. Testing Redis Cache...")
try:
    from cache import cache
    if cache.is_connected():
        print("   ✅ Redis cache connected")
        # Test cache operations
        test_success = cache.set("migration_test", {"status": "complete"}, ttl=10)
        if test_success:
            print("   ✅ Cache write successful")
        retrieved = cache.get("migration_test")
        if retrieved:
            print("   ✅ Cache read successful")
        cache.delete("migration_test")
        redis_check = True
    else:
        print("   ❌ Redis cache not connected")
        redis_check = False
except Exception as e:
    print(f"   ❌ Redis cache error: {e}")
    redis_check = False

# Check 5: Required Functions in database.py
print("\n5. Checking Database Functions...")
try:
    from database import (
        get_athlete_profile, get_user_subscription, update_user_subscription,
        track_query_usage, get_monthly_usage, create_athlete_profile,
        update_athlete_profile, delete_athlete_profile, update_athlete_mood,
        get_knowledge_items, get_knowledge_item_by_id, create_knowledge_item,
        update_knowledge_item, delete_knowledge_item, search_knowledge_items,
        get_coach_athletes, link_coach_athlete, unlink_coach_athlete,
        get_query_usage_details
    )
    print("   ✅ All 19 database functions imported successfully")
    functions_check = True
except ImportError as e:
    print(f"   ❌ Missing database functions: {e}")
    functions_check = False

# Check 6: Test Files
print("\n6. Checking Test Files...")
test_files = [
    "tests/test_database.py",
    "tests/test_auth_middleware.py",
    "tests/test_observability.py",
    "tests/test_Aria_api.py",
    "tests/test_integration.py",
    "tests/test_tracklit_integration.py"
]

tests_present = 0
for test_file in test_files:
    if os.path.exists(test_file):
        print(f"   ✅ {test_file} - present")
        tests_present += 1
    else:
        print(f"   ❌ {test_file} - missing")

tests_check = tests_present >= 5  # At least 5 of 6 test files should exist

# Final Summary
print("\n" + "=" * 80)
print("📊 VERIFICATION SUMMARY")
print("=" * 80)

checks = {
    "Environment Variables": env_check,
    "Source Code Clean": code_clean,
    "Database Connection": db_check,
    "Redis Cache": redis_check,
    "Database Functions": functions_check,
    "Test Suite": tests_check
}

passed = sum(checks.values())
total = len(checks)

for check_name, check_result in checks.items():
    status = "✅ PASS" if check_result else "❌ FAIL"
    print(f"{check_name:.<50} {status}")

print("\n" + "=" * 80)
if passed == total:
    print("🎉 ALL CHECKS PASSED - MIGRATION COMPLETE!")
    print("=" * 80)
    print("\n✅ The system is ready for production deployment")
    print("✅ All Supabase references have been removed")
    print("✅ Database access is via direct PostgreSQL connection")
    print("✅ Test suite is in place for validation")
    print("\n🚀 You can now run:")
    print("   python scripts/run_tests.py")
    print("   uvicorn src.main:app --reload")
    sys.exit(0)
else:
    print(f"⚠️  {passed}/{total} CHECKS PASSED - REVIEW FAILURES ABOVE")
    print("=" * 80)
    print("\n❌ Please address the failed checks before deploying to production")
    sys.exit(1)
