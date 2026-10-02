import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Briefcase, Building2, UserRound, Users } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useAm, type SearchResult } from "./am-store";

const icons = {
  Job: Briefcase,
  Company: Building2,
  Recruiter: Users,
  Candidate: UserRound,
} as const;

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { search } = useAm();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const results = search(query);

  const go = (r: SearchResult) => {
    onOpenChange(false);
    setQuery("");
    if (r.kind === "Job") {
      navigate({ to: "/am/jobs/$jobId", params: { jobId: r.id }, search: { tab: "overview" } });
      return;
    }
    if (r.kind === "Recruiter") {
      navigate({ to: "/am/recruiters/$recruiterId", params: { recruiterId: r.id } });
      return;
    }
    if (r.kind === "Company") {
      navigate({ to: "/am/companies/$companyId", params: { companyId: r.id } });
      return;
    }
    const jobId = r.search?.["jobId"];
    if (jobId) {
      navigate({
        to: "/am/jobs/$jobId",
        params: { jobId },
        search: { tab: "candidates", focus: r.id },
      });
    } else {
      navigate({ to: "/am/jobs" });
    }
  };

  const groups: SearchResult["kind"][] = ["Job", "Candidate", "Recruiter", "Company"];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search companies, jobs, recruiters, candidates, job IDs…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[420px]">
        {query && results.length === 0 ? (
          <CommandEmpty>No matches for “{query}”.</CommandEmpty>
        ) : null}
        {!query ? (
          <div className="px-4 py-6 text-[13px] text-muted-foreground">
            Search across every company, job, recruiter and candidate. Results open the object in
            full job context.
          </div>
        ) : null}
        {groups.map((g) => {
          const items = results.filter((r) => r.kind === g);
          if (!items.length) return null;
          const Icon = icons[g];
          return (
            <CommandGroup key={g} heading={`${g}s`}>
              {items.map((r) => (
                <CommandItem
                  key={`${g}-${r.id}`}
                  value={`${g} ${r.title} ${r.context} ${r.meta}`}
                  onSelect={() => go(r)}
                >
                  <Icon className="size-4 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-foreground">
                      {r.title}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {r.kind} · {r.context}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{r.meta}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}
