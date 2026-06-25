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
import { KeyRevealModal } from '@/components/shared/KeyRevealModal'
import { useAppStore } from '@/store/app.store'
import { useDataStore, type ApiKey } from '@/store/data.store'
import { type ColumnDef } from '@tanstack/react-table'

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function genKey(prefix: string) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let s = ''
  for (let i = 0; i < 32; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return `sk_live_${prefix.toLowerCase().replace(/\s+/g, '_')}â€¦${s.slice(-4)}_${s}`
}

// â”€â”€â”€ Create key modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CreateModal({
  open, onClose, onCreated,
}: { open: boolean; onClose: () => void; onCreated: (key: string, label: string) => void }) {
  const [label, setLabel] = useState('')
  const [scope, setScope] = useState<ApiKey['scope']>('developer')
  const { tenant } = useAppStore()
  const { addApiKey, pushAudit } = useDataStore()
  const scopes: { value: ApiKey['scope']; label: string; desc: string }[] = [
    { value: 'developer', label: 'Developer', desc: 'Account & transaction read/write' },
    { value: 'ops', label: 'Ops', desc: 'Suspense queue and KYC writes' },
    { value: 'both', label: 'Full access', desc: 'All permissions â€” use with care' },
  ]

  function confirm() {
    const fullKey = genKey(label || tenant)
    const prefix = fullKey.split('_').slice(0, 3).join('_') + 'â€¦' + fullKey.slice(-3)
    const id = `k${Date.now()}`
    addApiKey({ id, tenant, prefix, scope, created: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), lastUsed: 'Never' })
    pushAudit({ actor: 'Adaeze Okonkwo', role: 'Tenant Dev', action: `Created API key (${scope})`, resource: prefix, time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' WAT' })
    setLabel('')
    onCreated(fullKey, label || tenant)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create API key</DialogTitle>
          <DialogDescription>Keys are shown once â€” store them immediately in a secrets manager.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">Label (optional)</label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Production webhook" />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">Scope</label>
            <div className="space-y-2">
              {scopes.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setScope(s.value)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                    scope === s.value ? 'border-accent bg-accent/10' : 'border-border bg-surface-2 hover:border-border-subtle'
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{s.label}</p>
                    <p className="text-xs text-text-muted">{s.desc}</p>
                  </div>
                  {scope === s.value && <div className="h-2 w-2 rounded-full bg-accent" />}
                </button>
              ))}
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={confirm}>Create key</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// â”€â”€â”€ Revoke modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function RevokeModal({ apiKey, onClose }: { apiKey: ApiKey | null; onClose: () => void }) {
  const { removeApiKey, pushAudit } = useDataStore()
  const showToast = useAppStore((s) => s.showToast)

  function confirm() {
    if (!apiKey) return
    removeApiKey(apiKey.id)
    pushAudit({ actor: 'Adaeze Okonkwo', role: 'Tenant Dev', action: 'Revoked API key', resource: apiKey.prefix, time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' WAT' })
    showToast(`Key ${apiKey.prefix} revoked`)
    onClose()
  }

  return (
    <Dialog open={!!apiKey} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revoke API key</DialogTitle>
          <DialogDescription>Any service using this key will immediately lose access. This cannot be undone.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="rounded-xl border px-4 py-3 font-mono text-sm text-red-text" style={{ background: '#1C0A0A', borderColor: '#5C1A1A' }}>
            {apiKey?.prefix}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-red-text hover:bg-red-text/90 text-white" onClick={confirm}>Revoke key</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// â”€â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function ApiKeys() {
  const { tenant } = useAppStore()
  const apiKeys = useDataStore((s) => s.apiKeys)
  const [createOpen, setCreateOpen] = useState(false)
  const [revokingKey, setRevokingKey] = useState<ApiKey | null>(null)
  const [revealKey, setRevealKey] = useState<{ key: string; label: string } | null>(null)

  const tenantKeys = apiKeys.filter((k) => k.tenant === tenant)

  const columns: ColumnDef<ApiKey, unknown>[] = [
    {
      accessorKey: 'prefix',
      header: 'Key',
      cell: ({ getValue }) => (
        <span className="font-mono text-[12.5px] text-text-primary">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'scope',
      header: 'Scope',
      cell: ({ getValue }) => {
        const s = getValue() as ApiKey['scope']
        const v = s === 'developer' ? 'dev' : s
        return <Badge variant={v}>{s}</Badge>
      },
    },
    {
      accessorKey: 'created',
      header: 'Created',
      cell: ({ getValue }) => (
        <span className="text-[12.5px] text-text-secondary">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'lastUsed',
      header: 'Last used',
      cell: ({ getValue }) => (
        <span className="text-[12px] text-text-muted">{getValue() as string}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button size="sm" variant="destructive" onClick={() => setRevokingKey(row.original)}>
          Revoke
        </Button>
      ),
    },
  ]

  return (
    <SectionLayout noPadding>
      <PageHeader
        title="API Keys"
        subtitle="Create and revoke API keys scoped to developer or ops access"
        actions={<Button size="sm" onClick={() => setCreateOpen(true)}>Create key</Button>}
      />
      <div className="p-6 sm:p-8">
        <Card className="overflow-hidden">
          <DataTable columns={columns} data={tenantKeys} emptyMessage="No API keys â€” create one above." />
        </Card>
      </div>
      <CreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(k, label) => setRevealKey({ key: k, label })}
      />
      <RevokeModal apiKey={revokingKey} onClose={() => setRevokingKey(null)} />
      {revealKey && (
        <KeyRevealModal
          open={!!revealKey}
          onClose={() => setRevealKey(null)}
          title="Your new API key"
          subtitle={`Label: ${revealKey.label} â€” copy this now, it will not be shown again.`}
          apiKey={revealKey.key}
        />
      )}
    </SectionLayout>
  )
}


