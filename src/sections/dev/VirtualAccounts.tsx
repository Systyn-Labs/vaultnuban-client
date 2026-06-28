import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionLayout } from '@/components/layout/SectionLayout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogBody, DialogFooter,
} from '@/components/ui/dialog'
import { useAppStore } from '@/store/app.store'
import { useDataStore } from '@/store/data.store'
import { vaApi, customerApi, type ApiVirtualAccount, type ApiCustomer } from '@/lib/api'
import { type ColumnDef } from '@tanstack/react-table'

// ─── Provision modal ──────────────────────────────────────────────────────────

function ProvisionModal({ open, onClose, onProvisioned }: {
  open: boolean
  onClose: () => void
  onProvisioned: (va: ApiVirtualAccount) => void
}) {
  const [customers, setCustomers] = useState<ApiCustomer[]>([])
  const [customerId, setCustomerId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const showToast = useAppStore((s) => s.showToast)
  const { pushAudit } = useDataStore()

  useEffect(() => {
    if (open) {
      customerApi.list().then((r) => setCustomers(r.data)).catch(() => {})
    }
  }, [open])

  async function confirm() {
    if (!customerId) return
    setLoading(true)
    setError(null)
    try {
      const va = await vaApi.provision(customerId)
      const customer = customers.find((c) => c.id === customerId)
      pushAudit({
        actor: 'Adaeze Okonkwo', role: 'Tenant Dev',
        action: 'Provisioned virtual account', resource: va.nuban,
        time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' WAT',
      })
      showToast(`Account provisioned — ${va.nuban}`)
      onProvisioned({ ...va, customer_display_name: customer?.display_name })
      setCustomerId('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to provision')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Provision virtual account</DialogTitle>
          <DialogDescription>Creates a new NUBAN linked to a customer.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">Customer</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              disabled={loading}
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Select customer…</option>
              {customers.filter((c) => c.status === 'active').map((c) => (
                <option key={c.id} value={c.id}>{c.display_name}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-[12px] text-destructive">{error}</p>}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={confirm} disabled={!customerId || loading}>
            {loading ? 'Provisioning…' : 'Provision'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Close modal ──────────────────────────────────────────────────────────────

function CloseModal({ account, onClose, onClosed }: {
  account: ApiVirtualAccount | null
  onClose: () => void
  onClosed: (id: string) => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const showToast = useAppStore((s) => s.showToast)
  const { pushAudit } = useDataStore()

  async function confirm() {
    if (!account) return
    setLoading(true)
    try {
      await vaApi.delete(account.customer_id)
      pushAudit({
        actor: 'Adaeze Okonkwo', role: 'Tenant Dev',
        action: 'Closed virtual account', resource: account.nuban,
        time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' WAT',
      })
      showToast(`Account ${account.nuban} closed`)
      onClosed(account.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={!!account} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close account</DialogTitle>
          <DialogDescription>This is irreversible. The NUBAN will be permanently deactivated.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="rounded-xl border px-4 py-3 font-mono text-sm text-red-text" style={{ background: '#1C0A0A', borderColor: '#5C1A1A' }}>
            {account?.nuban} — {account?.account_name}
          </div>
          {error && <p className="mt-2 text-[12px] text-destructive">{error}</p>}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button className="bg-red-text hover:bg-red-text/90 text-white" onClick={confirm} disabled={loading}>
            {loading ? 'Closing…' : 'Close account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function VirtualAccounts() {
  const showToast = useAppStore((s) => s.showToast)
  const { pushAudit } = useDataStore()

  const [accounts, setAccounts] = useState<ApiVirtualAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [provisionOpen, setProvisionOpen] = useState(false)
  const [closing, setClosing] = useState<ApiVirtualAccount | null>(null)

  useEffect(() => {
    vaApi.list()
      .then((r) => setAccounts(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function toggleSuspend(a: ApiVirtualAccount) {
    const isSuspending = a.status.toUpperCase() !== 'SUSPENDED'
    const newStatus = isSuspending ? 'SUSPENDED' : ('ACTIVE' as const)
    try {
      await vaApi.patch(a.customer_id, { status: newStatus })
      setAccounts((prev) => prev.map((x) =>
        x.id === a.id ? { ...x, status: newStatus } : x
      ))
      pushAudit({
        actor: 'Adaeze Okonkwo', role: 'Tenant Dev',
        action: `${isSuspending ? 'Suspended' : 'Unsuspended'} virtual account`, resource: a.nuban,
        time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' WAT',
      })
      showToast(`${a.nuban} ${isSuspending ? 'suspended' : 'reactivated'}`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Action failed')
    }
  }

  const columns: ColumnDef<ApiVirtualAccount, unknown>[] = [
    {
      accessorKey: 'nuban',
      header: 'NUBAN',
      cell: ({ getValue }) => <span className="font-mono text-[12.5px] text-text-secondary">{getValue() as string}</span>,
    },
    {
      accessorKey: 'account_name',
      header: 'Name',
      cell: ({ getValue }) => <span className="font-semibold text-text-primary">{getValue() as string}</span>,
    },
    {
      id: 'customer',
      header: 'Customer',
      cell: ({ row }) => (
        <span className="text-text-secondary">{row.original.customer_display_name || '—'}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const s = (getValue() as string).toLowerCase()
        return <Badge variant={s as 'active' | 'suspended' | 'closed'}>{s}</Badge>
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const a = row.original
        const isClosed = a.status.toUpperCase() === 'CLOSED'
        const isSuspended = a.status.toUpperCase() === 'SUSPENDED'
        if (isClosed) return <span className="text-xs text-text-muted">Closed</span>
        return (
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant={isSuspended ? 'success' : 'outline'} onClick={() => toggleSuspend(a)}>
              {isSuspended ? 'Unsuspend' : 'Suspend'}
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setClosing(a)}>Close</Button>
          </div>
        )
      },
    },
  ]

  return (
    <SectionLayout noPadding>
      <PageHeader
        title="Virtual Accounts"
        subtitle="Provision and manage NUBAN virtual accounts for your customers"
        actions={<Button size="sm" onClick={() => setProvisionOpen(true)}>Provision account</Button>}
      />
      <div className="p-6 sm:p-8">
        <Card className="overflow-hidden">
          <DataTable
            columns={columns}
            data={accounts}
            emptyMessage={loading ? 'Loading…' : 'No accounts yet — provision one above.'}
          />
        </Card>
      </div>
      <ProvisionModal
        open={provisionOpen}
        onClose={() => setProvisionOpen(false)}
        onProvisioned={(va) => setAccounts((prev) => [va, ...prev])}
      />
      <CloseModal account={closing} onClose={() => setClosing(null)} onClosed={(id) => setAccounts((prev) => prev.filter((x) => x.id !== id))} />
    </SectionLayout>
  )
}
