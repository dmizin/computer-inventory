"""
Authentication system for Computer Inventory System API
Uses API key authentication with bcrypt hashing
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
import bcrypt
import logging

from .config import get_settings
from .database import get_db
from .models import ApiKey

logger = logging.getLogger(__name__)

# HTTP Bearer scheme for API key authentication
security = HTTPBearer(auto_error=False)


class AuthenticationError(Exception):
    """Custom authentication error"""
    pass


def hash_api_key(api_key: str) -> str:
    """
    Hash an API key using bcrypt

    Args:
        api_key: Plain text API key

    Returns:
        Bcrypt hashed key as string
    """
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(api_key.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_api_key(plain_key: str, hashed_key: str) -> bool:
    """
    Verify an API key against its hash

    Args:
        plain_key: Plain text API key from request
        hashed_key: Stored bcrypt hash

    Returns:
        True if key is valid, False otherwise
    """
    try:
        return bcrypt.checkpw(plain_key.encode('utf-8'), hashed_key.encode('utf-8'))
    except Exception as e:
        logger.error(f"Error verifying API key: {e}")
        return False


def authenticate_api_key(api_key: str, db: Session) -> Optional[ApiKey]:
    """
    Authenticate an API key against database stored keys

    Args:
        api_key: Plain text API key from request
        db: Database session

    Returns:
        ApiKey model if valid, None otherwise
    """
    # Get all active API keys from database
    db_keys = db.query(ApiKey).filter(ApiKey.active == True).all()

    for db_key in db_keys:
        if verify_api_key(api_key, db_key.key_hash):
            return db_key

    return None


def authenticate_with_config(api_key: str) -> bool:
    """
    Authenticate API key against configuration (for simple deployments)

    Args:
        api_key: Plain text API key from request

    Returns:
        True if key is valid, False otherwise
    """
    settings = get_settings()
    config_hashes = settings.get_api_key_hashes()

    if not config_hashes:
        # If no API keys configured, allow access (development mode)
        logger.warning("No API keys configured - allowing access")
        return True

    for hashed_key in config_hashes:
        if verify_api_key(api_key, hashed_key):
            return True

    return False


# FastAPI Dependencies

async def get_api_key(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> str:
    """
    Extract API key from Authorization header

    Expects: Authorization: Bearer <api_key>

    Returns:
        Plain text API key

    Raises:
        HTTPException: If no valid API key provided
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication scheme",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return credentials.credentials


async def verify_api_key_dependency(
    api_key: str = Depends(get_api_key),
    db: Session = Depends(get_db)
) -> Optional[ApiKey]:
    """
    Verify API key and return associated ApiKey model

    This dependency tries database authentication first,
    then falls back to configuration-based authentication

    Args:
        api_key: Plain text API key from request
        db: Database session

    Returns:
        ApiKey model if found in database, None if config-based auth

    Raises:
        HTTPException: If API key is invalid
    """
    # Try database authentication first
    db_key = authenticate_api_key(api_key, db)
    if db_key:
        logger.info(f"API key authenticated from database: {db_key.name}")
        return db_key

    # Fall back to configuration-based authentication
    if authenticate_with_config(api_key):
        logger.info("API key authenticated from configuration")
        return None  # No database record, but auth successful

    # Authentication failed
    logger.warning(f"Invalid API key attempt: {api_key[:10]}...")
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid API key",
        headers={"WWW-Authenticate": "Bearer"},
    )


# Optional dependency - allows endpoints to work with or without authentication
async def optional_api_key(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[ApiKey]:
    """
    Optional API key verification - allows unauthenticated access

    This is useful for read-only endpoints that can optionally be secured

    Returns:
        ApiKey model if valid key provided, None if no key or invalid key
    """
    if not credentials or credentials.scheme.lower() != "bearer":
        return None

    try:
        # Try database authentication
        db_key = authenticate_api_key(credentials.credentials, db)
        if db_key:
            return db_key

        # Try configuration-based authentication
        if authenticate_with_config(credentials.credentials):
            return None  # Authenticated but no database record
    except Exception as e:
        logger.error(f"Error in optional API key verification: {e}")

    return None


# Utility functions for API key management

def create_api_key(name: str, db: Session) -> tuple[str, ApiKey]:
    """
    Create a new API key in the database

    Args:
        name: Human-readable name for the API key
        db: Database session

    Returns:
        Tuple of (plain_key, api_key_model)
    """
    import secrets

    # Generate random API key
    plain_key = secrets.token_urlsafe(32)

    # Hash the key
    hashed_key = hash_api_key(plain_key)

    # Create database record
    db_key = ApiKey(
        name=name,
        key_hash=hashed_key,
        active=True
    )

    db.add(db_key)
    db.commit()
    db.refresh(db_key)

    logger.info(f"Created new API key: {name} (ID: {db_key.id})")

    return plain_key, db_key


def deactivate_api_key(api_key_id: str, db: Session) -> bool:
    """
    Deactivate an API key

    Args:
        api_key_id: UUID of the API key to deactivate
        db: Database session

    Returns:
        True if key was deactivated, False if not found
    """
    db_key = db.query(ApiKey).filter(ApiKey.id == api_key_id).first()
    if not db_key:
        return False

    db_key.active = False
    db.commit()

    logger.info(f"Deactivated API key: {db_key.name} (ID: {api_key_id})")
    return True
