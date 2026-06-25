import { create } from 'zustand'
import type { Role } from './app.store'

export interface AuthUser {
  id: string
  name: string
  email: string
  initials: string
  role: Role
  tenant: string
  roleLabel: string
}

// ─── Seeded credentials ───────────────────────────────────────────────────────
// In production: replace login() body with a POST /auth/token API call.

interface SeedAccount {
  email: string
  password: string
  user: AuthUser
}

const SEED_ACCOUNTS: SeedAccount[] = [
  {
    email: 'ada@acme.io',
    password: 'Dev1234!',
    user: {
      id: 'u_ada',
      name: 'Adaeze Okonkwo',
      email: 'ada@acme.io',
      initials: 'AO',
      role: 'dev',
      tenant: 'acme',
      roleLabel: 'Tenant Developer',
    },
  },
  {
    email: 'bisi@acme.io',
    password: 'Ops1234!',
    user: {
      id: 'u_bisi',
      name: 'Bisi Thomas',
      email: 'bisi@acme.io',
      initials: 'BT',
      role: 'ops',
      tenant: 'acme',
      roleLabel: 'Tenant Ops',
    },
  },
  {
    email: 'operator@systyn.io',
    password: 'Admin1234!',
    user: {
      id: 'u_op',
      name: 'Systyn Operator',
      email: 'operator@systyn.io',
      initials: 'SO',
      role: 'admin',
      tenant: '',
      roleLabel: 'Platform Admin',
    },
  },
]

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
  if (user) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user))
  } else {
    sessionStorage.removeItem(SESSION_KEY)
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface AuthState {
  user: AuthUser | null
  error: string | null
  /** Returns true on success, false on bad credentials */
  login: (email: string, password: string) => boolean
  logout: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: loadSession(),
  error: null,

  login: (email, password) => {
    const match = SEED_ACCOUNTS.find(
      (a) => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password
    )
    if (!match) {
      set({ error: 'Invalid email or password.' })
      return false
    }
    saveSession(match.user)
    set({ user: match.user, error: null })
    return true
  },

  logout: () => {
    saveSession(null)
    set({ user: null, error: null })
  },

  clearError: () => set({ error: null }),
}))

// Export seed accounts for the login page credential chips
export const TEST_ACCOUNTS = SEED_ACCOUNTS.map(({ email, password, user }) => ({
  email,
  password,
  label: user.name,
  role: user.roleLabel,
  tenant: user.tenant || 'All tenants',
}))
