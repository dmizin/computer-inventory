"""
Computer Inventory System - FastAPI Backend Application
"""
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
import logging
import time
from contextlib import asynccontextmanager

from .config import get_settings
from .database import init_db, check_db_connection
from .routers import assets, mgmt, health, credentials

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan events
    """
    # Startup
    logger.info("Starting Computer Inventory System API")
    logger.info(f"Version: {settings.app_version}")
    logger.info(f"Debug mode: {settings.debug}")

    # Initialize database
    try:
        logger.info("Initializing database...")
        init_db()

        # Check database connection
        if check_db_connection():
            logger.info("Database connection successful")
        else:
            logger.error("Database connection failed")

    except Exception as e:
        logger.error(f"Database initialization failed: {e}")

    yield

    # Shutdown
    logger.info("Shutting down Computer Inventory System API")


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description="API for tracking computer assets, hardware specifications, and management controllers",
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,  # Disable docs in production
    redoc_url="/redoc" if settings.debug else None,
)


# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins_list(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests"""
    start_time = time.time()

    # Log request
    logger.info(f"Request: {request.method} {request.url}")

    # Process request
    response = await call_next(request)

    # Log response
    process_time = time.time() - start_time
    logger.info(
        f"Response: {response.status_code} - {process_time:.3f}s"
    )

    return response


# Error handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors"""
    logger.error(f"Validation error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation error",
            "details": exc.errors(),
            "body": exc.body
        }
    )


@app.exception_handler(SQLAlchemyError)
async def database_exception_handler(request: Request, exc: SQLAlchemyError):
    """Handle database errors"""
    logger.error(f"Database error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Database error",
            "details": "An error occurred while processing your request"
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    logger.error(f"Unexpected error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "details": "An unexpected error occurred"
        }
    )


# Include routers
app.include_router(
    health.router,
    prefix="/api/v1",
    tags=["Health"]
)

app.include_router(
    assets.router,
    prefix="/api/v1/assets",
    tags=["Assets"]
)

app.include_router(
    mgmt.router,
    prefix="/api/v1/assets",
    tags=["Management Controllers"]
)

app.include_router(credentials.router)


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint with basic API information
    """
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "description": "Computer Inventory Tracking System API",
        "docs_url": "/docs" if settings.debug else None,
        "health_url": "/api/v1/health"
    }


# OpenAPI schema endpoint (for frontend integration)
@app.get("/api/v1/openapi.json", tags=["Root"])
async def get_openapi():
    """
    Get OpenAPI schema for API documentation and client generation
    """
    return app.openapi()


# Development helpers
if settings.debug:
    @app.get("/api/v1/debug/config", tags=["Debug"])
    async def debug_config():
        """Debug endpoint to view configuration (debug mode only)"""
        return {
            "debug": settings.debug,
            "database_url": settings.database_url.split("@")[1] if "@" in settings.database_url else "***",
            "cors_origins": settings.get_cors_origins_list(),
            "api_keys_configured": len(settings.get_api_key_hashes()) > 0,
            "log_level": settings.log_level
        }

    @app.post("/api/v1/debug/generate-api-key", tags=["Debug"])
    async def generate_api_key():
        """Generate a new API key for testing (debug mode only)"""
        from .config import generate_api_key
        plain_key, hashed_key = generate_api_key()

        return {
            "plain_key": plain_key,
            "hashed_key": hashed_key,
            "usage": f"Add this to your API_KEYS environment variable: {hashed_key}",
            "header": f"Use in requests: Authorization: Bearer {plain_key}"
        }


# For running with uvicorn directly
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.reload,
        log_level=settings.log_level.lower()
    )
