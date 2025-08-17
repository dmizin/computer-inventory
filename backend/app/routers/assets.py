"""
Enhanced Assets API endpoints for Computer Inventory System
ENHANCED: Now supports user ownership, notes, and application associations
FIXED: Route ordering and UUID serialization in audit logging
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Any, Dict
from uuid import UUID
import logging

from ..config import get_settings
from ..database import get_db
from ..auth import verify_api_key_dependency, optional_api_key
from ..models import ApiKey, ManagementController
from ..services import OnePasswordService, OnePasswordError
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


def _build_asset_response(asset) -> schemas.AssetResponse:
    """Helper to build AssetResponse with computed fields populated"""
    response = schemas.AssetResponse.model_validate(asset)
    response.has_onepassword_secret = bool(asset.onepassword_secret_id)
    response.application_count = len(asset.applications) if hasattr(asset, 'applications') else 0
    return response


def _build_asset_with_controllers_response(asset, controllers) -> schemas.AssetWithControllers:
    """Helper to build AssetWithControllers response with computed fields populated"""
    response = schemas.AssetWithControllers(
        **asset.__dict__,
        management_controllers=[
            schemas.ManagementControllerResponse.model_validate(controller)
            for controller in controllers
        ]
    )
    response.has_onepassword_secret = bool(asset.onepassword_secret_id)
    response.application_count = len(asset.applications) if hasattr(asset, 'applications') else 0
    return response


def _build_asset_with_details_response(asset) -> schemas.AssetWithDetails:
    """Helper to build AssetWithDetails response with all relationships"""
    response = schemas.AssetWithDetails.model_validate(asset)
    response.has_onepassword_secret = bool(asset.onepassword_secret_id)
    response.application_count = len(asset.applications) if hasattr(asset, 'applications') else 0

    # Add computed fields to nested applications
    if hasattr(asset, 'applications') and asset.applications:
        for app in response.applications:
            app.asset_count = len(app.assets) if hasattr(app, 'assets') else 0

    return response


# =============================================================================
# SPECIFIC ROUTES - MUST COME BEFORE PARAMETERIZED ROUTES
# =============================================================================

@router.post("/upsert", response_model=schemas.UpsertResponse, tags=["Assets"])
async def upsert_asset(
    *,
    db: Session = Depends(get_db),
    asset_in: schemas.AssetCreate,
    api_key: Optional[ApiKey] = Depends(verify_api_key_dependency)
) -> schemas.UpsertResponse:
    """
    Upsert asset using natural key matching - ENHANCED

    Matching priority:
    1. Match by FQDN (if provided)
    2. Match by serial_number + vendor (if both provided)
    3. Match by hostname (fallback)

    ENHANCED: Now supports primary_owner_id, notes, and application_ids.
    Returns the asset and whether it was created or updated.
    Automatically creates/updates 1Password secret if enabled.
    """
    try:
        # Validate owner exists (if provided)
        if asset_in.primary_owner_id:
            owner = crud.user_crud.get(db, asset_in.primary_owner_id)
            if not owner:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Primary owner user not found"
                )

        # Validate application IDs exist (if provided)
        if asset_in.application_ids:
            applications = db.query(models.Application).filter(
                models.Application.id.in_(asset_in.application_ids)
            ).all()
            if len(applications) != len(asset_in.application_ids):
                missing_ids = set(asset_in.application_ids) - {app.id for app in applications}
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Application IDs not found: {list(missing_ids)}"
                )

        # Extract credentials before CRUD operations (since they're excluded from asset model)
        mgmt_credentials = asset_in.mgmt_credentials
        os_credentials = asset_in.os_credentials

        # Perform upsert operation
        asset, created = crud.asset_crud.upsert(db=db, obj_in=asset_in)

        # Log the operation with JSON-safe data
        action = "CREATE" if created else "UPDATE"
        api_key_id = api_key.id if api_key else None

        # Make audit data JSON-safe
        audit_changes = _make_json_safe(asset_in.model_dump(exclude={'mgmt_credentials', 'os_credentials'}))

        crud.log_asset_change(
            db=db,
            action=action,
            asset=asset,
            changes=audit_changes,
            api_key_id=api_key_id
        )

        logger.info(f"Asset upsert completed: {action} {asset.hostname}")

        # Handle 1Password secret creation/update automatically
        settings = get_settings()
        if settings.onepassword_enabled:
            try:
                # Get management controller if exists
                mgmt_controller = db.query(ManagementController).filter(
                    ManagementController.asset_id == asset.id
                ).first()

                # Create OnePassword service
                op_service = OnePasswordService(settings)

                # Create/update 1Password secret (uses defaults if credentials not provided)
                secret_id = await op_service.create_or_update_asset_secret(
                    asset=asset,
                    mgmt_controller=mgmt_controller,
                    mgmt_credentials=mgmt_credentials,
                    os_credentials=os_credentials
                )

                logger.info(f"1Password secret {'updated' if not created else 'created'}: {secret_id}")

            except OnePasswordError as e:
                logger.warning(f"1Password operation failed for asset {asset.hostname}: {e}")
                # Continue without failing the upsert
            except Exception as e:
                logger.error(f"Unexpected error during 1Password operation: {e}")
                # Continue without failing the upsert

        return schemas.UpsertResponse(
            asset=_build_asset_response(asset),
            created=created
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during asset upsert: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upsert asset: {str(e)}"
        )


@router.get("", response_model=schemas.AssetListResponse, tags=["Assets"])
async def list_assets(
    *,
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Number of records to return"),
    # EXISTING filters (backward compatibility)
    search: Optional[str] = Query(None, description="Search in hostname, FQDN, serial number, vendor, or model"),
    status: Optional[str] = Query(None, description="Filter by asset status"),
    type: Optional[str] = Query(None, alias="type", description="Filter by asset type"),
    vendor: Optional[str] = Query(None, description="Filter by vendor"),
    sort_by: str = Query("created_at", description="Field to sort by"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Sort order"),
    # NEW ENHANCED filters
    location: Optional[str] = Query(None, description="Filter by location"),
    owner_id: Optional[UUID] = Query(None, description="Filter by primary owner user ID"),
    has_applications: Optional[bool] = Query(None, description="Filter by presence of application assignments"),
    has_notes: Optional[bool] = Query(None, description="Filter by presence of notes"),
    api_key: Optional[ApiKey] = Depends(optional_api_key)
) -> schemas.AssetListResponse:
    """
    List assets with enhanced filtering, searching, and pagination

    EXISTING filters (backward compatible):
    - **search**: Search across hostname, FQDN, serial number, vendor, and model
    - **status**: Filter by asset status (active, retired, maintenance)
    - **type**: Filter by asset type (server, workstation, network, storage)
    - **vendor**: Filter by vendor name (partial match)
    - **sort_by**: Field to sort by (hostname, created_at, updated_at, etc.)
    - **sort_order**: asc or desc

    NEW ENHANCED filters:
    - **location**: Filter by physical location
    - **owner_id**: Filter by primary owner user ID
    - **has_applications**: Filter assets that have (true) or don't have (false) applications
    - **has_notes**: Filter assets that have (true) or don't have (false) notes
    """
    try:
        # Build enhanced search parameters
        search_params = None
        if any([location, owner_id, has_applications is not None, has_notes is not None]):
            search_params = schemas.AssetSearchParams(
                search=search,
                type=schemas.AssetType(type) if type else None,
                status=schemas.AssetStatus(status) if status else None,
                location=location,
                owner_id=owner_id,
                has_applications=has_applications,
                has_notes=has_notes
            )

        # Use enhanced search if any new filters are provided, otherwise use legacy method
        assets, total = crud.asset_crud.get_multi(
            db=db,
            skip=skip,
            limit=limit,
            search=search,
            status=status,
            asset_type=type,
            vendor=vendor,
            sort_by=sort_by,
            sort_order=sort_order,
            search_params=search_params
        )

        # Calculate pagination metadata
        pages = (total + limit - 1) // limit  # Ceiling division

        return schemas.AssetListResponse(
            data=[_build_asset_response(asset) for asset in assets],
            meta=schemas.PaginationMeta(
                total=total,
                page=(skip // limit) + 1,
                per_page=limit,
                pages=pages
            )
        )

    except Exception as e:
        logger.error(f"Error listing assets: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list assets"
        )


@router.patch("/bulk", response_model=List[schemas.AssetResponse], tags=["Assets"])
async def bulk_update_assets(
    *,
    db: Session = Depends(get_db),
    bulk_data: schemas.BulkAssetUpdate,
    api_key: Optional[ApiKey] = Depends(verify_api_key_dependency)
) -> List[schemas.AssetResponse]:
    """
    Bulk update multiple assets - NEW

    Apply the same updates to multiple assets at once. Useful for
    mass ownership changes, status updates, or bulk application assignments.
    """
    try:
        # Validate all assets exist
        existing_assets = db.query(models.Asset).filter(
            models.Asset.id.in_(bulk_data.asset_ids)
        ).all()

        if len(existing_assets) != len(bulk_data.asset_ids):
            missing_ids = set(bulk_data.asset_ids) - {asset.id for asset in existing_assets}
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Asset IDs not found: {list(missing_ids)}"
            )

        # Validate owner if being set
        if bulk_data.updates.primary_owner_id:
            owner = crud.user_crud.get(db, bulk_data.updates.primary_owner_id)
            if not owner:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Primary owner user not found"
                )

        # Validate application IDs if being set
        if bulk_data.updates.application_ids is not None:
            if bulk_data.updates.application_ids:  # If not empty list
                applications = db.query(models.Application).filter(
                    models.Application.id.in_(bulk_data.updates.application_ids)
                ).all()
                if len(applications) != len(bulk_data.updates.application_ids):
                    missing_ids = set(bulk_data.updates.application_ids) - {app.id for app in applications}
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Application IDs not found: {list(missing_ids)}"
                    )

        # Perform bulk update
        updated_assets = crud.asset_crud.bulk_update(
            db,
            asset_ids=bulk_data.asset_ids,
            updates=bulk_data.updates
        )

        # Log bulk operation with JSON-safe data
        api_key_id = api_key.id if api_key else None
        for asset in updated_assets:
            # Make audit data JSON-safe
            audit_changes = _make_json_safe({
                "bulk_operation": True,
                "updates": bulk_data.updates.model_dump(exclude_unset=True)
            })

            crud.log_asset_change(
                db=db,
                action="BULK_UPDATE",
                asset=asset,
                changes=audit_changes,
                api_key_id=api_key_id
            )

        # Build responses with computed fields
        responses = [_build_asset_response(asset) for asset in updated_assets]

        logger.info(f"Bulk updated {len(updated_assets)} assets")
        return responses

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during bulk asset update: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to bulk update assets: {str(e)}"
        )


@router.post("/bulk-assign-application", response_model=dict, tags=["Assets"])
async def bulk_assign_application(
    *,
    db: Session = Depends(get_db),
    assignment_data: schemas.BulkApplicationAssignment,
    api_key: Optional[ApiKey] = Depends(verify_api_key_dependency)
) -> dict:
    """
    Bulk assign an application to multiple assets - NEW

    Assigns a single application to multiple assets at once.
    Useful for setting up application clusters or service deployments.
    """
    try:
        # Validate application exists
        application = crud.application_crud.get(db, assignment_data.application_id)
        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found"
            )

        # Validate all assets exist
        assets = db.query(models.Asset).filter(
            models.Asset.id.in_(assignment_data.asset_ids)
        ).all()

        if len(assets) != len(assignment_data.asset_ids):
            missing_ids = set(assignment_data.asset_ids) - {asset.id for asset in assets}
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Asset IDs not found: {list(missing_ids)}"
            )

        # Assign application to all assets
        assigned_count = 0
        for asset in assets:
            if application not in asset.applications:
                asset.applications.append(application)
                assigned_count += 1

        db.commit()

        # Log bulk assignment with JSON-safe data
        api_key_id = api_key.id if api_key else None
        for asset in assets:
            # Make audit data JSON-safe
            audit_changes = _make_json_safe({
                "application_id": assignment_data.application_id,
                "application_name": application.name,
                "bulk_operation": True
            })

            crud.log_asset_change(
                db=db,
                action="BULK_APP_ASSIGN",
                asset=asset,
                changes=audit_changes,
                api_key_id=api_key_id
            )

        logger.info(f"Bulk assigned application '{application.name}' to {len(assets)} assets ({assigned_count} new assignments)")

        return {
            "message": f"Successfully assigned application '{application.name}' to {len(assets)} assets",
            "application_id": str(assignment_data.application_id),  # Convert UUID to string
            "application_name": application.name,
            "total_assets": len(assets),
            "new_assignments": assigned_count,
            "assigned_asset_ids": [str(asset_id) for asset_id in assignment_data.asset_ids]  # Convert UUIDs to strings
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during bulk application assignment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to bulk assign application: {str(e)}"
        )


# =============================================================================
# PARAMETERIZED ROUTES - MUST COME AFTER SPECIFIC ROUTES
# =============================================================================

@router.get("/{asset_id}", response_model=schemas.AssetWithDetails, tags=["Assets"])
async def get_asset(
    asset_id: UUID,
    *,
    db: Session = Depends(get_db),
    include_details: bool = Query(True, description="Include management controllers and applications"),
    api_key: Optional[ApiKey] = Depends(optional_api_key)
) -> schemas.AssetWithDetails:
    """
    Get a specific asset by ID - ENHANCED

    ENHANCED: Now returns asset with primary owner, applications, and management controllers.
    Returns comprehensive asset information including all relationships.
    """
    try:
        # Get asset with full details
        if include_details:
            asset = crud.asset_crud.get_with_full_details(db, asset_id)
        else:
            asset = crud.asset_crud.get(db, asset_id)

        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Asset not found"
            )

        # Build comprehensive response
        return _build_asset_with_details_response(asset)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving asset {asset_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve asset"
        )


@router.patch("/{asset_id}", response_model=schemas.AssetResponse, tags=["Assets"])
async def update_asset(
    asset_id: UUID,
    *,
    db: Session = Depends(get_db),
    asset_in: schemas.AssetUpdate,
    api_key: Optional[ApiKey] = Depends(verify_api_key_dependency)
) -> schemas.AssetResponse:
    """
    Update an existing asset - ENHANCED

    ENHANCED: Now supports updating primary_owner_id, notes, and application_ids.
    Only provided fields will be updated. Empty or null fields will be ignored.
    """
    # Get existing asset
    asset = crud.asset_crud.get(db=db, asset_id=asset_id)
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )

    try:
        # Validate owner exists (if being updated)
        if asset_in.primary_owner_id:
            owner = crud.user_crud.get(db, asset_in.primary_owner_id)
            if not owner:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Primary owner user not found"
                )

        # Validate application IDs exist (if being updated)
        if asset_in.application_ids is not None:
            if asset_in.application_ids:  # If not empty list
                applications = db.query(models.Application).filter(
                    models.Application.id.in_(asset_in.application_ids)
                ).all()
                if len(applications) != len(asset_in.application_ids):
                    missing_ids = set(asset_in.application_ids) - {app.id for app in applications}
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Application IDs not found: {list(missing_ids)}"
                    )

        # Store old values for audit log
        old_values = {}
        for field in asset_in.model_dump(exclude_unset=True).keys():
            if field != 'application_ids':  # Handle application_ids separately
                old_values[field] = getattr(asset, field, None)

        # Update asset
        updated_asset = crud.asset_crud.update(db=db, db_obj=asset, obj_in=asset_in)

        # Log the change with JSON-safe data
        audit_changes = {
            "old": _make_json_safe(old_values),
            "new": _make_json_safe(asset_in.model_dump(exclude_unset=True, exclude={'application_ids'}))
        }

        if asset_in.application_ids is not None:
            old_app_ids = [app.id for app in asset.applications] if hasattr(asset, 'applications') else []
            audit_changes["application_changes"] = _make_json_safe({
                "old_application_ids": old_app_ids,
                "new_application_ids": asset_in.application_ids
            })

        api_key_id = api_key.id if api_key else None
        crud.log_asset_change(
            db=db,
            action="UPDATE",
            asset=updated_asset,
            changes=audit_changes,
            api_key_id=api_key_id
        )

        logger.info(f"Asset updated: {updated_asset.hostname} (ID: {asset_id})")
        return _build_asset_response(updated_asset)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating asset {asset_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update asset: {str(e)}"
        )


@router.delete("/{asset_id}", response_model=schemas.AssetResponse, tags=["Assets"])
async def delete_asset(
    asset_id: UUID,
    *,
    db: Session = Depends(get_db),
    hard_delete: bool = Query(False, description="If true, permanently delete. Otherwise, set status to retired."),
    api_key: Optional[ApiKey] = Depends(verify_api_key_dependency)
) -> schemas.AssetResponse:
    """
    Delete an asset - UNCHANGED

    By default, performs soft delete (sets status to 'retired').
    Use hard_delete=true to permanently remove from database.
    """
    # Get existing asset
    asset = crud.asset_crud.get(db=db, asset_id=asset_id)
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )

    try:
        if hard_delete:
            # Hard delete - not implemented in CRUD, would need to add
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail="Hard delete not implemented"
            )
        else:
            # Soft delete - set status to retired
            deleted_asset = crud.asset_crud.delete(db=db, asset_id=asset_id)

        # Log the deletion with JSON-safe data
        api_key_id = api_key.id if api_key else None
        audit_changes = _make_json_safe({"status": "retired", "hard_delete": hard_delete})

        crud.log_asset_change(
            db=db,
            action="DELETE",
            asset=deleted_asset,
            changes=audit_changes,
            api_key_id=api_key_id
        )

        logger.info(f"Asset deleted: {deleted_asset.hostname} (ID: {asset_id})")
        return _build_asset_response(deleted_asset)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting asset {asset_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete asset: {str(e)}"
        )
