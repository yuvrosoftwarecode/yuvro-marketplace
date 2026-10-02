import { RestApiUtil, ApiError, type RequestOptions } from "./RestApiUtil";

const API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL || "http://localhost:8004";
const YHUB_BASE_URL =
  import.meta.env.VITE_YHUB_BACKEND_API_BASE_URL || "https://backend-hub-dev.yuvro.ai/api";

class RestApiAuthUtil extends RestApiUtil {
  private token: string | null = null;
  private isRefreshing: boolean = false;
  private refreshSubscribers: {
    resolve: (token: string) => void;
    reject: (err: any) => void;
  }[] = [];

  constructor(baseURL: string) {
    super(baseURL);
  }

  private onRefreshed(token: string) {
    this.refreshSubscribers.forEach((cb) => cb.resolve(token));
    this.refreshSubscribers = [];
  }

  private onRefreshFailed(error: any) {
    this.refreshSubscribers.forEach((cb) => cb.reject(error));
    this.refreshSubscribers = [];
  }

  private addSubscriber(resolve: (token: string) => void, reject: (err: any) => void) {
    this.refreshSubscribers.push({ resolve, reject });
  }

  setAuthToken(token: string) {
    this.token = token;
    localStorage.setItem("access", token);
    localStorage.setItem("access_token", token);
  }

  getAuthToken(): string | null {
    const t = this.token || localStorage.getItem("access") || localStorage.getItem("access_token");
    if (!t || t === "undefined" || t === "null") return null;
    return t;
  }

  clearAuthToken() {
    this.token = null;
    localStorage.removeItem("access");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
  }

  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  async forceRefreshToken(): Promise<boolean> {
    return await this.refreshToken();
  }

  private getAuthHeaders(endpoint?: string): HeadersInit {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    const isPublicAuthEndpoint =
      endpoint &&
      (endpoint.includes("/auth/login") ||
        endpoint.includes("/auth/register") ||
        endpoint.includes("/auth/google") ||
        endpoint.includes("/auth/token/refresh") ||
        endpoint.includes("/auth/forgot-password") ||
        endpoint.includes("/auth/reset-password"));

    if (!isPublicAuthEndpoint) {
      const token = this.getAuthToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  private async refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem("refresh") || localStorage.getItem("refresh_token");
    if (!refreshToken) {
      console.warn("No refresh token available");
      return false;
    }

    try {
      const authBaseUrl = (
        import.meta.env.VITE_YHUB_BACKEND_API_BASE_URL || "https://backend-hub-dev.yuvro.ai/api"
      ).replace(/\/$/, "");

      const res = await fetch(`${authBaseUrl}/auth/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!res.ok) throw new Error(`Refresh failed with status ${res.status}`);
      const response = await res.json();

      localStorage.setItem("access", response.access);
      localStorage.setItem("access_token", response.access);
      if (response.refresh) {
        localStorage.setItem("refresh", response.refresh);
        localStorage.setItem("refresh_token", response.refresh);
      }
      this.token = response.access;
      return true;
    } catch (err) {
      console.error("Token refresh failed:", err);
      this.logout();
      return false;
    }
  }

  private logout(): void {
    const currentPath = window.location.pathname + window.location.search;
    this.clearAuthToken();
    if (
      !window.location.pathname.includes("/auth") &&
      window.location.pathname !== "/" &&
      !window.location.pathname.includes("/login")
    ) {
      window.location.href = `/?redirect=${encodeURIComponent(currentPath)}`;
    }
  }

  protected async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    let authHeaders = this.getAuthHeaders(endpoint) as Record<string, string>;

    if (options.body instanceof FormData) {
      delete authHeaders["Content-Type"];
    }

    let optionsWithAuth = {
      ...options,
      headers: {
        ...authHeaders,
        ...options.headers,
      },
    };

    try {
      return await super.request<T>(endpoint, optionsWithAuth);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        const isAuthEndpoint =
          endpoint.includes("/auth/login") ||
          endpoint.includes("/auth/register") ||
          endpoint.includes("/auth/token/refresh");

        if (isAuthEndpoint) {
          throw error;
        }

        if (!this.isRefreshing) {
          this.isRefreshing = true;
          this.refreshToken().then((success) => {
            this.isRefreshing = false;
            if (success && this.token) {
              this.onRefreshed(this.token);
            } else {
              this.onRefreshFailed(error);
            }
          });
        }

        return new Promise<T>((resolve, reject) => {
          this.addSubscriber((newToken) => {
            const retryHeaders: HeadersInit = {
              ...options.headers,
              Authorization: `Bearer ${newToken}`,
              ...((authHeaders as Record<string, string>)["Content-Type"]
                ? {
                    "Content-Type": (authHeaders as Record<string, string>)["Content-Type"],
                  }
                : {}),
            };

            const retryOptionsWithAuth = {
              ...options,
              headers: retryHeaders,
            };
            resolve(super.request<T>(endpoint, retryOptionsWithAuth));
          }, reject);
        });
      }
      throw error;
    }
  }
}

export const restApiAuthUtil = new RestApiAuthUtil(API_BASE_URL);
export const yhubApiAuthUtil = new RestApiAuthUtil(YHUB_BASE_URL);
export default restApiAuthUtil;
