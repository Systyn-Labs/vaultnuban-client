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
  adminToken?: string; // operator token (admin)
}

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

interface SessionState {
  session: Session | null;
  login: (email: string, password: string) => Promise<Session>;
  logout: () => void;
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
          adminToken: body.admin_token,
        };
        set({ session });
        return session;
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
