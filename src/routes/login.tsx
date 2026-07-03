import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Circle, KeyRound } from "lucide-react";
import { homeForRole, useSession } from "@/data/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in · VaultNUBAN" }] }),
  component: LoginPage,
});

// Seeded demo credentials — one per persona. Not a secret: these only exist
// on local/demo databases seeded by the server's bootstrap script.
const TEST_ACCOUNTS = [
  {
    label: "Adaeze Okonkwo",
    role: "Tenant Developer",
    tenant: "Acme Fintech",
    email: "ada@acme.io",
    password: "Dev1234!",
  },
  {
    label: "Bisi Thomas",
    role: "Tenant Ops",
    tenant: "Acme Fintech",
    email: "bisi@acme.io",
    password: "Ops1234!",
  },
  {
    label: "Systyn Operator",
    role: "Platform Admin",
    tenant: "All tenants",
    email: "operator@systyn.io",
    password: "Admin1234!",
  },
] as const;

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
      navigate({ to: homeForRole(session.role) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  function fillTestAccount(acct: (typeof TEST_ACCOUNTS)[number]) {
    setEmail(acct.email);
    setPassword(acct.password);
    setError(null);
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

        <div className="mt-6">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Test credentials
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-1.5">
            {TEST_ACCOUNTS.map((acct) => (
              <button
                key={acct.email}
                type="button"
                onClick={() => fillTestAccount(acct)}
                className="flex w-full items-center gap-3 border bg-surface px-3 py-2 text-left transition-colors hover:bg-muted/50"
              >
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-muted text-muted-foreground">
                  <KeyRound className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-medium">{acct.label}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {acct.role} · {acct.tenant}
                  </div>
                </div>
                <div className="tabular shrink-0 text-right text-[10px] text-muted-foreground">
                  <div className="truncate">{acct.email}</div>
                </div>
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Click a credential to fill the form, then sign in.
          </p>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Every session is recorded in the audit trail.
        </p>
      </div>
    </div>
  );
}
