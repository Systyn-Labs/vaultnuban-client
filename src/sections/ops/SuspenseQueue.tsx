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
import { suspenseApi, customerApi, type ApiSuspenseItem, type ApiCustomer } from '@/lib/api'
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

type Resolution = 'reassign' | 'refund_flagged'

const RESOLUTION_OPTS: {
  value: Resolution
  label: string
  desc: string
  what: string
  api: string
}[] = [
  {
    value: 'reassign',
    label: 'Reassign to customer',
    desc: 'Credit the held amount to a selected customer wallet',
    what: 'DR suspense_account / CR customer_wallet — funds move immediately.',
    api: 'PATCH /v1/suspense/{id}  { "resolution": "reassign", "target_customer_id": "…" }',
  },
  {
    value: 'refund_flagged',
    label: 'Flag for refund',
    desc: 'Mark for manual NIP reversal — funds stay in suspense until bank confirms',
    what: 'Status → refund_flagged. Funds remain in suspense. Ops team initiates NIP reversal offline.',
    api: 'PATCH /v1/suspense/{id}  { "resolution": "refund_flagged" }',
  },
]

function ResolveModal({ item, onClose, onResolved }: {
  item: ApiSuspenseItem | null
  onClose: () => void
  onResolved: (id: string) => void
}) {
  const [resolution, setResolution] = useState<Resolution>('reassign')
  const [notes, setNotes] = useState('')
  const [targetCustomerId, setTargetCustomerId] = useState('')
  const [customers, setCustomers] = useState<ApiCustomer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const showToast = useAppStore((s) => s.showToast)
  const { pushAudit } = useDataStore()

  // Load customers when modal opens (needed for reassign picker)
  useEffect(() => {
    if (!item) return
    setError(null)
    setNotes('')
    setTargetCustomerId('')
    setResolution('reassign')
    customerApi.list().then((r) => setCustomers(r.data)).catch(() => {})
  }, [item])

  async function confirm() {
    if (!item) return
    if (resolution === 'reassign' && !targetCustomerId) {
      setError('Select a customer to reassign to.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await suspenseApi.resolve(item.id, {
        resolution,
        notes: notes || (resolution === 'reassign' ? 'Reassigned via dashboard' : 'Flagged for refund via dashboard'),
        target_customer_id: resolution === 'reassign' ? targetCustomerId : undefined,
      })
      const amtStr = item.amount_kobo ? formatKobo(item.amount_kobo) : item.transaction_id.slice(0, 8)
      const target = customers.find((c) => c.id === targetCustomerId)
      const desc = resolution === 'reassign'
        ? `Reassigned ${amtStr} → ${target?.display_name ?? targetCustomerId}`
        : `Flagged ${amtStr} for refund`
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

  const amtDisplay = item?.amount_kobo ? formatKobo(item.amount_kobo) : '—'
  const age = item ? timeAgo(item.created_at) : '—'
  const selected = RESOLUTION_OPTS.find((o) => o.value === resolution)!

  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve suspense</DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-text-primary">{amtDisplay}</span>
            {' '}held for <strong>{age}</strong>
            {item?.nuban ? <> · NUBAN <span className="font-mono">{item.nuban}</span></> : null}
            {' '}· reason: <span className="italic">{item?.reason.replace(/_/g, ' ')}</span>
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-3">
          {/* Resolution type picker */}
          {RESOLUTION_OPTS.map((o) => (
            <button
              key={o.value}
              onClick={() => setResolution(o.value)}
              disabled={loading}
              className={cn(
                'flex w-full items-start justify-between rounded-xl border px-4 py-3 text-left transition-colors',
                resolution === o.value
                  ? 'border-accent bg-accent/10'
                  : 'border-border bg-surface-2 hover:border-border-subtle'
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary">{o.label}</p>
                <p className="text-xs text-text-muted">{o.desc}</p>
              </div>
              {resolution === o.value && <div className="mt-1 ml-3 h-2 w-2 flex-shrink-0 rounded-full bg-accent" />}
            </button>
          ))}

          {/* What happens panel */}
          <div className="rounded-lg border border-border bg-surface-2 px-4 py-3 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">What happens</p>
            <p className="text-[12px] text-text-secondary">{selected.what}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mt-2">API call</p>
            <pre className="text-[11px] text-text-secondary font-mono whitespace-pre-wrap break-all">{selected.api}</pre>
          </div>

          {/* Customer picker for reassign */}
          {resolution === 'reassign' && (
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                Target customer <span className="text-destructive">*</span>
              </label>
              <select
                value={targetCustomerId}
                onChange={(e) => setTargetCustomerId(e.target.value)}
                disabled={loading}
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-[13px] text-text-primary focus:border-accent focus:outline-none"
              >
                <option value="">— select customer —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.display_name} ({c.external_ref})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Optional notes */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              rows={2}
              placeholder="e.g. Confirmed via support ticket #1234"
              className="w-full resize-none rounded-lg border border-border bg-surface-2 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
          </div>

          {error && <p className="text-[12px] text-destructive">{error}</p>}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            onClick={confirm}
            disabled={loading || (resolution === 'reassign' && !targetCustomerId)}
          >
            {loading ? 'Resolving…' : 'Confirm resolution'}
          </Button>
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
