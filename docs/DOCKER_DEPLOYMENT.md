# Docker Deployment Guide for Aria

## Overview

Aria runs as a Docker container on Azure App Service. This guide explains how to deploy code changes and troubleshoot deployment issues.

---

## 🚨 Critical Information

**The Aria API runs in a Docker container on Azure App Service.**

This means:
- ✅ **Code changes require rebuilding the Docker image**
- ❌ **ZIP file deployments will NOT update running code**
- 🔄 **Container must pull new image after pushing to registry**
- 📦 **Images stored in Azure Container Registry: `tracklitdevkvnx2h.azurecr.io`**

---

## Deployment Workflow

### For Code Changes

```bash
# 1. Make your code changes
# 2. Commit to git
git add .
git commit -m "feat: your changes"
git push origin main

# 3. Login to Azure Container Registry
az acr login --name tracklitdevkvnx2h

# 4. Build Docker image
docker build -t tracklitdevkvnx2h.azurecr.io/aria-app:latest \
             -t tracklitdevkvnx2h.azurecr.io/aria-app:$(date +%Y%m%d-%H%M%S) .

# 5. Push to registry
docker push tracklitdevkvnx2h.azurecr.io/aria-app:latest

# 6. Force app to pull new image (stop/start cycle)
az webapp stop --name aria-dev-api --resource-group rg-tracklit-dev
sleep 10
az webapp start --name aria-dev-api --resource-group rg-tracklit-dev

# 7. Wait for startup and test
sleep 60
curl https://aria-dev-api.azurewebsites.net/api/v1/health
```

### For Configuration Changes Only

If you're only changing environment variables (no code changes):

```bash
# Update app settings
az webapp config appsettings set \
  --name aria-dev-api \
  --resource-group rg-tracklit-dev \
  --settings KEY=VALUE

# Restart (not stop/start)
az webapp restart --name aria-dev-api --resource-group rg-tracklit-dev
```

---

## Dockerfile Structure

The Dockerfile uses multi-stage builds for efficiency:

```dockerfile
# Stage 1: Build stage (installs dependencies)
FROM python:3.11-slim as builder
# ... installs all packages

# Stage 2: Runtime stage (copies from builder)
FROM python:3.11-slim
# ... minimal runtime image
```

Key features:
- Python 3.11 base image
- Non-root user (Aria) for security
- Optimized layer caching
- Health check included

---

## Troubleshooting

### Problem: Code changes not appearing after deployment

**Symptoms:**
- New code committed and pushed
- Deployment shows success
- But old code still running

**Solution:**
You likely did a ZIP deployment. **ZIP deployments don't work for Docker containers.**

```bash
# Rebuild and push Docker image
docker build -t tracklitdevkvnx2h.azurecr.io/aria-app:latest .
docker push tracklitdevkvnx2h.azurecr.io/aria-app:latest

# Force container recreation
az webapp stop --name aria-dev-api --resource-group rg-tracklit-dev
az webapp start --name aria-dev-api --resource-group rg-tracklit-dev
```

### Problem: Container not pulling new image

**Symptoms:**
- New image pushed to ACR
- App restarted but still running old code

**Solution:**
Use stop/start instead of restart:

```bash
# Stop the app
az webapp stop --name aria-dev-api --resource-group rg-tracklit-dev
sleep 10

# Start the app (forces pull)
az webapp start --name aria-dev-api --resource-group rg-tracklit-dev
sleep 60

# Verify
curl https://aria-dev-api.azurewebsites.net/api/v1/health
```

### Problem: Build fails with large context

**Symptoms:**
- Docker build takes forever
- Context transfer is huge

**Solution:**
Check your `.dockerignore` file:

```bash
# .dockerignore should contain:
__pycache__/
*.pyc
.venv/
venv/
.git/
.pytest_cache/
*.log
*.zip
verify-*/
*-logs/
```

### Problem: Voice integration not working

**Symptoms:**
- `/api/v1/voice/status` returns `available: false`

**Solution:**
1. Check environment variables are set:
```bash
az webapp config appsettings list \
  --name aria-dev-api \
  --resource-group rg-tracklit-dev \
  --query "[?name=='AZURE_SPEECH_KEY' || name=='AZURE_SPEECH_REGION']"
```

2. Check application logs:
```bash
az webapp log tail --name aria-dev-api --resource-group rg-tracklit-dev
```

3. Look for voice integration messages:
- ✅ "Voice integration loaded successfully"
- ❌ "Voice integration import failed"
- ❌ "Voice integration initialization failed"

---

## Verifying Deployment

After deploying, verify the changes took effect:

### 1. Check Container Image
```bash
# Get current container image
az webapp config show \
  --name aria-dev-api \
  --resource-group rg-tracklit-dev \
  --query "linuxFxVersion" \
  --output tsv
```

Should show: `DOCKER|tracklitdevkvnx2h.azurecr.io/aria-app:latest`

### 2. Check Last Deployment
```bash
# View recent deployments
az webapp deployment list \
  --name aria-dev-api \
  --resource-group rg-tracklit-dev \
  --query "[0]" \
  --output table
```

### 3. Check Application Logs
```bash
# Download logs
az webapp log download \
  --name aria-dev-api \
  --resource-group rg-tracklit-dev \
  --log-file logs.zip

# Check for startup messages
unzip -p logs.zip LogFiles/*_default_docker.log | grep -i "voice\|starting\|error" | tail -50
```

### 4. Test Endpoints
```bash
# Health check
curl https://aria-dev-api.azurewebsites.net/api/v1/health

# Voice status (if applicable)
curl https://aria-dev-api.azurewebsites.net/api/v1/voice/status

# API version
curl https://aria-dev-api.azurewebsites.net/api/v1/
```

---

## Common Commands

### Build & Deploy
```bash
# Full deployment
az acr login --name tracklitdevkvnx2h && \
docker build -t tracklitdevkvnx2h.azurecr.io/aria-app:latest . && \
docker push tracklitdevkvnx2h.azurecr.io/aria-app:latest && \
az webapp stop --name aria-dev-api --resource-group rg-tracklit-dev && \
sleep 10 && \
az webapp start --name aria-dev-api --resource-group rg-tracklit-dev
```

### View Logs
```bash
# Tail logs in real-time
az webapp log tail --name aria-dev-api --resource-group rg-tracklit-dev

# Download logs
az webapp log download --name aria-dev-api --resource-group rg-tracklit-dev --log-file logs.zip
```

### Container Management
```bash
# Stop container
az webapp stop --name aria-dev-api --resource-group rg-tracklit-dev

# Start container
az webapp start --name aria-dev-api --resource-group rg-tracklit-dev

# Restart container (doesn't pull new image)
az webapp restart --name aria-dev-api --resource-group rg-tracklit-dev
```

---

## Best Practices

1. **Always commit before building**
   - Ensures your Docker image matches your git history
   - Makes rollbacks easier

2. **Tag images with timestamps**
   ```bash
   docker build -t tracklitdevkvnx2h.azurecr.io/aria-app:$(date +%Y%m%d-%H%M%S) .
   ```

3. **Use stop/start for code changes**
   - `restart` doesn't pull new images
   - `stop` + `start` forces image pull

4. **Monitor logs after deployment**
   ```bash
   az webapp log tail --name aria-dev-api --resource-group rg-tracklit-dev
   ```

5. **Test locally first**
   ```bash
   docker build -t aria-app:test .
   docker run -p 8000:8000 --env-file .env aria-app:test
   ```

---

## Emergency Rollback

If deployment breaks production:

```bash
# 1. Find last working image
az acr repository show-tags --name tracklitdevkvnx2h --repository aria-app --orderby time_desc

# 2. Update to use specific tag
az webapp config container set \
  --name aria-dev-api \
  --resource-group rg-tracklit-dev \
  --docker-custom-image-name tracklitdevkvnx2h.azurecr.io/aria-app:<tag>

# 3. Restart
az webapp restart --name aria-dev-api --resource-group rg-tracklit-dev
```

---

**Last Updated**: 2026-01-02  
**Version**: 1.0
