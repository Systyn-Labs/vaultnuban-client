import React, { useState } from 'react'
import {
  Activity,
  Building2,
  CreditCard,
  Users,
  ArrowLeftRight,
  FileText,
  Key,
  AlertTriangle,
  Clock,
  Layers,
  ChevronDown,
  LogOut,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore, type Role, type Section } from '@/store/app.store'
import { useDataStore } from '@/store/data.store'
import { useAuthStore } from '@/store/auth.store'

// ─── Nav definitions ─────────────────────────────────────────────────────────

export const NAV_DEFS: Record<Role, { key: Section; label: string; Icon: React.ElementType }[]> = {
  admin: [
    { key: 'health', label: 'Global Health', Icon: Activity },
    { key: 'tenants', label: 'Tenants', Icon: Building2 },
    { key: 'xsuspense', label: 'Cross-tenant Suspense', Icon: Layers },
  ],
  dev: [
    { key: 'accounts', label: 'Virtual Accounts', Icon: CreditCard },
    { key: 'customers', label: 'Customers', Icon: Users },
    { key: 'transactions', label: 'Transactions', Icon: ArrowLeftRight },
    { key: 'statements', label: 'Statements', Icon: FileText },
    { key: 'keys', label: 'API Keys', Icon: Key },
  ],
  ops: [
    { key: 'suspense', label: 'Suspense Queue', Icon: AlertTriangle },
    { key: 'opscustomers', label: 'Customers', Icon: Users },
    { key: 'opsstatements', label: 'Statements', Icon: FileText },
    { key: 'audit', label: 'Audit Log', Icon: Clock },
  ],
}

export const ROLE_META: Record<Role, { label: string; user: string; initials: string }> = {
  dev: { label: 'Tenant Developer', user: 'Adaeze Okonkwo', initials: 'AO' },
  ops: { label: 'Tenant Ops', user: 'Bisi Thomas', initials: 'BT' },
  admin: { label: 'Platform Admin', user: 'Systyn Operator', initials: 'SO' },
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="flex items-center gap-3">
      {/* V-mark: two geometric arms echoing Systyn Labs brand language */}
      <svg width="36" height="36" viewBox="0 0 64 64" aria-hidden="true" className="flex-shrink-0">
        <rect width="64" height="64" rx="12" fill="#4338CA"/>
        <path d="M14,10 L27,10 L34,50 L21,50 Z" fill="#F6F2E9"/>
        <path d="M50,10 L37,10 L30,50 L43,50 Z" fill="rgba(255,255,255,0.82)"/>
      </svg>
      <div>
        <p className="text-[13.5px] font-bold tracking-tight text-text-primary">VaultNUBAN</p>
        <p className="font-mono text-[10px] leading-tight text-text-muted">Σ debits = Σ credits ✓</p>
      </div>
    </div>
  )
}

// ─── Role Switcher ────────────────────────────────────────────────────────────

function RoleSwitcher() {
  const { role, setRole } = useAppStore()

  return (
    <div className="mx-3 mb-4 flex rounded-lg p-[3px]" style={{ background: '#1C2638' }}>
      {(['dev', 'ops', 'admin'] as Role[]).map((r) => (
        <button
          key={r}
          onClick={() => setRole(r)}
          className={cn(
            'flex-1 rounded-md py-[7px] text-xs font-semibold transition-all duration-150',
            role === r
              ? 'bg-canvas text-text-primary shadow-sm'
              : 'text-[#5B6573] hover:text-text-secondary'
          )}
        >
          {r === 'dev' ? 'Developer' : r === 'ops' ? 'Ops' : 'Admin'}
        </button>
      ))}
    </div>
  )
}

// ─── Tenant Selector ──────────────────────────────────────────────────────────

function TenantSelector() {
  const { tenant, setTenant, showToast } = useAppStore()
  const tenants = useDataStore((s) => s.tenants)

  return (
    <div className="mx-3 mb-5">
      <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
        Tenant scope
      </p>
      <div className="relative">
        <select
          value={tenant}
          onChange={(e) => {
            const t = tenants.find((x) => x.key === e.target.value)
            setTenant(e.target.value)
            if (t) showToast(`Now viewing ${t.name} — scope isolated`)
          }}
          className={cn(
            'w-full appearance-none rounded-md border px-3 py-2 pr-8 text-[13px] font-medium',
            'bg-[#1C2638] border-[#1E2D42] text-text-primary',
            'focus:outline-none focus:ring-2 focus:ring-accent/60',
            'transition-colors'
          )}
        >
          {tenants.map((t) => (
            <option key={t.key} value={t.key} className="bg-surface">
              {t.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-text-muted" />
      </div>
    </div>
  )
}

// ─── Nav Items ────────────────────────────────────────────────────────────────

function NavItems({ onClose }: { onClose?: () => void }) {
  const { role, section, setSection } = useAppStore()
  const nav = NAV_DEFS[role]

  return (
    <nav className="flex-1 overflow-y-auto px-3">
      {nav.map(({ key, label, Icon }) => {
        const active = section === key
        return (
          <button
            key={key}
            onClick={() => {
              setSection(key)
              onClose?.()
            }}
            className={cn(
              'mb-0.5 flex w-full items-center gap-[11px] rounded-lg px-3 py-[9px] text-[13.5px] font-medium text-left transition-colors duration-100',
              active
                ? 'bg-[#1C2638] text-white'
                : 'text-[#9BA6B8] hover:bg-[#1C2638]/60 hover:text-text-primary'
            )}
          >
            <Icon
              className={cn('h-4 w-4 flex-shrink-0', active ? 'text-white' : 'text-[#9BA6B8]')}
            />
            <span>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}

// ─── User Footer ──────────────────────────────────────────────────────────────

function UserFooter() {
  const { role } = useAppStore()
  const meta = ROLE_META[role]
  const authUser = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const displayName = authUser?.name ?? meta.user
  const displayInitials = authUser?.initials ?? meta.initials
  const displayLabel = authUser?.roleLabel ?? meta.label

  return (
    <div className="border-t border-[#1E2D42] px-4 py-[14px]">
      <div className="flex items-center gap-3">
        <div
          className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
          style={{ background: 'rgba(67,56,202,0.2)', color: '#818CF8' }}
        >
          {displayInitials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-text-primary">{displayName}</p>
          <p className="truncate text-[11px] text-text-muted">{displayLabel}</p>
        </div>
        <button
          onClick={logout}
          title="Sign out"
          className="flex-shrink-0 rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-2 hover:text-red-text"
          aria-label="Sign out"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Sidebar Content ──────────────────────────────────────────────────────────

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { role } = useAppStore()
  const isTenantUser = role !== 'admin'

  return (
    <div className="flex h-full w-64 flex-col" style={{ background: '#0E1525' }}>
      {/* Logo row */}
      <div className="flex items-center justify-between px-4 py-[18px]">
        <Logo />
        {onClose && (
          <button
            onClick={onClose}
            className="ml-2 rounded-md p-1 text-text-muted hover:text-text-primary lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Role switcher */}
      <RoleSwitcher />

      {/* Tenant selector (dev + ops only) */}
      {isTenantUser && <TenantSelector />}

      {/* Nav */}
      <NavItems onClose={onClose} />

      {/* User footer */}
      <UserFooter />
    </div>
  )
}

// ─── Sidebar (with mobile drawer) ────────────────────────────────────────────

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile hamburger — rendered inside MobileTopBar, exposed via context */}
      <button
        id="sidebar-open-btn"
        onClick={() => setMobileOpen(true)}
        className="hidden"
        aria-label="Open sidebar"
      />

      {/* Mobile backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 lg:hidden',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setMobileOpen(false)}
      />

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-out lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden flex-shrink-0 lg:flex" style={{ borderRight: '1px solid #1E2D42' }}>
        <SidebarContent />
      </aside>

      {/* Expose open trigger for MobileTopBar */}
      {/* We pass the setter down via a small exported hook instead */}
    </>
  )
}

// Export setter so MobileTopBar can open it without prop-drilling
let _setMobileOpen: React.Dispatch<React.SetStateAction<boolean>> | null = null

export function SidebarWithRef({
  registerOpen,
}: {
  registerOpen: (fn: () => void) => void
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  _setMobileOpen = setMobileOpen

  React.useEffect(() => {
    registerOpen(() => setMobileOpen(true))
  }, [registerOpen])

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 lg:hidden',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setMobileOpen(false)}
      />

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-out lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden flex-shrink-0 lg:flex" style={{ borderRight: '1px solid #1E2D42' }}>
        <SidebarContent />
      </aside>
    </>
  )
}
