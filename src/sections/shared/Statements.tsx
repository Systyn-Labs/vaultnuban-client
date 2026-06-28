import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionLayout } from '@/components/layout/SectionLayout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { useAppStore } from '@/store/app.store'
import { txnApi, type ApiTransaction } from '@/lib/api'
import { type ColumnDef } from '@tanstack/react-table'

// ─── Build statement rows from transactions ────────────────────────────────────

interface StatementRow extends ApiTransaction {
  running_kobo: number
}

function buildStatement(txs: ApiTransaction[]): StatementRow[] {
  const sorted = [...txs].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
  )
  let running = 0
  return sorted.map((tx) => {
    running =
      tx.direction === 'credit' ? running + tx.amount_kobo : running - tx.amount_kobo
    return { ...tx, running_kobo: running }
  })
}

function fmtKobo(kobo: number): string {
  return (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })
}

// ─── CSV export ────────────────────────────────────────────────────────────────

function exportCsv(rows: StatementRow[]) {
  const header = 'Session ID,NUBAN,Direction,Source,Amount (NGN),Narration,Time,Running Balance'
  const body = rows.map((r) =>
    [
      r.session_id ?? r.id.slice(0, 16),
      r.nuban,
      r.direction,
      r.source,
      r.amount_ngn,
      `"${r.narration ?? ''}"`,
      r.occurred_at,
      `₦${fmtKobo(r.running_kobo)}`,
    ].join(',')
  )
  const csv = [header, ...body].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `statement_${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function Statements() {
  const showToast = useAppStore((s) => s.showToast)
  const [rows, setRows] = useState<StatementRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    txnApi
      .list()
      .then((r) => setRows(buildStatement(r.data)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handleExport() {
    exportCsv(rows)
    showToast('Statement exported to CSV')
  }

  const columns: ColumnDef<StatementRow, unknown>[] = [
    {
      accessorKey: 'occurred_at',
      header: 'Date / Time',
      cell: ({ getValue }) => (
        <span className="text-[12px] text-text-muted">
          {new Date(getValue() as string).toLocaleString('en-GB', {
            dateStyle: 'short',
            timeStyle: 'short',
          })}
        </span>
      ),
    },
    {
      accessorKey: 'nuban',
      header: 'NUBAN',
      cell: ({ getValue }) => (
        <span className="font-mono text-[12px] text-text-secondary">{(getValue() as string) || '—'}</span>
      ),
    },
    {
      accessorKey: 'narration',
      header: 'Narration',
      cell: ({ getValue }) => (
        <span className="text-[12.5px] text-text-primary">{(getValue() as string | undefined) ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'direction',
      header: 'Direction',
      cell: ({ getValue }) => {
        const d = getValue() as string
        return <Badge variant={d as 'credit' | 'debit'}>{d}</Badge>
      },
    },
    {
      accessorKey: 'amount_ngn',
      header: 'Amount',
      cell: ({ getValue }) => (
        <span className="font-mono font-semibold text-[12.5px] text-text-primary">
          ₦{getValue() as string}
        </span>
      ),
    },
    {
      accessorKey: 'running_kobo',
      header: 'Running balance',
      cell: ({ getValue }) => {
        const n = getValue() as number
        return (
          <span
            className={`font-mono text-[12.5px] font-semibold ${n < 0 ? 'text-red-text' : 'text-text-primary'}`}
          >
            ₦{fmtKobo(n)}
          </span>
        )
      },
    },
  ]

  return (
    <SectionLayout noPadding>
      <PageHeader
        title="Statements"
        subtitle="Chronological ledger with running balance — export to CSV for reconciliation"
        actions={
          <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
            Export CSV
          </Button>
        }
      />
      <div className="p-6 sm:p-8">
        <Card className="overflow-hidden">
          <DataTable
            columns={columns}
            data={rows}
            emptyMessage={loading ? 'Loading…' : 'No transactions recorded yet.'}
          />
        </Card>
      </div>
    </SectionLayout>
  )
}
