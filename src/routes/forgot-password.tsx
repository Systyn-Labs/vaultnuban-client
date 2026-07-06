import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Circle, MailCheck } from "lucide-react";
import { useSession } from "@/data/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password · VaultNUBAN" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const requestPasswordReset = useSession((s) => s.requestPasswordReset);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await requestPasswordReset(email);
      // Always show the same neutral confirmation — the API doesn't reveal
      // whether the address has an account, and neither do we.
      setSent(true);
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

        {sent ? (
          <div className="border bg-surface p-6">
            <div className="flex items-center gap-2">
              <MailCheck className="h-4 w-4 text-credit" strokeWidth={2.25} />
              <h1 className="text-base font-medium">Check your inbox</h1>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
              If an account exists for <span className="text-foreground">{email}</span>, we've
              sent a link to reset your password. The link expires in 30 minutes.
            </p>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Didn't get it? Check your spam folder, or{" "}
              <button
                type="button"
                onClick={() => setSent(false)}
                className="text-foreground underline underline-offset-2"
              >
                try a different email
              </button>
              .
            </p>
            <Button asChild variant="outline" className="mt-5 w-full">
              <Link to="/login">Back to sign in</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="border bg-surface p-6">
            <h1 className="text-base font-medium">Reset your password</h1>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Enter the email registered with your account and we'll send you a link to set a
              new password.
            </p>

            <div className="mt-5 space-y-1.5">
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

            {error && (
              <div className="mt-4 border border-status-failed/40 bg-status-failed-soft px-3 py-2 text-[12px] text-status-failed">
                {error}
              </div>
            )}

            <Button type="submit" disabled={busy} className="mt-5 w-full">
              {busy ? "Sending…" : "Send reset link"}
            </Button>

            <p className="mt-4 text-center text-[11px] text-muted-foreground">
              Remembered it?{" "}
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
