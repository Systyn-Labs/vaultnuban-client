import { API_BASE_URL } from "./session";

export interface AdminRequestOptions {
  /** Single-use step-up token from a fresh MFA challenge (X-Step-Up-Token). */
  stepUpToken?: string;
}

// A minimal HTTP client for the admin-only /internal/* surface. This is
// intentionally NOT part of the published @systynlabs/vaultnuban SDK — that
// SDK is for tenant-facing /v1/* integrators only, and /internal/* endpoints
// must never be exposed there. Sends X-Admin-Session instead of a bearer key.
export class AdminHttpClient {
  constructor(private readonly adminSessionToken: string) {}

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: AdminRequestOptions,
  ): Promise<T> {
    const resp = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        "X-Admin-Session": this.adminSessionToken,
        ...(options?.stepUpToken ? { "X-Step-Up-Token": options.stepUpToken } : {}),
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!resp.ok) {
      const problem = await resp.json().catch(() => null);
      throw new Error(problem?.detail ?? `${method} ${path} failed (${resp.status})`);
    }
    if (resp.status === 204) return undefined as T;
    return (await resp.json()) as T;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }
  post<T>(path: string, body?: unknown, options?: AdminRequestOptions): Promise<T> {
    return this.request<T>("POST", path, body, options);
  }
  patch<T>(path: string, body?: unknown, options?: AdminRequestOptions): Promise<T> {
    return this.request<T>("PATCH", path, body, options);
  }
  put<T>(path: string, body?: unknown, options?: AdminRequestOptions): Promise<T> {
    return this.request<T>("PUT", path, body, options);
  }
  delete<T>(path: string, options?: AdminRequestOptions): Promise<T> {
    return this.request<T>("DELETE", path, undefined, options);
  }
}
