# =============================================================================
# Aria Container Apps Deployment Script
# =============================================================================
# This script deploys the Aria infrastructure to Azure Container Apps
# =============================================================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$false)]
    [string]$Location = "eastus",
    
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$WhatIf,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipContainerBuild
)

$ErrorActionPreference = "Stop"

# =============================================================================
# CONFIGURATION
# =============================================================================

$AppName = "aria"
if ($ResourceGroupName -eq "") {
    $ResourceGroupName = "rg-$AppName-$Environment"
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$InfraDir = Join-Path $ScriptDir "container-apps"
$BicepFile = Join-Path $InfraDir "main.bicep"
$ParametersFile = Join-Path $InfraDir "parameters.$Environment.json"

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "▶ $Message" -ForegroundColor Cyan
    Write-Host ("-" * 60) -ForegroundColor DarkGray
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# =============================================================================
# PREREQUISITES CHECK
# =============================================================================

Write-Step "Checking prerequisites"

# Check Azure CLI
try {
    $azVersion = az version --output json | ConvertFrom-Json
    Write-Success "Azure CLI version: $($azVersion.'azure-cli')"
} catch {
    Write-Error "Azure CLI not found. Please install: https://aka.ms/installazurecliwindows"
    exit 1
}

# Check logged in
$account = az account show --output json 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Error "Not logged in to Azure. Run 'az login' first."
    exit 1
}
Write-Success "Logged in as: $($account.user.name)"
Write-Success "Subscription: $($account.name) ($($account.id))"

# Check Bicep
try {
    $bicepVersion = az bicep version --output tsv 2>$null
    Write-Success "Bicep version: $bicepVersion"
} catch {
    Write-Warning "Installing Bicep..."
    az bicep install
}

# Check files exist
if (-not (Test-Path $BicepFile)) {
    Write-Error "Bicep file not found: $BicepFile"
    exit 1
}
Write-Success "Bicep file found: $BicepFile"

if (-not (Test-Path $ParametersFile)) {
    Write-Warning "Parameters file not found: $ParametersFile"
    Write-Warning "Using default parameters"
    $ParametersFile = $null
}

# =============================================================================
# CREATE RESOURCE GROUP
# =============================================================================

Write-Step "Creating resource group: $ResourceGroupName"

if ($WhatIf) {
    Write-Warning "[WhatIf] Would create resource group: $ResourceGroupName in $Location"
} else {
    az group create `
        --name $ResourceGroupName `
        --location $Location `
        --tags Application=$AppName Environment=$Environment ManagedBy=Bicep `
        --output none
    Write-Success "Resource group created/verified: $ResourceGroupName"
}

# =============================================================================
# BUILD AND PUSH CONTAINER IMAGES
# =============================================================================

if (-not $SkipContainerBuild) {
    Write-Step "Building and pushing container images"
    
    # This would typically be done in CI/CD, but we provide the option here
    Write-Warning "Container build skipped. Use CI/CD pipeline or run:"
    Write-Host "  # Build Python API"
    Write-Host "  docker build -t <acr-name>.azurecr.io/aria-api:latest ."
    Write-Host "  docker push <acr-name>.azurecr.io/aria-api:latest"
    Write-Host ""
    Write-Host "  # Build Node.js API"
    Write-Host "  cd mobile-backend && docker build -f Dockerfile -t <acr-name>.azurecr.io/aria-mobile-app:latest ."
    Write-Host "  docker push <acr-name>.azurecr.io/aria-mobile-app:latest"
}

# =============================================================================
# DEPLOY INFRASTRUCTURE
# =============================================================================

Write-Step "Deploying infrastructure (Environment: $Environment)"

$deploymentName = "aria-$Environment-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

$deployParams = @(
    "deployment", "group", "create",
    "--resource-group", $ResourceGroupName,
    "--template-file", $BicepFile,
    "--name", $deploymentName
)

if ($ParametersFile) {
    $deployParams += @("--parameters", "@$ParametersFile")
}

if ($WhatIf) {
    $deployParams += "--what-if"
}

Write-Host "Running: az $($deployParams -join ' ')" -ForegroundColor DarkGray

$result = az @deployParams --output json | ConvertFrom-Json

if ($LASTEXITCODE -ne 0) {
    Write-Error "Deployment failed!"
    exit 1
}

if (-not $WhatIf) {
    Write-Success "Deployment completed successfully!"
    
    # =============================================================================
    # OUTPUT DEPLOYMENT RESULTS
    # =============================================================================
    
    Write-Step "Deployment Outputs"
    
    $outputs = az deployment group show `
        --resource-group $ResourceGroupName `
        --name $deploymentName `
        --query properties.outputs `
        --output json | ConvertFrom-Json
    
    Write-Host ""
    Write-Host "📦 Container Apps:" -ForegroundColor Magenta
    Write-Host "   Python API:  $($outputs.pythonApiUrl.value)"
    Write-Host "   Node.js API: $($outputs.nodeApiUrl.value)"
    
    Write-Host ""
    Write-Host "🔐 Key Vault:" -ForegroundColor Magenta
    Write-Host "   Name: $($outputs.keyVaultName.value)"
    Write-Host "   URI:  $($outputs.keyVaultUri.value)"
    
    Write-Host ""
    Write-Host "📊 Monitoring:" -ForegroundColor Magenta
    Write-Host "   Application Insights: $($outputs.appInsightsName.value)"
    
    Write-Host ""
    Write-Host "🤖 AI Services:" -ForegroundColor Magenta
    if ($outputs.azureOpenAIEndpoint.value) {
        Write-Host "   Azure OpenAI: $($outputs.azureOpenAIEndpoint.value)"
    }
    if ($outputs.azureSpeechEndpoint.value) {
        Write-Host "   Azure Speech: $($outputs.azureSpeechEndpoint.value)"
    }
    if ($outputs.azureTranslatorEndpoint.value) {
        Write-Host "   Azure Translator: $($outputs.azureTranslatorEndpoint.value)"
    }
    
    Write-Host ""
    Write-Host "📁 Storage:" -ForegroundColor Magenta
    Write-Host "   Storage Account: $($outputs.storageAccountName.value)"
    
    Write-Host ""
    Write-Host "🐳 Container Registry:" -ForegroundColor Magenta
    Write-Host "   Login Server: $($outputs.containerRegistryLoginServer.value)"
    
    # =============================================================================
    # POST-DEPLOYMENT STEPS
    # =============================================================================
    
    Write-Step "Post-Deployment Steps"
    
    Write-Host "1. Configure Key Vault secrets:" -ForegroundColor Yellow
    Write-Host "   az keyvault secret set --vault-name $($outputs.keyVaultName.value) --name DATABASE-URL --value '<connection-string>'"
    Write-Host "   az keyvault secret set --vault-name $($outputs.keyVaultName.value) --name REDIS-URL --value '<connection-string>'"
    Write-Host "   az keyvault secret set --vault-name $($outputs.keyVaultName.value) --name JWT-SECRET --value '<secret>'"
    
    Write-Host ""
    Write-Host "2. Build and push container images:" -ForegroundColor Yellow
    Write-Host "   az acr login --name $($outputs.containerRegistryLoginServer.value.Split('.')[0])"
    Write-Host "   docker build -t $($outputs.containerRegistryLoginServer.value)/aria-api:latest ."
    Write-Host "   docker push $($outputs.containerRegistryLoginServer.value)/aria-api:latest"
    
    Write-Host ""
    Write-Host "3. Test the deployment:" -ForegroundColor Yellow
    Write-Host "   curl $($outputs.pythonApiUrl.value)/health/live"
    Write-Host "   curl $($outputs.nodeApiUrl.value)/api/health"
}

Write-Host ""
Write-Success "Script completed!"
