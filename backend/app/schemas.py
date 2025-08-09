"""
Pydantic schemas for Computer Inventory System API
"""
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, Dict, Any, List, Union
from datetime import datetime
from uuid import UUID
from enum import Enum


# Enums for validation
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


# =============================================================================
# BASE SCHEMAS
# =============================================================================

class BaseSchema(BaseModel):
    """Base schema with common configuration"""
    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
        validate_assignment=True
    )


# =============================================================================
# ASSET SCHEMAS
# =============================================================================

class AssetBase(BaseSchema):
    """Base asset schema with common fields"""
    hostname: str = Field(..., min_length=1, max_length=255, description="Asset hostname")
    fqdn: Optional[str] = Field(None, max_length=255, description="Fully qualified domain name")
    serial_number: Optional[str] = Field(None, max_length=100, description="Serial number")
    vendor: Optional[str] = Field(None, max_length=100, description="Hardware vendor")
    model: Optional[str] = Field(None, max_length=100, description="Hardware model")
    type: AssetType = Field(AssetType.server, description="Asset type")
    status: AssetStatus = Field(AssetStatus.active, description="Asset status")
    location: Optional[str] = Field(None, max_length=255, description="Physical location")
    specs: Dict[str, Any] = Field(default_factory=dict, description="Hardware specifications (JSON)")
    # Optional 1Password integration fields for requests
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

    @field_validator('serial_number', 'vendor', 'model', 'location')
    @classmethod
    def validate_strings(cls, v):
        if v:
            v = v.strip()
            return v if v else None
        return v


class AssetCreate(AssetBase):
    """Schema for creating assets"""
    pass


class AssetUpdate(BaseSchema):
    """Schema for updating assets (all fields optional)"""
    hostname: Optional[str] = Field(None, min_length=1, max_length=255)
    fqdn: Optional[str] = Field(None, max_length=255)
    serial_number: Optional[str] = Field(None, max_length=100)
    vendor: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    type: Optional[AssetType] = None
    status: Optional[AssetStatus] = None
    location: Optional[str] = Field(None, max_length=255)
    specs: Optional[Dict[str, Any]] = None

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

    @field_validator('serial_number', 'vendor', 'model', 'location')
    @classmethod
    def validate_strings(cls, v):
        if v is not None:
            v = v.strip()
            return v if v else None
        return v


class AssetResponse(AssetBase):
    """Schema for asset responses"""
    id: UUID
    created_at: datetime
    updated_at: datetime
    # 1Password fields in response
    onepassword_secret_id: Optional[str] = None
    has_onepassword_secret: bool = Field(False, description="Whether asset has 1Password secret")



class AssetWithControllers(AssetResponse):
    """Asset response with management controllers included"""
    management_controllers: List['ManagementControllerResponse'] = Field(default_factory=list)


# =============================================================================
# MANAGEMENT CONTROLLER SCHEMAS
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
    use_asset_credentials: bool = Field(False, description="Use asset-level credentials from 1Password")


    @field_validator('address')
    @classmethod
    def validate_address(cls, v):
        if not v or not v.strip():
            raise ValueError('Address cannot be empty')
        return v.strip()

    @field_validator('ui_url')
    @classmethod
    def validate_ui_url(cls, v):
        if v:
            v = v.strip()
            if v and not (v.startswith('http://') or v.startswith('https://')):
                raise ValueError('UI URL must start with http:// or https://')
        return v


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

    # Apply same validators as base
    @field_validator('address')
    @classmethod
    def validate_address(cls, v):
        if v is not None:
            if not v or not v.strip():
                raise ValueError('Address cannot be empty')
            return v.strip()
        return v

    @field_validator('ui_url')
    @classmethod
    def validate_ui_url(cls, v):
        if v is not None:
            v = v.strip()
            if v and not (v.startswith('http://') or v.startswith('https://')):
                raise ValueError('UI URL must start with http:// or https://')
        return v


class ManagementControllerResponse(ManagementControllerBase):
    """Schema for management controller responses"""
    id: UUID
    asset_id: UUID
    created_at: datetime


# =============================================================================
# UPSERT SCHEMAS
# =============================================================================

class UpsertResponse(BaseSchema):
    """Response for upsert operations"""
    asset: AssetResponse
    created: bool = Field(..., description="True if asset was created, False if updated")


# =============================================================================
# API RESPONSE WRAPPERS
# =============================================================================

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


# =============================================================================
# ERROR SCHEMAS
# =============================================================================

class ErrorResponse(BaseSchema):
    """Error response schema"""
    error: str = Field(..., description="Error message")
    details: Optional[str] = Field(None, description="Additional error details")
    code: Optional[str] = Field(None, description="Error code")


# =============================================================================
# HEALTH CHECK SCHEMA
# =============================================================================

class HealthCheckResponse(BaseSchema):
    """Health check response"""
    status: str = Field(..., description="Service status")
    timestamp: datetime = Field(..., description="Check timestamp")
    version: str = Field(..., description="Application version")
    database: str = Field(..., description="Database status")


# =============================================================================
# AUDIT LOG SCHEMAS
# =============================================================================

class AuditLogResponse(BaseSchema):
    """Audit log response schema"""
    id: UUID
    action: str
    resource_type: str
    resource_id: UUID
    changes: Optional[Dict[str, Any]]
    api_key_id: Optional[UUID]
    timestamp: datetime


# Update forward references
AssetWithControllers.model_rebuild()
