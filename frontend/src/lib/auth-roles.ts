export type MarketplaceRole =
  | "recruiter_account_manager"
  | "recruiter_freelancer"
  | "recruiter_company_employee"
  | "recruiter_company_manager";

export interface User {
  id: string;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  role?: MarketplaceRole | string;
  roles?: {
    marketplace?: MarketplaceRole | string;
    company_name?: string;
    ylabs?: string;
    ycode?: string;
    ycampus?: string;
    [key: string]: string | undefined;
  };
  is_active?: boolean;
  is_applied?: boolean;
  is_temp_pw?: boolean;
  designation?: string;
  is_staff?: boolean;
  is_superuser?: boolean;
  date_joined?: string;
  last_login?: string;
  profile_image?: string;
  cover_image?: string;
  phone_number?: string;
}

/**
 * Returns true if the user has Account Manager permissions.
 * Only recruiter_account_manager, staff, superuser, admin, or acctmanager accounts are recognized.
 */
export function isUserAccountManager(user: User | null | undefined): boolean {
  if (!user) return false;
  const marketplaceRole = user.roles?.marketplace || user.role;
  return (
    marketplaceRole === "recruiter_account_manager" ||
    marketplaceRole === "account_manager" ||
    marketplaceRole === "admin" ||
    user.roles?.admin === "admin" ||
    !!user.is_staff ||
    !!user.is_superuser ||
    (user.email ? user.email.toLowerCase().includes("acctmanager") : false)
  );
}

/**
 * Returns true if the user represents a hiring company/employer (manager or employee).
 */
export function isUserCompany(user: User | null | undefined): boolean {
  if (!user) return false;
  const marketplaceRole = user.roles?.marketplace || user.role;
  return (
    marketplaceRole === "recruiter_company_manager" ||
    marketplaceRole === "recruiter_company_employee" ||
    marketplaceRole === "company" ||
    marketplaceRole === "employer" ||
    marketplaceRole === "client" ||
    !!user.roles?.company_name ||
    !!(user as any).company ||
    (user.email ? user.email.toLowerCase().includes("company") : false)
  );
}

/**
 * Returns true if the user is a Company Manager (recruiter_company_manager).
 */
export function isUserCompanyManager(user: User | null | undefined): boolean {
  if (!user) return false;
  const marketplaceRole = user.roles?.marketplace || user.role;
  return marketplaceRole === "recruiter_company_manager";
}

/**
 * Returns true if the user is a Company Employee (recruiter_company_employee).
 */
export function isUserCompanyEmployee(user: User | null | undefined): boolean {
  if (!user) return false;
  const marketplaceRole = user.roles?.marketplace || user.role;
  return marketplaceRole === "recruiter_company_employee";
}

/**
 * Returns true if the user is a Recruiter Freelancer (recruiter_freelancer).
 * Explicitly excludes Account Managers, Admins, and Companies.
 */
export function isUserRecruiterFreelancer(user: User | null | undefined): boolean {
  if (!user) return false;
  // Account Managers, Admins, and Companies are strictly excluded
  if (isUserAccountManager(user)) return false;
  if (isUserCompany(user)) return false;

  const marketplaceRole = user.roles?.marketplace || user.role;

  // Explicit recruiter roles or recruiter in email
  if (
    marketplaceRole === "recruiter_freelancer" ||
    marketplaceRole === "recruiter" ||
    marketplaceRole === "freelancer" ||
    (user.email ? user.email.toLowerCase().includes("recruiter") : false)
  ) {
    return true;
  }

  // Marketplace default role is recruiter_freelancer
  if (!marketplaceRole || marketplaceRole === "user") {
    return true;
  }

  return false;
}
