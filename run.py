#!/usr/bin/env python3
"""
Entry point script for Aria FastAPI application.
This script ensures the correct PYTHONPATH is set before loading the application.
"""

import sys
import os

# Add the current directory to Python path to allow 'src' module imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Now we can import and run uvicorn
import uvicorn

if __name__ == "__main__":
    # Run the FastAPI application
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
