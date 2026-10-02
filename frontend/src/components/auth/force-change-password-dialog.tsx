import { useState } from "react";
import { KeyRound, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { restApiAuthUtil, yhubApiAuthUtil } from "@/utils/RestApiAuthUtil";

interface ForceChangePasswordDialogProps {
  open: boolean;
  onSuccess?: () => void;
}

export function ForceChangePasswordDialog({
  open,
  onSuccess,
}: ForceChangePasswordDialogProps) {
  const { user, updateUser } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!oldPassword) {
      setError("Please enter your current temporary password.");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (newPassword === oldPassword) {
      setError("New password must be different from your temporary password.");
      return;
    }

    setPending(true);

    try {
      await restApiAuthUtil.post<{
        message: string;
        user?: any;
      }>("/api/auth/change_password/", {
        old_password: oldPassword,
        new_password: newPassword,
      });

      // Synchronize new password to YHub if session exists
      try {
        await yhubApiAuthUtil.post("/auth/change-password/", {
          current_password: oldPassword,
          password: newPassword,
        });
      } catch (yhubErr) {
        console.warn("YHub change-password warning:", yhubErr);
      }

      if (user) {
        const updated = {
          ...user,
          is_temp_pw: false,
        };
        updateUser(updated);
      }

      toast.success("Password updated successfully! Welcome to your company portal.");
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error("Change password error:", err);
      const msg =
        err?.message ||
        err?.data?.error ||
        "Failed to update password. Please verify your temporary password.";
      setError(msg);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        hideCloseButton
        className="sm:max-w-[440px] p-6"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-2.5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-lg border border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
                Change Temporary Password
              </DialogTitle>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Action Required · Cannot be skipped
              </p>
            </div>
          </div>
          <DialogDescription className="text-left text-[13px] leading-5 text-muted-foreground">
            You signed in using a temporary password issued by your Account Manager. For security, please choose a new permanent password to continue.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="oldPassword"
              className="text-xs font-medium text-muted-foreground"
            >
              Current temporary password
            </Label>
            <Input
              id="oldPassword"
              type="password"
              autoComplete="current-password"
              placeholder="Enter temporary password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="newPassword"
              className="text-xs font-medium text-muted-foreground"
            >
              New password
            </Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="confirmPassword"
              className="text-xs font-medium text-muted-foreground"
            >
              Confirm new password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="h-10"
            />
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/25 bg-danger-soft px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          ) : null}

          <div className="pt-2">
            <button
              type="submit"
              disabled={pending}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-brand text-[13px] font-semibold text-brand-foreground transition-colors hover:bg-brand/90 disabled:opacity-70 cursor-pointer"
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Updating password...
                </>
              ) : (
                <>
                  <KeyRound className="size-4" />
                  Set New Password & Continue
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
