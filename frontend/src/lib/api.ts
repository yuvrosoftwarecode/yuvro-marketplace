const API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL || "http://localhost:8004";

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export function buildApiUrl(baseUrl: string, endpoint: string): string {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }
  const cleanBase = baseUrl.replace(/\/+$/, "");
  let cleanPath = endpoint.replace(/^\/+/, "");

  // If base ends with /api and endpoint starts with api/, strip the duplicate api/
  if (cleanBase.endsWith("/api") && (cleanPath === "api" || cleanPath.startsWith("api/"))) {
    cleanPath = cleanPath.slice(3).replace(/^\/+/, "");
  }

  return cleanPath ? `${cleanBase}/${cleanPath}` : cleanBase;
}

const inFlightGetRequests = new Map<string, Promise<any>>();

export async function apiClient<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const isGet = method === "GET";
  const url = buildApiUrl(API_BASE_URL, endpoint);

  if (isGet) {
    const existing = inFlightGetRequests.get(url);
    if (existing) {
      return existing as Promise<T>;
    }
  }

  const executeRequest = async (): Promise<T> => {
    try {
      const headers = new Headers(options.headers || {});
      if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
      }

      if (typeof window !== "undefined") {
        const token = localStorage.getItem("access") || localStorage.getItem("access_token");
        if (token && !headers.has("Authorization")) {
          headers.set("Authorization", `Bearer ${token}`);
        }
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401 && typeof window !== "undefined") {
        const refreshToken = localStorage.getItem("refresh") || localStorage.getItem("refresh_token");
        if (refreshToken && !endpoint.includes("token/refresh")) {
          try {
            const yhubBase = (
              import.meta.env.VITE_YHUB_BACKEND_API_BASE_URL || "https://backend-hub-dev.yuvro.ai/api"
            );
            let refreshRes = await fetch(buildApiUrl(yhubBase, "/auth/token/refresh/"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refresh: refreshToken }),
            }).catch(() => null);

            if (!refreshRes || !refreshRes.ok) {
              const localBase = (
                import.meta.env.VITE_BACKEND_API_BASE_URL || "http://localhost:8004"
              );
              refreshRes = await fetch(buildApiUrl(localBase, "/api/auth/token/refresh/"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refresh: refreshToken }),
              }).catch(() => null);
            }

            if (refreshRes && refreshRes.ok) {
              const refreshData = await refreshRes.json();
              localStorage.setItem("access", refreshData.access);
              localStorage.setItem("access_token", refreshData.access);
              if (refreshData.refresh) {
                localStorage.setItem("refresh", refreshData.refresh);
                localStorage.setItem("refresh_token", refreshData.refresh);
              }
              headers.set("Authorization", `Bearer ${refreshData.access}`);
              const retryRes = await fetch(url, { ...options, headers });
              if (!retryRes.ok) {
                const errData = await retryRes.json().catch(() => ({}));
                throw new ApiError(retryRes.status, retryRes.statusText, errData);
              }
              return (await retryRes.json()) as T;
            } else {
              localStorage.removeItem("access");
              localStorage.removeItem("access_token");
              localStorage.removeItem("refresh");
              localStorage.removeItem("refresh_token");
              localStorage.removeItem("user");
            }
          } catch {
            localStorage.removeItem("access");
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("user");
          }
        }
      }

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = null;
        }
        throw new ApiError(
          response.status,
          errorData?.detail || errorData?.message || response.statusText,
          errorData,
        );
      }

      if (response.status === 204) {
        return {} as T;
      }

      return (await response.json()) as T;
    } finally {
      if (isGet) {
        inFlightGetRequests.delete(url);
      }
    }
  };

  const promise = executeRequest();
  if (isGet) {
    inFlightGetRequests.set(url, promise);
  }

  return promise;
}

export const api = {
  get: <T = any>(endpoint: string, options?: RequestInit) =>
    apiClient<T>(endpoint, { ...options, method: "GET" }),
  post: <T = any>(endpoint: string, data?: any, options?: RequestInit) =>
    apiClient<T>(endpoint, {
      ...options,
      method: "POST",
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),
  put: <T = any>(endpoint: string, data?: any, options?: RequestInit) =>
    apiClient<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),
  patch: <T = any>(endpoint: string, data?: any, options?: RequestInit) =>
    apiClient<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),
  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    apiClient<T>(endpoint, { ...options, method: "DELETE" }),
};
