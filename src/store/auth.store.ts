import { create } from 'zustand'
import { authApi, setApiToken, setAdminToken } from '@/lib/api'
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
  isLocked: boolean
  error: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<boolean>
  unlock: (email: string, password: string) => Promise<boolean>
  lock: () => void
  logout: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: loadSession(),
  isLocked: false,
  error: null,
  loading: false,

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const res = await authApi.login(email, password)

      if (res.api_key) setApiToken(res.api_key)
      setAdminToken(res.admin_token ?? null)

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
      set({ user, isLocked: false, error: null, loading: false })
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      set({ error: msg, loading: false })
      return false
    }
  },

  // Re-authenticate without destroying the session identity (lock screen flow).
  unlock: async (email, password) => {
    const { user } = get()
    set({ loading: true, error: null })
    try {
      const res = await authApi.login(email, password)
      // Verify the unlocking user is the same account that locked.
      if (user && res.email !== user.email) {
        set({ error: 'Please sign in with the same account.', loading: false })
        return false
      }
      if (res.api_key) setApiToken(res.api_key)
      setAdminToken(res.admin_token ?? null)
      set({ isLocked: false, error: null, loading: false })
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Incorrect credentials'
      set({ error: msg, loading: false })
      return false
    }
  },

  // Lock the session: revoke tokens in memory but retain user identity so the
  // lock screen can show who is locked and verify the same account on unlock.
  lock: () => {
    setApiToken(null)
    setAdminToken(null)
    set({ isLocked: true, error: null })
  },

  logout: () => {
    saveSession(null)
    setApiToken(null)
    setAdminToken(null)
    set({ user: null, isLocked: false, error: null })
  },

  clearError: () => set({ error: null }),
}))

// ─── Test credential chips (for the login page) ───────────────────────────────

export const TEST_ACCOUNTS = [
  { email: 'ada@acme.io',        password: 'Dev1234!', label: 'Adaeze Okonkwo', role: 'Tenant Developer', tenant: 'Acme Fintech' },
  { email: 'bisi@acme.io',       password: 'Ops1234!', label: 'Bisi Thomas',    role: 'Tenant Ops',       tenant: 'Acme Fintech' },
  { email: 'operator@systyn.io', password: 'Admin1234!', label: 'Systyn Operator', role: 'Platform Admin', tenant: 'All tenants' },
]
