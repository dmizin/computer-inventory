"""
Credentials management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from uuid import UUID
from datetime import datetime
import logging

from ..database import get_db
from ..schemas import CredentialCreate, CredentialResponse, OnePasswordHealth
from ..models import Asset, ManagementController
from ..services import OnePasswordService, OnePasswordError
from ..config import get_settings
from ..auth import verify_api_key

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["credentials"])


@router.post("/assets/{asset_id}/credentials", response_model=CredentialResponse)
async def create_asset_credentials(
    asset_id: UUID,
    credentials: CredentialCreate,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """Create or update credentials for an asset in 1Password"""
    settings = get_settings()

    if not settings.onepassword_enabled:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="1Password integration is not enabled"
        )

    # Get asset
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Get management controller if exists
    mgmt_controller = db.query(ManagementController).filter(
        ManagementController.asset_id == asset_id
    ).first()

    try:
        op_service = OnePasswordService(settings)
        secret_id = await op_service.create_or_update_asset_secret(
            asset=asset,
            mgmt_controller=mgmt_controller,
            mgmt_credentials=credentials.mgmt_credentials,
            os_credentials=credentials.os_credentials
        )

        # Update asset with credential reference
        asset.credential_reference = secret_id
        db.commit()

        return CredentialResponse(
            asset_id=asset_id,
            has_credentials=True,
            credential_reference=secret_id,
            last_updated=asset.updated_at
        )

    except OnePasswordError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"1Password error: {str(e)}"
        )

@router.post("/assets/{asset_id}/credentials", response_model=CredentialResponse)
async def create_asset_credentials(
    asset_id: UUID,
    credentials: CredentialCreate,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """Create or update credentials for an asset in 1Password"""
    settings = get_settings()

    if not settings.onepassword_enabled:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="1Password integration is not enabled"
        )

    # Get asset
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Get management controller if exists
    mgmt_controller = db.query(ManagementController).filter(
        ManagementController.asset_id == asset_id
    ).first()

    try:
        op_service = OnePasswordService(settings)
        secret_id = await op_service.create_or_update_asset_secret(
            asset=asset,
            mgmt_controller=mgmt_controller,
            mgmt_credentials=credentials.mgmt_credentials,
            os_credentials=credentials.os_credentials
        )

        # FIXED: Update asset with correct field name
        if secret_id:
            vault_id = await op_service.get_vault_id()
            asset.onepassword_secret_id = secret_id  # FIXED: Was using credential_reference
            asset.onepassword_vault_id = vault_id
            db.commit()

        return CredentialResponse(
            asset_id=asset_id,
            has_credentials=bool(secret_id),
            credential_reference=secret_id,
            last_updated=asset.updated_at
        )

    except OnePasswordError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"1Password error: {str(e)}"
        )

@router.get("/health/onepassword", response_model=OnePasswordHealth)
async def check_onepassword_health():
    """Check 1Password Connect health"""
    settings = get_settings()

    health = OnePasswordHealth(
        enabled=settings.onepassword_enabled,
        connected=False,
        vault_accessible=False,
        last_check=datetime.utcnow()
    )

    if not settings.onepassword_enabled:
        return health

    try:
        op_service = OnePasswordService(settings)
        connected = await op_service.test_connectivity()

        if connected:
            # Test vault access
            vault_id = await op_service.get_vault_id()
            health.connected = True
            health.vault_accessible = True

    except OnePasswordError as e:
        health.error = str(e)
        logger.error(f"1Password health check failed: {e}")

    return health
