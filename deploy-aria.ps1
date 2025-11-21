#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Deploy Aria (Python FastAPI) to Azure Web App

.DESCRIPTION
    This script deploys the Aria AI companion service to Azure App Service.
    It handles Python dependencies, environment configuration, and deployment.

.PARAMETER ResourceGroup
    Azure resource group name

.PARAMETER AppName
    Azure Web App name

.PARAMETER Environment
    Deployment environment (dev, staging, prod)

.EXAMPLE
    .\deploy-aria.ps1 -ResourceGroup "rg-aria-prod" -AppName "app-aria-prod" -Environment "prod"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroup,
    
    [Parameter(Mandatory=$true)]
    [string]$AppName,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet('dev', 'staging', 'prod')]
    [string]$Environment = 'dev',
    
    [Parameter(Mandatory=$false)]
    [string]$Location = 'eastus',
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipTests
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# Color output functions
function Write-Success { Write-Host "✅ $args" -ForegroundColor Green }
function Write-Info { Write-Host "ℹ️  $args" -ForegroundColor Cyan }
function Write-Warning { Write-Host "⚠️  $args" -ForegroundColor Yellow }
function Write-Failure { Write-Host "❌ $args" -ForegroundColor Red }

# ASCII Banner
Write-Host @"

   █████╗ ██████╗ ██╗ █████╗     ██████╗ ███████╗██████╗ ██╗      ██████╗ ██╗   ██╗
  ██╔══██╗██╔══██╗██║██╔══██╗    ██╔══██╗██╔════╝██╔══██╗██║     ██╔═══██╗╚██╗ ██╔╝
  ███████║██████╔╝██║███████║    ██║  ██║█████╗  ██████╔╝██║     ██║   ██║ ╚████╔╝ 
  ██╔══██║██╔══██╗██║██╔══██║    ██║  ██║██╔══╝  ██╔═══╝ ██║     ██║   ██║  ╚██╔╝  
  ██║  ██║██║  ██║██║██║  ██║    ██████╔╝███████╗██║     ███████╗╚██████╔╝   ██║   
  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝    ╚═════╝ ╚══════╝╚═╝     ╚══════╝ ╚═════╝    ╚═╝   
                                                                                     
  Python FastAPI AI Companion Deployment
  Environment: $Environment
"@ -ForegroundColor Cyan

Write-Info "Starting Aria deployment to Azure..."

# ============================================================================
# STEP 1: Verify Prerequisites
# ============================================================================
Write-Info "Step 1/8: Verifying prerequisites..."

# Check Azure CLI
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Failure "Azure CLI not found. Install from: https://aka.ms/InstallAzureCLIDocs"
    exit 1
}
Write-Success "Azure CLI found"

# Check Python
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Failure "Python not found. Install Python 3.11+ from: https://www.python.org/"
    exit 1
}
$pythonVersion = python --version
Write-Success "Python found: $pythonVersion"

# Check if logged in to Azure
$azAccount = az account show 2>$null | ConvertFrom-Json
if (-not $azAccount) {
    Write-Warning "Not logged in to Azure. Attempting login..."
    az login
    $azAccount = az account show | ConvertFrom-Json
}
Write-Success "Logged in to Azure as: $($azAccount.user.name)"
Write-Info "Subscription: $($azAccount.name)"

# ============================================================================
# STEP 2: Validate Project Structure
# ============================================================================
Write-Info "Step 2/8: Validating project structure..."

$requiredFiles = @(
    "src/main.py",
    "requirements.txt",
    "Dockerfile"
)

foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        Write-Failure "Required file not found: $file"
        exit 1
    }
}
Write-Success "Project structure validated"

# ============================================================================
# STEP 3: Run Tests (Optional)
# ============================================================================
if (-not $SkipTests) {
    Write-Info "Step 3/8: Running tests..."
    
    # Install test dependencies if not already installed
    if (-not (Test-Path "venv")) {
        Write-Info "Creating virtual environment..."
        python -m venv venv
    }
    
    # Activate virtual environment
    if ($IsWindows -or $env:OS -match "Windows") {
        & ".\venv\Scripts\Activate.ps1"
    } else {
        & ".\venv\bin\Activate.ps1"
    }
    
    Write-Info "Installing dependencies..."
    pip install -q -r requirements.txt
    
    Write-Info "Running pytest..."
    $testResult = pytest tests/ --tb=short -v
    
    if ($LASTEXITCODE -ne 0) {
        Write-Failure "Tests failed. Use -SkipTests to bypass."
        exit 1
    }
    Write-Success "All tests passed"
} else {
    Write-Warning "Step 3/8: Skipping tests (as requested)"
}

# ============================================================================
# STEP 4: Check/Create Resource Group
# ============================================================================
Write-Info "Step 4/8: Checking resource group..."

$rgExists = az group exists --name $ResourceGroup
if ($rgExists -eq "false") {
    Write-Info "Creating resource group: $ResourceGroup in $Location..."
    az group create --name $ResourceGroup --location $Location --output none
    Write-Success "Resource group created"
} else {
    Write-Success "Resource group exists: $ResourceGroup"
}

# ============================================================================
# STEP 5: Check/Create App Service Plan
# ============================================================================
Write-Info "Step 5/8: Checking App Service Plan..."

$planName = "plan-$AppName"
$planExists = az appservice plan show --name $planName --resource-group $ResourceGroup 2>$null

if (-not $planExists) {
    Write-Info "Creating App Service Plan: $planName (Python Linux)..."
    
    # Choose SKU based on environment
    $sku = switch ($Environment) {
        'prod' { 'P1V2' }
        'staging' { 'B2' }
        default { 'B1' }
    }
    
    az appservice plan create `
        --name $planName `
        --resource-group $ResourceGroup `
        --sku $sku `
        --is-linux `
        --location $Location `
        --output none
    
    Write-Success "App Service Plan created with SKU: $sku"
} else {
    Write-Success "App Service Plan exists: $planName"
}

# ============================================================================
# STEP 6: Create/Update Web App
# ============================================================================
Write-Info "Step 6/8: Configuring Web App..."

$webAppExists = az webapp show --name $AppName --resource-group $ResourceGroup 2>$null

if (-not $webAppExists) {
    Write-Info "Creating Web App: $AppName (Python 3.11)..."
    
    az webapp create `
        --name $AppName `
        --resource-group $ResourceGroup `
        --plan $planName `
        --runtime "PYTHON:3.11" `
        --output none
    
    Write-Success "Web App created"
} else {
    Write-Success "Web App exists: $AppName"
}

# Configure Web App settings for Python FastAPI
Write-Info "Configuring Web App settings..."

az webapp config set `
    --name $AppName `
    --resource-group $ResourceGroup `
    --startup-file "python -m uvicorn src.main:app --host 0.0.0.0 --port 8000" `
    --output none

# Enable logging
az webapp log config `
    --name $AppName `
    --resource-group $ResourceGroup `
    --application-logging filesystem `
    --detailed-error-messages true `
    --failed-request-tracing true `
    --web-server-logging filesystem `
    --output none

Write-Success "Web App configured"

# ============================================================================
# STEP 7: Configure Environment Variables
# ============================================================================
Write-Info "Step 7/8: Configuring environment variables..."

# Load .env file if exists
$envFile = ".env.$Environment"
if (-not (Test-Path $envFile)) {
    $envFile = ".env"
}

if (Test-Path $envFile) {
    Write-Info "Loading environment variables from: $envFile"
    
    # Parse .env file
    $envVars = @()
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.+)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            $envVars += "$key=$value"
        }
    }
    
    if ($envVars.Count -gt 0) {
        # Set app settings
        az webapp config appsettings set `
            --name $AppName `
            --resource-group $ResourceGroup `
            --settings @envVars `
            --output none
        
        Write-Success "Environment variables configured ($($envVars.Count) settings)"
    }
} else {
    Write-Warning "No .env file found. Using default configuration."
}

# Set Python-specific settings
az webapp config appsettings set `
    --name $AppName `
    --resource-group $ResourceGroup `
    --settings `
        "SCM_DO_BUILD_DURING_DEPLOYMENT=true" `
        "ENVIRONMENT=$Environment" `
        "PYTHON_VERSION=3.11" `
    --output none

# ============================================================================
# STEP 8: Deploy Application
# ============================================================================
Write-Info "Step 8/8: Deploying application code..."

# Create deployment package (zip)
$deploymentZip = "aria-deployment-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"
Write-Info "Creating deployment package: $deploymentZip"

# Include necessary files
$filesToZip = @(
    "src",
    "scripts",
    "requirements.txt",
    "pytest.ini"
)

Compress-Archive -Path $filesToZip -DestinationPath $deploymentZip -Force
Write-Success "Deployment package created"

# Deploy using ZIP deployment
Write-Info "Uploading and deploying to Azure..."
az webapp deployment source config-zip `
    --name $AppName `
    --resource-group $ResourceGroup `
    --src $deploymentZip `
    --output none

Write-Success "Application deployed successfully"

# Cleanup deployment zip
Remove-Item $deploymentZip
Write-Info "Cleaned up deployment package"

# ============================================================================
# DEPLOYMENT COMPLETE
# ============================================================================
Write-Host ""
Write-Success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Success "  ARIA DEPLOYMENT COMPLETED SUCCESSFULLY!"
Write-Success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get app URL
$appUrl = "https://$AppName.azurewebsites.net"
Write-Host ""
Write-Info "Application URL: $appUrl"
Write-Info "Health Check: $appUrl/health"
Write-Info "API Docs: $appUrl/docs"
Write-Host ""

# Show logs command
Write-Info "To view live logs, run:"
Write-Host "  az webapp log tail --name $AppName --resource-group $ResourceGroup" -ForegroundColor Yellow
Write-Host ""

# Wait for app to be ready
Write-Info "Waiting for application to start (30 seconds)..."
Start-Sleep -Seconds 30

# Test health endpoint
try {
    $healthCheck = Invoke-RestMethod -Uri "$appUrl/health" -TimeoutSec 10
    Write-Success "Health check passed: $($healthCheck | ConvertTo-Json -Compress)"
} catch {
    Write-Warning "Health check failed. App may still be starting up."
    Write-Info "Check logs with: az webapp log tail --name $AppName --resource-group $ResourceGroup"
}

Write-Host ""
Write-Success "Deployment completed at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
