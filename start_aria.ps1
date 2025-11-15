# Aria Quick Start Script for Windows PowerShell
# This script starts all required services for Aria

Write-Host ""
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 58) -ForegroundColor Cyan
Write-Host "  ARIA AI COMPANION - QUICK START" -ForegroundColor Cyan
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 58) -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "   Copy .env.example to .env and configure it" -ForegroundColor Yellow
    exit 1
}

# Check if Redis is running
Write-Host "🔍 Checking Redis..." -ForegroundColor Cyan
try {
    $redisCheck = docker ps --filter "name=aria-redis" --format "{{.Names}}"
    if ($redisCheck -ne "aria-redis") {
        Write-Host "   Starting Redis container..." -ForegroundColor Yellow
        docker run -d --name aria-redis -p 6379:6379 redis:7-alpine
        Start-Sleep -Seconds 2
        Write-Host "✅ Redis started" -ForegroundColor Green
    } else {
        Write-Host "✅ Redis already running" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Docker not available - make sure Redis is running manually" -ForegroundColor Yellow
}

# Run health check
Write-Host ""
Write-Host "🏥 Running health checks..." -ForegroundColor Cyan
python scripts/health_check.py
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Health check failed! Review errors above." -ForegroundColor Red
    Write-Host "   Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host ""
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 58) -ForegroundColor Cyan
Write-Host "  STARTING SERVICES" -ForegroundColor Cyan
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 58) -ForegroundColor Cyan
Write-Host ""

Write-Host "You need to start these services in separate terminals:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Terminal 1 - FastAPI Server:" -ForegroundColor Cyan
Write-Host "  cd 'c:\SprintGPT Code\v0.2'" -ForegroundColor White
Write-Host "  python src/main.py" -ForegroundColor White
Write-Host ""
Write-Host "Terminal 2 - Celery Worker:" -ForegroundColor Cyan
Write-Host "  cd 'c:\SprintGPT Code\v0.2'" -ForegroundColor White
Write-Host "  celery -A scripts.celery_tasks worker --pool=solo --loglevel=info" -ForegroundColor White
Write-Host ""
Write-Host "Terminal 3 - Celery Beat:" -ForegroundColor Cyan
Write-Host "  cd 'c:\SprintGPT Code\v0.2'" -ForegroundColor White
Write-Host "  celery -A scripts.celery_tasks beat --loglevel=info" -ForegroundColor White
Write-Host ""
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 58) -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 TIP: Install 'concurrently' to run all in one terminal:" -ForegroundColor Yellow
Write-Host "   npm install -g concurrently" -ForegroundColor White
Write-Host "   Then create a start script in package.json" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentation: docs/QUICK_SETUP_GUIDE.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
