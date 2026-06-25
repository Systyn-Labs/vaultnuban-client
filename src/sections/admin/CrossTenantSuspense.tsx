import { PageHeader } from '@/components/layout/PageHeader'
import { SectionLayout } from '@/components/layout/SectionLayout'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { useDataStore, type SuspenseItem } from '@/store/data.store'
import { type ColumnDef } from '@tanstack/react-table'
import { Info } from 'lucide-react'

const REASON_LABELS: Record<SuspenseItem['reason'], string> = {
  unmatched: 'Unmatched',
  closed_account: 'Closed account',
  amount_mismatch: 'Amount mismatch',
  tier_limit: 'Tier limit',
}

interface XSusRow {
  tenant: string
  amount: string
  reason: SuspenseItem['reason']
  target: string
  age: string
}

const columns: ColumnDef<XSusRow, unknown>[] = [
  {
    accessorKey: 'tenant',
    header: 'Tenant',
    cell: ({ getValue }) => (
      <span className="font-semibold text-text-primary">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ getValue }) => (
      <span className="font-mono font-semibold text-text-primary">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: 'reason',
    header: 'Reason',
    cell: ({ getValue }) => {
      const r = getValue() as SuspenseItem['reason']
      return (
        <Badge variant={r}>
          {REASON_LABELS[r]}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'target',
    header: 'Target NUBAN',
    cell: ({ getValue }) => (
      <span className="font-mono text-[12px] text-text-secondary">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: 'age',
    header: 'Age',
    cell: ({ getValue }) => (
      <span className="text-text-muted">{getValue() as string}</span>
    ),
  },
]

export function CrossTenantSuspense() {
  const suspense = useDataStore((s) => s.suspense)
  const tenants = useDataStore((s) => s.tenants)

  const tenantNameByKey: Record<string, string> = {}
  tenants.forEach((t) => {
    tenantNameByKey[t.key] = t.name
  })

  const rows: XSusRow[] = suspense.map((x) => ({
    tenant: tenantNameByKey[x.tenant] ?? x.tenant,
    amount: x.amount,
    reason: x.reason,
    target: x.target,
    age: x.age,
  }))

  return (
    <SectionLayout noPadding>
      <PageHeader
        title="Cross-tenant Suspense"
        subtitle="Rolled-up view of unresolved suspense items across all tenants"
      />

      <div className="space-y-5 p-6">
        {/* Read-only notice */}
        <div
          className="flex items-start gap-3 rounded-xl border px-4 py-3 text-[12.5px] font-medium"
          style={{ background: '#1C2638', borderColor: '#1E2D42', color: '#9BA6B8' }}
        >
          <Info className="mt-px h-4 w-4 flex-shrink-0 text-text-muted" />
          Admin has read-only visibility here. No resolve action is exposed at platform scope.
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          <DataTable
            columns={columns}
            data={rows}
            emptyMessage="No cross-tenant suspense items."
          />
        </Card>
      </div>
    </SectionLayout>
  )
}
