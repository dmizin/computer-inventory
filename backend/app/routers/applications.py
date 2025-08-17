"""
Applications API endpoints for Computer Inventory System
Manages application-to-server mappings and service inventory
FIXED: UUID serialization in audit logging
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Any, Dict
from uuid import UUID
import logging

from ..database import get_db
from ..auth import verify_api_key_dependency, optional_api_key
from ..models import ApiKey
from .. import schemas, crud, models

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
    else:
        return obj


def _build_application_response(application) -> schemas.ApplicationResponse:
    """Helper to build ApplicationResponse with computed fields"""
    response = schemas.ApplicationResponse.model_validate(application)
    response.asset_count = len(application.assets) if hasattr(application, 'assets') else 0
    return response


@router.get("", response_model=List[schemas.ApplicationResponse], tags=["Applications"])
async def list_applications(
    *,
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Number of records to return"),
    search: Optional[str] = Query(None, description="Search in name, description, or application type"),
    environment: Optional[schemas.ApplicationEnvironment] = Query(None, description="Filter by environment"),
    status: Optional[schemas.ApplicationStatus] = Query(None, description="Filter by status"),
    criticality: Optional[schemas.Criticality] = Query(None, description="Filter by criticality level"),
    contact_id: Optional[UUID] = Query(None, description="Filter by primary contact user ID"),
    has_assets: Optional[bool] = Query(None, description="Filter by whether application has assigned assets"),
    api_key: Optional[ApiKey] = Depends(optional_api_key)
) -> List[schemas.ApplicationResponse]:
    """
    List all applications with optional filtering and search

    - **search**: Search across application name, description, and type
    - **environment**: Filter by deployment environment (production, staging, development, testing)
    - **status**: Filter by application status (active, inactive, maintenance, deprecated)
    - **criticality**: Filter by business criticality (low, medium, high, critical)
    - **contact_id**: Filter by primary contact user
    - **has_assets**: Filter applications that have (true) or don't have (false) assigned assets
    """
    try:
        search_params = schemas.ApplicationSearchParams(
            search=search,
            environment=environment,
            status=status,
            criticality=criticality,
            contact_id=contact_id,
            has_assets=has_assets
        )

        applications = crud.application_crud.get_multi(
            db,
            skip=skip,
            limit=limit,
            search_params=search_params
        )

        # Add computed fields
        response_data = [_build_application_response(app) for app in applications]

        logger.info(f"Listed {len(response_data)} applications (skip={skip}, limit={limit})")
        return response_data

    except Exception as e:
        logger.error(f"Error listing applications: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list applications"
        )


@router.get("/{application_id}", response_model=schemas.ApplicationWithAssets, tags=["Applications"])
async def get_application(
    application_id: UUID,
    *,
    db: Session = Depends(get_db),
    include_assets: bool = Query(True, description="Include detailed asset information"),
    api_key: Optional[ApiKey] = Depends(optional_api_key)
) -> schemas.ApplicationWithAssets:
    """
    Get a specific application by ID

    Returns detailed application information including associated assets,
    primary contact information, and deployment details.
    """
    try:
        if include_assets:
            application = crud.application_crud.get_with_assets(db, application_id)
        else:
            application = crud.application_crud.get(db, application_id)

        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found"
            )

        # Add computed fields
        response = schemas.ApplicationWithAssets.model_validate(application)
        response.asset_count = len(application.assets) if hasattr(application, 'assets') else 0

        # Add computed fields to assets if they're included
        if hasattr(application, 'assets') and application.assets:
            for asset in response.assets:
                asset.has_onepassword_secret = bool(asset.onepassword_secret_id)
                asset.application_count = len(asset.applications) if hasattr(asset, 'applications') else 0

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving application {application_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve application"
        )


@router.post("", response_model=schemas.ApplicationResponse, status_code=status.HTTP_201_CREATED, tags=["Applications"])
async def create_application(
    *,
    db: Session = Depends(get_db),
    application_in: schemas.ApplicationCreate,
    api_key: Optional[ApiKey] = Depends(verify_api_key_dependency)
) -> schemas.ApplicationResponse:
    """
    Create a new application

    Creates a new application/service entry with optional asset assignments.
    Application names should be unique within the same environment.
    """
    try:
        # Check if application name already exists in the same environment
        existing = crud.application_crud.get_by_name(
            db,
            name=application_in.name,
            environment=application_in.environment
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Application '{application_in.name}' already exists in {application_in.environment} environment"
            )

        # Validate primary contact exists (if provided)
        if application_in.primary_contact_id:
            contact = crud.user_crud.get(db, application_in.primary_contact_id)
            if not contact:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Primary contact user not found"
                )

        # Validate asset IDs exist (if provided)
        if application_in.asset_ids:
            assets = db.query(models.Asset).filter(
                models.Asset.id.in_(application_in.asset_ids)
            ).all()
            if len(assets) != len(application_in.asset_ids):
                missing_ids = set(application_in.asset_ids) - {asset.id for asset in assets}
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Asset IDs not found: {list(missing_ids)}"
                )

        # Create application
        application = crud.application_crud.create(db, obj_in=application_in)

        # Log the creation with JSON-safe data
        api_key_id = api_key.id if api_key else None
        audit_changes = _make_json_safe(application_in.model_dump())

        crud.log_application_change(
            db=db,
            action="CREATE",
            application=application,
            changes=audit_changes,
            api_key_id=api_key_id
        )

        response = _build_application_response(application)
        response.asset_count = len(application_in.asset_ids)

        logger.info(f"Application created: {application.name} ({application.environment}) with {len(application_in.asset_ids)} assets")
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating application: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create application: {str(e)}"
        )


@router.patch("/{application_id}", response_model=schemas.ApplicationResponse, tags=["Applications"])
async def update_application(
    application_id: UUID,
    *,
    db: Session = Depends(get_db),
    application_in: schemas.ApplicationUpdate,
    api_key: Optional[ApiKey] = Depends(verify_api_key_dependency)
) -> schemas.ApplicationResponse:
    """
    Update an existing application

    Updates application information and/or asset associations.
    Only provided fields will be updated.
    """
    # Get existing application
    application = crud.application_crud.get(db, application_id)
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )

    try:
        # Store old values for audit log
        old_values = {
            field: getattr(application, field)
            for field in application_in.model_dump(exclude_unset=True).keys()
            if field != 'asset_ids'  # Handle asset_ids separately
        }

        # Validate primary contact exists if being updated
        if application_in.primary_contact_id:
            contact = crud.user_crud.get(db, application_in.primary_contact_id)
            if not contact:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Primary contact user not found"
                )

        # Validate asset IDs exist if being updated
        if application_in.asset_ids is not None:
            if application_in.asset_ids:  # If not empty list
                assets = db.query(models.Asset).filter(
                    models.Asset.id.in_(application_in.asset_ids)
                ).all()
                if len(assets) != len(application_in.asset_ids):
                    missing_ids = set(application_in.asset_ids) - {asset.id for asset in assets}
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Asset IDs not found: {list(missing_ids)}"
                    )

        # Update application
        updated_application = crud.application_crud.update(
            db,
            db_obj=application,
            obj_in=application_in
        )

        # Log the change with JSON-safe data
        audit_changes = {
            "old": _make_json_safe(old_values),
            "new": _make_json_safe(application_in.model_dump(exclude_unset=True, exclude={'asset_ids'}))
        }
        if application_in.asset_ids is not None:
            old_asset_ids = [asset.id for asset in application.assets] if hasattr(application, 'assets') else []
            audit_changes["asset_changes"] = _make_json_safe({
                "old_asset_ids": old_asset_ids,
                "new_asset_ids": application_in.asset_ids
            })

        api_key_id = api_key.id if api_key else None
        crud.log_application_change(
            db=db,
            action="UPDATE",
            application=updated_application,
            changes=audit_changes,
            api_key_id=api_key_id
        )

        response = _build_application_response(updated_application)
        response.asset_count = len(application_in.asset_ids) if application_in.asset_ids else 0

        logger.info(f"Application updated: {updated_application.name}")
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating application {application_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update application: {str(e)}"
        )


@router.delete("/{application_id}", response_model=schemas.ApplicationResponse, tags=["Applications"])
async def delete_application(
    application_id: UUID,
    *,
    db: Session = Depends(get_db),
    api_key: Optional[ApiKey] = Depends(verify_api_key_dependency)
) -> schemas.ApplicationResponse:
    """
    Delete an application

    Permanently removes the application from the system. This will also
    remove all asset associations but does not affect the assets themselves.
    """
    application = crud.application_crud.get(db, application_id)
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )

    try:
        # Store for response and audit log
        response_data = _build_application_response(application)

        # Delete application
        deleted_application = crud.application_crud.delete(db, application_id=application_id)

        # Log the deletion with JSON-safe data
        api_key_id = api_key.id if api_key else None
        audit_changes = _make_json_safe({"deleted": True})

        crud.log_application_change(
            db=db,
            action="DELETE",
            application=deleted_application,
            changes=audit_changes,
            api_key_id=api_key_id
        )

        logger.info(f"Application deleted: {deleted_application.name}")
        return response_data

    except Exception as e:
        logger.error(f"Error deleting application {application_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete application: {str(e)}"
        )


@router.post("/{application_id}/assets/{asset_id}", response_model=schemas.ApplicationResponse, tags=["Applications"])
async def add_asset_to_application(
    application_id: UUID,
    asset_id: UUID,
    *,
    db: Session = Depends(get_db),
    api_key: Optional[ApiKey] = Depends(verify_api_key_dependency)
) -> schemas.ApplicationResponse:
    """
    Add an asset to an application

    Creates an association between an application and an asset.
    The asset will be added to the application's server list.
    """
    # Validate both exist
    application = crud.application_crud.get(db, application_id)
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )

    asset = crud.asset_crud.get(db, asset_id)
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )

    try:
        # Add asset to application
        updated_application = crud.application_crud.add_asset(
            db,
            application_id=application_id,
            asset_id=asset_id
        )

        # Log the change with JSON-safe data
        api_key_id = api_key.id if api_key else None
        audit_changes = _make_json_safe({
            "action": "add_asset",
            "asset_id": asset_id,
            "asset_hostname": asset.hostname
        })

        crud.log_application_change(
            db=db,
            action="UPDATE",
            application=updated_application,
            changes=audit_changes,
            api_key_id=api_key_id
        )

        response = _build_application_response(updated_application)
        logger.info(f"Added asset {asset.hostname} to application {updated_application.name}")
        return response

    except Exception as e:
        logger.error(f"Error adding asset {asset_id} to application {application_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add asset to application"
        )


@router.delete("/{application_id}/assets/{asset_id}", response_model=schemas.ApplicationResponse, tags=["Applications"])
async def remove_asset_from_application(
    application_id: UUID,
    asset_id: UUID,
    *,
    db: Session = Depends(get_db),
    api_key: Optional[ApiKey] = Depends(verify_api_key_dependency)
) -> schemas.ApplicationResponse:
    """
    Remove an asset from an application

    Removes the association between an application and an asset.
    The asset itself is not affected, only the relationship.
    """
    # Validate application exists
    application = crud.application_crud.get(db, application_id)
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )

    try:
        # Get asset info for logging (before removal)
        asset = crud.asset_crud.get(db, asset_id)
        asset_hostname = asset.hostname if asset else str(asset_id)

        # Remove asset from application
        updated_application = crud.application_crud.remove_asset(
            db,
            application_id=application_id,
            asset_id=asset_id
        )

        # Log the change with JSON-safe data
        api_key_id = api_key.id if api_key else None
        audit_changes = _make_json_safe({
            "action": "remove_asset",
            "asset_id": asset_id,
            "asset_hostname": asset_hostname
        })

        crud.log_application_change(
            db=db,
            action="UPDATE",
            application=updated_application,
            changes=audit_changes,
            api_key_id=api_key_id
        )

        response = _build_application_response(updated_application)
        logger.info(f"Removed asset {asset_hostname} from application {updated_application.name}")
        return response

    except Exception as e:
        logger.error(f"Error removing asset {asset_id} from application {application_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove asset from application"
        )
