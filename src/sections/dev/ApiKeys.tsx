import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionLayout } from '@/components/layout/SectionLayout'
import { Button } from '@/components/ui/button'
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
import { KeyRevealModal } from '@/components/shared/KeyRevealModal'
import { useAppStore } from '@/store/app.store'
import { apiKeyApi, type ApiKeyEntry } from '@/lib/api'
import { type ColumnDef } from '@tanstack/react-table'

// ─── Revoke modal ─────────────────────────────────────────────────────────────

function RevokeModal({
  apiKey,
  onClose,
  onRevoked,
}: {
  apiKey: ApiKeyEntry | null
  onClose: () => void
  onRevoked: (id: string) => void
}) {
  const showToast = useAppStore((s) => s.showToast)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    if (!apiKey) return
    setLoading(true)
    try {
      await apiKeyApi.revoke(apiKey.id)
      showToast(`Key ${apiKey.prefix} revoked`)
      onRevoked(apiKey.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revoke failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={!!apiKey} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revoke API key</DialogTitle>
          <DialogDescription>
            Any service using this key will immediately lose access. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div
            className="rounded-xl border px-4 py-3 font-mono text-sm text-red-text"
            style={{ background: '#1C0A0A', borderColor: '#5C1A1A' }}
          >
            {apiKey?.prefix}
          </div>
          {error && <p className="mt-2 text-[12px] text-destructive">{error}</p>}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            className="bg-red-text hover:bg-red-text/90 text-white"
            onClick={confirm}
            disabled={loading}
          >
            {loading ? 'Revoking…' : 'Revoke key'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ApiKeys() {
  const showToast = useAppStore((s) => s.showToast)
  const [keys, setKeys] = useState<ApiKeyEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [revokingKey, setRevokingKey] = useState<ApiKeyEntry | null>(null)
  const [revealKey, setRevealKey] = useState<{ key: string; prefix: string } | null>(null)

  useEffect(() => {
    apiKeyApi
      .list()
      .then((r) => setKeys(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate() {
    setCreating(true)
    try {
      const res = await apiKeyApi.create()
      setKeys((prev) => [{ id: res.id, prefix: res.prefix, created_at: res.created_at }, ...prev])
      setRevealKey({ key: res.api_key, prefix: res.prefix })
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create key')
    } finally {
      setCreating(false)
    }
  }

  const columns: ColumnDef<ApiKeyEntry, unknown>[] = [
    {
      accessorKey: 'prefix',
      header: 'Key',
      cell: ({ getValue }) => (
        <span className="font-mono text-[12.5px] text-text-primary">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ getValue }) => (
        <span className="text-[12.5px] text-text-secondary">
          {new Date(getValue() as string).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
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
        subtitle="Create and revoke API keys for programmatic access"
        actions={
          <Button size="sm" onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating…' : 'Create key'}
          </Button>
        }
      />
      <div className="p-6 sm:p-8">
        <Card className="overflow-hidden">
          <DataTable
            columns={columns}
            data={keys}
            emptyMessage={loading ? 'Loading…' : 'No API keys — create one above.'}
          />
        </Card>
      </div>

      <RevokeModal
        apiKey={revokingKey}
        onClose={() => setRevokingKey(null)}
        onRevoked={(id) => setKeys((prev) => prev.filter((k) => k.id !== id))}
      />

      {revealKey && (
        <KeyRevealModal
          open={!!revealKey}
          onClose={() => setRevealKey(null)}
          title="Your new API key"
          subtitle={`${revealKey.prefix} — copy this now, it will not be shown again.`}
          apiKey={revealKey.key}
        />
      )}
    </SectionLayout>
  )
}
