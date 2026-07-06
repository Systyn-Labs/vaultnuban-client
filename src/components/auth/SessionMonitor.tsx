import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock, Loader2 } from "lucide-react";
import { useSession, API_BASE_URL } from "@/data/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const IDLE_LIMIT_MS = 5 * 60 * 1000;
const EXPIRY_WARNING_WINDOW_MS = 5 * 60 * 1000;
const CHECK_INTERVAL_MS = 5_000;
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;

/**
 * Renders once at the app root (alongside StepUpDialog). Tracks user
 * activity and the session's server-side expiry to:
 *  - lock the screen after 5 minutes of inactivity (re-entry of the current
 *    password unlocks without discarding the underlying session tokens)
 *  - warn 5 minutes before the session token actually expires, with a
 *    one-click "stay logged in" action that extends the TTL server-side
 *  - log the user out if the session expires before they respond
 */
export function SessionMonitor() {
  const session = useSession((s) => s.session);
  const refreshSession = useSession((s) => s.refreshSession);
  const logout = useSession((s) => s.logout);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [locked, setLocked] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const warnedRef = useRef(false);

  // Track activity — a ref (not state) so listeners don't cause re-renders.
  useEffect(() => {
    if (!session) return;
    const mark = () => {
      lastActivityRef.current = Date.now();
    };
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, mark, { passive: true }));
    return () => ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, mark));
  }, [session]);

  useEffect(() => {
    if (!session) {
      setLocked(false);
      warnedRef.current = false;
      return;
    }

    const interval = window.setInterval(() => {
      const now = Date.now();

      if (!locked && now - lastActivityRef.current >= IDLE_LIMIT_MS) {
        setLocked(true);
      }

      const expiresAt = session.sessionExpiresAt
        ? new Date(session.sessionExpiresAt).getTime()
        : null;
      if (expiresAt == null) return;

      if (now >= expiresAt) {
        logout();
        queryClient.clear();
        toast.error("Your session has expired", { description: "Please log in again." });
        navigate({ to: session.role === "admin" ? "/admin/login" : "/login" });
        return;
      }

      if (!warnedRef.current && expiresAt - now <= EXPIRY_WARNING_WINDOW_MS) {
        warnedRef.current = true;
        const minutesLeft = Math.max(1, Math.round((expiresAt - now) / 60_000));
        toast.warning(
          `Your session expires in about ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}`,
          {
            duration: 30_000,
            action: {
              label: "Stay logged in",
              onClick: () => {
                refreshSession()
                  .then(() => {
                    warnedRef.current = false;
                    toast.success("Session extended");
                  })
                  .catch(() => toast.error("Couldn't extend session — please log in again"));
              },
            },
          },
        );
      }
    }, CHECK_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [session, locked, logout, navigate, refreshSession, queryClient]);

  if (!locked || !session) return null;

  return (
    <LockScreen
      email={session.email}
      onUnlock={() => {
        lastActivityRef.current = Date.now();
        setLocked(false);
      }}
      onLogout={() => {
        logout();
        queryClient.clear();
        navigate({ to: session.role === "admin" ? "/admin/login" : "/login" });
      }}
    />
  );
}

function LockScreen({
  email,
  onUnlock,
  onLogout,
}: {
  email: string;
  onUnlock: () => void;
  onLogout: () => void;
}) {
  const session = useSession((s) => s.session);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const isAdmin = session?.role === "admin";
      const path = isAdmin ? "/internal/auth/login" : "/auth/login";
      const resp = await fetch(`${API_BASE_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!resp.ok) {
        const problem = await resp.json().catch(() => null);
        throw new Error(problem?.detail ?? "Incorrect password");
      }
      onUnlock();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Incorrect password");
    } finally {
      setBusy(false);
      setPassword("");
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="w-full max-w-sm border bg-surface p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-[15px] font-medium">Session locked</h2>
        </div>
        <p className="mb-4 text-[12px] text-muted-foreground">
          Locked after 5 minutes of inactivity. Enter your password to continue as{" "}
          <strong>{email}</strong>.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="lock-password">Password</Label>
          <Input
            id="lock-password"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === "Enter" && password.length > 0 && !busy) submit();
            }}
          />
        </div>
        {error && (
          <div className="mt-3 border border-status-failed/40 bg-status-failed-soft px-3 py-2 text-[12px] text-status-failed">
            {error}
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onLogout} disabled={busy}>
            Log out
          </Button>
          <Button
            className="flex-1 gap-1.5"
            onClick={submit}
            disabled={busy || password.length === 0}
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Unlock
          </Button>
        </div>
      </div>
    </div>
  );
}
