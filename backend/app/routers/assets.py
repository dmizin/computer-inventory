"""
Assets API endpoints for Computer Inventory System
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
import logging

from ..config import get_settings
from ..database import get_db
from ..auth import verify_api_key_dependency, optional_api_key
from ..models import ApiKey
from .. import schemas, crud

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/upsert", response_model=schemas.UpsertResponse, tags=["Assets"])
async def upsert_asset(
    *,
    db: Session = Depends(get_db),
    asset_in: schemas.AssetCreate,
    api_key: Optional[ApiKey] = Depends(verify_api_key_dependency)
) -> schemas.UpsertResponse:
    """
    Upsert asset using natural key matching

    Matching priority:
    1. Match by FQDN (if provided)
    2. Match by serial_number + vendor (if both provided)
    3. Match by hostname (fallback)

    Returns the asset and whether it was created or updated.
    """
    try:
        # Perform upsert operation
        asset, created = crud.asset_crud.upsert(db=db, obj_in=asset_in)

        # Log the operation
        action = "CREATE" if created else "UPDATE"
        api_key_id = api_key.id if api_key else None
        crud.log_asset_change(
            db=db,
            action=action,
            asset=asset,
            changes=asset_in.model_dump(),
            api_key_id=api_key_id
        )

        logger.info(f"Asset upsert completed: {action} {asset.hostname}")

        return schemas.UpsertResponse(
            asset=schemas.AssetResponse.model_validate(asset),
            created=created
        )

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
    search: Optional[str] = Query(None, description="Search in hostname, FQDN, serial number, vendor, or model"),
    status: Optional[str] = Query(None, description="Filter by asset status"),
    type: Optional[str] = Query(None, alias="type", description="Filter by asset type"),
    vendor: Optional[str] = Query(None, description="Filter by vendor"),
    sort_by: str = Query("created_at", description="Field to sort by"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Sort order"),
    api_key: Optional[ApiKey] = Depends(optional_api_key)
) -> schemas.AssetListResponse:
    """
    List assets with filtering, searching, and pagination

    - **search**: Search across hostname, FQDN, serial number, vendor, and model
    - **status**: Filter by asset status (active, retired, maintenance)
    - **type**: Filter by asset type (server, workstation, network, storage)
    - **vendor**: Filter by vendor name (partial match)
    - **sort_by**: Field to sort by (hostname, created_at, updated_at, etc.)
    - **sort_order**: asc or desc
    """
    try:
        assets, total = crud.asset_crud.get_multi(
            db=db,
            skip=skip,
            limit=limit,
            search=search,
            status=status,
            asset_type=type,
            vendor=vendor,
            sort_by=sort_by,
            sort_order=sort_order
        )

        # Calculate pagination metadata
        pages = (total + limit - 1) // limit  # Ceiling division

        return schemas.AssetListResponse(
            data=[schemas.AssetResponse.model_validate(asset) for asset in assets],
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


@router.get("/{asset_id}", response_model=schemas.AssetWithControllers, tags=["Assets"])
async def get_asset(
    asset_id: UUID,
    *,
    db: Session = Depends(get_db),
    api_key: Optional[ApiKey] = Depends(optional_api_key)
) -> schemas.AssetWithControllers:
    """
    Get a specific asset by ID

    Returns the asset with all associated management controllers
    """
    # Get the asset
    asset = crud.asset_crud.get(db=db, asset_id=asset_id)
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )

    # Get management controllers
    controllers = crud.management_controller_crud.get_by_asset(db=db, asset_id=asset_id)

    # Build response with management controllers
    return schemas.AssetWithControllers(
        **asset.__dict__,
        management_controllers=[
            schemas.ManagementControllerResponse.model_validate(controller)
            for controller in controllers
        ]
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
    Update an existing asset

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
        # Store old values for audit log
        old_values = {
            field: getattr(asset, field)
            for field in asset_in.model_dump(exclude_unset=True).keys()
        }

        # Update asset
        updated_asset = crud.asset_crud.update(db=db, db_obj=asset, obj_in=asset_in)

        # Log the change
        changes = {
            "old": old_values,
            "new": asset_in.model_dump(exclude_unset=True)
        }
        api_key_id = api_key.id if api_key else None
        crud.log_asset_change(
            db=db,
            action="UPDATE",
            asset=updated_asset,
            changes=changes,
            api_key_id=api_key_id
        )

        logger.info(f"Asset updated: {updated_asset.hostname} (ID: {asset_id})")

        return schemas.AssetResponse.model_validate(updated_asset)

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
    Delete an asset

    - By default, performs soft delete (sets status to 'retired')
    - Use hard_delete=true to permanently remove from database
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
            # Log before hard delete
            api_key_id = api_key.id if api_key else None
            crud.log_asset_change(
                db=db,
                action="DELETE",
                asset=asset,
                changes={"hard_delete": True},
                api_key_id=api_key_id
            )

            # Perform hard delete
            deleted_asset = crud.asset_crud.hard_delete(db=db, asset_id=asset_id)
            logger.info(f"Asset hard deleted: {asset.hostname} (ID: {asset_id})")

        else:
            # Perform soft delete
            deleted_asset = crud.asset_crud.delete(db=db, asset_id=asset_id)

            # Log the change
            api_key_id = api_key.id if api_key else None
            crud.log_asset_change(
                db=db,
                action="SOFT_DELETE",
                asset=deleted_asset,
                changes={"status": "retired"},
                api_key_id=api_key_id
            )

            logger.info(f"Asset soft deleted: {deleted_asset.hostname} (ID: {asset_id})")

        return schemas.AssetResponse.model_validate(deleted_asset)

    except Exception as e:
        logger.error(f"Error deleting asset {asset_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete asset: {str(e)}"
        )


@router.get("/{asset_id}/audit", response_model=List[schemas.AuditLogResponse], tags=["Assets"])
async def get_asset_audit_logs(
    asset_id: UUID,
    *,
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    api_key: Optional[ApiKey] = Depends(optional_api_key)
) -> List[schemas.AuditLogResponse]:
    """
    Get audit logs for a specific asset

    Returns audit trail showing all changes made to the asset
    """
    # Verify asset exists
    asset = crud.asset_crud.get(db=db, asset_id=asset_id)
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )

    # Get audit logs
    logs, total = crud.audit_log_crud.get_multi(
        db=db,
        skip=skip,
        limit=limit,
        resource_type="asset",
        resource_id=asset_id
    )

    return [schemas.AuditLogResponse.model_validate(log) for log in logs]
