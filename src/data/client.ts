import { VaultNuban } from "@systynlabs/vaultnuban";
import { API_BASE_URL, useSession } from "./session";
import { AdminHttpClient } from "./adminHttp";

// One SDK instance per user session. The dashboard dogfoods the official
// @systynlabs/vaultnuban SDK for every tenant-scoped (/v1/*) call, but
// deliberately never authenticates with the tenant's real API key — that
// key is a server-to-server credential for the tenant's own backend, and
// revoking/rotating it must not affect a logged-in dashboard user. The
// backend resolves the tenant from X-User-Session when present, ahead of
// the Authorization header (see vaultnuban's Auth() middleware), so this
// placeholder string is never treated as a credential — it only exists to
// satisfy the SDK constructor's non-empty apiKey requirement.
const SESSION_AUTH_PLACEHOLDER = "dashboard-session-auth";

let cached: { userSessionToken: string; client: VaultNuban } | null = null;

export function vn(): VaultNuban {
  const session = useSession.getState().session;
  const userSessionToken = session?.userSessionToken;
  if (!userSessionToken) throw new Error("Not authenticated as a tenant user");
  if (cached?.userSessionToken !== userSessionToken) {
    cached = {
      userSessionToken,
      client: new VaultNuban({
        apiKey: SESSION_AUTH_PLACEHOLDER,
        userSessionToken,
        baseUrl: API_BASE_URL,
      }),
    };
  }
  return cached.client;
}

// /internal/* is the admin-only surface — deliberately NOT the published SDK
// (that's for tenant-facing /v1/* integrators only). AdminHttpClient sends
// X-Admin-Session, the per-admin session minted at POST /internal/auth/login.
let cachedAdmin: { key: string; http: AdminHttpClient } | null = null;

export function adminHttp(): AdminHttpClient {
  const token = useSession.getState().session?.adminSessionToken;
  if (!token) throw new Error("Not authenticated as a platform operator");
  if (cachedAdmin?.key !== token) {
    cachedAdmin = { key: token, http: new AdminHttpClient(token) };
  }
  return cachedAdmin.http;
}
