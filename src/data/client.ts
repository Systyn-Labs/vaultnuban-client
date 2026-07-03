import { VaultNuban, HttpClient } from "@systynlabs/vaultnuban";
import { API_BASE_URL, useSession } from "./session";

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

// /internal/* endpoints share bearer-auth semantics, so the SDK's HTTP core
// (problem+json errors, retries, pagination) is reused with the operator token.
let cachedAdmin: { key: string; http: HttpClient } | null = null;

export function adminHttp(): HttpClient {
  const token = useSession.getState().session?.adminToken;
  if (!token) throw new Error("Not authenticated as a platform operator");
  if (cachedAdmin?.key !== token) {
    cachedAdmin = { key: token, http: new HttpClient({ apiKey: token, baseUrl: API_BASE_URL }) };
  }
  return cachedAdmin.http;
}
