"""
CRUD operations for Computer Inventory System
Combines existing functionality with enhanced User/Application tracking
"""
from typing import Optional, List, Dict, Any, Tuple
from uuid import UUID
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func, desc, and_, or_, asc
import logging

from . import models, schemas

logger = logging.getLogger(__name__)


# =============================================================================
# EXISTING CRUD ASSET CLASS - ENHANCED
# =============================================================================

class CRUDAsset:
    """CRUD operations for assets - ENHANCED with new fields"""

    def get(self, db: Session, asset_id: UUID) -> Optional[models.Asset]:
        """Get asset by ID with owner relationship"""
        return db.query(models.Asset)\
                 .options(joinedload(models.Asset.primary_owner))\
                 .filter(models.Asset.id == asset_id)\
                 .first()

    def get_by_hostname(self, db: Session, hostname: str) -> Optional[models.Asset]:
        """Get asset by hostname"""
        return db.query(models.Asset)\
                 .options(joinedload(models.Asset.primary_owner))\
                 .filter(models.Asset.hostname == hostname)\
                 .first()

    def get_by_fqdn(self, db: Session, fqdn: str) -> Optional[models.Asset]:
        """Get asset by FQDN"""
        return db.query(models.Asset)\
                 .options(joinedload(models.Asset.primary_owner))\
                 .filter(models.Asset.fqdn == fqdn)\
                 .first()

    def get_by_serial_and_vendor(self, db: Session, serial_number: str, vendor: str) -> Optional[models.Asset]:
        """Get asset by serial number and vendor combination"""
        return db.query(models.Asset)\
                 .options(joinedload(models.Asset.primary_owner))\
                 .filter(
                     models.Asset.serial_number == serial_number,
                     models.Asset.vendor == vendor
                 )\
                 .first()

    def get_multi(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        status: Optional[str] = None,
        asset_type: Optional[str] = None,
        vendor: Optional[str] = None,
        sort_by: str = "hostname",
        sort_order: str = "asc",
        # NEW ENHANCED FILTERS
        search_params: Optional[schemas.AssetSearchParams] = None
    ) -> Tuple[List[models.Asset], int]:
        """
        Get multiple assets with filtering and pagination
        ENHANCED: Now supports advanced search parameters
        """
        query = db.query(models.Asset)\
                  .options(joinedload(models.Asset.primary_owner))

        # EXISTING search logic (backward compatibility)
        if search:
            search_filter = or_(
                models.Asset.hostname.ilike(f"%{search}%"),
                models.Asset.serial_number.ilike(f"%{search}%"),
                models.Asset.vendor.ilike(f"%{search}%"),
                models.Asset.model.ilike(f"%{search}%"),
                models.Asset.location.ilike(f"%{search}%")
            )
            query = query.filter(search_filter)

        # EXISTING filters (backward compatibility)
        if status:
            query = query.filter(models.Asset.status == status)
        if asset_type:
            query = query.filter(models.Asset.type == asset_type)
        if vendor:
            query = query.filter(models.Asset.vendor.ilike(f"%{vendor}%"))

        # NEW ENHANCED search parameters
        if search_params:
            if search_params.search and not search:  # Don't duplicate search
                search_filter = or_(
                    models.Asset.hostname.ilike(f"%{search_params.search}%"),
                    models.Asset.serial_number.ilike(f"%{search_params.search}%"),
                    models.Asset.vendor.ilike(f"%{search_params.search}%"),
                    models.Asset.model.ilike(f"%{search_params.search}%"),
                    models.Asset.location.ilike(f"%{search_params.search}%")
                )
                query = query.filter(search_filter)

            if search_params.type and not asset_type:
                query = query.filter(models.Asset.type == search_params.type)

            if search_params.status and not status:
                query = query.filter(models.Asset.status == search_params.status)

            if search_params.location:
                query = query.filter(models.Asset.location.ilike(f"%{search_params.location}%"))

            if search_params.owner_id:
                query = query.filter(models.Asset.primary_owner_id == search_params.owner_id)

            if search_params.has_applications is not None:
                if search_params.has_applications:
                    query = query.join(models.application_assets)
                else:
                    query = query.outerjoin(models.application_assets)\
                                 .filter(models.application_assets.c.asset_id.is_(None))

            if search_params.has_notes is not None:
                if search_params.has_notes:
                    query = query.filter(models.Asset.notes.isnot(None))
                    query = query.filter(models.Asset.notes != '')
                else:
                    query = query.filter(or_(
                        models.Asset.notes.is_(None),
                        models.Asset.notes == ''
                    ))

        # Count total before applying limit
        total = query.count()

        # EXISTING sorting logic (backward compatibility)
        sort_column = getattr(models.Asset, sort_by, models.Asset.hostname)
        if sort_order.lower() == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))

        # Apply pagination
        assets = query.offset(skip).limit(limit).all()

        return assets, total

    def create(self, db: Session, *, obj_in: schemas.AssetCreate) -> models.Asset:
        """
        Create new asset - ENHANCED with application associations
        """
        # Extract application_ids before creating the model
        application_ids = getattr(obj_in, 'application_ids', [])
        asset_data = obj_in.model_dump(exclude={'application_ids', 'mgmt_credentials', 'os_credentials'})

        # Create asset
        db_obj = models.Asset(**asset_data)
        db.add(db_obj)
        db.flush()  # Get the ID without committing

        # Associate with applications
        if application_ids:
            applications = db.query(models.Application).filter(
                models.Application.id.in_(application_ids)
            ).all()
            db_obj.applications = applications

        db.commit()
        db.refresh(db_obj)
        logger.info(f"Created asset: {db_obj.hostname} with {len(application_ids)} applications")
        return db_obj

    def update(
        self,
        db: Session,
        *,
        db_obj: models.Asset,
        obj_in: schemas.AssetUpdate
    ) -> models.Asset:
        """
        Update existing asset - ENHANCED with application associations
        """
        update_data = obj_in.model_dump(exclude_unset=True, exclude={'application_ids'})

        # Update basic fields
        for field, value in update_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)

        # Update application associations if provided
        if hasattr(obj_in, 'application_ids') and obj_in.application_ids is not None:
            applications = db.query(models.Application).filter(
                models.Application.id.in_(obj_in.application_ids)
            ).all()
            db_obj.applications = applications

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        logger.info(f"Updated asset: {db_obj.hostname}")
        return db_obj

    def delete(self, db: Session, *, asset_id: UUID) -> models.Asset:
        """Soft delete asset by setting status to retired"""
        asset = self.get(db, asset_id)
        if asset:
            asset.status = models.AssetStatus.retired
            db.add(asset)
            db.commit()
            logger.info(f"Soft deleted asset: {asset.hostname}")
        return asset

    def upsert(self, db: Session, *, obj_in: schemas.AssetCreate) -> Tuple[models.Asset, bool]:
        """
        EXISTING upsert logic - ENHANCED to handle new fields
        Create or update asset based on natural key matching

        Matching priority:
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

    # NEW ENHANCED METHODS
    def get_with_full_details(self, db: Session, asset_id: UUID) -> Optional[models.Asset]:
        """Get asset with all relationship details"""
        return db.query(models.Asset)\
                 .options(
                     joinedload(models.Asset.primary_owner),
                     selectinload(models.Asset.management_controllers),
                     selectinload(models.Asset.applications).joinedload(models.Application.primary_contact)
                 )\
                 .filter(models.Asset.id == asset_id)\
                 .first()

    def get_by_owner(self, db: Session, owner_id: UUID) -> List[models.Asset]:
        """Get all assets owned by a specific user"""
        return db.query(models.Asset)\
                 .options(joinedload(models.Asset.primary_owner))\
                 .filter(models.Asset.primary_owner_id == owner_id)\
                 .order_by(models.Asset.hostname)\
                 .all()

    def bulk_update(
        self,
        db: Session,
        *,
        asset_ids: List[UUID],
        updates: schemas.AssetUpdate
    ) -> List[models.Asset]:
        """Bulk update multiple assets"""
        update_data = updates.model_dump(exclude_unset=True, exclude={'application_ids'})

        # Update basic fields for all assets
        if update_data:
            db.query(models.Asset)\
              .filter(models.Asset.id.in_(asset_ids))\
              .update(update_data, synchronize_session=False)

        # Handle application associations if provided
        if hasattr(updates, 'application_ids') and updates.application_ids is not None:
            applications = db.query(models.Application).filter(
                models.Application.id.in_(updates.application_ids)
            ).all()

            assets = db.query(models.Asset).filter(models.Asset.id.in_(asset_ids)).all()
            for asset in assets:
                asset.applications = applications

        db.commit()

        # Return updated assets
        updated_assets = db.query(models.Asset)\
                           .options(joinedload(models.Asset.primary_owner))\
                           .filter(models.Asset.id.in_(asset_ids))\
                           .all()

        logger.info(f"Bulk updated {len(updated_assets)} assets")
        return updated_assets


# =============================================================================
# EXISTING CRUD MANAGEMENT CONTROLLER CLASS - UNCHANGED
# =============================================================================

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
        logger.info(f"Updated management controller: {db_obj.type} at {db_obj.address}")
        return db_obj

    def delete(self, db: Session, *, controller_id: UUID) -> models.ManagementController:
        """Delete management controller"""
        controller = self.get(db, controller_id)
        if controller:
            db.delete(controller)
            db.commit()
            logger.info(f"Deleted management controller: {controller.type} at {controller.address}")
        return controller


# =============================================================================
# EXISTING CRUD AUDIT LOG CLASS - UNCHANGED
# =============================================================================

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
        """Create new audit log entry"""
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
        return db_obj

    def get_multi(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        resource_type: Optional[str] = None,
        resource_id: Optional[UUID] = None
    ) -> Tuple[List[models.AuditLog], int]:
        """Get multiple audit logs with optional filtering"""
        query = db.query(models.AuditLog)

        if resource_type:
            query = query.filter(models.AuditLog.resource_type == resource_type)

        if resource_id:
            query = query.filter(models.AuditLog.resource_id == resource_id)

        total = query.count()

        # Order by timestamp descending (newest first)
        logs = query.order_by(desc(models.AuditLog.timestamp)).offset(skip).limit(limit).all()

        return logs, total


# =============================================================================
# NEW USER CRUD OPERATIONS
# =============================================================================

class CRUDUser:
    """CRUD operations for users - NEW"""

    def get(self, db: Session, user_id: UUID) -> Optional[models.User]:
        """Get user by ID"""
        return db.query(models.User).filter(models.User.id == user_id).first()

    def get_by_username(self, db: Session, username: str) -> Optional[models.User]:
        """Get user by username"""
        return db.query(models.User).filter(models.User.username == username).first()

    def get_by_email(self, db: Session, email: str) -> Optional[models.User]:
        """Get user by email"""
        return db.query(models.User).filter(models.User.email == email).first()

    def get_multi(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        active_only: bool = True,
        search: Optional[str] = None
    ) -> List[models.User]:
        """Get multiple users with optional filtering"""
        query = db.query(models.User)

        if active_only:
            query = query.filter(models.User.active == True)

        if search:
            search_filter = or_(
                models.User.username.ilike(f"%{search}%"),
                models.User.full_name.ilike(f"%{search}%"),
                models.User.email.ilike(f"%{search}%"),
                models.User.department.ilike(f"%{search}%")
            )
            query = query.filter(search_filter)

        return query.order_by(models.User.full_name).offset(skip).limit(limit).all()

    def create(self, db: Session, *, obj_in: schemas.UserCreate) -> models.User:
        """Create new user"""
        db_obj = models.User(**obj_in.model_dump())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        logger.info(f"Created user: {db_obj.username} ({db_obj.full_name})")
        return db_obj

    def update(
        self,
        db: Session,
        *,
        db_obj: models.User,
        obj_in: schemas.UserUpdate
    ) -> models.User:
        """Update existing user"""
        update_data = obj_in.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        logger.info(f"Updated user: {db_obj.username}")
        return db_obj

    def delete(self, db: Session, *, user_id: UUID) -> models.User:
        """Soft delete user (set active=False)"""
        db_obj = self.get(db, user_id)
        if db_obj:
            db_obj.active = False
            db.add(db_obj)
            db.commit()
            logger.info(f"Deactivated user: {db_obj.username}")
        return db_obj


# =============================================================================
# NEW APPLICATION CRUD OPERATIONS
# =============================================================================

class CRUDApplication:
    """CRUD operations for applications - NEW"""

    def get(self, db: Session, application_id: UUID) -> Optional[models.Application]:
        """Get application by ID with relationships"""
        return db.query(models.Application)\
                 .options(joinedload(models.Application.primary_contact))\
                 .filter(models.Application.id == application_id)\
                 .first()

    def get_with_assets(self, db: Session, application_id: UUID) -> Optional[models.Application]:
        """Get application with full asset details"""
        return db.query(models.Application)\
                 .options(
                     joinedload(models.Application.primary_contact),
                     selectinload(models.Application.assets).joinedload(models.Asset.primary_owner)
                 )\
                 .filter(models.Application.id == application_id)\
                 .first()

    def get_by_name(self, db: Session, name: str, environment: str = None) -> Optional[models.Application]:
        """Get application by name and optionally environment"""
        query = db.query(models.Application).filter(models.Application.name == name)
        if environment:
            query = query.filter(models.Application.environment == environment)
        return query.first()

    def get_multi(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        search_params: Optional[schemas.ApplicationSearchParams] = None
    ) -> List[models.Application]:
        """Get multiple applications with filtering"""
        query = db.query(models.Application)\
                   .options(joinedload(models.Application.primary_contact))

        if search_params:
            if search_params.search:
                search_filter = or_(
                    models.Application.name.ilike(f"%{search_params.search}%"),
                    models.Application.description.ilike(f"%{search_params.search}%"),
                    models.Application.application_type.ilike(f"%{search_params.search}%")
                )
                query = query.filter(search_filter)

            if search_params.environment:
                query = query.filter(models.Application.environment == search_params.environment)

            if search_params.status:
                query = query.filter(models.Application.status == search_params.status)

            if search_params.criticality:
                query = query.filter(models.Application.criticality == search_params.criticality)

            if search_params.contact_id:
                query = query.filter(models.Application.primary_contact_id == search_params.contact_id)

            if search_params.has_assets is not None:
                if search_params.has_assets:
                    query = query.join(models.application_assets)
                else:
                    query = query.outerjoin(models.application_assets)\
                                 .filter(models.application_assets.c.application_id.is_(None))

        return query.order_by(models.Application.name).offset(skip).limit(limit).all()

    def create(self, db: Session, *, obj_in: schemas.ApplicationCreate) -> models.Application:
        """Create new application with asset associations"""
        # Extract asset_ids before creating the model
        asset_ids = obj_in.asset_ids
        application_data = obj_in.model_dump(exclude={'asset_ids'})

        # Create application
        db_obj = models.Application(**application_data)
        db.add(db_obj)
        db.flush()  # Get the ID without committing

        # Associate with assets
        if asset_ids:
            assets = db.query(models.Asset).filter(models.Asset.id.in_(asset_ids)).all()
            db_obj.assets = assets

        db.commit()
        db.refresh(db_obj)
        logger.info(f"Created application: {db_obj.name} with {len(asset_ids)} assets")
        return db_obj

    def update(
        self,
        db: Session,
        *,
        db_obj: models.Application,
        obj_in: schemas.ApplicationUpdate
    ) -> models.Application:
        """Update existing application"""
        update_data = obj_in.model_dump(exclude_unset=True, exclude={'asset_ids'})

        # Update basic fields
        for field, value in update_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)

        # Update asset associations if provided
        if obj_in.asset_ids is not None:
            assets = db.query(models.Asset).filter(models.Asset.id.in_(obj_in.asset_ids)).all()
            db_obj.assets = assets

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        logger.info(f"Updated application: {db_obj.name}")
        return db_obj

    def delete(self, db: Session, *, application_id: UUID) -> models.Application:
        """Delete application (removes associations automatically)"""
        db_obj = self.get(db, application_id)
        if db_obj:
            db.delete(db_obj)
            db.commit()
            logger.info(f"Deleted application: {db_obj.name}")
        return db_obj

    def add_asset(self, db: Session, *, application_id: UUID, asset_id: UUID) -> models.Application:
        """Add asset to application"""
        application = self.get(db, application_id)
        asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()

        if application and asset:
            if asset not in application.assets:
                application.assets.append(asset)
                db.commit()
                logger.info(f"Added asset {asset.hostname} to application {application.name}")

        return application

    def remove_asset(self, db: Session, *, application_id: UUID, asset_id: UUID) -> models.Application:
        """Remove asset from application"""
        application = self.get(db, application_id)
        asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()

        if application and asset and asset in application.assets:
            application.assets.remove(asset)
            db.commit()
            logger.info(f"Removed asset {asset.hostname} from application {application.name}")

        return application


# =============================================================================
# CRUD INSTANCES - EXISTING + NEW
# =============================================================================

# Existing instances (keep these exactly as they are)
asset_crud = CRUDAsset()
management_controller_crud = CRUDManagementController()
audit_log_crud = CRUDAuditLog()

# New instances for enhanced functionality
user_crud = CRUDUser()
application_crud = CRUDApplication()


# =============================================================================
# EXISTING UTILITY FUNCTIONS - UNCHANGED
# =============================================================================

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


# =============================================================================
# NEW UTILITY FUNCTIONS FOR ENHANCED FUNCTIONALITY
# =============================================================================

def log_user_change(
    db: Session,
    action: str,
    user: models.User,
    changes: Optional[Dict[str, Any]] = None,
    api_key_id: Optional[UUID] = None
) -> models.AuditLog:
    """Helper function to log user changes"""
    return audit_log_crud.create_log(
        db,
        action=action,
        resource_type="user",
        resource_id=user.id,
        changes=changes,
        api_key_id=api_key_id
    )


def log_application_change(
    db: Session,
    action: str,
    application: models.Application,
    changes: Optional[Dict[str, Any]] = None,
    api_key_id: Optional[UUID] = None
) -> models.AuditLog:
    """Helper function to log application changes"""
    return audit_log_crud.create_log(
        db,
        action=action,
        resource_type="application",
        resource_id=application.id,
        changes=changes,
        api_key_id=api_key_id
    )
