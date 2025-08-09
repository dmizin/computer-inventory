// lib/types.ts
export type AssetType = 'server' | 'workstation' | 'network' | 'storage';
export type AssetStatus = 'active' | 'retired' | 'maintenance';
export type ManagementControllerType = 'ilo' | 'idrac' | 'ipmi' | 'redfish';

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

// Asset with controllers (for detail view)
export interface AssetWithControllers extends Asset {
  management_controllers: ManagementController[];
}

// Pagination metadata
export interface PaginationMeta {
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

// Common specs interfaces for type safety
export interface CpuSpec {
  model?: string;
  count?: number;
  cores?: number;
  threads?: number;
  frequency_mhz?: number;
}

export interface DiskSpec {
  model?: string;
  size_gb?: number;
  type?: 'HDD' | 'SSD' | 'NVMe';
  interface?: string;
  serial?: string;
}

export interface NetworkSpec {
  interface?: string;
  mac?: string;
  speed_gbps?: number;
  type?: string;
  status?: string;
}

export interface MemorySpec {
  total_gb?: number;
  modules?: Array<{
    size_gb?: number;
    type?: string;
    speed_mhz?: number;
    manufacturer?: string;
  }>;
}

// Common asset specs structure
export interface AssetSpecs {
  cpu?: CpuSpec | CpuSpec[];
  memory?: MemorySpec;
  memory_gb?: number; // Legacy field
  disks?: DiskSpec[];
  network?: NetworkSpec[];
  [key: string]: any; // Allow additional fields
}

// Form interfaces
export interface AssetCreateRequest {
  hostname: string;
  fqdn?: string;
  serial_number?: string;
  vendor?: string;
  model?: string;
  type: AssetType;
  status?: AssetStatus;
  location?: string;
  specs?: AssetSpecs;
}

export interface AssetUpdateRequest {
  hostname?: string;
  fqdn?: string;
  serial_number?: string;
  vendor?: string;
  model?: string;
  type?: AssetType;
  status?: AssetStatus;
  location?: string;
  specs?: AssetSpecs;
}

export interface ManagementControllerCreateRequest {
  type: ManagementControllerType;
  address: string;
  port?: number;
  ui_url?: string;
  credential_env_key?: string;
}

// Search and filter interfaces
export interface AssetFilters {
  search?: string;
  status?: AssetStatus[];
  type?: AssetType[];
  vendor?: string[];
}

export interface SortConfig {
  field: keyof Asset;
  direction: 'asc' | 'desc';
}

// Component props interfaces
export interface AssetTableProps {
  assets: Asset[];
  loading?: boolean;
  onSort?: (config: SortConfig) => void;
  sortConfig?: SortConfig;
}

export interface AssetDetailProps {
  asset: AssetWithControllers;
  onEdit?: (asset: Asset) => void;
  onDelete?: (assetId: string) => void;
  canEdit?: boolean;
}

export interface SearchBarProps {
  value?: string;
  onChange: (value: string) => void;
  onFilter?: (filters: AssetFilters) => void;
  filters?: AssetFilters;
  placeholder?: string;
}

// API Error interface
export interface ApiError {
  error: string;
  details?: string;
  status_code?: number;
}

// Dashboard stats interface
export interface DashboardStats {
  total_assets: number;
  active_assets: number;
  retired_assets: number;
  maintenance_assets: number;
  assets_by_type: Record<AssetType, number>;
  assets_by_vendor: Record<string, number>;
  recent_additions: Asset[];
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type AssetFormData = Omit<Asset, 'id' | 'created_at' | 'updated_at'>;

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
