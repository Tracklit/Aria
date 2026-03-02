# Aria Dev API — Operations Guide

## Current Deployment Configuration

| Setting | Value |
|---|---|
| **App Service** | `aria-dev-api` |
| **Resource Group** | `rg-tracklit-dev` |
| **Subscription** | `ME-MngEnvMCAP568620-anrugama-dev` |
| **App Service Plan** | `aria-dev-plan` (B1 Basic) |
| **Container Image** | `tracklitdevkvnx2h.azurecr.io/aria-app:main-20f8ab7` |
| **Container Registry** | `tracklitdevkvnx2h` (dev subscription) |
| **Startup Command** | `uvicorn src.main:app --host 0.0.0.0 --port 8000` |
| **Health Check** | `/health/ready` |

## Pinned Image Tag

The API **must** use the image tag `main-20f8ab7` (deployed by Anthony Rugama). This is the last known working API image.

**Do NOT use the `latest` tag.** It was overwritten by a separate Aria mobile app deployment and does not contain the API code.

## Rules to Keep the API Healthy

### 1. Never deploy the Aria mobile app to `aria-dev-api`

The `Tracklit/Aria` GitHub repo contains both the Aria mobile app and the Aria API. The mobile app must **not** be deployed to the `aria-dev-api` App Service. If a GitHub Actions workflow pushes to `latest`, the API container will be replaced with the wrong application.

**Mitigation:** The container image is pinned to `main-20f8ab7` instead of `latest`. Do not change it back to `latest` unless a verified API image has been pushed to that tag.

### 2. Never downgrade the App Service plan to Free (F1)

On 2026-02-06, the plan was found on the Free tier with state `QuotaExceeded`, which caused 503 errors. It has been upgraded to **B1 Basic** (~$13/month). Do not downgrade — the Free tier has CPU/hour quotas that will take the API offline under normal usage.

### 3. Keep the ACR password set

The `DOCKER_REGISTRY_SERVER_PASSWORD` app setting must contain a valid password for `tracklitdevkvnx2h.azurecr.io`. Without it, the container cannot be pulled and the app will show a 503 Application Error.

To regenerate if needed:
```bash
az acr credential show --name tracklitdevkvnx2h \
  --subscription "ME-MngEnvMCAP568620-anrugama-dev" \
  --query "passwords[0].value" -o tsv
```

### 4. The TrackLit prod backend depends on this API

The production TrackLit server (`app-tracklit-prod-tnrusd.azurewebsites.net`) calls `https://aria-dev-api.azurewebsites.net/ask` for Sprinthia AI Coach responses. If the Aria dev API goes down, Sprinthia chat is broken for all users.

### 5. Be aware of cold starts

After a restart, the container can take 60–90 seconds to become ready. The health endpoint (`/health/ready`) will return 200 with `{"status":"healthy"}` once the app is fully started.

## Quick Diagnostics

```bash
# Check if the API is healthy
curl https://aria-dev-api.azurewebsites.net/health/ready

# Check app state (should be "Running", NOT "QuotaExceeded" or "Stopped")
az webapp show --name aria-dev-api --resource-group rg-tracklit-dev \
  --subscription "ME-MngEnvMCAP568620-anrugama-dev" \
  --query "{state:state, availabilityState:availabilityState}" -o json

# Check which image is deployed (should be main-20f8ab7)
az webapp show --name aria-dev-api --resource-group rg-tracklit-dev \
  --subscription "ME-MngEnvMCAP568620-anrugama-dev" \
  --query "siteConfig.linuxFxVersion" -o tsv

# Check App Service plan tier (should be B1, not F1)
az appservice plan show --name aria-dev-plan --resource-group rg-tracklit-dev \
  --subscription "ME-MngEnvMCAP568620-anrugama-dev" \
  --query "sku.{name:name, tier:tier}" -o json
```

## Incident History

| Date | Issue | Root Cause | Fix |
|---|---|---|---|
| 2026-02-06 | Sprinthia chat broken, API returning 503 | 1) App Service plan was Free (F1) and hit quota. 2) ACR password was empty. 3) `latest` tag had been overwritten by mobile app deployment. | Upgraded plan to B1, set ACR password, pinned image to `main-20f8ab7`. |
