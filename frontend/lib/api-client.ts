// lib/api-client.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { Asset, ManagementController, AssetWithControllers, PaginationMeta } from './types';
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

export interface UpsertResponse {
  asset: Asset;
  created: boolean;
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

  // Assets API
  async getAssets(params: {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
    type?: string;
    vendor?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  } = {}): Promise<AssetListResponse> {
    const queryParams = new URLSearchParams();

    // Convert page to skip
    const page = params.page || 1;
    const per_page = params.per_page || 20;
    const skip = (page - 1) * per_page;

    queryParams.append('skip', skip.toString());
    queryParams.append('limit', per_page.toString());

    if (params.search) queryParams.append('search', params.search);
    if (params.status) queryParams.append('status', params.status);
    if (params.type) queryParams.append('type', params.type);
    if (params.vendor) queryParams.append('vendor', params.vendor);
    if (params.sort_by) queryParams.append('sort_by', params.sort_by);
    if (params.sort_order) queryParams.append('sort_order', params.sort_order);

    const response = await this.client.get<AssetListResponse>(`/assets?${queryParams}`);
    return response.data;
  }

  async getAsset(id: string): Promise<AssetWithControllers> {
    const response = await this.client.get<AssetWithControllers>(`/assets/${id}`);
    return response.data;
  }

  async upsertAsset(asset: Partial<Asset>): Promise<UpsertResponse> {
    const response = await this.client.post<UpsertResponse>('/assets/upsert', asset);
    return response.data;
  }

  async updateAsset(id: string, updates: Partial<Asset>): Promise<Asset> {
    const response = await this.client.patch<Asset>(`/assets/${id}`, updates);
    return response.data;
  }

  async deleteAsset(id: string): Promise<void> {
    await this.client.delete(`/assets/${id}`);
  }

  // Management Controllers API
  async getAssetControllers(assetId: string): Promise<ManagementController[]> {
    const response = await this.client.get<ManagementController[]>(`/assets/${assetId}/mgmt`);
    return response.data;
  }

  async addAssetController(assetId: string, controller: Partial<ManagementController>): Promise<ManagementController> {
    const response = await this.client.post<ManagementController>(`/assets/${assetId}/mgmt`, controller);
    return response.data;
  }

  async deleteController(controllerId: string): Promise<void> {
    await this.client.delete(`/mgmt/${controllerId}`);
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await this.client.get<{ status: string; timestamp: string }>('/health');
    return response.data;
  }

  // Generic request method for custom API calls
  async request<T>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request<T>(config);
    return response.data;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// SWR fetcher function
export const fetcher = async (url: string) => {
  const response = await apiClient.request({ url });
  return response;
};

// SWR configuration
export const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  shouldRetryOnError: false,
  errorRetryInterval: 5000,
  dedupingInterval: 2000,
};

export default apiClient;
