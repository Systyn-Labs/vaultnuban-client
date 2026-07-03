import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useUi } from "@/state/uiStore";
import { statementQuery } from "@/data/queries";
import { formatDateTime, formatNaira } from "@/lib/format";
import { DataTable } from "@/components/ui/data-table";
import type { StatementEntry } from "@/domain/types";

const columns: ColumnDef<StatementEntry>[] = [
  {
    accessorKey: "description",
    header: "Entry",
    enableSorting: false, // order carries the running balance; never reorder
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.description}</div>
        <div className="text-[11px] text-muted-foreground">
          {formatDateTime(row.original.occurred_at)}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "debit_kobo",
    header: () => <span className="block text-right">Debit</span>,
    enableSorting: false,
    cell: ({ row }) => (
      <div className="tabular text-right text-debit">
        {row.original.debit_kobo ? formatNaira(row.original.debit_kobo) : ""}
      </div>
    ),
  },
  {
    accessorKey: "credit_kobo",
    header: () => <span className="block text-right">Credit</span>,
    enableSorting: false,
    cell: ({ row }) => (
      <div className="tabular text-right text-credit">
        {row.original.credit_kobo ? formatNaira(row.original.credit_kobo) : ""}
      </div>
    ),
  },
  {
    accessorKey: "running_balance_kobo",
    header: () => <span className="block text-right">Balance</span>,
    enableSorting: false,
    cell: ({ row }) => (
      <div className="tabular text-right">{formatNaira(row.original.running_balance_kobo)}</div>
    ),
  },
];

// Customer statement drawer — the API's double-entry ledger rendered as an
// accounting register with running balances. Sorting is intentionally
// disabled: the running balance column is only meaningful in chronological
// order, so this table offers search and pagination but never reordering.
export function LedgerViewDrawer() {
  const customerId = useUi((s) => s.statementCustomerId);
  const close = useUi((s) => s.closeStatement);
  // Freeze `to` for the lifetime of this open drawer — statementQuery's
  // default is "now", and recomputing it on every render would change the
  // query key each time and refetch in a loop.
  const to = useMemo(() => new Date().toISOString(), [customerId]);
  const { data: statement, isLoading } = useQuery(statementQuery(customerId ?? "", { to }));

  return (
    <Sheet open={!!customerId} onOpenChange={(o) => !o && close()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="text-base">Statement</SheetTitle>
        </SheetHeader>

        {isLoading && <div className="mt-6 h-64 animate-pulse border bg-surface-muted" />}

        {statement && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-px border bg-border">
              <div className="bg-surface px-4 py-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Opening balance
                </div>
                <div className="tabular mt-1 text-lg font-medium">
                  {formatNaira(statement.opening_balance_kobo)}
                </div>
              </div>
              <div className="bg-surface px-4 py-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Closing balance
                </div>
                <div className="tabular mt-1 text-lg font-medium">
                  {formatNaira(statement.closing_balance_kobo)}
                </div>
              </div>
            </div>

            <DataTable
              columns={columns}
              data={statement.entries ?? []}
              searchPlaceholder="Search entries…"
              pageSize={10}
              emptyState={
                <div className="border bg-surface px-4 py-10 text-center text-[12px] text-muted-foreground">
                  No entries in this period.
                </div>
              }
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
