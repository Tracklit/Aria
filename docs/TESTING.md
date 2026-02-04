# Aria Test Suite

Comprehensive test coverage for Aria API, including unit tests, integration tests, and end-to-end tests.

## Test Files

### Core Tests

1. **test_database.py** (NEW)
   - Tests all database CRUD operations
   - Connection pooling tests
   - Cascade delete verification
   - Edge cases and error handling
   - Coverage: athlete profiles, subscriptions, usage tracking, knowledge library, coach-athlete relationships

2. **test_auth_middleware.py** (NEW)
   - JWT token verification
   - API key validation
   - Role-based access control (RBAC)
   - Token blacklisting
   - Multi-method authentication (JWT + API key + session)
   - Authorization edge cases

3. **test_observability.py** (NEW)
   - Structured logging tests
   - Application Insights integration
   - Metrics recording (custom business metrics)
   - Distributed tracing
   - Performance monitoring
   - Exception tracking

4. **test_Aria_api.py** (UPDATED)
   - All existing API endpoint tests
   - NEW: Tests for all 16 migrated PostgreSQL endpoints
   - NEW: Subscription management tests
   - NEW: User CRUD tests
   - NEW: Knowledge library tests
   - NEW: Coach-athlete relationship tests
   - NEW: Mood report tests

5. **test_integration.py** (NEW)
   - End-to-end workflow tests
   - User lifecycle (creation → subscription → usage → deletion)
   - Complete consultation workflows
   - Concurrent operations and race conditions
   - Data consistency across operations
   - Cache invalidation consistency
   - Performance under load

### Existing Tests

6. **test_components.py**
   - Component-level tests
   - Individual module testing

7. **test_rate_limiting.py**
   - Rate limiting functionality
   - Quota enforcement
   - Tier-based limits

8. **test_wearable_integration.py**
   - Wearable device integration
   - Data synchronization

## Running Tests

### Run All Tests with Coverage

```bash
python run_tests.py
```

This will:
- Run all test files
- Generate coverage reports (terminal + HTML + JSON)
- Show the 10 slowest tests
- Create `htmlcov/index.html` for detailed coverage visualization

### Run Specific Test Suite

```bash
# Database tests only
python run_tests.py database

# Authentication tests only
python run_tests.py auth

# Observability tests only
python run_tests.py observability

# API tests only
python run_tests.py api

# Integration tests only
python run_tests.py integration
```

### Run with Pytest Directly

```bash
# All tests
pytest

# Specific file
pytest test_database.py

# Specific test class
pytest test_database.py::TestAthleteProfileCRUD

# Specific test function
pytest test_database.py::TestAthleteProfileCRUD::test_create_athlete_profile

# With coverage
pytest --cov=. --cov-report=html

# Verbose output
pytest -v

# Show print statements
pytest -s

# Stop on first failure
pytest -x

# Run tests matching pattern
pytest -k "subscription"
```

## Test Markers

Tests are organized with pytest markers for selective execution:

```bash
# Run only database tests
pytest -m database

# Run only authentication tests
pytest -m auth

# Run only integration tests
pytest -m integration

# Run only slow tests
pytest -m slow

# Exclude slow tests
pytest -m "not slow"
```

## Coverage Goals

**Target: 80%+ code coverage**

Current coverage by module:
- `database.py`: All CRUD functions tested
- `auth_middleware.py`: JWT, API keys, RBAC tested
- `observability.py`: Logging, metrics, tracing tested
- `main.py`: All 16 migrated endpoints tested
- `cache.py`: Caching functionality tested
- `rate_limit.py`: Rate limiting tested

## Test Structure

### Unit Tests
- `test_database.py`: Database operations (isolated)
- `test_auth_middleware.py`: Authentication logic (mocked)
- `test_observability.py`: Logging and monitoring (mocked)

### Integration Tests
- `test_integration.py`: End-to-end workflows with real dependencies
- `test_Aria_api.py`: API endpoints with TestClient

### Component Tests
- `test_components.py`: Individual component testing
- `test_rate_limiting.py`: Rate limiting components
- `test_wearable_integration.py`: Wearable integration components

## Test Data Management

### Fixtures
Tests use pytest fixtures for:
- Test user profiles (automatically cleaned up)
- Test knowledge items (automatically deleted)
- Mock authentication tokens
- Database connections

### Cleanup
All tests include proper cleanup in teardown:
- User profiles deleted after tests
- Knowledge items removed
- Cache entries cleared
- Database connections returned to pool

## Continuous Integration

### Pre-commit Checks
```bash
# Run tests before committing
python run_tests.py

# Quick smoke test
pytest test_Aria_api.py::TestBasicFunctionality
```

### CI/CD Pipeline
Recommended GitHub Actions workflow:
```yaml
- name: Run tests
  run: |
    pip install -r requirements.txt
    pytest --cov=. --cov-report=xml
    
- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Troubleshooting

### Test Failures

1. **Database connection errors**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL in .env
   - Verify database exists and tables are created

2. **Redis connection errors**
   - Ensure Redis is running
   - Check REDIS_HOST and REDIS_PORT in .env

3. **Import errors**
   - Run `pip install -r requirements.txt`
   - Ensure pytest and pytest-cov are installed

4. **Async test errors**
   - pytest-asyncio is required for async tests
   - Check that `@pytest.mark.asyncio` is used

### Debug Mode

Run tests with more verbose output:
```bash
# Very verbose
pytest -vv

# Show print statements and logging
pytest -s --log-cli-level=DEBUG

# Show full tracebacks
pytest --tb=long
```

## Test Coverage Report

After running tests, view coverage:

```bash
# Open HTML report
start htmlcov/index.html  # Windows
open htmlcov/index.html   # Mac
xdg-open htmlcov/index.html  # Linux

# View in terminal
pytest --cov=. --cov-report=term-missing
```

## Writing New Tests

### Template for New Test File

```python
"""
Tests for [module_name]
"""
import pytest
from [module] import [functions_to_test]


@pytest.fixture
def test_data():
    """Fixture providing test data"""
    return {"key": "value"}


class TestFeatureName:
    """Test [feature] functionality"""
    
    def test_basic_functionality(self, test_data):
        """Test that [feature] works correctly"""
        result = some_function(test_data)
        assert result is not None
    
    def test_edge_case(self):
        """Test [edge case]"""
        # Test implementation
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
```

### Best Practices

1. **Use descriptive test names**: `test_create_user_with_valid_data`
2. **Test one thing per test**: Don't combine multiple assertions
3. **Use fixtures for setup**: Avoid code duplication
4. **Clean up after tests**: Use teardown or context managers
5. **Mock external dependencies**: Use `@patch` for APIs, external services
6. **Test happy path AND edge cases**: Success + failures
7. **Add docstrings**: Explain what each test validates

## Test Statistics

Run tests with statistics:
```bash
# Show test durations
pytest --durations=10

# Show coverage statistics
pytest --cov=. --cov-report=term

# Show detailed coverage per file
pytest --cov=. --cov-report=term-missing
```

## Performance Testing

For load testing, use:
```bash
# Run only integration tests (includes performance tests)
pytest test_integration.py::TestPerformanceUnderLoad -v
```

## Questions?

- Check pytest documentation: https://docs.pytest.org/
- Review existing test files for examples
- Run `pytest --help` for all options
