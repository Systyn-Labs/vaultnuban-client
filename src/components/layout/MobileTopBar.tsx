import { Menu } from 'lucide-react'
import { useAppStore } from '@/store/app.store'
import { useAuthStore } from '@/store/auth.store'
import { NAV_DEFS, ROLE_META } from './Sidebar'

interface MobileTopBarProps {
  onMenuClick: () => void
}

export function MobileTopBar({ onMenuClick }: MobileTopBarProps) {
  const { role, section } = useAppStore()
  const meta = ROLE_META[role]
  const authUser = useAuthStore((s) => s.user)
  const nav = NAV_DEFS[role]
  const currentNav = nav.find((n) => n.key === section)

  const initials = authUser?.initials ?? meta.initials
  const roleLabel = authUser?.roleLabel ?? meta.label

  return (
    <div
      className="flex items-center gap-3 border-b px-4 py-3 lg:hidden"
      style={{ background: '#0E1525', borderColor: '#1E2D42' }}
    >
      {/* Hamburger */}
      <button
        onClick={onMenuClick}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-text-secondary hover:text-text-primary transition-colors"
        style={{ background: '#1C2638', border: '1px solid #1E2D42' }}
        aria-label="Open navigation"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Current section title */}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-semibold text-text-primary">
          {currentNav?.label ?? 'Dashboard'}
        </p>
        <p className="truncate text-[11px] text-text-muted">{roleLabel}</p>
      </div>

      {/* User avatar */}
      <div
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
        style={{ background: 'rgba(67,56,202,0.2)', color: '#818CF8' }}
      >
        {initials}
      </div>
    </div>
  )
}
