import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionLayout } from '@/components/layout/SectionLayout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
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
import { relayApi, type ApiWebhookEndpoint, type ApiDelivery } from '@/lib/api'
import { type ColumnDef } from '@tanstack/react-table'

// ─── Register endpoint modal ──────────────────────────────────────────────────

function RegisterModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (ep: ApiWebhookEndpoint) => void
}) {
  const showToast = useAppStore((s) => s.showToast)
  const [url, setUrl] = useState('')
  const [secret, setSecret] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setUrl('')
    setSecret('')
    setError(null)
  }

  async function submit() {
    setError(null)
    if (!url) { setError('URL is required'); return }
    if (!secret || secret.length < 16) { setError('Secret must be at least 16 characters'); return }
    setLoading(true)
    try {
      const ep = await relayApi.createEndpoint(url, secret)
      showToast(`Endpoint registered — ${ep.id}`)
      onCreated(ep)
      reset()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose() } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register webhook endpoint</DialogTitle>
          <DialogDescription>
            VaultNUBAN will POST signed events to this URL after every successful transfer.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-text-muted">
              Endpoint URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yourapp.com/webhooks/vaultnuban"
              className="w-full rounded-md border bg-[#1C2638] border-[#1E2D42] px-3 py-2 text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/60"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-text-muted">
              Signing secret
            </label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Min 16 characters"
              className="w-full rounded-md border bg-[#1C2638] border-[#1E2D42] px-3 py-2 text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/60"
            />
            <p className="mt-1 text-[11px] text-text-muted">
              Used to compute <code className="font-mono">X-VaultNUBAN-Signature</code> on every delivery.
            </p>
          </div>
          {error && <p className="text-[12px] text-destructive">{error}</p>}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose() }} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={loading}>
            {loading ? 'Registering…' : 'Register endpoint'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Columns ──────────────────────────────────────────────────────────────────

const endpointColumns: ColumnDef<ApiWebhookEndpoint, unknown>[] = [
  {
    accessorKey: 'url',
    header: 'URL',
    cell: ({ getValue }) => (
      <span className="font-mono text-[12px] text-text-primary break-all">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: 'active',
    header: 'Status',
    cell: ({ getValue }) => (
      <Badge variant={(getValue() as boolean) ? 'active' : 'suspended'}>
        {(getValue() as boolean) ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
  {
    accessorKey: 'created_at',
    header: 'Registered',
    cell: ({ getValue }) => (
      <span className="text-[12px] text-text-muted">
        {new Date(getValue() as string).toLocaleDateString('en-GB', {
          day: 'numeric', month: 'short', year: 'numeric',
        })}
      </span>
    ),
  },
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ getValue }) => (
      <span className="font-mono text-[11px] text-text-muted">{getValue() as string}</span>
    ),
  },
]

function deliveryColumns(onReplay: (id: string) => void): ColumnDef<ApiDelivery, unknown>[] {
  return [
    {
      accessorKey: 'created_at',
      header: 'Time',
      cell: ({ getValue }) => (
        <span className="font-mono text-[12px] text-text-secondary">
          {new Date(getValue() as string).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' })}
        </span>
      ),
    },
    {
      accessorKey: 'event_type',
      header: 'Event',
      cell: ({ getValue }) => (
        <span className="font-mono text-[12px] text-text-primary">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'attempt',
      header: 'Attempt',
      cell: ({ getValue }) => <span className="font-mono">{getValue() as number}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const s = getValue() as string
        const variant =
          s === 'delivered' ? 'active'
          : s === 'dead_letter' ? 'destructive'
          : 'suspended'
        return <Badge variant={variant as 'active' | 'suspended' | 'destructive'}>{s}</Badge>
      },
    },
    {
      accessorKey: 'status_code',
      header: 'HTTP',
      cell: ({ getValue }) => {
        const code = getValue() as number | undefined
        return <span className="font-mono text-text-muted">{code ?? '—'}</span>
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const d = row.original
        if (d.status === 'delivered') return null
        return (
          <Button size="sm" variant="outline" onClick={() => onReplay(d.id)}>
            Replay
          </Button>
        )
      },
    },
  ]
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function Webhooks() {
  const showToast = useAppStore((s) => s.showToast)
  const [endpoints, setEndpoints] = useState<ApiWebhookEndpoint[]>([])
  const [deliveries, setDeliveries] = useState<ApiDelivery[]>([])
  const [loadingEp, setLoadingEp] = useState(true)
  const [loadingDel, setLoadingDel] = useState(true)
  const [registering, setRegistering] = useState(false)

  useEffect(() => {
    relayApi.listEndpoints()
      .then((r) => setEndpoints(r.data))
      .catch(() => {})
      .finally(() => setLoadingEp(false))

    relayApi.listDeliveries()
      .then((r) => setDeliveries(r.data))
      .catch(() => {})
      .finally(() => setLoadingDel(false))
  }, [])

  async function handleReplay(deliveryId: string) {
    try {
      await relayApi.replay(deliveryId)
      showToast('Replay dispatched — check the delivery log shortly')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Replay failed')
    }
  }

  return (
    <SectionLayout noPadding>
      <PageHeader
        title="Webhooks"
        subtitle="Register relay endpoints and monitor delivery attempts"
        actions={
          <Button size="sm" onClick={() => setRegistering(true)}>
            Register endpoint
          </Button>
        }
      />

      <div className="space-y-6 p-6 sm:p-8">
        {/* Endpoints */}
        <Card className="overflow-hidden">
          <div
            className="border-b px-6 py-5 text-[14px] font-semibold text-text-primary"
            style={{ borderColor: '#1E2D42' }}
          >
            Registered endpoints
          </div>
          <DataTable
            columns={endpointColumns}
            data={endpoints}
            emptyMessage={loadingEp ? 'Loading…' : 'No endpoints registered yet.'}
          />
        </Card>

        {/* Delivery log */}
        <Card className="overflow-hidden">
          <div
            className="border-b px-6 py-5 flex items-center justify-between"
            style={{ borderColor: '#1E2D42' }}
          >
            <div>
              <p className="text-[14px] font-semibold text-text-primary">Delivery log</p>
              <p className="mt-0.5 text-[12px] text-text-muted">
                Most recent 50 delivery attempts across all endpoints
              </p>
            </div>
          </div>
          <DataTable
            columns={deliveryColumns(handleReplay)}
            data={deliveries}
            emptyMessage={loadingDel ? 'Loading…' : 'No deliveries yet — register an endpoint and trigger a transfer.'}
          />
        </Card>
      </div>

      <RegisterModal
        open={registering}
        onClose={() => setRegistering(false)}
        onCreated={(ep) => setEndpoints((prev) => [ep, ...prev])}
      />
    </SectionLayout>
  )
}
