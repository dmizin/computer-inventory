"""
Management Controllers API endpoints for Computer Inventory System
FIXED: Now updates 1Password secrets when management controllers are added/updated
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
import logging

from ..database import get_db
from ..auth import verify_api_key_dependency
from ..models import ApiKey
from ..services import OnePasswordService, OnePasswordError
from ..config import get_settings
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

    FIXED: Now updates the asset's 1Password secret with management controller info
    and sets credential_onepassword_ref to link the controller to the secret.
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

        # FIXED: Update 1Password secret with management controller information
        settings = get_settings()
        if settings.onepassword_enabled and asset.onepassword_secret_id:
            try:
                op_service = OnePasswordService(settings)

                # Update the existing 1Password secret with the new management controller info
                secret_id = await op_service.create_or_update_asset_secret(
                    asset=asset,
                    mgmt_controller=controller,
                    mgmt_credentials=None,  # Use defaults since no credentials provided
                    os_credentials=None     # Use defaults since no credentials provided
                )

                if secret_id:
                    # FIXED: Link the management controller to the 1Password secret
                    controller.credential_onepassword_ref = secret_id
                    db.add(controller)
                    db.commit()
                    db.refresh(controller)

                    logger.info(f"Updated 1Password secret {secret_id} with management controller {controller.type}")
                else:
                    logger.warning(f"Failed to update 1Password secret for management controller {controller.id}")

            except OnePasswordError as e:
                logger.warning(f"Failed to update 1Password secret for management controller: {e}")
                # Don't fail the controller creation if 1Password update fails
            except Exception as e:
                logger.error(f"Unexpected error updating 1Password secret: {e}")
                # Don't fail the controller creation if 1Password update fails

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

    FIXED: Now updates the associated 1Password secret when controller details change.
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

        # FIXED: Update 1Password secret if controller details changed
        settings = get_settings()
        if settings.onepassword_enabled and updated_controller.credential_onepassword_ref:
            try:
                # Get the associated asset
                asset = crud.asset_crud.get(db=db, asset_id=updated_controller.asset_id)
                if asset:
                    op_service = OnePasswordService(settings)

                    # Update the 1Password secret with the updated management controller info
                    secret_id = await op_service.create_or_update_asset_secret(
                        asset=asset,
                        mgmt_controller=updated_controller,
                        mgmt_credentials=None,  # Use defaults since no credentials provided
                        os_credentials=None     # Use defaults since no credentials provided
                    )

                    if secret_id:
                        logger.info(f"Updated 1Password secret {secret_id} with updated management controller")
                    else:
                        logger.warning(f"Failed to update 1Password secret for management controller {controller_id}")

            except OnePasswordError as e:
                logger.warning(f"Failed to update 1Password secret for management controller update: {e}")
            except Exception as e:
                logger.error(f"Unexpected error updating 1Password secret: {e}")

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

    FIXED: Updates the associated 1Password secret to remove management controller info.
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
        # FIXED: Update 1Password secret to remove management controller info
        settings = get_settings()
        if settings.onepassword_enabled and controller.credential_onepassword_ref:
            try:
                # Get the associated asset
                asset = crud.asset_crud.get(db=db, asset_id=controller.asset_id)
                if asset:
                    op_service = OnePasswordService(settings)

                    # Update the 1Password secret without the management controller
                    secret_id = await op_service.create_or_update_asset_secret(
                        asset=asset,
                        mgmt_controller=None,  # Remove management controller info
                        mgmt_credentials=None,
                        os_credentials=None
                    )

                    if secret_id:
                        logger.info(f"Updated 1Password secret {secret_id} to remove management controller")

            except OnePasswordError as e:
                logger.warning(f"Failed to update 1Password secret for management controller deletion: {e}")
            except Exception as e:
                logger.error(f"Unexpected error updating 1Password secret: {e}")

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
