import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore, TEST_ACCOUNTS } from '@/store/auth.store'
import { useAppStore } from '@/store/app.store'
import type { Role } from '@/store/app.store'
import { Eye, EyeOff, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Logo mark ────────────────────────────────────────────────────────────────

function VLogo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#4338CA" />
      <path d="M14,10 L27,10 L34,50 L21,50 Z" fill="#F6F2E9" />
      <path d="M50,10 L37,10 L30,50 L43,50 Z" fill="rgba(255,255,255,0.82)" />
    </svg>
  )
}

// ─── Credential chip ──────────────────────────────────────────────────────────

function CredentialChip({
  label,
  role,
  tenant,
  email,
  password,
  onUse,
}: {
  label: string
  role: string
  tenant: string
  email: string
  password: string
  onUse: (email: string, password: string) => void
}) {
  const roleColor: Record<string, string> = {
    'Tenant Developer': 'text-blue-text',
    'Tenant Ops':       'text-purple-text',
    'Platform Admin':   'text-amber-text',
  }

  return (
    <button
      type="button"
      onClick={() => onUse(email, password)}
      className={cn(
        'group flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all',
        'border-border bg-surface-2 hover:border-border-subtle hover:bg-surface-3'
      )}
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-canvas text-[11px] font-bold text-accent">
        <Zap className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-text-primary">{label}</p>
        <p className={cn('truncate text-[11px]', roleColor[role] ?? 'text-text-muted')}>
          {role} · {tenant}
        </p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="font-mono text-[10.5px] text-text-muted">{email}</p>
        <p className="font-mono text-[10.5px] text-text-muted tracking-widest">{'·'.repeat(password.length)}</p>
      </div>
    </button>
  )
}

// ─── Login page ───────────────────────────────────────────────────────────────

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  // loading state is owned by auth store now
  const { login, error, loading, clearError } = useAuthStore()
  const { setRole, setTenant } = useAppStore()
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    emailRef.current?.focus()
  }, [])

  function handleCredentialChip(chipEmail: string, chipPassword: string) {
    setEmail(chipEmail)
    setPassword(chipPassword)
    clearError()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password || loading) return

    const ok = await login(email, password)

    if (ok) {
      const user = useAuthStore.getState().user!
      setRole(user.role as Role)
      if (user.tenant) setTenant(user.tenant)
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{ background: '#0E1525' }}
    >
      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl border px-8 py-12"
        style={{ background: '#111827', borderColor: '#1E2D42' }}
      >
        {/* Branding */}
        <div className="mb-9 flex flex-col items-center gap-4 text-center">
          <VLogo size={52} />
          <div>
            <h1 className="text-[20px] font-bold tracking-tight text-text-primary">VaultNUBAN</h1>
            <p className="mt-0.5 font-mono text-[11px] text-text-muted">Σ debits = Σ credits ✓</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Email
            </label>
            <Input
              ref={emailRef}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearError() }}
              placeholder="you@yourdomain.io"
              className={cn(error && 'border-red-text/60 focus-visible:ring-red-text/40')}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError() }}
                placeholder="••••••••"
                className={cn('pr-10', error && 'border-red-text/60 focus-visible:ring-red-text/40')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-text/20 bg-red-text/10 px-3 py-2 text-[12.5px] text-red-text">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !email || !password}
          aria-busy={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Signing in…
              </span>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>
      </div>

      {/* Test credentials panel */}
      <div className="mt-6 w-full max-w-sm">
        <div className="mb-3 flex items-center gap-2">
          <div className="h-px flex-1" style={{ background: '#1E2D42' }} />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
            Test credentials
          </span>
          <div className="h-px flex-1" style={{ background: '#1E2D42' }} />
        </div>
        <div className="space-y-2">
          {TEST_ACCOUNTS.map((a) => (
            <CredentialChip
              key={a.email}
              label={a.label}
              role={a.role}
              tenant={a.tenant}
              email={a.email}
              password={a.password}
              onUse={handleCredentialChip}
            />
          ))}
        </div>
        <p className="mt-3 text-center text-[11px] text-text-muted">
          Click any chip to auto-fill, then press Sign in.
        </p>
      </div>

      {/* Footer */}
      <p className="mt-8 text-[11px] text-text-muted">
        Built by Systyn Labs · Powered by Nomba
      </p>
    </div>
  )
}
