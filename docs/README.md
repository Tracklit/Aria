# Aria API 🏃‍♂️💨

AI-powered running coach API integrated with the TrackLit platform. Aria provides personalized training advice, injury prevention guidance, and performance optimization recommendations using OpenAI GPT-4o.

## 🚀 Features

- **AI-Powered Coaching**: Personalized training recommendations based on athlete profiles
- **Subscription Management**: Tiered subscription system (Free, Pro, Star)
- **Wearable Integration**: Support for Garmin, Apple Health, Fitbit via Terra API
- **Rate Limiting**: Smart rate limiting based on subscription tier
- **Multimodal Support**: Text and image analysis capabilities
- **Knowledge Library**: Curated sports science resources
- **Production Ready**: Full observability, authentication, and containerization

## 🏗️ Architecture

Aria integrates with TrackLit's existing Azure infrastructure:

- **Database**: Shared Azure PostgreSQL Flexible Server (TrackLit database)
- **Cache**: Shared Azure Cache for Redis
- **Authentication**: JWT tokens compatible with TrackLit's auth system
- **Monitoring**: Azure Application Insights
- **Secrets**: Azure Key Vault integration
- **Deployment**: Azure App Service (Docker container)

## 📋 Prerequisites

- Python 3.11+
- Docker & Docker Compose
- Azure CLI (for deployment)
- PostgreSQL 15+ (TrackLit database)
- Redis (TrackLit cache)
- OpenAI API key
- Stripe API keys (for subscriptions)
- Terra API credentials (for wearables)

## 🛠️ Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/Aria.git
cd Aria
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
# Edit .env with your actual credentials
```

### 3. Run with Docker Compose (Recommended)

```bash
# Start all services (API, PostgreSQL, Redis)
docker-compose up -d

# View logs
docker-compose logs -f Aria-api

# Stop services
docker-compose down
```

The API will be available at `http://localhost:8000`

### 4. Run Locally (Without Docker)

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the API
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## 🧪 Running Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio pytest-cov

# Run tests with coverage
pytest --cov=. --cov-report=html

# Run specific test file
pytest test_Aria_api.py -v
```

## 🚢 Deployment to Azure

### Prerequisites

1. Azure subscription with TrackLit infrastructure
2. Azure CLI installed and configured
3. GitHub repository with secrets configured

### Deploy Infrastructure

```bash
# Login to Azure
az login

# Create resource group (if needed)
az group create --name Aria-prod-rg --location eastus

# Deploy Bicep template
az deployment group create \
  --resource-group Aria-prod-rg \
  --template-file infrastructure/main.bicep \
  --parameters infrastructure/main.parameters.json
```

### Configure GitHub Secrets

Required secrets in GitHub repository settings:

- `AZURE_CREDENTIALS_PROD`: Azure service principal credentials
- `AZURE_CREDENTIALS_STAGING`: Azure service principal for staging
- `OPENAI_API_KEY`: OpenAI API key
- `GITHUB_TOKEN`: Automatically provided by GitHub

### Automatic Deployment

The CI/CD pipeline automatically deploys:

- **Staging**: Push to `develop` branch
- **Production**: Push to `main` branch

## 📊 Monitoring & Observability

### Health Check Endpoints

- `GET /health/live`: Liveness probe (is app running?)
- `GET /health/ready`: Readiness probe (are dependencies available?)
- `GET /health/startup`: Startup probe (has app initialized?)

### Application Insights

Access metrics in Azure Portal:

1. Navigate to Aria Application Insights resource
2. View **Live Metrics** for real-time monitoring
3. Check **Failures** for error tracking
4. Use **Performance** to analyze latency

### Logs

```bash
# View Azure App Service logs
az webapp log tail --name Aria-prod-api --resource-group Aria-prod-rg

# Docker Compose logs
docker-compose logs -f Aria-api
```

## 🔐 Authentication

Aria supports multiple authentication methods:

### 1. JWT Token (User Authentication)

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://api.tracklit.app/Aria/ask
```

### 2. API Key (Internal Services)

```bash
curl -H "X-API-Key: YOUR_API_KEY" \
  https://api.tracklit.app/Aria/ask
```

### 3. Session-Based (TrackLit Integration)

Automatically inherits TrackLit session authentication.

## 📈 Subscription Tiers

| Tier | Monthly Queries | Features |
|------|----------------|----------|
| **Free** | 1 | Basic AI consultations |
| **Pro** | 15 | Priority support, enhanced analysis |
| **Star** | Unlimited | All features, custom training plans |

## 🔗 API Endpoints

### Core Endpoints

- `POST /ask`: Basic AI consultation
- `POST /ask/media`: Consultation with image upload
- `POST /ask/enhanced`: Enhanced with wearable data

### User Management

- `POST /user`: Create athlete profile
- `GET /user/{user_id}`: Get profile
- `PUT /user/{user_id}`: Update profile
- `DELETE /user/{user_id}`: Delete profile

### Subscriptions

- `GET /subscription/status/{user_id}`: Check subscription
- `POST /subscription/upgrade`: Upgrade tier
- `POST /subscription/cancel`: Cancel subscription
- `GET /subscription/tiers`: List available tiers

### Wearable Integration

- `POST /wearables/connect`: Connect wearable device
- `GET /wearables/data/{user_id}`: Get wearable data
- `POST /wearables/webhook`: Terra webhook handler

Full API documentation: `https://api.tracklit.app/Aria/docs`

## 🤝 TrackLit Integration

Aria shares resources with TrackLit:

### Database Schema

```sql
-- Shared tables (TrackLit)
users
athlete_profiles

-- Aria-specific tables
user_subscriptions
query_usage
api_keys
```

### Cross-Service Communication

```python
# Aria calls TrackLit
response = requests.post(
    "https://api.tracklit.app/internal/sync-profile",
    headers={"X-API-Key": TRACKLIT_API_KEY},
    json={"user_id": user_id}
)
```

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Test PostgreSQL connection
psql "postgresql://user:password@host:5432/database"

# Check connection in Python
python -c "from database import db_pool; print(db_pool.test_connection())"
```

### Redis Connection Issues

```bash
# Test Redis connection
redis-cli -h host -p 6380 -a password --tls ping

# Check in Python
python -c "from cache import cache; print(cache.test_connection())"
```

### Container Issues

```bash
# Rebuild container
docker-compose build --no-cache Aria-api

# Check container logs
docker logs Aria-api

# Enter container shell
docker exec -it Aria-api /bin/bash
```

## 📚 Documentation

- [Production Readiness Report](./PRODUCTION_READINESS_REPORT.md)
- [TrackLit Deployment Guide](./TrackLit_Complete_Technical_Deployment_Guide.md)
- [API Documentation](https://api.tracklit.app/Aria/docs) (Swagger UI)

## 🔒 Security

- All secrets stored in Azure Key Vault
- HTTPS enforced in production
- JWT token expiration: 24 hours
- Rate limiting per subscription tier
- CORS restricted to TrackLit domains

## 📝 Environment Variables

See `.env.example` for complete list. Critical variables:

```bash
# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=rediss://...

# Authentication
JWT_SECRET=your-secret-key

# OpenAI
OPENAI_API_KEY=sk-...

# Azure
APPLICATIONINSIGHTS_CONNECTION_STRING=...
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is proprietary and confidential.

## 👥 Support

- Technical issues: Create GitHub issue
- TrackLit integration: Contact platform team
- Security concerns: security@tracklit.app

---

Built with ❤️ by the TrackLit team
