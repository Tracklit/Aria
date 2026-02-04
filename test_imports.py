#!/usr/bin/env python3
"""
Test script to verify all imports work - writes to file for Azure App Service logging
"""
import sys
import os

# Write to both stdout and a log file
log_file = "/home/LogFiles/test_output.txt"
os.makedirs("/home/LogFiles", exist_ok=True)

def log(message):
    print(message)
    sys.stdout.flush()
    with open(log_file, "a") as f:
        f.write(message + "\n")
        f.flush()

log("=== ARIA IMPORT TEST START ===")
log(f"Python version: {sys.version}")
log(f"Working directory: {os.getcwd()}")
log(f"Python path: {sys.path}")
log("=" * 50)

log("Testing basic imports...")
try:
    import redis
    log("✓ redis")
except Exception as e:
    log(f"✗ redis: {e}")

try:
    import psycopg2
    log("✓ psycopg2")
except Exception as e:
    log(f"✗ psycopg2: {e}")

try:
    import fastapi
    log("✓ fastapi")
except Exception as e:
    log(f"✗ fastapi: {e}")

try:
    import openai
    log("✓ openai")
except Exception as e:
    log(f"✗ openai: {e}")

try:
    import stripe
    log("✓ stripe")
except Exception as e:
    log(f"✗ stripe: {e}")

log("=" * 50)
log("Testing src module imports...")

try:
    from src import database
    log("✓ src.database")
except Exception as e:
    log(f"✗ src.database: {e}")
    import traceback
    log(traceback.format_exc())

try:
    from src import cache
    log("✓ src.cache")
except Exception as e:
    log(f"✗ src.cache: {e}")
    import traceback
    log(traceback.format_exc())

try:
    from src import main
    log("✓ src.main")
except Exception as e:
    log(f"✗ src.main: {e}")
    import traceback
    log(traceback.format_exc())

log("=" * 50)
log("All import tests complete")
log(f"Log file written to: {log_file}")
