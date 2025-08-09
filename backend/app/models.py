"""
SQLAlchemy models for Computer Inventory System
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from uuid import uuid4
from datetime import datetime
from .database import Base


class Asset(Base):
    """
    Core inventory asset model
    Represents physical servers, workstations, and other hardware
    """
    __tablename__ = "assets"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, index=True)

    # Basic asset information
    hostname = Column(String(255), nullable=False, index=True)
    fqdn = Column(String(255), unique=True, nullable=True, index=True)
    serial_number = Column(String(100), nullable=True, index=True)
    vendor = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)

    # Asset type and status
    type = Column(
        String(50),
        CheckConstraint("type IN ('server', 'workstation', 'network', 'storage')"),
        nullable=False,
        default='server'
    )
    status = Column(
        String(50),
        CheckConstraint("status IN ('active', 'retired', 'maintenance')"),
        nullable=False,
        default='active',
        index=True
    )

    # Location and specifications
    location = Column(String(255), nullable=True)
    specs = Column(JSONB, nullable=False, default=dict)  # Flexible hardware specs

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

    # 1Password integration
    onepassword_secret_id = Column(String(255), nullable=True, index=True)
    onepassword_vault_id = Column(String(255), nullable=True)

    # Relationships
    management_controllers = relationship(
        "ManagementController",
        back_populates="asset",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Asset(id={self.id}, hostname={self.hostname}, type={self.type})>"


class ManagementController(Base):
    """
    Out-of-band management controllers (iLO, iDRAC, IPMI, etc.)
    """
    __tablename__ = "management_controllers"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, index=True)

    # Foreign key to asset
    asset_id = Column(
        UUID(as_uuid=True),
        ForeignKey("assets.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Controller information
    type = Column(
        String(50),
        CheckConstraint("type IN ('ilo', 'idrac', 'ipmi', 'redfish')"),
        nullable=False
    )
    address = Column(String(255), nullable=False)
    port = Column(Integer, nullable=False, default=443)
    ui_url = Column(String(500), nullable=True)
    credential_env_key = Column(String(100), nullable=True)

    # Timestamp
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

    # Credential storage options
    credential_onepassword_ref = Column(String(255), nullable=True)
    use_asset_credentials = Column(Boolean, nullable=False, default=False)

    # Relationships
    asset = relationship("Asset", back_populates="management_controllers")

    def __repr__(self):
        return f"<ManagementController(id={self.id}, type={self.type}, address={self.address})>"


class AuditLog(Base):
    """
    Audit log for tracking changes to resources
    """
    __tablename__ = "audit_logs"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, index=True)

    # Audit information
    action = Column(String(50), nullable=False)  # CREATE, UPDATE, DELETE
    resource_type = Column(String(50), nullable=False, index=True)  # asset, management_controller
    resource_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    changes = Column(JSONB, nullable=True)  # What changed (for updates)
    api_key_id = Column(UUID(as_uuid=True), nullable=True, index=True)  # Which API key made the change

    # Timestamp
    timestamp = Column(DateTime(timezone=True), default=func.now(), nullable=False, index=True)

    def __repr__(self):
        return f"<AuditLog(id={self.id}, action={self.action}, resource_type={self.resource_type})>"


class ApiKey(Base):
    """
    API keys for authentication
    """
    __tablename__ = "api_keys"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, index=True)

    # Key information
    key_hash = Column(String(255), nullable=False, unique=True)  # bcrypt hash
    name = Column(String(100), nullable=False)  # Human-readable name
    active = Column(Boolean, nullable=False, default=True, index=True)

    # Timestamp
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

    def __repr__(self):
        return f"<ApiKey(id={self.id}, name={self.name}, active={self.active})>"


# Database indexes for better performance
# These are created automatically by SQLAlchemy based on index=True parameters above
# Additional composite indexes can be added here if needed

"""
Additional indexes for performance (if needed in the future):

from sqlalchemy import Index

# Composite index for asset search
asset_search_idx = Index('ix_assets_search', Asset.hostname, Asset.serial_number, Asset.vendor)

# Composite index for audit logs by resource
audit_resource_idx = Index('ix_audit_resource', AuditLog.resource_type, AuditLog.resource_id)

# Time-based index for audit logs
audit_time_idx = Index('ix_audit_time', AuditLog.timestamp.desc())
"""

