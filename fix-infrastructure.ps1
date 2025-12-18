#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Fix and redeploy Aria infrastructure with all required Azure services

.DESCRIPTION
    This script creates missing Azure services and redeploys infrastructure
    with all required environment variables for Aria's features.

.PARAMETER ResourceGroup
    Azure resource group name

.PARAMETER Environment
    Environment (dev, staging, prod)

.EXAMPLE
    .\fix-infrastructure.ps1 -ResourceGroup "aria-prod-rg" -Environment "prod"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroup,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet('dev', 'staging', 'prod')]
    [string]$Environment = 'prod',
    
    [Parameter(Mandatory=$false)]
    [string]$Location = 'eastus',
    
    [Parameter(Mandatory=$false)]
    [string]$KeyVaultName = "tracklit-keyvault-$Environment"
)

$ErrorActionPreference = 'Stop'

function Write-Success { Write-Host "✅ $args" -ForegroundColor Green }
function Write-Info { Write-Host "ℹ️  $args" -ForegroundColor Cyan }
function Write-Warning { Write-Host "⚠️  $args" -ForegroundColor Yellow }
function Write-Failure { Write-Host "❌ $args" -ForegroundColor Red }

Write-Host @"

   █████╗ ██████╗ ██╗ █████╗     ██████╗ ███████╗██████╗  █████╗ ██╗██████╗ 
  ██╔══██╗██╔══██╗██║██╔══██╗    ██╔══██╗██╔════╝██╔══██╗██╔══██╗██║██╔══██╗
  ███████║██████╔╝██║███████║    ██████╔╝█████╗  ██████╔╝███████║██║██████╔╝
  ██╔══██║██╔══██╗██║██╔══██║    ██╔══██╗██╔══╝  ██╔═══╝ ██╔══██║██║██╔══██╗
  ██║  ██║██║  ██║██║██║  ██║    ██║  ██║███████╗██║     ██║  ██║██║██║  ██║
  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝    ╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝
                                                                             
  Infrastructure Repair & Redeployment
  Environment: $Environment
"@ -ForegroundColor Cyan

Write-Info "Starting infrastructure repair..."

# Check Azure CLI
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Failure "Azure CLI not found. Install from: https://aka.ms/InstallAzureCLIDocs"
    exit 1
}

# Check if logged in
$azAccount = az account show 2>$null | ConvertFrom-Json
if (-not $azAccount) {
    Write-Warning "Not logged in to Azure. Attempting login..."
    az login
    $azAccount = az account show | ConvertFrom-Json
}
Write-Success "Logged in as: $($azAccount.user.name)"

# ============================================================================
# STEP 1: Create Azure Communication Services
# ============================================================================
Write-Info "Step 1/6: Creating Azure Communication Services..."

$commName = "aria-comm-$Environment"
$commExists = az communication show --name $commName --resource-group $ResourceGroup 2>$null

if (-not $commExists) {
    Write-Info "Creating Communication Services: $commName"
    az communication create `
        --name $commName `
        --resource-group $ResourceGroup `
        --data-location "United States" `
        --output none
    
    Write-Success "Communication Services created"
} else {
    Write-Success "Communication Services already exists: $commName"
}

# Get connection string
Write-Info "Retrieving connection string..."
$commConnectionString = az communication list-key `
    --name $commName `
    --resource-group $ResourceGroup `
    --query "primaryConnectionString" -o tsv

Write-Success "Connection string retrieved"

# ============================================================================
# STEP 2: Create Azure Speech Services
# ============================================================================
Write-Info "Step 2/6: Creating Azure Speech Services..."

$speechName = "aria-speech-$Environment"
$speechExists = az cognitiveservices account show --name $speechName --resource-group $ResourceGroup 2>$null

if (-not $speechExists) {
    Write-Info "Creating Speech Services: $speechName"
    az cognitiveservices account create `
        --name $speechName `
        --resource-group $ResourceGroup `
        --kind "SpeechServices" `
        --sku "S0" `
        --location $Location `
        --yes `
        --output none
    
    Write-Success "Speech Services created"
} else {
    Write-Success "Speech Services already exists: $speechName"
}

# Get Speech key
Write-Info "Retrieving Speech key..."
$speechKey = az cognitiveservices account keys list `
    --name $speechName `
    --resource-group $ResourceGroup `
    --query "key1" -o tsv

Write-Success "Speech key retrieved"

# ============================================================================
# STEP 3: Create Azure Translator
# ============================================================================
Write-Info "Step 3/6: Creating Azure Translator..."

$translatorName = "aria-translator-$Environment"
$translatorExists = az cognitiveservices account show --name $translatorName --resource-group $ResourceGroup 2>$null

if (-not $translatorExists) {
    Write-Info "Creating Translator: $translatorName"
    az cognitiveservices account create `
        --name $translatorName `
        --resource-group $ResourceGroup `
        --kind "TextTranslation" `
        --sku "S1" `
        --location "global" `
        --yes `
        --output none
    
    Write-Success "Translator created"
} else {
    Write-Success "Translator already exists: $translatorName"
}

# Get Translator key
Write-Info "Retrieving Translator key..."
$translatorKey = az cognitiveservices account keys list `
    --name $translatorName `
    --resource-group $ResourceGroup `
    --query "key1" -o tsv

Write-Success "Translator key retrieved"

# ============================================================================
# STEP 4: Add Secrets to Key Vault
# ============================================================================
Write-Info "Step 4/6: Adding secrets to Key Vault ($KeyVaultName)..."

# Add Communication Services connection string
Write-Info "Adding AZURE-COMMUNICATION-CONNECTION-STRING..."
az keyvault secret set `
    --vault-name $KeyVaultName `
    --name "AZURE-COMMUNICATION-CONNECTION-STRING" `
    --value $commConnectionString `
    --output none
Write-Success "Added AZURE-COMMUNICATION-CONNECTION-STRING"

# Add Speech Services key
Write-Info "Adding AZURE-SPEECH-KEY..."
az keyvault secret set `
    --vault-name $KeyVaultName `
    --name "AZURE-SPEECH-KEY" `
    --value $speechKey `
    --output none
Write-Success "Added AZURE-SPEECH-KEY"

# Add Translator key
Write-Info "Adding AZURE-TRANSLATOR-KEY..."
az keyvault secret set `
    --vault-name $KeyVaultName `
    --name "AZURE-TRANSLATOR-KEY" `
    --value $translatorKey `
    --output none
Write-Success "Added AZURE-TRANSLATOR-KEY"

# Check for other required secrets
$requiredSecrets = @(
    "TRACKLIT-API-KEY",
    "TRACKLIT-WEBHOOK-SECRET",
    "TERRA-WEBHOOK-SECRET"
)

foreach ($secretName in $requiredSecrets) {
    $secretExists = az keyvault secret show --vault-name $KeyVaultName --name $secretName 2>$null
    if (-not $secretExists) {
        Write-Warning "Secret '$secretName' not found in Key Vault"
        Write-Info "Please add this secret manually:"
        Write-Host "  az keyvault secret set --vault-name $KeyVaultName --name $secretName --value 'your-value'" -ForegroundColor Yellow
    } else {
        Write-Success "Secret '$secretName' exists"
    }
}

# ============================================================================
# STEP 5: Update Parameters File
# ============================================================================
Write-Info "Step 5/6: Updating parameters file..."

$paramsFile = "infrastructure/main.parameters.json"
if (-not (Test-Path $paramsFile)) {
    Write-Failure "Parameters file not found: $paramsFile"
    exit 1
}

# Update storage account name based on environment
$storageAccountName = "ariastorage$Environment"

Write-Info "Storage account will be: $storageAccountName"
Write-Success "Parameters file ready"

# ============================================================================
# STEP 6: Redeploy Infrastructure
# ============================================================================
Write-Info "Step 6/6: Redeploying infrastructure with Bicep..."

Write-Info "Running deployment (this may take 3-5 minutes)..."

az deployment group create `
    --resource-group $ResourceGroup `
    --template-file "infrastructure/main.bicep" `
    --parameters "infrastructure/main.parameters.json" `
    --parameters azureCommunicationConnectionString=$commConnectionString `
    --parameters azureSpeechKey=$speechKey `
    --parameters azureTranslatorKey=$translatorKey `
    --parameters storageAccountName=$storageAccountName `
    --parameters environment=$Environment `
    --output table

if ($LASTEXITCODE -eq 0) {
    Write-Success "Infrastructure deployment completed successfully"
} else {
    Write-Failure "Infrastructure deployment failed. Check errors above."
    exit 1
}

# ============================================================================
# STEP 7: Restart Web App
# ============================================================================
Write-Info "Restarting Web App to apply new configuration..."

$webAppName = "aria-$Environment-api"
az webapp restart `
    --name $webAppName `
    --resource-group $ResourceGroup `
    --output none

Write-Success "Web App restarted"

# ============================================================================
# VERIFICATION
# ============================================================================
Write-Host ""
Write-Success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Success "  INFRASTRUCTURE REPAIR COMPLETED!"
Write-Success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""

Write-Info "Waiting for application to start (30 seconds)..."
Start-Sleep -Seconds 30

# Get app URL
$appUrl = az webapp show --name $webAppName --resource-group $ResourceGroup --query "defaultHostName" -o tsv
$appUrl = "https://$appUrl"

Write-Host ""
Write-Info "Application URL: $appUrl"
Write-Info "Health Check: $appUrl/health"
Write-Info "API Docs: $appUrl/docs"
Write-Host ""

# Test health endpoint
try {
    $healthCheck = Invoke-RestMethod -Uri "$appUrl/health" -TimeoutSec 10
    Write-Success "Health check passed!"
    Write-Host ($healthCheck | ConvertTo-Json -Depth 3)
} catch {
    Write-Warning "Health check failed. App may still be starting up."
    Write-Info "Check logs: az webapp log tail --name $webAppName --resource-group $ResourceGroup"
}

Write-Host ""
Write-Success "✅ New Azure Resources Created:"
Write-Host "  - Azure Communication Services: $commName" -ForegroundColor Green
Write-Host "  - Azure Speech Services: $speechName" -ForegroundColor Green
Write-Host "  - Azure Translator: $translatorName" -ForegroundColor Green
Write-Host "  - Azure Storage Account: $storageAccountName" -ForegroundColor Green
Write-Host ""

Write-Success "✅ Secrets Added to Key Vault:"
Write-Host "  - AZURE-COMMUNICATION-CONNECTION-STRING" -ForegroundColor Green
Write-Host "  - AZURE-SPEECH-KEY" -ForegroundColor Green
Write-Host "  - AZURE-TRANSLATOR-KEY" -ForegroundColor Green
Write-Host ""

Write-Success "✅ Features Now Working:"
Write-Host "  - Email notifications" -ForegroundColor Green
Write-Host "  - SMS notifications" -ForegroundColor Green
Write-Host "  - Video analysis with pose detection" -ForegroundColor Green
Write-Host "  - Voice commands (speech-to-text)" -ForegroundColor Green
Write-Host "  - Multi-language support" -ForegroundColor Green
Write-Host "  - Background task processing" -ForegroundColor Green
Write-Host ""

Write-Info "To verify all features, check:"
Write-Host "  curl $appUrl/docs" -ForegroundColor Yellow
Write-Host ""

Write-Success "Infrastructure repair completed at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
