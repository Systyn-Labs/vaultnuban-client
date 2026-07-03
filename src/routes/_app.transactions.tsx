import { Suspense, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { transactionsQuery } from "@/data/queries";
import { formatDateTime, formatNaira } from "@/lib/format";
import { StatusPill } from "@/components/tx/StatusPill";
import { useUi } from "@/state/uiStore";
import { Button } from "@/components/ui/button";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Transaction } from "@/domain/types";

export const Route = createFileRoute("/_app/transactions")({
  head: () => ({ meta: [{ title: "Transactions · VaultNUBAN" }] }),
  component: () => (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
      <Suspense fallback={<div className="h-96 animate-pulse border bg-surface" />}>
        <TransactionsPage />
      </Suspense>
    </div>
  ),
});

const columns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => <SortableHeader column={column}>Transaction</SortableHeader>,
    cell: ({ row }) => (
      <span className="tabular block max-w-[220px] truncate text-[12px]">{row.original.id}</span>
    ),
  },
  {
    id: "counterparty",
    accessorFn: (t) => t.sender_name ?? t.narration ?? "",
    header: ({ column }) => <SortableHeader column={column}>Counterparty</SortableHeader>,
    cell: ({ getValue }) => (
      <span className="block max-w-[200px] truncate">{(getValue() as string) || "—"}</span>
    ),
  },
  {
    accessorKey: "occurred_at",
    header: ({ column }) => <SortableHeader column={column}>Occurred</SortableHeader>,
    cell: ({ row }) => (
      <span className="tabular text-[12px] text-muted-foreground">
        {formatDateTime(row.original.occurred_at)}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
    cell: ({ row }) => <StatusPill status={row.original.status} />,
  },
  {
    accessorKey: "amount_kobo",
    header: ({ column }) => (
      <SortableHeader column={column} align="right">
        Amount
      </SortableHeader>
    ),
    cell: ({ row }) => (
      <div
        className={`tabular text-right ${row.original.direction === "credit" ? "text-credit" : ""}`}
      >
        {row.original.direction === "credit" ? "+" : "−"}
        {formatNaira(row.original.amount_kobo)}
      </div>
    ),
  },
];

function TransactionsPage() {
  const { data: page } = useSuspenseQuery(transactionsQuery);
  const openDetail = useUi((s) => s.openDetail);
  const qc = useQueryClient();
  const [direction, setDirection] = useState("all");
  const [status, setStatus] = useState("all");

  const rows = useMemo(
    () =>
      (page.data ?? []).filter(
        (t) =>
          (direction === "all" || t.direction === direction) &&
          (status === "all" || t.status === status),
      ),
    [page, direction, status],
  );

  return (
    <>
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Money</div>
          <h1 className="mt-1 text-xl font-medium tracking-tight">Transactions</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-[11px] uppercase tracking-widest"
          onClick={() => qc.invalidateQueries({ queryKey: ["transactions"] })}
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </Button>
      </header>

      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="Search id, sender, narration, NUBAN…"
        initialSorting={[{ id: "occurred_at", desc: true }]}
        pageSize={25}
        onRowClick={(t) => openDetail(t.id)}
        toolbar={
          <>
            <Select value={direction} onValueChange={setDirection}>
              <SelectTrigger className="h-8 w-32 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All flows</SelectItem>
                <SelectItem value="credit">Credits</SelectItem>
                <SelectItem value="debit">Debits</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-8 w-36 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="posted">Posted</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reversed">Reversed</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        footer={(filtered) => {
          const totalIn = filtered
            .filter((t) => t.direction === "credit")
            .reduce((s, t) => s + t.amount_kobo, 0);
          const totalOut = filtered
            .filter((t) => t.direction === "debit")
            .reduce((s, t) => s + t.amount_kobo, 0);
          return (
            <tr className="border-t bg-surface-muted text-[12px]">
              <td className="px-4 py-2.5 font-medium" colSpan={3}>
                {filtered.length} transactions
              </td>
              <td className="tabular px-4 py-2.5 text-right text-credit">
                +{formatNaira(totalIn)}
              </td>
              <td className="tabular px-4 py-2.5 text-right">−{formatNaira(totalOut)}</td>
            </tr>
          );
        }}
      />
    </>
  );
}
