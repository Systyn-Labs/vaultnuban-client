import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionLayout } from '@/components/layout/SectionLayout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { FilterBar } from '@/components/ui/filter-bar'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogBody,
} from '@/components/ui/dialog'
import { useAppStore } from '@/store/app.store'
import { useDataStore, type Transaction } from '@/store/data.store'
import { type ColumnDef } from '@tanstack/react-table'
import { Copy } from 'lucide-react'

// â”€â”€â”€ Webhook payload modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function WebhookModal({ tx, onClose }: { tx: Transaction | null; onClose: () => void }) {
  const showToast = useAppStore((s) => s.showToast)
  if (!tx) return null

  const payload = {
    event: `transaction.${tx.dir}`,
    session_id: tx.session,
    account_nuban: tx.nuban,
    amount: tx.amount,
    currency: 'NGN',
    direction: tx.dir,
    source: tx.source,
    narration: tx.narration,
    timestamp: new Date(tx.time).toISOString(),
    status: 'completed',
  }
  const json = JSON.stringify(payload, null, 2)

  return (
    <Dialog open={!!tx} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Webhook payload</DialogTitle>
          <DialogDescription>
            <span className="font-mono">{tx.session}</span>
            {' Â· '}
            <span className="text-text-muted">{tx.nuban}</span>
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="relative rounded-xl" style={{ background: '#0E1525', border: '1px solid #1E2D42' }}>
            <Button
              size="sm" variant="ghost"
              className="absolute right-3 top-3 gap-1.5 text-[11px]"
              onClick={() => navigator.clipboard.writeText(json).then(() => showToast('Payload copied'))}
            >
              <Copy className="h-3 w-3" /> Copy
            </Button>
            <pre className="overflow-x-auto p-4 pt-10 text-[12px] leading-relaxed text-text-secondary">
              {json}
            </pre>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

// â”€â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const FILTERS = ['All', 'Credit', 'Debit'] as const
type Filter = (typeof FILTERS)[number]

export function Transactions() {
  const { tenant } = useAppStore()
  const transactions = useDataStore((s) => s.transactions)
  const [filter, setFilter] = useState<Filter>('All')
  const [webhookTx, setWebhookTx] = useState<Transaction | null>(null)

  const visible = transactions
    .filter((t) => t.tenant === tenant)
    .filter((t) => filter === 'All' || t.dir === filter.toLowerCase())

  const columns: ColumnDef<Transaction, unknown>[] = [
    {
      accessorKey: 'session',
      header: 'Session ID',
      cell: ({ getValue }) => (
        <span className="font-mono text-[11.5px] text-text-muted">{getValue() as string}</span>
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
      accessorKey: 'dir',
      header: 'Direction',
      cell: ({ getValue }) => {
        const d = getValue() as string
        return <Badge variant={d as 'credit' | 'debit'}>{d}</Badge>
      },
    },
    {
      accessorKey: 'source',
      header: 'Source',
      cell: ({ getValue }) => {
        const s = getValue() as string
        return <Badge variant={s as 'webhook' | 'sweep' | 'manual'}>{s}</Badge>
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
      accessorKey: 'narration',
      header: 'Narration',
      cell: ({ getValue }) => (
        <span className="text-[12.5px] text-text-secondary">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'time',
      header: 'Time',
      cell: ({ getValue }) => (
        <span className="text-[12px] text-text-muted">{getValue() as string}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button size="sm" variant="outline" onClick={() => setWebhookTx(row.original)}>
          Webhook
        </Button>
      ),
    },
  ]

  return (
    <SectionLayout noPadding>
      <PageHeader
        title="Transactions"
        subtitle="Real-time ledger of all credits and debits across your virtual accounts"
      />
      <div className="px-4 pt-4 pb-4 sm:px-6 sm:pt-5">
        <FilterBar
          options={[...FILTERS]}
          active={filter}
          onChange={(v) => setFilter(v as Filter)}
        />
      </div>
      <div className="px-6 pb-6 sm:px-8 sm:pb-8">
        <Card className="overflow-hidden">
          <DataTable columns={columns} data={visible} emptyMessage="No transactions match this filter." />
        </Card>
      </div>
      <WebhookModal tx={webhookTx} onClose={() => setWebhookTx(null)} />
    </SectionLayout>
  )
}



