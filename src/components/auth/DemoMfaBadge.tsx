import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { KeyRound, Copy, Check } from "lucide-react";
import { API_BASE_URL, useSession } from "@/data/session";

interface DemoCode {
  enabled: boolean;
  code?: string;
  expires_in_seconds?: number;
  period_seconds?: number;
}

/**
 * DemoMfaBadge surfaces the current TOTP code for allow-listed demo/judge
 * accounts so evaluators without an authenticator app can complete step-up
 * (two-factor) actions. The backend returns 404 for any non-allow-listed
 * account, so this renders nothing for everyone else.
 */
export function DemoMfaBadge() {
  const session = useSession((s) => s.session);
  const role = session?.role;
  const isAdmin = role === "admin";
  const token = isAdmin ? session?.adminSessionToken : session?.userSessionToken;

  const query = useQuery({
    queryKey: ["demo-mfa", role, token],
    enabled: Boolean(token),
    retry: false,
    // Poll while a code is being shown; stop once the server says it's not a
    // demo account (or MFA isn't enrolled), so non-demo users don't poll a 404.
    refetchInterval: (q) => (q.state.data?.enabled === false ? false : 4000),
    queryFn: async (): Promise<DemoCode> => {
      const path = isAdmin ? "/internal/mfa/demo-code" : "/v1/mfa/demo-code";
      const header = isAdmin ? "X-Admin-Session" : "X-User-Session";
      const resp = await fetch(`${API_BASE_URL}${path}`, { headers: { [header]: token! } });
      if (!resp.ok) return { enabled: false };
      return resp.json();
    },
  });

  const data = query.data;

  // Local 1s countdown, reseeded whenever a fresh code arrives.
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (data?.expires_in_seconds == null) return;
    setSeconds(data.expires_in_seconds);
    const id = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [data?.code, data?.expires_in_seconds]);

  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(id);
  }, [copied]);

  if (!data?.enabled || !data.code) return null;

  const period = data.period_seconds ?? 30;
  const pct = Math.max(0, Math.min(1, seconds / period));

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(data.code!);
        setCopied(true);
      }}
      title="Demo two-factor code — click to copy. Enter this when the platform asks for an MFA code."
      style={{ borderColor: "rgba(217,153,43,0.45)" }}
      className="flex items-center gap-2 rounded-md border bg-surface-muted px-2.5 py-1 transition-colors hover:bg-surface"
    >
      <KeyRound className="h-3.5 w-3.5" style={{ color: "#c9871f" }} />
      <span className="hidden text-[9px] font-medium uppercase tracking-widest text-muted-foreground sm:inline">
        MFA
      </span>
      <span className="tabular text-[13px] font-semibold tracking-[0.18em]" style={{ color: "#c9871f" }}>
        {data.code.slice(0, 3)}&nbsp;{data.code.slice(3)}
      </span>
      {/* countdown ring */}
      <span
        className="grid h-4 w-4 shrink-0 place-items-center rounded-full"
        style={{
          background: `conic-gradient(#d9992b ${pct * 360}deg, var(--surface) 0deg)`,
        }}
      >
        <span className="grid h-3 w-3 place-items-center rounded-full bg-surface-muted text-[8px] tabular text-muted-foreground">
          {seconds}
        </span>
      </span>
      {copied ? (
        <Check className="h-3 w-3" style={{ color: "#c9871f" }} />
      ) : (
        <Copy className="h-3 w-3 text-muted-foreground" />
      )}
    </button>
  );
}
