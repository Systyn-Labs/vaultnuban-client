import { PageHeader } from '@/components/layout/PageHeader'
import { SectionLayout } from '@/components/layout/SectionLayout'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { useAppStore } from '@/store/app.store'
import { useDataStore, type AuditEntry } from '@/store/data.store'
import { type ColumnDef } from '@tanstack/react-table'

export function AuditLog() {
  const { tenant } = useAppStore()
  const audit = useDataStore((s) => s.audit)
  const customers = useDataStore((s) => s.customers)

  // Show audit entries relevant to this tenant (by matching resource names to tenant customers/accounts)
  const tenantCustomerNames = new Set(customers.filter((c) => c.tenant === tenant).map((c) => c.name))
  const tenantAccounts = useDataStore((s) => s.accounts).filter((a) => a.tenant === tenant).map((a) => a.nuban)

  const visible = audit.filter((e) =>
    tenantCustomerNames.has(e.resource) ||
    tenantAccounts.includes(e.resource) ||
    // Also show tenant-level entries from ops/admin roles
    e.role === 'Tenant Ops' || e.role === 'Tenant Dev'
  )

  const roleVariant = (role: string): 'dev' | 'ops' | 'active' => {
    if (role === 'Tenant Dev') return 'dev'
    if (role === 'Tenant Ops') return 'ops'
    return 'active'
  }

  const columns: ColumnDef<AuditEntry, unknown>[] = [
    {
      accessorKey: 'time',
      header: 'Time',
      cell: ({ getValue }) => (
        <span className="font-mono text-[12px] text-text-muted">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'actor',
      header: 'Actor',
      cell: ({ getValue }) => (
        <span className="font-semibold text-[12.5px] text-text-primary">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ getValue }) => {
        const r = getValue() as string
        return <Badge variant={roleVariant(r)}>{r}</Badge>
      },
    },
    {
      accessorKey: 'action',
      header: 'Action',
      cell: ({ getValue }) => (
        <span className="text-[12.5px] text-text-secondary">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'resource',
      header: 'Resource',
      cell: ({ getValue }) => (
        <span className="font-mono text-[12px] text-text-muted">{getValue() as string}</span>
      ),
    },
  ]

  return (
    <SectionLayout noPadding>
      <PageHeader
        title="Audit Log"
        subtitle="Immutable trail of all actions taken within this tenant scope"
      />
      <div className="p-6 sm:p-8">
        <Card className="overflow-hidden">
          <DataTable columns={columns} data={visible} emptyMessage="No audit entries yet." />
        </Card>
      </div>
    </SectionLayout>
  )
}


