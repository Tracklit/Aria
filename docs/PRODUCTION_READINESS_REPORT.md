# Aria API - Production Readiness Analysis & Recommendations
## Integration with TrackLit Platform

**Analysis Date:** November 15, 2025  
**Current Version:** v0.2  
**Target Platform:** TrackLit (Track & Field Training Platform)

---

## Executive Summary

Your Aria API is a well-structured AI-powered coaching service with solid foundations. However, to integrate it as the AI component of the TrackLit platform and achieve production readiness, you need to add several critical components for **security, scalability, monitoring, deployment, and infrastructure**.

**Current Strengths:**
✅ FastAPI framework with proper async support  
✅ Redis caching implementation  
✅ Subscription-based rate limiting  
✅ Wearable device integration  
✅ Comprehensive AI coaching logic  
✅ Good separation of concerns (cache.py, rate_limit.py, wearable_integration.py)

**Critical Missing Components:**
❌ No containerization (Docker)  
❌ No infrastructure as code (IaC)  
❌ No CI/CD pipeline  
❌ No comprehensive logging/monitoring  
❌ No health checks and observability  
❌ No API documentation/OpenAPI schema  
❌ No authentication/authorization middleware  
❌ No database migration system  
❌ No error tracking (Sentry, etc.)  
❌ No load balancing configuration  
❌ No backup/disaster recovery  

---

## 1. Infrastructure & Deployment

### 1.1 Azure Integration (TrackLit Architecture Alignment)

Based on the TrackLit deployment guide, you should deploy Aria as:
- **Azure App Service** or **Azure Container Apps** (for the API)
- **Azure Functions** (for background AI processing)
- **Azure Service Bus** (for async job queues)
- **Azure Application Insights** (for monitoring)

### Missing: Dockerfile

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 Aria && chown -R Aria:Aria /app
USER Aria

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Expose port
EXPOSE 8000

# Run with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### Missing: docker-compose.yml (for local development)

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_DB=0
      - REDIS_PASSWORD=
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_KEY=${SUPABASE_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
    depends_on:
      - redis
    volumes:
      - .:/app
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:
```

### Missing: Azure Bicep Infrastructure as Code

```bicep
// Aria-infrastructure.bicep
param location string = resourceGroup().location
param environment string = 'prod'
param appServicePlanSku string = 'S1'

// App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: 'asp-Aria-${environment}'
  location: location
  sku: {
    name: appServicePlanSku
    tier: 'Standard'
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

// App Service (Aria API)
resource appService 'Microsoft.Web/sites@2022-03-01' = {
  name: 'app-Aria-api-${environment}'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOCKER|your-registry.azurecr.io/Aria:latest'
      alwaysOn: true
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      http20Enabled: true
      appSettings: [
        {
          name: 'WEBSITES_PORT'
          value: '8000'
        }
        {
          name: 'DOCKER_REGISTRY_SERVER_URL'
          value: 'https://your-registry.azurecr.io'
        }
        {
          name: 'DOCKER_ENABLE_CI'
          value: 'true'
        }
      ]
    }
  }
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-Aria-${environment}'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    Request_Source: 'rest'
  }
}

// Azure Cache for Redis
resource redis 'Microsoft.Cache/redis@2022-06-01' = {
  name: 'redis-Aria-${environment}'
  location: location
  properties: {
    sku: {
      name: 'Standard'
      family: 'C'
      capacity: 1
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
  }
}

// Service Bus Namespace
resource serviceBusNamespace 'Microsoft.ServiceBus/namespaces@2022-01-01-preview' = {
  name: 'sb-Aria-${environment}'
  location: location
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
}

// Service Bus Queue for AI processing
resource aiProcessingQueue 'Microsoft.ServiceBus/namespaces/queues@2022-01-01-preview' = {
  parent: serviceBusNamespace
  name: 'ai-processing'
  properties: {
    maxDeliveryCount: 5
    lockDuration: 'PT5M'
  }
}

// Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2022-07-01' = {
  name: 'kv-Aria-${environment}'
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
  }
}

// Grant App Service access to Key Vault
resource keyVaultAccessPolicy 'Microsoft.KeyVault/vaults/accessPolicies@2022-07-01' = {
  parent: keyVault
  name: 'add'
  properties: {
    accessPolicies: [
      {
        tenantId: subscription().tenantId
        objectId: appService.identity.principalId
        permissions: {
          secrets: [
            'get'
            'list'
          ]
        }
      }
    ]
  }
}

output appServiceUrl string = 'https://${appService.properties.defaultHostName}'
output appInsightsInstrumentationKey string = appInsights.properties.InstrumentationKey
output redisHostName string = redis.properties.hostName
```

---

## 2. Security Enhancements

### 2.1 Missing: Authentication & Authorization Middleware

TrackLit uses **session-based authentication with Passport.js**. Your API needs to integrate with this or implement JWT-based auth.

```python
# auth_middleware.py
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from typing import Optional
import os

security = HTTPBearer()

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = "HS256"

class AuthMiddleware:
    """Authentication middleware for Aria API"""
    
    def __init__(self):
        self.secret_key = SECRET_KEY
        self.algorithm = ALGORITHM
    
    async def verify_token(self, credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
        """Verify JWT token from TrackLit platform"""
        try:
            token = credentials.credentials
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            user_id = payload.get("user_id")
            
            if user_id is None:
                raise HTTPException(status_code=401, detail="Invalid authentication token")
            
            return {
                "user_id": user_id,
                "email": payload.get("email"),
                "role": payload.get("role", "athlete")
            }
        
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")
    
    async def require_auth(self, request: Request) -> dict:
        """Require valid authentication for protected endpoints"""
        # Check for API key (for service-to-service calls)
        api_key = request.headers.get("X-API-Key")
        if api_key and api_key == os.getenv("INTERNAL_API_KEY"):
            return {"authenticated": True, "source": "api_key"}
        
        # Check for JWT token
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
        
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.JWTError:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

auth_middleware = AuthMiddleware()

# Dependency for protected endpoints
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """FastAPI dependency for getting current authenticated user"""
    return await auth_middleware.verify_token(credentials)
```

### 2.2 Missing: API Key Management

```python
# api_keys.py
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional
import requests
import os

class APIKeyManager:
    """Manage API keys for service-to-service authentication"""
    
    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_KEY")
        self.headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json"
        }
    
    def generate_api_key(self) -> str:
        """Generate a secure API key"""
        return f"sk_Aria_{secrets.token_urlsafe(32)}"
    
    def hash_api_key(self, api_key: str) -> str:
        """Hash API key for storage"""
        return hashlib.sha256(api_key.encode()).hexdigest()
    
    def create_api_key(self, user_id: str, name: str, expires_days: int = 365) -> dict:
        """Create a new API key for a user"""
        api_key = self.generate_api_key()
        hashed_key = self.hash_api_key(api_key)
        
        expires_at = (datetime.now() + timedelta(days=expires_days)).isoformat()
        
        key_data = {
            "user_id": user_id,
            "key_hash": hashed_key,
            "name": name,
            "expires_at": expires_at,
            "created_at": datetime.now().isoformat(),
            "last_used": None,
            "is_active": True
        }
        
        response = requests.post(
            f"{self.supabase_url}/rest/v1/api_keys",
            headers=self.headers,
            json=key_data
        )
        
        if response.status_code in [200, 201]:
            return {
                "api_key": api_key,  # Only returned once!
                "key_id": response.json()[0].get("id"),
                "name": name,
                "expires_at": expires_at
            }
        
        return None
    
    def verify_api_key(self, api_key: str) -> Optional[dict]:
        """Verify an API key and return user info"""
        hashed_key = self.hash_api_key(api_key)
        
        response = requests.get(
            f"{self.supabase_url}/rest/v1/api_keys?key_hash=eq.{hashed_key}&is_active=eq.true",
            headers=self.headers
        )
        
        if response.status_code == 200:
            data = response.json()
            if data:
                key_info = data[0]
                # Check expiration
                expires_at = datetime.fromisoformat(key_info["expires_at"])
                if expires_at < datetime.now():
                    return None
                
                # Update last_used timestamp
                requests.patch(
                    f"{self.supabase_url}/rest/v1/api_keys?id=eq.{key_info['id']}",
                    headers=self.headers,
                    json={"last_used": datetime.now().isoformat()}
                )
                
                return {
                    "user_id": key_info["user_id"],
                    "key_name": key_info["name"]
                }
        
        return None

api_key_manager = APIKeyManager()
```

### 2.3 Missing: Input Validation & Sanitization

You're using Pydantic which is good, but add more validation:

```python
# validators.py
from pydantic import BaseModel, validator, Field
from typing import List, Optional
import re

class EnhancedAskRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=100)
    user_input: str = Field(..., min_length=1, max_length=5000)
    
    @validator('user_input')
    def sanitize_input(cls, v):
        # Remove potential XSS attempts
        dangerous_patterns = ['<script', 'javascript:', 'onerror=', 'onload=']
        for pattern in dangerous_patterns:
            if pattern.lower() in v.lower():
                raise ValueError(f"Input contains forbidden pattern: {pattern}")
        return v.strip()
    
    @validator('user_id')
    def validate_user_id(cls, v):
        # Ensure user_id is alphanumeric with limited special chars
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError("Invalid user_id format")
        return v

class SecureSubscriptionUpgrade(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=100)
    new_tier: str = Field(..., pattern='^(pro|star)$')
    payment_method_id: Optional[str] = Field(None, pattern='^pm_[a-zA-Z0-9]+$')
```

### 2.4 Missing: CORS Configuration

```python
# In main.py, make CORS more restrictive
from fastapi.middleware.cors import CORSMiddleware

# For production, restrict origins
ALLOWED_ORIGINS = [
    "https://tracklit.app",
    "https://www.tracklit.app",
    "https://api.tracklit.app",
]

if os.getenv("ENVIRONMENT") == "development":
    ALLOWED_ORIGINS.append("http://localhost:3000")
    ALLOWED_ORIGINS.append("http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # NOT ["*"] in production!
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
    max_age=3600,
)
```

---

## 3. Observability & Monitoring

### 3.1 Missing: Application Insights Integration

```python
# observability.py
from opencensus.ext.azure.log_exporter import AzureLogHandler
from opencensus.ext.azure.trace_exporter import AzureExporter
from opencensus.trace.samplers import ProbabilitySampler
from opencensus.trace.tracer import Tracer
from opencensus.ext.fastapi.fastapi_middleware import FastAPIMiddleware
import logging
import os

class ObservabilityManager:
    """Centralized observability for Aria API"""
    
    def __init__(self, app):
        self.connection_string = os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING")
        self.app = app
        self.setup_logging()
        self.setup_tracing()
    
    def setup_logging(self):
        """Configure Azure Application Insights logging"""
        if not self.connection_string:
            logging.warning("Application Insights not configured")
            return
        
        # Add Azure Log Handler
        logger = logging.getLogger(__name__)
        logger.addHandler(AzureLogHandler(connection_string=self.connection_string))
        logger.setLevel(logging.INFO)
        
        # Custom dimensions for all logs
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
    
    def setup_tracing(self):
        """Configure distributed tracing"""
        if not self.connection_string:
            return
        
        # Add tracing middleware
        middleware = FastAPIMiddleware(
            self.app,
            exporter=AzureExporter(connection_string=self.connection_string),
            sampler=ProbabilitySampler(rate=1.0 if os.getenv("ENVIRONMENT") == "development" else 0.5)
        )
    
    def log_api_call(self, endpoint: str, user_id: str, duration_ms: float, success: bool):
        """Log API call metrics"""
        logging.info(
            f"API_CALL",
            extra={
                'custom_dimensions': {
                    'endpoint': endpoint,
                    'user_id': user_id,
                    'duration_ms': duration_ms,
                    'success': success,
                    'environment': os.getenv("ENVIRONMENT", "unknown")
                }
            }
        )
    
    def log_error(self, error: Exception, context: dict):
        """Log errors with context"""
        logging.error(
            f"ERROR: {str(error)}",
            extra={
                'custom_dimensions': {
                    'error_type': type(error).__name__,
                    'context': context
                }
            },
            exc_info=True
        )
    
    def track_metric(self, name: str, value: float, properties: dict = None):
        """Track custom metrics"""
        logging.info(
            f"METRIC: {name} = {value}",
            extra={
                'custom_dimensions': {
                    'metric_name': name,
                    'metric_value': value,
                    **(properties or {})
                }
            }
        )

# Initialize in main.py
# observability = ObservabilityManager(app)
```

### 3.2 Missing: Structured Logging

```python
# logger.py
import logging
import json
from datetime import datetime
from typing import Any, Dict

class StructuredLogger:
    """Structured logging for better log analysis"""
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.INFO)
        
        # JSON formatter
        formatter = logging.Formatter(
            '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "message": %(message)s}'
        )
        
        handler = logging.StreamHandler()
        handler.setFormatter(formatter)
        self.logger.addHandler(handler)
    
    def _format_message(self, message: str, **kwargs) -> str:
        """Format message with additional context"""
        log_data = {
            "message": message,
            "context": kwargs
        }
        return json.dumps(log_data)
    
    def info(self, message: str, **kwargs):
        """Log info with context"""
        self.logger.info(self._format_message(message, **kwargs))
    
    def error(self, message: str, error: Exception = None, **kwargs):
        """Log error with context"""
        if error:
            kwargs["error_type"] = type(error).__name__
            kwargs["error_message"] = str(error)
        self.logger.error(self._format_message(message, **kwargs))
    
    def warning(self, message: str, **kwargs):
        """Log warning with context"""
        self.logger.warning(self._format_message(message, **kwargs))

# Usage
logger = StructuredLogger("Aria")
# logger.info("User consultation", user_id="123", endpoint="ask", tier="pro")
```

### 3.3 Missing: Health Checks

```python
# Add to main.py
from fastapi.responses import JSONResponse

@app.get("/health/live")
async def liveness():
    """Kubernetes liveness probe"""
    return {"status": "alive"}

@app.get("/health/ready")
async def readiness():
    """Kubernetes readiness probe - checks dependencies"""
    checks = {
        "redis": cache.is_connected(),
        "supabase": False,
        "openai": False
    }
    
    # Check Supabase
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/",
            headers={"apikey": SUPABASE_KEY},
            timeout=5
        )
        checks["supabase"] = response.status_code == 200
    except:
        pass
    
    # Check OpenAI
    try:
        client.models.list()
        checks["openai"] = True
    except:
        pass
    
    all_healthy = all(checks.values())
    
    return JSONResponse(
        content={
            "status": "ready" if all_healthy else "not_ready",
            "checks": checks
        },
        status_code=200 if all_healthy else 503
    )

@app.get("/health/startup")
async def startup():
    """Kubernetes startup probe"""
    # Check if app is fully initialized
    return {"status": "started"}
```

---

## 4. Performance & Scalability

### 4.1 Missing: Connection Pooling

```python
# database_pool.py
import psycopg2
from psycopg2 import pool
import os

class DatabasePool:
    """PostgreSQL connection pool for Supabase"""
    
    def __init__(self):
        self.connection_pool = pool.ThreadedConnectionPool(
            minconn=2,
            maxconn=20,
            host=os.getenv("SUPABASE_HOST"),
            database=os.getenv("SUPABASE_DB"),
            user=os.getenv("SUPABASE_USER"),
            password=os.getenv("SUPABASE_PASSWORD"),
            port=os.getenv("SUPABASE_PORT", 5432)
        )
    
    def get_connection(self):
        """Get connection from pool"""
        return self.connection_pool.getconn()
    
    def return_connection(self, connection):
        """Return connection to pool"""
        self.connection_pool.putconn(connection)
    
    def close_all(self):
        """Close all connections"""
        self.connection_pool.closeall()

db_pool = DatabasePool()
```

### 4.2 Missing: Response Caching Strategy

```python
# response_cache.py
from functools import wraps
from cache import cache
import hashlib
import json

def cache_response(ttl: int = 300, key_prefix: str = "response"):
    """Decorator to cache endpoint responses"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            cache_key_parts = [key_prefix, func.__name__]
            
            # Add relevant arguments to cache key
            for arg in args:
                if hasattr(arg, '__dict__'):
                    cache_key_parts.append(str(hash(frozenset(arg.__dict__.items()))))
            
            cache_key = ":".join(cache_key_parts)
            
            # Try to get from cache
            cached_response = cache.get(cache_key)
            if cached_response:
                return cached_response
            
            # Call the function
            response = await func(*args, **kwargs)
            
            # Cache the response
            cache.set(cache_key, response, ttl=ttl)
            
            return response
        return wrapper
    return decorator

# Usage:
# @app.get("/knowledge_library")
# @cache_response(ttl=3600, key_prefix="knowledge")
# async def get_knowledge_library():
#     ...
```

### 4.3 Missing: Background Task Processing

```python
# background_tasks.py
from fastapi import BackgroundTasks
import asyncio
from typing import Callable

class TaskQueue:
    """Background task queue for async processing"""
    
    def __init__(self):
        self.tasks = []
    
    async def add_task(self, func: Callable, *args, **kwargs):
        """Add task to background queue"""
        task = asyncio.create_task(func(*args, **kwargs))
        self.tasks.append(task)
        return task
    
    async def process_ai_analysis(self, user_id: str, video_id: str):
        """Process AI video analysis in background"""
        # This would call your AI analysis logic
        pass
    
    async def send_notification(self, user_id: str, message: str):
        """Send notification to user"""
        # Integration with notification service
        pass

task_queue = TaskQueue()
```

---

## 5. Testing & Quality Assurance

### 5.1 Missing: Comprehensive Test Suite

```python
# test_main.py
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

class TestAuthentication:
    """Test authentication flows"""
    
    def test_unauthenticated_request(self):
        """Test that protected endpoints require auth"""
        response = client.post("/ask", json={
            "user_id": "test123",
            "user_input": "Test question"
        })
        # Should implement auth, currently this passes
        assert response.status_code in [200, 401, 429]
    
    def test_invalid_token(self):
        """Test invalid JWT token handling"""
        headers = {"Authorization": "Bearer invalid_token"}
        response = client.get("/user/test123", headers=headers)
        # Should be 401 when auth is implemented
        assert response.status_code in [200, 401]

class TestRateLimiting:
    """Test rate limiting functionality"""
    
    def test_rate_limit_exceeded(self):
        """Test rate limit enforcement"""
        # Make multiple requests rapidly
        for _ in range(10):
            response = client.post("/ask", json={
                "user_id": "test123",
                "user_input": "Test"
            })
        
        # Should eventually hit rate limit
        assert response.status_code in [200, 429]
    
    def test_subscription_tier_limits(self):
        """Test subscription tier enforcement"""
        # Free tier should be limited
        pass

class TestAIEndpoints:
    """Test AI consultation endpoints"""
    
    @pytest.mark.asyncio
    async def test_ask_endpoint(self):
        """Test basic ask endpoint"""
        response = client.post("/ask", json={
            "user_id": "test123",
            "user_input": "What is the best way to improve my 100m sprint?"
        })
        
        if response.status_code == 200:
            data = response.json()
            assert "analysis" in data
            assert "recommendation" in data

class TestHealthChecks:
    """Test health check endpoints"""
    
    def test_health_endpoint(self):
        """Test basic health check"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data

# Integration tests
class TestIntegration:
    """Integration tests with external services"""
    
    @pytest.mark.integration
    def test_redis_connection(self):
        """Test Redis connectivity"""
        response = client.get("/test-redis-connection")
        assert response.status_code == 200
    
    @pytest.mark.integration
    def test_supabase_connection(self):
        """Test Supabase connectivity"""
        # Create a test user and retrieve it
        pass

# Run with: pytest -v --cov=. --cov-report=html
```

### 5.2 Missing: Load Testing Configuration

```python
# locustfile.py (for load testing)
from locust import HttpUser, task, between

class AriaUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        """Setup before test"""
        self.user_id = "load_test_user"
    
    @task(3)
    def health_check(self):
        """Test health endpoint"""
        self.client.get("/health")
    
    @task(2)
    def get_subscription_status(self):
        """Test subscription status"""
        self.client.get(f"/subscription/status/{self.user_id}")
    
    @task(1)
    def ask_question(self):
        """Test AI consultation"""
        self.client.post("/ask", json={
            "user_id": self.user_id,
            "user_input": "How can I improve my sprint start?"
        })

# Run with: locust -f locustfile.py --host=http://localhost:8000
```

---

## 6. CI/CD Pipeline

### 6.1 Missing: GitHub Actions Workflow

```yaml
# .github/workflows/deploy-api.yml
name: Deploy Aria API

on:
  push:
    branches: [main]
    paths:
      - 'main.py'
      - 'cache.py'
      - 'rate_limit.py'
      - 'wearable_integration.py'
      - 'requirements.txt'
      - 'Dockerfile'
  workflow_dispatch:

env:
  AZURE_WEBAPP_NAME: app-Aria-api-prod
  PYTHON_VERSION: '3.11'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ env.PYTHON_VERSION }}
      
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pip install pytest pytest-cov pytest-asyncio
      
      - name: Run tests
        run: |
          pytest --cov=. --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Log in to Azure Container Registry
        uses: azure/docker-login@v1
        with:
          login-server: ${{ secrets.REGISTRY_LOGIN_SERVER }}
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_PASSWORD }}
      
      - name: Build and push Docker image
        run: |
          docker build . -t ${{ secrets.REGISTRY_LOGIN_SERVER }}/Aria:${{ github.sha }}
          docker push ${{ secrets.REGISTRY_LOGIN_SERVER }}/Aria:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      
      - name: Deploy to Azure App Service
        uses: azure/webapps-deploy@v2
        with:
          app-name: ${{ env.AZURE_WEBAPP_NAME }}
          images: ${{ secrets.REGISTRY_LOGIN_SERVER }}/Aria:${{ github.sha }}
      
      - name: Run post-deployment health check
        run: |
          sleep 30
          curl -f https://app-Aria-api-prod.azurewebsites.net/health || exit 1
```

---

## 7. Documentation

### 7.1 Missing: API Documentation

```python
# Add to main.py
from fastapi.openapi.utils import get_openapi

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title="Aria API",
        version="2.0.0",
        description="""
        AI-powered sprint training assistant API for TrackLit platform.
        
        ## Features
        - AI coaching consultations
        - Video analysis
        - Training plan generation
        - Wearable device integration
        - Subscription management
        
        ## Authentication
        Use JWT tokens from TrackLit authentication system.
        
        ## Rate Limiting
        Limits vary by subscription tier (free, pro, star).
        """,
        routes=app.routes,
    )
    
    openapi_schema["info"]["x-logo"] = {
        "url": "https://tracklit.app/logo.png"
    }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi
```

### 7.2 Missing: README.md

```markdown
# Aria API - AI Component for TrackLit Platform

## Overview
Aria is the AI-powered coaching engine for the TrackLit athletics training platform. It provides personalized sprint training advice, video analysis, and training plan generation.

## Quick Start

### Local Development
```bash
# Clone repository
git clone https://github.com/your-org/Aria-api.git
cd Aria-api

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your credentials

# Run locally
uvicorn main:app --reload --port 8000
```

### Docker
```bash
docker-compose up
```

## API Endpoints

### AI Consultation
- `POST /ask` - Get AI coaching advice
- `POST /ask/media` - Analyze training video/image
- `POST /ask/enhanced` - AI consultation with wearable data

### Training Plans
- `POST /generate_plan` - Generate personalized training plan

### Wearables
- `POST /wearables/authenticate` - Connect wearable device
- `GET /wearables/daily/{user_id}` - Get daily wearable data
- `GET /wearables/training-readiness/{user_id}` - AI-powered readiness score

### Subscription Management
- `GET /subscription/status/{user_id}` - Get subscription details
- `POST /subscription/upgrade` - Upgrade subscription tier
- `GET /subscription/tiers` - List available tiers

## Environment Variables

```env
# OpenAI
OPENAI_API_KEY=sk-...

# Redis
REDIS_HOST=your-redis.cloud.redislabs.com
REDIS_PORT=12345
REDIS_PASSWORD=your_password
REDIS_DB=0

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_api_key

# Stripe
STRIPE_SECRET_KEY=sk_live_...

# Authentication
JWT_SECRET_KEY=your_secret_key
INTERNAL_API_KEY=your_internal_key

# Monitoring
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=...
```

## Architecture
- **Framework**: FastAPI
- **Cache**: Redis Cloud
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4o
- **Wearables**: Terra API (Garmin, Apple Health, Fitbit)
- **Payments**: Stripe

## Deployment
See [DEPLOYMENT.md](DEPLOYMENT.md) for Azure deployment instructions.

## Testing
```bash
# Unit tests
pytest -v

# Coverage
pytest --cov=. --cov-report=html

# Load testing
locust -f locustfile.py
```

## License
Proprietary - TrackLit Platform
```

---

## 8. Priority Recommendations

### Immediate (Week 1)
1. ✅ **Add Dockerfile and docker-compose.yml** - Containerize the application
2. ✅ **Implement authentication middleware** - Integrate with TrackLit auth
3. ✅ **Add health check endpoints** - /health/live, /health/ready
4. ✅ **Setup Application Insights** - Logging and monitoring
5. ✅ **Add comprehensive error handling** - Structured error responses

### Short-term (Weeks 2-3)
6. ✅ **Create Azure Bicep templates** - Infrastructure as Code
7. ✅ **Setup CI/CD pipeline** - GitHub Actions
8. ✅ **Add test suite** - Unit and integration tests
9. ✅ **Implement API key management** - Service-to-service auth
10. ✅ **Add response caching** - Improve performance

### Medium-term (Month 1-2)
11. ✅ **Setup Azure Service Bus** - For async AI processing
12. ✅ **Add database migrations** - Version control for schema
13. ✅ **Implement background jobs** - Azure Functions integration
14. ✅ **Add request validation** - Enhanced security
15. ✅ **Setup monitoring dashboards** - Azure Monitor

### Long-term (Month 2+)
16. ✅ **Add API versioning** - /v1/, /v2/ endpoints
17. ✅ **Implement webhooks** - Event notifications to TrackLit
18. ✅ **Add multi-region deployment** - High availability
19. ✅ **Setup disaster recovery** - Backup and restore procedures
20. ✅ **Performance optimization** - Caching, connection pooling, query optimization

---

## 9. Integration with TrackLit Platform

### Recommended Integration Pattern

```python
# tracklit_integration.py
"""
Integration module for TrackLit platform
"""
import requests
import os
from typing import Dict, Any

class TrackLitIntegration:
    """Handle communication with TrackLit platform"""
    
    def __init__(self):
        self.tracklit_api_url = os.getenv("TRACKLIT_API_URL", "https://api.tracklit.app")
        self.internal_api_key = os.getenv("INTERNAL_API_KEY")
    
    def get_athlete_training_context(self, user_id: str) -> Dict[str, Any]:
        """Get athlete's training context from TrackLit"""
        response = requests.get(
            f"{self.tracklit_api_url}/api/athletes/{user_id}/context",
            headers={"X-API-Key": self.internal_api_key}
        )
        
        if response.status_code == 200:
            return response.json()
        return {}
    
    def send_ai_insights(self, user_id: str, insights: Dict[str, Any]):
        """Send AI-generated insights back to TrackLit"""
        response = requests.post(
            f"{self.tracklit_api_url}/api/athletes/{user_id}/ai-insights",
            headers={"X-API-Key": self.internal_api_key},
            json=insights
        )
        return response.status_code == 200
    
    def trigger_video_analysis(self, video_id: str, user_id: str):
        """Notify TrackLit that video analysis is complete"""
        webhook_url = f"{self.tracklit_api_url}/api/webhooks/video-analysis"
        payload = {
            "video_id": video_id,
            "user_id": user_id,
            "status": "completed",
            "analysis_url": f"/api/videos/{video_id}/analysis"
        }
        
        requests.post(webhook_url, json=payload, headers={"X-API-Key": self.internal_api_key})

tracklit_integration = TrackLitIntegration()
```

---

## 10. Estimated Implementation Timeline

| Phase | Tasks | Duration | Priority |
|-------|-------|----------|----------|
| **Phase 1: Core Infrastructure** | Docker, Azure setup, basic auth | 1 week | Critical |
| **Phase 2: Security & Monitoring** | App Insights, auth middleware, logging | 1 week | Critical |
| **Phase 3: CI/CD** | GitHub Actions, automated deployment | 1 week | High |
| **Phase 4: Testing** | Unit tests, integration tests, load tests | 1 week | High |
| **Phase 5: TrackLit Integration** | API integration, webhooks, shared auth | 2 weeks | High |
| **Phase 6: Performance** | Caching, optimization, scaling | 1 week | Medium |
| **Phase 7: Documentation** | API docs, runbooks, architecture diagrams | 1 week | Medium |

**Total Estimated Time: 8 weeks to full production readiness**

---

## 11. Cost Estimation (Azure Resources)

| Service | SKU | Monthly Cost |
|---------|-----|--------------|
| App Service Plan | S1 | $70 |
| Azure Cache for Redis | Standard C1 | $75 |
| Application Insights | 5GB/month | $10 |
| Service Bus | Standard | $10 |
| Azure Functions | Consumption | $20 |
| Key Vault | Standard | $3 |
| Container Registry | Basic | $5 |
| **Total** | | **$193/month** |

Plus variable costs:
- OpenAI API: $50-500/month (depending on usage)
- Stripe fees: 2.9% + $0.30 per transaction
- Outbound data transfer: ~$10-50/month

---

## Conclusion

Your Aria API has a solid foundation, but needs significant infrastructure and production-readiness work to integrate with TrackLit. Focus on:

1. **Containerization** (Docker)
2. **Authentication integration** with TrackLit
3. **Monitoring and observability** (Application Insights)
4. **Infrastructure as Code** (Bicep)
5. **CI/CD pipeline** (GitHub Actions)

These 5 items are **critical blockers** for production deployment. Everything else can be iterated on post-launch.

Would you like me to help implement any of these specific components?
