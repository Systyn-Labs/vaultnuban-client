import { PageHeader } from '@/components/layout/PageHeader'
import { SectionLayout } from '@/components/layout/SectionLayout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { useAppStore } from '@/store/app.store'
import { useDataStore } from '@/store/data.store'
import { type ColumnDef } from '@tanstack/react-table'
import { type Tenant } from '@/store/data.store'
import { Check } from 'lucide-react'

// ─── Metric cards ─────────────────────────────────────────────────────────────

const METRIC_CARDS = [
  {
    label: 'Last sweep run',
    value: '1,198 posted',
    sub: '14:30 WAT · 1,204 scanned · 6 → suspense',
  },
  {
    label: 'Webhook success · 24h',
    value: '99.4%',
    sub: '8,912 of 8,966 delivered',
  },
  {
    label: 'Cross-tenant suspense',
    value: '₦681,200',
    sub: '11 open items · 2 tenants',
  },
  {
    label: 'Active tenants',
    value: '3 / 3',
    sub: 'All keys live',
  },
]

// ─── Tenant health table ──────────────────────────────────────────────────────

const columns: ColumnDef<Tenant, unknown>[] = [
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
    accessorKey: 'suspense',
    header: 'Open suspense',
    cell: ({ getValue }) => (
      <span className="font-mono text-amber-text">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: 'webhook',
    header: 'Webhook 24h',
    cell: ({ getValue }) => {
      const v = getValue() as string
      return v === '—' ? (
        <span className="text-text-muted">—</span>
      ) : (
        <span className="text-green-text font-semibold">99.4%</span>
      )
    },
  },
  {
    accessorKey: 'lastActivity',
    header: 'Last activity',
    cell: ({ getValue }) => <span className="text-text-muted">{getValue() as string}</span>,
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
  const tenants = useDataStore((s) => s.tenants)

  return (
    <SectionLayout noPadding>
      <PageHeader
        title="Global Health"
        subtitle="Platform-wide reconciliation status and sweep metrics"
        actions={
          <Button
            size="sm"
            onClick={() => showToast('Reconciliation check passed — Σ debits = Σ credits')}
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
          {/* Check icon circle */}
          <div
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
            style={{ background: '#E3F4EE' }}
          >
            <Check className="h-5 w-5" style={{ color: '#0E7A5A' }} />
          </div>

          {/* Equation */}
          <div className="flex-1 min-w-0">
            <p className="mb-2 text-[10.5px] font-bold uppercase tracking-widest text-text-muted">
              Ledger invariant
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-xl font-semibold tracking-tight text-text-primary">
                Σ debits ₦48,210,400.00
              </span>
              <span className="text-lg font-bold" style={{ color: '#0E7A5A' }}>
                =
              </span>
              <span className="font-mono text-xl font-semibold tracking-tight text-text-primary">
                Σ credits ₦48,210,400.00
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-bold"
                style={{ background: '#E3F4EE', color: '#0E7A5A' }}
              >
                Balanced ✓
              </span>
            </div>
          </div>

          {/* Last checked */}
          <div className="flex-shrink-0 sm:text-right">
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-text-muted">
              Last checked
            </p>
            <p className="mt-1 font-mono text-[14px] font-semibold text-text-primary">
              14:32:07 WAT
            </p>
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
          {METRIC_CARDS.map((m) => (
            <Card key={m.label} className="p-6">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-text-muted">
                {m.label}
              </p>
              <p className="my-2 font-mono text-[22px] font-semibold leading-tight tracking-tight text-text-primary">
                {m.value}
              </p>
              <p className="text-[12px] leading-snug text-text-muted">{m.sub}</p>
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
          <DataTable columns={columns} data={tenants} emptyMessage="No tenants found." />
        </Card>
      </div>
    </SectionLayout>
  )
}
