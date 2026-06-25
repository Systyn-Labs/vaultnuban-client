import { useState } from 'react'
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
import { useDataStore, type Customer } from '@/store/data.store'
import { type ColumnDef } from '@tanstack/react-table'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

// â”€â”€â”€ KYC Tier modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TIER_CAPS: Record<Customer['tier'], number> = { 'Tier 1': 50000, 'Tier 2': 500000, 'Tier 3': Infinity }
const TIER_LABELS: Record<Customer['tier'], string> = { 'Tier 1': 'â‚¦50,000 / day', 'Tier 2': 'â‚¦500,000 / day', 'Tier 3': 'No limit' }

function KycModal({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  const [tier, setTier] = useState<Customer['tier']>(customer?.tier ?? 'Tier 1')
  const { updateCustomer, pushAudit } = useDataStore()
  const showToast = useAppStore((s) => s.showToast)
  const tiers: Customer['tier'][] = ['Tier 1', 'Tier 2', 'Tier 3']
  const warn = customer && customer.balanceNum > TIER_CAPS[tier]

  function confirm() {
    if (!customer) return
    updateCustomer(customer.id, { tier })
    pushAudit({ actor: 'Bisi Thomas', role: 'Tenant Ops', action: `Updated KYC tier â†’ ${tier}`, resource: customer.name, time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' WAT' })
    showToast(`${customer.name} set to ${tier}`)
    onClose()
  }

  return (
    <Dialog open={!!customer} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update KYC tier</DialogTitle>
          <DialogDescription>{customer?.name} Â· {customer?.doc}</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          {tiers.map((t) => (
            <button
              key={t}
              onClick={() => setTier(t)}
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
          {warn && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-text/30 bg-amber-bg/10 px-4 py-3 text-[12.5px] text-amber-text">
              <AlertTriangle className="mt-px h-4 w-4 flex-shrink-0" />
              Current balance exceeds the daily cap for {tier}. Transactions above the limit will be suspended.
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={confirm}>Save tier</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// â”€â”€â”€ Create customer modal (dev only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [docType, setDocType] = useState<'NIN' | 'BVN'>('NIN')
  const [docNum, setDocNum] = useState('')
  const { tenant } = useAppStore()
  const { addCustomer, pushAudit } = useDataStore()
  const showToast = useAppStore((s) => s.showToast)

  function confirm() {
    addCustomer({ id: `c${Date.now()}`, tenant, name: name.trim(), doc: `${docType} Â· ${docNum.trim()}`, tier: 'Tier 1', status: 'active', balanceNum: 0 })
    pushAudit({ actor: 'Adaeze Okonkwo', role: 'Tenant Dev', action: 'Created customer', resource: name.trim(), time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' WAT' })
    showToast(`Customer ${name.trim()} created`)
    setName(''); setDocNum(''); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add customer</DialogTitle>
          <DialogDescription>New customers start at Tier 1 (â‚¦50,000 / day).</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">Full name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emeka Obi" />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">Identity document</label>
            <div className="flex gap-2">
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as 'NIN' | 'BVN')}
                className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="NIN">NIN</option>
                <option value="BVN">BVN</option>
              </select>
              <Input value={docNum} onChange={(e) => setDocNum(e.target.value)} placeholder="Document number" className="flex-1" />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={confirm} disabled={!name.trim() || !docNum.trim()}>Add customer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// â”€â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function Customers({ readonly }: { readonly: boolean }) {
  const { tenant } = useAppStore()
  const { customers, updateCustomer, pushAudit } = useDataStore()
  const showToast = useAppStore((s) => s.showToast)

  const [kycTarget, setKycTarget] = useState<Customer | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const tenantCustomers = customers.filter((c) => c.tenant === tenant)

  function deactivate(c: Customer) {
    updateCustomer(c.id, { status: 'inactive' })
    pushAudit({ actor: 'Adaeze Okonkwo', role: 'Tenant Dev', action: 'Deactivated customer (soft)', resource: c.name, time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' WAT' })
    showToast(`${c.name} deactivated`)
  }

  const columns: ColumnDef<Customer, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ getValue }) => <span className="font-semibold text-text-primary">{getValue() as string}</span>,
    },
    {
      accessorKey: 'doc',
      header: 'Identity',
      cell: ({ getValue }) => <span className="font-mono text-[12px] text-text-secondary">{getValue() as string}</span>,
    },
    {
      accessorKey: 'tier',
      header: 'KYC tier',
      cell: ({ getValue }) => {
        const t = getValue() as Customer['tier']
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
      accessorKey: 'balanceNum',
      header: 'Balance',
      cell: ({ getValue }) => {
        const n = getValue() as number
        return <span className="font-mono text-[12.5px] text-text-primary">â‚¦{n.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
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
          ? 'Read access with operational writes â€” update KYC tiers; create/delete is developer-only.'
          : 'Full CRUD â€” create, edit and soft-deactivate customers and their identities.'}
        actions={!readonly && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>Add customer</Button>
        )}
      />
      <div className="p-6 sm:p-8">
        <Card className="overflow-hidden">
          <DataTable columns={columns} data={tenantCustomers} emptyMessage="No customers yet." />
        </Card>
      </div>
      <KycModal customer={kycTarget} onClose={() => setKycTarget(null)} />
      {!readonly && <CreateModal open={createOpen} onClose={() => setCreateOpen(false)} />}
    </SectionLayout>
  )
}


