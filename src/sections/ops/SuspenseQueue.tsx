import { useEffect, useState } from 'react'
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
import { useDataStore } from '@/store/data.store'
import { suspenseApi, type ApiSuspenseItem } from '@/lib/api'
import { type ColumnDef } from '@tanstack/react-table'
import { cn } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatKobo(kobo: number): string {
  return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`
  return `${Math.floor(diff / 86400)}d`
}

// ─── Resolve modal ────────────────────────────────────────────────────────────

type Resolution = 'reassign' | 'refund'

function ResolveModal({ item, onClose, onResolved }: {
  item: ApiSuspenseItem | null
  onClose: () => void
  onResolved: (id: string) => void
}) {
  const [resolution, setResolution] = useState<Resolution>('reassign')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const showToast = useAppStore((s) => s.showToast)
  const { pushAudit } = useDataStore()

  useEffect(() => { setError(null); setNotes('') }, [item])

  async function confirm() {
    if (!item) return
    setLoading(true)
    setError(null)
    try {
      await suspenseApi.resolve(item.id, {
        resolution,
        notes: notes || (resolution === 'reassign' ? 'Reassigned via dashboard' : 'Refunded via dashboard'),
      })
      const amtStr = item.amount_kobo ? formatKobo(item.amount_kobo) : item.transaction_id.slice(0, 8)
      const desc = resolution === 'reassign'
        ? `Reassigned ${amtStr} → ${item.nuban || '—'}`
        : `Refunded ${amtStr} to originator`
      pushAudit({
        actor: 'Bisi Thomas',
        role: 'Tenant Ops',
        action: `Resolved suspense — ${resolution}`,
        resource: amtStr,
        time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' WAT',
      })
      showToast(desc)
      onResolved(item.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve')
    } finally {
      setLoading(false)
    }
  }

  const options: { value: Resolution; label: string; desc: string }[] = [
    { value: 'reassign', label: 'Reassign to account', desc: 'Credit the amount to a valid NUBAN' },
    { value: 'refund', label: 'Refund to originator', desc: 'Return the funds via NIP reversal' },
  ]

  const amtDisplay = item?.amount_kobo ? formatKobo(item.amount_kobo) : '—'
  const age = item ? timeAgo(item.created_at) : '—'

  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve suspense</DialogTitle>
          <DialogDescription>
            {amtDisplay} held for <strong>{age}</strong> · reason: {item?.reason.replace(/_/g, ' ')}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => setResolution(o.value)}
              disabled={loading}
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
          {error && <p className="text-[12px] text-destructive">{error}</p>}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={confirm} disabled={loading}>{loading ? 'Resolving…' : 'Resolve'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const REASON_FILTERS = ['All', 'unmatched', 'closed_account', 'amount_mismatch', 'tier_limit'] as const
type ReasonFilter = (typeof REASON_FILTERS)[number]

export function SuspenseQueue() {
  const [items, setItems] = useState<ApiSuspenseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ReasonFilter>('All')
  const [resolving, setResolving] = useState<ApiSuspenseItem | null>(null)

  useEffect(() => {
    suspenseApi.list()
      .then((res) => setItems(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handleResolved(id: string) {
    setItems((prev) => prev.filter((x) => x.id !== id))
  }

  const visible = items.filter((s) => filter === 'All' || s.reason === filter)

  const columns: ColumnDef<ApiSuspenseItem, unknown>[] = [
    {
      id: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="font-mono font-semibold text-[12.5px] text-text-primary">
          {row.original.amount_kobo ? formatKobo(row.original.amount_kobo) : '—'}
        </span>
      ),
    },
    {
      id: 'nuban',
      header: 'Target NUBAN',
      cell: ({ row }) => (
        <span className="font-mono text-[12px] text-text-secondary">
          {row.original.nuban || row.original.transaction_id.slice(0, 8)}
        </span>
      ),
    },
    {
      accessorKey: 'reason',
      header: 'Reason',
      cell: ({ getValue }) => {
        const r = getValue() as string
        return <Badge variant={r as 'unmatched' | 'closed_account' | 'amount_mismatch' | 'tier_limit'}>{r.replace(/_/g, ' ')}</Badge>
      },
    },
    {
      id: 'age',
      header: 'Age',
      cell: ({ row }) => (
        <span className="text-[12px] text-amber-text font-mono">{timeAgo(row.original.created_at)}</span>
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
      <div className="px-6 pb-6 sm:px-8 sm:pb-8">
        <Card className="overflow-hidden">
          <DataTable
            columns={columns}
            data={visible}
            emptyMessage={loading ? 'Loading…' : 'No items in the suspense queue.'}
          />
        </Card>
      </div>
      <ResolveModal item={resolving} onClose={() => setResolving(null)} onResolved={handleResolved} />
    </SectionLayout>
  )
}
