# Aria Deployment Guide

Complete guide for deploying the Aria AI Companion service to Azure.

## 📋 Table of Contents

- [Overview](#overview)
- [Deployment Methods](#deployment-methods)
- [Prerequisites](#prerequisites)
- [Method 1: GitHub Actions (Recommended)](#method-1-github-actions-recommended)
- [Method 2: PowerShell Script](#method-2-powershell-script)
- [Method 3: Azure CLI Manual](#method-3-azure-cli-manual)
- [Method 4: Docker Compose (Local)](#method-4-docker-compose-local)
- [Post-Deployment](#post-deployment)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

Aria is a **Python 3.11 FastAPI application** that can be deployed using multiple methods:

| Method | Best For | Automation Level | Environment |
|--------|----------|------------------|-------------|
| GitHub Actions | Production CI/CD | 🤖 Fully Automated | Staging/Production |
| PowerShell Script | One-time deploys | 🔄 Semi-Automated | Any |
| Azure CLI | Manual control | 👤 Manual | Any |
| Docker Compose | Local development | 🏠 Local Only | Development |

**Current Setup:**
- ✅ Python 3.11 FastAPI application
- ✅ Multi-stage Docker build (optimized for Python)
- ✅ GitHub Actions CI/CD pipeline
- ✅ Azure App Service (Linux + Python runtime)
- ✅ PostgreSQL database
- ✅ Redis cache

---

## 📦 Prerequisites

### Required Tools

```powershell
# Check versions
python --version        # 3.11+
az --version           # Azure CLI 2.50+
docker --version       # 24.0+ (optional)
git --version          # 2.40+
```

### Azure Resources Needed

1. **Azure Subscription** with permissions to:
   - Create resource groups
   - Create App Service plans and Web Apps
   - Create Azure Database for PostgreSQL
   - Create Azure Cache for Redis

2. **Azure Services** (will be created if not exist):
   - Resource Group
   - App Service Plan (Linux)
   - Web App (Python 3.11)
   - PostgreSQL Flexible Server
   - Redis Cache
   - Application Insights (optional)
   - Azure Communication Services (for notifications)
   - Azure Blob Storage (for video analysis)

### Environment Variables

Create `.env` file (or configure in Azure):

```bash
# Required
DATABASE_URL=postgresql://user:pass@host:5432/aria
REDIS_URL=redis://host:6379/0
JWT_SECRET=your-super-secret-jwt-key
OPENAI_API_KEY=sk-...

# Optional - Notifications
AZURE_COMMUNICATION_CONNECTION_STRING=endpoint=https://...
AZURE_COMMUNICATION_EMAIL_FROM=noreply@yourdomain.com

# Optional - Video Analysis
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...
AZURE_STORAGE_CONTAINER_NAME=aria-videos

# Optional - Speech & Translation
AZURE_SPEECH_KEY=your-speech-key
AZURE_SPEECH_REGION=eastus
AZURE_TRANSLATOR_KEY=your-translator-key
AZURE_TRANSLATOR_REGION=eastus

# Optional - Observability
APPLICATION_INSIGHTS_CONNECTION_STRING=InstrumentationKey=...
```

---

## 🚀 Method 1: GitHub Actions (Recommended)

### Setup (One-Time)

1. **Configure GitHub Secrets:**

   Go to repository → Settings → Secrets and variables → Actions

   Add these secrets:

   ```yaml
   # For Staging
   AZURE_CREDENTIALS_STAGING: 
     {
       "clientId": "xxx",
       "clientSecret": "xxx",
       "subscriptionId": "xxx",
       "tenantId": "xxx"
     }

   # For Production
   AZURE_CREDENTIALS_PROD: 
     {
       "clientId": "xxx",
       "clientSecret": "xxx",
       "subscriptionId": "xxx",
       "tenantId": "xxx"
     }

   # API Keys
   OPENAI_API_KEY: sk-...
   ```

   **To get Azure credentials:**
   ```powershell
   # Create service principal
   az ad sp create-for-rbac --name "aria-github-deploy" \
     --role contributor \
     --scopes /subscriptions/{subscription-id}/resourceGroups/{resource-group} \
     --sdk-auth
   ```

2. **Create Azure Resources:**

   ```powershell
   # Staging environment
   az group create --name aria-staging-rg --location eastus
   az appservice plan create --name plan-aria-staging --resource-group aria-staging-rg --sku B2 --is-linux
   az webapp create --name aria-staging-api --resource-group aria-staging-rg --plan plan-aria-staging --runtime "PYTHON:3.11"

   # Production environment
   az group create --name aria-prod-rg --location eastus
   az appservice plan create --name plan-aria-prod --resource-group aria-prod-rg --sku P1V2 --is-linux
   az webapp create --name aria-prod-api --resource-group aria-prod-rg --plan plan-aria-prod --runtime "PYTHON:3.11"
   ```

3. **Configure App Settings:**

   ```powershell
   # Set environment variables in Azure
   az webapp config appsettings set \
     --name aria-prod-api \
     --resource-group aria-prod-rg \
     --settings \
       DATABASE_URL="postgresql://..." \
       REDIS_URL="redis://..." \
       JWT_SECRET="..." \
       OPENAI_API_KEY="sk-..." \
       ENVIRONMENT="production"
   ```

### Deploy

**Automatic Deployment:**

```bash
# Deploy to staging
git push origin develop

# Deploy to production
git push origin main
```

**Manual Trigger:**

1. Go to GitHub → Actions
2. Select "Aria CI/CD Pipeline"
3. Click "Run workflow"
4. Select branch and environment

### Workflow Details

The `.github/workflows/ci-cd.yml` pipeline:

1. **Test Job** (all branches):
   - Sets up Python 3.11
   - Installs dependencies from `requirements.txt`
   - Runs pytest with PostgreSQL + Redis services
   - Code quality checks (Black, Flake8)
   - Coverage reporting

2. **Build Job** (push only):
   - Builds Docker image (multi-stage Python build)
   - Pushes to GitHub Container Registry
   - Tags: `latest`, `develop`, `sha-{commit}`

3. **Deploy Staging** (develop branch):
   - Deploys to `aria-staging-api.azurewebsites.net`
   - Uses Docker image: `develop` tag
   - Runs smoke tests

4. **Deploy Production** (main branch):
   - Provisions infrastructure with Bicep
   - Deploys to `aria-prod-api.azurewebsites.net`
   - Uses Docker image: `latest` tag
   - Creates GitHub release
   - Runs smoke tests

---

## 🔧 Method 2: PowerShell Script

Use the included `deploy-aria.ps1` script for manual deployments.

### Usage

```powershell
# Deploy to development
.\deploy-aria.ps1 `
  -ResourceGroup "rg-aria-dev" `
  -AppName "ca-aria-api-prod" `
  -Environment "dev"

# Deploy to production (with tests)
.\deploy-aria.ps1 `
  -ResourceGroup "rg-aria-prod" `
  -AppName "aria-prod-api" `
  -Environment "prod" `
  -Location "eastus"

# Quick deploy (skip tests)
.\deploy-aria.ps1 `
  -ResourceGroup "rg-aria-staging" `
  -AppName "aria-staging-api" `
  -Environment "staging" `
  -SkipTests
```

### What the Script Does

1. ✅ Verifies Azure CLI and Python installation
2. ✅ Validates project structure
3. ✅ Runs tests (optional)
4. ✅ Creates resource group (if needed)
5. ✅ Creates App Service Plan (Linux + Python)
6. ✅ Creates Web App with Python 3.11 runtime
7. ✅ Configures startup command for FastAPI
8. ✅ Loads environment variables from `.env` file
9. ✅ Packages and deploys application
10. ✅ Runs health checks

### Script Output

```
   █████╗ ██████╗ ██╗ █████╗     ██████╗ ███████╗██████╗ ██╗      ██████╗ ██╗   ██╗
  ██╔══██╗██╔══██╗██║██╔══██╗    ██╔══██╗██╔════╝██╔══██╗██║     ██╔═══██╗╚██╗ ██╔╝
  ███████║██████╔╝██║███████║    ██║  ██║█████╗  ██████╔╝██║     ██║   ██║ ╚████╔╝ 
  ██╔══██║██╔══██╗██║██╔══██║    ██║  ██║██╔══╝  ██╔═══╝ ██║     ██║   ██║  ╚██╔╝  
  ██║  ██║██║  ██║██║██║  ██║    ██████╔╝███████╗██║     ███████╗╚██████╔╝   ██║   

✅ Azure CLI found
✅ Python found: Python 3.11.5
✅ Logged in to Azure
✅ All tests passed
✅ Web App configured
✅ Environment variables configured (25 settings)
✅ Application deployed successfully

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ARIA DEPLOYMENT COMPLETED SUCCESSFULLY!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ️  Application URL: https://aria-prod-api.azurewebsites.net
ℹ️  Health Check: https://aria-prod-api.azurewebsites.net/health
ℹ️  API Docs: https://aria-prod-api.azurewebsites.net/docs
```

---

## ⚙️ Method 3: Azure CLI Manual

### Step-by-Step Commands

```powershell
# 1. Login to Azure
az login

# 2. Create resource group
az group create --name aria-rg --location eastus

# 3. Create App Service Plan (Linux + Python)
az appservice plan create \
  --name plan-aria \
  --resource-group aria-rg \
  --sku B1 \
  --is-linux

# 4. Create Web App with Python 3.11
az webapp create \
  --name aria-api \
  --resource-group aria-rg \
  --plan plan-aria \
  --runtime "PYTHON:3.11"

# 5. Configure startup command
az webapp config set \
  --name aria-api \
  --resource-group aria-rg \
  --startup-file "python -m uvicorn src.main:app --host 0.0.0.0 --port 8000"

# 6. Enable logging
az webapp log config \
  --name aria-api \
  --resource-group aria-rg \
  --application-logging filesystem \
  --web-server-logging filesystem

# 7. Set environment variables
az webapp config appsettings set \
  --name aria-api \
  --resource-group aria-rg \
  --settings \
    DATABASE_URL="postgresql://..." \
    REDIS_URL="redis://..." \
    JWT_SECRET="your-secret" \
    OPENAI_API_KEY="sk-..." \
    ENVIRONMENT="production" \
    PYTHON_VERSION="3.11"

# 8. Package application
Compress-Archive -Path src,scripts,requirements.txt -DestinationPath app.zip

# 9. Deploy ZIP
az webapp deployment source config-zip \
  --name aria-api \
  --resource-group aria-rg \
  --src app.zip

# 10. Verify deployment
az webapp browse --name aria-api --resource-group aria-rg
```

### Create Database

```powershell
# PostgreSQL Flexible Server
az postgres flexible-server create \
  --name aria-db \
  --resource-group aria-rg \
  --location eastus \
  --admin-user ariaadmin \
  --admin-password "SecurePassword123!" \
  --sku-name Standard_B1ms \
  --version 15 \
  --storage-size 32

# Create database
az postgres flexible-server db create \
  --server-name aria-db \
  --resource-group aria-rg \
  --database-name aria

# Allow Azure services
az postgres flexible-server firewall-rule create \
  --name aria-db \
  --resource-group aria-rg \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### Create Redis

```powershell
az redis create \
  --name aria-cache \
  --resource-group aria-rg \
  --location eastus \
  --sku Basic \
  --vm-size c0

# Get connection string
az redis show \
  --name aria-cache \
  --resource-group aria-rg \
  --query "[hostName,sslPort]" -o tsv
```

---

## 🐳 Method 4: Docker Compose (Local)

For **local development only** (not for production Azure deployment).

### Start All Services

```powershell
# Start services
cd aria-api && docker-compose up -d

# Check status
cd aria-api && docker-compose ps

# View logs
cd aria-api && docker-compose logs -f aria

# Stop services
cd aria-api && docker-compose down
```

### Access Services

- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

---

## ✅ Post-Deployment

### 1. Run Database Migrations

```powershell
# SSH into Azure Web App
az webapp ssh --name aria-prod-api --resource-group aria-prod-rg

# Or run remotely
az webapp config appsettings set \
  --name aria-prod-api \
  --resource-group aria-prod-rg \
  --settings RUN_MIGRATIONS="true"
```

### 2. Verify Health

```powershell
# Health check
curl https://aria-prod-api.azurewebsites.net/health

# Expected response
{
  "status": "healthy",
  "version": "1.0.0",
  "database": "connected",
  "redis": "connected"
}
```

### 3. Test API Endpoints

```powershell
# Get API documentation
curl https://aria-prod-api.azurewebsites.net/docs

# Test authentication
curl -X POST https://aria-prod-api.azurewebsites.net/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### 4. Monitor Logs

```powershell
# Stream live logs
az webapp log tail \
  --name aria-prod-api \
  --resource-group aria-prod-rg

# Download logs
az webapp log download \
  --name aria-prod-api \
  --resource-group aria-prod-rg \
  --log-file aria-logs.zip
```

### 5. Configure Custom Domain (Optional)

```powershell
# Add custom domain
az webapp config hostname add \
  --webapp-name aria-prod-api \
  --resource-group aria-prod-rg \
  --hostname api.yourdomain.com

# Enable HTTPS
az webapp config ssl bind \
  --name aria-prod-api \
  --resource-group aria-prod-rg \
  --certificate-thumbprint {thumbprint} \
  --ssl-type SNI
```

---

## 🔍 Troubleshooting

### Issue: Application Not Starting

**Symptoms:**
- 502 Bad Gateway
- "Application Error" page

**Solutions:**

```powershell
# 1. Check startup command
az webapp config show \
  --name aria-prod-api \
  --resource-group aria-prod-rg \
  --query "appCommandLine"

# Should be: python -m uvicorn src.main:app --host 0.0.0.0 --port 8000

# 2. Check Python version
az webapp config show \
  --name aria-prod-api \
  --resource-group aria-prod-rg \
  --query "linuxFxVersion"

# Should be: PYTHON|3.11

# 3. View application logs
az webapp log tail --name aria-prod-api --resource-group aria-prod-rg
```

### Issue: Dependencies Not Installing

**Symptoms:**
- "ModuleNotFoundError" in logs
- Import errors

**Solutions:**

```powershell
# 1. Enable build during deployment
az webapp config appsettings set \
  --name aria-prod-api \
  --resource-group aria-prod-rg \
  --settings SCM_DO_BUILD_DURING_DEPLOYMENT="true"

# 2. Verify requirements.txt is included
az webapp deployment source show \
  --name aria-prod-api \
  --resource-group aria-prod-rg

# 3. Redeploy with verbose logging
az webapp deployment source config-zip \
  --name aria-prod-api \
  --resource-group aria-prod-rg \
  --src app.zip \
  --debug
```

### Issue: Database Connection Failed

**Symptoms:**
- "Connection refused" errors
- Database timeout errors

**Solutions:**

```powershell
# 1. Check DATABASE_URL format
# Correct: postgresql://user:pass@host.postgres.database.azure.com:5432/dbname?sslmode=require

# 2. Verify firewall rules
az postgres flexible-server firewall-rule list \
  --name aria-db \
  --resource-group aria-rg

# 3. Add App Service outbound IPs to firewall
az webapp show \
  --name aria-prod-api \
  --resource-group aria-prod-rg \
  --query "outboundIpAddresses" -o tsv

# Add each IP to PostgreSQL firewall
```

### Issue: Environment Variables Not Set

**Solutions:**

```powershell
# List current settings
az webapp config appsettings list \
  --name aria-prod-api \
  --resource-group aria-prod-rg

# Bulk update from .env file
# Convert .env to JSON first
$settings = @{}
Get-Content .env | Where-Object {$_ -match '^([^#][^=]+)=(.+)$'} | ForEach-Object {
    $settings[$matches[1].Trim()] = $matches[2].Trim()
}

az webapp config appsettings set \
  --name aria-prod-api \
  --resource-group aria-prod-rg \
  --settings ($settings | ConvertTo-Json)
```

### Issue: High Memory/CPU Usage

**Solutions:**

```powershell
# 1. Scale up App Service Plan
az appservice plan update \
  --name plan-aria-prod \
  --resource-group aria-prod-rg \
  --sku P2V2

# 2. Scale out (add instances)
az appservice plan update \
  --name plan-aria-prod \
  --resource-group aria-prod-rg \
  --number-of-workers 3

# 3. Adjust Uvicorn workers
az webapp config appsettings set \
  --name aria-prod-api \
  --resource-group aria-prod-rg \
  --settings WORKERS="2"
```

### Useful Debugging Commands

```powershell
# Get app service URL
az webapp show --name aria-prod-api --resource-group aria-prod-rg --query "defaultHostName" -o tsv

# Restart app
az webapp restart --name aria-prod-api --resource-group aria-prod-rg

# SSH into container
az webapp ssh --name aria-prod-api --resource-group aria-prod-rg

# View deployment history
az webapp deployment list --name aria-prod-api --resource-group aria-prod-rg

# Get app insights connection string
az monitor app-insights component show \
  --app aria-insights \
  --resource-group aria-prod-rg \
  --query "connectionString" -o tsv
```

---

## 📊 Deployment Comparison

| Feature | GitHub Actions | PowerShell Script | Azure CLI | Docker Compose |
|---------|---------------|-------------------|-----------|----------------|
| **Automation** | Fully automated | Semi-automated | Manual | Automated (local) |
| **Best For** | Production CI/CD | Quick deploys | Learning/debugging | Development |
| **Testing** | ✅ Automated | ✅ Optional | ❌ Manual | ✅ Local |
| **Rollback** | ✅ Easy | ⚠️ Manual | ⚠️ Manual | ✅ Easy |
| **Multi-env** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ Local only |
| **Cost** | Free (GitHub) | Azure costs | Azure costs | Free (local) |
| **Setup Time** | 30 min | 5 min | 15 min | 2 min |

---

## 🎯 Recommendations

### For Production
✅ **Use GitHub Actions** (Method 1)
- Automated testing and deployment
- Proper staging → production flow
- Docker-based with caching
- Automated rollbacks

### For Quick Testing
✅ **Use PowerShell Script** (Method 2)
- Fast one-off deployments
- Good for hotfixes
- No Git commits needed

### For Learning
✅ **Use Azure CLI** (Method 3)
- Understand each step
- Full control
- Great for troubleshooting

### For Development
✅ **Use Docker Compose** (Method 4)
- Instant local environment
- No cloud costs
- Fast iteration

---

## 📚 Additional Resources

- [Azure App Service Python Docs](https://docs.microsoft.com/en-us/azure/app-service/quickstart-python)
- [FastAPI Deployment Guide](https://fastapi.tiangolo.com/deployment/)
- [GitHub Actions Azure Deploy](https://github.com/Azure/webapps-deploy)
- [Aria API Documentation](./QUICK_DEPLOYMENT.md)

---

**Questions or issues?** Check the [troubleshooting section](#troubleshooting) or open a GitHub issue.
