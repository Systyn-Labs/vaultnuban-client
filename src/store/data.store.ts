import { create } from 'zustand'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Tenant {
  id: string
  key: string
  name: string
  contact: string
  customers: number
  accounts: number
  suspense: string
  webhook: string
  lastActivity: string
  status: 'active' | 'suspended'
}

export interface VirtualAccount {
  id: string
  tenant: string
  nuban: string
  name: string
  customer: string
  status: 'active' | 'suspended' | 'closed'
  balance: string
}

export interface Customer {
  id: string
  tenant: string
  name: string
  doc: string
  tier: 'Tier 1' | 'Tier 2' | 'Tier 3'
  status: 'active' | 'inactive'
  balanceNum: number
}

export interface Transaction {
  id: string
  tenant: string
  nuban: string
  amount: string
  dir: 'credit' | 'debit'
  source: 'webhook' | 'sweep' | 'manual'
  narration: string
  session: string
  time: string
}

export interface SuspenseItem {
  id: string
  tenant: string
  amount: string
  reason: 'unmatched' | 'closed_account' | 'amount_mismatch' | 'tier_limit'
  target: string
  age: string
}

export interface ApiKey {
  id: string
  tenant: string
  prefix: string
  scope: 'developer' | 'ops' | 'both'
  created: string
  lastUsed: string
}

export interface AuditEntry {
  actor: string
  role: string
  action: string
  resource: string
  time: string
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const seedTenants: Tenant[] = [
  { id: 'tnt_acme', key: 'acme', name: 'Acme Fintech', contact: 'ada@acme.io', customers: 4, accounts: 5, suspense: '₦240,000', webhook: 'https://acme.io/hook', lastActivity: '2 min ago', status: 'active' },
  { id: 'tnt_bridger', key: 'bridger', name: 'Bridger Pay', contact: 'ops@bridger.ng', customers: 3, accounts: 4, suspense: '₦120,600', webhook: 'https://bridger.ng/hook', lastActivity: '18 min ago', status: 'active' },
  { id: 'tnt_nova', key: 'nova', name: 'Nova Wallet', contact: 'tech@novawallet.co', customers: 2, accounts: 2, suspense: '₦320,600', webhook: '—', lastActivity: '1 hr ago', status: 'active' },
]

const seedAccounts: VirtualAccount[] = [
  { id: 'a1', tenant: 'acme', nuban: '9912004534', name: 'Ada Okonkwo', customer: 'Ada Okonkwo', status: 'active', balance: '₦21,950.00' },
  { id: 'a2', tenant: 'acme', nuban: '9912004535', name: 'Bisi Thomas', customer: 'Bisi Thomas', status: 'active', balance: '₦184,250.00' },
  { id: 'a3', tenant: 'acme', nuban: '9912004536', name: 'Chidi Eze', customer: 'Chidi Eze', status: 'suspended', balance: '₦0.00' },
  { id: 'a4', tenant: 'acme', nuban: '9912004537', name: 'Dupe Akin', customer: 'Dupe Akin', status: 'active', balance: '₦55,100.00' },
  { id: 'a5', tenant: 'acme', nuban: '9912004538', name: 'Emeka Obi', customer: 'Emeka Obi', status: 'closed', balance: '₦0.00' },
  { id: 'a6', tenant: 'bridger', nuban: '9912004539', name: 'Fola Bello', customer: 'Fola Bello', status: 'active', balance: '₦73,000.00' },
  { id: 'a7', tenant: 'bridger', nuban: '9912004540', name: 'Grace Nwosu', customer: 'Grace Nwosu', status: 'active', balance: '₦12,400.00' },
  { id: 'a8', tenant: 'nova', nuban: '9912004541', name: 'Haruna Musa', customer: 'Haruna Musa', status: 'active', balance: '₦9,800.00' },
]

const seedCustomers: Customer[] = [
  { id: 'c1', tenant: 'acme', name: 'Ada Okonkwo', doc: 'NIN · 1234', tier: 'Tier 2', status: 'active', balanceNum: 21950 },
  { id: 'c2', tenant: 'acme', name: 'Bisi Thomas', doc: 'BVN · 5678', tier: 'Tier 3', status: 'active', balanceNum: 184250 },
  { id: 'c3', tenant: 'acme', name: 'Chidi Eze', doc: 'NIN · 9012', tier: 'Tier 1', status: 'inactive', balanceNum: 0 },
  { id: 'c4', tenant: 'acme', name: 'Dupe Akin', doc: 'BVN · 3456', tier: 'Tier 2', status: 'active', balanceNum: 55100 },
  { id: 'c5', tenant: 'bridger', name: 'Fola Bello', doc: 'NIN · 7890', tier: 'Tier 2', status: 'active', balanceNum: 73000 },
  { id: 'c6', tenant: 'bridger', name: 'Grace Nwosu', doc: 'BVN · 1122', tier: 'Tier 1', status: 'active', balanceNum: 12400 },
  { id: 'c7', tenant: 'nova', name: 'Haruna Musa', doc: 'NIN · 3344', tier: 'Tier 1', status: 'active', balanceNum: 9800 },
]

const seedTransactions: Transaction[] = [
  { id: 'tx1', tenant: 'acme', nuban: '9912004534', amount: '₦40,000.00', dir: 'credit', source: 'webhook', narration: 'Inbound · OPay', session: 'SES20240605001', time: '2026-06-05T14:31' },
  { id: 'tx2', tenant: 'acme', nuban: '9912004534', amount: '₦2,000.00', dir: 'debit', source: 'manual', narration: 'Airtime purchase', session: 'SES20240611001', time: '2026-06-11T09:12' },
  { id: 'tx3', tenant: 'acme', nuban: '9912004535', amount: '₦150,000.00', dir: 'credit', source: 'webhook', narration: 'Inbound · GTBank', session: 'SES20240618001', time: '2026-06-18T10:54' },
  { id: 'tx4', tenant: 'acme', nuban: '9912004535', amount: '₦25,700.00', dir: 'debit', source: 'sweep', narration: 'Transfer to Zenith · self', session: 'SES20240622001', time: '2026-06-22T16:30' },
  { id: 'tx5', tenant: 'acme', nuban: '9912004537', amount: '₦55,100.00', dir: 'credit', source: 'sweep', narration: 'Sweep post · batch 14', session: 'SES20240623001', time: '2026-06-23T14:30' },
  { id: 'tx6', tenant: 'bridger', nuban: '9912004539', amount: '₦73,000.00', dir: 'credit', source: 'webhook', narration: 'Inbound · UBA', session: 'SES20240620001', time: '2026-06-20T11:00' },
]

const seedSuspense: SuspenseItem[] = [
  { id: 's1', tenant: 'acme', amount: '₦120,000.00', reason: 'unmatched', target: '9912009999', age: '2h 14m' },
  { id: 's2', tenant: 'acme', amount: '₦80,000.00', reason: 'closed_account', target: '9912004538', age: '5h 02m' },
  { id: 's3', tenant: 'acme', amount: '₦40,000.00', reason: 'tier_limit', target: '9912004534', age: '22m' },
  { id: 's4', tenant: 'bridger', amount: '₦50,600.00', reason: 'amount_mismatch', target: '9912004539', age: '1h 10m' },
  { id: 's5', tenant: 'bridger', amount: '₦70,000.00', reason: 'unmatched', target: '9912008888', age: '3h 45m' },
  { id: 's6', tenant: 'nova', amount: '₦200,000.00', reason: 'tier_limit', target: '9912004541', age: '4h 30m' },
  { id: 's7', tenant: 'nova', amount: '₦120,600.00', reason: 'closed_account', target: '9912004542', age: '6h 00m' },
]

const seedApiKeys: ApiKey[] = [
  { id: 'k1', tenant: 'acme', prefix: 'sk_live_acme…x7f', scope: 'developer', created: 'Jun 01, 2026', lastUsed: '2 min ago' },
  { id: 'k2', tenant: 'acme', prefix: 'sk_live_acme…q2p', scope: 'ops', created: 'Jun 10, 2026', lastUsed: '1 hr ago' },
  { id: 'k3', tenant: 'bridger', prefix: 'sk_live_brdg…m4k', scope: 'both', created: 'May 20, 2026', lastUsed: '18 min ago' },
]

const seedAudit: AuditEntry[] = [
  { actor: 'Adaeze Okonkwo', role: 'Tenant Dev', action: 'Provisioned virtual account', resource: '9912004538', time: '14:28 WAT' },
  { actor: 'Bisi Thomas', role: 'Tenant Ops', action: 'Resolved suspense → reassigned to Ada Okonkwo', resource: '₦40,000.00', time: '13:55 WAT' },
  { actor: 'Systyn Operator', role: 'Platform Admin', action: 'Onboarded tenant', resource: 'Nova Wallet', time: '12:01 WAT' },
  { actor: 'Adaeze Okonkwo', role: 'Tenant Dev', action: 'Closed virtual account', resource: '9912004538', time: '11:30 WAT' },
  { actor: 'Bisi Thomas', role: 'Tenant Ops', action: 'Updated KYC tier → Tier 2', resource: 'Chidi Eze', time: '10:15 WAT' },
]

// ─── Store ─────────────────────────────────────────────────────────────────────

interface DataState {
  tenants: Tenant[]
  accounts: VirtualAccount[]
  customers: Customer[]
  transactions: Transaction[]
  suspense: SuspenseItem[]
  apiKeys: ApiKey[]
  audit: AuditEntry[]

  // Tenant mutations
  addTenant: (t: Tenant) => void
  toggleTenant: (id: string) => void

  // Account mutations
  addAccount: (a: VirtualAccount) => void
  updateAccount: (id: string, patch: Partial<VirtualAccount>) => void

  // Customer mutations
  addCustomer: (c: Customer) => void
  updateCustomer: (id: string, patch: Partial<Customer>) => void

  // Suspense mutations
  removeSuspense: (id: string) => void

  // API key mutations
  addApiKey: (k: ApiKey) => void
  removeApiKey: (id: string) => void

  // Audit
  pushAudit: (entry: AuditEntry) => void
}

export const useDataStore = create<DataState>((set) => ({
  tenants: seedTenants,
  accounts: seedAccounts,
  customers: seedCustomers,
  transactions: seedTransactions,
  suspense: seedSuspense,
  apiKeys: seedApiKeys,
  audit: seedAudit,

  addTenant: (t) => set((s) => ({ tenants: [...s.tenants, t] })),
  toggleTenant: (id) =>
    set((s) => ({
      tenants: s.tenants.map((t) =>
        t.id === id ? { ...t, status: t.status === 'active' ? 'suspended' : 'active' } : t
      ),
    })),

  addAccount: (a) => set((s) => ({ accounts: [...s.accounts, a] })),
  updateAccount: (id, patch) =>
    set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),

  addCustomer: (c) => set((s) => ({ customers: [...s.customers, c] })),
  updateCustomer: (id, patch) =>
    set((s) => ({ customers: s.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),

  removeSuspense: (id) => set((s) => ({ suspense: s.suspense.filter((x) => x.id !== id) })),

  addApiKey: (k) => set((s) => ({ apiKeys: [...s.apiKeys, k] })),
  removeApiKey: (id) => set((s) => ({ apiKeys: s.apiKeys.filter((k) => k.id !== id) })),

  pushAudit: (entry) => set((s) => ({ audit: [entry, ...s.audit] })),
}))
