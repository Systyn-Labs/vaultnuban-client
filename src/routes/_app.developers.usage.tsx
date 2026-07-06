import { Suspense, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import { apiKeyUsageQuery, type APIKeyUsageRow } from "@/data/queries";
import { useSession } from "@/data/session";

export const Route = createFileRoute("/_app/developers/usage")({
  head: () => ({ meta: [{ title: "API Usage · VaultNUBAN" }] }),
  component: () => (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
      <Suspense fallback={<div className="h-96 animate-pulse border bg-surface" />}>
        <UsagePage />
      </Suspense>
    </div>
  ),
});

function UsagePage() {
  const { data } = useSuspenseQuery(apiKeyUsageQuery);
  const session = useSession((s) => s.session);
  const isOps = session?.role === "ops";
  const rows = data.data ?? [];

  const columns = useMemo<ColumnDef<APIKeyUsageRow>[]>(() => {
    const cols: ColumnDef<APIKeyUsageRow>[] = [
      {
        accessorKey: "key_prefix",
        header: ({ column }) => <SortableHeader column={column}>Key</SortableHeader>,
        cell: ({ row }) => <span className="tabular">{row.original.key_prefix}…</span>,
      },
    ];
    // Ops sees every tenant key, including who created it — dev only ever
    // sees keys it personally created, so the column would always read
    // "me" and isn't worth the space.
    if (isOps) {
      cols.push({
        accessorKey: "created_by_name",
        header: ({ column }) => <SortableHeader column={column}>Created by</SortableHeader>,
        cell: ({ row }) => (
          <span className="text-[12px] text-muted-foreground">
            {row.original.created_by_name || "—"}
          </span>
        ),
      });
    }
    cols.push(
      {
        accessorKey: "usage_date",
        header: ({ column }) => <SortableHeader column={column}>Date</SortableHeader>,
        cell: ({ row }) => (
          <span className="tabular text-[12px] text-muted-foreground">
            {row.original.usage_date}
          </span>
        ),
      },
      {
        accessorKey: "request_count",
        header: () => <span className="block text-right">Requests</span>,
        cell: ({ row }) => (
          <div className="tabular text-right">{row.original.request_count.toLocaleString()}</div>
        ),
      },
    );
    return cols;
  }, [isOps]);

  return (
    <>
      <header className="mb-6">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Developers
        </div>
        <h1 className="mt-1 text-xl font-medium tracking-tight">API usage</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Daily request counts per API key, for billing.{" "}
          {isOps
            ? "Ops sees every key on this tenant."
            : "You see usage only for keys you personally created."}
        </p>
      </header>

      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="Search key prefix…"
        initialSorting={[{ id: "usage_date", desc: true }]}
        emptyState={
          <div className="border bg-surface px-4 py-16 text-center">
            <div className="text-[13px] font-medium">No usage recorded yet</div>
            <p className="mx-auto mt-1 max-w-sm text-[12px] text-muted-foreground">
              Usage is only recorded for real API-key traffic (server-to-server calls) — dashboard
              activity doesn't count.
            </p>
          </div>
        }
      />
    </>
  );
}
