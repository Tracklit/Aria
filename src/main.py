from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
from dotenv import load_dotenv
from openai import AzureOpenAI
from azure.identity import DefaultAzureCredential
import requests
from datetime import datetime, timezone, timedelta
import json
import base64
import stripe

# Load environment variables
load_dotenv()

# Import production modules
from src.auth_middleware import require_auth, optional_auth, require_roles
from src.observability import observability, ObservabilityMiddleware, logger, track_performance
from src.database import (
    db_pool, get_athlete_profile, get_user_subscription, update_user_subscription,
    track_query_usage, get_monthly_usage, create_athlete_profile, update_athlete_profile,
    delete_athlete_profile, update_athlete_mood, get_knowledge_items, get_knowledge_item_by_id,
    create_knowledge_item, update_knowledge_item, delete_knowledge_item, search_knowledge_items,
    get_coach_athletes, link_coach_athlete, unlink_coach_athlete, get_query_usage_details
)

# Debug environment variables (you can remove this later)
logger.info("=== ENVIRONMENT VARIABLES DEBUG ===")
logger.info(f"REDIS_HOST: {os.getenv('REDIS_HOST')}")
logger.info(f"REDIS_PORT: {os.getenv('REDIS_PORT')}")
logger.info(f"REDIS_DB: {os.getenv('REDIS_DB')}")
logger.info(f"REDIS_PASSWORD: {'SET' if os.getenv('REDIS_PASSWORD') else 'NOT SET'}")
logger.info(f"DATABASE_URL: {'SET' if os.getenv('DATABASE_URL') else 'NOT SET'}")
logger.info(f"STRIPE_SECRET_KEY: {'SET' if os.getenv('STRIPE_SECRET_KEY') else 'NOT SET'}")
logger.info("=====================================")

# NOW import cache and rate limiter (after environment is loaded)
from src.cache import cache
from src.rate_limit import rate_limiter, apply_rate_limit, RATE_LIMITS, SUBSCRIPTION_LIMITS

# Import wearable integration
try:
    from src.wearable_integration import wearable_integrator
    WEARABLE_INTEGRATION_AVAILABLE = True
    logger.info("Wearable integration loaded successfully")
except ImportError:
    WEARABLE_INTEGRATION_AVAILABLE = False
    logger.warning("Wearable integration not available - create wearable_integration.py to enable")

# Import companion features
from src.companion_endpoints import router as companion_router
from src.database_extensions import (
    create_companion_tables,
    save_conversation,
    get_recent_context
)

# Import additional feature routers
from src.additional_endpoints import (
    webhook_router, social_router, analytics_router,
    race_router, export_router, voice_router,
    realtime_router, equipment_router, gamification_router
)

# Initialize Azure OpenAI client with API Key (simpler authentication)
from src.keyvault_helper import get_env_with_keyvault_resolution

client = AzureOpenAI(
    api_key=get_env_with_keyvault_resolution("AZURE_OPENAI_API_KEY"),
    api_version="2024-02-15-preview",
    azure_endpoint=get_env_with_keyvault_resolution("AZURE_OPENAI_ENDPOINT")
)

# Get the deployment name for Azure OpenAI
AZURE_OPENAI_DEPLOYMENT = get_env_with_keyvault_resolution("AZURE_OPENAI_DEPLOYMENT")

# Initialize Stripe
stripe.api_key = get_env_with_keyvault_resolution("STRIPE_SECRET_KEY")

# Allowed origins for TrackLit integration
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "https://tracklit.app,https://www.tracklit.app,https://api.tracklit.app").split(",")

# FastAPI app instance
app = FastAPI(
    title="Aria API",
    description="AI-powered running coach API integrated with TrackLit platform",
    version="0.2.0"
)

# Add observability middleware first (for request/response logging)
app.add_middleware(ObservabilityMiddleware)

# Add CORS middleware with restricted origins for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "X-API-Key"],
)

# Middleware to parse JSON body for rate limiting
@app.middleware("http")
async def parse_json_body(request: Request, call_next):
    """Middleware to parse JSON body for rate limiting"""
    if request.headers.get("content-type") == "application/json":
        try:
            body = await request.body()
            if body:
                request._json_body = json.loads(body.decode())
        except:
            pass
    
    response = await call_next(request)
    return response

# Include companion feature routers
app.include_router(companion_router, prefix="/api/v1", tags=["Companion Features"])

# Include additional feature routers
app.include_router(webhook_router, prefix="/api/v1", tags=["Webhooks"])
app.include_router(social_router, prefix="/api/v1", tags=["Social"])
app.include_router(analytics_router, prefix="/api/v1", tags=["Analytics"])
app.include_router(race_router, prefix="/api/v1", tags=["Race Management"])
app.include_router(export_router, prefix="/api/v1", tags=["Data Export"])
app.include_router(voice_router, prefix="/api/v1", tags=["Voice"])
app.include_router(realtime_router, prefix="/api/v1", tags=["Real-time"])
app.include_router(equipment_router, prefix="/api/v1", tags=["Equipment"])
app.include_router(gamification_router, prefix="/api/v1", tags=["Gamification"])

# =============================================================================
# HEALTH CHECK ENDPOINTS
# =============================================================================

@app.get("/health/live", tags=["health"])
async def liveness_check():
    """
    Kubernetes liveness probe endpoint.
    Returns 200 if the application is running.
    """
    return JSONResponse(
        status_code=200,
        content={
            "status": "alive",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )

@app.get("/health/ready", tags=["health"])
async def readiness_check():
    """
    Kubernetes readiness probe endpoint.
    Checks if all dependencies (Redis, PostgreSQL) are available.
    """
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": {}
    }
    
    status_code = 200
    
    # Check Redis
    try:
        if cache.redis:
            cache.redis.ping()
            health_status["checks"]["redis"] = "healthy"
        else:
            health_status["checks"]["redis"] = "unavailable"
            health_status["status"] = "degraded"
            status_code = 503
    except Exception as e:
        health_status["checks"]["redis"] = f"unhealthy: {str(e)}"
        health_status["status"] = "unhealthy"
        status_code = 503
    
    # Check PostgreSQL
    try:
        with db_pool.get_cursor() as cursor:
            cursor.execute("SELECT 1")
            health_status["checks"]["database"] = "healthy"
    except Exception as e:
        health_status["checks"]["database"] = f"unhealthy: {str(e)}"
        health_status["status"] = "unhealthy"
        status_code = 503
    
    # Check OpenAI (optional - doesn't block readiness)
    try:
        # Quick check - we don't actually make an API call
        if os.getenv("OPENAI_API_KEY"):
            health_status["checks"]["openai"] = "configured"
        else:
            health_status["checks"]["openai"] = "not_configured"
    except Exception as e:
        health_status["checks"]["openai"] = f"error: {str(e)}"
    
    return JSONResponse(status_code=status_code, content=health_status)

@app.get("/health/startup", tags=["health"])
async def startup_check():
    """
    Kubernetes startup probe endpoint.
    Checks if the application has completed initialization.
    """
    # Check critical components for startup
    checks = {
        "cache_initialized": cache.redis is not None,
        "db_pool_initialized": db_pool.pool is not None,
        "openai_configured": os.getenv("OPENAI_API_KEY") is not None
    }
    
    if all(checks.values()):
        return JSONResponse(
            status_code=200,
            content={
                "status": "started",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "checks": checks
            }
        )
    else:
        return JSONResponse(
            status_code=503,
            content={
                "status": "starting",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "checks": checks
            }
        )

# =============================================================================
# TEST ENDPOINT FOR OPENAI (NO RATE LIMIT)
# =============================================================================

@app.post("/test/openai")
async def test_openai(question: str):
    """Simple test endpoint to verify OpenAI integration without rate limiting"""
    try:
        messages = [
            {"role": "system", "content": "You are a helpful sprint coaching assistant. Answer in 2 sentences or less."},
            {"role": "user", "content": question}
        ]
        
        response = client.chat.completions.create(
            model=AZURE_OPENAI_DEPLOYMENT,
            messages=messages,
            temperature=0.7,
            max_tokens=100
        )
        
        answer = response.choices[0].message.content
        
        return {
            "success": True,
            "question": question,
            "answer": answer,
            "model": "gpt-4o",
            "tokens": response.usage.total_tokens if response.usage else 0
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class AskRequest(BaseModel):
    user_id: str
    user_input: str

class AskResponse(BaseModel):
    analysis: str
    recommendation: str
    bibliography: Optional[str] = None

class UserCreate(BaseModel):
    name: str
    gender: str
    email: str
    age: int
    training_goal: str
    injury_status: str
    sleep_hours: float
    sleep_quality: str
    coach_mode: str
    training_days_per_week: int
    mood: Optional[str] = "neutral"
    streak_count: Optional[int] = 0
    badges: Optional[List[str]] = []

class UserUpdate(BaseModel):
    name: Optional[str] = None
    gender: Optional[str] = None
    email: Optional[str] = None
    age: Optional[int] = None
    training_goal: Optional[str] = None
    injury_status: Optional[str] = None
    sleep_hours: Optional[float] = None
    sleep_quality: Optional[str] = None
    coach_mode: Optional[str] = None
    training_days_per_week: Optional[int] = None
    mood: Optional[str] = None
    streak_count: Optional[int] = None
    badges: Optional[List[str]] = None

class PlanRequest(BaseModel):
    user_id: str
    experience_level: str
    training_days_per_week: int
    competition_date: str

class MoodReport(BaseModel):
    user_id: str
    mood: str

class KnowledgeItem(BaseModel):
    id: Optional[str] = None
    title: str
    summary: str
    tags: List[str]
    url: Optional[str] = None

class KnowledgeItemUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    tags: Optional[List[str]] = None
    url: Optional[str] = None

class CoachAthleteLink(BaseModel):
    coach_email: str
    athlete_id: str

class WearableAuthRequest(BaseModel):
    user_id: str
    provider: str
    success_url: Optional[str] = None
    failure_url: Optional[str] = None

class SubscriptionUpgrade(BaseModel):
    user_id: str
    new_tier: str
    payment_method_id: Optional[str] = None

class UsageTrack(BaseModel):
    user_id: str
    endpoint: str
    tokens_consumed: Optional[int] = 0
    subscription_tier: Optional[str] = "free"
    request_cost: Optional[float] = 0.0

# =============================================================================
# CONSTANTS AND CONFIGURATIONS
# =============================================================================

COACH_MODES = {
    "strict": "Speak like a no-nonsense coach. Be direct and focused purely on results. Minimal emotion, high expectations.",
    "supportive": "Be encouraging and empathetic. Motivate the athlete. Celebrate progress. Use a warm, human tone.",
    "friendly": "Speak like a teammate. Use relaxed, informal language. Show support through camaraderie and shared experience."
}

ARIA_PROMPT = """
Aria is a multilingual companion AI for professional and elite sprinters, embedded in a sprint training app to provide contextual, dynamic, and personalized support. It offers intelligent feedback based on training sessions, answers sprint-specific questions, analyzes performance patterns, recommends drills for technical improvement, and suggests recovery strategies—all tailored to the user's unique journey.

Aria doesn't replace coaching—it enhances it by being available anytime for questions, guidance, and insight. It serves as a digital performance partner, offering a coach-like presence with 24/7 support. It communicates with the tone of a high-performance companion: motivating, insightful, precise, and deeply respectful of the user's training level.

It always seeks training context first—asking for the user's plan, training history, age, and recent sprint results—before offering advice. It avoids one-size-fits-all answers, focusing instead on performance optimization through thoughtful, data-informed feedback. When responding, it references a curated library of scientific literature, elite coaching systems, and validated tools to ensure credibility.

Aria tailors advice based on the athlete's age. It adjusts periodization recommendations, recovery protocols, and injury risk flags according to known age-related physiological patterns. If the athlete is older than 30 years, it additionally asks about their profession and what they do for a living. Based on their response, it double-checks whether they spend extended periods of time standing or sitting, as this can impact recovery, posture, and mobility. If the athlete is classified as a master sprinter (35+), it explicitly includes age-specific recommendations related to recovery duration, injury prevention, and training intensity—grounded in guidance from World Masters Athletics.

Aria integrates knowledge from biomechanics, periodization, nutrition, mental performance, and strength conditioning. It supports users by helping them make smart decisions about workload, technique, recovery, and competitive readiness.

Aria is not prescriptive—it collaborates with the athlete to co-pilot their training experience, always providing rationale and bibliographic links to its sources.

Aria can also provide recommendations for common sprinting and running injuries, such as hamstring strains, Achilles tendinopathy, shin splints, plantar fasciitis, and hip flexor issues. It offers evidence-based advice on identification, early response, recovery strategies, and prevention, always encouraging athletes to consult medical professionals for diagnosis. These recommendations are backed by recent sports medicine and rehabilitation literature, and integrated with practical guidance for return-to-sport protocols. When discussing injuries, Aria asks about sleep duration and sleep quality (e.g., "How many hours do you sleep?" and "How do you qualify your sleep?" with options like good, bad, regular, excellent) to better understand recovery context.

Aria also helps athletes visualize and interpret performance data. It can highlight trends from recent sessions—such as improvements in top speed, stride frequency, or load—and present that in a narrative or chart-ready format. This empowers athletes to track progress and make pattern-driven decisions.

In addition, Aria supports the mental and emotional side of sprinting. It offers guidance on race-day mindset, performance anxiety, recovery from setbacks, and mental resilience—drawing on resources like *Rebound*, *With Winning in Mind*, and *The Champion's Mind*. It serves as a steady, supportive presence to help athletes prepare not just physically, but mentally as well.

Aria supports multilingual interactions. Users can ask questions or receive advice in any supported language. Responses are automatically provided in the language of the user's input unless English is explicitly preferred. Scientific clarity is maintained across translations.

Aria greets users with a multilingual-aware welcome message and invites them to share their training history, current goals, daily routine, and sleep habits. This helps tailor advice from the start, ensuring fully contextualized support for performance, recovery, and well-being.

Respond using the following JSON structure:
{
  "analysis": "...",
  "recommendation": "...",
  "bibliography": "..."
}
"""

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

# Note: get_athlete_profile is now imported from database.py
# We keep this wrapper for backward compatibility and caching
def get_athlete_profile_cached(user_id: str):
    """Get athlete profile with caching (wraps database.py function)"""
    cache_key = f"athlete_profile:{user_id}"
    cached_profile = cache.get(cache_key)
    
    if cached_profile:
        return cached_profile
    
    # Use database.py function
    profile = get_athlete_profile(user_id)
    
    if not profile:
        raise HTTPException(status_code=404, detail="Athlete not found")
    
    cache.set(cache_key, profile, ttl=1800)
    
    return profile

def get_tier_features(tier: str) -> List[str]:
    """Get list of features for a subscription tier"""
    features = {
        "free": [
            "1 AI consultation per month",
            "Basic training library access",
            "Community support"
        ],
        "pro": [
            "15 AI consultations per month",
            "Full training library access",
            "Wearable device sync",
            "2 video analyses per month",
            "3 training plan generations per month",
            "Email support"
        ],
        "star": [
            "Unlimited AI consultations",
            "Full training library with offline access",
            "Real-time wearable integration",
            "Unlimited video analysis",
            "Unlimited training plan generation",
            "All coaching modes",
            "Priority support (24hr response)",
            "Advanced analytics"
        ]
    }
    return features.get(tier, features["free"])

async def track_usage_internal(user_id: str, endpoint: str, tokens_consumed: int = 0):
    """Internal function to track usage"""
    try:
        # Use database.py function instead of Supabase REST API
        track_query_usage(user_id)
        logger.info(f"Usage tracked for user {user_id}", endpoint=endpoint, tokens=tokens_consumed)
    except Exception as e:
        logger.error(f"Usage tracking error: {e}", user_id=user_id)

# =============================================================================
# SUBSCRIPTION MANAGEMENT ENDPOINTS
# =============================================================================

@app.get("/subscription/status/{user_id}")
@apply_rate_limit("general")
async def get_subscription_status(request: Request, user_id: str):
    """Get user's current subscription status and usage"""
    try:
        # Use database.py functions instead of Supabase
        subscription = get_user_subscription(user_id)
        monthly_usage = get_monthly_usage(user_id)
        
        if subscription:
            tier = subscription.get("tier", "free")
            tier_limits = SUBSCRIPTION_LIMITS.get(tier, SUBSCRIPTION_LIMITS["free"])
            ask_limits = tier_limits.get("ask", {})
            monthly_limit = ask_limits.get("monthly_queries", 1)
            
            return {
                "user_id": user_id,
                "current_tier": tier,
                "monthly_query_count": monthly_usage,
                "query_limit": monthly_limit,
                "queries_remaining": monthly_limit - monthly_usage if monthly_limit != -1 else -1,
                "billing_cycle_start": subscription.get("billing_cycle_start"),
                "subscription_status": subscription.get("subscription_status", "active"),
                "next_billing_date": subscription.get("next_billing_date"),
                "features": get_tier_features(tier)
            }
        
        # Default to free tier
        return {
            "user_id": user_id,
            "current_tier": "free",
            "monthly_query_count": monthly_usage,
            "query_limit": 1,
            "queries_remaining": max(0, 1 - monthly_usage),
            "billing_cycle_start": datetime.now().strftime("%Y-%m-%d"),
            "subscription_status": "active",
            "next_billing_date": None,
            "features": get_tier_features("free")
        }
        
    except Exception as e:
        logger.error(f"Error getting subscription status: {e}", user_id=user_id)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/subscription/upgrade")
@apply_rate_limit("general")
async def upgrade_subscription(request: Request, upgrade_req: SubscriptionUpgrade):
    """Upgrade user subscription tier"""
    try:
        if upgrade_req.new_tier not in ["pro", "star"]:
            raise HTTPException(status_code=400, detail="Invalid subscription tier")
        
        current_subscription = rate_limiter.get_user_subscription(upgrade_req.user_id)
        current_tier = current_subscription.get("tier", "free")
        
        tier_hierarchy = {"free": 0, "pro": 1, "star": 2}
        if tier_hierarchy.get(upgrade_req.new_tier, 0) <= tier_hierarchy.get(current_tier, 0):
            raise HTTPException(status_code=400, detail="Cannot downgrade or same tier")
        
        update_data = {
            "tier": upgrade_req.new_tier,
            "billing_cycle_start": datetime.now().strftime("%Y-%m-%d"),
            "subscription_status": "active",
            "updated_at": datetime.now().isoformat()
        }
        
        if upgrade_req.payment_method_id:
            try:
                tier_prices = {
                    "pro": os.getenv("STRIPE_PRICE_ID_PRO", "price_pro_monthly"),
                    "star": os.getenv("STRIPE_PRICE_ID_STAR", "price_star_monthly")
                }
                
                customer = stripe.Customer.create(
                    payment_method=upgrade_req.payment_method_id,
                    invoice_settings={'default_payment_method': upgrade_req.payment_method_id}
                )
                
                subscription = stripe.Subscription.create(
                    customer=customer.id,
                    items=[{'price': tier_prices[upgrade_req.new_tier]}],
                    metadata={'user_id': upgrade_req.user_id}
                )
                
                update_data["stripe_subscription_id"] = subscription.id
                update_data["stripe_customer_id"] = customer.id
                
            except stripe.error.StripeError as e:
                raise HTTPException(status_code=400, detail=f"Payment failed: {str(e)}")
        
        # Update subscription using database.py
        update_user_subscription(
            user_id=upgrade_req.user_id,
            tier=upgrade_req.new_tier,
            status="active",
            stripe_subscription_id=update_data.get("stripe_subscription_id"),
            stripe_customer_id=update_data.get("stripe_customer_id")
        )
        
        cache.delete(f"subscription:{upgrade_req.user_id}")
        
        return {
            "message": f"Successfully upgraded to {upgrade_req.new_tier} tier",
            "user_id": upgrade_req.user_id,
            "new_tier": upgrade_req.new_tier,
            "effective_date": datetime.now().isoformat(),
            "features": get_tier_features(upgrade_req.new_tier)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/usage/monthly/{user_id}")
@apply_rate_limit("general")
async def get_monthly_usage(request: Request, user_id: str):
    """Get detailed monthly usage breakdown"""
    try:
        current_usage = rate_limiter.get_monthly_usage(user_id)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        # Get detailed usage from database
        usage_data = get_query_usage_details(user_id, start_date.isoformat(), end_date.isoformat())
        
        usage_details = []
        queries_by_type = {}
        daily_usage = {}
        
        for record in usage_data:
            endpoint = record.get("endpoint", "unknown")
            date = record.get("query_timestamp", "")[:10]
            
            queries_by_type[endpoint] = queries_by_type.get(endpoint, 0) + 1
            daily_usage[date] = daily_usage.get(date, 0) + 1
            
            usage_details.append({
                "date": record.get("query_timestamp"),
                "endpoint": endpoint,
                "tokens_consumed": record.get("tokens_consumed", 0)
            })
        
        daily_usage_list = [
            {"date": date, "queries": count}
            for date, count in sorted(daily_usage.items(), reverse=True)
        ]
        
        return {
            "user_id": user_id,
            "current_month": datetime.now().strftime("%Y-%m"),
            "total_queries": current_usage,
            "queries_by_type": queries_by_type,
            "daily_usage": daily_usage_list[:7],
            "usage_details": usage_details[:50]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/subscription/tiers")
async def get_subscription_tiers(request: Request):
    """Get available subscription tiers and pricing"""
    return {
        "tiers": [
            {
                "name": "free",
                "display_name": "Free",
                "price": 0.00,
                "currency": "USD",
                "billing_period": "month",
                "features": get_tier_features("free"),
                "limits": {
                    "monthly_queries": 1,
                    "video_analysis": 0,
                    "plan_generation": 0
                }
            },
            {
                "name": "pro",
                "display_name": "Pro",
                "price": 4.99,
                "currency": "USD",
                "billing_period": "month",
                "features": get_tier_features("pro"),
                "limits": {
                    "monthly_queries": 15,
                    "video_analysis": 2,
                    "plan_generation": 3
                }
            },
            {
                "name": "star",
                "display_name": "Star",
                "price": 9.99,
                "currency": "USD",
                "billing_period": "month",
                "features": get_tier_features("star"),
                "limits": {
                    "monthly_queries": -1,
                    "video_analysis": -1,
                    "plan_generation": -1
                }
            }
        ]
    }

@app.post("/subscription/cancel")
@apply_rate_limit("general")
async def cancel_subscription(request: Request, user_data: dict):
    """Cancel user subscription"""
    try:
        user_id = user_data.get("user_id")
        subscription = rate_limiter.get_user_subscription(user_id)
        stripe_subscription_id = subscription.get("stripe_subscription_id")
        
        if stripe_subscription_id:
            try:
                stripe.Subscription.modify(
                    stripe_subscription_id,
                    cancel_at_period_end=True
                )
            except stripe.error.StripeError as e:
                print(f"Stripe cancellation error: {e}")
        
        update_data = {
            "tier": "free",
            "subscription_status": "cancelled",
            "updated_at": datetime.now().isoformat()
        }
        
        # Update subscription in database
        update_user_subscription(
            user_id=user_id,
            tier="free",
            status="cancelled"
        )
        
        cache.delete(f"subscription:{user_id}")
        
        return {
            "message": "Subscription cancelled successfully",
            "user_id": user_id,
            "effective_date": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# ENHANCED AI CONSULTATION ENDPOINTS
# =============================================================================

@app.post("/ask", response_model=AskResponse)
@apply_rate_limit("ask")
async def ask_aria(request: Request, req: AskRequest):
    try:
        # Generate or use session ID for conversation continuity
        import uuid
        session_id = getattr(req, 'session_id', None) or str(uuid.uuid4())
        
        # Save user message to conversation history
        save_conversation(
            user_id=req.user_id,
            session_id=session_id,
            role="user",
            message=req.user_input
        )
        
        # Get recent conversation context (last 24 hours)
        recent_context = get_recent_context(req.user_id, hours=24)
        context_summary = ""
        if recent_context:
            context_summary = "\n\nRECENT CONVERSATION CONTEXT:\n"
            context_summary += "\n".join([
                f"- [{c.get('created_at', 'recent')}] {c['role']}: {c['message'][:100]}..." 
                for c in recent_context[-5:]  # Last 5 messages
            ])
        
        user = get_athlete_profile(req.user_id)
        mood = user.get("mood", "neutral")
        streak = user.get("streak_count", 0)
        badges = user.get("badges", [])

        mood_extra = ""
        if mood.lower() in ["tired", "sore"]:
            mood_extra = " The athlete reports being " + mood + ". Adjust advice to be more recovery-oriented."
        elif mood.lower() in ["motivated", "good"]:
            mood_extra = " The athlete reports feeling " + mood + ". You can push a bit more."

        tone_instruction = COACH_MODES.get(user.get("coach_mode", "supportive"), COACH_MODES["supportive"])

        mood_flag = ""
        if user.get("sleep_quality", "").lower() in ["bad", "poor"]:
            mood_flag = "The athlete might be tired or mentally off today. Adjust tone accordingly."
        if user.get("injury_status", "").lower() not in ["none", "", "no injury"]:
            mood_flag += " They are dealing with an injury, so show empathy and caution."

        user_context = f"""
Name: {user['name']}
Gender: {user['gender']}
Age: {user['age']}
Goal: {user['training_goal']}
Injury: {user['injury_status']}
Sleep: {user['sleep_hours']} hrs, Quality: {user['sleep_quality']}
Training Days/Week: {user.get('training_days_per_week', 'not set')}
Mood: {mood}
Streak: {streak}
Badges: {badges}
{context_summary}
"""

        messages = [
            {"role": "system", "content": f"{ARIA_PROMPT}\n\nCoaching Style: {tone_instruction}\n{mood_extra}\n{mood_flag}\n\nUse the recent conversation context to maintain continuity and remember what you've discussed."},
            {"role": "user", "content": f"{user_context}\nQuestion: {req.user_input}"}
        ]

        response = client.chat.completions.create(
            model=AZURE_OPENAI_DEPLOYMENT,
            messages=messages,
            temperature=0.7
        )

        content = response.choices[0].message.content
        response_data = eval(content)
        
        # Save AI response to conversation history
        save_conversation(
            user_id=req.user_id,
            session_id=session_id,
            role="assistant",
            message=response_data.get("response", content)
        )
        
        await track_usage_internal(req.user_id, "ask", len(content) // 4)

        # Add session_id to response for client to use in next request
        response_data["session_id"] = session_id
        return AskResponse(**response_data)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ask/media", response_model=AskResponse)
@apply_rate_limit("ask_media")
async def ask_media(request: Request, user_id: str = Form(...), user_input: str = Form(...), file: UploadFile = File(...)):
    try:
        user = get_athlete_profile(user_id)
        mood = user.get("mood", "neutral")
        tone_instruction = COACH_MODES.get(user.get("coach_mode", "supportive"), COACH_MODES["supportive"])

        mood_extra = ""
        if mood.lower() in ["tired", "sore"]:
            mood_extra = " The athlete reports being " + mood + ". Adjust advice to be more recovery-oriented."

        file_bytes = await file.read()
        base64_content = base64.b64encode(file_bytes).decode('utf-8')

        user_context = f"""
Name: {user['name']}
Gender: {user['gender']}
Age: {user['age']}
Goal: {user['training_goal']}
Injury: {user['injury_status']}
Sleep: {user['sleep_hours']} hrs, Quality: {user['sleep_quality']}
Training Days/Week: {user.get('training_days_per_week', 'not set')}
Mood: {mood}
Streak: {user.get('streak_count', 0)}
Badges: {user.get('badges', [])}
"""

        messages = [
            {"role": "system", "content": f"{ARIA_PROMPT}\n\nCoaching Style: {tone_instruction}\n{mood_extra}"},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": f"{user_context}\nQuestion: {user_input}"},
                    {"type": "image_url", "image_url": {"url": f"data:{file.content_type};base64,{base64_content}"}}
                ]
            }
        ]

        response = client.chat.completions.create(
            model=AZURE_OPENAI_DEPLOYMENT,
            messages=messages,
            temperature=0.7
        )

        content = response.choices[0].message.content
        response_data = eval(content)
        await track_usage_internal(user_id, "ask_media", len(content) // 4)

        return AskResponse(**response_data)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate_plan")
@apply_rate_limit("generate_plan")
async def generate_plan(request: Request, req: PlanRequest):
    try:
        user = get_athlete_profile(req.user_id)

        context = f"""
Name: {user['name']}
Gender: {user['gender']}
Age: {user['age']}
Goal: {user['training_goal']}
Injury: {user['injury_status']}
Sleep: {user['sleep_hours']} hrs, Quality: {user['sleep_quality']}
Training Days/Week: {req.training_days_per_week}
Experience: {req.experience_level}
Competition Date: {req.competition_date}
"""

        messages = [
            {"role": "system", "content": f"{ARIA_PROMPT}\n\nYou are now in periodization planning mode. Provide a weekly sprint training microcycle plan based on the user's profile, goal, and season timeline. Be structured and personalized."},
            {"role": "user", "content": context}
        ]

        response = client.chat.completions.create(
            model=AZURE_OPENAI_DEPLOYMENT,
            messages=messages,
            temperature=0.7
        )

        plan_content = response.choices[0].message.content
        await track_usage_internal(req.user_id, "generate_plan", len(plan_content) // 4)

        return {"plan": plan_content}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ask/enhanced", response_model=AskResponse)
@apply_rate_limit("ask")
async def ask_aria_enhanced(request: Request, req: AskRequest):
    """Enhanced AI consultation that includes wearable device data in analysis"""
    try:
        user = get_athlete_profile(req.user_id)
        
        base_context = f"""
Name: {user['name']}
Gender: {user['gender']}
Age: {user['age']}
Goal: {user['training_goal']}
Injury: {user['injury_status']}
Sleep (reported): {user['sleep_hours']} hrs, Quality: {user['sleep_quality']}
Training Days/Week: {user.get('training_days_per_week', 'not set')}
Mood: {user.get('mood', 'neutral')}
"""

        wearable_context = ""
        if WEARABLE_INTEGRATION_AVAILABLE:
            try:
                wearable_data = await wearable_integrator.get_daily_data(req.user_id)
                
                if wearable_data.get("success"):
                    sleep_data = wearable_data.get("sleep", {})
                    hr_data = wearable_data.get("heart_rate", {})
                    recovery_data = wearable_data.get("recovery", {})
                    insights = wearable_data.get("training_insights", {})
                    
                    wearable_context = f"""
WEARABLE DEVICE DATA (Today):
- Actual Sleep: {sleep_data.get('duration_hours', 'N/A')} hours (efficiency: {sleep_data.get('efficiency_percent', 'N/A')}%)
- Deep Sleep: {sleep_data.get('deep_sleep_hours', 'N/A')} hours
- Resting HR: {hr_data.get('resting_hr', 'N/A')} bpm (Max: {hr_data.get('max_hr', 'N/A')})
- HRV (RMSSD): {hr_data.get('hrv_rmssd', 'N/A')} ms
- Recovery Score: {recovery_data.get('recovery_score', 'N/A')}/100
- Training Readiness: {insights.get('readiness_score', 'N/A')}/100
- Device Recommendation: {insights.get('training_recommendation', 'moderate')}
- Warnings: {', '.join(insights.get('warnings', []))}

This objective data should take priority over subjective sleep reporting.
"""
            except:
                wearable_context = "\nWEARABLE DATA: Not available for this session."

        mood = user.get("mood", "neutral")
        tone_instruction = COACH_MODES.get(user.get("coach_mode", "supportive"), COACH_MODES["supportive"])

        mood_extra = ""
        if mood.lower() in ["tired", "sore"]:
            mood_extra = " The athlete reports being " + mood + ". Adjust advice to be more recovery-oriented."
        elif mood.lower() in ["motivated", "good"]:
            mood_extra = " The athlete reports feeling " + mood + ". You can push a bit more."

        full_context = f"{base_context}\n{wearable_context}"

        messages = [
            {"role": "system", "content": f"{ARIA_PROMPT}\n\nCoaching Style: {tone_instruction}\n{mood_extra}\n\nIMPORTANT: You have access to objective wearable device data. Use this data to provide more accurate and personalized advice than subjective reporting alone."},
            {"role": "user", "content": f"{full_context}\nQuestion: {req.user_input}"}
        ]

        response = client.chat.completions.create(
            model=AZURE_OPENAI_DEPLOYMENT,
            messages=messages,
            temperature=0.7
        )

        content = response.choices[0].message.content
        response_data = eval(content)
        await track_usage_internal(req.user_id, "ask", len(content) // 4)

        return AskResponse(**response_data)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# USER MANAGEMENT ENDPOINTS
# =============================================================================

@app.post("/user")
@apply_rate_limit("create_user")
async def create_user(request: Request, user: UserCreate):
    try:
        user_data = user.model_dump()
        
        # Create athlete profile
        created_user = create_athlete_profile(user_data)
        
        # Create default subscription
        try:
            update_user_subscription(
                user_id=created_user["id"],
                tier="free",
                status="active"
            )
        except Exception as e:
            print(f"Warning: Failed to create default subscription: {e}")
        
        return {"id": created_user["id"], "message": "User created successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/user/{user_id}")
@apply_rate_limit("general")
async def get_user(request: Request, user_id: str):
    """Get user profile"""
    try:
        user = get_athlete_profile(user_id)
        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/user/{user_id}")
@apply_rate_limit("general")
async def update_user(request: Request, user_id: str, user_update: UserUpdate):
    """Update user profile"""
    try:
        update_data = {k: v for k, v in user_update.model_dump().items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No valid fields to update")

        # Update athlete profile
        updated_profile = update_athlete_profile(user_id, update_data)
        
        if not updated_profile:
            raise HTTPException(status_code=404, detail="User not found")

        cache.delete(f"athlete_profile:{user_id}")

        return {"message": "User updated successfully", "updated_fields": list(update_data.keys())}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/user/{user_id}")
@apply_rate_limit("general")
async def delete_user(request: Request, user_id: str):
    """Delete user and all associated data"""
    try:
        # Delete athlete profile (cascades to subscriptions and usage)
        deleted = delete_athlete_profile(user_id)
        
        if not deleted:
            raise HTTPException(status_code=404, detail="User not found")

        cache.delete(f"athlete_profile:{user_id}")
        cache.delete(f"subscription:{user_id}")
        cache.clear_pattern(f"wearable_*:{user_id}:*")

        return {"message": "User deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/mood_report")
@apply_rate_limit("mood_report")
async def mood_report(request: Request, report: MoodReport):
    try:
        # Update athlete mood
        updated = update_athlete_mood(report.user_id, report.mood)
        
        if not updated:
            raise HTTPException(status_code=404, detail="User not found")

        cache.delete(f"athlete_profile:{report.user_id}")

        return {"message": "Mood updated successfully", "mood": report.mood}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# KNOWLEDGE LIBRARY ENDPOINTS
# =============================================================================

@app.get("/knowledge_library")
@apply_rate_limit("general")
async def list_knowledge_items(request: Request):
    """Get knowledge library with caching"""
    cache_key = "knowledge_library:all"
    cached_items = cache.get(cache_key)
    
    if cached_items:
        return cached_items
    
    try:
        items = get_knowledge_items(limit=100, offset=0)
        cache.set(cache_key, items, ttl=86400)
        return items
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/knowledge_library/{item_id}")
@apply_rate_limit("general")
async def get_knowledge_item(request: Request, item_id: str):
    """Get specific knowledge item with caching"""
    cache_key = f"knowledge_item:{item_id}"
    cached_item = cache.get(cache_key)
    
    if cached_item:
        return cached_item
    
    try:
        item = get_knowledge_item_by_id(item_id)
        
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        
        cache.set(cache_key, item, ttl=43200)
        return item
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/knowledge_library")
@apply_rate_limit("general")
async def create_knowledge_item_endpoint(request: Request, item: KnowledgeItem):
    """Create new knowledge item"""
    try:
        item_data = item.model_dump()
        item_data.pop('id', None)
        
        created_item = create_knowledge_item(item_data)
        
        cache.delete("knowledge_library:all")
        cache.clear_pattern("knowledge_search:*")
        
        return {"id": created_item["id"], "message": "Knowledge item created successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/knowledge_library/{item_id}")
@apply_rate_limit("general")
async def update_knowledge_item_endpoint(request: Request, item_id: str, item_update: KnowledgeItemUpdate):
    """Update knowledge item"""
    try:
        update_data = {k: v for k, v in item_update.model_dump().items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No valid fields to update")

        updated = update_knowledge_item(item_id, update_data)
        
        if not updated:
            raise HTTPException(status_code=404, detail="Knowledge item not found")

        cache.delete(f"knowledge_item:{item_id}")
        cache.delete("knowledge_library:all")
        cache.clear_pattern("knowledge_search:*")

        return {"message": "Knowledge item updated successfully", "updated_fields": list(update_data.keys())}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/knowledge_library/{item_id}")
@apply_rate_limit("general")
async def delete_knowledge_item_endpoint(request: Request, item_id: str):
    """Delete knowledge item"""
    try:
        deleted = delete_knowledge_item(item_id)
        
        if not deleted:
            raise HTTPException(status_code=404, detail="Knowledge item not found")

        cache.delete(f"knowledge_item:{item_id}")
        cache.delete("knowledge_library:all")
        cache.clear_pattern("knowledge_search:*")

        return {"message": "Knowledge item deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/knowledge_search")
@apply_rate_limit("general")
async def search_knowledge(request: Request, q: str):
    """Search knowledge library with caching"""
    cache_key = f"knowledge_search:{q.lower().strip()}"
    cached_results = cache.get(cache_key)
    
    if cached_results:
        return cached_results
    
    try:
        results = search_knowledge_items(q)
        cache.set(cache_key, results, ttl=3600)
        return results
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# COACH MANAGEMENT ENDPOINTS
# =============================================================================

@app.get("/coach_athletes/{coach_email}")
@apply_rate_limit("general")
async def get_coach_athletes_endpoint(request: Request, coach_email: str):
    """Get coach's athletes with caching"""
    cache_key = f"coach_athletes:{coach_email}"
    cached_athletes = cache.get(cache_key)
    
    if cached_athletes:
        return cached_athletes
    
    try:
        athletes = get_coach_athletes(coach_email)
        cache.set(cache_key, athletes, ttl=3600)
        return athletes
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/coach_athletes")
@apply_rate_limit("general")
async def link_athlete_to_coach(request: Request, link: CoachAthleteLink):
    try:
        link_coach_athlete(link.coach_email, link.athlete_id)
        
        cache.delete(f"coach_athletes:{link.coach_email}")

        return {"message": "Athlete linked to coach successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/coach_athletes")
@apply_rate_limit("general")
async def unlink_athlete_from_coach(request: Request, link: CoachAthleteLink):
    """Remove athlete from coach's roster"""
    try:
        deleted = unlink_coach_athlete(link.coach_email, link.athlete_id)
        
        if not deleted:
            raise HTTPException(status_code=404, detail="Link not found")

        cache.delete(f"coach_athletes:{link.coach_email}")

        return {"message": "Athlete unlinked from coach successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# WEARABLE DEVICE INTEGRATION ENDPOINTS
# =============================================================================

@app.post("/wearables/authenticate")
@apply_rate_limit("general")
async def authenticate_wearable_device(request: Request, auth_req: WearableAuthRequest):
    """Authenticate user's wearable device (Garmin, Apple Health, etc.)"""
    if not WEARABLE_INTEGRATION_AVAILABLE:
        raise HTTPException(status_code=501, detail="Wearable integration not available. Please install wearable_integration.py")
    
    try:
        auth_data = {
            "success_url": auth_req.success_url or "https://your-app.com/auth/success",
            "failure_url": auth_req.failure_url or "https://your-app.com/auth/failure"
        }
        
        result = await wearable_integrator.authenticate_user_device(
            auth_req.user_id,
            auth_req.provider,
            auth_data
        )
        
        if result.get("success"):
            return {
                "message": f"Authentication initiated for {auth_req.provider}",
                "auth_url": result.get("auth_url"),
                "provider": auth_req.provider,
                "next_steps": "Complete authentication at the provided URL"
            }
        else:
            raise HTTPException(status_code=400, detail=result.get("error"))
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/wearables/daily/{user_id}")
@apply_rate_limit("general")
async def get_daily_wearable_data(request: Request, user_id: str, date: str = None):
    """Get daily data from user's connected wearable devices"""
    if not WEARABLE_INTEGRATION_AVAILABLE:
        raise HTTPException(status_code=501, detail="Wearable integration not available")
    
    try:
        daily_data = await wearable_integrator.get_daily_data(user_id, date)
        
        if daily_data.get("success"):
            return daily_data
        else:
            raise HTTPException(status_code=404, detail=daily_data.get("error", "No data found"))
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/wearables/workouts/{user_id}")
@apply_rate_limit("general")
async def get_workout_data(request: Request, user_id: str, start_date: str, end_date: str = None):
    """Get workout/activity data from user's connected devices"""
    if not WEARABLE_INTEGRATION_AVAILABLE:
        raise HTTPException(status_code=501, detail="Wearable integration not available")
    
    try:
        workout_data = await wearable_integrator.get_workout_data(user_id, start_date, end_date)
        
        if workout_data.get("success"):
            return workout_data
        else:
            raise HTTPException(status_code=404, detail=workout_data.get("error", "No workout data found"))
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/wearables/training-readiness/{user_id}")
@apply_rate_limit("ask")
async def get_training_readiness(request: Request, user_id: str):
    """Get AI-powered training readiness assessment based on wearable data"""
    if not WEARABLE_INTEGRATION_AVAILABLE:
        raise HTTPException(status_code=501, detail="Wearable integration not available")
    
    try:
        daily_data = await wearable_integrator.get_daily_data(user_id)
        
        if not daily_data.get("success"):
            raise HTTPException(status_code=404, detail="No wearable data found")
        
        user = get_athlete_profile(user_id)
        
        wearable_insights = daily_data.get("training_insights", {})
        sleep_data = daily_data.get("sleep", {})
        recovery_data = daily_data.get("recovery", {})
        heart_rate_data = daily_data.get("heart_rate", {})
        
        wearable_context = f"""
User Profile:
- Name: {user['name']}, Age: {user['age']}, Goal: {user['training_goal']}
- Current mood: {user.get('mood', 'neutral')}
- Injury status: {user['injury_status']}

Today's Wearable Data:
- Sleep: {sleep_data.get('duration_hours', 'N/A')} hours, Quality: {sleep_data.get('efficiency_percent', 'N/A')}%
- Resting HR: {heart_rate_data.get('resting_hr', 'N/A')} bpm
- HRV: {heart_rate_data.get('hrv_rmssd', 'N/A')} ms
- Recovery Score: {recovery_data.get('recovery_score', 'N/A')}
- Readiness Score: {wearable_insights.get('readiness_score', 'N/A')}/100
- Current Recommendation: {wearable_insights.get('training_recommendation', 'unknown')}

Warnings: {', '.join(wearable_insights.get('warnings', []))}
"""

        messages = [
            {"role": "system", "content": f"{ARIA_PROMPT}\n\nYou are analyzing wearable device data to provide training readiness assessment. Focus on recovery, sleep quality, and physiological readiness. Be specific about training intensity recommendations."},
            {"role": "user", "content": f"{wearable_context}\n\nBased on this wearable data, provide a detailed training readiness assessment and specific recommendations for today's training session."}
        ]

        response = client.chat.completions.create(
            model=AZURE_OPENAI_DEPLOYMENT,
            messages=messages,
            temperature=0.7
        )

        ai_analysis = response.choices[0].message.content
        await track_usage_internal(user_id, "training_readiness", len(ai_analysis) // 4)
        
        return {
            "readiness_score": wearable_insights.get("readiness_score", 0),
            "recommendation": wearable_insights.get("training_recommendation", "moderate"),
            "wearable_summary": {
                "sleep_hours": sleep_data.get("duration_hours"),
                "sleep_quality": sleep_data.get("efficiency_percent"),
                "resting_hr": heart_rate_data.get("resting_hr"),
                "hrv": heart_rate_data.get("hrv_rmssd"),
                "recovery_score": recovery_data.get("recovery_score")
            },
            "ai_analysis": ai_analysis,
            "warnings": wearable_insights.get("warnings", []),
            "focus_areas": wearable_insights.get("focus_areas", [])
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/wearables/status/{user_id}")
@apply_rate_limit("general")
async def get_wearable_status(request: Request, user_id: str):
    """Check which wearable devices are connected for a user"""
    if not WEARABLE_INTEGRATION_AVAILABLE:
        return {
            "user_id": user_id,
            "wearable_integration": "not_available",
            "message": "Install wearable_integration.py to enable device connections"
        }
    
    try:
        providers = ["garmin", "apple", "fitbit"]
        status = {}
        
        for provider in providers:
            cache_key = f"wearable_auth:{user_id}:{provider}"
            auth_data = cache.get(cache_key)
            
            if auth_data:
                status[provider] = {
                    "connected": True,
                    "last_sync": auth_data.get("last_sync", "unknown"),
                    "user_id": auth_data.get("user_id")
                }
            else:
                status[provider] = {
                    "connected": False,
                    "last_sync": None,
                    "user_id": None
                }
        
        recent_data = await wearable_integrator.get_daily_data(user_id)
        has_recent_data = recent_data.get("success", False)
        
        return {
            "user_id": user_id,
            "providers": status,
            "has_recent_data": has_recent_data,
            "last_data_date": recent_data.get("date") if has_recent_data else None,
            "data_provider": recent_data.get("provider") if has_recent_data else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/wearables/disconnect/{user_id}/{provider}")
@apply_rate_limit("general")
async def disconnect_wearable_device(request: Request, user_id: str, provider: str):
    """Disconnect a wearable device from user account"""
    if not WEARABLE_INTEGRATION_AVAILABLE:
        raise HTTPException(status_code=501, detail="Wearable integration not available")
    
    try:
        cache_key = f"wearable_auth:{user_id}:{provider}"
        cache.delete(cache_key)
        
        cache.clear_pattern(f"wearable_daily:{user_id}:*")
        cache.clear_pattern(f"wearable_workouts:{user_id}:*")
        
        return {
            "message": f"Successfully disconnected {provider} for user {user_id}",
            "provider": provider,
            "user_id": user_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/wearables/insights/{user_id}")
@apply_rate_limit("general")
async def get_weekly_insights(request: Request, user_id: str, days: int = 7):
    """Get training insights based on past week's wearable data"""
    if not WEARABLE_INTEGRATION_AVAILABLE:
        raise HTTPException(status_code=501, detail="Wearable integration not available")
    
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        insights_data = []
        for i in range(days):
            date = (end_date - timedelta(days=i)).strftime("%Y-%m-%d")
            daily_data = await wearable_integrator.get_daily_data(user_id, date)
            
            if daily_data.get("success"):
                insights_data.append({
                    "date": date,
                    "sleep_hours": daily_data.get("sleep", {}).get("duration_hours"),
                    "recovery_score": daily_data.get("recovery", {}).get("recovery_score"),
                    "readiness_score": daily_data.get("training_insights", {}).get("readiness_score"),
                    "resting_hr": daily_data.get("heart_rate", {}).get("resting_hr")
                })
        
        if not insights_data:
            raise HTTPException(status_code=404, detail="Insufficient data for insights")
        
        avg_sleep = sum(d["sleep_hours"] for d in insights_data if d["sleep_hours"]) / len([d for d in insights_data if d["sleep_hours"]])
        avg_recovery = sum(d["recovery_score"] for d in insights_data if d["recovery_score"]) / len([d for d in insights_data if d["recovery_score"]])
        
        return {
            "period_days": days,
            "data_points": len(insights_data),
            "sleep_analysis": {
                "average_hours": round(avg_sleep, 1),
                "consistency": "good" if all(d.get("sleep_hours", 0) >= 7 for d in insights_data) else "needs_improvement"
            },
            "recovery_trends": {
                "average_score": round(avg_recovery, 1),
                "trend": "improving" if insights_data[0]["recovery_score"] > insights_data[-1]["recovery_score"] else "stable"
            },
            "recommendations": [
                f"Average sleep: {round(avg_sleep, 1)} hours - {'Maintain current sleep schedule' if avg_sleep >= 7.5 else 'Increase sleep duration'}",
                f"Recovery trending: {'well' if avg_recovery >= 75 else 'needs attention'}"
            ],
            "daily_data": insights_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# ADMIN AND MONITORING ENDPOINTS
# =============================================================================

@app.get("/test-redis-connection")
async def test_redis_connection():
    """Test Redis connection and basic operations"""
    try:
        is_connected = cache.is_connected()
        
        if not is_connected:
            return {
                "success": False,
                "redis_connected": False,
                "message": "Redis connection failed"
            }
        
        test_key = "test_connection"
        test_value = {"test": True, "timestamp": datetime.now().isoformat()}
        set_success = cache.set(test_key, test_value, ttl=60)
        
        retrieved_value = cache.get(test_key)
        get_success = retrieved_value is not None
        
        delete_success = cache.delete(test_key)
        
        return {
            "success": True,
            "redis_connected": is_connected,
            "set_operation": set_success,
            "get_operation": get_success,
            "delete_operation": delete_success,
            "data_integrity": retrieved_value == test_value if get_success else False
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@app.get("/admin/cache/stats")
async def get_cache_stats():
    """Get cache statistics"""
    try:
        stats = cache.get_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/admin/cache/clear")
async def clear_cache(pattern: str = None):
    """Clear cache with optional pattern"""
    try:
        if pattern:
            cleared = cache.clear_pattern(pattern)
            return {
                "message": f"Cleared {cleared} keys matching pattern: {pattern}",
                "keys_cleared": cleared
            }
        else:
            return {
                "error": "Pattern required for safety. Use pattern='*' to clear all."
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/admin/cache/{key}")
async def delete_cache_key(key: str):
    """Delete specific cache key"""
    try:
        success = cache.delete(key)
        return {
            "message": f"Key '{key}' deleted" if success else f"Key '{key}' not found",
            "deleted": success
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/admin/cache/health")
async def cache_health_check():
    """Comprehensive cache health check"""
    try:
        health = cache.health_check()
        return health
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/admin/rate-limits/status")
async def get_rate_limit_status(request: Request):
    """Get current rate limit status"""
    try:
        client_id = rate_limiter._get_client_id(request)
        
        status = {
            "client_id": client_id,
            "redis_connected": cache.is_connected(),
            "rate_limits": {}
        }
        
        for endpoint, config in RATE_LIMITS.items():
            endpoint_status = rate_limiter.get_rate_limit_info(
                client_id, 
                endpoint, 
                config["window_seconds"]
            )
            status["rate_limits"][endpoint] = endpoint_status
        
        return status
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/admin/rate-limits/config")
async def get_rate_limit_config():
    """Get rate limiting configuration"""
    return {
        "rate_limits": RATE_LIMITS,
        "subscription_limits": SUBSCRIPTION_LIMITS,
        "features": {
            "redis_enabled": cache.is_connected(),
            "subscription_tiers": ["free", "pro", "star"]
        }
    }

@app.post("/admin/rate-limits/reset")
async def reset_rate_limits(request: Request):
    """Reset all rate limits (admin only)"""
    try:
        cleared = cache.clear_pattern("rate_limit:*")
        return {
            "message": "Rate limits reset",
            "keys_cleared": cleared
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """API health check endpoint with companion features status"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0",  # Updated for Aria companion features
        "services": {}
    }
    
    # Check Redis/Cache
    try:
        from src.cache_utils import is_cache_healthy, get_cache_stats
        cache_healthy = is_cache_healthy()
        health_status["services"]["cache"] = {
            "status": "healthy" if cache_healthy else "unhealthy",
            "enabled": True
        }
        if cache_healthy:
            stats = get_cache_stats()
            health_status["services"]["cache"]["hit_rate"] = stats.get("hit_rate", "N/A")
            health_status["services"]["cache"]["total_keys"] = stats.get("total_keys", 0)
    except Exception as e:
        health_status["services"]["cache"] = {"status": "error", "error": str(e)}
    
    # Check Database
    try:
        from src.database import db_pool
        conn = db_pool.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.close()
        db_pool.return_connection(conn)
        health_status["services"]["database"] = {"status": "healthy"}
    except Exception as e:
        health_status["services"]["database"] = {"status": "unhealthy", "error": str(e)}
        health_status["status"] = "degraded"
    
    # Check Celery (optional - won't fail health check if unavailable)
    try:
        from scripts.celery_tasks import celery_app
        inspect = celery_app.control.inspect(timeout=1.0)
        active_workers = inspect.active()
        health_status["services"]["celery"] = {
            "status": "healthy" if active_workers else "unavailable",
            "workers": len(active_workers) if active_workers else 0,
            "note": "Background tasks disabled" if not active_workers else "Background tasks active"
        }
    except Exception as e:
        health_status["services"]["celery"] = {
            "status": "unavailable",
            "note": "Background tasks disabled - this is optional"
        }
    
    # Check Companion Features
    health_status["features"] = {
        "conversation_memory": True,
        "proactive_suggestions": True,
        "ai_analysis": True,
        "drill_recommendations": True,
        "goal_tracking": True,
        "background_tasks": health_status["services"].get("celery", {}).get("status") == "healthy",
        "caching": health_status["services"].get("cache", {}).get("status") == "healthy"
    }
    
    return health_status

# =============================================================================
# STARTUP MESSAGE
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    
    # Initialize companion tables
    logger.info("Initializing Aria companion feature tables...")
    create_companion_tables()
    logger.info("Companion tables initialized successfully")
    
    print("\n" + "="*60)
    print("ARIA API WITH WEARABLE INTEGRATION")
    print("="*60)
    print(f"Redis Connected: {cache.is_connected()}")
    print(f"Wearable Integration: {WEARABLE_INTEGRATION_AVAILABLE}")
    print(f"Subscription Management: Enabled")
    print(f"Companion Features: Enabled")
    print("="*60)
    print("Starting server on http://localhost:8000")
    print("API Docs: http://localhost:8000/docs")
    print("="*60 + "\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
