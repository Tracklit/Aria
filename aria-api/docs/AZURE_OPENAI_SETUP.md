# Azure OpenAI Setup with Managed Identity

## Overview

This guide explains how to configure Azure OpenAI for the Aria application using **Managed Identity authentication** instead of API keys. This approach is required when the Azure OpenAI resource has `disableLocalAuth=true` enforced by tenant policy.

## Why Managed Identity?

- **Security**: No API keys stored in environment variables or configuration files
- **Compliance**: Meets enterprise security requirements that disable key-based authentication
- **Simplicity**: Automatic credential management by Azure
- **Zero-rotation**: No need to rotate keys or manage expiration

## Prerequisites

- Azure subscription with appropriate permissions
- Azure OpenAI resource deployed
- Azure App Service or other compute resource for hosting
- Azure CLI installed (for manual setup)

## Architecture

```
┌─────────────────────────┐
│   Azure App Service     │
│   (aria-dev-api)        │
│                         │
│  System-Assigned        │
│  Managed Identity       │
│  (Principal ID: xxx)    │
└───────────┬─────────────┘
            │
            │ DefaultAzureCredential
            │ (No API Key)
            │
            ▼
┌─────────────────────────┐
│  Azure OpenAI Service   │
│  (aria-openai-azure)    │
│                         │
│  disableLocalAuth=true  │
│  ✓ Managed Identity     │
│  ✗ API Keys (disabled)  │
└─────────────────────────┘
```

## Step 1: Enable System-Assigned Managed Identity

### Using Azure Portal:

1. Navigate to your App Service (e.g., `aria-dev-api`)
2. Go to **Settings** → **Identity**
3. Under **System assigned** tab, toggle **Status** to **On**
4. Click **Save**
5. Copy the **Object (principal) ID** for next step

### Using Azure CLI:

```bash
# Enable system-assigned managed identity
az webapp identity assign \
  --name aria-dev-api \
  --resource-group rg-tracklit-dev

# Output will include principalId - save this for next step
```

## Step 2: Grant Azure OpenAI Access

The managed identity needs the **"Cognitive Services OpenAI User"** role to access Azure OpenAI.

### Using Azure Portal:

1. Navigate to your Azure OpenAI resource (e.g., `aria-openai-azure`)
2. Go to **Access control (IAM)**
3. Click **+ Add** → **Add role assignment**
4. Select role: **Cognitive Services OpenAI User**
5. Click **Next**
6. Select **Managed identity**
7. Click **+ Select members**
8. Choose your App Service's managed identity
9. Click **Review + assign**

### Using Azure CLI:

```bash
# Get the principal ID from Step 1
PRINCIPAL_ID="<your-principal-id-from-step-1>"

# Get the Azure OpenAI resource ID
OPENAI_RESOURCE_ID=$(az cognitiveservices account show \
  --name aria-openai-azure \
  --resource-group rg-tracklit-dev \
  --query id -o tsv)

# Assign the role
az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role "Cognitive Services OpenAI User" \
  --scope $OPENAI_RESOURCE_ID
```

## Step 3: Configure Environment Variables

Update your App Service configuration to use managed identity authentication.

### Required Environment Variables:

```bash
# Azure OpenAI Endpoint (REQUIRED)
AZURE_OPENAI_ENDPOINT=https://aria-openai-azure.openai.azure.com/

# Azure OpenAI Deployment Name (REQUIRED)
AZURE_OPENAI_DEPLOYMENT=gpt-4o

# DO NOT SET: AZURE_OPENAI_API_KEY
# The application will automatically use managed identity when API key is absent
```

### Using Azure Portal:

1. Navigate to your App Service
2. Go to **Settings** → **Configuration**
3. Under **Application settings**:
   - Ensure `AZURE_OPENAI_ENDPOINT` is set
   - Ensure `AZURE_OPENAI_DEPLOYMENT` is set
   - **Delete** `AZURE_OPENAI_API_KEY` if it exists
4. Click **Save**
5. Restart the App Service

### Using Azure CLI:

```bash
# Set required environment variables
az webapp config appsettings set \
  --name aria-dev-api \
  --resource-group rg-tracklit-dev \
  --settings \
    AZURE_OPENAI_ENDPOINT="https://aria-openai-azure.openai.azure.com/" \
    AZURE_OPENAI_DEPLOYMENT="gpt-4o"

# Remove API key if it exists
az webapp config appsettings delete \
  --name aria-dev-api \
  --resource-group rg-tracklit-dev \
  --setting-names AZURE_OPENAI_API_KEY

# Restart the app
az webapp restart \
  --name aria-dev-api \
  --resource-group rg-tracklit-dev
```

## Step 4: Verify Configuration

### Test OpenAI Endpoint:

```bash
# Test the Azure OpenAI connection
curl -X POST "https://aria-dev-api.azurewebsites.net/test/openai?question=Hello"
```

Expected response:
```json
{
  "success": true,
  "message": "Azure OpenAI is working",
  "model": "gpt-4o",
  "authentication": "Managed Identity ✅"
}
```

### Check Health Endpoint:

```bash
curl "https://aria-dev-api.azurewebsites.net/health"
```

Expected response:
```json
{
  "status": "healthy",
  "database": "healthy"
}
```

## Code Implementation

The application automatically uses `DefaultAzureCredential` when no API key is provided:

```python
from azure.identity import DefaultAzureCredential
from openai import AzureOpenAI

# Get configuration
endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT")
api_key = os.getenv("AZURE_OPENAI_API_KEY")

# Create client - uses managed identity if api_key is None
if api_key:
    # Use API key authentication (if available)
    client = AzureOpenAI(
        api_key=api_key,
        api_version="2024-02-15-preview",
        azure_endpoint=endpoint
    )
else:
    # Use managed identity authentication
    credential = DefaultAzureCredential()
    token = credential.get_token("https://cognitiveservices.azure.com/.default")
    client = AzureOpenAI(
        api_key=token.token,
        api_version="2024-02-15-preview",
        azure_endpoint=endpoint
    )
```

## Troubleshooting

### Error: "AuthenticationTypeDisabled"

**Problem**: Getting 403 error with message "Key based authentication is disabled"

**Solution**: 
- Ensure `AZURE_OPENAI_API_KEY` is **NOT** set in environment variables
- The application will automatically fall back to managed identity

### Error: "Permission denied"

**Problem**: Managed identity exists but cannot access Azure OpenAI

**Solution**:
- Verify the role assignment was created successfully
- Ensure you assigned **"Cognitive Services OpenAI User"** role
- Wait 5-10 minutes for role assignment propagation
- Restart the App Service

### Error: "DefaultAzureCredential failed to retrieve token"

**Problem**: Managed identity not configured properly

**Solution**:
- Verify system-assigned managed identity is enabled
- Check that the App Service is running in Azure (managed identity doesn't work locally)
- For local development, use Azure CLI authentication: `az login`

### Local Development

For local development, managed identity won't work. Options:

1. **Use Azure CLI authentication**:
   ```bash
   az login
   # Application will use your CLI credentials
   ```

2. **Use API key** (if `disableLocalAuth=false`):
   ```bash
   export AZURE_OPENAI_API_KEY="your-api-key"
   ```

## Environment Rebuild Checklist

When rebuilding the environment from scratch, follow this order:

1. ✅ Deploy Azure OpenAI resource
2. ✅ Deploy App Service
3. ✅ Enable system-assigned managed identity on App Service
4. ✅ Grant "Cognitive Services OpenAI User" role to managed identity
5. ✅ Configure environment variables (endpoint, deployment)
6. ✅ **DO NOT** set `AZURE_OPENAI_API_KEY`
7. ✅ Deploy application code
8. ✅ Restart App Service
9. ✅ Verify `/test/openai` endpoint

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use managed identity** whenever possible
3. **Rotate credentials** if using API keys
4. **Monitor access** via Azure Monitor and Application Insights
5. **Use separate identities** for different environments (dev/staging/prod)
6. **Apply least privilege**: Only grant necessary roles

## Additional Resources

- [Azure Managed Identity Documentation](https://learn.microsoft.com/azure/active-directory/managed-identities-azure-resources/)
- [Azure OpenAI Authentication](https://learn.microsoft.com/azure/ai-services/openai/how-to/managed-identity)
- [DefaultAzureCredential](https://learn.microsoft.com/python/api/azure-identity/azure.identity.defaultazurecredential)
- [Azure RBAC Roles for Cognitive Services](https://learn.microsoft.com/azure/ai-services/openai/how-to/role-based-access-control)

## Summary

✅ **Managed Identity** provides secure, keyless authentication  
✅ **Zero maintenance** - no key rotation required  
✅ **Enterprise compliant** - works with `disableLocalAuth=true`  
✅ **Simple setup** - 3 steps to configure  
✅ **Code automatically detects** - no code changes needed  

---

For questions or issues, refer to the main [SETUP_AND_ARCHITECTURE.md](./SETUP_AND_ARCHITECTURE.md) documentation.
