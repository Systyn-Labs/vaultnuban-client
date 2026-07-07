import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Circle } from "lucide-react";
import { homeForRole, useSession } from "@/data/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in · VaultNUBAN" }] }),
  component: LoginPage,
});

function LoginPage() {
  const login = useSession((s) => s.login);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const session = await login(email, password);
      if (session.mustChangePassword) {
        navigate({ to: "/change-password" });
      } else {
        navigate({ to: homeForRole(session.role) });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
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
          <h1 className="text-base font-medium">Sign in</h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Tenant and operator credentials are issued during onboarding.
          </p>

          <div className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                The email registered with your tenant.
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 border border-status-failed/40 bg-status-failed-soft px-3 py-2 text-[12px] text-status-failed">
              {error}
            </div>
          )}

          <Button type="submit" disabled={busy} className="mt-5 w-full">
            {busy ? "Verifying…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Two-factor authentication is required for actions on sensitive records.
          Every session is recorded in the audit trail.
        </p>
      </div>
    </div>
  );
}
