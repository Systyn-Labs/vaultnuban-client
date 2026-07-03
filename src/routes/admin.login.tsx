import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useSession } from "@/data/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin sign in · VaultNUBAN" }] }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const adminLogin = useSession((s) => s.adminLogin);
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
      await adminLogin(email, password);
      navigate({ to: "/admin" });
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
            <ShieldCheck className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight">VaultNUBAN</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Platform Operator Console
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="border bg-surface p-6">
          <h1 className="text-base font-medium">Admin sign in</h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Separate from tenant sign-in. Two-factor authentication is required for
            sensitive platform actions.
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
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
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
          Every admin action is recorded in the platform audit log.
        </p>
      </div>
    </div>
  );
}
