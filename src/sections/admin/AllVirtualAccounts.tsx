import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionLayout } from '@/components/layout/SectionLayout'
import { Badge } from '@/components/ui/badge'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { adminApi, type ApiAllVA, type ApiNombaVA } from '@/lib/api'
import { type ColumnDef } from '@tanstack/react-table'

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'default',
  SUSPENDED: 'secondary',
  CLOSED: 'destructive',
}

// ─── Tracked VAs (from our DB) ────────────────────────────────────────────────

const trackedColumns: ColumnDef<ApiAllVA>[] = [
  {
    accessorKey: 'tenant_name',
    header: 'Tenant',
    cell: ({ row }) => <span className="font-medium">{row.original.tenant_name}</span>,
  },
  {
    accessorKey: 'customer_display_name',
    header: 'Customer',
    cell: ({ row }) => <span className="text-sm">{row.original.customer_display_name || '—'}</span>,
  },
  {
    accessorKey: 'nuban',
    header: 'NUBAN',
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.nuban}</span>,
  },
  { accessorKey: 'account_name', header: 'Account Name' },
  { accessorKey: 'bank_name', header: 'Bank' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={STATUS_VARIANT[row.original.status] ?? 'outline'}>{row.original.status}</Badge>
    ),
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ row }) =>
      new Date(row.original.created_at).toLocaleDateString('en-NG', {
        year: 'numeric', month: 'short', day: 'numeric',
      }),
  },
]

// ─── Nomba-side VAs (direct from provider) ────────────────────────────────────

const nombaColumns: ColumnDef<ApiNombaVA>[] = [
  {
    accessorKey: 'account_ref',
    header: 'Account Ref',
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.account_ref}</span>,
  },
  {
    accessorKey: 'nuban',
    header: 'NUBAN',
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.nuban}</span>,
  },
  { accessorKey: 'account_name', header: 'Account Name' },
  { accessorKey: 'bank_name', header: 'Bank' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={STATUS_VARIANT[row.original.status?.toUpperCase()] ?? 'outline'}>
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ row }) =>
      row.original.created_at
        ? new Date(row.original.created_at).toLocaleDateString('en-NG', {
            year: 'numeric', month: 'short', day: 'numeric',
          })
        : '—',
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function AllVirtualAccounts() {
  const [tracked, setTracked] = useState<ApiAllVA[]>([])
  const [nomba, setNomba] = useState<ApiNombaVA[]>([])
  const [trackedError, setTrackedError] = useState<string | null>(null)
  const [nombaError, setNombaError] = useState<string | null>(null)
  const [nombaUnavailable, setNombaUnavailable] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      adminApi.listAllVAs(),
      adminApi.listNombaVAs(),
    ]).then(([trackedResult, nombaResult]) => {
      if (trackedResult.status === 'fulfilled') setTracked(trackedResult.value.data)
      else setTrackedError((trackedResult.reason as Error).message)

      if (nombaResult.status === 'fulfilled') {
        const res = nombaResult.value
        if (res.unavailable) setNombaUnavailable(res.reason ?? 'Not available')
        else setNomba(res.data)
      } else {
        setNombaError((nombaResult.reason as Error).message)
      }
    }).finally(() => setLoading(false))
  }, [])

  return (
    <SectionLayout>
      <PageHeader
        title="Virtual Accounts"
        description="Cross-tenant view of every NUBAN on this platform and on the underlying Nomba account."
      />

      {/* ── Tracked (our DB) ── */}
      <Card className="p-0 overflow-hidden">
        <CardHeader className="px-6 pt-5 pb-3">
          <CardTitle className="text-base">Platform-tracked accounts</CardTitle>
          <p className="text-sm text-muted-foreground">
            NUBANs recorded in VaultNUBAN, grouped by tenant and customer.
          </p>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : trackedError ? (
            <div className="p-6 text-sm text-destructive">{trackedError}</div>
          ) : (
            <DataTable columns={trackedColumns} data={tracked} />
          )}
        </CardBody>
      </Card>

      {/* ── Nomba-side ── */}
      <Card className="p-0 overflow-hidden mt-6">
        <CardHeader className="px-6 pt-5 pb-3">
          <CardTitle className="text-base">Nomba account — all virtual accounts</CardTitle>
          <p className="text-sm text-muted-foreground">
            Every NUBAN on the underlying Nomba account, including any provisioned outside VaultNUBAN.
            A NUBAN present here but not above indicates an untracked account.
          </p>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : nombaUnavailable ? (
            <div className="p-6 text-sm text-muted-foreground">{nombaUnavailable}</div>
          ) : nombaError ? (
            <div className="p-6 text-sm text-destructive">{nombaError}</div>
          ) : (
            <DataTable columns={nombaColumns} data={nomba} />
          )}
        </CardBody>
      </Card>
    </SectionLayout>
  )
}
