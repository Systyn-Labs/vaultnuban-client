import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionLayout } from '@/components/layout/SectionLayout'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { customerApi, collectionApi, type ApiCollection, type ApiCustomer } from '@/lib/api'
import { type ColumnDef } from '@tanstack/react-table'
import { useAppStore } from '@/store/app.store'

const STATUS_COLORS: Record<string, string> = {
  fulfilled: 'text-green-400',
  open: 'text-blue-400',
  expired: 'text-[#9BA6B8]',
  cancelled: 'text-red-400',
}

// ─── New Collection Modal ─────────────────────────────────────────────────────

function NewCollectionModal({
  customers,
  onClose,
  onCreated,
}: {
  customers: ApiCustomer[]
  onClose: () => void
  onCreated: () => void
}) {
  const [customerId, setCustomerId] = useState('')
  const [reference, setReference] = useState('')
  const [description, setDescription] = useState('')
  const [amountNaira, setAmountNaira] = useState('')
  const [expiresHours, setExpiresHours] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useAppStore()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customerId || !reference) return
    setLoading(true)
    setError(null)
    try {
      await collectionApi.create(customerId, {
        reference,
        description,
        expected_amount_kobo: amountNaira ? Math.round(parseFloat(amountNaira) * 100) : undefined,
        expires_in_seconds: expiresHours ? Math.round(parseFloat(expiresHours) * 3600) : undefined,
      })
      showToast('Collection created — share the VA NUBAN with the payer')
      onCreated()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create collection')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Collection</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#9BA6B8]">Customer</label>
              <select
                className="w-full rounded-md border border-[#1E2D42] bg-[#0E1525] px-3 py-2 text-[13px] text-white"
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
                required
              >
                <option value="">Select customer…</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.display_name} ({c.external_ref})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#9BA6B8]">Reference</label>
              <Input
                placeholder="e.g. INV-2024-001"
                value={reference}
                onChange={e => setReference(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#9BA6B8]">Description</label>
              <Input
                placeholder="Optional description shown to payer"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#9BA6B8]">Expected Amount ₦ <span className="normal-case font-normal">(optional)</span></label>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="Any amount if blank"
                  value={amountNaira}
                  onChange={e => setAmountNaira(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#9BA6B8]">Expires in hours <span className="normal-case font-normal">(optional)</span></label>
                <Input
                  type="number"
                  min="1"
                  placeholder="No expiry if blank"
                  value={expiresHours}
                  onChange={e => setExpiresHours(e.target.value)}
                />
              </div>
            </div>
            {error && <p className="text-[12px] text-red-400">{error}</p>}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Create collection'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main section ─────────────────────────────────────────────────────────────

const columns: ColumnDef<ApiCollection>[] = [
  {
    accessorKey: 'reference',
    header: 'Reference',
    cell: ({ row }) => (
      <span className="font-mono text-[13px] text-white">{row.original.reference}</span>
    ),
  },
  {
    accessorKey: 'nuban',
    header: 'Pay to NUBAN',
    cell: ({ row }) => (
      <div>
        <p className="font-mono text-[13px] text-white">{row.original.nuban || '—'}</p>
        <p className="text-[11px] text-[#9BA6B8]">{row.original.bank_name || ''}</p>
      </div>
    ),
  },
  {
    accessorKey: 'expected_amount_kobo',
    header: 'Expected Amount',
    cell: ({ row }) =>
      row.original.expected_amount_kobo ? (
        <span className="font-mono text-[13px] text-white">
          ₦{(row.original.expected_amount_kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
        </span>
      ) : (
        <span className="text-[12px] text-[#9BA6B8]">Any amount</span>
      ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <span className={`text-[12px] font-semibold ${STATUS_COLORS[row.original.status] ?? 'text-[#9BA6B8]'}`}>
        {row.original.status}
      </span>
    ),
  },
  {
    accessorKey: 'expires_at',
    header: 'Expires',
    cell: ({ row }) =>
      row.original.expires_at ? (
        <span className="text-[12px] text-[#9BA6B8]">
          {new Date(row.original.expires_at).toLocaleString()}
        </span>
      ) : (
        <span className="text-[12px] text-[#9BA6B8]">Never</span>
      ),
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ row }) => (
      <span className="font-mono text-[12px] text-[#9BA6B8]">
        {new Date(row.original.created_at).toLocaleString()}
      </span>
    ),
  },
]

export function Collections() {
  const [customers, setCustomers] = useState<ApiCustomer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [collections, setCollections] = useState<ApiCollection[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    customerApi.list().then(r => setCustomers(r.data))
  }, [])

  async function loadCollections(id: string) {
    if (!id) { setCollections([]); return }
    setLoading(true)
    try {
      const res = await collectionApi.list(id)
      setCollections(res.data)
    } finally {
      setLoading(false)
    }
  }

  function handleCustomerChange(id: string) {
    setSelectedCustomer(id)
    loadCollections(id)
  }

  return (
    <SectionLayout>
      <PageHeader
        title="Collections"
        description="Create one-time payment requests tied to a customer's virtual account"
        action={
          <Button onClick={() => setShowModal(true)} size="sm">
            New collection
          </Button>
        }
      />

      <div className="mb-4">
        <select
          className="rounded-md border border-[#1E2D42] bg-[#0E1525] px-3 py-2 text-[13px] text-white"
          value={selectedCustomer}
          onChange={e => handleCustomerChange(e.target.value)}
        >
          <option value="">Select customer to view collections…</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.display_name} ({c.external_ref})</option>
          ))}
        </select>
      </div>

      <Card>
        <CardBody className="p-0">
          <DataTable
            columns={columns}
            data={collections}
            loading={loading}
            emptyMessage={selectedCustomer ? 'No collections yet for this customer.' : 'Select a customer to view collections.'}
          />
        </CardBody>
      </Card>

      {showModal && (
        <NewCollectionModal
          customers={customers}
          onClose={() => setShowModal(false)}
          onCreated={() => selectedCustomer && loadCollections(selectedCustomer)}
        />
      )}
    </SectionLayout>
  )
}
