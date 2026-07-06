import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useUi } from "@/state/uiStore";
import { withdrawalsQuery } from "@/data/queries";
import { formatDateTime, formatNaira } from "@/lib/format";
import { DataTable } from "@/components/ui/data-table";
import { StatusPill } from "@/components/tx/StatusPill";
import type { Withdrawal } from "@/domain/types";

const columns: ColumnDef<Withdrawal>[] = [
  {
    accessorKey: "destination_account_name",
    header: "Destination",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.destination_account_name}</div>
        <div className="text-[11px] text-muted-foreground">
          {row.original.destination_account_number} · {row.original.destination_bank_code}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "amount_kobo",
    header: () => <span className="block text-right">Amount</span>,
    cell: ({ row }) => (
      <div className="tabular text-right text-debit">{formatNaira(row.original.amount_kobo)}</div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusPill status={row.original.status} />,
  },
  {
    accessorKey: "created_at",
    header: "Initiated",
    cell: ({ row }) => (
      <span className="tabular text-[12px] text-muted-foreground">
        {formatDateTime(row.original.created_at)}
      </span>
    ),
  },
];

// Read-only withdrawal history for a customer. Tenant staff can no longer
// initiate a withdrawal from this dashboard (that now requires the
// customer's own PIN, via the tenant's own customer-facing app) — this view
// exists purely for support/visibility into what has already happened.
export function WithdrawalsDrawer() {
  const customerId = useUi((s) => s.withdrawalsCustomerId);
  const close = useUi((s) => s.closeWithdrawals);
  const { data, isLoading } = useQuery({
    ...withdrawalsQuery(customerId ?? ""),
    enabled: !!customerId,
  });

  return (
    <Sheet open={!!customerId} onOpenChange={(o) => !o && close()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="text-base">Withdrawal history</SheetTitle>
        </SheetHeader>

        {isLoading && <div className="mt-6 h-64 animate-pulse border bg-surface-muted" />}

        {data && (
          <div className="mt-4">
            <DataTable
              columns={columns}
              data={data.data ?? []}
              searchPlaceholder="Search withdrawals…"
              pageSize={10}
              emptyState={
                <div className="border bg-surface px-4 py-10 text-center text-[12px] text-muted-foreground">
                  No withdrawals yet.
                </div>
              }
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
