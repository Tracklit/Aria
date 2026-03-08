# Docker Deployment Guide for Aria

## Overview

Aria runs as Docker containers on Azure Container Apps (`ca-aria-api-prod`, `ca-aria-mobile-prod`) in resource group `rg-aria-prod`. This guide explains how to deploy code changes and troubleshoot deployment issues.

---

## 🚨 Critical Information

**The Aria API runs in a Docker container on Azure Container Apps.**

This means:
- ✅ **Code changes require rebuilding the Docker image**
- ❌ **ZIP file deployments will NOT update running code**
- 🔄 **Container must pull new image after pushing to registry**
- 📦 **Images stored in Azure Container Registry: `acrariaprodvse.azurecr.io`**

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
az acr login --name acrariaprodvse

# 4. Build Docker image
docker build -t acrariaprodvse.azurecr.io/aria-api:latest \
             -t acrariaprodvse.azurecr.io/aria-api:$(date +%Y%m%d-%H%M%S) .

# 5. Push to registry
docker push acrariaprodvse.azurecr.io/aria-api:latest

# 6. Deploy to Container App (use --revision-suffix to force new revision)
az containerapp update --name ca-aria-api-prod --resource-group rg-aria-prod \
  --image acrariaprodvse.azurecr.io/aria-api:latest \
  --revision-suffix "deploy-$(date +%s)"

# 7. Wait for startup and test
sleep 60
curl https://ca-aria-api-prod.calmcliff-31ba567d.westus.azurecontainerapps.io/health/ready
```

### For Configuration Changes Only

If you're only changing environment variables (no code changes):

```bash
# Update env vars on Container App
az containerapp update --name ca-aria-api-prod --resource-group rg-aria-prod \
  --set-env-vars "KEY=VALUE" \
  --revision-suffix "config-$(date +%s)"
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
docker buildx build --platform linux/amd64 -t acrariaprodvse.azurecr.io/aria-api:latest . --push

# Force new revision
az containerapp update --name ca-aria-api-prod --resource-group rg-aria-prod \
  --image acrariaprodvse.azurecr.io/aria-api:latest \
  --revision-suffix "deploy-$(date +%s)"
```

### Problem: Container not pulling new image

**Symptoms:**
- New image pushed to ACR
- App restarted but still running old code

**Solution:**
Use `--revision-suffix` to force a new revision that pulls the updated image:

```bash
az containerapp update --name ca-aria-api-prod --resource-group rg-aria-prod \
  --image acrariaprodvse.azurecr.io/aria-api:latest \
  --revision-suffix "deploy-$(date +%s)"

# Verify
curl https://ca-aria-api-prod.calmcliff-31ba567d.westus.azurecontainerapps.io/health/ready
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
az containerapp show --name ca-aria-api-prod --resource-group rg-aria-prod \
  --query "properties.template.containers[0].env"
```

2. Check application logs:
```bash
az containerapp logs show --name ca-aria-api-prod --resource-group rg-aria-prod --follow
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
az containerapp show --name ca-aria-api-prod --resource-group rg-aria-prod \
  --query "properties.template.containers[0].image" --output tsv
```

### 2. Check Active Revisions
```bash
az containerapp revision list --name ca-aria-api-prod --resource-group rg-aria-prod --output table
```

### 3. Check Application Logs
```bash
az containerapp logs show --name ca-aria-api-prod --resource-group rg-aria-prod --follow
```

### 4. Test Endpoints
```bash
# Health check
curl https://ca-aria-api-prod.calmcliff-31ba567d.westus.azurecontainerapps.io/health/ready

# Voice status (if applicable)
curl https://ca-aria-api-prod.calmcliff-31ba567d.westus.azurecontainerapps.io/api/v1/voice/status
```

---

## Common Commands

### Build & Deploy
```bash
# Full deployment
az acr login --name acrariaprodvse && \
docker buildx build --platform linux/amd64 -t acrariaprodvse.azurecr.io/aria-api:latest . --push && \
az containerapp update --name ca-aria-api-prod --resource-group rg-aria-prod \
  --image acrariaprodvse.azurecr.io/aria-api:latest \
  --revision-suffix "deploy-$(date +%s)"
```

### View Logs
```bash
# Tail logs in real-time
az containerapp logs show --name ca-aria-api-prod --resource-group rg-aria-prod --follow
```

### Container Management
```bash
# Restart active revision
az containerapp revision restart --name ca-aria-api-prod --resource-group rg-aria-prod \
  --revision <revision-name>

# List revisions
az containerapp revision list --name ca-aria-api-prod --resource-group rg-aria-prod --output table
```

---

## Best Practices

1. **Always commit before building**
   - Ensures your Docker image matches your git history
   - Makes rollbacks easier

2. **Tag images with timestamps**
   ```bash
   docker build -t acrariaprodvse.azurecr.io/aria-api:$(date +%Y%m%d-%H%M%S) .
   ```

3. **Use `--revision-suffix` for deployments**
   - Same `latest` tag won't trigger a new revision without it
   - Forces Container Apps to pull the updated image

4. **Monitor logs after deployment**
   ```bash
   az containerapp logs show --name ca-aria-api-prod --resource-group rg-aria-prod --follow
   ```

5. **Test locally first**
   ```bash
   docker build -t aria-api:test .
   docker run -p 8000:8000 --env-file .env aria-api:test
   ```

---

## Emergency Rollback

If deployment breaks production:

```bash
# 1. Find last working image
az acr repository show-tags --name acrariaprodvse --repository aria-api --orderby time_desc

# 2. Deploy specific tag
az containerapp update --name ca-aria-api-prod --resource-group rg-aria-prod \
  --image acrariaprodvse.azurecr.io/aria-api:<tag> \
  --revision-suffix "rollback-$(date +%s)"
```

---

**Last Updated**: 2026-03-08
**Version**: 2.0 (migrated from App Service to Container Apps, dev ACR to prod ACR)
