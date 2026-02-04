# Simple deployment script for Aria to Azure App Service
# This creates a new resource group and deploys the Python app

param(
    [string]$ResourceGroup = "rg-aria-dev",
    [string]$Location = "westus2",
    [string]$AppName = "aria-api-$(Get-Random -Minimum 1000 -Maximum 9999)"
)

Write-Host "🚀 Deploying Aria API to Azure..." -ForegroundColor Cyan
Write-Host "Resource Group: $ResourceGroup" -ForegroundColor Yellow
Write-Host "Location: $Location" -ForegroundColor Yellow
Write-Host "App Name: $AppName" -ForegroundColor Yellow

# Create resource group
Write-Host "`n📦 Creating resource group..." -ForegroundColor Cyan
az group create --name $ResourceGroup --location $Location

# Create App Service Plan (Linux, Python runtime)
Write-Host "`n📋 Creating App Service Plan..." -ForegroundColor Cyan
az appservice plan create `
    --name "$AppName-plan" `
    --resource-group $ResourceGroup `
    --location $Location `
    --is-linux `
    --sku B1

# Create Web App
Write-Host "`n🌐 Creating Web App..." -ForegroundColor Cyan
az webapp create `
    --name $AppName `
    --resource-group $ResourceGroup `
    --plan "$AppName-plan" `
    --runtime "PYTHON:3.11"

# Configure deployment from local git
Write-Host "`n🔧 Configuring deployment..." -ForegroundColor Cyan
az webapp deployment source config-local-git `
    --name $AppName `
    --resource-group $ResourceGroup

# Set environment variables from .env file
Write-Host "`n⚙️  Setting environment variables..." -ForegroundColor Cyan

# Read .env file and set app settings
$envVars = @()
Get-Content .env | ForEach-Object {
    $line = $_.Trim()
    if ($line -and !$line.StartsWith("#") -and $line.Contains("=")) {
        $parts = $line.Split("=", 2)
        if ($parts.Length -eq 2) {
            $key = $parts[0].Trim()
            $value = $parts[1].Trim()
            $envVars += "$key=$value"
        }
    }
}

if ($envVars.Count -gt 0) {
    az webapp config appsettings set `
        --name $AppName `
        --resource-group $ResourceGroup `
        --settings $envVars
}

# Set startup command
Write-Host "`n🎯 Setting startup command..." -ForegroundColor Cyan
az webapp config set `
    --name $AppName `
    --resource-group $ResourceGroup `
    --startup-file "gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app"

# Deploy code using ZIP deploy
Write-Host "`n📤 Creating deployment package..." -ForegroundColor Cyan
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$zipFile = "deploy-$timestamp.zip"

# Create zip excluding unnecessary files
$excludePatterns = @(
    "*.pyc",
    "__pycache__",
    ".git",
    ".venv",
    "venv",
    "*.zip",
    "test-*",
    "ratelimit-check",
    "final-logs",
    "latest-logs"
)

Write-Host "Creating ZIP file..." -ForegroundColor Gray
Compress-Archive -Path * -DestinationPath $zipFile -Force -CompressionLevel Optimal

Write-Host "`n🚀 Deploying to Azure..." -ForegroundColor Cyan
az webapp deployment source config-zip `
    --name $AppName `
    --resource-group $ResourceGroup `
    --src $zipFile

# Clean up zip file
Remove-Item $zipFile

# Get URL
$appUrl = "https://$AppName.azurewebsites.net"

Write-Host "`n✅ Deployment complete!" -ForegroundColor Green
Write-Host "Application URL: $appUrl" -ForegroundColor Cyan
Write-Host "Health Check: $appUrl/health" -ForegroundColor Cyan
Write-Host "API Docs: $appUrl/docs" -ForegroundColor Cyan

Write-Host "`n📝 To view logs, run:" -ForegroundColor Yellow
Write-Host "az webapp log tail --name $AppName --resource-group $ResourceGroup" -ForegroundColor Gray

# Test the deployment
Write-Host "`n🧪 Testing deployment (waiting 30 seconds for app to start)..." -ForegroundColor Cyan
Start-Sleep -Seconds 30

try {
    $response = Invoke-WebRequest -Uri "$appUrl/health" -TimeoutSec 10
    Write-Host "✅ Health check passed! Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Health check failed. The app may still be starting up." -ForegroundColor Yellow
    Write-Host "Check logs with: az webapp log tail --name $AppName --resource-group $ResourceGroup" -ForegroundColor Gray
}
