// lib/types.ts - Simple Version for Basic Functionality
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
