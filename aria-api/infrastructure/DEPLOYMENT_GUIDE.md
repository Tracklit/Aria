# Aria Azure Infrastructure - Full Assessment & Deployment Guide

## Overview

This document provides a comprehensive assessment of all Azure resources needed to deploy the Aria AI Running Coach platform using **Azure Container Apps**.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Azure Container Apps Environment                    │
│  ┌─────────────────────────────┐    ┌─────────────────────────────┐            │
│  │   Python API (FastAPI)      │    │   Node.js API (Express)     │            │
│  │   ca-aria-api-{env}         │    │   ca-aria-mobile-{env}      │            │
│  │   Port: 8000                │◄───│   Port: 8080                │            │
│  │   - AI Companion Logic      │    │   - Mobile App Backend      │            │
│  │   - Training Plans          │    │   - Auth/Sessions           │            │
│  │   - Wearable Integration    │    │   - Dashboard Proxy         │            │
│  └──────────┬──────────────────┘    └──────────┬──────────────────┘            │
│             │                                   │                               │
└─────────────┼───────────────────────────────────┼───────────────────────────────┘
              │                                   │
              ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Shared Azure Services                               │
│                                                                                  │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐    │
│  │   Key Vault   │  │   PostgreSQL  │  │  Redis Cache  │  │   Storage     │    │
│  │   (Secrets)   │  │  (TrackLit)   │  │  (TrackLit)   │  │   (Blobs)     │    │
│  └───────────────┘  └───────────────┘  └───────────────┘  └───────────────┘    │
│                                                                                  │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐    │
│  │ Azure OpenAI  │  │ Azure Speech  │  │  Translator   │  │ Communication │    │
│  │  (GPT-4o)     │  │   Services    │  │   Services    │  │   Services    │    │
│  └───────────────┘  └───────────────┘  └───────────────┘  └───────────────┘    │
│                                                                                  │
│  ┌───────────────┐  ┌───────────────┐                                          │
│  │  App Insights │  │Log Analytics  │                                          │
│  │ (Monitoring)  │  │  (Logging)    │                                          │
│  └───────────────┘  └───────────────┘                                          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Azure Services Required

### 1. Compute (Container Apps)

| Resource | Dev | Prod | Purpose |
|----------|-----|------|---------|
| Container Apps Environment | 1 | 1 | Hosts all container apps |
| Python API Container App | 1 (0-2 replicas) | 1 (1-5 replicas) | FastAPI backend for AI logic |
| Node.js API Container App | 1 (0-2 replicas) | 1 (1-5 replicas) | Express backend for mobile app |
| Azure Container Registry | 1 (Basic) | 1 (Standard) | Docker image storage |

**Estimated Cost:**
- Dev: ~$50-100/month (scale to zero enabled)
- Prod: ~$200-400/month (always-on with autoscaling)

---

### 2. AI & Cognitive Services

| Service | Dev | Prod | Purpose |
|---------|-----|------|---------|
| **Azure OpenAI** | ✅ | ✅ | AI coaching conversations |
| - gpt-4o-mini | 30 TPM | 60 TPM | Primary chat model |
| - gpt-4o | - | 60 TPM | Advanced reasoning (prod only) |
| - text-embedding-ada-002 | - | 120 TPM | Embeddings for RAG (prod only) |
| **Azure Speech Services** | ✅ | ✅ | Voice interaction |
| - Speech-to-Text | S0 | S0 | Voice input |
| - Text-to-Speech | S0 | S0 | Aria voice responses |
| **Azure Translator** | ❌ | ✅ | Multi-language support |
| **Azure Communication Services** | ❌ | ✅ | Email & SMS notifications |

**Estimated Cost:**
- Dev: ~$50-100/month
- Prod: ~$200-500/month (depends on usage)

---

### 3. Data Storage

| Resource | Dev | Prod | Purpose |
|----------|-----|------|---------|
| **PostgreSQL Flexible Server** | Existing (TrackLit) | Existing (TrackLit) | User data, training plans |
| **Azure Cache for Redis** | Existing (TrackLit) | Existing (TrackLit) | Session cache, rate limiting |
| **Azure Blob Storage** | Standard_LRS | Standard_GRS | Video uploads, profile images |
| - `aria-videos` container | ✅ | ✅ | Video analysis uploads |
| - `profile-images` container | ✅ | ✅ | User profile images |
| - `uploads` container | ✅ | ✅ | General file uploads |

**Estimated Cost:**
- Dev: ~$10-20/month (shared with TrackLit)
- Prod: ~$20-50/month (shared with TrackLit)

---

### 4. Security & Secrets

| Resource | Dev | Prod | Purpose |
|----------|-----|------|---------|
| **Azure Key Vault** | 1 (Standard) | 1 (Standard) | Secret management |
| Managed Identity | System-assigned | System-assigned | Passwordless auth |

**Required Secrets:**
| Secret Name | Description |
|-------------|-------------|
| `DATABASE-URL` | PostgreSQL connection string |
| `REDIS-URL` | Redis connection string |
| `JWT-SECRET` | JWT signing key |
| `OPENAI-API-KEY` | OpenAI API key (fallback) |
| `AZURE-OPENAI-KEY` | Azure OpenAI key (if not using managed identity) |
| `STRIPE-SECRET-KEY` | Stripe payments |
| `STRIPE-WEBHOOK-SECRET` | Stripe webhooks |
| `TERRA-API-KEY` | Terra wearable integration |
| `TERRA-DEV-ID` | Terra developer ID |
| `TERRA-WEBHOOK-SECRET` | Terra webhooks |
| `AZURE-SPEECH-KEY` | Azure Speech Services (if not using managed identity) |
| `AZURE-TRANSLATOR-KEY` | Azure Translator (if not using managed identity) |
| `AZURE-COMMUNICATION-CONNECTION-STRING` | Email/SMS services |
| `TRACKLIT-API-KEY` | TrackLit integration |
| `TRACKLIT-WEBHOOK-SECRET` | TrackLit webhooks |

---

### 5. Monitoring & Observability

| Resource | Dev | Prod | Purpose |
|----------|-----|------|---------|
| **Log Analytics Workspace** | 30-day retention | 90-day retention | Centralized logging |
| **Application Insights** | 30-day retention | 90-day retention | APM & telemetry |

**Estimated Cost:**
- Dev: ~$10-20/month
- Prod: ~$30-100/month (depends on ingestion volume)

---

## Environment Comparison

| Feature | Dev | Prod |
|---------|-----|------|
| **Container Apps** | Scale to zero | Always-on (min 1 replica) |
| **Max Replicas** | 2 | 5 |
| **CPU per container** | 0.5-1 vCPU | 1-2 vCPU |
| **Memory per container** | 1-2 GB | 2-4 GB |
| **Zone Redundancy** | No | Yes |
| **OpenAI Models** | gpt-4o-mini only | gpt-4o, gpt-4o-mini, embeddings |
| **AI Services** | OpenAI + Speech | All services |
| **Storage Redundancy** | LRS | GRS |
| **Key Vault Purge Protection** | No | Yes |
| **Log Retention** | 30 days | 90 days |

---

## Total Estimated Monthly Cost

| Environment | Low Estimate | High Estimate |
|-------------|--------------|---------------|
| **Dev** | $120/month | $250/month |
| **Prod** | $450/month | $1,000/month |

*Note: Costs depend heavily on usage patterns, especially AI API calls.*

---

## Deployment Steps

### Prerequisites

1. **Azure CLI** installed and logged in
2. **Docker** installed for building container images
3. **Access to TrackLit resources** (PostgreSQL, Redis, Key Vault)

### Step 1: Deploy Infrastructure

```powershell
# Dev environment
.\infrastructure\deploy-container-apps.ps1 -Environment dev

# Prod environment  
.\infrastructure\deploy-container-apps.ps1 -Environment prod
```

### Step 2: Build and Push Container Images

```powershell
# Login to Azure Container Registry
$ACR_NAME = "acrariadev"  # Replace with your ACR name
az acr login --name $ACR_NAME

# Build and push Python API
docker build -t $ACR_NAME.azurecr.io/aria-api:latest .
docker push $ACR_NAME.azurecr.io/aria-api:latest

# Build and push Node.js API
cd aria-api/mobile-backend
docker build -f Dockerfile -t $ACR_NAME.azurecr.io/aria-mobile-app:latest .
docker push $ACR_NAME.azurecr.io/aria-mobile-app:latest
```

### Step 3: Configure Key Vault Secrets

```powershell
$KV_NAME = "kv-aria-dev-xxxxx"  # Replace with your Key Vault name

# Database (from TrackLit)
az keyvault secret set --vault-name $KV_NAME --name "DATABASE-URL" --value "postgresql://..."

# Redis (from TrackLit)
az keyvault secret set --vault-name $KV_NAME --name "REDIS-URL" --value "rediss://..."

# JWT Secret
az keyvault secret set --vault-name $KV_NAME --name "JWT-SECRET" --value "$(openssl rand -base64 64)"

# Stripe
az keyvault secret set --vault-name $KV_NAME --name "STRIPE-SECRET-KEY" --value "sk_..."
az keyvault secret set --vault-name $KV_NAME --name "STRIPE-WEBHOOK-SECRET" --value "whsec_..."

# Terra API
az keyvault secret set --vault-name $KV_NAME --name "TERRA-API-KEY" --value "..."
az keyvault secret set --vault-name $KV_NAME --name "TERRA-DEV-ID" --value "..."
```

### Step 4: Verify Deployment

```powershell
# Get Container App URLs
$PYTHON_API = az containerapp show -n ca-aria-api-dev -g rg-aria-dev --query "properties.configuration.ingress.fqdn" -o tsv
$NODE_API = az containerapp show -n ca-aria-mobile-dev -g rg-aria-dev --query "properties.configuration.ingress.fqdn" -o tsv

# Test health endpoints
curl "https://$PYTHON_API/health/live"
curl "https://$NODE_API/api/health"
```

---

## Files Created

| File | Purpose |
|------|---------|
| `infrastructure/container-apps/main.bicep` | Main Bicep template with all resources |
| `infrastructure/container-apps/parameters.dev.json` | Dev environment parameters |
| `infrastructure/container-apps/parameters.prod.json` | Prod environment parameters |
| `infrastructure/container-apps/keyvault-secrets.bicep` | Key Vault secrets module |
| `infrastructure/deploy-container-apps.ps1` | Deployment script |
| `aria-api/mobile-backend/Dockerfile` | Node.js API Dockerfile |

---

## CI/CD Integration

For automated deployments, add these to your GitHub Actions or Azure DevOps pipeline:

```yaml
# Example GitHub Actions workflow
name: Deploy to Azure Container Apps

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      
      - name: Build and push Python API
        run: |
          az acr build --registry ${{ secrets.ACR_NAME }} \
            --image aria-api:${{ github.sha }} .
      
      - name: Deploy to Container Apps
        run: |
          az containerapp update -n ca-aria-api-prod \
            -g rg-aria-prod \
            --image ${{ secrets.ACR_NAME }}.azurecr.io/aria-api:${{ github.sha }}
```

---

## Next Steps

1. **Review and customize** the parameter files for your environment
2. **Run the deployment script** with `-WhatIf` first to preview changes
3. **Configure secrets** in Key Vault after deployment
4. **Set up CI/CD** for automated deployments
5. **Configure custom domains** and SSL certificates
6. **Set up alerts** in Application Insights for monitoring
