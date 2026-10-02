import { useEffect } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import {
  isUserAccountManager,
  isUserCompany,
  isUserRecruiterFreelancer,
} from "@/lib/auth-roles";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access") || localStorage.getItem("access_token");
      const userStr = localStorage.getItem("user");
      if (token && userStr) {
        let user: any = null;
        try {
          user = JSON.parse(userStr);
        } catch {}
        if (user) {
          if (isUserAccountManager(user)) {
            throw redirect({ to: "/am" });
          }
          if (isUserCompany(user)) {
            throw redirect({ to: "/company" });
          }
          if (isUserRecruiterFreelancer(user)) {
            throw redirect({ to: "/dashboard" });
          }
        }
      }
    }
  },
  head: () => ({
    meta: [
      { title: "Sign in — Yuvro Recruiter Marketplace" },
      {
        name: "description",
        content: "Choose your Yuvro portal: recruiters work marketplace roles, companies review candidates and hire.",
      },
      { property: "og:title", content: "Sign in — Yuvro Recruiter Marketplace" },
      {
        property: "og:description",
        content: "Recruiter and company portals for the Yuvro recruitment marketplace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PortalChooser,
});

function Side({
  tag,
  lead,
  em,
  body,
  login,
  signup,
  signupLabel,
}: {
  tag: string;
  lead: string;
  em: string;
  body: string;
  login: "/login" | "/company/login";
  signup: "/signup" | "/company/signup";
  signupLabel: string;
}) {
  return (
    <section className="flex flex-col items-center px-6 py-14 text-center sm:px-12 lg:py-0">
      <span className="rounded-full border border-deep-border bg-brand-deep-2 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-on-deep">
        {tag}
      </span>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-on-deep sm:text-4xl">
        {lead} <em className="font-semibold">{em}</em>
      </h2>
      <p className="mt-4 max-w-md text-[15px] leading-7 text-on-deep-muted">{body}</p>
      <Link
        to={login}
        className="mt-10 inline-flex h-11 items-center rounded-md bg-brand px-7 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/85"
      >
        Login
      </Link>
      <p className="mt-10 text-sm text-on-deep-muted">Don't have an account?</p>
      <Link to={signup} className="mt-1 text-sm font-semibold text-on-deep underline-offset-4 hover:underline">
        {signupLabel}
      </Link>
    </section>
  );
}

function PortalChooser() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (isUserAccountManager(user)) {
        navigate({ to: "/am" });
      } else if (isUserCompany(user)) {
        navigate({ to: "/company" });
      } else if (isUserRecruiterFreelancer(user)) {
        navigate({ to: "/dashboard" });
      }
    }
  }, [isAuthenticated, isLoading, navigate, user]);

  if (!isLoading && isAuthenticated && user) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-brand-deep">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2.5">
          <img
            src="/knowledge-tree.png"
            alt="Yuvro Marketplace"
            className="size-7 object-contain"
          />
          <span className="text-[13px] font-semibold tracking-tight text-on-deep">Yuvro Marketplace</span>
        </div>
        <Link to="/am/login" className="text-xs font-semibold text-on-deep-muted hover:text-on-deep">
          Account Manager sign in
        </Link>
      </header>
      <main className="grid flex-1 items-center lg:grid-cols-2">
        <Side
          tag="Business"
          lead="For"
          em="Companies"
          body="Post roles, review recruiter-submitted candidates with AI requirement matching, and move them to hire."
          login="/company/login"
          signup="/company/signup"
          signupLabel="Create company account"
        />
        <div className="border-t border-deep-border lg:hidden" />
        <div className="lg:border-l lg:border-deep-border">
          <Side
            tag="Recruiters"
            lead="For"
            em="Recruiters"
            body="Work approved marketplace roles, submit candidates, track your pipeline and earn published bounties."
            login="/login"
            signup="/signup"
            signupLabel="Create recruiter account"
          />
        </div>
      </main>
      <footer className="px-6 py-5 text-center text-[11px] text-on-deep-muted sm:px-10">
        Terms · Privacy · Support
      </footer>
    </div>
  );
}
