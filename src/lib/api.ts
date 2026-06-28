const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

const TOKEN_KEY = 'vaultnuban_token'
const ADMIN_TOKEN_KEY = 'vaultnuban_admin_token'

export function getApiToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function setApiToken(token: string | null) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token)
  else sessionStorage.removeItem(TOKEN_KEY)
}

export function getAdminToken(): string | null {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY)
}

export function setAdminToken(token: string | null) {
  if (token) sessionStorage.setItem(ADMIN_TOKEN_KEY, token)
  else sessionStorage.removeItem(ADMIN_TOKEN_KEY)
}

async function request<T>(method: string, path: string, body?: unknown, overrideToken?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = overrideToken ?? getApiToken()
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
  admin_token?: string
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
  updateKYC: (customerId: string, kycTier: number) =>
    request<ApiCustomer>('PATCH', `/v1/customers/${customerId}/identity`, { kyc_tier: kycTier }),
}

// ── Suspense ──────────────────────────────────────────────────────────────────

export interface ApiSuspenseItem {
  id: string
  transaction_id: string
  reason: 'unmatched' | 'closed_account' | 'suspended_account' | 'tier_limit' | 'amount_mismatch'
  status: string
  notes?: string
  created_at: string
  amount_kobo: number
  nuban: string
}

export interface ListSuspenseResponse {
  data: ApiSuspenseItem[]
  next_cursor?: string
}

// ── Virtual accounts ──────────────────────────────────────────────────────────

export interface ApiVirtualAccount {
  id: string
  customer_id: string
  nuban: string
  bank_name: string
  account_name: string
  account_ref: string
  status: string
  created_at: string
  updated_at: string
  customer_display_name?: string
}

export interface ListVAsResponse {
  data: ApiVirtualAccount[]
  next_cursor?: string
}

export const vaApi = {
  list: (cursor?: string) =>
    request<ListVAsResponse>('GET', `/v1/virtual-accounts${cursor ? `?cursor=${cursor}` : ''}`),
  provision: (customerId: string) =>
    request<ApiVirtualAccount>('POST', `/v1/customers/${customerId}/virtual-account`, {}),
  patch: (customerId: string, body: { account_name?: string; status?: 'SUSPENDED' | 'ACTIVE' }) =>
    request<ApiVirtualAccount>('PATCH', `/v1/customers/${customerId}/virtual-account`, body),
  delete: (customerId: string) =>
    request<void>('DELETE', `/v1/customers/${customerId}/virtual-account`),
}

// ── Transactions (tenant-level) ───────────────────────────────────────────────

export interface ApiTransaction {
  id: string
  nuban: string
  session_id?: string
  amount_kobo: number
  amount_ngn: string
  direction: 'credit' | 'debit'
  source: string
  status: string
  sender_name?: string
  sender_bank?: string
  narration?: string
  occurred_at: string
}

export interface ListTransactionsResponse {
  data: ApiTransaction[]
  next_cursor?: string
}

export const txnApi = {
  list: (cursor?: string) =>
    request<ListTransactionsResponse>('GET', `/v1/transactions${cursor ? `?cursor=${cursor}` : ''}`),
}

// ── Admin (uses admin_token, not the tenant API key) ──────────────────────────

export interface OnboardResponse {
  tenant_id: string
  tenant_name: string
  api_key: string
  key_prefix: string
  users_created: number
}

export interface ApiTenant {
  id: string
  name: string
  created_at: string
}

export interface ApiPlatformHealth {
  ledger: { debits_kobo: number; credits_kobo: number; balanced: boolean }
  last_sweep: { posted: number; found: number; suspensed: number; ran_at: string } | null
  webhook_24h: { delivered: number; total: number }
  cross_tenant_suspense: { amount_kobo: number; item_count: number; tenant_count: number }
  active_tenants: number
  total_tenants: number
  tenant_health: Array<{
    id: string
    name: string
    customers: number
    accounts: number
    open_suspense_kobo: number
    last_activity: string | null
    status: string
  }>
  checked_at: string
}

export const adminApi = {
  getHealth: () =>
    request<ApiPlatformHealth>('GET', '/internal/health', undefined, getAdminToken() ?? undefined),
  listTenants: () =>
    request<{ data: ApiTenant[] }>('GET', '/internal/tenants', undefined, getAdminToken() ?? undefined),
  onboard: (
    tenantName: string,
    users: Array<{ name: string; email: string; password: string; role: string }>,
  ) =>
    request<OnboardResponse>(
      'POST',
      '/internal/tenants',
      { tenant_name: tenantName, users },
      getAdminToken() ?? undefined,
    ),
  listCrossTenantSuspense: (cursor?: string) =>
    request<ListCrossTenantSuspenseResponse>(
      'GET',
      `/internal/suspense${cursor ? `?cursor=${cursor}` : ''}`,
      undefined,
      getAdminToken() ?? undefined,
    ),
}

// ── Audit log ─────────────────────────────────────────────────────────────────

export interface ApiAuditEntry {
  id: string
  actor: string
  action: string
  entity_type: string
  entity_id: string
  at: string
}

export interface ListAuditResponse {
  data: ApiAuditEntry[]
  next_cursor?: string
}

export const auditApi = {
  list: (cursor?: string) =>
    request<ListAuditResponse>('GET', `/v1/audit${cursor ? `?cursor=${cursor}` : ''}`),
}

// ── API keys ──────────────────────────────────────────────────────────────────

export interface ApiKeyEntry {
  id: string
  prefix: string
  created_at: string
}

export interface ListAPIKeysResponse {
  data: ApiKeyEntry[]
}

export interface CreateAPIKeyResponse {
  id: string
  prefix: string
  api_key: string
  created_at: string
}

export const apiKeyApi = {
  list: () => request<ListAPIKeysResponse>('GET', '/v1/api-keys'),
  create: () => request<CreateAPIKeyResponse>('POST', '/v1/api-keys', {}),
  revoke: (keyID: string) => request<void>('DELETE', `/v1/api-keys/${keyID}`),
}

// ── Admin cross-tenant suspense ───────────────────────────────────────────────

export interface ApiCrossTenantSuspenseItem {
  id: string
  tenant_name: string
  amount_kobo: number
  reason: string
  nuban: string
  created_at: string
}

export interface ListCrossTenantSuspenseResponse {
  data: ApiCrossTenantSuspenseItem[]
  next_cursor?: string
}

export const suspenseApi = {
  list: (cursor?: string) =>
    request<ListSuspenseResponse>('GET', `/v1/suspense${cursor ? `?cursor=${cursor}` : ''}`),
  resolve: (itemId: string, body: { resolution: string; notes: string; target_customer_id?: string }) =>
    request<void>('PATCH', `/v1/suspense/${itemId}`, body),
}
