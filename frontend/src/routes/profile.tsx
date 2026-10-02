import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, Check, Landmark, Pencil, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { WorkspacePage } from "@/components/app/workspace-page";
import { Panel, PanelHeader } from "@/components/app/primitives";
import { StatusBadge } from "@/components/app/status-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, getUserDisplayName, getUserInitials } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Recruiter Account & Payouts — Recruiter OS" },
      {
        name: "description",
        content:
          "Manage your recruiter account: edit email, phone and LinkedIn, review your joined date, and add bank account details for payouts.",
      },
      { property: "og:title", content: "Recruiter Account & Payouts — Recruiter OS" },
      {
        property: "og:description",
        content: "Edit contact details and add verified bank account details for placement payouts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

type Contact = { email: string; phone: string; linkedin: string };
type Bank = {
  bankName: string;
  holder: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifsc: string;
  branch: string;
  accountType: "Savings" | "Current";
};

const CONTACT_KEY = "recruiter.contact.v1";
const BANK_KEY = "recruiter.bank.v1";

function maskAccount(value: string) {
  const tail = value.slice(-4);
  return `${"•".repeat(Math.max(value.length - 4, 0))}${tail}`;
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function ProfilePage() {
  const { user } = useAuth();
  const displayName = getUserDisplayName(user, "Recruiter");
  const initials = getUserInitials(user, "R");
  const agency = user?.roles?.company_name || "Independent Recruiter";
  const joinedDate = user?.date_joined
    ? new Date(user.date_joined).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Member";

  const [contact, setContact] = useState<Contact>({
    email: user?.email || "",
    phone: user?.phone_number || "",
    linkedin: "",
  });
  const [editingContact, setEditingContact] = useState(false);
  const [contactDraft, setContactDraft] = useState<Contact>({
    email: user?.email || "",
    phone: user?.phone_number || "",
    linkedin: "",
  });
  const [contactErrors, setContactErrors] = useState<Partial<Contact>>({});

  const [bank, setBank] = useState<Bank | null>(null);
  const [bankForm, setBankForm] = useState<Bank>({
    bankName: "",
    holder: displayName,
    accountNumber: "",
    confirmAccountNumber: "",
    ifsc: "",
    branch: "",
    accountType: "Savings",
  });
  const [editingBank, setEditingBank] = useState(false);
  const [bankErrors, setBankErrors] = useState<Partial<Record<keyof Bank, string>>>({});

  useEffect(() => {
    try {
      const c = localStorage.getItem(CONTACT_KEY);
      if (c) {
        const parsed = JSON.parse(c) as Contact;
        setContact(parsed);
        setContactDraft(parsed);
      } else if (user) {
        const initial: Contact = {
          email: user.email || "",
          phone: user.phone_number || "",
          linkedin: "",
        };
        setContact(initial);
        setContactDraft(initial);
      }

      const b = localStorage.getItem(BANK_KEY);
      if (b) {
        const parsedBank = JSON.parse(b) as Bank;
        setBank(parsedBank);
        setBankForm(parsedBank);
      } else {
        setBankForm((prev) => ({
          ...prev,
          holder: prev.holder || displayName,
        }));
      }
    } catch {
      /* ignore malformed storage */
    }
  }, [user, displayName]);

  function saveContact() {
    const errors: Partial<Contact> = {};
    const email = contactDraft.email.trim();
    const phone = contactDraft.phone.trim();
    const linkedin = contactDraft.linkedin.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = "Enter a valid email address";
    if (phone && phone.replace(/\D/g, "").length < 8) errors.phone = "Enter a valid phone number";
    if (linkedin && !/linkedin\.com\//i.test(linkedin)) errors.linkedin = "Enter a valid LinkedIn profile URL";

    setContactErrors(errors);
    if (Object.keys(errors).length) return;

    const next: Contact = { email, phone, linkedin };
    setContact(next);
    localStorage.setItem(CONTACT_KEY, JSON.stringify(next));
    setEditingContact(false);
    toast.success("Contact details updated");
  }

  function saveBank() {
    const errors: Partial<Record<keyof Bank, string>> = {};
    const accountNumber = bankForm.accountNumber.replace(/\s/g, "");
    const confirm = bankForm.confirmAccountNumber.replace(/\s/g, "");
    const ifsc = bankForm.ifsc.trim().toUpperCase();

    if (!bankForm.bankName.trim()) errors.bankName = "Bank name is required";
    if (!bankForm.holder.trim()) errors.holder = "Account holder name is required";
    if (!/^\d{8,18}$/.test(accountNumber)) errors.accountNumber = "Account number must be 8–18 digits";
    else if (accountNumber !== confirm) errors.confirmAccountNumber = "Account numbers do not match";
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) errors.ifsc = "IFSC must look like HDFC0001234";

    setBankErrors(errors);
    if (Object.keys(errors).length) return;

    const next: Bank = {
      ...bankForm,
      accountNumber,
      confirmAccountNumber: confirm,
      ifsc,
      bankName: bankForm.bankName.trim(),
      holder: bankForm.holder.trim(),
      branch: bankForm.branch.trim(),
    };
    setBank(next);
    localStorage.setItem(BANK_KEY, JSON.stringify(next));
    setEditingBank(false);
    toast.success("Bank account saved for payouts");
  }

  return (
    <WorkspacePage
      title="Account & payouts"
      description="Your recruiter identity, contact details and the bank account we send placement payouts to."
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Panel>
          <PanelHeader
            title="Recruiter details"
            meta={`Joined ${joinedDate} · ${agency}`}
            actions={
              editingContact ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setContactDraft(contact);
                      setContactErrors({});
                      setEditingContact(false);
                    }}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-[13px] font-medium text-muted-foreground hover:bg-surface-sunken"
                  >
                    <X className="size-3.5" /> Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveContact}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-brand px-2.5 text-[13px] font-semibold text-brand-foreground hover:bg-brand/90"
                  >
                    <Check className="size-3.5" /> Save
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingContact(true)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-[13px] font-medium text-foreground hover:bg-surface-sunken"
                >
                  <Pencil className="size-3.5" /> Edit
                </button>
              )
            }
          />
          <div className="p-4">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-foreground text-[13px] font-semibold text-background">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold tracking-tight text-foreground">{displayName}</p>
                <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                  <Building2 className="size-3.5" /> {agency}
                </p>
              </div>
            </div>

            {editingContact ? (
              <div className="mt-4 space-y-4">
                <Field id="email" label="Email" error={contactErrors.email}>
                  <Input
                    id="email"
                    type="email"
                    className="h-10"
                    value={contactDraft.email}
                    onChange={(e) => setContactDraft({ ...contactDraft, email: e.target.value })}
                  />
                </Field>
                <Field id="phone" label="Phone number" error={contactErrors.phone}>
                  <Input
                    id="phone"
                    className="h-10"
                    placeholder="+1 (555) 000-0000"
                    value={contactDraft.phone}
                    onChange={(e) => setContactDraft({ ...contactDraft, phone: e.target.value })}
                  />
                </Field>
                <Field
                  id="linkedin"
                  label="LinkedIn profile"
                  hint="Shown to clients on your submissions"
                  error={contactErrors.linkedin}
                >
                  <Input
                    id="linkedin"
                    className="h-10"
                    placeholder="linkedin.com/in/username"
                    value={contactDraft.linkedin}
                    onChange={(e) => setContactDraft({ ...contactDraft, linkedin: e.target.value })}
                  />
                </Field>
              </div>
            ) : (
              <dl className="mt-1 divide-y divide-border">
                {[
                  { label: "Email", value: contact.email || "—" },
                  { label: "Phone number", value: contact.phone || "—" },
                  {
                    label: "LinkedIn",
                    value: contact.linkedin ? (
                      <a
                        href={contact.linkedin.startsWith("http") ? contact.linkedin : `https://${contact.linkedin}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand hover:underline"
                      >
                        {contact.linkedin}
                      </a>
                    ) : (
                      "—"
                    ),
                  },
                  { label: "Joined", value: joinedDate },
                ].map((row) => (
                  <div key={row.label} className="grid grid-cols-[130px_minmax(0,1fr)] gap-3 py-3">
                    <dt className="text-xs text-muted-foreground">{row.label}</dt>
                    <dd className="min-w-0 truncate text-[13px] text-foreground">{row.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Bank account for payouts"
            meta="Placement fees are transferred to this account within 5 business days of invoice clearance."
            actions={
              bank && !editingBank ? (
                <button
                  type="button"
                  onClick={() => {
                    setBankForm(bank);
                    setBankErrors({});
                    setEditingBank(true);
                  }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-[13px] font-medium text-foreground hover:bg-surface-sunken"
                >
                  <Pencil className="size-3.5" /> Edit
                </button>
              ) : null
            }
          />

          {bank && !editingBank ? (
            <div className="p-4">
              <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-sunken px-3 py-2.5">
                <span className="flex min-w-0 items-center gap-2">
                  <Landmark className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-[13px] font-semibold text-foreground">{bank.bankName}</span>
                </span>
                <StatusBadge tone="success" dot>
                  Active
                </StatusBadge>
              </div>
              <dl className="mt-1 divide-y divide-border">
                {[
                  { label: "Account holder", value: bank.holder },
                  { label: "Account number", value: maskAccount(bank.accountNumber) },
                  { label: "IFSC code", value: bank.ifsc },
                  { label: "Branch", value: bank.branch || "—" },
                  { label: "Account type", value: bank.accountType },
                ].map((row) => (
                  <div key={row.label} className="grid grid-cols-[130px_minmax(0,1fr)] gap-3 py-3">
                    <dt className="text-xs text-muted-foreground">{row.label}</dt>
                    <dd className={cn("min-w-0 truncate text-[13px] text-foreground", row.label !== "Account holder" && "font-mono")}>
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : (
            <form
              className="p-4"
              onSubmit={(e) => {
                e.preventDefault();
                saveBank();
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="bankName" label="Bank name *" error={bankErrors.bankName}>
                  <Input
                    id="bankName"
                    className="h-10"
                    placeholder="HDFC Bank"
                    value={bankForm.bankName}
                    onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                  />
                </Field>
                <Field id="holder" label="Account holder name *" error={bankErrors.holder}>
                  <Input
                    id="holder"
                    className="h-10"
                    placeholder="As printed on the passbook"
                    value={bankForm.holder}
                    onChange={(e) => setBankForm({ ...bankForm, holder: e.target.value })}
                  />
                </Field>
                <Field id="accountNumber" label="Account number *" error={bankErrors.accountNumber}>
                  <Input
                    id="accountNumber"
                    inputMode="numeric"
                    autoComplete="off"
                    className="h-10 font-mono"
                    value={bankForm.accountNumber}
                    onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value.replace(/[^\d]/g, "") })}
                  />
                </Field>
                <Field
                  id="confirmAccountNumber"
                  label="Re-confirm account number *"
                  error={bankErrors.confirmAccountNumber}
                >
                  <Input
                    id="confirmAccountNumber"
                    inputMode="numeric"
                    autoComplete="off"
                    className="h-10 font-mono"
                    value={bankForm.confirmAccountNumber}
                    onChange={(e) =>
                      setBankForm({ ...bankForm, confirmAccountNumber: e.target.value.replace(/[^\d]/g, "") })
                    }
                  />
                </Field>
                <Field id="ifsc" label="IFSC code *" hint="11 characters, e.g. HDFC0001234" error={bankErrors.ifsc}>
                  <Input
                    id="ifsc"
                    className="h-10 font-mono uppercase"
                    maxLength={11}
                    value={bankForm.ifsc}
                    onChange={(e) => setBankForm({ ...bankForm, ifsc: e.target.value.toUpperCase() })}
                  />
                </Field>
                <Field id="branch" label="Branch (optional)">
                  <Input
                    id="branch"
                    className="h-10"
                    placeholder="Indiranagar, Bengaluru"
                    value={bankForm.branch}
                    onChange={(e) => setBankForm({ ...bankForm, branch: e.target.value })}
                  />
                </Field>
                <Field id="accountType" label="Account type">
                  <select
                    id="accountType"
                    value={bankForm.accountType}
                    onChange={(e) => setBankForm({ ...bankForm, accountType: e.target.value as Bank["accountType"] })}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none focus-visible:ring-[3px] focus-visible:ring-brand/20"
                  >
                    <option>Savings</option>
                    <option>Current</option>
                  </select>
                </Field>
              </div>

              <p className="mt-4 flex items-start gap-2 rounded-md border border-border bg-surface-sunken px-3 py-2.5 text-xs text-muted-foreground">
                <ShieldCheck className="mt-px size-4 shrink-0" />
                Account details are used only for payouts. We mask the account number after saving.
              </p>

              <div className="mt-4 flex gap-2">
                <button
                  type="submit"
                  className="h-10 rounded-md bg-brand px-4 text-[13px] font-semibold text-brand-foreground hover:bg-brand/90"
                >
                  {bank ? "Update bank account" : "Add bank account"}
                </button>
                {bank ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBank(false);
                      setBankErrors({});
                    }}
                    className="h-10 rounded-md border border-border px-4 text-[13px] font-semibold text-foreground hover:bg-surface-sunken"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          )}
        </Panel>
      </div>
    </WorkspacePage>
  );
}
