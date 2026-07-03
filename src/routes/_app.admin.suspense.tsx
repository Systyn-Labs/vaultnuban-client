import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import { toast } from "sonner";
import { internalSuspenseQuery, rows } from "@/data/queries";
import { adminHttp } from "@/data/client";
import { formatDateTime, formatNaira } from "@/lib/format";
import { StatusPill } from "@/components/tx/StatusPill";
import { Button } from "@/components/ui/button";

interface InternalSuspenseItem {
  id: string;
  tenant_name?: string;
  transaction_id: string;
  reason: string;
  status: string;
  amount_kobo: number;
  created_at: string;
  [k: string]: unknown;
}

export const Route = createFileRoute("/_app/admin/suspense")({
  head: () => ({ meta: [{ title: "Cross-tenant Suspense · VaultNUBAN" }] }),
  component: () => (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
      <Suspense fallback={<div className="h-96 animate-pulse border bg-surface" />}>
        <AdminSuspensePage />
      </Suspense>
    </div>
  ),
});

function AdminSuspensePage() {
  const { data: payload } = useSuspenseQuery(internalSuspenseQuery);
  const qc = useQueryClient();
  const items = rows<InternalSuspenseItem>(payload as never);

  const reprocess = useMutation({
    mutationFn: () => adminHttp().post<unknown>("/internal/reprocess-suspense"),
    onSuccess: () => {
      toast.success("Reprocess triggered", {
        description: "Unmatched items are re-run through the matcher.",
      });
      qc.invalidateQueries({ queryKey: ["internal", "suspense"] });
    },
    onError: (e) =>
      toast.error("Reprocess failed", { description: e instanceof Error ? e.message : undefined }),
  });

  return (
    <>
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Reconciliation
          </div>
          <h1 className="mt-1 text-xl font-medium tracking-tight">Cross-tenant suspense</h1>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          disabled={reprocess.isPending}
          onClick={() => reprocess.mutate()}
        >
          {reprocess.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Reprocess unmatched
        </Button>
      </header>

      <DataTable
        columns={columns}
        data={items}
        searchPlaceholder="Search transaction, reason…"
        initialSorting={[{ id: "created_at", desc: true }]}
        emptyState={
          <div className="border bg-surface px-4 py-12 text-center text-[12px] text-muted-foreground">
            Suspense is clear across all tenants.
          </div>
        }
      />
    </>
  );
}

const columns: ColumnDef<InternalSuspenseItem>[] = [
  {
    accessorKey: "transaction_id",
    header: ({ column }) => <SortableHeader column={column}>Transaction</SortableHeader>,
    cell: ({ row }) => (
      <span className="tabular block max-w-[220px] truncate text-[12px]">
        {row.original.transaction_id}
      </span>
    ),
  },
  {
    accessorKey: "reason",
    header: ({ column }) => <SortableHeader column={column}>Reason</SortableHeader>,
    cell: ({ row }) => (
      <span className="capitalize">{row.original.reason?.replace(/_/g, " ")}</span>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
    cell: ({ row }) => <StatusPill status={row.original.status} />,
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => <SortableHeader column={column}>Received</SortableHeader>,
    cell: ({ row }) => (
      <span className="tabular text-[12px] text-muted-foreground">
        {row.original.created_at ? formatDateTime(row.original.created_at) : "—"}
      </span>
    ),
  },
  {
    accessorKey: "amount_kobo",
    header: ({ column }) => (
      <SortableHeader column={column} align="right">
        Amount
      </SortableHeader>
    ),
    cell: ({ row }) => (
      <div className="tabular text-right">{formatNaira(row.original.amount_kobo ?? 0)}</div>
    ),
  },
];
