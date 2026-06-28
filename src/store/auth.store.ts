import { create } from 'zustand'
import { authApi, setApiToken } from '@/lib/api'
import type { Role } from './app.store'

export interface AuthUser {
  id: string
  name: string
  email: string
  initials: string
  role: Role
  tenant: string      // tenant ID (empty for admin)
  tenantName: string  // human-readable tenant name
  roleLabel: string
}

// ─── Persistence ──────────────────────────────────────────────────────────────

const SESSION_KEY = 'vaultnuban_user'

function loadSession(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

function saveSession(user: AuthUser | null) {
  if (user) sessionStorage.setItem(SESSION_KEY, JSON.stringify(user))
  else sessionStorage.removeItem(SESSION_KEY)
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const ROLE_LABELS: Record<string, string> = {
  dev: 'Tenant Developer',
  ops: 'Tenant Ops',
  admin: 'Platform Admin',
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface AuthState {
  user: AuthUser | null
  error: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: loadSession(),
  error: null,
  loading: false,

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const res = await authApi.login(email, password)

      // Store the API key as the bearer token for subsequent calls
      if (res.api_key) {
        setApiToken(res.api_key)
      }

      const user: AuthUser = {
        id: res.id,
        name: res.name,
        email: res.email,
        initials: initials(res.name),
        role: res.role as Role,
        tenant: res.tenant_id ?? '',
        tenantName: res.tenant_name ?? '',
        roleLabel: ROLE_LABELS[res.role] ?? res.role,
      }

      saveSession(user)
      set({ user, error: null, loading: false })
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      set({ error: msg, loading: false })
      return false
    }
  },

  logout: () => {
    saveSession(null)
    setApiToken(null)
    set({ user: null, error: null })
  },

  clearError: () => set({ error: null }),
}))

// ─── Test credential chips (for the login page) ───────────────────────────────

export const TEST_ACCOUNTS = [
  { email: 'ada@acme.io',        password: 'Dev1234!', label: 'Adaeze Okonkwo', role: 'Tenant Developer', tenant: 'Acme Fintech' },
  { email: 'bisi@acme.io',       password: 'Ops1234!', label: 'Bisi Thomas',    role: 'Tenant Ops',       tenant: 'Acme Fintech' },
  { email: 'operator@systyn.io', password: 'Admin1234!', label: 'Systyn Operator', role: 'Platform Admin', tenant: 'All tenants' },
]
