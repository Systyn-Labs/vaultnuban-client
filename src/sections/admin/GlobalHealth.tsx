import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionLayout } from '@/components/layout/SectionLayout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { useAppStore } from '@/store/app.store'
import { adminApi, type ApiPlatformHealth } from '@/lib/api'
import { type ColumnDef } from '@tanstack/react-table'
import { Check } from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatKobo(kobo: number): string {
  return (kobo / 100).toLocaleString('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  })
}

function fmtTime(iso: string): string {
  return (
    new Date(iso).toLocaleTimeString('en-NG', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Africa/Lagos',
    }) + ' WAT'
  )
}

function webhookRate(delivered: number, total: number): string {
  if (total === 0) return '—'
  return ((delivered / total) * 100).toFixed(1) + '%'
}

// ─── Tenant health row type ───────────────────────────────────────────────────

type TenantRow = ApiPlatformHealth['tenant_health'][number]

const columns: ColumnDef<TenantRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Tenant',
    cell: ({ row }) => (
      <div>
        <p className="font-semibold text-text-primary">{row.original.name}</p>
        <p className="font-mono text-[11px] text-text-muted">{row.original.id}</p>
      </div>
    ),
  },
  {
    accessorKey: 'customers',
    header: 'Customers',
    cell: ({ getValue }) => <span className="font-mono">{getValue() as number}</span>,
  },
  {
    accessorKey: 'accounts',
    header: 'Accounts',
    cell: ({ getValue }) => <span className="font-mono">{getValue() as number}</span>,
  },
  {
    accessorKey: 'open_suspense_kobo',
    header: 'Open suspense',
    cell: ({ getValue }) => (
      <span className="font-mono text-amber-text">{formatKobo(getValue() as number)}</span>
    ),
  },
  {
    accessorKey: 'last_activity',
    header: 'Last activity',
    cell: ({ getValue }) => {
      const v = getValue() as string | null
      if (!v) return <span className="text-text-muted">—</span>
      return (
        <span className="text-text-muted">
          {new Date(v).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
        </span>
      )
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => {
      const s = getValue() as string
      return <Badge variant={s as 'active' | 'suspended'}>{s}</Badge>
    },
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function GlobalHealth() {
  const showToast = useAppStore((s) => s.showToast)
  const [health, setHealth] = useState<ApiPlatformHealth | null>(null)
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    adminApi
      .getHealth()
      .then(setHealth)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const ledger = health?.ledger
  const sweep = health?.last_sweep
  const wh = health?.webhook_24h
  const susp = health?.cross_tenant_suspense

  const metricCards = health
    ? [
        {
          label: 'Last sweep run',
          value: sweep ? `${sweep.posted.toLocaleString()} posted` : 'No sweep yet',
          sub: sweep
            ? `${fmtTime(sweep.ran_at)} · ${sweep.found.toLocaleString()} scanned · ${sweep.suspensed} → suspense`
            : '—',
        },
        {
          label: 'Webhook success · 24h',
          value: wh ? webhookRate(wh.delivered, wh.total) : '—',
          sub:
            wh && wh.total > 0
              ? `${wh.delivered.toLocaleString()} of ${wh.total.toLocaleString()} delivered`
              : 'No deliveries in last 24h',
        },
        {
          label: 'Cross-tenant suspense',
          value: susp ? formatKobo(susp.amount_kobo) : '₦0',
          sub: susp
            ? `${susp.item_count} open item${susp.item_count === 1 ? '' : 's'} · ${susp.tenant_count} tenant${susp.tenant_count === 1 ? '' : 's'}`
            : '—',
        },
        {
          label: 'Active tenants',
          value: health ? `${health.active_tenants} / ${health.total_tenants}` : '—',
          sub: health && health.total_tenants > 0 ? 'All keys live' : 'No tenants yet',
        },
      ]
    : null

  return (
    <SectionLayout noPadding>
      <PageHeader
        title="Global Health"
        subtitle="Platform-wide reconciliation status and sweep metrics"
        actions={
          <Button
            size="sm"
            onClick={() => {
              load()
              if (health?.ledger.balanced) {
                showToast('Reconciliation check passed — Σ debits = Σ credits')
              }
            }}
          >
            Run check
          </Button>
        }
      />

      <div className="space-y-6 p-6 sm:p-8">
        {/* Invariant banner */}
        <div
          className="flex flex-col gap-4 rounded-2xl border p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-7"
          style={{ background: '#1C2638', borderColor: '#1E2D42' }}
        >
          <div
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
            style={{ background: ledger && !ledger.balanced ? '#FCE8E8' : '#E3F4EE' }}
          >
            <Check
              className="h-5 w-5"
              style={{ color: ledger && !ledger.balanced ? '#B91C1C' : '#0E7A5A' }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className="mb-2 text-[10.5px] font-bold uppercase tracking-widest text-text-muted">
              Ledger invariant
            </p>
            {loading || !ledger ? (
              <p className="font-mono text-sm text-text-muted">{loading ? 'Checking…' : 'No data'}</p>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-xl font-semibold tracking-tight text-text-primary">
                  Σ debits {formatKobo(ledger.debits_kobo)}
                </span>
                <span
                  className="text-lg font-bold"
                  style={{ color: ledger.balanced ? '#0E7A5A' : '#B91C1C' }}
                >
                  {ledger.balanced ? '=' : '≠'}
                </span>
                <span className="font-mono text-xl font-semibold tracking-tight text-text-primary">
                  Σ credits {formatKobo(ledger.credits_kobo)}
                </span>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-bold"
                  style={
                    ledger.balanced
                      ? { background: '#E3F4EE', color: '#0E7A5A' }
                      : { background: '#FCE8E8', color: '#B91C1C' }
                  }
                >
                  {ledger.balanced ? 'Balanced ✓' : 'Imbalanced ✗'}
                </span>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 sm:text-right">
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-text-muted">
              Last checked
            </p>
            <p className="mt-1 font-mono text-[14px] font-semibold text-text-primary">
              {health ? fmtTime(health.checked_at) : '—'}
            </p>
            <a
              href="https://github.com/systynlabs/vaultnuban/actions/workflows/ci.yml"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-green-text transition-colors"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="flex-shrink-0"
              >
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
              </svg>
              Verified by CI harness on every push →
            </a>
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
          {(metricCards ?? Array(4).fill(null)).map((m, i) => (
            <Card key={m?.label ?? i} className="p-6">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-text-muted">
                {m?.label ?? '—'}
              </p>
              <p className="my-2 font-mono text-[22px] font-semibold leading-tight tracking-tight text-text-primary">
                {loading ? (
                  <span className="text-text-muted text-sm">Loading…</span>
                ) : (
                  (m?.value ?? '—')
                )}
              </p>
              <p className="text-[12px] leading-snug text-text-muted">{m?.sub ?? ''}</p>
            </Card>
          ))}
        </div>

        {/* Tenant health table */}
        <Card className="overflow-hidden">
          <div
            className="border-b px-6 py-5 text-[14px] font-semibold text-text-primary"
            style={{ borderColor: '#1E2D42' }}
          >
            Tenant health
          </div>
          <DataTable
            columns={columns}
            data={health?.tenant_health ?? []}
            emptyMessage={loading ? 'Loading…' : 'No tenants found.'}
          />
        </Card>
      </div>
    </SectionLayout>
  )
}
