import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionLayout } from '@/components/layout/SectionLayout'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { auditApi, type ApiAuditEntry } from '@/lib/api'
import { type ColumnDef } from '@tanstack/react-table'

const columns: ColumnDef<ApiAuditEntry, unknown>[] = [
  {
    accessorKey: 'at',
    header: 'Time',
    cell: ({ getValue }) => (
      <span className="font-mono text-[12px] text-text-muted">
        {new Date(getValue() as string).toLocaleString('en-GB', {
          dateStyle: 'short',
          timeStyle: 'short',
        })}
      </span>
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
    accessorKey: 'entity_type',
    header: 'Entity',
    cell: ({ getValue }) => {
      const t = getValue() as string
      return <Badge variant="active">{t.replace(/_/g, ' ')}</Badge>
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
    accessorKey: 'entity_id',
    header: 'Resource',
    cell: ({ getValue }) => (
      <span className="font-mono text-[12px] text-text-muted">{getValue() as string}</span>
    ),
  },
]

export function AuditLog() {
  const [entries, setEntries] = useState<ApiAuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    auditApi
      .list()
      .then((r) => setEntries(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <SectionLayout noPadding>
      <PageHeader
        title="Audit Log"
        subtitle="Immutable trail of all actions taken within this tenant scope"
      />
      <div className="p-6 sm:p-8">
        <Card className="overflow-hidden">
          <DataTable
            columns={columns}
            data={entries}
            emptyMessage={loading ? 'Loading…' : 'No audit entries yet.'}
          />
        </Card>
      </div>
    </SectionLayout>
  )
}
