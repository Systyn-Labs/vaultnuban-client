import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Circle } from "lucide-react";
import { homeForRole, useSession } from "@/data/session";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

const MIN_PASSWORD_LENGTH = 8;

export const Route = createFileRoute("/change-password")({
  head: () => ({ meta: [{ title: "Change your password · VaultNUBAN" }] }),
  component: ChangePasswordPage,
});

function ChangePasswordPage() {
  const session = useSession((s) => s.session);
  const changePassword = useSession((s) => s.changePassword);
  const logout = useSession((s) => s.logout);
  const navigate = useNavigate();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // No session at all → bounce to sign-in. (A user who already changed their
  // password just gets sent home.)
  useEffect(() => {
    if (!useSession.persist.hasHydrated()) return;
    if (!session?.userSessionToken) {
      navigate({ to: "/login" });
    } else if (!session.mustChangePassword) {
      navigate({ to: homeForRole(session.role) });
    }
  }, [session, navigate]);

  const forced = Boolean(session?.mustChangePassword);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (next !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await changePassword(current, next);
      navigate({ to: homeForRole(session?.role ?? "ops") });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-sm bg-primary text-primary-foreground">
            <Circle className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight">VaultNUBAN</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Financial Operating System
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="border bg-surface p-6">
          <h1 className="text-base font-medium">
            {forced ? "Set your new password" : "Change your password"}
          </h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {forced
              ? "Your account was created with a temporary password. Choose a new one to continue — this is required before you can do anything else."
              : "Choose a strong password you don't use anywhere else."}
          </p>

          <div className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="current">
                {forced ? "Temporary password" : "Current password"}
              </Label>
              <PasswordInput
                id="current"
                autoComplete="current-password"
                required
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="next">New password</Label>
              <PasswordInput
                id="next"
                autoComplete="new-password"
                required
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm new password</Label>
              <PasswordInput
                id="confirm"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 border border-status-failed/40 bg-status-failed-soft px-3 py-2 text-[12px] text-status-failed">
              {error}
            </div>
          )}

          <Button type="submit" disabled={busy} className="mt-5 w-full">
            {busy ? "Updating…" : "Update password"}
          </Button>

          {forced && (
            <button
              type="button"
              onClick={() => {
                logout();
                navigate({ to: "/login" });
              }}
              className="mt-4 w-full text-center text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Sign out instead
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
