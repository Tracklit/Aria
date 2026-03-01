#!/usr/bin/env python3
"""
Test runner script for Aria
Runs all tests with coverage reporting
"""
import subprocess
import sys
import os

# Change to project root directory
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(project_root)


def run_tests():
    """Run all tests with coverage"""
    print("=" * 70)
    print("Running Aria Test Suite")
    print("=" * 70)
    
    # Run pytest with coverage
    result = subprocess.run([
        sys.executable, "-m", "pytest",
        "tests/",
        "-v",
        "--tb=short",
        "--cov=src",
        "--cov-report=term-missing",
        "--cov-report=html",
        "--cov-report=json",
        "--durations=10"  # Show 10 slowest tests
    ])
    
    if result.returncode == 0:
        print("\n" + "=" * 70)
        print("✅ All tests passed!")
        print("=" * 70)
        print("\n📊 Coverage report generated in htmlcov/index.html")
    else:
        print("\n" + "=" * 70)
        print("❌ Some tests failed")
        print("=" * 70)
        sys.exit(1)


def run_specific_test_suite(suite):
    """Run a specific test suite"""
    test_files = {
        "database": "tests/test_database.py",
        "auth": "tests/test_auth_middleware.py",
        "observability": "tests/test_observability.py",
        "api": "tests/test_Aria_api.py",
        "integration": "tests/test_integration.py",
        "tracklit": "tests/test_tracklit_integration.py",
        "components": "tests/test_components.py",
        "rate_limiting": "tests/test_rate_limiting.py",
        "wearable": "tests/test_wearable_integration.py"
    }
    
    if suite not in test_files:
        print(f"Unknown test suite: {suite}")
        print(f"Available suites: {', '.join(test_files.keys())}")
        sys.exit(1)
    
    print(f"\n Running {suite} tests only...\n")
    
    result = subprocess.run([
        sys.executable, "-m", "pytest",
        test_files[suite],
        "-v",
        "--tb=short"
    ])
    
    sys.exit(result.returncode)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Run specific test suite
        run_specific_test_suite(sys.argv[1])
    else:
        # Run all tests
        run_tests()
