#!/bin/bash
# Azure App Service startup script for Aria FastAPI application

# Get the directory where this script is located (should be the app root)
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Add the app directory to PYTHONPATH so Python can find the 'src' module
export PYTHONPATH="${APP_DIR}:${PYTHONPATH}"

echo "=== Aria Application Startup ==="
echo "App directory: ${APP_DIR}"
echo "PYTHONPATH: ${PYTHONPATH}"
echo "Python version: $(python --version)"
echo "Directory contents:"
ls -la "${APP_DIR}" | head -20
echo "================================"

# Start uvicorn
exec uvicorn src.main:app --host 0.0.0.0 --port 8000
