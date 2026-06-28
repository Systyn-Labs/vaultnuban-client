import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionLayout } from '@/components/layout/SectionLayout'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { adminApi, type ApiCrossTenantSuspenseItem } from '@/lib/api'
import { type ColumnDef } from '@tanstack/react-table'
import { Info } from 'lucide-react'

const REASON_LABELS: Record<string, string> = {
  unmatched: 'Unmatched',
  closed_account: 'Closed account',
  amount_mismatch: 'Amount mismatch',
  tier_limit: 'Tier limit',
  suspended_account: 'Suspended account',
}

function formatKobo(kobo: number): string {
  return (kobo / 100).toLocaleString('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  })
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`
}

const columns: ColumnDef<ApiCrossTenantSuspenseItem, unknown>[] = [
  {
    accessorKey: 'tenant_name',
    header: 'Tenant',
    cell: ({ getValue }) => (
      <span className="font-semibold text-text-primary">{(getValue() as string) || '—'}</span>
    ),
  },
  {
    accessorKey: 'amount_kobo',
    header: 'Amount',
    cell: ({ getValue }) => (
      <span className="font-mono font-semibold text-text-primary">
        {formatKobo(getValue() as number)}
      </span>
    ),
  },
  {
    accessorKey: 'reason',
    header: 'Reason',
    cell: ({ getValue }) => {
      const r = getValue() as string
      return (
        <Badge variant={r as 'unmatched' | 'closed_account' | 'amount_mismatch' | 'tier_limit'}>
          {REASON_LABELS[r] ?? r}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'nuban',
    header: 'Target NUBAN',
    cell: ({ getValue }) => (
      <span className="font-mono text-[12px] text-text-secondary">{(getValue() as string) || '—'}</span>
    ),
  },
  {
    accessorKey: 'created_at',
    header: 'Age',
    cell: ({ getValue }) => (
      <span className="text-text-muted">{timeAgo(getValue() as string)}</span>
    ),
  },
]

export function CrossTenantSuspense() {
  const [items, setItems] = useState<ApiCrossTenantSuspenseItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi
      .listCrossTenantSuspense()
      .then((r) => setItems(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <SectionLayout noPadding>
      <PageHeader
        title="Cross-tenant Suspense"
        subtitle="Rolled-up view of unresolved suspense items across all tenants"
      />

      <div className="space-y-6 p-6 sm:p-8">
        <div
          className="flex items-start gap-3 rounded-xl border px-4 py-3 text-[12.5px] font-medium"
          style={{ background: '#1C2638', borderColor: '#1E2D42', color: '#9BA6B8' }}
        >
          <Info className="mt-px h-4 w-4 flex-shrink-0 text-text-muted" />
          Admin has read-only visibility here. No resolve action is exposed at platform scope.
        </div>

        <Card className="overflow-hidden">
          <DataTable
            columns={columns}
            data={items}
            emptyMessage={loading ? 'Loading…' : 'No cross-tenant suspense items.'}
          />
        </Card>
      </div>
    </SectionLayout>
  )
}
