import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionLayout } from '@/components/layout/SectionLayout'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { customerApi, type ApiCustomer, type ApiCustomerBalance } from '@/lib/api'
import { type ColumnDef } from '@tanstack/react-table'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatKobo(kobo: number): string {
  return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface LedgerRow {
  customerId: string
  displayName: string
  externalRef: string
  kycTier: number
  balanceKobo: number | null
  status: string
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 px-5 py-4">
      <p className="text-[11px] font-medium uppercase tracking-widest text-text-muted">{label}</p>
      <p className="mt-1 font-mono text-[22px] font-semibold text-text-primary">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-text-muted">{sub}</p>}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function OpsLedger() {
  const [rows, setRows] = useState<LedgerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [balancesLoading, setBalancesLoading] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const { data: customers } = await customerApi.list()

        // Seed the table immediately with null balances so users see names while loading
        const initial: LedgerRow[] = customers.map((c) => ({
          customerId: c.id,
          displayName: c.display_name,
          externalRef: c.external_ref,
          kycTier: c.identity?.kyc_tier ?? 0,
          balanceKobo: null,
          status: c.status,
        }))
        setRows(initial)
        setLoading(false)

        // Then fetch all balances in parallel
        setBalancesLoading(true)
        const results = await Promise.allSettled(
          customers.map((c) => customerApi.balance(c.id))
        )
        setRows((prev) =>
          prev.map((row, i) => {
            const r = results[i]
            return r.status === 'fulfilled'
              ? { ...row, balanceKobo: r.value.balance_kobo }
              : row
          })
        )
      } catch {
        setLoading(false)
      } finally {
        setBalancesLoading(false)
      }
    }
    load()
  }, [])

  const totalKobo = rows.reduce((sum, r) => sum + (r.balanceKobo ?? 0), 0)
  const loaded = rows.filter((r) => r.balanceKobo !== null).length
  const nonZero = rows.filter((r) => (r.balanceKobo ?? 0) > 0).length

  const columns: ColumnDef<LedgerRow, unknown>[] = [
    {
      accessorKey: 'displayName',
      header: 'Customer',
      cell: ({ row }) => (
        <div>
          <p className="text-[13px] font-medium text-text-primary">{row.original.displayName}</p>
          <p className="font-mono text-[11px] text-text-muted">{row.original.externalRef}</p>
        </div>
      ),
    },
    {
      accessorKey: 'kycTier',
      header: 'KYC',
      cell: ({ getValue }) => (
        <span className="font-mono text-[12px] text-text-secondary">Tier {getValue() as number}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const s = getValue() as string
        return (
          <span
            className={`text-[11px] font-medium uppercase tracking-wide ${
              s === 'active' ? 'text-green-text' : 'text-text-muted'
            }`}
          >
            {s}
          </span>
        )
      },
    },
    {
      accessorKey: 'balanceKobo',
      header: 'Balance',
      cell: ({ getValue }) => {
        const v = getValue() as number | null
        if (v === null) {
          return <span className="text-[12px] text-text-muted">—</span>
        }
        return (
          <span
            className={`font-mono text-[13px] font-semibold ${
              v > 0 ? 'text-text-primary' : 'text-text-muted'
            }`}
          >
            {formatKobo(v)}
          </span>
        )
      },
    },
  ]

  const statusLine = balancesLoading
    ? `Loading balances… (${loaded}/${rows.length})`
    : loading
    ? 'Loading customers…'
    : `${rows.length} customers · ${nonZero} with funds`

  return (
    <SectionLayout noPadding>
      <PageHeader
        title="Ledger"
        subtitle="Customer wallet balances drawn from the double-entry ledger"
      />

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 px-4 pt-4 pb-2 sm:grid-cols-3 sm:px-6">
        <SummaryCard
          label="Total funds held"
          value={formatKobo(totalKobo)}
          sub={balancesLoading ? 'computing…' : 'sum of all customer wallets'}
        />
        <SummaryCard
          label="Customers"
          value={String(rows.length)}
          sub={`${nonZero} with positive balance`}
        />
        <SummaryCard
          label="Ledger model"
          value="Double-entry"
          sub="DR customer / CR suspense on receipt"
        />
      </div>

      {/* Per-customer table */}
      <div className="px-4 pb-6 pt-2 sm:px-6 sm:pb-8">
        <Card className="overflow-hidden">
          <DataTable
            columns={columns}
            data={rows}
            emptyMessage={statusLine}
          />
        </Card>
        {(loading || balancesLoading) && (
          <p className="mt-2 text-[11px] text-text-muted">{statusLine}</p>
        )}
      </div>
    </SectionLayout>
  )
}
