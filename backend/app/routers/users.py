"""
Users API endpoints for Computer Inventory System
Manages system users/owners for asset assignment
FIXED: UUID and datetime serialization in audit logging
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Any
from uuid import UUID
import logging

from ..database import get_db
from ..auth import verify_api_key_dependency, optional_api_key
from ..models import ApiKey
from .. import schemas, crud

logger = logging.getLogger(__name__)
router = APIRouter()


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _make_json_safe(obj: Any) -> Any:
    """
    Convert UUID objects and other non-JSON-serializable types to strings
    for safe storage in PostgreSQL JSONB columns
    """
    if isinstance(obj, dict):
        return {key: _make_json_safe(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [_make_json_safe(item) for item in obj]
    elif isinstance(obj, UUID):
        return str(obj)
    elif hasattr(obj, 'hex'):  # UUID-like object
        return str(obj)
    elif hasattr(obj, 'isoformat'):  # datetime-like object
        return obj.isoformat()
    else:
        return obj


@router.get("", response_model=List[schemas.UserResponse], tags=["Users"])
async def list_users(
    *,
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Number of records to return"),
    search: Optional[str] = Query(None, description="Search in username, full name, email, or department"),
    active_only: bool = Query(True, description="Return only active users"),
    api_key: Optional[ApiKey] = Depends(optional_api_key)
) -> List[schemas.UserResponse]:
    """
    List all users with optional search and filtering

    - **search**: Search across username, full name, email, and department
    - **active_only**: Filter to show only active users (default: true)
    - **skip**: Number of records to skip for pagination
    - **limit**: Maximum number of records to return (1-500)
    """
    try:
        users = crud.user_crud.get_multi(
            db,
            skip=skip,
            limit=limit,
            search=search,
            active_only=active_only
        )

        logger.info(f"Listed {len(users)} users (skip={skip}, limit={limit}, search='{search}')")
        return users

    except Exception as e:
        logger.error(f"Error listing users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list users"
        )


@router.get("/{user_id}", response_model=schemas.UserResponse, tags=["Users"])
async def get_user(
    user_id: UUID,
    *,
    db: Session = Depends(get_db),
    api_key: Optional[ApiKey] = Depends(optional_api_key)
) -> schemas.UserResponse:
    """
    Get a specific user by ID

    Returns detailed information about a single user including their
    contact information and status.
    """
    user = crud.user_crud.get(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return user


@router.post("", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED, tags=["Users"])
async def create_user(
    *,
    db: Session = Depends(get_db),
    user_in: schemas.UserCreate,
    api_key: Optional[ApiKey] = Depends(verify_api_key_dependency)
) -> schemas.UserResponse:
    """
    Create a new user

    Creates a new user account for asset ownership and contact management.
    Username and email must be unique across the system.
    """
    try:
        # Check if username already exists
        existing_user = crud.user_crud.get_by_username(db, user_in.username)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )

        # Check if email already exists (if provided)
        if user_in.email:
            existing_email = crud.user_crud.get_by_email(db, user_in.email)
            if existing_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email address already exists"
                )

        # Create user
        user = crud.user_crud.create(db, obj_in=user_in)

        # Log the creation with JSON-safe data
        api_key_id = api_key.id if api_key else None
        audit_changes = _make_json_safe(user_in.model_dump())

        crud.log_user_change(
            db=db,
            action="CREATE",
            user=user,
            changes=audit_changes,
            api_key_id=api_key_id
        )

        logger.info(f"User created: {user.username} ({user.full_name})")
        return user

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )


@router.patch("/{user_id}", response_model=schemas.UserResponse, tags=["Users"])
async def update_user(
    user_id: UUID,
    *,
    db: Session = Depends(get_db),
    user_in: schemas.UserUpdate,
    api_key: Optional[ApiKey] = Depends(verify_api_key_dependency)
) -> schemas.UserResponse:
    """
    Update an existing user

    Updates user information. Only provided fields will be updated.
    Username and email uniqueness will be validated if changed.
    """
    # Get existing user
    user = crud.user_crud.get(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    try:
        # Store old values for audit log
        old_values = {
            field: getattr(user, field)
            for field in user_in.model_dump(exclude_unset=True).keys()
        }

        # Check for username conflicts
        if user_in.username and user_in.username != user.username:
            existing_user = crud.user_crud.get_by_username(db, user_in.username)
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already exists"
                )

        # Check for email conflicts
        if user_in.email and user_in.email != user.email:
            existing_email = crud.user_crud.get_by_email(db, user_in.email)
            if existing_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email address already exists"
                )

        # Update user
        updated_user = crud.user_crud.update(db, db_obj=user, obj_in=user_in)

        # Log the change with JSON-safe data
        audit_changes = {
            "old": _make_json_safe(old_values),
            "new": _make_json_safe(user_in.model_dump(exclude_unset=True))
        }
        api_key_id = api_key.id if api_key else None
        crud.log_user_change(
            db=db,
            action="UPDATE",
            user=updated_user,
            changes=audit_changes,
            api_key_id=api_key_id
        )

        logger.info(f"User updated: {updated_user.username}")
        return updated_user

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user: {str(e)}"
        )


@router.delete("/{user_id}", response_model=schemas.UserResponse, tags=["Users"])
async def deactivate_user(
    user_id: UUID,
    *,
    db: Session = Depends(get_db),
    api_key: Optional[ApiKey] = Depends(verify_api_key_dependency)
) -> schemas.UserResponse:
    """
    Deactivate a user (soft delete)

    Sets the user's active status to False. This preserves their information
    and maintains referential integrity with assets they own, but prevents
    them from being assigned to new assets.
    """
    user = crud.user_crud.get(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    try:
        # Deactivate user
        deactivated_user = crud.user_crud.delete(db, user_id=user_id)

        # Log the change with JSON-safe data
        api_key_id = api_key.id if api_key else None
        audit_changes = _make_json_safe({"active": False})

        crud.log_user_change(
            db=db,
            action="DELETE",
            user=deactivated_user,
            changes=audit_changes,
            api_key_id=api_key_id
        )

        logger.info(f"User deactivated: {deactivated_user.username}")
        return deactivated_user

    except Exception as e:
        logger.error(f"Error deactivating user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to deactivate user: {str(e)}"
        )


@router.get("/{user_id}/assets", response_model=List[schemas.AssetResponse], tags=["Users"])
async def get_user_assets(
    user_id: UUID,
    *,
    db: Session = Depends(get_db),
    api_key: Optional[ApiKey] = Depends(optional_api_key)
) -> List[schemas.AssetResponse]:
    """
    Get all assets owned by a specific user

    Returns a list of all assets where this user is designated as the
    primary owner. Useful for understanding workload distribution and
    asset ownership.
    """
    # Verify user exists
    user = crud.user_crud.get(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    try:
        assets = crud.asset_crud.get_by_owner(db, owner_id=user_id)

        # Add computed fields for response
        asset_responses = []
        for asset in assets:
            response = schemas.AssetResponse.model_validate(asset)
            response.has_onepassword_secret = bool(asset.onepassword_secret_id)
            response.application_count = len(asset.applications) if hasattr(asset, 'applications') else 0
            asset_responses.append(response)

        logger.info(f"Retrieved {len(asset_responses)} assets for user {user.username}")
        return asset_responses

    except Exception as e:
        logger.error(f"Error retrieving assets for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user assets"
        )
