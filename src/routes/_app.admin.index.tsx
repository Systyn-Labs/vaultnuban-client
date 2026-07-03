import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { platformHealthQuery, sweepRunsQuery, rows, type SweepRun } from "@/data/queries";
import { adminHttp } from "@/data/client";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { DataTable, SortableHeader } from "@/components/ui/data-table";

const sweepColumns: ColumnDef<SweepRun>[] = [
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
    accessorKey: "duration_ms",
    header: ({ column }) => (
      <SortableHeader column={column} align="right">
        Duration
      </SortableHeader>
    ),
    cell: ({ row }) => (
      <div className="tabular text-right text-[12px] text-muted-foreground">
        {row.original.duration_ms != null ? `${row.original.duration_ms}ms` : "—"}
      </div>
    ),
  },
];

export const Route = createFileRoute("/_app/admin/")({
  head: () => ({ meta: [{ title: "Platform Health · VaultNUBAN" }] }),
  component: () => (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
      <Suspense fallback={<div className="h-96 animate-pulse border bg-surface" />}>
        <HealthPage />
      </Suspense>
    </div>
  ),
});

function HealthPage() {
  const { data: health } = useSuspenseQuery(platformHealthQuery);
  const { data: sweepPayload } = useSuspenseQuery(sweepRunsQuery);
  const qc = useQueryClient();
  const sweeps = rows(sweepPayload);

  const triggerSweep = useMutation({
    mutationFn: () => adminHttp().post<unknown>("/internal/sweep/trigger"),
    onSuccess: () => {
      toast.success("Sweep completed");
      qc.invalidateQueries({ queryKey: ["internal"] });
    },
    onError: (e) =>
      toast.error("Sweep failed", { description: e instanceof Error ? e.message : undefined }),
  });

  const entries = Object.entries(health).filter(([, v]) => typeof v !== "object");

  return (
    <>
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Platform
          </div>
          <h1 className="mt-1 text-xl font-medium tracking-tight">Operational health</h1>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          disabled={triggerSweep.isPending}
          onClick={() => triggerSweep.mutate()}
        >
          {triggerSweep.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Run sweep now
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-px border bg-border md:grid-cols-4">
        {entries.map(([k, v]) => (
          <div key={k} className="bg-surface px-4 py-4">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {k.replace(/_/g, " ")}
            </div>
            <div className="tabular mt-1 truncate text-lg font-medium">{String(v ?? "—")}</div>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="col-span-full bg-surface px-4 py-8 text-center text-[12px] text-muted-foreground">
            Health endpoint returned no scalar metrics.
          </div>
        )}
      </div>

      <section className="mt-6">
        <h2 className="mb-2 text-[13px] font-medium">Latest sweep runs</h2>
        <DataTable
          columns={sweepColumns}
          data={sweeps}
          searchPlaceholder="Search windows…"
          initialSorting={[{ id: "window_from", desc: true }]}
          pageSize={10}
          emptyState={
            <div className="border bg-surface px-4 py-10 text-center text-[12px] text-muted-foreground">
              No sweep runs recorded yet.
            </div>
          }
        />
      </section>
    </>
  );
}
