"""
Management Controllers API endpoints for Computer Inventory System
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
import logging

from ..database import get_db
from ..auth import verify_api_key_dependency
from ..models import ApiKey
from .. import schemas, crud

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/{asset_id}/mgmt", response_model=List[schemas.ManagementControllerResponse], tags=["Management Controllers"])
async def list_management_controllers(
    asset_id: UUID,
    *,
    db: Session = Depends(get_db)
) -> List[schemas.ManagementControllerResponse]:
    """
    List all management controllers for an asset

    Returns all out-of-band management interfaces (iLO, iDRAC, IPMI, etc.)
    associated with the specified asset.
    """
    # Verify asset exists
    asset = crud.asset_crud.get(db=db, asset_id=asset_id)
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )

    # Get management controllers
    controllers = crud.management_controller_crud.get_by_asset(db=db, asset_id=asset_id)

    return [
        schemas.ManagementControllerResponse.model_validate(controller)
        for controller in controllers
    ]


@router.post("/{asset_id}/mgmt", response_model=schemas.ManagementControllerResponse, tags=["Management Controllers"])
async def add_management_controller(
    asset_id: UUID,
    *,
    db: Session = Depends(get_db),
    controller_in: schemas.ManagementControllerCreate,
    api_key: Optional[ApiKey] = Depends(verify_api_key_dependency)
) -> schemas.ManagementControllerResponse:
    """
    Add a new management controller to an asset

    Creates a new out-of-band management interface record for the asset.
    """
    # Verify asset exists
    asset = crud.asset_crud.get(db=db, asset_id=asset_id)
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )

    try:
        # Create management controller
        controller = crud.management_controller_crud.create(
            db=db,
            obj_in=controller_in,
            asset_id=asset_id
        )

        # Log the change
        api_key_id = api_key.id if api_key else None
        crud.log_controller_change(
            db=db,
            action="CREATE",
            controller=controller,
            changes=controller_in.model_dump(),
            api_key_id=api_key_id
        )

        logger.info(f"Management controller added: {controller.type} at {controller.address} for asset {asset_id}")

        return schemas.ManagementControllerResponse.model_validate(controller)

    except Exception as e:
        logger.error(f"Error creating management controller for asset {asset_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create management controller: {str(e)}"
        )


@router.get("/mgmt/{controller_id}", response_model=schemas.ManagementControllerResponse, tags=["Management Controllers"])
async def get_management_controller(
    controller_id: UUID,
    *,
    db: Session = Depends(get_db)
) -> schemas.ManagementControllerResponse:
    """
    Get a specific management controller by ID
    """
    controller = crud.management_controller_crud.get(db=db, controller_id=controller_id)
    if not controller:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Management controller not found"
        )

    return schemas.ManagementControllerResponse.model_validate(controller)


@router.patch("/mgmt/{controller_id}", response_model=schemas.ManagementControllerResponse, tags=["Management Controllers"])
async def update_management_controller(
    controller_id: UUID,
    *,
    db: Session = Depends(get_db),
    controller_in: schemas.ManagementControllerUpdate,
    api_key: Optional[ApiKey] = Depends(verify_api_key_dependency)
) -> schemas.ManagementControllerResponse:
    """
    Update an existing management controller

    Only provided fields will be updated. Empty or null fields will be ignored.
    """
    # Get existing controller
    controller = crud.management_controller_crud.get(db=db, controller_id=controller_id)
    if not controller:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Management controller not found"
        )

    try:
        # Store old values for audit log
        old_values = {
            field: getattr(controller, field)
            for field in controller_in.model_dump(exclude_unset=True).keys()
        }

        # Update controller
        updated_controller = crud.management_controller_crud.update(
            db=db,
            db_obj=controller,
            obj_in=controller_in
        )

        # Log the change
        changes = {
            "old": old_values,
            "new": controller_in.model_dump(exclude_unset=True)
        }
        api_key_id = api_key.id if api_key else None
        crud.log_controller_change(
            db=db,
            action="UPDATE",
            controller=updated_controller,
            changes=changes,
            api_key_id=api_key_id
        )

        logger.info(f"Management controller updated: {controller_id}")

        return schemas.ManagementControllerResponse.model_validate(updated_controller)

    except Exception as e:
        logger.error(f"Error updating management controller {controller_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update management controller: {str(e)}"
        )


@router.delete("/mgmt/{controller_id}", response_model=schemas.ManagementControllerResponse, tags=["Management Controllers"])
async def delete_management_controller(
    controller_id: UUID,
    *,
    db: Session = Depends(get_db),
    api_key: Optional[ApiKey] = Depends(verify_api_key_dependency)
) -> schemas.ManagementControllerResponse:
    """
    Delete a management controller

    Permanently removes the management controller from the database.
    """
    # Get existing controller
    controller = crud.management_controller_crud.get(db=db, controller_id=controller_id)
    if not controller:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Management controller not found"
        )

    try:
        # Log before delete
        api_key_id = api_key.id if api_key else None
        crud.log_controller_change(
            db=db,
            action="DELETE",
            controller=controller,
            changes={"deleted": True},
            api_key_id=api_key_id
        )

        # Delete controller
        deleted_controller = crud.management_controller_crud.delete(
            db=db,
            controller_id=controller_id
        )

        logger.info(f"Management controller deleted: {controller_id}")

        return schemas.ManagementControllerResponse.model_validate(deleted_controller)

    except Exception as e:
        logger.error(f"Error deleting management controller {controller_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete management controller: {str(e)}"
        )


# Utility endpoint to test management controller connectivity
@router.post("/mgmt/{controller_id}/test", tags=["Management Controllers"])
async def test_management_controller(
    controller_id: UUID,
    *,
    db: Session = Depends(get_db),
    api_key: Optional[ApiKey] = Depends(verify_api_key_dependency)
):
    """
    Test connectivity to a management controller

    Attempts to connect to the management controller and verify it's accessible.
    This is a basic connectivity test - credential validation is not performed.
    """
    # Get controller
    controller = crud.management_controller_crud.get(db=db, controller_id=controller_id)
    if not controller:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Management controller not found"
        )

    import socket
    import time
    from datetime import datetime

    try:
        # Test TCP connectivity
        start_time = time.time()

        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)  # 5 second timeout

        result = sock.connect_ex((controller.address, controller.port))
        sock.close()

        end_time = time.time()
        response_time = (end_time - start_time) * 1000  # Convert to milliseconds

        if result == 0:
            return {
                "status": "success",
                "message": f"Successfully connected to {controller.address}:{controller.port}",
                "response_time_ms": round(response_time, 2),
                "controller_type": controller.type,
                "tested_at": datetime.utcnow()
            }
        else:
            return {
                "status": "failed",
                "message": f"Failed to connect to {controller.address}:{controller.port}",
                "error_code": result,
                "response_time_ms": round(response_time, 2),
                "controller_type": controller.type,
                "tested_at": datetime.utcnow()
            }

    except Exception as e:
        return {
            "status": "error",
            "message": f"Error testing connection: {str(e)}",
            "controller_type": controller.type,
            "tested_at": datetime.utcnow()
        }
