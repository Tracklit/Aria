# 📁 Aria Project Structure

## Directory Layout

```
Aria/
├── src/                          # Source code (Python modules)
│   ├── __init__.py
│   ├── main.py                   # FastAPI application
│   ├── database.py               # PostgreSQL connection pool & CRUD
│   ├── cache.py                  # Redis cache management
│   ├── rate_limit.py             # Rate limiting with Redis
│   ├── auth_middleware.py        # JWT & API key authentication
│   ├── observability.py          # Logging, metrics, tracing
│   ├── wearable_integration.py   # Terra API wearable integration
│   └── tracklit_integration.py   # TrackLit platform integration
│
├── tests/                        # Test suite
│   ├── __init__.py
│   ├── conftest.py               # Pytest configuration
│   ├── test_database.py          # Database CRUD tests
│   ├── test_auth_middleware.py   # Authentication tests
│   ├── test_observability.py     # Logging & monitoring tests
│   ├── test_Aria_api.py     # API endpoint tests
│   ├── test_integration.py       # End-to-end integration tests
│   ├── test_tracklit_integration.py # TrackLit integration tests
│   ├── test_components.py        # Component verification
│   ├── test_rate_limiting.py     # Rate limiting tests
│   └── test_wearable_integration.py # Wearable integration tests
│
├── docs/                         # Documentation
│   ├── README.md                 # Main project documentation
│   ├── IMPLEMENTATION_SUMMARY.md # Implementation status
│   ├── PRODUCTION_READINESS_REPORT.md # Production deployment guide
│   ├── TESTING.md                # Testing documentation
│   ├── QUICK_START_DEPLOYMENT.md # Quick deployment guide
│   └── migration/                # Migration documentation
│       ├── MIGRATION_COMPLETE.md
│       ├── MIGRATION_EXECUTION_SUMMARY.md
│       └── SUPABASE_MIGRATION_GUIDE.md
│
├── scripts/                      # Utility scripts
│   ├── run_tests.py              # Test runner with coverage
│   └── verify_migration.py       # Migration verification
│
├── infrastructure/               # IaC & deployment configs
│   └── (Azure Bicep, Terraform, etc.)
│
├── .github/                      # GitHub workflows
│   └── workflows/
│
├── .env                          # Environment variables (NOT in git)
├── .env.example                  # Environment template
├── .gitignore                    # Git ignore rules
├── pytest.ini                    # Pytest configuration
├── requirements.txt              # Python dependencies
├── requirements_no_compile.txt   # No-compile dependencies
├── Dockerfile                    # Container definition
├── docker-compose.yml            # Multi-container setup
└── PROJECT_STRUCTURE.md          # This file
```

---

## 📂 Directory Descriptions

### `src/` - Source Code
Contains all application source code. Import from this directory in tests and scripts.

**Key Files:**
- **main.py**: FastAPI application with all API endpoints
- **database.py**: PostgreSQL connection pooling and CRUD operations
- **cache.py**: Redis caching for performance optimization
- **rate_limit.py**: Redis-based rate limiting by subscription tier
- **auth_middleware.py**: JWT verification, API key auth, RBAC
- **observability.py**: Structured logging, Application Insights integration
- **wearable_integration.py**: Terra API for Garmin, Fitbit, Apple Health
- **tracklit_integration.py**: Cross-service communication with TrackLit

### `tests/` - Test Suite
Comprehensive test suite with 80%+ coverage target.

**Test Categories:**
- **Unit Tests**: Individual function/class testing
- **Integration Tests**: End-to-end workflows
- **API Tests**: Endpoint validation
- **Component Tests**: Module verification

**Run Tests:**
```bash
# All tests
python scripts/run_tests.py

# Specific suite
python scripts/run_tests.py database
python scripts/run_tests.py auth
python scripts/run_tests.py integration
```

### `docs/` - Documentation
All project documentation organized by topic.

**Main Documents:**
- **README.md**: Project overview, setup instructions
- **IMPLEMENTATION_SUMMARY.md**: Development status, task tracking
- **PRODUCTION_READINESS_REPORT.md**: Deployment checklist
- **TESTING.md**: Testing strategy and guidelines

**Migration Docs** (`docs/migration/`):
- Complete Supabase to PostgreSQL migration documentation
- Execution summaries and verification steps

### `scripts/` - Utility Scripts
Helper scripts for development and deployment.

- **run_tests.py**: Execute test suite with coverage
- **verify_migration.py**: Verify Supabase migration completion

### `infrastructure/` - Infrastructure as Code
Deployment configurations for Azure and other cloud providers.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Run Tests
```bash
python scripts/run_tests.py
```

### 4. Start Application
```bash
# Development
uvicorn src.main:app --reload

# Production
uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## 📦 Import Guidelines

### In Application Code
```python
# Internal imports use relative paths
from database import get_athlete_profile
from cache import cache
from observability import logger
```

### In Tests
```python
# Tests import from src package (handled by conftest.py)
from database import get_athlete_profile
from cache import cache
```

### In Scripts
```python
# Scripts add src to path
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from database import db_pool
```

---

## 🧹 Maintenance

### Clean Build Artifacts
```bash
# Python cache
rm -rf __pycache__ src/__pycache__ tests/__pycache__

# Test artifacts
rm -rf .pytest_cache htmlcov .coverage coverage.json

# Logs
rm -rf logs/*.log
```

### Update Dependencies
```bash
pip install --upgrade -r requirements.txt
pip freeze > requirements.txt
```

---

## 📊 Code Organization Principles

1. **Separation of Concerns**: Each module has a single responsibility
2. **Dependency Injection**: Configuration via environment variables
3. **Testability**: All modules designed for easy testing
4. **Documentation**: Comprehensive docstrings and type hints
5. **Error Handling**: Centralized error handling and logging
6. **Performance**: Caching, connection pooling, async operations

---

## 🔄 CI/CD Integration

This structure is designed for:
- **GitHub Actions**: Automated testing on push
- **Azure DevOps**: Pipeline-based deployment
- **Docker**: Containerized deployment
- **Kubernetes**: Scalable orchestration

---

## 📈 Next Steps

1. Review `docs/IMPLEMENTATION_SUMMARY.md` for development status
2. Check `docs/PRODUCTION_READINESS_REPORT.md` before deploying
3. Run `scripts/verify_migration.py` to verify configuration
4. Execute `scripts/run_tests.py` to validate code quality

---

**Last Updated**: November 15, 2025  
**Version**: 0.2.0  
**Status**: Production Ready (after database credentials configured)
