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
import { customerApi, withdrawalApi, type ApiWithdrawal, type ApiCustomer } from '@/lib/api'
import { type ColumnDef } from '@tanstack/react-table'
import { useAppStore } from '@/store/app.store'

const STATUS_COLORS: Record<string, string> = {
  completed: 'text-green-400',
  failed: 'text-red-400',
  processing: 'text-yellow-400',
  pending: 'text-[#9BA6B8]',
}

// ─── New Withdrawal Modal ─────────────────────────────────────────────────────

function NewWithdrawalModal({
  customers,
  onClose,
  onCreated,
}: {
  customers: ApiCustomer[]
  onClose: () => void
  onCreated: () => void
}) {
  const [customerId, setCustomerId] = useState('')
  const [amountNaira, setAmountNaira] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [narration, setNarration] = useState('')
  const [resolving, setResolving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useAppStore()

  async function handleResolve() {
    if (!bankCode || !accountNumber) return
    setResolving(true)
    setError(null)
    try {
      const res = await withdrawalApi.resolvePayee(bankCode, accountNumber)
      setAccountName(res.account_name)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Account lookup failed')
    } finally {
      setResolving(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customerId || !amountNaira || !bankCode || !accountNumber || !accountName) return
    setLoading(true)
    setError(null)
    try {
      await withdrawalApi.initiate(customerId, {
        amount_kobo: Math.round(parseFloat(amountNaira) * 100),
        destination_bank_code: bankCode,
        destination_account_number: accountNumber,
        destination_account_name: accountName,
        narration,
      })
      showToast('Withdrawal initiated successfully')
      onCreated()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Withdrawal failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Withdrawal</DialogTitle>
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
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#9BA6B8]">Amount (₦)</label>
              <Input
                type="number"
                min="1"
                step="0.01"
                placeholder="e.g. 5000.00"
                value={amountNaira}
                onChange={e => setAmountNaira(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#9BA6B8]">Bank Code</label>
                <Input
                  placeholder="e.g. 000013"
                  value={bankCode}
                  onChange={e => setBankCode(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#9BA6B8]">Account Number</label>
                <Input
                  placeholder="10 digits"
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  required
                />
              </div>
            </div>
            {accountName ? (
              <div className="rounded-md bg-[#0E1525] px-3 py-2 text-[13px] text-green-400">
                ✓ {accountName}
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResolve}
                disabled={!bankCode || !accountNumber || resolving}
              >
                {resolving ? 'Looking up…' : 'Verify account name'}
              </Button>
            )}
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#9BA6B8]">Narration</label>
              <Input
                placeholder="Optional description"
                value={narration}
                onChange={e => setNarration(e.target.value)}
              />
            </div>
            {error && <p className="text-[12px] text-red-400">{error}</p>}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading || !accountName}>
              {loading ? 'Sending…' : 'Send transfer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main section ─────────────────────────────────────────────────────────────

const columns: ColumnDef<ApiWithdrawal>[] = [
  {
    accessorKey: 'created_at',
    header: 'Date',
    cell: ({ row }) => {
      const d = new Date(row.original.created_at)
      return <span className="font-mono text-[12px] text-[#9BA6B8]">{d.toLocaleString()}</span>
    },
  },
  {
    accessorKey: 'destination_account_name',
    header: 'Recipient',
    cell: ({ row }) => (
      <div>
        <p className="text-[13px] font-medium text-white">{row.original.destination_account_name}</p>
        <p className="font-mono text-[11px] text-[#9BA6B8]">{row.original.destination_account_number}</p>
      </div>
    ),
  },
  {
    accessorKey: 'amount_kobo',
    header: 'Amount',
    cell: ({ row }) => (
      <span className="font-mono text-[13px] text-white">
        ₦{(row.original.amount_kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
      </span>
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
    accessorKey: 'narration',
    header: 'Narration',
    cell: ({ row }) => (
      <span className="text-[12px] text-[#9BA6B8]">{row.original.narration || '—'}</span>
    ),
  },
]

export function Withdrawals() {
  const [customers, setCustomers] = useState<ApiCustomer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [withdrawals, setWithdrawals] = useState<ApiWithdrawal[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    customerApi.list().then(r => setCustomers(r.data))
  }, [])

  async function loadWithdrawals(id: string) {
    if (!id) { setWithdrawals([]); return }
    setLoading(true)
    try {
      const res = await withdrawalApi.list(id)
      setWithdrawals(res.data)
    } finally {
      setLoading(false)
    }
  }

  function handleCustomerChange(id: string) {
    setSelectedCustomer(id)
    loadWithdrawals(id)
  }

  return (
    <SectionLayout>
      <PageHeader
        title="Withdrawals"
        description="Send outbound transfers from customer wallets via Nomba"
        action={
          <Button onClick={() => setShowModal(true)} size="sm">
            New withdrawal
          </Button>
        }
      />

      <div className="mb-4">
        <select
          className="rounded-md border border-[#1E2D42] bg-[#0E1525] px-3 py-2 text-[13px] text-white"
          value={selectedCustomer}
          onChange={e => handleCustomerChange(e.target.value)}
        >
          <option value="">Select customer to view history…</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.display_name} ({c.external_ref})</option>
          ))}
        </select>
      </div>

      <Card>
        <CardBody className="p-0">
          <DataTable
            columns={columns}
            data={withdrawals}
            loading={loading}
            emptyMessage={selectedCustomer ? 'No withdrawals yet for this customer.' : 'Select a customer to view withdrawal history.'}
          />
        </CardBody>
      </Card>

      {showModal && (
        <NewWithdrawalModal
          customers={customers}
          onClose={() => setShowModal(false)}
          onCreated={() => selectedCustomer && loadWithdrawals(selectedCustomer)}
        />
      )}
    </SectionLayout>
  )
}
