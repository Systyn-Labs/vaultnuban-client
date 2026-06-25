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
  DialogDescription, DialogBody, DialogFooter,
} from '@/components/ui/dialog'
import { useAppStore } from '@/store/app.store'
import { useDataStore, type SuspenseItem } from '@/store/data.store'
import { type ColumnDef } from '@tanstack/react-table'
import { cn } from '@/lib/utils'

// â”€â”€â”€ Resolve modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type Resolution = 'reassign' | 'refund'

function ResolveModal({ item, onClose }: { item: SuspenseItem | null; onClose: () => void }) {
  const [resolution, setResolution] = useState<Resolution>('reassign')
  const [targetNuban, setTargetNuban] = useState('')
  const { removeSuspense, pushAudit } = useDataStore()
  const showToast = useAppStore((s) => s.showToast)
  const { tenant } = useAppStore()
  const accounts = useDataStore((s) => s.accounts).filter((a) => a.tenant === tenant && a.status === 'active')

  function confirm() {
    if (!item) return
    const desc = resolution === 'reassign'
      ? `Reassigned ${item.amount} â†’ ${targetNuban || item.target}`
      : `Refunded ${item.amount} to originator`
    removeSuspense(item.id)
    pushAudit({ actor: 'Bisi Thomas', role: 'Tenant Ops', action: `Resolved suspense â€” ${resolution}`, resource: item.amount, time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' WAT' })
    showToast(desc)
    onClose()
  }

  const options: { value: Resolution; label: string; desc: string }[] = [
    { value: 'reassign', label: 'Reassign to account', desc: 'Credit the amount to a valid NUBAN' },
    { value: 'refund', label: 'Refund to originator', desc: 'Return the funds via NIP reversal' },
  ]

  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve suspense</DialogTitle>
          <DialogDescription>
            {item?.amount} held for <strong>{item?.age}</strong> Â· reason: {item?.reason.replace(/_/g, ' ')}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => setResolution(o.value)}
              className={cn(
                'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors',
                resolution === o.value ? 'border-accent bg-accent/10' : 'border-border bg-surface-2 hover:border-border-subtle'
              )}
            >
              <div>
                <p className="text-sm font-semibold text-text-primary">{o.label}</p>
                <p className="text-xs text-text-muted">{o.desc}</p>
              </div>
              {resolution === o.value && <div className="h-2 w-2 rounded-full bg-accent" />}
            </button>
          ))}

          {resolution === 'reassign' && (
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">Target NUBAN</label>
              <select
                value={targetNuban}
                onChange={(e) => setTargetNuban(e.target.value)}
                className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Select accountâ€¦</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.nuban}>{a.nuban} â€” {a.name}</option>
                ))}
              </select>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={confirm}>Resolve</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// â”€â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const REASON_FILTERS = ['All', 'unmatched', 'closed_account', 'amount_mismatch', 'tier_limit'] as const
type ReasonFilter = (typeof REASON_FILTERS)[number]

export function SuspenseQueue() {
  const { tenant } = useAppStore()
  const suspense = useDataStore((s) => s.suspense)
  const [filter, setFilter] = useState<ReasonFilter>('All')
  const [resolving, setResolving] = useState<SuspenseItem | null>(null)

  const visible = suspense
    .filter((s) => s.tenant === tenant)
    .filter((s) => filter === 'All' || s.reason === filter)

  const columns: ColumnDef<SuspenseItem, unknown>[] = [
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ getValue }) => (
        <span className="font-mono font-semibold text-[12.5px] text-text-primary">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'target',
      header: 'Target NUBAN',
      cell: ({ getValue }) => (
        <span className="font-mono text-[12px] text-text-secondary">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'reason',
      header: 'Reason',
      cell: ({ getValue }) => {
        const r = getValue() as SuspenseItem['reason']
        return <Badge variant={r}>{r.replace(/_/g, ' ')}</Badge>
      },
    },
    {
      accessorKey: 'age',
      header: 'Age',
      cell: ({ getValue }) => (
        <span className="text-[12px] text-amber-text font-mono">{getValue() as string}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button size="sm" variant="outline" onClick={() => setResolving(row.original)}>
          Resolve
        </Button>
      ),
    },
  ]

  return (
    <SectionLayout noPadding>
      <PageHeader
        title="Suspense Queue"
        subtitle="Unresolved inbound credits pending assignment or refund"
      />
      <div className="px-4 pt-4 pb-4 sm:px-6 sm:pt-5">
        <FilterBar
          options={REASON_FILTERS.map((f) => f === 'All' ? 'All' : f.replace(/_/g, ' '))}
          active={filter === 'All' ? 'All' : filter.replace(/_/g, ' ')}
          onChange={(v) => setFilter(v === 'All' ? 'All' : v.replace(/ /g, '_') as ReasonFilter)}
        />
      </div>
      <div className="px-4 pb-4 sm:px-6 sm:pb-6">
        <Card className="overflow-hidden">
          <DataTable columns={columns} data={visible} emptyMessage="No items in the suspense queue." />
        </Card>
      </div>
      <ResolveModal item={resolving} onClose={() => setResolving(null)} />
    </SectionLayout>
  )
}


