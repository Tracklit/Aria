"""
Aria API - Core Application Package
AI-powered running coach API integrated with TrackLit platform
"""

import sys
import os

# Add parent directory to Python path to allow 'src' module imports
# This is necessary for Azure App Service deployments where the app
# runs from a temp directory and PYTHONPATH may not be set correctly
_parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _parent_dir not in sys.path:
    sys.path.insert(0, _parent_dir)

__version__ = "0.2.0"
__author__ = "Aria Team"
