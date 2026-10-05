import { createContext, useContext, useReducer, useEffect, type ReactNode } from "react";
import authService from "../services/authService";
import { restApiAuthUtil } from "../utils/RestApiAuthUtil";
import {
  type User,
  isUserAccountManager,
  isUserRecruiterFreelancer,
  isUserCompany,
} from "./auth-roles";

export {
  type User,
  isUserAccountManager,
  isUserRecruiterFreelancer,
  isUserCompany,
};

export function getUserDisplayName(
  user: User | null | undefined,
  fallback: string = "User",
): string {
  if (!user) return fallback;
  if (user.full_name && user.full_name.trim()) return user.full_name.trim();
  if (user.first_name || user.last_name) {
    return `${user.first_name || ""} ${user.last_name || ""}`.trim();
  }
  if (user.username && user.username.trim()) return user.username.trim();
  if (user.email && user.email.trim()) return user.email.split("@")[0];
  return fallback;
}

export function getUserFirstName(
  user: User | null | undefined,
  fallback: string = "there",
): string {
  if (!user) return fallback;
  if (user.first_name && user.first_name.trim()) return user.first_name.trim();
  const fullName = getUserDisplayName(user, "");
  if (fullName) return fullName.split(" ")[0];
  if (user.username && user.username.trim()) return user.username.trim();
  if (user.email && user.email.trim()) return user.email.split("@")[0];
  return fallback;
}

export function getUserInitials(user: User | null | undefined, fallback: string = "U"): string {
  if (!user) return fallback;
  if (user.first_name && user.last_name) {
    return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
  }
  const name = getUserDisplayName(user, "");
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (user.email) return user.email.slice(0, 2).toUpperCase();
  return fallback;
}

export function getUserRoleTitle(
  user: User | null | undefined,
  fallback: string = "Recruiter",
): string {
  if (!user) return fallback;
  if (user.is_superuser || user.roles?.admin === "admin") return "Super Admin";
  const role = user.roles?.marketplace || user.role;
  if (role === "recruiter_account_manager" || isUserAccountManager(user)) return "Account Manager";
  if (role === "recruiter_freelancer") return "Recruiter Freelancer";
  if (role === "admin") return "Admin";
  return fallback;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

type AuthAction =
  | { type: "LOGIN_START" }
  | { type: "LOGIN_SUCCESS"; payload: { user: User; token: string } }
  | { type: "LOGIN_FAILURE" }
  | { type: "LOGOUT" }
  | { type: "UPDATE_USER"; payload: User }
  | { type: "SET_LOADING"; payload: boolean };

export interface AuthContextType extends AuthState {
  login: (user: User, token: string) => void;
  logout: (redirectUrl?: string) => void;
  updateUser: (user: User) => void;
  isAccountManager: boolean;
  isFreelancer: boolean;
  isAdmin: boolean;
  isCompany: boolean;
}

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case "LOGIN_START":
      return { ...state, isLoading: true };
    case "LOGIN_SUCCESS":
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
      };
    case "LOGIN_FAILURE":
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        token: null,
      };
    case "LOGOUT":
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
      };
    case "UPDATE_USER":
      return {
        ...state,
        user: action.payload,
      };
    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
};

const getInitialState = (): AuthState => {
  if (typeof window === "undefined") {
    return {
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
    };
  }

  const accessToken = localStorage.getItem("access") || localStorage.getItem("access_token");
  const storedUser = localStorage.getItem("user");

  let user: User | null = null;
  if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
    try {
      user = JSON.parse(storedUser);
    } catch (e) {
      console.warn("Failed to parse stored user data:", e);
      localStorage.removeItem("user");
    }
  }

  if (accessToken) {
    return {
      user,
      token: accessToken,
      isLoading: true,
      isAuthenticated: true,
    };
  }
  return {
    user: null,
    token: null,
    isLoading: false,
    isAuthenticated: false,
  };
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, getInitialState());

  useEffect(() => {
    if (state.isAuthenticated && state.token) {
      localStorage.setItem("access", state.token);
      localStorage.setItem("access_token", state.token);
      authService.setAuthToken(state.token);
    } else {
      localStorage.removeItem("access");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh");
      localStorage.removeItem("refresh_token");
    }
  }, [state.isAuthenticated, state.token]);

  useEffect(() => {
    const accessToken = localStorage.getItem("access") || localStorage.getItem("access_token");

    if (accessToken) {
      authService.setAuthToken(accessToken);
      authService.initializeFromStorage();

      authService
        .getCurrentUser()
        .then(async (userData) => {
          let mergedUser = { ...userData };
          try {
            const localUser = await restApiAuthUtil.get<any>("/api/auth/me/");
            if (localUser) {
              if (typeof localUser.is_active === "boolean") {
                mergedUser.is_active = localUser.is_active;
              }
              if (typeof localUser.is_applied === "boolean") {
                mergedUser.is_applied = localUser.is_applied;
              }
              if (localUser.role) {
                mergedUser.role = localUser.role;
              }
            }
          } catch (e) {
            console.warn("Could not sync local user profile on init:", e);
          }
          const latestToken = authService.getAuthToken() || accessToken;
          localStorage.setItem("user", JSON.stringify(mergedUser));
          dispatch({
            type: "LOGIN_SUCCESS",
            payload: { user: mergedUser, token: latestToken },
          });
        })
        .catch((error) => {
          console.error("Failed to fetch user on load:", error);
          if (error.status === 401) {
            authService.logoutUser();
            dispatch({ type: "LOGIN_FAILURE" });
          } else {
            dispatch({ type: "SET_LOADING", payload: false });
          }
        });
    } else {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  const login = async (user: User, token: string) => {
    localStorage.setItem("user", JSON.stringify(user));
    dispatch({
      type: "LOGIN_SUCCESS",
      payload: { user, token },
    });

    // Sync shadow user with marketplace backend DB and refresh local marketplace status
    try {
      const localUser = await restApiAuthUtil.get<any>("/api/auth/me/");
      if (localUser) {
        const mergedUser = {
          ...user,
          is_active: typeof localUser.is_active === "boolean" ? localUser.is_active : user.is_active,
          is_applied: typeof localUser.is_applied === "boolean" ? localUser.is_applied : user.is_applied,
          role: localUser.role || user.role,
        };
        localStorage.setItem("user", JSON.stringify(mergedUser));
        dispatch({ type: "UPDATE_USER", payload: mergedUser });
      }
    } catch (err) {
      console.warn("Marketplace backend shadow sync on login:", err);
    }
  };

  const logout = (redirectUrl: string = "/") => {
    localStorage.removeItem("user");
    authService.logoutUser(redirectUrl);
    dispatch({ type: "LOGOUT" });
  };

  const updateUser = (user: User) => {
    localStorage.setItem("user", JSON.stringify(user));
    dispatch({ type: "UPDATE_USER", payload: user });
  };

  const isAccountManager = isUserAccountManager(state.user);
  const isFreelancer = isUserRecruiterFreelancer(state.user);
  const isCompany = isUserCompany(state.user);
  const isAdmin =
    !!state.user?.is_superuser ||
    state.user?.roles?.marketplace === "admin" ||
    state.user?.roles?.admin === "admin" ||
    Object.values(state.user?.roles || {}).includes("admin");

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        updateUser,
        isAccountManager,
        isFreelancer,
        isCompany,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
