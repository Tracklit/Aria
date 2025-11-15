# Aria Background Tasks & Caching System

## Overview

This document describes Aria's background automation and caching infrastructure for proactive AI engagement and performance optimization.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Aria AI Companion                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐      ┌───────────┐ │
│  │   FastAPI    │─────▶│    Redis     │◀─────│   Celery  │ │
│  │   Endpoints  │      │   Cache      │      │   Worker  │ │
│  └──────────────┘      └──────────────┘      └───────────┘ │
│         │                     │                      │       │
│         │                     │                      │       │
│         └────────────┬────────┴──────────────────────┘       │
│                      │                                        │
│              ┌───────▼────────┐                              │
│              │   PostgreSQL   │                              │
│              │    Database    │                              │
│              └────────────────┘                              │
└─────────────────────────────────────────────────────────────┘
```

## Background Tasks (Celery)

### Setup

**1. Start Redis (required for Celery broker):**
```bash
# Using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or using local Redis installation
redis-server
```

**2. Start Celery Worker:**
```bash
celery -A scripts.celery_tasks worker --loglevel=info --pool=solo
```

**3. Start Celery Beat (scheduler):**
```bash
celery -A scripts.celery_tasks beat --loglevel=info
```

**4. Monitor Tasks (optional):**
```bash
celery -A scripts.celery_tasks flower
# Access dashboard at http://localhost:5555
```

### Scheduled Tasks

| Task | Schedule | Purpose | Functions Called |
|------|----------|---------|------------------|
| **generate-proactive-suggestions** | Every 6 hours | Generate contextual suggestions for all active users | `generate_proactive_suggestions()` |
| **analyze-training-patterns** | Daily at 2 AM | Analyze training frequency, variety, intensity, mood | `analyze_training_patterns()` |
| **schedule-smart-check-ins** | Daily at 6 AM | Schedule morning motivation, recovery checks, weekly reviews | `schedule_smart_check_ins()` |
| **analyze-goal-progress** | Daily at 8 PM | Check goal milestones, trigger achievements, warn about delays | `analyze_goal_progress()` |
| **recommend-drills-weekly** | Monday at 7 AM | Generate personalized drill recommendations | `recommend_drills_for_user()` |
| **comprehensive-analysis-weekly** | Sunday at 11 PM | Run full AI analysis for all users | `analyze_user_comprehensive()` |

### Manual Task Triggers

You can trigger tasks manually via Python:

```python
from scripts.celery_tasks import (
    generate_all_suggestions, 
    analyze_all_patterns,
    test_task
)

# Test Celery is working
result = test_task.delay()
print(result.get(timeout=10))

# Generate suggestions for all users
result = generate_all_suggestions.delay()
print(result.get(timeout=300))  # Wait up to 5 minutes

# Analyze patterns for all users
result = analyze_all_patterns.delay()
```

Or via Celery CLI:

```bash
# Test task
celery -A scripts.celery_tasks call test_task

# Generate suggestions
celery -A scripts.celery_tasks call generate_all_suggestions

# Analyze patterns
celery -A scripts.celery_tasks call analyze_all_patterns
```

### Task Results

Each task returns a dictionary with:
```json
{
  "success": 150,
  "errors": 5,
  "total": 155
}
```

### Configuration

Edit `scripts/celery_tasks.py` to customize:
- **Task schedules**: Modify `celery_app.conf.beat_schedule`
- **Task timeouts**: Adjust `task_time_limit`
- **Active user criteria**: Edit `get_active_users()` function
- **Retry behavior**: Add `@task(autoretry_for=...)` decorator

### Environment Variables

```bash
REDIS_URL=redis://localhost:6379/0  # Celery broker URL
```

## Caching Layer (Redis)

### Cache Strategy

| Endpoint | Cache Key | TTL | Invalidated By |
|----------|-----------|-----|----------------|
| `GET /drills/recommended/{user_id}` | `drills:recommended:{user_id}:{limit}` | 1 hour | `POST /sessions`, drill updates |
| `GET /progress/{user_id}` | `progress:analytics:{user_id}:{type}:{days}` | 30 minutes | `POST /progress/track` |
| `GET /mental/exercises` | `mental:exercises:{type}` | 24 hours | Mental exercise updates |
| `GET /achievements/{user_id}` | `achievements:{user_id}:{days}` | 1 hour | `PUT /goals/{id}/progress` |

### Cache Utilities

**Get from cache:**
```python
from cache_utils import get_cached, build_key

cache_key = build_key("drills", "recommended", user_id)
cached_drills = get_cached(cache_key)
if cached_drills:
    return cached_drills
```

**Set cache:**
```python
from cache_utils import set_cached

# Cache for 1 hour (3600 seconds)
set_cached(cache_key, drills, 3600)
```

**Invalidate cache:**
```python
from cache_utils import (
    invalidate_user_cache,
    invalidate_drills_cache,
    invalidate_progress_cache,
    invalidate_achievements_cache
)

# Invalidate all user data
invalidate_user_cache(user_id)

# Invalidate specific data
invalidate_drills_cache(user_id)
invalidate_progress_cache(user_id)
invalidate_achievements_cache(user_id)
```

**Cache decorator (for functions):**
```python
from cache_utils import cached

@cached("drills:recommended", ttl_seconds=3600)
async def get_recommended_drills(user_id: int):
    # Function will be cached automatically
    return drills
```

### Cache Monitoring

**Get cache statistics:**
```python
from cache_utils import get_cache_stats

stats = get_cache_stats()
print(stats)
# {
#   "status": "active",
#   "used_memory": "2.5M",
#   "connected_clients": 3,
#   "total_keys": 450,
#   "uptime_days": 12,
#   "hit_rate": "85.32%"
# }
```

**Health check:**
```python
from cache_utils import is_cache_healthy

if is_cache_healthy():
    print("Redis is operational")
else:
    print("Redis is down - caching disabled")
```

### Cache Warming (Optional)

Pre-populate cache for active users:

```python
from cache_utils import warm_cache_for_user

# Warm cache on user login
await warm_cache_for_user(user_id)
```

This pre-loads:
- Drill recommendations
- Progress analytics (30 days)
- Achievements (90 days)

### Graceful Degradation

If Redis is unavailable:
- All caching functions return `None` or `False`
- Endpoints fall back to direct database queries
- No errors thrown - transparent degradation
- Logger warnings indicate caching disabled

## Performance Impact

### Without Caching
- **Progress analytics**: 200-400ms (complex aggregation queries)
- **Drill recommendations**: 150-300ms (joins + ML logic)
- **Achievements**: 100-200ms (temporal queries)

### With Caching
- **Progress analytics**: 5-15ms (cache hit)
- **Drill recommendations**: 5-15ms (cache hit)
- **Achievements**: 5-15ms (cache hit)

**Expected cache hit rate**: 70-85% for typical usage patterns

## Deployment Considerations

### Development
```bash
# Use local Redis
docker run -d -p 6379:6379 redis:7-alpine

# Start Celery with hot reload
watchmedo auto-restart --directory=./scripts --pattern=*.py -- \
  celery -A scripts.celery_tasks worker --loglevel=info
```

### Production (Azure)

**1. Use Azure Cache for Redis:**
```bash
az redis create \
  --name aria-cache \
  --resource-group aria-rg \
  --location eastus \
  --sku Standard \
  --vm-size C1
```

**2. Configure connection string:**
```bash
REDIS_URL=rediss://aria-cache.redis.cache.windows.net:6380/0?ssl_cert_reqs=required
```

**3. Deploy Celery as Azure Container Instance:**
```yaml
# celery-worker.yaml
apiVersion: 2019-12-01
location: eastus
name: aria-celery-worker
properties:
  containers:
  - name: worker
    properties:
      image: aria:latest
      command: ["celery", "-A", "scripts.celery_tasks", "worker", "--loglevel=info"]
      environmentVariables:
      - name: REDIS_URL
        secureValue: <redis-connection-string>
      resources:
        requests:
          cpu: 1.0
          memoryInGb: 2.0
```

**4. Deploy Celery Beat separately:**
```yaml
# celery-beat.yaml
apiVersion: 2019-12-01
location: eastus
name: aria-celery-beat
properties:
  containers:
  - name: beat
    properties:
      image: aria:latest
      command: ["celery", "-A", "scripts.celery_tasks", "beat", "--loglevel=info"]
      environmentVariables:
      - name: REDIS_URL
        secureValue: <redis-connection-string>
      resources:
        requests:
          cpu: 0.5
          memoryInGb: 1.0
```

### Monitoring

**1. Celery metrics:**
```python
celery -A scripts.celery_tasks inspect active
celery -A scripts.celery_tasks inspect stats
celery -A scripts.celery_tasks inspect scheduled
```

**2. Redis metrics:**
```bash
redis-cli INFO stats
redis-cli INFO memory
redis-cli SLOWLOG GET 10
```

**3. Application Insights integration:**
```python
from opencensus.ext.azure import metrics_exporter

# Track cache hit rate
cache_hit_metric = metrics_exporter.MetricsExporter(
    connection_string=os.getenv('APPLICATIONINSIGHTS_CONNECTION_STRING')
)
```

## Troubleshooting

### Celery Worker Won't Start
```bash
# Check Redis connection
redis-cli ping

# Verify Celery can import modules
python -c "from scripts.celery_tasks import test_task; print('OK')"

# Check for port conflicts
lsof -i :6379  # Redis
lsof -i :5555  # Flower (if running)
```

### Tasks Not Executing
```bash
# Verify beat is running
celery -A scripts.celery_tasks inspect scheduled

# Check worker logs
celery -A scripts.celery_tasks worker --loglevel=debug

# Manually trigger task to test
celery -A scripts.celery_tasks call test_task
```

### Cache Misses Too High
```python
# Check TTL settings
from cache_utils import get_cache_stats
stats = get_cache_stats()
print(f"Hit rate: {stats['hit_rate']}")

# Increase TTLs if data changes infrequently
set_cached(key, value, 7200)  # 2 hours instead of 1

# Warm cache on login
await warm_cache_for_user(user_id)
```

### Memory Issues
```bash
# Check Redis memory usage
redis-cli INFO memory

# Reduce TTLs to expire data faster
# Or increase maxmemory-policy in redis.conf:
maxmemory 2gb
maxmemory-policy allkeys-lru
```

## Best Practices

### Caching
1. **Cache expensive queries only** - Don't cache simple lookups
2. **Set appropriate TTLs** - Balance freshness vs performance
3. **Invalidate on writes** - Keep data consistent
4. **Handle cache misses gracefully** - Always have DB fallback
5. **Monitor hit rates** - Aim for 70%+ hit rate

### Background Tasks
1. **Keep tasks idempotent** - Safe to run multiple times
2. **Add error handling** - Tasks should never crash worker
3. **Log task progress** - Easy debugging and monitoring
4. **Set timeouts** - Prevent runaway tasks
5. **Use rate limiting** - Don't overwhelm database

## Testing

**Test caching:**
```python
import pytest
from cache_utils import set_cached, get_cached, delete_cached

def test_cache_operations():
    key = "test:key"
    value = {"data": "test"}
    
    # Set
    assert set_cached(key, value, 60)
    
    # Get
    assert get_cached(key) == value
    
    # Delete
    assert delete_cached(key)
    assert get_cached(key) is None
```

**Test background tasks:**
```python
from scripts.celery_tasks import generate_all_suggestions

def test_suggestion_generation(monkeypatch):
    # Mock get_active_users
    monkeypatch.setattr(
        'scripts.celery_tasks.get_active_users',
        lambda: ['user1', 'user2']
    )
    
    result = generate_all_suggestions()
    assert result['total'] == 2
```

## Future Enhancements

1. **Distributed Caching** - Multi-region Redis cluster
2. **Task Prioritization** - Priority queues for urgent tasks
3. **Dynamic Scheduling** - Adjust task frequency based on user activity
4. **Real-time Updates** - WebSocket notifications when tasks complete
5. **ML Model Caching** - Cache AI model predictions
6. **Database Query Caching** - Middleware-level query result caching
