import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Circle, CheckCircle2 } from "lucide-react";
import { useSession } from "@/data/session";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

const MIN_PASSWORD_LENGTH = 8;

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set a new password · VaultNUBAN" }] }),
  // The reset link carries ?token=…; coerce to a string so the component can
  // rely on its type. An absent token renders the "invalid link" state.
  validateSearch: (search: Record<string, unknown>): { token: string } => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const resetPassword = useSession((s) => s.resetPassword);
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setBusy(true);
    try {
      await resetPassword(token, password);
      setDone(true);
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

        {!token ? (
          <div className="border bg-surface p-6">
            <h1 className="text-base font-medium">Invalid reset link</h1>
            <p className="mt-1 text-[12px] text-muted-foreground">
              This link is missing its token or is malformed. Request a fresh one to continue.
            </p>
            <Button asChild className="mt-5 w-full">
              <Link to="/forgot-password">Request a new link</Link>
            </Button>
          </div>
        ) : done ? (
          <div className="border bg-surface p-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-credit" strokeWidth={2.25} />
              <h1 className="text-base font-medium">Password updated</h1>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
              Your password has been changed and any active sessions were signed out. Sign in
              with your new password to continue.
            </p>
            <Button className="mt-5 w-full" onClick={() => navigate({ to: "/login" })}>
              Go to sign in
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="border bg-surface p-6">
            <h1 className="text-base font-medium">Set a new password</h1>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Choose a strong password you don't use anywhere else. Minimum{" "}
              {MIN_PASSWORD_LENGTH} characters.
            </p>

            <div className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">New password</Label>
                <PasswordInput
                  id="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm password</Label>
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

            <p className="mt-4 text-center text-[11px] text-muted-foreground">
              <Link to="/login" className="text-foreground underline underline-offset-2">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
