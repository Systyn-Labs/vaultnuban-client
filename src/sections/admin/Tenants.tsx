import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionLayout } from '@/components/layout/SectionLayout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { KeyRevealModal } from '@/components/shared/KeyRevealModal'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { useAppStore } from '@/store/app.store'
import { useDataStore, type Tenant } from '@/store/data.store'
import { type ColumnDef } from '@tanstack/react-table'

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function genKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let out = 'sk_live_'
  for (let i = 0; i < 32; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

// â”€â”€â”€ Onboard modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface OnboardModalProps {
  open: boolean
  onClose: () => void
  onCreated: (name: string, key: string) => void
}

function OnboardModal({ open, onClose, onCreated }: OnboardModalProps) {
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')

  function handleConfirm() {
    onCreated(name.trim() || 'New Tenant', genKey())
    setName('')
    setContact('')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Onboard tenant</DialogTitle>
          <DialogDescription>
            Creates the tenant and issues its first API key.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Business name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kola Foods Ltd"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Contact email
            </label>
            <Input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="dev@kolafoods.ng"
              type="email"
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!name.trim()}>
            Create &amp; issue key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// â”€â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function Tenants() {
  const showToast = useAppStore((s) => s.showToast)
  const { tenants, addTenant, toggleTenant, pushAudit } = useDataStore()

  const [onboardOpen, setOnboardOpen] = useState(false)
  const [revealKey, setRevealKey] = useState<{ name: string; key: string } | null>(null)

  function handleOnboard(name: string, key: string) {
    const newKey = `tnt_${Date.now()}`
    addTenant({
      id: `tnt_${newKey}`,
      key: newKey,
      name,
      contact: 'â€”',
      customers: 0,
      accounts: 0,
      suspense: 'â‚¦0',
      webhook: 'â€”',
      lastActivity: 'just now',
      status: 'active',
    })
    pushAudit({
      actor: 'Systyn Operator',
      role: 'Platform Admin',
      action: 'Onboarded tenant',
      resource: name,
      time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' WAT',
    })
    setOnboardOpen(false)
    setRevealKey({ name, key })
  }

  function handleToggle(t: Tenant) {
    toggleTenant(t.id)
    pushAudit({
      actor: 'Systyn Operator',
      role: 'Platform Admin',
      action: `${t.status === 'active' ? 'Suspended' : 'Restored'} tenant (kill-switch)`,
      resource: t.name,
      time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' WAT',
    })
    showToast(
      t.status === 'active'
        ? `${t.name} suspended â€” keys disabled`
        : `${t.name} restored`
    )
  }

  const columns: ColumnDef<Tenant, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Tenant',
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-text-primary">{row.original.name}</p>
          <p className="font-mono text-[11px] text-text-muted">{row.original.id}</p>
        </div>
      ),
    },
    {
      accessorKey: 'contact',
      header: 'Contact',
      cell: ({ getValue }) => (
        <span className="text-text-secondary">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'customers',
      header: 'Customers',
      cell: ({ getValue }) => <span className="font-mono">{getValue() as number}</span>,
    },
    {
      accessorKey: 'accounts',
      header: 'Accounts',
      cell: ({ getValue }) => <span className="font-mono">{getValue() as number}</span>,
    },
    {
      accessorKey: 'suspense',
      header: 'Open suspense',
      cell: ({ getValue }) => (
        <span className="font-mono text-amber-text">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'lastActivity',
      header: 'Last activity',
      cell: ({ getValue }) => (
        <span className="text-text-muted">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const s = getValue() as string
        return <Badge variant={s as 'active' | 'suspended'}>{s}</Badge>
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const t = row.original
        const isSuspended = t.status === 'suspended'
        return (
          <Button
            size="sm"
            variant={isSuspended ? 'success' : 'destructive'}
            onClick={() => handleToggle(t)}
          >
            {isSuspended ? 'Restore' : 'Suspend'}
          </Button>
        )
      },
    },
  ]

  return (
    <SectionLayout noPadding>
      <PageHeader
        title="Tenants"
        subtitle="Manage all platform tenants, issue API keys and toggle kill-switches"
        actions={
          <Button size="sm" onClick={() => setOnboardOpen(true)}>
            Onboard tenant
          </Button>
        }
      />

      <div className="p-6 sm:p-8">
        <Card className="overflow-hidden">
          <DataTable columns={columns} data={tenants} emptyMessage="No tenants yet." />
        </Card>
      </div>

      <OnboardModal
        open={onboardOpen}
        onClose={() => setOnboardOpen(false)}
        onCreated={handleOnboard}
      />

      {revealKey && (
        <KeyRevealModal
          open={!!revealKey}
          onClose={() => setRevealKey(null)}
          title="Tenant onboarded"
          subtitle={`${revealKey.name} created â€” share this key securely with the integrator.`}
          apiKey={revealKey.key}
        />
      )}
    </SectionLayout>
  )
}


