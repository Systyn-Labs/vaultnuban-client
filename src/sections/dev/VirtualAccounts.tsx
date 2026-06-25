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
import { useDataStore, type VirtualAccount } from '@/store/data.store'
import { type ColumnDef } from '@tanstack/react-table'

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function nextNuban(accounts: VirtualAccount[]) {
  const base = 9912004534
  return String(base + accounts.length)
}

// â”€â”€â”€ Modals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ProvisionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [customerId, setCustomerId] = useState('')
  const { tenant } = useAppStore()
  const { customers, accounts, addAccount, pushAudit } = useDataStore()
  const showToast = useAppStore((s) => s.showToast)
  const tenantCustomers = customers.filter((c) => c.tenant === tenant && c.status === 'active')

  function confirm() {
    const customer = tenantCustomers.find((c) => c.id === customerId) ?? tenantCustomers[0]
    const nuban = nextNuban(accounts)
    addAccount({
      id: `a${Date.now()}`,
      tenant,
      nuban,
      name: name.trim() || customer?.name || 'New account',
      customer: customer?.name ?? 'â€”',
      status: 'active',
      balance: 'â‚¦0.00',
    })
    pushAudit({
      actor: 'Adaeze Okonkwo', role: 'Tenant Dev',
      action: 'Provisioned virtual account', resource: nuban,
      time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' WAT',
    })
    showToast(`Account provisioned â€” ${nuban}`)
    setName(''); setCustomerId(''); onClose()
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
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">Account label</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ada savings" />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">Customer</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Select customerâ€¦</option>
              {tenantCustomers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} â€” {c.doc}</option>
              ))}
            </select>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={confirm}>Provision</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RenameModal({ account, onClose }: { account: VirtualAccount | null; onClose: () => void }) {
  const [value, setValue] = useState(account?.name ?? '')
  const { updateAccount, pushAudit } = useDataStore()
  const showToast = useAppStore((s) => s.showToast)

  function confirm() {
    if (!account) return
    updateAccount(account.id, { name: value })
    pushAudit({ actor: 'Adaeze Okonkwo', role: 'Tenant Dev', action: 'Renamed virtual account', resource: account.nuban, time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' WAT' })
    showToast('Account renamed â€” NUBAN unchanged')
    onClose()
  }

  return (
    <Dialog open={!!account} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename account</DialogTitle>
          <DialogDescription>The NUBAN <span className="font-mono">{account?.nuban}</span> remains unchanged.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Input value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={confirm} disabled={!value.trim()}>Rename</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CloseModal({ account, onClose }: { account: VirtualAccount | null; onClose: () => void }) {
  const { updateAccount, pushAudit } = useDataStore()
  const showToast = useAppStore((s) => s.showToast)

  function confirm() {
    if (!account) return
    updateAccount(account.id, { status: 'closed', balance: 'â‚¦0.00' })
    pushAudit({ actor: 'Adaeze Okonkwo', role: 'Tenant Dev', action: 'Closed virtual account', resource: account.nuban, time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' WAT' })
    showToast(`Account ${account.nuban} closed â€” terminal state`)
    onClose()
  }

  return (
    <Dialog open={!!account} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close account</DialogTitle>
          <DialogDescription>This is irreversible. The NUBAN will be permanently deactivated and its balance zeroed.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="rounded-xl border px-4 py-3 font-mono text-sm text-red-text" style={{ background: '#1C0A0A', borderColor: '#5C1A1A' }}>
            {account?.nuban} â€” {account?.name}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-red-text hover:bg-red-text/90 text-white" onClick={confirm}>Close account</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// â”€â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function VirtualAccounts() {
  const { tenant } = useAppStore()
  const { accounts, updateAccount, pushAudit } = useDataStore()
  const showToast = useAppStore((s) => s.showToast)

  const [provisionOpen, setProvisionOpen] = useState(false)
  const [renaming, setRenaming] = useState<VirtualAccount | null>(null)
  const [closing, setClosing] = useState<VirtualAccount | null>(null)

  const tenantAccounts = accounts.filter((a) => a.tenant === tenant)

  function toggleSuspend(a: VirtualAccount) {
    const ns = a.status === 'suspended' ? 'active' : 'suspended'
    updateAccount(a.id, { status: ns })
    pushAudit({ actor: 'Adaeze Okonkwo', role: 'Tenant Dev', action: `${ns === 'suspended' ? 'Suspended' : 'Unsuspended'} virtual account`, resource: a.nuban, time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' WAT' })
    showToast(`${a.nuban} ${ns === 'suspended' ? 'suspended' : 'reactivated'}`)
  }

  const columns: ColumnDef<VirtualAccount, unknown>[] = [
    {
      accessorKey: 'nuban',
      header: 'NUBAN',
      cell: ({ getValue }) => <span className="font-mono text-[12.5px] text-text-secondary">{getValue() as string}</span>,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ getValue }) => <span className="font-semibold text-text-primary">{getValue() as string}</span>,
    },
    {
      accessorKey: 'customer',
      header: 'Customer',
      cell: ({ getValue }) => <span className="text-text-secondary">{getValue() as string}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const s = getValue() as string
        return <Badge variant={s as 'active' | 'suspended' | 'closed'}>{s}</Badge>
      },
    },
    {
      accessorKey: 'balance',
      header: 'Balance',
      cell: ({ getValue }) => <span className="font-mono font-semibold text-text-primary">{getValue() as string}</span>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const a = row.original
        if (a.status === 'closed') return <span className="text-xs text-text-muted">Closed</span>
        return (
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setRenaming(a)}>Rename</Button>
            <Button size="sm" variant={a.status === 'suspended' ? 'success' : 'outline'} onClick={() => toggleSuspend(a)}>
              {a.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
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
          <DataTable columns={columns} data={tenantAccounts} emptyMessage="No accounts yet â€” provision one above." />
        </Card>
      </div>
      <ProvisionModal open={provisionOpen} onClose={() => setProvisionOpen(false)} />
      <RenameModal account={renaming} onClose={() => setRenaming(null)} />
      <CloseModal account={closing} onClose={() => setClosing(null)} />
    </SectionLayout>
  )
}


