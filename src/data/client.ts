import { VaultNuban } from "@systynlabs/vaultnuban";
import { API_BASE_URL, useSession } from "./session";
import { AdminHttpClient } from "./adminHttp";

// One SDK instance per API key. The dashboard dogfoods the official
// @systynlabs/vaultnuban SDK for every tenant-scoped (/v1/*) call.
let cached: { key: string; userSessionToken?: string; client: VaultNuban } | null = null;

export function vn(): VaultNuban {
  const session = useSession.getState().session;
  const key = session?.apiKey;
  if (!key) throw new Error("Not authenticated as a tenant user");
  const userSessionToken = session?.userSessionToken;
  if (cached?.key !== key || cached?.userSessionToken !== userSessionToken) {
    cached = { key, userSessionToken, client: new VaultNuban({ apiKey: key, userSessionToken, baseUrl: API_BASE_URL }) };
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
