"""
Complete Pydantic schemas for Computer Inventory System API
Combines existing functionality with enhanced User/Application tracking
"""
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, Dict, Any, List, Union
from datetime import datetime
from uuid import UUID
from enum import Enum


# =============================================================================
# ENUMS - EXISTING AND NEW
# =============================================================================

# Existing enums
class AssetType(str, Enum):
    server = "server"
    workstation = "workstation"
    network = "network"
    storage = "storage"


class AssetStatus(str, Enum):
    active = "active"
    retired = "retired"
    maintenance = "maintenance"


class ManagementControllerType(str, Enum):
    ilo = "ilo"
    idrac = "idrac"
    ipmi = "ipmi"
    redfish = "redfish"


# NEW enums for enhanced functionality
class ApplicationEnvironment(str, Enum):
    PRODUCTION = "production"
    STAGING = "staging"
    DEVELOPMENT = "development"
    TESTING = "testing"


class ApplicationStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"
    DEPRECATED = "deprecated"


class Criticality(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# =============================================================================
# BASE SCHEMAS
# =============================================================================

class BaseSchema(BaseModel):
    """Base schema with common configuration"""
    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
        validate_assignment=True,
        str_strip_whitespace=True
    )


# =============================================================================
# USER SCHEMAS - NEW
# =============================================================================

class UserBase(BaseSchema):
    """Base user schema"""
    username: str = Field(..., min_length=3, max_length=100, description="Unique username")
    full_name: str = Field(..., min_length=1, max_length=255, description="Full name")
    email: Optional[str] = Field(None, max_length=255, description="Email address")
    department: Optional[str] = Field(None, max_length=100, description="Department")
    title: Optional[str] = Field(None, max_length=100, description="Job title")
    active: bool = Field(True, description="User is active")

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if v and '@' not in v:
            raise ValueError('Invalid email format')
        return v


class UserCreate(UserBase):
    """Schema for creating users"""
    pass


class UserUpdate(BaseSchema):
    """Schema for updating users"""
    username: Optional[str] = Field(None, min_length=3, max_length=100)
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    department: Optional[str] = Field(None, max_length=100)
    title: Optional[str] = Field(None, max_length=100)
    active: Optional[bool] = None

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if v and '@' not in v:
            raise ValueError('Invalid email format')
        return v


class UserResponse(UserBase):
    """Schema for user responses"""
    id: UUID
    created_at: datetime
    updated_at: datetime


# =============================================================================
# APPLICATION SCHEMAS - NEW
# =============================================================================

class ApplicationBase(BaseSchema):
    """Base application schema"""
    name: str = Field(..., min_length=1, max_length=255, description="Application name")
    description: Optional[str] = Field(None, description="Application description")
    access_url: Optional[str] = Field(None, max_length=500, description="External access URL")
    internal_url: Optional[str] = Field(None, max_length=500, description="Internal access URL")
    environment: ApplicationEnvironment = Field(ApplicationEnvironment.PRODUCTION, description="Environment")
    application_type: Optional[str] = Field(None, max_length=100, description="Application type")
    version: Optional[str] = Field(None, max_length=50, description="Version")
    port: Optional[int] = Field(None, ge=1, le=65535, description="Primary port")
    status: ApplicationStatus = Field(ApplicationStatus.ACTIVE, description="Application status")
    primary_contact_id: Optional[UUID] = Field(None, description="Primary contact user ID")
    notes: Optional[str] = Field(None, description="Free-form notes")
    criticality: Criticality = Field(Criticality.MEDIUM, description="Criticality level")


class ApplicationCreate(ApplicationBase):
    """Schema for creating applications"""
    asset_ids: List[UUID] = Field(default_factory=list, description="List of asset IDs to associate")


class ApplicationUpdate(BaseSchema):
    """Schema for updating applications"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    access_url: Optional[str] = Field(None, max_length=500)
    internal_url: Optional[str] = Field(None, max_length=500)
    environment: Optional[ApplicationEnvironment] = None
    application_type: Optional[str] = Field(None, max_length=100)
    version: Optional[str] = Field(None, max_length=50)
    port: Optional[int] = Field(None, ge=1, le=65535)
    status: Optional[ApplicationStatus] = None
    primary_contact_id: Optional[UUID] = None
    notes: Optional[str] = None
    criticality: Optional[Criticality] = None
    asset_ids: Optional[List[UUID]] = Field(None, description="List of asset IDs to associate")


class ApplicationResponse(ApplicationBase):
    """Schema for application responses"""
    id: UUID
    created_at: datetime
    updated_at: datetime
    # Include basic info about primary contact and assets
    primary_contact: Optional[UserResponse] = None
    asset_count: int = Field(0, description="Number of associated assets")


class ApplicationWithAssets(ApplicationResponse):
    """Application response with full asset details"""
    assets: List['AssetResponse'] = Field(default_factory=list)


# =============================================================================
# ASSET SCHEMAS - ENHANCED (keeping existing + adding new fields)
# =============================================================================

class AssetBase(BaseSchema):
    """Base asset schema with common fields - ENHANCED"""
    hostname: str = Field(..., min_length=1, max_length=255, description="Asset hostname")
    fqdn: Optional[str] = Field(None, max_length=255, description="Fully qualified domain name")
    serial_number: Optional[str] = Field(None, max_length=100, description="Serial number")
    vendor: Optional[str] = Field(None, max_length=100, description="Hardware vendor")
    model: Optional[str] = Field(None, max_length=100, description="Hardware model")
    type: AssetType = Field(AssetType.server, description="Asset type")
    status: AssetStatus = Field(AssetStatus.active, description="Asset status")
    location: Optional[str] = Field(None, max_length=255, description="Physical location")
    specs: Dict[str, Any] = Field(default_factory=dict, description="Hardware specifications (JSON)")

    # NEW ENHANCED FIELDS
    primary_owner_id: Optional[UUID] = Field(None, description="Primary owner/user ID")
    notes: Optional[str] = Field(None, description="Free-form notes about the asset")

    # EXISTING 1Password integration fields for requests
    mgmt_credentials: Optional[Dict[str, str]] = Field(None, description="Management controller credentials")
    os_credentials: Optional[Dict[str, str]] = Field(None, description="OS credentials")

    @field_validator('hostname')
    @classmethod
    def validate_hostname(cls, v):
        if not v or not v.strip():
            raise ValueError('Hostname cannot be empty')
        return v.strip()

    @field_validator('fqdn')
    @classmethod
    def validate_fqdn(cls, v):
        if v:
            v = v.strip().lower()
            if not v:
                return None
            # Basic FQDN validation (can be enhanced)
            if '.' not in v:
                raise ValueError('FQDN must contain at least one dot')
        return v

    @field_validator('serial_number', 'vendor', 'model', 'location', 'notes')
    @classmethod
    def validate_strings(cls, v):
        if v:
            v = v.strip()
            return v if v else None
        return v


class AssetCreate(AssetBase):
    """Schema for creating assets - ENHANCED"""
    application_ids: List[UUID] = Field(default_factory=list, description="List of application IDs to associate")


class AssetUpdate(BaseSchema):
    """Schema for updating assets (all fields optional) - ENHANCED"""
    hostname: Optional[str] = Field(None, min_length=1, max_length=255)
    fqdn: Optional[str] = Field(None, max_length=255)
    serial_number: Optional[str] = Field(None, max_length=100)
    vendor: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    type: Optional[AssetType] = None
    status: Optional[AssetStatus] = None
    location: Optional[str] = Field(None, max_length=255)
    specs: Optional[Dict[str, Any]] = None

    # NEW ENHANCED FIELDS
    primary_owner_id: Optional[UUID] = None
    notes: Optional[str] = None
    application_ids: Optional[List[UUID]] = Field(None, description="List of application IDs to associate")

    # Apply same validators as AssetBase
    @field_validator('hostname')
    @classmethod
    def validate_hostname(cls, v):
        if v is not None:
            if not v or not v.strip():
                raise ValueError('Hostname cannot be empty')
            return v.strip()
        return v

    @field_validator('fqdn')
    @classmethod
    def validate_fqdn(cls, v):
        if v is not None:
            v = v.strip().lower()
            if v and '.' not in v:
                raise ValueError('FQDN must contain at least one dot')
        return v

    @field_validator('serial_number', 'vendor', 'model', 'location', 'notes')
    @classmethod
    def validate_strings(cls, v):
        if v is not None:
            v = v.strip()
            return v if v else None
        return v


class AssetResponse(AssetBase):
    """Schema for asset responses - ENHANCED"""
    id: UUID
    created_at: datetime
    updated_at: datetime

    # EXISTING 1Password fields in response
    onepassword_secret_id: Optional[str] = None
    has_onepassword_secret: bool = Field(False, description="Whether asset has 1Password secret")

    # NEW ENHANCED RESPONSE FIELDS
    primary_owner: Optional[UserResponse] = None
    application_count: int = Field(0, description="Number of associated applications")


class AssetWithControllers(AssetResponse):
    """Asset response with management controllers included - ENHANCED"""
    management_controllers: List['ManagementControllerResponse'] = Field(default_factory=list)


class AssetWithDetails(AssetResponse):
    """Asset response with full relationship details - NEW"""
    management_controllers: List['ManagementControllerResponse'] = Field(default_factory=list)
    applications: List[ApplicationResponse] = Field(default_factory=list)


# =============================================================================
# MANAGEMENT CONTROLLER SCHEMAS - EXISTING (unchanged)
# =============================================================================

class ManagementControllerBase(BaseSchema):
    """Base management controller schema"""
    type: ManagementControllerType = Field(..., description="Controller type")
    address: str = Field(..., min_length=1, max_length=255, description="IP address or hostname")
    port: int = Field(443, ge=1, le=65535, description="Port number")
    ui_url: Optional[str] = Field(None, max_length=500, description="Web UI URL")
    credential_env_key: Optional[str] = Field(None, max_length=100, description="Environment variable for credentials")
    # Enhanced credential options
    credential_onepassword_ref: Optional[str] = Field(None, description="1Password secret reference")
    use_asset_credentials: bool = Field(False, description="Use parent asset's credentials")


class ManagementControllerCreate(ManagementControllerBase):
    """Schema for creating management controllers"""
    pass


class ManagementControllerUpdate(BaseSchema):
    """Schema for updating management controllers"""
    type: Optional[ManagementControllerType] = None
    address: Optional[str] = Field(None, min_length=1, max_length=255)
    port: Optional[int] = Field(None, ge=1, le=65535)
    ui_url: Optional[str] = Field(None, max_length=500)
    credential_env_key: Optional[str] = Field(None, max_length=100)
    credential_onepassword_ref: Optional[str] = None
    use_asset_credentials: Optional[bool] = None


class ManagementControllerResponse(ManagementControllerBase):
    """Schema for management controller responses"""
    id: UUID
    asset_id: UUID
    created_at: datetime


# =============================================================================
# SEARCH AND FILTER SCHEMAS - NEW
# =============================================================================

class AssetSearchParams(BaseSchema):
    """Parameters for asset search and filtering"""
    search: Optional[str] = Field(None, description="Search in hostname, serial, vendor, model")
    type: Optional[AssetType] = None
    status: Optional[AssetStatus] = None
    location: Optional[str] = None
    owner_id: Optional[UUID] = None
    has_applications: Optional[bool] = None
    has_notes: Optional[bool] = None


class ApplicationSearchParams(BaseSchema):
    """Parameters for application search and filtering"""
    search: Optional[str] = Field(None, description="Search in name, description")
    environment: Optional[ApplicationEnvironment] = None
    status: Optional[ApplicationStatus] = None
    criticality: Optional[Criticality] = None
    contact_id: Optional[UUID] = None
    has_assets: Optional[bool] = None


# =============================================================================
# BULK OPERATIONS SCHEMAS - NEW
# =============================================================================

class BulkAssetUpdate(BaseSchema):
    """Schema for bulk asset updates"""
    asset_ids: List[UUID] = Field(..., min_items=1, description="Asset IDs to update")
    updates: AssetUpdate = Field(..., description="Updates to apply")


class BulkApplicationAssignment(BaseSchema):
    """Schema for bulk application-asset assignments"""
    application_id: UUID = Field(..., description="Application ID")
    asset_ids: List[UUID] = Field(..., min_items=1, description="Asset IDs to assign")


# =============================================================================
# EXISTING API RESPONSE SCHEMAS - KEEPING ALL
# =============================================================================

class UpsertResponse(BaseSchema):
    """Response for upsert operations"""
    asset: AssetResponse
    created: bool = Field(..., description="True if asset was created, False if updated")


class PaginationMeta(BaseSchema):
    """Pagination metadata"""
    total: int = Field(..., description="Total number of items")
    page: int = Field(..., description="Current page number")
    per_page: int = Field(..., description="Items per page")
    pages: int = Field(..., description="Total number of pages")


class ApiResponse(BaseSchema):
    """Generic API response wrapper"""
    data: Union[Dict[str, Any], List[Dict[str, Any]], AssetResponse, List[AssetResponse]]
    meta: Optional[PaginationMeta] = None


class AssetListResponse(BaseSchema):
    """Response for asset list endpoints"""
    data: List[AssetResponse]
    meta: PaginationMeta


class ErrorResponse(BaseSchema):
    """Error response schema"""
    error: str = Field(..., description="Error message")
    details: Optional[str] = Field(None, description="Additional error details")
    code: Optional[str] = Field(None, description="Error code")


class HealthCheckResponse(BaseSchema):
    """Health check response"""
    status: str = Field(..., description="Service status")
    timestamp: datetime = Field(..., description="Check timestamp")
    version: str = Field(..., description="Application version")
    database: str = Field(..., description="Database status")


class AuditLogResponse(BaseSchema):
    """Audit log response schema"""
    id: UUID
    action: str
    resource_type: str
    resource_id: UUID
    changes: Optional[Dict[str, Any]]
    api_key_id: Optional[UUID]
    timestamp: datetime


# =============================================================================
# EXISTING 1PASSWORD INTEGRATION SCHEMAS - KEEPING ALL
# =============================================================================

class CredentialCreate(BaseModel):
    """Create credentials for an asset"""
    mgmt_credentials: Optional[Dict[str, str]] = None
    os_credentials: Optional[Dict[str, str]] = None


class CredentialResponse(BaseModel):
    """Credential response"""
    asset_id: UUID
    has_credentials: bool
    credential_reference: Optional[str] = None
    last_updated: Optional[datetime] = None


class OnePasswordHealth(BaseModel):
    """1Password Connect health status"""
    enabled: bool
    connected: bool
    vault_accessible: bool
    last_check: datetime
    error: Optional[str] = None


# =============================================================================
# FORWARD REFERENCES - UPDATE FOR NEW SCHEMAS
# =============================================================================

# Update forward references for all schemas with relationships
AssetWithControllers.model_rebuild()
AssetWithDetails.model_rebuild()
ApplicationWithAssets.model_rebuild()
