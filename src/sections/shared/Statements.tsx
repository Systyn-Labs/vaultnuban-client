import { PageHeader } from '@/components/layout/PageHeader'
import { SectionLayout } from '@/components/layout/SectionLayout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { useAppStore } from '@/store/app.store'
import { useDataStore, type Transaction } from '@/store/data.store'
import { type ColumnDef } from '@tanstack/react-table'

// â”€â”€â”€ Build statement rows from transactions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface StatementRow extends Transaction {
  running: number
}

function buildStatement(txs: Transaction[]): StatementRow[] {
  const sorted = [...txs].sort((a, b) => a.time.localeCompare(b.time))
  let running = 0
  return sorted.map((tx) => {
    const raw = parseFloat(tx.amount.replace(/[â‚¦,]/g, '')) || 0
    running = tx.dir === 'credit' ? running + raw : running - raw
    return { ...tx, running }
  })
}

// â”€â”€â”€ CSV export helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function exportCsv(rows: StatementRow[]) {
  const header = 'Session ID,NUBAN,Direction,Source,Amount,Narration,Time,Running Balance'
  const body = rows.map((r) =>
    [r.session, r.nuban, r.dir, r.source, r.amount, `"${r.narration}"`, r.time, `â‚¦${r.running.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`].join(',')
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

// â”€â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function Statements() {
  const { tenant } = useAppStore()
  const showToast = useAppStore((s) => s.showToast)
  const transactions = useDataStore((s) => s.transactions)

  const tenantTxs = transactions.filter((t) => t.tenant === tenant)
  const rows = buildStatement(tenantTxs)

  function handleExport() {
    exportCsv(rows)
    showToast('Statement exported to CSV')
  }

  const columns: ColumnDef<StatementRow, unknown>[] = [
    {
      accessorKey: 'time',
      header: 'Date / Time',
      cell: ({ getValue }) => (
        <span className="text-[12px] text-text-muted">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'nuban',
      header: 'NUBAN',
      cell: ({ getValue }) => (
        <span className="font-mono text-[12px] text-text-secondary">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'narration',
      header: 'Narration',
      cell: ({ getValue }) => (
        <span className="text-[12.5px] text-text-primary">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'dir',
      header: 'Direction',
      cell: ({ getValue }) => {
        const d = getValue() as string
        return <Badge variant={d as 'credit' | 'debit'}>{d}</Badge>
      },
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ getValue }) => (
        <span className="font-mono font-semibold text-[12.5px] text-text-primary">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'running',
      header: 'Running balance',
      cell: ({ getValue }) => {
        const n = getValue() as number
        return (
          <span className={`font-mono text-[12.5px] font-semibold ${n < 0 ? 'text-red-text' : 'text-text-primary'}`}>
            â‚¦{n.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </span>
        )
      },
    },
  ]

  return (
    <SectionLayout noPadding>
      <PageHeader
        title="Statements"
        subtitle="Chronological ledger with running balance â€” export to CSV for reconciliation"
        actions={
          <Button variant="outline" size="sm" onClick={handleExport}>
            Export CSV
          </Button>
        }
      />
      <div className="p-4 sm:p-6">
        <Card className="overflow-hidden">
          <DataTable columns={columns} data={rows} emptyMessage="No transactions recorded yet." />
        </Card>
      </div>
    </SectionLayout>
  )
}

