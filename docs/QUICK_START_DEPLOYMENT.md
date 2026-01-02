# Aria Quick Start Deployment Guide

## 🚀 From Development to Production in 30 Minutes

This guide will walk you through deploying Aria to Azure using the TrackLit infrastructure.

---

## Prerequisites Checklist

- [ ] Azure subscription with TrackLit infrastructure deployed
- [ ] Azure CLI installed (`az --version`)
- [ ] Docker installed (for local testing)
- [ ] Git repository set up
- [ ] Access to TrackLit Key Vault
- [ ] OpenAI API key
- [ ] Stripe API keys
- [ ] Terra API credentials

---

## 🐳 IMPORTANT: Docker-Based Deployment

**Aria runs as a Docker container on Azure App Service**. This means:

- ⚠️ **ZIP file deployments will NOT update the running code**
- ✅ **Code changes require rebuilding and pushing the Docker image**
- 📦 **The container image is stored in Azure Container Registry**

### Deployment Methods:

**Method 1: Docker Image (Required for Code Changes)**
```bash
# 1. Login to Azure Container Registry
az acr login --name tracklitdevkvnx2h

# 2. Build new Docker image
docker build -t tracklitdevkvnx2h.azurecr.io/aria-app:latest .

# 3. Push to registry
docker push tracklitdevkvnx2h.azurecr.io/aria-app:latest

# 4. Force app to pull new image
az webapp stop --name aria-dev-api --resource-group rg-tracklit-dev
az webapp start --name aria-dev-api --resource-group rg-tracklit-dev
```

**Method 2: Configuration Changes Only**
```bash
# For environment variables or app settings (no code changes)
az webapp config appsettings set --name aria-dev-api --resource-group rg-tracklit-dev --settings KEY=VALUE
az webapp restart --name aria-dev-api --resource-group rg-tracklit-dev
```

---

## Step 1: Environment Setup (5 minutes)

### 1.1 Clone Repository

```bash
git clone https://github.com/your-org/Aria.git
cd Aria
```

### 1.2 Create Environment File

```bash
cp .env.example .env
```

### 1.3 Fill in Required Values

Edit `.env` with your actual credentials:

```bash
# CRITICAL: These must be filled in
DATABASE_URL=postgresql://user:password@tracklit-postgres.postgres.database.azure.com:5432/tracklit_production
REDIS_URL=rediss://:password@tracklit-redis.redis.cache.windows.net:6380/0
JWT_SECRET=<generate-with-openssl-rand-base64-32>
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_live_...
TERRA_API_KEY=...
TERRA_DEV_ID=...

# Voice Integration (Azure Speech Services)
AZURE_SPEECH_KEY=<your-speech-key>
AZURE_SPEECH_REGION=westus
SPEECH_LANGUAGE=en-US
SPEECH_VOICE_NAME=en-US-AriaNeural
AZURE_TRANSLATOR_KEY=<your-translator-key>
AZURE_TRANSLATOR_REGION=westus
```

**Generate JWT Secret**:
```bash
openssl rand -base64 32
```

---

## Step 2: Local Testing (10 minutes)

### 2.1 Start Services with Docker Compose

```bash
docker-compose up -d
```

### 2.2 Verify Health

```bash
# Wait 30 seconds for services to start
sleep 30

# Check health
curl http://localhost:8000/health/ready

# Expected output:
# {
#   "status": "healthy",
#   "checks": {
#     "redis": "healthy",
#     "database": "healthy",
#     "openai": "configured"
#   }
# }
```

### 2.3 Test API Endpoint

```bash
# Create test user
curl -X POST http://localhost:8000/user \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Runner",
    "email": "test@example.com",
    "gender": "male",
    "age": 30,
    "training_goal": "5k",
    "injury_status": "none",
    "sleep_hours": 8,
    "sleep_quality": "good",
    "coach_mode": "balanced",
    "training_days_per_week": 4
  }'
```

### 2.4 Stop Local Services

```bash
docker-compose down
```

---

## Step 3: Azure Resource Setup (5 minutes)

### 3.1 Login to Azure

```bash
az login
az account set --subscription "Your Subscription Name"
```

### 3.2 Create Resource Group (if needed)

```bash
az group create \
  --name Aria-prod-rg \
  --location eastus
```

### 3.3 Add Secrets to Key Vault

```bash
# Get Key Vault name
KEY_VAULT_NAME="tracklit-keyvault-prod"

# Add secrets
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "DATABASE-URL" \
  --value "postgresql://..."

az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "REDIS-URL" \
  --value "rediss://..."

az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "JWT-SECRET" \
  --value "your-jwt-secret"

az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "OPENAI-API-KEY" \
  --value "sk-..."

az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "STRIPE-SECRET-KEY" \
  --value "sk_live_..."

az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "STRIPE-WEBHOOK-SECRET" \
  --value "whsec_..."

az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "TERRA-API-KEY" \
  --value "..."

az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "TERRA-DEV-ID" \
  --value "..."
```

---

## Step 4: Configure GitHub (3 minutes)

### 4.1 Create Azure Service Principal

```bash
az ad sp create-for-rbac \
  --name "Aria-github-actions" \
  --role contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/Aria-prod-rg \
  --sdk-auth
```

Copy the entire JSON output.

### 4.2 Add GitHub Secrets

Go to GitHub repository → Settings → Secrets → Actions:

1. Click "New repository secret"
2. Add secrets:
   - `AZURE_CREDENTIALS_PROD` = (JSON from previous step)
   - `AZURE_CREDENTIALS_STAGING` = (JSON for staging environment)
   - `OPENAI_API_KEY` = Your OpenAI key (for CI tests)

### 4.3 Update Bicep Parameters

Edit `infrastructure/main.parameters.json`:

```json
{
  "keyVaultName": {
    "value": "tracklit-keyvault-prod"
  },
  "postgresServerName": {
    "value": "tracklit-postgres-prod"
  },
  "redisCacheName": {
    "value": "tracklit-redis-prod"
  },
  "appInsightsWorkspaceId": {
    "value": "tracklit-logs-workspace"
  },
  "containerRegistryUsername": {
    "value": "your-github-username"
  }
}
```

---

## Step 5: Deploy to Azure (5 minutes)

### 5.1 Manual Deployment (First Time)

```bash
# Build Docker image locally
docker build -t ghcr.io/your-username/Aria:latest .

# Login to GitHub Container Registry
echo $GITHUB_PAT | docker login ghcr.io -u your-username --password-stdin

# Push image
docker push ghcr.io/your-username/Aria:latest

# Deploy infrastructure
az deployment group create \
  --resource-group Aria-prod-rg \
  --template-file infrastructure/main.bicep \
  --parameters infrastructure/main.parameters.json \
  --parameters containerRegistryPassword=$GITHUB_PAT
```

### 5.2 Automatic Deployment (Subsequent)

```bash
# Commit and push to main branch
git add .
git commit -m "Deploy Aria v1.0"
git push origin main
```

GitHub Actions will automatically:
1. Run tests
2. Build Docker image
3. Push to GHCR
4. Deploy to Azure
5. Run smoke tests

---

## Step 6: Verification (2 minutes)

### 6.1 Check Deployment Status

```bash
# Get Web App URL
WEB_APP_NAME="Aria-prod-api"
APP_URL=$(az webapp show \
  --name $WEB_APP_NAME \
  --resource-group Aria-prod-rg \
  --query defaultHostName -o tsv)

echo "Aria API URL: https://$APP_URL"
```

### 6.2 Test Health Endpoints

```bash
# Liveness check
curl https://$APP_URL/health/live

# Readiness check
curl https://$APP_URL/health/ready

# Expected: "status": "healthy"
```

### 6.3 View Logs

```bash
# Stream logs
az webapp log tail \
  --name $WEB_APP_NAME \
  --resource-group Aria-prod-rg

# Or view in Azure Portal:
# App Service → Monitoring → Log stream
```

---

## Step 7: Post-Deployment Setup (Optional)

### 7.1 Configure Custom Domain

```bash
# Add custom domain
az webapp config hostname add \
  --webapp-name $WEB_APP_NAME \
  --resource-group Aria-prod-rg \
  --hostname api.Aria.tracklit.app

# Configure SSL
az webapp config ssl bind \
  --certificate-thumbprint <thumbprint> \
  --ssl-type SNI \
  --name $WEB_APP_NAME \
  --resource-group Aria-prod-rg
```

### 7.2 Set Up Monitoring Alerts

```bash
# Create alert for error rate > 5%
az monitor metrics alert create \
  --name "Aria High Error Rate" \
  --resource-group Aria-prod-rg \
  --scopes "/subscriptions/{subscription-id}/resourceGroups/Aria-prod-rg/providers/Microsoft.Web/sites/$WEB_APP_NAME" \
  --condition "avg requests/failed > 5" \
  --description "Alert when error rate exceeds 5%"
```

### 7.3 Configure Autoscaling

```bash
# Enable autoscaling
az monitor autoscale create \
  --resource-group Aria-prod-rg \
  --resource $WEB_APP_NAME \
  --resource-type "Microsoft.Web/serverFarms" \
  --name Aria-Autoscale \
  --min-count 2 \
  --max-count 10 \
  --count 2

# Add scaling rule (CPU > 70%)
az monitor autoscale rule create \
  --resource-group Aria-prod-rg \
  --autoscale-name Aria-Autoscale \
  --condition "Percentage CPU > 70 avg 5m" \
  --scale out 2
```

---

## 🎉 Deployment Complete!

Your Aria API is now running in production at: `https://$APP_URL`

### Next Steps:

1. **Test API**: Visit `https://$APP_URL/docs` for Swagger UI
2. **Monitor**: View Application Insights dashboard
3. **Integrate**: Update TrackLit frontend to call Aria API
4. **Optimize**: Monitor performance and adjust resources

---

## 🔥 Common Issues & Solutions

### Issue: Health check fails with database error

**Solution**: Verify database connection string in Key Vault

```bash
az keyvault secret show \
  --vault-name $KEY_VAULT_NAME \
  --name DATABASE-URL
```

### Issue: 500 errors on API calls

**Solution**: Check Application Insights logs

```bash
az monitor app-insights query \
  --app Aria-prod-insights \
  --resource-group Aria-prod-rg \
  --analytics-query "traces | where severityLevel >= 3 | take 20"
```

### Issue: Docker image not pulling

**Solution**: Verify GitHub PAT has `read:packages` permission

```bash
# Test manually
docker pull ghcr.io/your-username/Aria:latest
```

### Issue: Key Vault access denied

**Solution**: Grant Web App managed identity access

```bash
# Get Web App principal ID
PRINCIPAL_ID=$(az webapp identity show \
  --name $WEB_APP_NAME \
  --resource-group Aria-prod-rg \
  --query principalId -o tsv)

# Grant access to Key Vault
az keyvault set-policy \
  --name $KEY_VAULT_NAME \
  --object-id $PRINCIPAL_ID \
  --secret-permissions get list
```

---

## 📞 Support

- **Documentation**: See `README.md` and `IMPLEMENTATION_SUMMARY.md`
- **Issues**: Create GitHub issue with logs and error messages
- **Urgent**: Contact platform team via Slack #Aria-support

---

## 📋 Deployment Checklist

Use this checklist for each deployment:

- [ ] All tests passing locally (`pytest`)
- [ ] Environment variables configured
- [ ] Secrets added to Key Vault
- [ ] GitHub secrets configured
- [ ] Bicep parameters updated
- [ ] Code committed and pushed
- [ ] **Docker image built and pushed to ACR** (for code changes)
- [ ] GitHub Actions workflow succeeded
- [ ] **App stopped and started to pull new image** (for code changes)
- [ ] Health checks passing
- [ ] Smoke tests successful
- [ ] Application Insights receiving data
- [ ] Logs streaming correctly
- [ ] TrackLit integration verified
- [ ] Voice integration status verified (`/api/v1/voice/status`)
- [ ] Documentation updated

---

## 🔍 Voice Integration Verification

After deployment, verify voice integration:

```bash
# Check voice status endpoint
curl https://aria-dev-api.azurewebsites.net/api/v1/voice/status
```

Expected response:
```json
{
  "speech_recognition": true,
  "speech_synthesis": true,
  "translation": true,
  "available": true
}
```

If `available: false`, check:
1. Azure Speech Services credentials in app settings
2. Application logs for voice integration errors
3. Voice integration module import in startup logs

---

**Last Updated**: 2026-01-02  
**Version**: 1.1  
**Deployment Time**: ~30 minutes (code changes ~5 minutes extra for Docker build)
