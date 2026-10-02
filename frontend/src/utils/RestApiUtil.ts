const API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL || "http://localhost:8004";

export class ApiError extends Error {
  status: number;
  details?: Record<string, any>;

  constructor(message: string, status: number, details?: Record<string, any>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

const inFlightRestGetRequests = new Map<string, Promise<any>>();

export class RestApiUtil {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
      const url = new URL(endpoint);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, String(value));
          }
        });
      }
      return url.toString();
    }

    const cleanBaseUrl = this.baseURL.replace(/\/+$/, "");
    let cleanEndpoint = endpoint.replace(/^\/+/, "");

    // If base ends with /api and endpoint starts with api/, strip the duplicate api/
    if (cleanBaseUrl.endsWith("/api") && (cleanEndpoint === "api" || cleanEndpoint.startsWith("api/"))) {
      cleanEndpoint = cleanEndpoint.slice(3).replace(/^\/+/, "");
    }

    const fullPath = cleanEndpoint ? `${cleanBaseUrl}/${cleanEndpoint}` : cleanBaseUrl;
    const url = new URL(fullPath);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    return url.toString();
  }

  protected async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, ...fetchOptions } = options;
    const url = this.buildUrl(endpoint, params);
    const method = (fetchOptions.method || "GET").toUpperCase();
    const isGet = method === "GET";

    if (isGet) {
      const existing = inFlightRestGetRequests.get(url);
      if (existing) {
        return existing as Promise<T>;
      }
    }

    const executeRequest = async (): Promise<T> => {
      const isFormData = fetchOptions.body instanceof FormData;
      const defaultHeaders: Record<string, string> = {};
      if (!isFormData) {
        defaultHeaders["Content-Type"] = "application/json";
      }

      const config: RequestInit = {
        ...fetchOptions,
        headers: {
          ...defaultHeaders,
          ...fetchOptions.headers,
        },
      };

      try {
        const response = await fetch(url, config);

        if (!response.ok) {
          let errorData: any = {};
          try {
            const text = await response.text();
            if (text && text.trim()) {
              errorData = JSON.parse(text);
            }
          } catch (e) {
            console.warn("Failed to parse error response as JSON:", e);
            errorData = {};
          }

          let errorMessage = "Request failed";

          if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.email && Array.isArray(errorData.email) && errorData.email.length > 0) {
            errorMessage = errorData.email[0];
          } else if (errorData.non_field_errors && Array.isArray(errorData.non_field_errors)) {
            errorMessage = errorData.non_field_errors[0];
          } else if (errorData.username && Array.isArray(errorData.username) && errorData.username.length > 0) {
            errorMessage = "An account with this email already exists. Please sign in.";
          } else if (errorData.error) {
            errorMessage = errorData.error;
          } else if (typeof errorData === "string") {
            errorMessage = errorData;
          } else {
            const firstFieldError = Object.values(errorData).find(
              (value) => Array.isArray(value) && value.length > 0,
            );
            if (firstFieldError && Array.isArray(firstFieldError)) {
              errorMessage = firstFieldError[0];
            }
          }


          throw new ApiError(errorMessage, response.status, errorData);
        }

        if (response.status === 204) {
          return {} as T;
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const text = await response.text();
          if (text && text.trim()) {
            return JSON.parse(text);
          }
          return {} as T;
        }

        return (await response.text()) as unknown as T;
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }

        throw new ApiError("Network error occurred", 0);
      } finally {
        if (isGet) {
          inFlightRestGetRequests.delete(url);
        }
      }
    };

    const promise = executeRequest();
    if (isGet) {
      inFlightRestGetRequests.set(url, promise);
    }

    return promise;
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { method: "GET", ...options });
  }

  async post<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data instanceof FormData ? data : data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  async put<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data instanceof FormData ? data : data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  async patch<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: data instanceof FormData ? data : data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE", ...options });
  }
}

export const restApiUtil = new RestApiUtil(API_BASE_URL);
export const yhubApiUtil = new RestApiUtil(
  import.meta.env.VITE_YHUB_BACKEND_API_BASE_URL || "https://backend-hub-dev.yuvro.ai/api",
);
export default restApiUtil;
