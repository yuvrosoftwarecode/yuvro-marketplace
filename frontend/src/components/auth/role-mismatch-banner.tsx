import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { isUserAccountManager, isUserCompany, isUserRecruiterFreelancer } from "@/lib/auth-roles";

interface RoleMismatchBannerProps {
  portal: "recruiter" | "am" | "company";
  className?: string;
}

export function RoleMismatchBanner({ portal, className }: RoleMismatchBannerProps) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || !user) return null;

  const isAM = isUserAccountManager(user);
  const isComp = isUserCompany(user);
  const isRecruiter = isUserRecruiterFreelancer(user);

  let currentRoleName = "";
  let portalUrl = "";
  let portalLinkText = "";
  let expectedRoleName = "";

  if (portal === "recruiter") {
    expectedRoleName = "Recruiters";
    if (isAM) {
      currentRoleName = "an Account Manager";
      portalUrl = "/am";
      portalLinkText = "Go to AM Portal";
    } else if (isComp) {
      currentRoleName = "a Company Manager";
      portalUrl = "/company";
      portalLinkText = "Go to Company Portal";
    }
  } else if (portal === "am") {
    expectedRoleName = "Account Managers";
    if (isRecruiter) {
      currentRoleName = "a Recruiter";
      portalUrl = "/dashboard";
      portalLinkText = "Go to Recruiter Dashboard";
    } else if (isComp) {
      currentRoleName = "a Company Manager";
      portalUrl = "/company";
      portalLinkText = "Go to Company Portal";
    }
  } else if (portal === "company") {
    expectedRoleName = "Company Users";
    if (isAM) {
      currentRoleName = "an Account Manager";
      portalUrl = "/am";
      portalLinkText = "Go to AM Portal";
    } else if (isRecruiter) {
      currentRoleName = "a Recruiter";
      portalUrl = "/dashboard";
      portalLinkText = "Go to Recruiter Dashboard";
    }
  }

  if (!currentRoleName || !portalUrl) return null;

  return (
    <div
      className={`rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 ${
        className || "mb-4"
      }`}
    >
      You are currently signed in as {currentRoleName}. Only {expectedRoleName} can sign in here.{" "}
      <Link to={portalUrl as any} className="font-semibold underline">
        {portalLinkText}
      </Link>
    </div>
  );
}
