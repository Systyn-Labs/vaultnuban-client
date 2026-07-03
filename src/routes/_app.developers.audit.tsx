import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { auditQuery } from "@/data/queries";
import { formatDateTime } from "@/lib/format";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import type { AuditEntry } from "@/domain/types";

export const Route = createFileRoute("/_app/developers/audit")({
  head: () => ({ meta: [{ title: "Audit Trail · VaultNUBAN" }] }),
  component: () => (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
      <Suspense fallback={<div className="h-96 animate-pulse border bg-surface" />}>
        <AuditPage />
      </Suspense>
    </div>
  ),
});

const columns: ColumnDef<AuditEntry>[] = [
  {
    accessorKey: "at",
    header: ({ column }) => <SortableHeader column={column}>When</SortableHeader>,
    cell: ({ row }) => (
      <span className="tabular text-[12px] text-muted-foreground">
        {formatDateTime(row.original.at)}
      </span>
    ),
  },
  {
    accessorKey: "action",
    header: ({ column }) => <SortableHeader column={column}>Action</SortableHeader>,
    cell: ({ row }) => <span className="font-medium">{humanize(row.original.action)}</span>,
  },
  {
    accessorKey: "entity_type",
    header: ({ column }) => <SortableHeader column={column}>Entity</SortableHeader>,
    cell: ({ row }) => (
      <span className="tabular block max-w-[260px] truncate text-[12px] text-muted-foreground">
        {row.original.entity_type} · {row.original.entity_id}
      </span>
    ),
  },
  {
    accessorKey: "actor",
    header: ({ column }) => <SortableHeader column={column}>Actor</SortableHeader>,
    cell: ({ row }) => <span className="tabular text-[12px]">{row.original.actor}</span>,
  },
];

// The audit log is a financial journal (PDL: every event feels like a ledger
// entry) — now sortable, searchable, and paginated like every other table.
function AuditPage() {
  const { data: page } = useSuspenseQuery(auditQuery);
  const entries = page.data ?? [];

  return (
    <>
      <header className="mb-6">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Monitoring
        </div>
        <h1 className="mt-1 text-xl font-medium tracking-tight">Audit trail</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Immutable record of every state-changing action on this tenant.
        </p>
      </header>

      <DataTable
        columns={columns}
        data={entries}
        searchPlaceholder="Search action, entity, actor…"
        initialSorting={[{ id: "at", desc: true }]}
        pageSize={25}
        emptyState={
          <div className="border bg-surface px-4 py-16 text-center">
            <div className="text-[13px] font-medium">No audit entries yet</div>
            <p className="mx-auto mt-1 max-w-sm text-[12px] text-muted-foreground">
              Actions like onboarding a customer or provisioning an account are recorded here
              automatically.
            </p>
          </div>
        }
      />
    </>
  );
}

function humanize(action: string): string {
  return action
    .split(/[._]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
