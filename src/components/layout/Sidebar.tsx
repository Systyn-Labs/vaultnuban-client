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
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore, type Role, type Section } from '@/store/app.store'
import { useDataStore } from '@/store/data.store'
import { useState } from 'react'

const NAV_DEFS: Record<Role, { key: Section; label: string; Icon: React.ElementType }[]> = {
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

const ROLE_META: Record<Role, { label: string; user: string; initials: string }> = {
  dev: { label: 'Tenant Developer', user: 'Adaeze Okonkwo', initials: 'AO' },
  ops: { label: 'Tenant Ops', user: 'Bisi Thomas', initials: 'BT' },
  admin: { label: 'Platform Admin', user: 'Systyn Operator', initials: 'SO' },
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { role, section, tenant, setRole, setSection, setTenant, showToast } = useAppStore()
  const tenants = useDataStore((s) => s.tenants)
  const meta = ROLE_META[role]
  const nav = NAV_DEFS[role]
  const isTenantUser = role !== 'admin'

  return (
    <div className="flex h-full flex-col bg-canvas w-64">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
            <span className="font-mono text-lg font-bold text-white">V</span>
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary">VaultNUBAN</p>
            <p className="font-mono text-[10px] text-text-muted">Σ debits = Σ credits ✓</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-text-muted hover:text-text-primary lg:hidden">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Role switcher */}
      <div className="mx-3 mb-4 flex rounded-lg bg-surface-2 p-1">
        {(['dev', 'ops', 'admin'] as Role[]).map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={cn(
              'flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors',
              role === r
                ? 'bg-canvas text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            )}
          >
            {r === 'dev' ? 'Dev' : r === 'ops' ? 'Ops' : 'Admin'}
          </button>
        ))}
      </div>

      {/* Tenant selector */}
      {isTenantUser && (
        <div className="mx-3 mb-4">
          <label className="mb-1 block px-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Tenant scope
          </label>
          <div className="relative">
            <select
              value={tenant}
              onChange={(e) => {
                const t = tenants.find((x) => x.key === e.target.value)
                setTenant(e.target.value)
                if (t) showToast(`Now viewing ${t.name} — scope isolated`)
              }}
              className="w-full appearance-none rounded-md border border-border bg-surface-2 px-3 py-2 pr-8 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {tenants.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-text-muted" />
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3">
        {nav.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => {
              setSection(key)
              onClose?.()
            }}
            className={cn(
              'mb-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              section === key
                ? 'bg-surface-2 text-text-primary'
                : 'text-text-secondary hover:bg-surface-2/50 hover:text-text-primary'
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
            {meta.initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text-primary">{meta.user}</p>
            <p className="truncate text-xs text-text-muted">{meta.label}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 border border-border text-text-secondary lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <SidebarContent />
      </div>
    </>
  )
}
