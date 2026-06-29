import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionLayout } from '@/components/layout/SectionLayout'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { adminApi, type ApiAllVA } from '@/lib/api'
import { type ColumnDef } from '@tanstack/react-table'

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'default',
  SUSPENDED: 'secondary',
  CLOSED: 'destructive',
}

const columns: ColumnDef<ApiAllVA>[] = [
  {
    accessorKey: 'tenant_name',
    header: 'Tenant',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.tenant_name}</span>
    ),
  },
  {
    accessorKey: 'customer_display_name',
    header: 'Customer',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.customer_display_name || '—'}</span>
    ),
  },
  {
    accessorKey: 'nuban',
    header: 'NUBAN',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.nuban}</span>
    ),
  },
  {
    accessorKey: 'account_name',
    header: 'Account Name',
  },
  {
    accessorKey: 'bank_name',
    header: 'Bank',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={STATUS_VARIANT[row.original.status] ?? 'outline'}>
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ row }) =>
      new Date(row.original.created_at).toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
  },
]

export function AllVirtualAccounts() {
  const [vas, setVas] = useState<ApiAllVA[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    adminApi
      .listAllVAs()
      .then((res) => setVas(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <SectionLayout>
      <PageHeader title="All Virtual Accounts" description="Every NUBAN provisioned across all tenants on this Nomba account." />
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : error ? (
          <div className="p-6 text-sm text-destructive">{error}</div>
        ) : (
          <DataTable columns={columns} data={vas} />
        )}
      </Card>
    </SectionLayout>
  )
}
