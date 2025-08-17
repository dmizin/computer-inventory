// lib/types.ts - Enhanced types to match API response
export type AssetType = 'server' | 'workstation' | 'network' | 'storage';
export type AssetStatus = 'active' | 'retired' | 'maintenance';
export type ManagementControllerType = 'ilo' | 'idrac' | 'ipmi' | 'redfish';
export type ApplicationType = 'web' | 'database' | 'api' | 'documentation' | 'monitoring' | 'other';
export type Environment = 'development' | 'staging' | 'production';
export type Criticality = 'low' | 'medium' | 'high' | 'critical';

// User interface
export interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  department?: string | null;
  title?: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Application interface
export interface Application {
  id: string;
  name: string;
  description?: string | null;
  access_url?: string | null;
  internal_url?: string | null;
  environment: Environment;
  application_type: ApplicationType;
  version?: string | null;
  port?: number | null;
  status: AssetStatus;
  primary_contact_id?: string | null;
  notes?: string | null;
  criticality: Criticality;
  created_at: string;
  updated_at: string;
  primary_contact?: User | null;
  asset_count?: number;
}

// Base asset interface
export interface Asset {
  id: string;
  hostname: string;
  fqdn?: string | null;
  serial_number?: string | null;
  vendor?: string | null;
  model?: string | null;
  type: AssetType;
  status: AssetStatus;
  location?: string | null;
  specs: Record<string, any>;
  primary_owner_id?: string | null;
  notes?: string | null;
  mgmt_credentials?: string | null;
  os_credentials?: string | null;
  onepassword_secret_id?: string | null;
  has_onepassword_secret?: boolean;
  created_at: string;
  updated_at: string;
}

// Management controller interface
export interface ManagementController {
  id: string;
  asset_id: string;
  type: ManagementControllerType;
  address: string;
  port: number;
  ui_url?: string | null;
  credential_env_key?: string | null;
  created_at: string;
}

// Asset with full details (for detail view)
export interface AssetWithDetails extends Asset {
  primary_owner?: User | null;
  application_count?: number;
  management_controllers: ManagementController[];
  applications: Application[];
}

// Application with full details (for detail view)
export interface ApplicationWithAssets extends Application {
  assets: Asset[];
}

// Pagination metadata
export interface PaginationMeta {
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

// API Request types
export interface AssetCreateRequest {
  hostname: string;
  fqdn?: string | null;
  serial_number?: string | null;
  vendor?: string | null;
  model?: string | null;
  type: AssetType;
  status?: AssetStatus;
  location?: string | null;
  specs?: Record<string, any>;
  primary_owner_id?: string | null;
  notes?: string | null;
}

export interface AssetUpdateRequest {
  hostname?: string;
  fqdn?: string | null;
  serial_number?: string | null;
  vendor?: string | null;
  model?: string | null;
  type?: AssetType;
  status?: AssetStatus;
  location?: string | null;
  specs?: Record<string, any>;
  primary_owner_id?: string | null;
  notes?: string | null;
  application_ids?: string[];
}

export interface UserCreateRequest {
  username: string;
  full_name: string;
  email: string;
  department?: string | null;
  title?: string | null;
  active?: boolean;
}

export interface UserUpdateRequest {
  username?: string;
  full_name?: string;
  email?: string;
  department?: string | null;
  title?: string | null;
  active?: boolean;
}

export interface ApplicationCreateRequest {
  name: string;
  description?: string | null;
  access_url?: string | null;
  internal_url?: string | null;
  environment: Environment;
  application_type: ApplicationType;
  version?: string | null;
  port?: number | null;
  status?: AssetStatus;
  primary_contact_id?: string | null;
  notes?: string | null;
  criticality?: Criticality;
  asset_ids?: string[];
}

export interface ApplicationUpdateRequest {
  name?: string;
  description?: string | null;
  access_url?: string | null;
  internal_url?: string | null;
  environment?: Environment;
  application_type?: ApplicationType;
  version?: string | null;
  port?: number | null;
  status?: AssetStatus;
  primary_contact_id?: string | null;
  notes?: string | null;
  criticality?: Criticality;
  asset_ids?: string[];
}

export interface BulkAssetUpdate {
  asset_ids: string[];
  updates: AssetUpdateRequest;
}

export interface BulkApplicationAssignment {
  application_id: string;
  asset_ids: string[];
}

export interface UpsertResponse {
  asset: Asset;
  created: boolean;
}

// Search and filter interfaces
export interface AssetFilters {
  search?: string;
  status?: AssetStatus[];
  type?: AssetType[];
  vendor?: string[];
  owner_id?: string;
  has_applications?: boolean;
  has_notes?: boolean;
}

export interface UserFilters {
  search?: string;
  department?: string;
  active_only?: boolean;
}

export interface ApplicationFilters {
  search?: string;
  environment?: Environment[];
  status?: AssetStatus[];
  criticality?: Criticality[];
  has_assets?: boolean;
}

export interface SortConfig {
  field: keyof Asset;
  direction: 'asc' | 'desc';
}

// Constants for dropdowns and selections
export const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: 'server', label: 'Server' },
  { value: 'workstation', label: 'Workstation' },
  { value: 'network', label: 'Network Device' },
  { value: 'storage', label: 'Storage Device' },
];

export const ASSET_STATUSES: { value: AssetStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Active', color: 'green' },
  { value: 'maintenance', label: 'Maintenance', color: 'yellow' },
  { value: 'retired', label: 'Retired', color: 'red' },
];

export const MANAGEMENT_CONTROLLER_TYPES: { value: ManagementControllerType; label: string }[] = [
  { value: 'ilo', label: 'HP iLO' },
  { value: 'idrac', label: 'Dell iDRAC' },
  { value: 'ipmi', label: 'IPMI' },
  { value: 'redfish', label: 'Redfish' },
];

export const APPLICATION_TYPES: { value: ApplicationType; label: string }[] = [
  { value: 'web', label: 'Web Application' },
  { value: 'database', label: 'Database' },
  { value: 'api', label: 'API Service' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'other', label: 'Other' },
];

export const ENVIRONMENTS: { value: Environment; label: string; color: string }[] = [
  { value: 'development', label: 'Development', color: 'blue' },
  { value: 'staging', label: 'Staging', color: 'yellow' },
  { value: 'production', label: 'Production', color: 'red' },
];

export const CRITICALITY_LEVELS: { value: Criticality; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'green' },
  { value: 'medium', label: 'Medium', color: 'yellow' },
  { value: 'high', label: 'High', color: 'orange' },
  { value: 'critical', label: 'Critical', color: 'red' },
];
