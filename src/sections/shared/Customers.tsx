import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionLayout } from '@/components/layout/SectionLayout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogBody, DialogFooter,
} from '@/components/ui/dialog'
import { useAppStore } from '@/store/app.store'
import { useDataStore } from '@/store/data.store'
import { customerApi, type ApiCustomer } from '@/lib/api'
import { type ColumnDef } from '@tanstack/react-table'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

type TierLabel = 'Tier 1' | 'Tier 2' | 'Tier 3'

function tierLabel(n: number): TierLabel {
  if (n === 2) return 'Tier 2'
  if (n >= 3) return 'Tier 3'
  return 'Tier 1'
}

function tierNum(label: TierLabel): number {
  return label === 'Tier 3' ? 3 : label === 'Tier 2' ? 2 : 1
}

function docString(c: ApiCustomer): string {
  if (!c.identity) return '—'
  if (c.identity.nin_masked) return `NIN · ${c.identity.nin_masked}`
  if (c.identity.bvn_masked) return `BVN · ${c.identity.bvn_masked}`
  return '—'
}

const TIER_CAPS: Record<TierLabel, number> = { 'Tier 1': 50000, 'Tier 2': 500000, 'Tier 3': Infinity }
const TIER_LABELS: Record<TierLabel, string> = { 'Tier 1': '₦50,000 / day', 'Tier 2': '₦500,000 / day', 'Tier 3': 'No limit' }

// ─── KYC Tier modal ───────────────────────────────────────────────────────────

function KycModal({ customer, onClose, onUpdated }: {
  customer: ApiCustomer | null
  onClose: () => void
  onUpdated: (c: ApiCustomer) => void
}) {
  const currentTier = customer ? tierLabel(customer.identity?.kyc_tier ?? 1) : 'Tier 1'
  const [tier, setTier] = useState<TierLabel>(currentTier)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const showToast = useAppStore((s) => s.showToast)
  const { pushAudit } = useDataStore()
  const tiers: TierLabel[] = ['Tier 1', 'Tier 2', 'Tier 3']

  useEffect(() => {
    if (customer) setTier(tierLabel(customer.identity?.kyc_tier ?? 1))
    setError(null)
  }, [customer])

  async function confirm() {
    if (!customer) return
    setLoading(true)
    setError(null)
    try {
      const updated = await customerApi.updateKYC(customer.id, tierNum(tier))
      pushAudit({
        actor: 'Bisi Thomas',
        role: 'Tenant Ops',
        action: `Updated KYC tier → ${tier}`,
        resource: customer.display_name,
        time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' WAT',
      })
      showToast(`${customer.display_name} set to ${tier}`)
      onUpdated(updated)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={!!customer} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update KYC tier</DialogTitle>
          <DialogDescription>{customer?.display_name} · {customer ? docString(customer) : ''}</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          {tiers.map((t) => (
            <button
              key={t}
              onClick={() => setTier(t)}
              disabled={loading}
              className={cn(
                'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors',
                tier === t ? 'border-accent bg-accent/10' : 'border-border bg-surface-2 hover:border-border-subtle'
              )}
            >
              <div>
                <p className="text-sm font-semibold text-text-primary">{t}</p>
                <p className="text-xs text-text-muted">{TIER_LABELS[t]}</p>
              </div>
              {tier === t && <div className="h-2 w-2 rounded-full bg-accent" />}
            </button>
          ))}
          {customer && (TIER_CAPS[tier] !== Infinity) && false && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-text/30 bg-amber-bg/10 px-4 py-3 text-[12.5px] text-amber-text">
              <AlertTriangle className="mt-px h-4 w-4 flex-shrink-0" />
              Transactions above the daily cap for {tier} will be suspended.
            </div>
          )}
          {error && <p className="text-[12px] text-destructive">{error}</p>}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={confirm} disabled={loading}>{loading ? 'Saving…' : 'Save tier'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Create customer modal (dev only) ─────────────────────────────────────────

function CreateModal({ open, onClose, onCreated }: {
  open: boolean
  onClose: () => void
  onCreated: (c: ApiCustomer) => void
}) {
  const [name, setName] = useState('')
  const [docType, setDocType] = useState<'NIN' | 'BVN'>('NIN')
  const [docNum, setDocNum] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { pushAudit } = useDataStore()
  const showToast = useAppStore((s) => s.showToast)

  function reset() { setName(''); setDocNum(''); setError(null); setLoading(false) }

  async function confirm() {
    setLoading(true)
    setError(null)
    try {
      const identity = docType === 'NIN'
        ? { nin_masked: docNum.trim(), kyc_tier: 1 }
        : { bvn_masked: docNum.trim(), kyc_tier: 1 }
      const customer = await customerApi.create({
        external_ref: name.trim().toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(),
        display_name: name.trim(),
        identity,
      })
      pushAudit({
        actor: 'Adaeze Okonkwo',
        role: 'Tenant Dev',
        action: 'Created customer',
        resource: name.trim(),
        time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' WAT',
      })
      showToast(`Customer ${name.trim()} created`)
      onCreated(customer)
      reset()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create')
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose() } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add customer</DialogTitle>
          <DialogDescription>New customers start at Tier 1 (₦50,000 / day).</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">Full name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emeka Obi" disabled={loading} />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">Identity document</label>
            <div className="flex gap-2">
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as 'NIN' | 'BVN')}
                disabled={loading}
                className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="NIN">NIN</option>
                <option value="BVN">BVN</option>
              </select>
              <Input value={docNum} onChange={(e) => setDocNum(e.target.value)} placeholder="Document number" className="flex-1" disabled={loading} />
            </div>
          </div>
          {error && <p className="text-[12px] text-destructive">{error}</p>}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose() }} disabled={loading}>Cancel</Button>
          <Button onClick={confirm} disabled={!name.trim() || !docNum.trim() || loading}>
            {loading ? 'Adding…' : 'Add customer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function Customers({ readonly }: { readonly: boolean }) {
  const showToast = useAppStore((s) => s.showToast)
  const { pushAudit } = useDataStore()

  const [customers, setCustomers] = useState<ApiCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [kycTarget, setKycTarget] = useState<ApiCustomer | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    customerApi.list()
      .then((res) => setCustomers(res.data))
      .catch(() => {/* stay with empty list on error */})
      .finally(() => setLoading(false))
  }, [])

  function handleUpdated(updated: ApiCustomer) {
    setCustomers((prev) => prev.map((c) => c.id === updated.id ? updated : c))
  }

  function handleCreated(c: ApiCustomer) {
    setCustomers((prev) => [c, ...prev])
  }

  function deactivate(c: ApiCustomer) {
    // Soft-deactivation is not yet a separate API endpoint; optimistic update only
    setCustomers((prev) => prev.map((x) => x.id === c.id ? { ...x, status: 'inactive' } : x))
    pushAudit({
      actor: 'Adaeze Okonkwo',
      role: 'Tenant Dev',
      action: 'Deactivated customer (soft)',
      resource: c.display_name,
      time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' WAT',
    })
    showToast(`${c.display_name} deactivated`)
  }

  const columns: ColumnDef<ApiCustomer, unknown>[] = [
    {
      accessorKey: 'display_name',
      header: 'Name',
      cell: ({ getValue }) => <span className="font-semibold text-text-primary">{getValue() as string}</span>,
    },
    {
      id: 'doc',
      header: 'Identity',
      cell: ({ row }) => (
        <span className="font-mono text-[12px] text-text-secondary">{docString(row.original)}</span>
      ),
    },
    {
      id: 'tier',
      header: 'KYC tier',
      cell: ({ row }) => {
        const t = tierLabel(row.original.identity?.kyc_tier ?? 1)
        const v = t === 'Tier 1' ? 'tier1' : t === 'Tier 2' ? 'tier2' : 'tier3'
        return <Badge variant={v as 'tier1' | 'tier2' | 'tier3'}>{t}</Badge>
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const s = getValue() as string
        return <Badge variant={s as 'active' | 'inactive'}>{s}</Badge>
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const c = row.original
        return (
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={() => setKycTarget(c)}>KYC tier</Button>
            {!readonly && c.status === 'active' && (
              <Button size="sm" variant="destructive" onClick={() => deactivate(c)}>Deactivate</Button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <SectionLayout noPadding>
      <PageHeader
        title="Customers"
        subtitle={readonly
          ? 'Read access with operational writes — update KYC tiers; create/delete is developer-only.'
          : 'Full CRUD — create, edit and soft-deactivate customers and their identities.'}
        actions={!readonly && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>Add customer</Button>
        )}
      />
      <div className="p-6 sm:p-8">
        <Card className="overflow-hidden">
          <DataTable
            columns={columns}
            data={customers}
            emptyMessage={loading ? 'Loading…' : 'No customers yet.'}
          />
        </Card>
      </div>
      <KycModal customer={kycTarget} onClose={() => setKycTarget(null)} onUpdated={handleUpdated} />
      {!readonly && <CreateModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />}
    </SectionLayout>
  )
}
