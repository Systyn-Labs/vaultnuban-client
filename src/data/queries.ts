import { queryOptions } from "@tanstack/react-query";
import type { Page } from "@systynlabs/vaultnuban";
import { adminHttp, vn } from "./client";

// ── Tenant (/v1) queries ──────────────────────────────────────────────────────

export const customersQuery = queryOptions({
  queryKey: ["customers"],
  queryFn: () => vn().customers.list(),
  staleTime: 15_000,
});

export const virtualAccountsQuery = queryOptions({
  queryKey: ["virtual-accounts"],
  queryFn: () => vn().virtualAccounts.list(),
  staleTime: 15_000,
});

export const transactionsQuery = queryOptions({
  queryKey: ["transactions"],
  queryFn: () => vn().transactions.list(),
  staleTime: 10_000,
  refetchInterval: 30_000, // DXS §5.3 soft freshness
});

export const transactionQuery = (id: string) =>
  queryOptions({
    queryKey: ["transactions", id],
    queryFn: () => vn().transactions.get(id),
  });

export const customerTransactionsQuery = (customerId: string) =>
  queryOptions({
    queryKey: ["transactions", "customer", customerId],
    queryFn: () => vn().transactions.listForCustomer(customerId),
  });

// The API requires `from`/`to` on the statement endpoint — default to the
// account's full history (2020-01-01, before this product existed) through now.
const STATEMENT_EPOCH = "2020-01-01T00:00:00Z";

export const statementQuery = (customerId: string, params?: { from?: string; to?: string }) => {
  const from = params?.from ?? STATEMENT_EPOCH;
  const to = params?.to ?? new Date().toISOString();
  return queryOptions({
    queryKey: ["statement", customerId, from, to],
    queryFn: () => vn().transactions.statement(customerId, { from, to }),
    enabled: !!customerId,
  });
};

export const balanceQuery = (customerId: string) =>
  queryOptions({
    queryKey: ["balance", customerId],
    queryFn: () => vn().transactions.balance(customerId),
  });

export const suspenseQuery = queryOptions({
  queryKey: ["suspense"],
  queryFn: () => vn().suspense.list(),
  staleTime: 15_000,
});

export const withdrawalsQuery = (customerId: string) =>
  queryOptions({
    queryKey: ["withdrawals", customerId],
    queryFn: () => vn().withdrawals.list(customerId),
  });

export const collectionsQuery = (customerId: string) =>
  queryOptions({
    queryKey: ["collections", customerId],
    queryFn: () => vn().collections.list(customerId),
  });

export const apiKeysQuery = queryOptions({
  queryKey: ["api-keys"],
  queryFn: () => vn().apiKeys.list(),
});

export const webhookEndpointsQuery = queryOptions({
  queryKey: ["webhook-endpoints"],
  queryFn: () => vn().webhooks.listEndpoints(),
});

export const webhookDeliveriesQuery = queryOptions({
  queryKey: ["webhook-deliveries"],
  queryFn: () => vn().webhooks.listDeliveries(),
  refetchInterval: 30_000,
});

export const auditQuery = queryOptions({
  queryKey: ["audit"],
  queryFn: () => vn().audit.list(),
});

export const mfaStatusQuery = queryOptions({
  queryKey: ["mfa", "status"],
  queryFn: () => vn().mfa.status(),
});

// ── Operator (/internal) queries ──────────────────────────────────────────────

export interface PlatformHealth {
  status?: string;
  db?: string;
  provider?: string;
  last_sweep_at?: string;
  open_suspense?: number;
  [k: string]: unknown;
}

export interface SweepRun {
  id?: string;
  window_from: string;
  window_to: string;
  pages_fetched: number;
  found: number;
  posted: number;
  suspensed: number;
  duration_ms?: number;
  error?: string | null;
  created_at?: string;
}

export interface TenantSummary {
  id: string;
  name: string;
  created_at?: string;
  [k: string]: unknown;
}

export const platformHealthQuery = queryOptions({
  queryKey: ["internal", "health"],
  queryFn: () => adminHttp().get<PlatformHealth>("/internal/health"),
  refetchInterval: 30_000,
});

export const tenantsQuery = queryOptions({
  queryKey: ["internal", "tenants"],
  queryFn: () => adminHttp().get<{ data?: TenantSummary[] } | TenantSummary[]>("/internal/tenants"),
});

export const sweepRunsQuery = queryOptions({
  queryKey: ["internal", "sweep-runs"],
  queryFn: () => adminHttp().get<{ data?: SweepRun[] } | SweepRun[]>("/internal/sweep-runs"),
});

export const internalSuspenseQuery = queryOptions({
  queryKey: ["internal", "suspense"],
  queryFn: () => adminHttp().get<unknown>("/internal/suspense"),
});

export const internalVAsQuery = queryOptions({
  queryKey: ["internal", "virtual-accounts"],
  queryFn: () => adminHttp().get<unknown>("/internal/virtual-accounts"),
});

export const nombaVAsQuery = queryOptions({
  queryKey: ["internal", "nomba-virtual-accounts"],
  queryFn: () => adminHttp().get<unknown>("/internal/nomba-virtual-accounts"),
});

export const tierLimitsQuery = queryOptions({
  queryKey: ["internal", "tier-limits"],
  queryFn: () =>
    adminHttp().get<Record<string, { daily_credit_kobo: number; max_balance_kobo: number }>>(
      "/internal/settings/tier-limits",
    ),
});

/** Normalize endpoints that may return either a bare array or {data: []}. */
export function rows<T>(payload: { data?: T[] } | T[] | null | undefined): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  return payload.data ?? [];
}

export type { Page };
