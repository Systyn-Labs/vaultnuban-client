import { create } from 'zustand'

export type Role = 'dev' | 'ops' | 'admin'

export type Section =
  // admin
  | 'health'
  | 'tenants'
  | 'xsuspense'
  | 'allaccounts'
  // dev
  | 'accounts'
  | 'customers'
  | 'transactions'
  | 'statements'
  | 'keys'
  | 'webhooks'
  | 'withdrawals'
  | 'collections'
  // ops
  | 'suspense'
  | 'opscustomers'
  | 'opsstatements'
  | 'opsLedger'
  | 'audit'

const defaultSection: Record<Role, Section> = {
  admin: 'health',
  dev: 'accounts',
  ops: 'suspense',
}

interface AppState {
  role: Role
  section: Section
  tenant: string
  toast: string | null
  setRole: (role: Role) => void
  setSection: (section: Section) => void
  setTenant: (tenant: string) => void
  showToast: (msg: string) => void
  clearToast: () => void
}

export const useAppStore = create<AppState>((set) => ({
  role: 'dev',
  section: 'accounts',
  tenant: 'acme',
  toast: null,
  setRole: (role) => set({ role, section: defaultSection[role] }),
  setSection: (section) => set({ section }),
  setTenant: (tenant) => set({ tenant }),
  showToast: (msg) => set({ toast: msg }),
  clearToast: () => set({ toast: null }),
}))
