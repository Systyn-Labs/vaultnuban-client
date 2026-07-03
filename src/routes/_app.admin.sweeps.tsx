import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { sweepRunsQuery, rows, type SweepRun } from "@/data/queries";
import { formatDateTime } from "@/lib/format";
import { DataTable, SortableHeader } from "@/components/ui/data-table";

export const Route = createFileRoute("/_app/admin/sweeps")({
  head: () => ({ meta: [{ title: "Sweep Runs · VaultNUBAN" }] }),
  component: () => (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
      <Suspense fallback={<div className="h-96 animate-pulse border bg-surface" />}>
        <SweepsPage />
      </Suspense>
    </div>
  ),
});

const columns: ColumnDef<SweepRun>[] = [
  {
    accessorKey: "window_from",
    header: ({ column }) => <SortableHeader column={column}>Window</SortableHeader>,
    cell: ({ row }) => (
      <span className="tabular text-[12px]">
        {formatDateTime(row.original.window_from)} → {formatDateTime(row.original.window_to)}
      </span>
    ),
  },
  {
    accessorKey: "pages_fetched",
    header: ({ column }) => (
      <SortableHeader column={column} align="right">
        Pages
      </SortableHeader>
    ),
    cell: ({ row }) => <div className="tabular text-right">{row.original.pages_fetched}</div>,
  },
  {
    accessorKey: "found",
    header: ({ column }) => (
      <SortableHeader column={column} align="right">
        Found
      </SortableHeader>
    ),
    cell: ({ row }) => <div className="tabular text-right">{row.original.found}</div>,
  },
  {
    accessorKey: "posted",
    header: ({ column }) => (
      <SortableHeader column={column} align="right">
        Posted
      </SortableHeader>
    ),
    cell: ({ row }) => <div className="tabular text-right">{row.original.posted}</div>,
  },
  {
    accessorKey: "suspensed",
    header: ({ column }) => (
      <SortableHeader column={column} align="right">
        Suspensed
      </SortableHeader>
    ),
    cell: ({ row }) => <div className="tabular text-right">{row.original.suspensed}</div>,
  },
  {
    id: "result",
    accessorFn: (s) => s.error ?? "completed",
    header: ({ column }) => <SortableHeader column={column}>Result</SortableHeader>,
    cell: ({ row }) =>
      row.original.error ? (
        <span className="text-[12px] text-status-failed">{row.original.error}</span>
      ) : (
        <span className="text-[12px] text-muted-foreground">
          Completed{row.original.duration_ms != null ? ` in ${row.original.duration_ms}ms` : ""}
        </span>
      ),
  },
];

function SweepsPage() {
  const { data: payload } = useSuspenseQuery(sweepRunsQuery);
  const sweeps = rows(payload);

  return (
    <>
      <header className="mb-6">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Reconciliation
        </div>
        <h1 className="mt-1 text-xl font-medium tracking-tight">Sweep runs</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">
          The sweep re-reads provider transactions on a schedule and posts anything the webhooks
          missed. Every run is recorded.
        </p>
      </header>

      <DataTable
        columns={columns}
        data={sweeps}
        searchPlaceholder="Search windows, errors…"
        initialSorting={[{ id: "window_from", desc: true }]}
        emptyState={
          <div className="border bg-surface px-4 py-12 text-center text-[12px] text-muted-foreground">
            No sweep runs recorded yet — trigger one from the Health screen.
          </div>
        }
      />
    </>
  );
}
