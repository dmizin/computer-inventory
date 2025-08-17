// lib/api-client.ts - Enhanced API Client
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
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
import { isAuthEnabled } from './auth0-config';

// API Response wrappers
export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface AssetListResponse {
  data: Asset[];
  meta: PaginationMeta;
}

export interface UserListResponse {
  data: User[];
  meta: PaginationMeta;
}

export interface ApplicationListResponse {
  data: Application[];
  meta: PaginationMeta;
}

// API Client configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
        // Add auth token if enabled
        if (isAuthEnabled && typeof window !== 'undefined') {
          try {
            // Get access token from Auth0
            const response = await fetch('/api/auth/token');
            if (response.ok) {
              const { accessToken } = await response.json();
              if (accessToken) {
                config.headers.Authorization = `Bearer ${accessToken}`;
              }
            }
          } catch (error) {
            console.warn('Failed to get access token:', error);
          }
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && isAuthEnabled) {
          // Redirect to login on 401 if auth is enabled
          window.location.href = '/api/auth/login';
          return Promise.reject(new Error('Authentication required'));
        }
        return Promise.reject(error);
      }
    );
  }

  // =============================================================================
  // ASSETS API (Enhanced)
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
    sort_order?: 'asc' | 'desc';
  } = {}): Promise<AssetListResponse> {
    const response = await this.client.get('/assets', { params });
    return response.data;
  }

  async getAsset(id: string): Promise<AssetWithDetails> {
    const response = await this.client.get(`/assets/${id}`);
    return response.data;
  }

  async createAsset(data: AssetCreateRequest): Promise<Asset> {
    const response = await this.client.post('/assets', data);
    return response.data;
  }

  async updateAsset(id: string, data: AssetUpdateRequest): Promise<Asset> {
    const response = await this.client.patch(`/assets/${id}`, data);
    return response.data;
  }

  async deleteAsset(id: string): Promise<void> {
    await this.client.delete(`/assets/${id}`);
  }

  async upsertAsset(data: AssetCreateRequest): Promise<UpsertResponse> {
    const response = await this.client.post('/assets/upsert', data);
    return response.data;
  }

  // Bulk operations
  async bulkUpdateAssets(data: BulkAssetUpdate): Promise<{ updated_count: number }> {
    const response = await this.client.patch('/assets/bulk', data);
    return response.data;
  }

  async bulkAssignApplication(data: BulkApplicationAssignment): Promise<{ assigned_count: number }> {
    const response = await this.client.post('/assets/bulk-assign-application', data);
    return response.data;
  }

  // =============================================================================
  // USERS API (New)
  // =============================================================================

  async getUsers(params: {
    skip?: number;
    limit?: number;
    search?: string;
    active_only?: boolean;
  } = {}): Promise<User[]> {
    const response = await this.client.get('/users', { params });
    return response.data;
  }

  async getUser(id: string): Promise<User> {
    const response = await this.client.get(`/users/${id}`);
    return response.data;
  }

  async createUser(data: UserCreateRequest): Promise<User> {
    const response = await this.client.post('/users', data);
    return response.data;
  }

  async updateUser(id: string, data: UserUpdateRequest): Promise<User> {
    const response = await this.client.patch(`/users/${id}`, data);
    return response.data;
  }

  async deleteUser(id: string): Promise<void> {
    await this.client.delete(`/users/${id}`);
  }

  async getUserAssets(userId: string, params: {
    skip?: number;
    limit?: number;
  } = {}): Promise<Asset[]> {
    const response = await this.client.get(`/users/${userId}/assets`, { params });
    return response.data;
  }

  // =============================================================================
  // APPLICATIONS API (New)
  // =============================================================================

  async getApplications(params: {
    skip?: number;
    limit?: number;
    search?: string;
    environment?: string;
    status?: string;
    criticality?: string;
    has_assets?: boolean;
  } = {}): Promise<Application[]> {
    const response = await this.client.get('/applications', { params });
    return response.data;
  }

  async getApplication(id: string): Promise<ApplicationWithAssets> {
    const response = await this.client.get(`/applications/${id}`);
    return response.data;
  }

  async createApplication(data: ApplicationCreateRequest): Promise<Application> {
    const response = await this.client.post('/applications', data);
    return response.data;
  }

  async updateApplication(id: string, data: ApplicationUpdateRequest): Promise<Application> {
    const response = await this.client.patch(`/applications/${id}`, data);
    return response.data;
  }

  async deleteApplication(id: string): Promise<void> {
    await this.client.delete(`/applications/${id}`);
  }

  // Application-Asset associations
  async addAssetToApplication(applicationId: string, assetId: string): Promise<void> {
    await this.client.post(`/applications/${applicationId}/assets/${assetId}`);
  }

  async removeAssetFromApplication(applicationId: string, assetId: string): Promise<void> {
    await this.client.delete(`/applications/${applicationId}/assets/${assetId}`);
  }

  // =============================================================================
  // MANAGEMENT CONTROLLERS API (Unchanged)
  // =============================================================================

  async getAssetControllers(assetId: string): Promise<ManagementController[]> {
    const response = await this.client.get(`/assets/${assetId}/mgmt`);
    return response.data;
  }

  async addController(assetId: string, data: {
    type: string;
    address: string;
    port?: number;
    ui_url?: string;
    credential_env_key?: string;
  }): Promise<ManagementController> {
    const response = await this.client.post(`/assets/${assetId}/mgmt`, data);
    return response.data;
  }

  async deleteController(controllerId: string): Promise<void> {
    await this.client.delete(`/mgmt/${controllerId}`);
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  async healthCheck(): Promise<{ status: string; version: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }

  async getOpenApiSchema(): Promise<any> {
    const response = await this.client.get('/openapi.json');
    return response.data;
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient();

// SWR configuration for consistent data fetching
export const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  shouldRetryOnError: false,
  errorRetryCount: 2,
  errorRetryInterval: 5000,
  dedupingInterval: 5000,
};

// Helper function for SWR key generation
export const generateSWRKey = (endpoint: string, params?: Record<string, any>) => {
  if (!params) return [endpoint];
  return [endpoint, JSON.stringify(params)];
};

// Export everything
export default apiClient;
