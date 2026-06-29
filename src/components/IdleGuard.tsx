import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// ─── Config ───────────────────────────────────────────────────────────────────

const IDLE_TIMEOUT_MS = 5 * 60 * 1000   // 5 minutes → lock
const WARN_BEFORE_MS  = 60 * 1000       // show warning at 1 minute remaining

const ACTIVITY_EVENTS = [
  'mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel',
] as const

// ─── Lock screen ──────────────────────────────────────────────────────────────

function LockScreen() {
  const { user, unlock, logout, error, loading, clearError } = useAuthStore()
  const [password, setPassword] = useState('')

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    await unlock(user.email, password)
    setPassword('')
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ background: '#0E1525' }}
    >
      {/* Logo */}
      <svg width="48" height="48" viewBox="0 0 64 64" aria-hidden="true" className="mb-6">
        <rect width="64" height="64" rx="14" fill="#4338CA" />
        <path d="M14,10 L27,10 L34,50 L21,50 Z" fill="#F6F2E9" />
        <path d="M50,10 L37,10 L30,50 L43,50 Z" fill="rgba(255,255,255,0.82)" />
      </svg>

      <div className="w-full max-w-sm rounded-2xl border border-[#1E2D42] bg-[#111827] p-8 shadow-2xl">
        {/* Lock icon */}
        <div className="mb-5 flex flex-col items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: 'rgba(67,56,202,0.15)' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-[17px] font-semibold text-white">Session locked</h1>
            <p className="mt-1 text-[13px] text-[#9BA6B8]">
              Locked due to inactivity
              {user ? <> · <span className="text-white">{user.name}</span></> : null}
            </p>
          </div>
        </div>

        <form onSubmit={handleUnlock} className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#9BA6B8]">
              Password
            </label>
            <Input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearError() }}
              autoFocus
            />
          </div>

          {error && (
            <p className="text-[12px] text-red-400">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading || !password}>
            {loading ? 'Verifying…' : 'Unlock'}
          </Button>
        </form>

        <button
          onClick={logout}
          className="mt-4 w-full text-center text-[12px] text-[#9BA6B8] hover:text-white transition-colors"
        >
          Sign in as a different user
        </button>
      </div>
    </div>
  )
}

// ─── Warning banner ───────────────────────────────────────────────────────────

function IdleWarning({ secondsLeft, onDismiss }: { secondsLeft: number; onDismiss: () => void }) {
  return (
    <div
      className="fixed bottom-6 right-6 z-[9998] flex w-80 items-start gap-3 rounded-xl border border-amber-500/30 bg-[#1C1A0E] p-4 shadow-xl"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-amber-300">Session expiring soon</p>
        <p className="text-[12px] text-[#9BA6B8]">
          Your session will lock in <span className="font-mono font-semibold text-amber-300">{secondsLeft}s</span> due to inactivity.
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="text-[#9BA6B8] hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

// ─── Guard ────────────────────────────────────────────────────────────────────

export function IdleGuard({ children }: { children: ReactNode }) {
  const { isLocked, lock } = useAuthStore()
  const lastActivityRef = useRef(Date.now())
  const [warningSecondsLeft, setWarningSecondsLeft] = useState<number | null>(null)
  const [warnDismissed, setWarnDismissed] = useState(false)

  // Reset the idle clock on any user activity.
  useEffect(() => {
    function resetTimer() {
      lastActivityRef.current = Date.now()
      setWarnDismissed(false)
    }
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }))
    return () => {
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, resetTimer))
    }
  }, [])

  // Tick every second to check idle time.
  useEffect(() => {
    if (isLocked) return
    const id = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current
      const remaining = IDLE_TIMEOUT_MS - idle

      if (remaining <= 0) {
        lock()
        setWarningSecondsLeft(null)
        return
      }

      if (remaining <= WARN_BEFORE_MS) {
        setWarningSecondsLeft(Math.ceil(remaining / 1000))
      } else {
        setWarningSecondsLeft(null)
        setWarnDismissed(false)
      }
    }, 1000)

    return () => clearInterval(id)
  }, [isLocked, lock])

  const showWarning =
    !isLocked &&
    warningSecondsLeft !== null &&
    !warnDismissed

  return (
    <>
      {isLocked ? <LockScreen /> : children}
      {showWarning && (
        <IdleWarning
          secondsLeft={warningSecondsLeft!}
          onDismiss={() => setWarnDismissed(true)}
        />
      )}
    </>
  )
}
