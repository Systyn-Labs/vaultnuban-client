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
import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/app.store'
import { useDataStore, type Tenant } from '@/store/data.store'
import { adminApi } from '@/lib/api'
import { type ColumnDef } from '@tanstack/react-table'

// ─── Onboard modal ────────────────────────────────────────────────────────────

interface OnboardModalProps {
  open: boolean
  onClose: () => void
  onCreated: (tenantName: string, tenantId: string, apiKey: string) => void
}

function OnboardModal({ open, onClose, onCreated }: OnboardModalProps) {
  const [tenantName, setTenantName] = useState('')
  const [devName, setDevName] = useState('')
  const [devEmail, setDevEmail] = useState('')
  const [devPassword, setDevPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setTenantName(''); setDevName(''); setDevEmail(''); setDevPassword('')
    setError(null); setLoading(false)
  }

  async function handleConfirm() {
    setError(null)
    setLoading(true)
    try {
      const res = await adminApi.onboard(tenantName.trim(), [
        { name: devName.trim(), email: devEmail.trim(), password: devPassword, role: 'dev' },
      ])
      onCreated(res.tenant_name, res.tenant_id, res.api_key)
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onboard failed')
      setLoading(false)
    }
  }

  const valid = tenantName.trim() && devName.trim() && devEmail.trim() && devPassword.length >= 8

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose() } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Onboard tenant</DialogTitle>
          <DialogDescription>
            Creates the tenant, issues its first API key, and provisions the initial developer account.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Business name
            </label>
            <Input
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="e.g. Kola Foods Ltd"
              disabled={loading}
            />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted pt-2">
            Developer account
          </p>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Full name
            </label>
            <Input
              value={devName}
              onChange={(e) => setDevName(e.target.value)}
              placeholder="e.g. Kola Adeyemi"
              disabled={loading}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Email
            </label>
            <Input
              value={devEmail}
              onChange={(e) => setDevEmail(e.target.value)}
              placeholder="dev@kolafoods.ng"
              type="email"
              disabled={loading}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Password
            </label>
            <Input
              value={devPassword}
              onChange={(e) => setDevPassword(e.target.value)}
              placeholder="Min 8 characters"
              type="password"
              disabled={loading}
            />
          </div>
          {error && <p className="text-[12px] text-destructive">{error}</p>}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose() }} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!valid || loading}>
            {loading ? 'Creating…' : 'Create & issue key'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// â"€â"€â"€ Main component â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

export function Tenants() {
  const showToast = useAppStore((s) => s.showToast)
  const { addTenant, toggleTenant, pushAudit } = useDataStore()

  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loadingTenants, setLoadingTenants] = useState(true)
  const [onboardOpen, setOnboardOpen] = useState(false)
  const [revealKey, setRevealKey] = useState<{ name: string; key: string } | null>(null)

  useEffect(() => {
    adminApi.listTenants()
      .then((res) => {
        setTenants(res.data.map((t) => ({
          id: t.id,
          key: '',
          name: t.name,
          contact: '—',
          customers: 0,
          accounts: 0,
          suspense: '₦0',
          webhook: '—',
          lastActivity: new Date(t.created_at).toLocaleDateString('en-GB'),
          status: 'active' as const,
        })))
      })
      .catch(() => {})
      .finally(() => setLoadingTenants(false))
  }, [])

  function handleOnboard(name: string, tenantId: string, key: string) {
    const newTenant: Tenant = {
      id: tenantId,
      key,
      name,
      contact: '—',
      customers: 0,
      accounts: 0,
      suspense: '₦0',
      webhook: '—',
      lastActivity: 'just now',
      status: 'active',
    }
    setTenants((prev) => [...prev, newTenant])
    addTenant(newTenant)
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
    setTenants((prev) => prev.map((x) => x.id === t.id ? { ...x, status: x.status === 'active' ? 'suspended' : 'active' } : x))
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
        ? `${t.name} suspended â€" keys disabled`
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
          <DataTable columns={columns} data={tenants} emptyMessage={loadingTenants ? 'Loading…' : 'No tenants yet.'} />
        </Card>
      </div>

      <OnboardModal
        open={onboardOpen}
        onClose={() => setOnboardOpen(false)}
        onCreated={(name, tenantId, key) => handleOnboard(name, tenantId, key)}
      />

      {revealKey && (
        <KeyRevealModal
          open={!!revealKey}
          onClose={() => setRevealKey(null)}
          title="Tenant onboarded"
          subtitle={`${revealKey.name} created â€" share this key securely with the integrator.`}
          apiKey={revealKey.key}
        />
      )}
    </SectionLayout>
  )
}


