// lib/api-client.ts - Clean Production API Client
import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  Asset,
  AssetWithDetails,
  User,
  Application,
  ApplicationWithAssets,
  ManagementController,
  PaginationMeta,
  AssetCreateRequest,
  AssetUpdateRequest,
  UserCreateRequest,
  UserUpdateRequest,
  ApplicationCreateRequest,
  ApplicationUpdateRequest,
  BulkAssetUpdate,
  BulkApplicationAssignment,
  UpsertResponse
} from './types';

// API Client configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || process.env.API_KEY;

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/api/v1`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for authentication
    this.client.interceptors.request.use(
      async (config) => {
        // Add API key if available
        if (API_KEY) {
          config.headers.Authorization = `Bearer ${API_KEY}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          console.error('Authentication failed. Please check your API key configuration.');
        }
        return Promise.reject(error);
      }
    );
  }

  // =============================================================================
  // ASSETS API
  // =============================================================================

  async getAssets(params: {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
    type?: string;
    vendor?: string;
    owner_id?: string;
    has_applications?: boolean;
    has_notes?: boolean;
    sort_by?: string;
    sort_order?: string;
  } = {}): Promise<{data: Asset[], meta: {total: number, page: number, per_page: number, pages: number}}> {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    const url = searchParams.toString() ? `/assets?${searchParams.toString()}` : '/assets';
    const response = await this.client.get(url);

    // Handle different response formats
    let assets: Asset[];
    if (Array.isArray(response.data)) {
      assets = response.data;
    } else if (response.data && Array.isArray(response.data.data)) {
      assets = response.data.data;
    } else if (response.data && response.data.assets) {
      assets = response.data.assets;
    } else {
      assets = [];
    }

    // Return full response object for pagination support
    return {
      data: assets,
      meta: response.data.meta || {
        total: assets.length,
        page: 1,
        per_page: assets.length,
        pages: 1
      }
    };
  }

  async getAsset(id: string): Promise<AssetWithDetails> {
    const response = await this.client.get(`/assets/${id}`);
    return response.data;
  }

  async createAsset(asset: AssetCreateRequest): Promise<Asset> {
    const response = await this.client.post('/assets', asset);
    return response.data;
  }

  async updateAsset(id: string, updates: AssetUpdateRequest): Promise<Asset> {
    const response = await this.client.patch(`/assets/${id}`, updates);
    return response.data;
  }

  async deleteAsset(id: string): Promise<void> {
    await this.client.delete(`/assets/${id}`);
  }

  async upsertAsset(asset: AssetCreateRequest): Promise<UpsertResponse> {
    const response = await this.client.post('/assets/upsert', asset);
    return response.data;
  }

  // =============================================================================
  // USERS API
  // =============================================================================

  async getUsers(params: {
    search?: string;
    department?: string;
    active_only?: boolean;
    limit?: number;
  } = {}): Promise<User[]> {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    const url = searchParams.toString() ? `/users?${searchParams.toString()}` : '/users';
    const response = await this.client.get(url);

    // Handle different response formats
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    return [];
  }

  async getUser(id: string): Promise<User> {
    const response = await this.client.get(`/users/${id}`);
    return response.data;
  }

  async createUser(user: UserCreateRequest): Promise<User> {
    const response = await this.client.post('/users', user);
    return response.data;
  }

  async updateUser(id: string, updates: UserUpdateRequest): Promise<User> {
    const response = await this.client.patch(`/users/${id}`, updates);
    return response.data;
  }

  async deleteUser(id: string): Promise<void> {
    await this.client.delete(`/users/${id}`);
  }

  // =============================================================================
  // APPLICATIONS API
  // =============================================================================

  async getApplications(params: {
    search?: string;
    environment?: string[];
    status?: string[];
    criticality?: string[];
    has_assets?: boolean;
    limit?: number;
  } = {}): Promise<Application[]> {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, String(v)));
        } else {
          searchParams.append(key, String(value));
        }
      }
    });

    const url = searchParams.toString() ? `/applications?${searchParams.toString()}` : '/applications';
    const response = await this.client.get(url);

    // Handle different response formats
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    return [];
  }

  async getApplication(id: string): Promise<ApplicationWithAssets> {
    const response = await this.client.get(`/applications/${id}`);
    return response.data;
  }

  async createApplication(application: ApplicationCreateRequest): Promise<Application> {
    const response = await this.client.post('/applications', application);
    return response.data;
  }

  async updateApplication(id: string, updates: ApplicationUpdateRequest): Promise<Application> {
    const response = await this.client.patch(`/applications/${id}`, updates);
    return response.data;
  }

  async deleteApplication(id: string): Promise<void> {
    await this.client.delete(`/applications/${id}`);
  }

  // =============================================================================
  // MANAGEMENT CONTROLLERS API
  // =============================================================================

  async getManagementControllers(assetId: string): Promise<ManagementController[]> {
    const response = await this.client.get(`/assets/${assetId}/mgmt`);
    return Array.isArray(response.data) ? response.data : response.data.data || [];
  }

  async createManagementController(assetId: string, controller: {
    type: string;
    address: string;
    port?: number;
    ui_url?: string;
    credential_env_key?: string;
  }): Promise<ManagementController> {
    const response = await this.client.post(`/assets/${assetId}/mgmt`, controller);
    return response.data;
  }

  async deleteManagementController(controllerId: string): Promise<void> {
    await this.client.delete(`/mgmt/${controllerId}`);
  }

  // =============================================================================
  // BULK OPERATIONS API
  // =============================================================================

  async bulkUpdateAssets(updates: BulkAssetUpdate): Promise<Asset[]> {
    const response = await this.client.patch('/assets/bulk', updates);
    return response.data;
  }

  async bulkAssignApplications(assignment: BulkApplicationAssignment): Promise<void> {
    await this.client.post('/assets/bulk/applications', assignment);
  }

  // =============================================================================
  // HEALTH CHECK
  // =============================================================================

  async healthCheck(): Promise<{ status: string; timestamp: string; version?: string; database?: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient();

// For compatibility
export default apiClient;

// SWR configuration for consistent error handling
export const swrConfig = {
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  dedupingInterval: 5000,
  focusThrottleInterval: 10000,
  onError: (error: any) => {
    if (error?.response?.status === 401) {
      console.error('Authentication error. Please check your API key configuration.');
    }
  },
};
