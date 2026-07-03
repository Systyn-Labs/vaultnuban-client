import { Suspense, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Loader2, Wrench } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import { toast } from "sonner";
import { internalSuspenseQuery, rows } from "@/data/queries";
import { adminHttp } from "@/data/client";
import { useRequireStepUp } from "@/components/auth/StepUpProvider";
import { formatDateTime, formatNaira } from "@/lib/format";
import { StatusPill } from "@/components/tx/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InternalSuspenseItem {
  id: string;
  tenant_id?: string;
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
  const [resolving, setResolving] = useState<InternalSuspenseItem | null>(null);

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
    {
      id: "actions",
      header: () => null,
      cell: ({ row }) => (
        <div className="text-right">
          <Button
            size="sm"
            variant="ghost"
            className="gap-1"
            onClick={(e) => {
              e.stopPropagation();
              setResolving(row.original);
            }}
          >
            <Wrench className="h-3 w-3" /> Resolve
          </Button>
        </div>
      ),
    },
  ];

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

      <ResolveDialog item={resolving} onClose={() => setResolving(null)} />
    </>
  );
}

function ResolveDialog({
  item,
  onClose,
}: {
  item: InternalSuspenseItem | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const requireStepUp = useRequireStepUp();
  const [resolution, setResolution] = useState<"reassign" | "refund_flagged">("refund_flagged");
  const [tenantId, setTenantId] = useState(item?.tenant_id ?? "");
  const [targetCustomerId, setTargetCustomerId] = useState("");
  const [notes, setNotes] = useState("");

  // Reset the tenant-ID field's default whenever a new item is opened —
  // unmatched items have no resolvable tenant yet, so the admin may need to
  // supply one manually (e.g. from support context) before reassigning.
  const [lastItemId, setLastItemId] = useState<string | null>(null);
  if (item && item.id !== lastItemId) {
    setLastItemId(item.id);
    setTenantId(item.tenant_id ?? "");
  }

  const resolve = useMutation({
    mutationFn: async () => {
      if (!item) throw new Error("no item selected");
      if (!tenantId) throw new Error("A tenant ID is required to resolve this item");
      const stepUpToken = await requireStepUp();
      return adminHttp().patch(
        `/internal/suspense/${item.id}`,
        {
          tenant_id: tenantId,
          resolution,
          target_customer_id: resolution === "reassign" ? targetCustomerId : undefined,
          notes,
        },
        { stepUpToken },
      );
    },
    onSuccess: () => {
      toast.success("Suspense item resolved");
      qc.invalidateQueries({ queryKey: ["internal", "suspense"] });
      setTargetCustomerId("");
      setNotes("");
      onClose();
    },
    onError: (e) =>
      toast.error("Resolve failed", { description: e instanceof Error ? e.message : undefined }),
  });

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Resolve suspense item</DialogTitle>
        </DialogHeader>
        {item && (
          <div className="space-y-4">
            <div className="border bg-surface-muted px-3 py-2 text-[12px]">
              <div className="tabular truncate">{item.transaction_id}</div>
              <div className="text-muted-foreground">
                {item.tenant_name || "No tenant on file"} · {formatNaira(item.amount_kobo)}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tenant-id">
                Tenant ID{!item.tenant_id && " (required — this item has no tenant on file)"}
              </Label>
              <Input
                id="tenant-id"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Resolution</Label>
              <Select
                value={resolution}
                onValueChange={(v) => setResolution(v as typeof resolution)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reassign">Reassign to customer</SelectItem>
                  <SelectItem value="refund_flagged">Flag for refund</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {resolution === "reassign" && (
              <div className="space-y-1.5">
                <Label htmlFor="target-customer">Target customer ID</Label>
                <Input
                  id="target-customer"
                  value={targetCustomerId}
                  onChange={(e) => setTargetCustomerId(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button
                className="flex-1 gap-1.5"
                disabled={
                  resolve.isPending || !tenantId || (resolution === "reassign" && !targetCustomerId)
                }
                onClick={() => resolve.mutate()}
              >
                {resolve.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
