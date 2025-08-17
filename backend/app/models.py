"""
Enhanced SQLAlchemy models for Computer Inventory System
Adds: User/Owner tracking, Notes, Application-to-Server mapping
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, CheckConstraint, Table
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from uuid import uuid4
from datetime import datetime
from .database import Base


# Association table for many-to-many relationship between applications and assets
application_assets = Table(
    'application_assets',
    Base.metadata,
    Column('application_id', UUID(as_uuid=True), ForeignKey('applications.id'), primary_key=True),
    Column('asset_id', UUID(as_uuid=True), ForeignKey('assets.id'), primary_key=True),
    Column('created_at', DateTime(timezone=True), default=func.now())
)


class User(Base):
    """
    System users/owners for asset assignment
    """
    __tablename__ = "users"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, index=True)

    # User information
    username = Column(String(100), nullable=False, unique=True, index=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True, index=True)
    department = Column(String(100), nullable=True)
    title = Column(String(100), nullable=True)

    # Status
    active = Column(Boolean, nullable=False, default=True, index=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    owned_assets = relationship("Asset", back_populates="primary_owner")

    def __repr__(self):
        return f"<User(id={self.id}, username={self.username}, full_name={self.full_name})>"


class Asset(Base):
    """
    Core inventory asset model - ENHANCED
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

    # NEW FIELDS - Enhanced functionality
    # Primary owner/user assignment
    primary_owner_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Free-form notes field
    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

    # 1Password integration (existing)
    onepassword_secret_id = Column(String(255), nullable=True, index=True)
    onepassword_vault_id = Column(String(255), nullable=True)

    # Relationships
    management_controllers = relationship(
        "ManagementController",
        back_populates="asset",
        cascade="all, delete-orphan"
    )

    # NEW RELATIONSHIPS
    primary_owner = relationship("User", back_populates="owned_assets")
    applications = relationship(
        "Application",
        secondary=application_assets,
        back_populates="assets"
    )

    def __repr__(self):
        return f"<Asset(id={self.id}, hostname={self.hostname}, type={self.type})>"


class Application(Base):
    """
    Applications/Services running on assets
    Maps applications to one or more servers
    """
    __tablename__ = "applications"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, index=True)

    # Application information
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    access_url = Column(String(500), nullable=True)
    internal_url = Column(String(500), nullable=True)  # For internal access

    # Application metadata
    environment = Column(
        String(50),
        CheckConstraint("environment IN ('production', 'staging', 'development', 'testing')"),
        nullable=False,
        default='production',
        index=True
    )

    application_type = Column(String(100), nullable=True)  # e.g., "web service", "database", "dns"
    version = Column(String(50), nullable=True)
    port = Column(Integer, nullable=True)

    # Status
    status = Column(
        String(50),
        CheckConstraint("status IN ('active', 'inactive', 'maintenance', 'deprecated')"),
        nullable=False,
        default='active',
        index=True
    )

    # Contact information
    primary_contact_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Additional metadata
    notes = Column(Text, nullable=True)
    criticality = Column(
        String(20),
        CheckConstraint("criticality IN ('low', 'medium', 'high', 'critical')"),
        nullable=False,
        default='medium',
        index=True
    )

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    assets = relationship(
        "Asset",
        secondary=application_assets,
        back_populates="applications"
    )

    primary_contact = relationship("User")

    def __repr__(self):
        return f"<Application(id={self.id}, name={self.name}, environment={self.environment})>"


class ManagementController(Base):
    """
    Out-of-band management controllers (iLO, iDRAC, IPMI, etc.) - UNCHANGED
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

    # Credential storage options (existing)
    credential_onepassword_ref = Column(String(255), nullable=True)
    use_asset_credentials = Column(Boolean, nullable=False, default=False)

    # Relationships
    asset = relationship("Asset", back_populates="management_controllers")

    def __repr__(self):
        return f"<ManagementController(id={self.id}, type={self.type}, address={self.address})>"


class AuditLog(Base):
    """
    Audit log for tracking changes to resources - UNCHANGED
    """
    __tablename__ = "audit_logs"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, index=True)

    # Audit information
    action = Column(String(50), nullable=False)  # CREATE, UPDATE, DELETE
    resource_type = Column(String(50), nullable=False, index=True)  # asset, management_controller, application, user
    resource_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    changes = Column(JSONB, nullable=True)  # What changed (for updates)
    api_key_id = Column(UUID(as_uuid=True), nullable=True, index=True)  # Which API key made the change

    # Timestamp
    timestamp = Column(DateTime(timezone=True), default=func.now(), nullable=False, index=True)

    def __repr__(self):
        return f"<AuditLog(id={self.id}, action={self.action}, resource_type={self.resource_type})>"


class ApiKey(Base):
    """
    API keys for authentication - UNCHANGED
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
