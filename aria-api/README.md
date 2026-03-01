# 🏃 Aria - AI Companion for Sprint Athletes

**Intelligent AI Companion with Proactive Engagement, Conversation Memory, and Background Automation**

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.116+-green.svg)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7.0+-red.svg)](https://redis.io/)
[![Celery](https://img.shields.io/badge/Celery-5.4+-green.svg)](https://docs.celeryq.dev/)

---

## 📖 Overview

Aria is an advanced AI companion for sprint athletes that goes beyond simple Q&A. With conversation memory, proactive engagement, pattern recognition, and automated background tasks, Aria provides a truly intelligent coaching experience.

### 🎯 Key Features

#### **Core AI Capabilities**
- 🧠 **Conversation Memory** - Remembers 24 hours of conversation history for continuity
- 🔍 **Pattern Recognition** - Detects 5 training patterns (frequency, intensity, variety, injuries, recovery)
- 💡 **Proactive Suggestions** - Generates 7 types of contextual recommendations with priority levels
- 🎯 **Goal Tracking** - Automatic milestone celebrations (25%, 50%, 75%, 100%) with achievements
- 🏃 **Smart Drill Recommendations** - Experience-based (beginner/intermediate/advanced) + injury-aware
- 📅 **Intelligent Check-ins** - 4 types of contextual check-ins (morning, recovery, weekly, injury)

#### **🎥 Advanced Video Analysis**
- 📹 **Pose Estimation** - MediaPipe integration for biomechanics analysis
- 📊 **Sprint Metrics** - Knee angles, torso lean, stride width, hip alignment
- 🎯 **AI Feedback** - Personalized technique improvements based on video analysis
- ☁️ **Cloud Storage** - Azure Blob Storage for video uploads and processing

#### **👥 Social & Community**
- 🤝 **Athlete Network** - Follow/unfollow athletes, build training connections
- 💬 **Direct Messaging** - Private athlete-to-athlete communication
- 👨‍👩‍👦 **Training Groups** - Create and join training teams
- 🏆 **Leaderboards** - Compete in 100m, 200m, 400m rankings (weekly, monthly, all-time)
- 📱 **Activity Feed** - Share workouts, comment, react with emojis
- 🔥 **Social Engagement** - Like, fire, clap, strong reactions

#### **📊 Advanced Analytics**
- 📈 **Performance Trends** - Linear regression analysis with improvement rates
- 🔮 **PR Predictions** - ML-powered personal record forecasting
- ⚡ **Training Load** - ACWR (Acute:Chronic Workload Ratio) for injury prevention
- 📊 **Percentile Rankings** - Compare against age/gender groups
- 💡 **Insights Dashboard** - Comprehensive analytics and actionable recommendations

#### **🏁 Race Management**
- 📝 **Race Registration** - Register for competitions with goal times
- 📅 **Prep Plans** - Auto-generated week-by-week training plans (base, build, peak, taper)
- ✅ **Race Day Checklists** - 24-hour, morning, warmup, and final prep checklists
- 🎯 **Warmup Routines** - Custom pre-race warmup routines
- 📊 **Results Tracking** - Record times, splits, placement, weather conditions
- 🔍 **Post-Race Analysis** - Performance insights and improvement recommendations

#### **🎮 Gamification System**
- ⭐ **XP & Levels** - Earn XP for actions, progress through 10+ levels
- 🏅 **15+ Achievements** - Common, uncommon, rare, epic, legendary badges
- 🔥 **Training Streaks** - Daily streak tracking with bonus rewards
- 🏃 **Virtual Races** - Compete in virtual race events
- 🎯 **Challenges** - Time-based goals and community challenges
- 📈 **Progress Tracking** - Visual XP and achievement progress

#### **👟 Equipment Tracking**
- 👟 **Gear Inventory** - Track shoes, spikes, racing flats, compression gear
- 📊 **Mileage Logging** - Automatic usage tracking per session
- ⚠️ **Replacement Alerts** - Smart warnings at 85% lifespan
- 💡 **Health Status** - Equipment condition assessment (excellent, good, warning, critical)
- 🔧 **Maintenance Logs** - Track cleaning, repairs, costs
- 📈 **Usage Analytics** - Most used equipment, total miles by type

#### **📦 Data Privacy & GDPR**
- 📥 **Data Export** - JSON, CSV, or ZIP format with complete history
- 📤 **Data Import** - Import training data from other platforms
- 🗑️ **Right to Erasure** - Secure data deletion with verification
- 📋 **Access Logs** - Complete audit trail of data access
- 🔒 **Privacy Compliance** - Full GDPR Article 15, 17, 20 compliance

#### **🔔 Multi-Channel Notifications**
- 📧 **Email** - Azure Communication Services integration
- 📱 **SMS** - Text message notifications
- 🔔 **Push Notifications** - Mobile app integration
- 🔗 **Webhooks** - TrackLit platform integration
- 🎉 **Smart Triggers** - Achievements, training reminders, injury alerts

#### **🎤 Voice Integration (Azure Speech Services)**
- 🗣️ **Speech Recognition** - Convert voice to text for hands-free coaching
- 🔊 **Speech Synthesis** - AI-powered text-to-speech responses
- 🌐 **Translation** - Multi-language support for global athletes
- 🎯 **Voice Conversations** - Process voice input and respond with audio
- 🔍 **Language Detection** - Auto-detect spoken language
- ✅ **Status Monitoring** - Real-time service availability checks

#### **Background Automation**
- ⏰ **6 Scheduled Tasks** - Automatic analysis every 6 hours, daily, and weekly
- 🤖 **Celery Integration** - Processes all active users automatically in background
- 📊 **Pattern Analysis** - Daily training pattern analysis at 2 AM
- 🎁 **Achievement Triggers** - Automatic goal milestone detection and rewards

#### **Performance & Caching**
- ⚡ **Redis Caching** - 20-40x faster response times with 70-85% hit rate
- 💾 **Smart Cache Invalidation** - Automatic cache updates on data modifications
- 🔄 **Graceful Degradation** - System works without Redis (just slower)

#### **Production Features**
- 🔐 **Enterprise Security** - JWT authentication, API keys, RBAC
- 📈 **Observability** - Azure Application Insights integration
- 🔄 **Rate Limiting** - Subscription-based tier management
- 💳 **Payment Integration** - Stripe for subscription management
- 📊 **Wearable Integration** - Garmin, Fitbit, Apple Health via Terra API

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL 14+
- Redis 7.0+
- Azure OpenAI (with managed identity authentication)
- Azure Communication Services (for notifications)
- Azure Blob Storage (for video uploads)
- (Optional) Azure Application Insights
- (Optional) Azure Speech Services (for voice features)
- (Optional) Azure Translator (for multi-language support)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/aria.git
   cd aria
   ```

2. **Install dependencies**
   ```bash
   cd aria-api && pip install -r requirements.txt
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and database credentials
   # Add Azure Communication Services connection strings
   # Add Azure Blob Storage credentials
   ```

4. **Set up database**
   ```bash
   # Run migration to create all tables (25+ new tables)
   cd aria-api && python scripts/migrate_database.py
   
   # Seed companion data
   cd aria-api && python scripts/seed_companion_data.py
   ```

5. **Start Redis**
   ```bash
   # Option A: Docker (recommended)
   docker run -d --name aria-redis -p 6379:6379 redis:7-alpine
   
   # Option B: Use docker-compose (see step 7)
   ```

6. **Run health check**
   ```bash
   cd aria-api && python scripts/health_check.py
   ```

7. **Start services**
   ```bash
   # Option A: Docker Compose (easiest)
   cd aria-api && docker-compose up -d
   
   # Option B: Manual
   cd aria-api
   python run.py
   ```

8. **Verify setup**
   ```bash
   curl http://localhost:8000/health
   # Celery monitoring: http://localhost:5555 (if using docker-compose)
   ```

**📖 For detailed setup instructions, architecture, and monitoring**, see [docs/SETUP_AND_ARCHITECTURE.md](docs/SETUP_AND_ARCHITECTURE.md)

---

## 📁 Project Structure

```
Aria/
├── aria-api/s+# AI API backend code
│   ├── src/                          # Python FastAPI backend
│   │   ├── main.py                  # FastAPI application (2000+ lines)
│   │   ├── database.py              # PostgreSQL connection pool & CRUD
│   │   ├── cache.py                 # Redis cache wrapper
│   │   ├── auth_middleware.py       # JWT/API key authentication
│   │   ├── observability.py         # Azure App Insights integration
│   │   ├── rate_limit.py            # Subscription-based rate limiting
│   │   ├── ai_companion_logic.py    # AI functions (suggestions, patterns, goals)
│   │   ├── companion_endpoints.py   # AI coaching endpoints
│   │   ├── additional_endpoints.py  # Social, analytics, race endpoints
│   │   ├── video_analysis.py        # MediaPipe pose estimation
│   │   ├── voice_service.py         # Azure Speech Services
│   │   ├── social_features.py       # Social networking
│   │   ├── advanced_analytics.py    # ML-powered insights
│   │   ├── race_management.py       # Race tracking
│   │   ├── gamification.py          # XP, achievements, levels
│   │   ├── equipment_tracking.py    # Gear tracking
│   │   ├── data_export.py           # GDPR compliance
│   │   └── notifications.py         # Multi-channel notifications
│   ├── app/                          # Expo Router screens (React Native)
│   ├── server/                       # Express.js companion server
│   ├── shared/                       # Shared Drizzle ORM schema
│   ├── ios/                          # iOS native project
│   ├── app.py                        # Azure App Service entry point
│   ├── run.py                        # Local dev entry point
│   └── startup.sh                    # Azure startup script
├── tests/                            # Python test suite (12 test files)
├── scripts/                          # Utility scripts
│   ├── celery_tasks.py              # Background task definitions
│   ├── migrate_database.py          # Database migrations
│   ├── seed_companion_data.py       # Data seeding
│   └── health_check.py              # Pre-flight validation
├── infrastructure/                   # Azure IaC (Bicep templates)
│   ├── main.bicep                   # Core infrastructure
│   ├── container-apps/              # Container Apps deployment
│   └── DEPLOYMENT_GUIDE.md          # Infrastructure deployment guide
├── docs/                             # Documentation
├── .github/                          # CI/CD workflows
├── Dockerfile                        # Multi-stage Python API container
├── docker-compose.yml                # Local multi-service orchestration
├── requirements.txt                  # Python dependencies
├── pytest.ini                        # Test configuration
└── .env.example                      # Environment template
```

See [docs/SETUP_AND_ARCHITECTURE.md](docs/SETUP_AND_ARCHITECTURE.md) for detailed architecture and component breakdown.

---

## 🔧 Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Redis Cache
REDIS_HOST=your-redis-host
REDIS_PORT=6380
REDIS_PASSWORD=your-redis-password

# Azure OpenAI (Managed Identity - NO API KEY REQUIRED)
# See docs/AZURE_OPENAI_SETUP.md for complete setup instructions
AZURE_OPENAI_ENDPOINT=https://your-openai-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4o
# IMPORTANT: DO NOT SET AZURE_OPENAI_API_KEY - managed identity is used automatically

# Authentication
JWT_SECRET=your-jwt-secret

# Azure Communication Services (for notifications)
AZURE_COMMUNICATION_CONNECTION_STRING=endpoint=https://your-resource.communication.azure.com/;accesskey=your-key
AZURE_COMMUNICATION_EMAIL_ENDPOINT=https://your-resource.communication.azure.com

# Azure Blob Storage (for video uploads)
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=your-account;AccountKey=your-key
AZURE_STORAGE_CONTAINER_NAME=aria-videos

# TrackLit Integration
TRACKLIT_WEBHOOK_URL=https://api.tracklit.app/webhooks/aria

# Stripe (optional)
STRIPE_SECRET_KEY=sk_test_your_key

# Azure Speech Services (optional)
AZURE_SPEECH_KEY=your-speech-key
AZURE_SPEECH_REGION=eastus

# Azure Translator (optional)
AZURE_TRANSLATOR_KEY=your-translator-key
AZURE_TRANSLATOR_ENDPOINT=https://api.cognitive.microsofttranslator.com
AZURE_TRANSLATOR_REGION=global
```

See [.env.example](.env.example) for complete configuration.

---

## 📚 API Documentation

### Interactive Documentation

Once running, visit:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Core Endpoints

#### Authentication
- `POST /auth/login` - User authentication
- `POST /auth/register` - User registration

#### AI Coaching
- `POST /ask` - Get personalized training advice
- `POST /ask/media` - AI analysis with image/video
- `POST /training_plan` - Generate custom training plans

#### Video Analysis
- `POST /api/v1/analytics/video/analyze` - Analyze sprint video with pose estimation

#### Social Features
- `POST /api/v1/social/follow` - Follow athlete
- `POST /api/v1/social/message/send` - Send direct message
- `GET /api/v1/social/leaderboard/{type}` - Get leaderboard rankings
- `GET /api/v1/social/feed/{user_id}` - Get activity feed
- `POST /api/v1/social/activity/post` - Post activity

#### Advanced Analytics
- `GET /api/v1/analytics/trends/{user_id}` - Get performance trends
- `GET /api/v1/analytics/predict-pr/{user_id}` - Predict personal record
- `GET /api/v1/analytics/training-load/{user_id}` - Get ACWR analysis
- `GET /api/v1/analytics/insights/{user_id}` - Get insights dashboard

#### Race Management
- `POST /api/v1/race/register` - Register for race
- `GET /api/v1/race/{race_id}/prep-plan` - Get preparation plan
- `GET /api/v1/race/{race_id}/checklist` - Get race day checklist
- `POST /api/v1/race/result` - Record race result

#### Equipment Tracking
- `POST /api/v1/equipment/add` - Add equipment
- `POST /api/v1/equipment/{id}/log-usage` - Log mileage
- `GET /api/v1/equipment/{user_id}/alerts` - Get replacement alerts

#### Gamification
- `POST /api/v1/gamification/xp/award` - Award XP
- `GET /api/v1/gamification/{user_id}/level` - Get level info
- `GET /api/v1/gamification/{user_id}/achievements` - Get achievements
- `GET /api/v1/gamification/virtual-races` - Get virtual races

#### Data Export (GDPR)
- `GET /api/v1/export/{user_id}/export` - Export user data (JSON/CSV/ZIP)
- `POST /api/v1/export/{user_id}/request-deletion` - Request data deletion
- `GET /api/v1/export/{user_id}/access-logs` - Get access logs

#### Voice Integration
- `GET /api/v1/voice/status` - Check voice services availability
- `POST /api/v1/voice/transcribe` - Speech-to-text conversion
- `POST /api/v1/voice/synthesize` - Text-to-speech conversion
- `POST /api/v1/voice/detect-language` - Auto-detect spoken language
- `POST /api/v1/voice/translate` - Translate text to target language
- `POST /api/v1/voice/conversation` - Full voice conversation (transcribe + AI response + synthesize)

#### Webhooks
- `POST /api/v1/webhooks/receive` - Receive TrackLit webhook
- `POST /api/v1/webhooks/send-test` - Send test webhook

#### User Management
- `GET /user/{user_id}` - Get user profile
- `PUT /user/{user_id}` - Update profile
- `DELETE /user/{user_id}` - Delete account

#### Subscriptions
- `GET /subscription/status/{user_id}` - Check subscription
- `POST /subscription/upgrade` - Upgrade tier
- `POST /subscription/cancel` - Cancel subscription

#### Wearables
- `POST /wearables/connect` - Connect device
- `GET /wearables/data/{user_id}` - Fetch wearable data
- `POST /wearables/sync` - Sync latest data

---

## 🧪 Testing

### Run All Tests
```bash
cd aria-api && python scripts/run_tests.py
```

### Run Specific Test Suite
```bash
cd aria-api && python scripts/run_tests.py database
cd aria-api && python scripts/run_tests.py auth
cd aria-api && python scripts/run_tests.py integration
```

### Coverage Report
After running tests, view the coverage report:
```bash
open htmlcov/index.html  # macOS
start htmlcov/index.html # Windows
```

See [docs/TESTING.md](docs/TESTING.md) for comprehensive testing documentation.

---

## 🏗️ Architecture

### Technology Stack

**Backend**
- FastAPI (Web framework)
- PostgreSQL (Database - 45+ tables)
- Redis (Caching & rate limiting)
- OpenAI GPT-4 (AI engine)
- Celery (Background tasks)
- MediaPipe (Pose estimation)

**Integrations**
- Terra API (Wearables)
- Stripe (Payments)
- Azure Communication Services (Email/SMS)
- Azure Blob Storage (Video uploads)
- Azure Application Insights (Monitoring)
- Azure Speech Services (Voice - optional)
- Azure Translator (Multi-language - optional)

**Infrastructure**
- Docker (Containerization)
- Azure Container Apps (Hosting)
- Azure Container Registry (Image registry)
- Azure Key Vault (Secrets management)
- GitHub Actions (CI/CD)

### Design Principles

- **Microservices Ready**: Modular design for service separation
- **API-First**: RESTful design with OpenAPI documentation
- **Security Focused**: JWT, API keys, RBAC, rate limiting
- **Cloud Native**: Designed for Azure deployment
- **Observable**: Comprehensive logging and monitoring
- **Testable**: 80%+ test coverage with pytest

---

## 🔐 Security

### Authentication Methods

1. **JWT Tokens** - Primary user authentication
2. **API Keys** - Service-to-service communication
3. **Session Validation** - TrackLit integration

### Security Features

- ✅ Password hashing (bcrypt)
- ✅ Token blacklisting
- ✅ Rate limiting by tier
- ✅ CORS protection
- ✅ SQL injection prevention (parameterized queries)
- ✅ API key rotation support
- ✅ Role-based access control (RBAC)

---

## 📊 Performance

### Optimization Strategies

- **Connection Pooling**: PostgreSQL connection reuse
- **Redis Caching**: Session, profile, and query result caching
- **Async Operations**: FastAPI async endpoints
- **Rate Limiting**: Prevent abuse and ensure fair usage
- **Query Optimization**: Indexed database queries

### Benchmarks

- Average response time: <200ms
- P95 latency: <500ms
- Throughput: 1000+ req/sec (single instance)
- Cache hit rate: >80%

---

## 🚢 Deployment

### Docker Deployment

```bash
# Build image
docker build -t Aria:latest .

# Run container
docker run -p 8000:8000 --env-file .env Aria:latest
```

### Docker Compose

```bash
cd aria-api && docker-compose up -d
```

### Azure Container Apps

The production API runs on Azure Container Apps. See [infrastructure/DEPLOYMENT_GUIDE.md](infrastructure/DEPLOYMENT_GUIDE.md) for the full Azure deployment guide.

---

## 📈 Monitoring

### Application Insights

The API integrates with Azure Application Insights for:
- Request/response logging
- Performance metrics
- Error tracking
- Custom events

### Health Checks

- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe (checks dependencies)

---

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`python scripts/run_tests.py`)
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Style

- Follow PEP 8 guidelines
- Use type hints
- Write comprehensive docstrings
- Maintain test coverage >80%

---

## 📝 Documentation

- [Infrastructure Deployment](infrastructure/DEPLOYMENT_GUIDE.md) - Azure Container Apps deployment guide
- [Docker Deployment](docs/DOCKER_DEPLOYMENT.md) - Docker-based deployment workflow
- [Setup & Architecture](docs/SETUP_AND_ARCHITECTURE.md) - Complete architecture details
- [API Reference](docs/COMPANION_API.md) - AI companion API endpoints
- [Testing Guide](docs/TESTING.md) - Testing documentation
- [Azure OpenAI Setup](docs/AZURE_OPENAI_SETUP.md) - OpenAI configuration
- [Voice Features](docs/VOICE_FEATURES.md) - Speech services integration
- [Migration Guide](docs/migration/) - Database migration details

---

## 📜 License

This project is proprietary software. All rights reserved.

---

## 🙏 Acknowledgments

- **OpenAI** - GPT-4 AI engine
- **FastAPI** - Modern web framework
- **Terra** - Wearable data integration
- **TrackLit** - Platform integration partner

---

## 📞 Support

For support, email: support@Aria.com

For bugs and feature requests, please open an issue on GitHub.

---

## 🗺️ Roadmap

### Version 0.3 (Planned)
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Social features (athlete community)
- [ ] Voice coaching integration
- [ ] ML-powered injury prediction

### Version 0.4 (Future)
- [ ] Mobile SDK
- [ ] Coach marketplace
- [ ] Live workout guidance
- [ ] Nutrition integration

---

**Built with ❤️ by the Aria Team**

**Version**: 0.3.0  
**Status**: Production (Azure Container Apps)  
**Last Updated**: February 27, 2026
