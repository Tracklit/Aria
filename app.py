"""
Aria FastAPI Application Entry Point
This module serves as the main entry point for Azure App Service deployment.
It ensures the correct module path is set before importing the actual application.
"""

import sys
import os

# Add current directory to Python path to enable src imports
# This is required for Azure App Service where the app runs from a temp directory
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Debug logging
print(f"[APP.PY] Current directory: {current_dir}", flush=True)
print(f"[APP.PY] Files in current dir: {os.listdir(current_dir)[:20]}", flush=True)
print(f"[APP.PY] sys.path: {sys.path[:5]}", flush=True)
print(f"[APP.PY] src directory exists: {os.path.exists(os.path.join(current_dir, 'src'))}", flush=True)

# Now import the actual FastAPI application from src.main
from src.main import app

# This module exposes the 'app' variable that uvicorn/gunicorn can load
__all__ = ['app']
