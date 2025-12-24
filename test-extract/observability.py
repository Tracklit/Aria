# observability.py
"""
Observability module for Aria API
Integrates with Azure Application Insights for logging, tracing, and metrics
"""

import logging
import json
import os
import time
from typing import Any, Dict, Optional
from datetime import datetime
from functools import wraps
from contextlib import contextmanager

try:
    from opencensus.ext.azure.log_exporter import AzureLogHandler
    from opencensus.ext.azure.trace_exporter import AzureExporter
    from opencensus.trace.samplers import ProbabilitySampler
    from opencensus.trace.tracer import Tracer
    from opencensus.ext.azure import metrics_exporter
    from opencensus.stats import aggregation as aggregation_module
    from opencensus.stats import measure as measure_module
    from opencensus.stats import stats as stats_module
    from opencensus.stats import view as view_module
    from opencensus.tags import tag_map as tag_map_module
    OPENCENSUS_AVAILABLE = True
except ImportError:
    OPENCENSUS_AVAILABLE = False
    logging.warning("OpenCensus not available. Install with: pip install opencensus-ext-azure")

# Environment configuration
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
APP_INSIGHTS_CONNECTION_STRING = os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING")
APP_INSIGHTS_INSTRUMENTATION_KEY = os.getenv("APPINSIGHTS_INSTRUMENTATIONKEY")

class StructuredLogger:
    """
    Structured logging with JSON format for better log analysis
    Automatically includes context like timestamp, environment, etc.
    """
    
    def __init__(self, name: str, level: int = logging.INFO):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(level)
        
        # Clear existing handlers
        self.logger.handlers = []
        
        # Console handler with JSON formatting
        console_handler = logging.StreamHandler()
        console_handler.setLevel(level)
        
        # Simple formatter for local dev, JSON for production
        if ENVIRONMENT == "development":
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
        else:
            formatter = logging.Formatter('%(message)s')
        
        console_handler.setFormatter(formatter)
        self.logger.addHandler(console_handler)
        
        # Add Azure handler if available
        if OPENCENSUS_AVAILABLE and (APP_INSIGHTS_CONNECTION_STRING or APP_INSIGHTS_INSTRUMENTATION_KEY):
            try:
                azure_handler = AzureLogHandler(
                    connection_string=APP_INSIGHTS_CONNECTION_STRING,
                    instrumentation_key=APP_INSIGHTS_INSTRUMENTATION_KEY
                )
                self.logger.addHandler(azure_handler)
            except Exception as e:
                logging.warning(f"Failed to initialize Azure logging: {e}")
    
    def _format_message(self, message: str, **kwargs) -> str:
        """Format message with additional context"""
        if ENVIRONMENT == "development":
            return message
        
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "environment": ENVIRONMENT,
            "message": message,
            "context": kwargs
        }
        return json.dumps(log_data)
    
    def info(self, message: str, **kwargs):
        """Log info message with context"""
        self.logger.info(
            self._format_message(message, **kwargs),
            extra={'custom_dimensions': kwargs} if kwargs else None
        )
    
    def error(self, message: str, error: Exception = None, **kwargs):
        """Log error message with context"""
        if error:
            kwargs["error_type"] = type(error).__name__
            kwargs["error_message"] = str(error)
        
        self.logger.error(
            self._format_message(message, **kwargs),
            extra={'custom_dimensions': kwargs} if kwargs else None,
            exc_info=error is not None
        )
    
    def warning(self, message: str, **kwargs):
        """Log warning message with context"""
        self.logger.warning(
            self._format_message(message, **kwargs),
            extra={'custom_dimensions': kwargs} if kwargs else None
        )
    
    def debug(self, message: str, **kwargs):
        """Log debug message with context"""
        self.logger.debug(
            self._format_message(message, **kwargs),
            extra={'custom_dimensions': kwargs} if kwargs else None
        )

class ObservabilityManager:
    """
    Centralized observability manager for Aria API
    Handles logging, distributed tracing, and custom metrics
    """
    
    def __init__(self):
        self.logger = StructuredLogger("Aria")
        self.tracer = None
        self.stats = None
        self.exporter = None
        
        if OPENCENSUS_AVAILABLE and (APP_INSIGHTS_CONNECTION_STRING or APP_INSIGHTS_INSTRUMENTATION_KEY):
            self._initialize_tracing()
            self._initialize_metrics()
        else:
            self.logger.warning(
                "Application Insights not configured or OpenCensus not available",
                connection_string_set=bool(APP_INSIGHTS_CONNECTION_STRING),
                instrumentation_key_set=bool(APP_INSIGHTS_INSTRUMENTATION_KEY),
                opencensus_available=OPENCENSUS_AVAILABLE
            )
    
    def _initialize_tracing(self):
        """Initialize distributed tracing"""
        try:
            exporter = AzureExporter(
                connection_string=APP_INSIGHTS_CONNECTION_STRING,
                instrumentation_key=APP_INSIGHTS_INSTRUMENTATION_KEY
            )
            
            # Sample 100% in dev, 50% in production to reduce costs
            sample_rate = 1.0 if ENVIRONMENT == "development" else 0.5
            sampler = ProbabilitySampler(rate=sample_rate)
            
            self.tracer = Tracer(exporter=exporter, sampler=sampler)
            self.logger.info("Distributed tracing initialized", sample_rate=sample_rate)
        except Exception as e:
            self.logger.error("Failed to initialize tracing", error=e)
    
    def _initialize_metrics(self):
        """Initialize custom metrics"""
        try:
            self.exporter = metrics_exporter.new_metrics_exporter(
                connection_string=APP_INSIGHTS_CONNECTION_STRING,
                instrumentation_key=APP_INSIGHTS_INSTRUMENTATION_KEY
            )
            
            self.stats = stats_module.stats
            view_manager = self.stats.view_manager
            stats_recorder = self.stats.stats_recorder
            
            # Register custom metrics
            self.api_latency_measure = measure_module.MeasureFloat(
                "Aria/api_latency", 
                "API request latency", 
                "ms"
            )
            
            self.api_requests_measure = measure_module.MeasureInt(
                "Aria/api_requests",
                "API request count",
                "1"
            )
            
            # Create views
            latency_view = view_module.View(
                "Aria/api_latency_view",
                "Distribution of API request latency",
                [],
                self.api_latency_measure,
                aggregation_module.DistributionAggregation([50, 100, 200, 400, 1000, 2000, 5000])
            )
            
            requests_view = view_module.View(
                "Aria/api_requests_view",
                "Count of API requests",
                [],
                self.api_requests_measure,
                aggregation_module.CountAggregation()
            )
            
            view_manager.register_view(latency_view)
            view_manager.register_view(requests_view)
            view_manager.register_exporter(self.exporter)
            
            self.logger.info("Custom metrics initialized")
        except Exception as e:
            self.logger.error("Failed to initialize metrics", error=e)
    
    def log_api_call(self, endpoint: str, user_id: str, duration_ms: float, 
                     status_code: int, success: bool, **kwargs):
        """
        Log API call with metrics
        
        Args:
            endpoint: API endpoint path
            user_id: User ID making the request
            duration_ms: Request duration in milliseconds
            status_code: HTTP status code
            success: Whether the request was successful
            **kwargs: Additional context
        """
        self.logger.info(
            f"API call: {endpoint}",
            endpoint=endpoint,
            user_id=user_id,
            duration_ms=round(duration_ms, 2),
            status_code=status_code,
            success=success,
            **kwargs
        )
        
        # Record metrics
        if self.stats:
            try:
                mmap = self.stats.stats_recorder.new_measurement_map()
                tmap = tag_map_module.TagMap()
                
                mmap.measure_float_put(self.api_latency_measure, duration_ms)
                mmap.measure_int_put(self.api_requests_measure, 1)
                
                mmap.record(tmap)
            except Exception as e:
                self.logger.debug(f"Failed to record metrics: {e}")
    
    def log_error(self, error: Exception, context: Dict[str, Any]):
        """
        Log errors with full context
        
        Args:
            error: Exception object
            context: Additional context about the error
        """
        self.logger.error(
            f"Error: {type(error).__name__}",
            error=error,
            **context
        )
    
    def track_metric(self, name: str, value: float, properties: Dict[str, Any] = None):
        """
        Track a custom metric
        
        Args:
            name: Metric name
            value: Metric value
            properties: Additional properties
        """
        self.logger.info(
            f"Metric: {name}",
            metric_name=name,
            metric_value=value,
            **(properties or {})
        )
    
    def track_event(self, name: str, properties: Dict[str, Any] = None):
        """
        Track a custom event
        
        Args:
            name: Event name
            properties: Event properties
        """
        self.logger.info(
            f"Event: {name}",
            event_name=name,
            **(properties or {})
        )
    
    @contextmanager
    def trace_operation(self, operation_name: str):
        """
        Context manager for tracing operations
        
        Usage:
            with observability.trace_operation("video_processing"):
                # Do work
                pass
        """
        if self.tracer:
            with self.tracer.span(name=operation_name) as span:
                yield span
        else:
            yield None

# Initialize global observability manager
observability = ObservabilityManager()
logger = observability.logger

def track_performance(operation_name: str = None):
    """
    Decorator to track function performance
    
    Usage:
        @track_performance("ai_consultation")
        async def ask_Aria(request):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            op_name = operation_name or func.__name__
            start_time = time.time()
            
            try:
                result = await func(*args, **kwargs)
                duration_ms = (time.time() - start_time) * 1000
                
                observability.track_metric(
                    f"{op_name}_duration",
                    duration_ms,
                    {"success": True}
                )
                
                return result
            except Exception as e:
                duration_ms = (time.time() - start_time) * 1000
                
                observability.track_metric(
                    f"{op_name}_duration",
                    duration_ms,
                    {"success": False, "error": type(e).__name__}
                )
                
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            op_name = operation_name or func.__name__
            start_time = time.time()
            
            try:
                result = func(*args, **kwargs)
                duration_ms = (time.time() - start_time) * 1000
                
                observability.track_metric(
                    f"{op_name}_duration",
                    duration_ms,
                    {"success": True}
                )
                
                return result
            except Exception as e:
                duration_ms = (time.time() - start_time) * 1000
                
                observability.track_metric(
                    f"{op_name}_duration",
                    duration_ms,
                    {"success": False, "error": type(e).__name__}
                )
                
                raise
        
        # Return appropriate wrapper based on function type
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator

# Middleware for FastAPI to log all requests
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import time

class ObservabilityMiddleware(BaseHTTPMiddleware):
    """
    Middleware to automatically log all API requests
    """
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Extract user info if available
        user_id = "anonymous"
        if hasattr(request.state, "user"):
            user_id = request.state.user.get("user_id", "anonymous")
        
        try:
            response = await call_next(request)
            duration_ms = (time.time() - start_time) * 1000
            
            observability.log_api_call(
                endpoint=request.url.path,
                user_id=user_id,
                duration_ms=duration_ms,
                status_code=response.status_code,
                success=response.status_code < 400,
                method=request.method,
                client_ip=request.client.host if request.client else "unknown"
            )
            
            # Add custom headers
            response.headers["X-Request-ID"] = str(id(request))
            response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"
            
            return response
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            
            observability.log_error(e, {
                "endpoint": request.url.path,
                "method": request.method,
                "user_id": user_id,
                "duration_ms": duration_ms
            })
            
            raise
