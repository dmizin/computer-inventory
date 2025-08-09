"""
Health check endpoints for Computer Inventory System API
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime

from ..config import get_settings
from ..database import get_db, check_db_connection
from ..schemas import HealthCheckResponse

router = APIRouter()


@router.get("/health", response_model=HealthCheckResponse, tags=["Health"])
async def health_check(db: Session = Depends(get_db)) -> HealthCheckResponse:
    """
    Health check endpoint

    Returns service status, version, and database connectivity
    """
    settings = get_settings()

    # Check database connection
    db_status = "connected" if check_db_connection() else "disconnected"

    # Determine overall status
    overall_status = "healthy" if db_status == "connected" else "unhealthy"

    return HealthCheckResponse(
        status=overall_status,
        timestamp=datetime.utcnow(),
        version=settings.app_version,
        database=db_status
    )


@router.get("/health/database", tags=["Health"])
async def database_health(db: Session = Depends(get_db)):
    """
    Detailed database health check

    Returns detailed database connection information
    """
    try:
        # Test database query (SQLAlchemy 2.0 compatible)
        result = db.execute(text("SELECT 1 as test"))
        test_value = result.scalar()

        # Test table existence (SQLAlchemy 2.0 compatible)
        tables_query = text("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('assets', 'management_controllers', 'api_keys', 'audit_logs')
            ORDER BY table_name
        """)
        tables_result = db.execute(tables_query)
        tables = [row[0] for row in tables_result.fetchall()]

        return {
            "status": "healthy",
            "test_query": test_value,
            "tables_found": tables,
            "tables_expected": ["api_keys", "assets", "audit_logs", "management_controllers"],
            "timestamp": datetime.utcnow()
        }

    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow()
        }


@router.get("/version", tags=["Health"])
async def get_version():
    """
    Get application version information
    """
    settings = get_settings()

    return {
        "app_name": settings.app_name,
        "version": settings.app_version,
        "debug": settings.debug,
        "timestamp": datetime.utcnow()
    }
