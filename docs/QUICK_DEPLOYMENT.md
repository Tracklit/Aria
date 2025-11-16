# Quick Deployment Guide - New Features

## 🚀 Getting Started

### 1. Install Dependencies

```powershell
# Navigate to project directory
cd "c:\SprintGPT Code\Aria"

# Install all dependencies
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Add these new variables to your `.env` file:

```env
# Azure Communication Services (for email/SMS notifications)
AZURE_COMMUNICATION_CONNECTION_STRING=endpoint=https://your-resource.communication.azure.com/;accesskey=your-key
AZURE_COMMUNICATION_EMAIL_ENDPOINT=https://your-resource.communication.azure.com

# Azure Blob Storage (for video uploads)
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=your-account;AccountKey=your-key;EndpointSuffix=core.windows.net
AZURE_STORAGE_CONTAINER_NAME=aria-videos

# TrackLit Webhook Integration
TRACKLIT_WEBHOOK_URL=https://api.tracklit.app/webhooks/aria

# Optional: Azure Speech Services (for voice features)
AZURE_SPEECH_KEY=your-speech-key
AZURE_SPEECH_REGION=eastus

# Optional: Azure Translator (for multi-language)
AZURE_TRANSLATOR_KEY=your-translator-key
AZURE_TRANSLATOR_ENDPOINT=https://api.cognitive.microsofttranslator.com
AZURE_TRANSLATOR_REGION=global
```

### 3. Verify Database Setup

The new tables will be created automatically when you start the server. To verify:

```powershell
# Start the server
python src/main.py
```

Check logs for table creation messages:
```
INFO: Social features tables created successfully
INFO: Race management tables created successfully
INFO: GDPR compliance tables created successfully
INFO: Equipment tracking tables created successfully
INFO: Gamification tables created successfully
```

### 4. Test the API

Open your browser to:
- **Swagger UI:** http://localhost:8000/docs
- **Health Check:** http://localhost:8000/health/ready

## 📋 Quick Feature Tests

### Test Notifications
```bash
curl -X POST http://localhost:8000/api/v1/webhooks/send-test
```

### Test Social Features
```bash
# Follow an athlete
curl -X POST http://localhost:8000/api/v1/social/follow \
  -H "Content-Type: application/json" \
  -d '{"follower_id": "user123", "following_id": "user456"}'

# Get leaderboard
curl http://localhost:8000/api/v1/social/leaderboard/100m?period=all_time
```

### Test Race Management
```bash
# Register for a race
curl -X POST http://localhost:8000/api/v1/race/register \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "race_name": "City Championship",
    "race_date": "2025-06-15",
    "race_distance": "100m",
    "race_location": "City Stadium",
    "goal_time": 10.5
  }'
```

### Test Equipment Tracking
```bash
# Add equipment
curl -X POST http://localhost:8000/api/v1/equipment/add \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "equipment_type": "training_shoes",
    "brand": "Nike",
    "model": "Pegasus 40",
    "purchase_date": "2025-01-01",
    "initial_mileage": 0
  }'

# Get equipment alerts
curl http://localhost:8000/api/v1/equipment/user123/alerts
```

### Test Gamification
```bash
# Award XP
curl -X POST "http://localhost:8000/api/v1/gamification/xp/award?user_id=user123&action_type=training_session_completed"

# Get level info
curl http://localhost:8000/api/v1/gamification/user123/level

# Get achievements
curl http://localhost:8000/api/v1/gamification/user123/achievements
```

### Test Analytics
```bash
# Get performance trends
curl http://localhost:8000/api/v1/analytics/trends/user123?metric_type=100m_time&days=90

# Predict PR
curl http://localhost:8000/api/v1/analytics/predict-pr/user123?event=100m&training_days=90

# Get insights dashboard
curl http://localhost:8000/api/v1/analytics/insights/user123
```

### Test Data Export
```bash
# Export user data
curl http://localhost:8000/api/v1/export/user123/export?format=json

# Get access logs
curl http://localhost:8000/api/v1/export/user123/access-logs
```

## 🔧 Troubleshooting

### Import Errors
If you see import errors for Azure packages:
```powershell
pip install --upgrade azure-communication-email azure-communication-sms azure-storage-blob
```

### Database Connection Issues
Verify your `DATABASE_URL` in `.env`:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/aria_db
```

### Redis Connection Issues
Verify Redis is running and configured:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=your_password
```

### Video Analysis Issues
MediaPipe requires specific Python versions (3.8-3.11):
```powershell
python --version  # Should be 3.8-3.11
```

## 🌐 Azure Services Setup

### Azure Communication Services
1. Create Communication Service in Azure Portal
2. Get connection string from "Keys" section
3. Add to `.env`

### Azure Blob Storage
1. Create Storage Account in Azure Portal
2. Create container named "aria-videos"
3. Get connection string from "Access keys"
4. Add to `.env`

### Azure Speech Services (Optional)
1. Create Speech Service in Azure Portal
2. Get key and region
3. Add to `.env`

### Azure Translator (Optional)
1. Create Translator resource in Azure Portal
2. Get key and endpoint
3. Add to `.env`

## 📊 Monitoring

Check the logs for:
- Table creation confirmations
- Service initialization messages
- Error messages with stack traces

All logs use Python's logging module and are visible in console output.

## 🎯 Key Endpoints Summary

| Category | Endpoint | Method |
|----------|----------|--------|
| **Webhooks** | `/api/v1/webhooks/receive` | POST |
| **Social** | `/api/v1/social/follow` | POST |
| **Social** | `/api/v1/social/leaderboard/{type}` | GET |
| **Social** | `/api/v1/social/feed/{user_id}` | GET |
| **Analytics** | `/api/v1/analytics/trends/{user_id}` | GET |
| **Analytics** | `/api/v1/analytics/insights/{user_id}` | GET |
| **Video** | `/api/v1/analytics/video/analyze` | POST |
| **Race** | `/api/v1/race/register` | POST |
| **Race** | `/api/v1/race/{race_id}/prep-plan` | GET |
| **Export** | `/api/v1/export/{user_id}/export` | GET |
| **Equipment** | `/api/v1/equipment/add` | POST |
| **Equipment** | `/api/v1/equipment/{user_id}/alerts` | GET |
| **Gamification** | `/api/v1/gamification/xp/award` | POST |
| **Gamification** | `/api/v1/gamification/{user_id}/level` | GET |

## ✅ Deployment Checklist

- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] Environment variables configured
- [ ] Azure services provisioned (Communication, Blob Storage)
- [ ] Database running and accessible
- [ ] Redis running and accessible
- [ ] Server starts without errors
- [ ] Health check passes (`/health/ready`)
- [ ] API documentation loads (`/docs`)
- [ ] Sample API calls work
- [ ] Database tables created successfully

## 🎉 Success!

Once all checks pass, your Aria platform is ready with:
- ✅ Notifications and webhooks
- ✅ Video analysis with pose estimation
- ✅ Social networking features
- ✅ Advanced analytics
- ✅ Race management
- ✅ Data export (GDPR compliant)
- ✅ Equipment tracking
- ✅ Gamification system

## 📞 Need Help?

- Check API docs: http://localhost:8000/docs
- Review logs in console
- Check `docs/NEW_FEATURES_IMPLEMENTATION.md` for details
- Verify environment variables are set correctly

---

**Ready to run!** 🚀

```powershell
python src/main.py
```
