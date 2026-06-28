const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

const TOKEN_KEY = 'vaultnuban_token'

export function getApiToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function setApiToken(token: string | null) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token)
  else sessionStorage.removeItem(TOKEN_KEY)
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getApiToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>
    throw new Error((err['detail'] as string | undefined) ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  id: string
  name: string
  email: string
  role: 'dev' | 'ops' | 'admin'
  tenant_id?: string
  tenant_name?: string
  api_key?: string
  key_prefix?: string
}

export const authApi = {
  login: (email: string, password: string) =>
    request<LoginResponse>('POST', '/auth/login', { email, password }),
}

// ── Customers ─────────────────────────────────────────────────────────────────

export interface ApiCustomer {
  id: string
  tenant_id: string
  external_ref: string
  display_name: string
  status: string
  identity?: {
    id: string
    bvn_masked?: string
    nin_masked?: string
    kyc_tier: number
    verification_status: string
  }
  created_at: string
}

export interface ListCustomersResponse {
  data: ApiCustomer[]
  next_cursor?: string
}

export const customerApi = {
  list: (cursor?: string) =>
    request<ListCustomersResponse>('GET', `/v1/customers${cursor ? `?cursor=${cursor}` : ''}`),
  create: (body: {
    external_ref: string
    display_name: string
    identity: { bvn_masked?: string; nin_masked?: string; kyc_tier: number }
  }) => request<ApiCustomer>('POST', '/v1/customers', body),
}

// ── Suspense ──────────────────────────────────────────────────────────────────

export interface ApiSuspenseItem {
  id: string
  transaction_id: string
  reason: 'unmatched' | 'closed_account' | 'suspended_account' | 'tier_limit'
  status: 'pending' | 'resolved'
  notes?: string
  created_at: string
}

export interface ListSuspenseResponse {
  data: ApiSuspenseItem[]
  next_cursor?: string
}

export const suspenseApi = {
  list: (cursor?: string) =>
    request<ListSuspenseResponse>('GET', `/v1/suspense${cursor ? `?cursor=${cursor}` : ''}`),
  resolve: (itemId: string, body: { resolution: string; notes: string; target_customer_id?: string }) =>
    request<void>('POST', `/v1/suspense/${itemId}/resolve`, body),
}
