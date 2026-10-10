import type { User } from "../lib/auth-roles";
import { isUserAccountManager, isUserRecruiterFreelancer } from "../lib/auth-roles";
import { ApiError, yhubApiUtil } from "../utils/RestApiUtil";
import { restApiAuthUtil, yhubApiAuthUtil } from "../utils/RestApiAuthUtil";

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  username?: string;
  password: string;
  password_confirm?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

class AuthService {
  setAuthToken(token: string): void {
    restApiAuthUtil.setAuthToken(token);
    yhubApiAuthUtil.setAuthToken(token);
  }

  clearTokens(): void {
    localStorage.removeItem("access");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    restApiAuthUtil.clearAuthToken();
    yhubApiAuthUtil.clearAuthToken();
  }

  isAuthenticated(): boolean {
    return restApiAuthUtil.isAuthenticated();
  }

  getAuthToken(): string | null {
    return restApiAuthUtil.getAuthToken();
  }

  async refreshToken(): Promise<boolean> {
    return yhubApiAuthUtil.forceRefreshToken();
  }

  initializeFromStorage(): void {
    const token = localStorage.getItem("access") || localStorage.getItem("access_token");
    if (token) {
      restApiAuthUtil.setAuthToken(token);
      yhubApiAuthUtil.setAuthToken(token);
    }
  }

  async login(
    email: string,
    password: string,
    requiredRole?: "recruiter_account_manager" | "recruiter_freelancer" | string,
  ): Promise<LoginResponse> {
    const validateRole = (user: User) => {
      if (!requiredRole) return;
      if (requiredRole === "recruiter_account_manager") {
        if (!isUserAccountManager(user)) {
          throw new ApiError(
            "Access denied. Only Account Managers can sign in here.",
            403,
          );
        }
      } else if (requiredRole === "recruiter_freelancer") {
        if (!isUserRecruiterFreelancer(user)) {
          throw new ApiError(
            "Access denied. Only Recruiters can sign in here.",
            403,
          );
        }
      } else {
        const userRole = user.roles?.marketplace || user.role;
        if (userRole !== requiredRole) {
          throw new ApiError(
            "Access denied.",
            403,
          );
        }
      }
    };

    try {
      const response = await yhubApiUtil.post<LoginResponse>("/auth/login/?product=marketplace", {
        email,
        password,
      });

      validateRole(response.user);

      localStorage.setItem("access", response.access);
      localStorage.setItem("access_token", response.access);
      localStorage.setItem("refresh", response.refresh);
      localStorage.setItem("refresh_token", response.refresh);
      restApiAuthUtil.setAuthToken(response.access);
      yhubApiAuthUtil.setAuthToken(response.access);

      // Fetch user profile from local marketplace backend to get marketplace-specific flags (like is_temp_pw)
      try {
        const localMe = await restApiAuthUtil.get<User>("/api/auth/me/");
        if (localMe) {
          response.user = {
            ...response.user,
            ...localMe,
            roles: response.user.roles || localMe.roles,
          };
        }
      } catch (meErr) {
        console.warn("Failed to fetch local user flags:", meErr);
      }

      return response;
    } catch (yhubErr: any) {
      if (yhubErr instanceof ApiError && yhubErr.status === 403) {
        this.clearTokens();
        throw yhubErr;
      }

      try {
        const localRes = await restApiAuthUtil.post<{
          user: User;
          tokens: { access: string; refresh: string };
        }>("/api/auth/login/", {
          email,
          password,
          required_role: requiredRole,
          role: requiredRole,
        });

        const loginData: LoginResponse = {
          access: localRes.tokens.access,
          refresh: localRes.tokens.refresh,
          user: localRes.user,
        };

        validateRole(loginData.user);

        localStorage.setItem("access", loginData.access);
        localStorage.setItem("access_token", loginData.access);
        localStorage.setItem("refresh", loginData.refresh);
        localStorage.setItem("refresh_token", loginData.refresh);
        restApiAuthUtil.setAuthToken(loginData.access);
        yhubApiAuthUtil.setAuthToken(loginData.access);

        return loginData;
      } catch (localErr: any) {
        this.clearTokens();
        if (localErr instanceof ApiError && localErr.status === 403) {
          throw localErr;
        }
        if (localErr?.details?.non_field_errors?.[0]) {
          throw new ApiError(localErr.details.non_field_errors[0], 400);
        }
        if (localErr?.message) {
          throw localErr;
        }
        throw yhubErr;
      }
    }
  }

  async register(data: RegisterRequest): Promise<LoginResponse> {
    const username = data.username || data.email.split("@")[0];
    const role = data.role || "recruiter_freelancer";
    const payload = {
      ...data,
      username,
      role,
      roles: {
        marketplace: role,
        ...((data as any).roles || {}),
      },
      password_confirm: data.password_confirm || data.password,
    };

    const response = await yhubApiUtil.post<LoginResponse>(
      "/auth/register/?product=marketplace",
      payload,
    );

    localStorage.setItem("access", response.access);
    localStorage.setItem("access_token", response.access);
    localStorage.setItem("refresh", response.refresh);
    localStorage.setItem("refresh_token", response.refresh);
    restApiAuthUtil.setAuthToken(response.access);
    yhubApiAuthUtil.setAuthToken(response.access);

    return response;
  }

  async loginWithGoogle(token: string): Promise<LoginResponse> {
    const response = await yhubApiUtil.post<LoginResponse>("/auth/google/?product=marketplace", {
      token,
    });

    localStorage.setItem("access", response.access);
    localStorage.setItem("access_token", response.access);
    localStorage.setItem("refresh", response.refresh);
    localStorage.setItem("refresh_token", response.refresh);
    restApiAuthUtil.setAuthToken(response.access);
    yhubApiAuthUtil.setAuthToken(response.access);

    return response;
  }

  async getCurrentUser(): Promise<User> {
    return await yhubApiAuthUtil.get<User>("/auth/user/");
  }

  async updateUser(userData: Partial<User>): Promise<User> {
    return await yhubApiAuthUtil.put<User>("/auth/user/", userData);
  }

  async uploadProfileImage(
    file: File,
    field: "profile_image" | "cover_image" = "profile_image",
  ): Promise<User> {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("field", field);
    return await yhubApiAuthUtil.post<User>("/auth/profile/upload-image/", formData);
  }

  async removeProfileImage(
    field: "profile_image" | "cover_image" = "profile_image",
  ): Promise<User> {
    return await yhubApiAuthUtil.post<User>("/auth/profile/remove-image/", { field });
  }

  async logoutUser(redirectUrl: string = "/"): Promise<void> {
    const refreshToken = localStorage.getItem("refresh") || localStorage.getItem("refresh_token");
    if (refreshToken) {
      try {
        await yhubApiUtil.post("/auth/logout/", { refresh: refreshToken }).catch((error) => {
          console.warn("Logout error:", error);
        });
      } catch (error) {
        console.warn("Logout error:", error);
      }
    }
    this.clearTokens();
    if (redirectUrl && typeof window !== "undefined") {
      window.location.href = redirectUrl;
    }
  }

  async logout(redirectUrl: string = "/company/login"): Promise<void> {
    return this.logoutUser(redirectUrl);
  }

  async sendResetPasswordOTP(email: string): Promise<any> {
    const cleanEmail = email.trim().toLowerCase();
    try {
      return await restApiAuthUtil.post("/api/auth/send_otp/", {
        email: cleanEmail,
        purpose: "password_reset",
      });
    } catch (err: any) {
      const msg =
        err?.details?.error ||
        err?.details?.detail ||
        err?.details?.email?.[0] ||
        err?.message ||
        "Failed to send verification code. Please check your email and try again.";
      throw new Error(msg);
    }
  }

  async resetPasswordWithOTP(email: string, otp_code: string, new_password: string): Promise<any> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp_code.trim();
    try {
      return await restApiAuthUtil.post("/api/auth/reset_password/", {
        email: cleanEmail,
        otp_code: cleanOtp,
        new_password,
      });
    } catch (err: any) {
      const msg =
        err?.details?.error ||
        err?.details?.detail ||
        err?.details?.non_field_errors?.[0] ||
        err?.message ||
        "Invalid or expired verification code. Please request a new one.";
      throw new Error(msg);
    }
  }

  async forgotPassword(email: string): Promise<any> {
    return this.sendResetPasswordOTP(email);
  }

  async resetPassword(uidb64: string, token: string, password: string): Promise<any> {
    return await yhubApiUtil.post(`/auth/reset-password/${uidb64}/${token}/`, { password });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<any> {

    return await yhubApiAuthUtil.post("/auth/change-password/", {
      current_password: currentPassword,
      password: newPassword,
    });
  }
}

export const authService = new AuthService();
export default authService;
