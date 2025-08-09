"""
CRUD operations for Computer Inventory System
"""
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID
import logging

from . import models, schemas

logger = logging.getLogger(__name__)


class CRUDAsset:
    """CRUD operations for assets"""

    def get(self, db: Session, asset_id: UUID) -> Optional[models.Asset]:
        """Get asset by ID"""
        return db.query(models.Asset).filter(models.Asset.id == asset_id).first()

    def get_by_hostname(self, db: Session, hostname: str) -> Optional[models.Asset]:
        """Get asset by hostname"""
        return db.query(models.Asset).filter(models.Asset.hostname == hostname).first()

    def get_by_fqdn(self, db: Session, fqdn: str) -> Optional[models.Asset]:
        """Get asset by FQDN"""
        return db.query(models.Asset).filter(models.Asset.fqdn == fqdn).first()

    def get_by_serial_and_vendor(self, db: Session, serial_number: str, vendor: str) -> Optional[models.Asset]:
        """Get asset by serial number and vendor combination"""
        return db.query(models.Asset).filter(
            and_(
                models.Asset.serial_number == serial_number,
                models.Asset.vendor == vendor
            )
        ).first()

    def get_multi(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        status: Optional[str] = None,
        asset_type: Optional[str] = None,
        vendor: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> Tuple[List[models.Asset], int]:
        """
        Get multiple assets with filtering and pagination

        Returns:
            Tuple of (assets_list, total_count)
        """
        query = db.query(models.Asset)

        # Apply filters
        if search:
            search_term = f"%{search.lower()}%"
            query = query.filter(
                or_(
                    models.Asset.hostname.ilike(search_term),
                    models.Asset.fqdn.ilike(search_term),
                    models.Asset.serial_number.ilike(search_term),
                    models.Asset.vendor.ilike(search_term),
                    models.Asset.model.ilike(search_term)
                )
            )

        if status:
            query = query.filter(models.Asset.status == status)

        if asset_type:
            query = query.filter(models.Asset.type == asset_type)

        if vendor:
            query = query.filter(models.Asset.vendor.ilike(f"%{vendor}%"))

        # Get total count before pagination
        total = query.count()

        # Apply sorting
        sort_column = getattr(models.Asset, sort_by, models.Asset.created_at)
        if sort_order.lower() == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(sort_column)

        # Apply pagination
        assets = query.offset(skip).limit(limit).all()

        return assets, total

    def create(self, db: Session, *, obj_in: schemas.AssetCreate) -> models.Asset:
        """Create new asset"""
        db_obj = models.Asset(**obj_in.model_dump())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        logger.info(f"Created asset: {db_obj.hostname} (ID: {db_obj.id})")
        return db_obj

    def update(
        self,
        db: Session,
        *,
        db_obj: models.Asset,
        obj_in: schemas.AssetUpdate
    ) -> models.Asset:
        """Update existing asset"""
        update_data = obj_in.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        logger.info(f"Updated asset: {db_obj.hostname} (ID: {db_obj.id})")
        return db_obj

    def delete(self, db: Session, *, asset_id: UUID) -> Optional[models.Asset]:
        """Soft delete asset by setting status to retired"""
        obj = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
        if obj:
            obj.status = "retired"
            db.add(obj)
            db.commit()
            db.refresh(obj)
            logger.info(f"Soft deleted asset: {obj.hostname} (ID: {asset_id})")
        return obj

    def hard_delete(self, db: Session, *, asset_id: UUID) -> Optional[models.Asset]:
        """Hard delete asset from database"""
        obj = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
        if obj:
            logger.info(f"Hard deleting asset: {obj.hostname} (ID: {asset_id})")
            db.delete(obj)
            db.commit()
        return obj

    def upsert(self, db: Session, *, obj_in: schemas.AssetCreate) -> Tuple[models.Asset, bool]:
        """
        Upsert asset using natural key matching priority:
        1. Match by FQDN (if provided)
        2. Match by serial_number + vendor (if both provided)
        3. Match by hostname (fallback)

        Returns:
            Tuple of (asset, created) where created is True if new asset was created
        """
        existing_asset = None

        # Priority 1: Match by FQDN
        if obj_in.fqdn:
            existing_asset = self.get_by_fqdn(db, obj_in.fqdn)
            if existing_asset:
                logger.info(f"Found existing asset by FQDN: {obj_in.fqdn}")

        # Priority 2: Match by serial_number + vendor
        if not existing_asset and obj_in.serial_number and obj_in.vendor:
            existing_asset = self.get_by_serial_and_vendor(db, obj_in.serial_number, obj_in.vendor)
            if existing_asset:
                logger.info(f"Found existing asset by serial+vendor: {obj_in.serial_number}, {obj_in.vendor}")

        # Priority 3: Match by hostname (fallback)
        if not existing_asset:
            existing_asset = self.get_by_hostname(db, obj_in.hostname)
            if existing_asset:
                logger.info(f"Found existing asset by hostname: {obj_in.hostname}")

        if existing_asset:
            # Update existing asset
            update_data = schemas.AssetUpdate(**obj_in.model_dump())
            updated_asset = self.update(db, db_obj=existing_asset, obj_in=update_data)
            return updated_asset, False
        else:
            # Create new asset
            new_asset = self.create(db, obj_in=obj_in)
            return new_asset, True


class CRUDManagementController:
    """CRUD operations for management controllers"""

    def get(self, db: Session, controller_id: UUID) -> Optional[models.ManagementController]:
        """Get management controller by ID"""
        return db.query(models.ManagementController).filter(
            models.ManagementController.id == controller_id
        ).first()

    def get_by_asset(self, db: Session, asset_id: UUID) -> List[models.ManagementController]:
        """Get all management controllers for an asset"""
        return db.query(models.ManagementController).filter(
            models.ManagementController.asset_id == asset_id
        ).all()

    def create(
        self,
        db: Session,
        *,
        obj_in: schemas.ManagementControllerCreate,
        asset_id: UUID
    ) -> models.ManagementController:
        """Create new management controller"""
        db_obj = models.ManagementController(
            **obj_in.model_dump(),
            asset_id=asset_id
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        logger.info(f"Created management controller: {db_obj.type} at {db_obj.address}")
        return db_obj

    def update(
        self,
        db: Session,
        *,
        db_obj: models.ManagementController,
        obj_in: schemas.ManagementControllerUpdate
    ) -> models.ManagementController:
        """Update existing management controller"""
        update_data = obj_in.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        logger.info(f"Updated management controller: {db_obj.id}")
        return db_obj

    def delete(self, db: Session, *, controller_id: UUID) -> Optional[models.ManagementController]:
        """Delete management controller"""
        obj = db.query(models.ManagementController).filter(
            models.ManagementController.id == controller_id
        ).first()
        if obj:
            logger.info(f"Deleting management controller: {obj.type} at {obj.address}")
            db.delete(obj)
            db.commit()
        return obj


class CRUDAuditLog:
    """CRUD operations for audit logs"""

    def create_log(
        self,
        db: Session,
        *,
        action: str,
        resource_type: str,
        resource_id: UUID,
        changes: Optional[Dict[str, Any]] = None,
        api_key_id: Optional[UUID] = None
    ) -> models.AuditLog:
        """Create audit log entry"""
        db_obj = models.AuditLog(
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            changes=changes,
            api_key_id=api_key_id
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        logger.debug(f"Created audit log: {action} on {resource_type} {resource_id}")
        return db_obj

    def get_multi(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        resource_type: Optional[str] = None,
        resource_id: Optional[UUID] = None
    ) -> Tuple[List[models.AuditLog], int]:
        """Get multiple audit logs with filtering"""
        query = db.query(models.AuditLog)

        if resource_type:
            query = query.filter(models.AuditLog.resource_type == resource_type)

        if resource_id:
            query = query.filter(models.AuditLog.resource_id == resource_id)

        total = query.count()

        # Order by timestamp descending (newest first)
        logs = query.order_by(desc(models.AuditLog.timestamp)).offset(skip).limit(limit).all()

        return logs, total


# Create CRUD instances
asset_crud = CRUDAsset()
management_controller_crud = CRUDManagementController()
audit_log_crud = CRUDAuditLog()


# Utility functions for common operations

def log_asset_change(
    db: Session,
    action: str,
    asset: models.Asset,
    changes: Optional[Dict[str, Any]] = None,
    api_key_id: Optional[UUID] = None
) -> models.AuditLog:
    """Helper function to log asset changes"""
    return audit_log_crud.create_log(
        db,
        action=action,
        resource_type="asset",
        resource_id=asset.id,
        changes=changes,
        api_key_id=api_key_id
    )


def log_controller_change(
    db: Session,
    action: str,
    controller: models.ManagementController,
    changes: Optional[Dict[str, Any]] = None,
    api_key_id: Optional[UUID] = None
) -> models.AuditLog:
    """Helper function to log management controller changes"""
    return audit_log_crud.create_log(
        db,
        action=action,
        resource_type="management_controller",
        resource_id=controller.id,
        changes=changes,
        api_key_id=api_key_id
    )
