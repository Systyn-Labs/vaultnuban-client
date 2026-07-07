import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// The three personas VaultNUBAN serves:
//   admin — platform operator; holds the operator token, works on /internal/*
//   ops   — tenant operations; holds the tenant API key, works on /v1/*
//   dev   — tenant developer; same key as ops, different workspace focus
export type Role = "admin" | "ops" | "dev";

export interface Session {
  name: string;
  email: string;
  role: Role;
  tenantId?: string;
  tenantName?: string;
  apiKey?: string; // tenant key (ops/dev)
  userSessionToken?: string; // per-user session, distinct from the shared tenant API key
  adminSessionToken?: string; // per-admin session (X-Admin-Session), admin persona only
  mfaEnabled: boolean;
  sessionExpiresAt?: string; // ISO timestamp — drives the expiry warning
  mustChangePassword?: boolean; // onboarded user on a temporary password — gated until changed
}

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

interface SessionState {
  session: Session | null;
  login: (email: string, password: string) => Promise<Session>;
  /** Platform-admin login — POST /internal/auth/login, distinct endpoint and session type. */
  adminLogin: (email: string, password: string) => Promise<Session>;
  logout: () => void;
  /** Updates the local mfaEnabled flag after a successful /mfa/enable call. */
  setMfaEnabled: (enabled: boolean) => void;
  /** Extends the current session's server-side TTL; picks the right endpoint/header for the persona. */
  refreshSession: () => Promise<void>;
  /**
   * Requests a password-reset email. Resolves regardless of whether the email
   * has an account — the API deliberately returns the same response either way
   * (anti-enumeration), so the UI must not reveal existence.
   */
  requestPasswordReset: (email: string) => Promise<void>;
  /** Completes a reset with the token from the emailed link plus the new password. */
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  /**
   * Changes the logged-in tenant user's password (first-login forced change or
   * self-service). Clears the local mustChangePassword gate on success.
   */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

// `persist` reads sessionStorage asynchronously in the background starting
// at module load. If `login()` sets state before that initial read resolves,
// the read finishes afterward and clobbers the fresh session back to
// whatever (empty) value it found in storage — a classic zustand-persist
// race. `login` awaits this once, up front, so it can never lose that race.
function waitForHydration(): Promise<void> {
  if (useSession.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = useSession.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      // `persist` reads sessionStorage asynchronously, so on first mount
      // `session` is briefly null even for a logged-in user. Callers that
      // gate a redirect on "no session" must first check
      // `useSession.persist.hasHydrated()` (or the finish-hydration callback)
      // to avoid bouncing an authenticated user to /login.
      session: null,

      async login(email, password) {
        await waitForHydration();
        const resp = await fetch(`${API_BASE_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!resp.ok) {
          const problem = await resp.json().catch(() => null);
          throw new Error(problem?.detail ?? "Invalid email or password");
        }
        const body = await resp.json();
        const session: Session = {
          name: body.name,
          email: body.email,
          role: body.role as Role,
          tenantId: body.tenant_id,
          tenantName: body.tenant_name,
          apiKey: body.api_key,
          userSessionToken: body.user_session_token,
          mfaEnabled: Boolean(body.mfa_enabled),
          sessionExpiresAt: body.session_expires_at,
          mustChangePassword: Boolean(body.must_change_password),
        };
        set({ session });
        return session;
      },

      async adminLogin(email, password) {
        await waitForHydration();
        const resp = await fetch(`${API_BASE_URL}/internal/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!resp.ok) {
          const problem = await resp.json().catch(() => null);
          throw new Error(problem?.detail ?? "Invalid email or password");
        }
        const body = await resp.json();
        const session: Session = {
          name: body.name,
          email: body.email,
          role: body.role as Role,
          adminSessionToken: body.admin_session_token,
          mfaEnabled: Boolean(body.mfa_enabled),
          sessionExpiresAt: body.session_expires_at,
        };
        set({ session });
        return session;
      },

      setMfaEnabled(enabled) {
        set((s) => (s.session ? { session: { ...s.session, mfaEnabled: enabled } } : s));
      },

      async refreshSession() {
        const session = useSession.getState().session;
        if (!session) return;
        const isAdmin = session.role === "admin";
        const path = isAdmin ? "/internal/auth/session/refresh" : "/auth/session/refresh";
        const headerName = isAdmin ? "X-Admin-Session" : "X-User-Session";
        const token = isAdmin ? session.adminSessionToken : session.userSessionToken;
        if (!token) return;
        const resp = await fetch(`${API_BASE_URL}${path}`, {
          method: "POST",
          headers: { [headerName]: token },
        });
        if (!resp.ok) throw new Error("Session refresh failed — please log in again");
        const body = await resp.json();
        set((s) =>
          s.session ? { session: { ...s.session, sessionExpiresAt: body.session_expires_at } } : s,
        );
      },

      async requestPasswordReset(email) {
        const resp = await fetch(`${API_BASE_URL}/auth/password/forgot`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        // A non-2xx here is an infrastructure/rate-limit problem, not "email
        // doesn't exist" — the API returns 200 for both existing and unknown
        // addresses, so we only surface genuine failures.
        if (!resp.ok) {
          const problem = await resp.json().catch(() => null);
          throw new Error(problem?.detail ?? "Could not send the reset email. Please try again.");
        }
      },

      async resetPassword(token, newPassword) {
        const resp = await fetch(`${API_BASE_URL}/auth/password/reset`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, new_password: newPassword }),
        });
        if (!resp.ok) {
          const problem = await resp.json().catch(() => null);
          throw new Error(problem?.detail ?? "This reset link is invalid or has expired.");
        }
      },

      async changePassword(currentPassword, newPassword) {
        const token = useSession.getState().session?.userSessionToken;
        if (!token) throw new Error("Not authenticated");
        const resp = await fetch(`${API_BASE_URL}/v1/password/change`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-User-Session": token },
          body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
        });
        if (!resp.ok) {
          const problem = await resp.json().catch(() => null);
          throw new Error(problem?.detail ?? "Could not change your password.");
        }
        // Clear the local gate so the auth guard stops redirecting to /change-password.
        set((s) => (s.session ? { session: { ...s.session, mustChangePassword: false } } : s));
      },

      logout() {
        set({ session: null });
      },
    }),
    {
      name: "vaultnuban.session",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);

/** Landing route for a role after login. */
export function homeForRole(role: Role): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "dev":
      return "/developers/api-keys";
    default:
      return "/";
  }
}
