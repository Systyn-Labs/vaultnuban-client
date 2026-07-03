import { Suspense, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import { toast } from "sonner";
import { customersQuery, suspenseQuery } from "@/data/queries";
import { vn } from "@/data/client";
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
import type { SuspenseItem } from "@/domain/types";

const REASONS: Record<string, string> = {
  unmatched: "No virtual account matched this payment",
  closed_account: "Payment arrived after the account was closed",
  suspended_account: "Payment arrived while the account was suspended",
  amount_mismatch: "Amount differs from the expected collection",
  tier_limit: "Credit would breach the customer's KYC tier limit",
};

export const Route = createFileRoute("/_app/suspense")({
  head: () => ({ meta: [{ title: "Suspense · VaultNUBAN" }] }),
  component: () => (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
      <Suspense fallback={<div className="h-96 animate-pulse border bg-surface" />}>
        <SuspensePage />
      </Suspense>
    </div>
  ),
});

function SuspensePage() {
  const { data: page } = useSuspenseQuery(suspenseQuery);
  const [resolving, setResolving] = useState<SuspenseItem | null>(null);
  const items = page.data ?? [];

  const columns = useMemo<ColumnDef<SuspenseItem>[]>(
    () => [
      {
        accessorKey: "transaction_id",
        header: ({ column }) => <SortableHeader column={column}>Transaction</SortableHeader>,
        cell: ({ row }) => (
          <span className="tabular block max-w-[200px] truncate text-[12px]">
            {row.original.transaction_id}
          </span>
        ),
      },
      {
        accessorKey: "reason",
        header: ({ column }) => <SortableHeader column={column}>Reason</SortableHeader>,
        cell: ({ row }) => (
          <div>
            <div className="font-medium capitalize">{row.original.reason.replace(/_/g, " ")}</div>
            <div className="text-[11px] text-muted-foreground">
              {REASONS[row.original.reason] ?? ""}
            </div>
          </div>
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
            {formatDateTime(row.original.created_at)}
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
          <div className="tabular text-right">{formatNaira(row.original.amount_kobo)}</div>
        ),
      },
      {
        id: "actions",
        header: () => null,
        cell: ({ row }) =>
          row.original.status === "open" ? (
            <div className="text-right">
              <Button
                size="sm"
                variant="secondary"
                className="h-7 text-[12px]"
                onClick={() => setResolving(row.original)}
              >
                Resolve
              </Button>
            </div>
          ) : null,
      },
    ],
    [],
  );

  return (
    <>
      <header className="mb-6">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Operations
        </div>
        <h1 className="mt-1 text-xl font-medium tracking-tight">Suspense</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Payments the ledger accepted but could not credit to a customer. Every item requires a
          deliberate resolution — nothing is dropped.
        </p>
      </header>

      <DataTable
        columns={columns}
        data={items}
        searchPlaceholder="Search transaction, reason…"
        initialSorting={[{ id: "created_at", desc: true }]}
        emptyState={
          <div className="border bg-surface px-4 py-16 text-center">
            <div className="text-[13px] font-medium">Suspense is clear</div>
            <p className="mx-auto mt-1 max-w-sm text-[12px] text-muted-foreground">
              Every received payment has been matched and credited. Items appear here only when a
              payment cannot be attributed.
            </p>
          </div>
        }
        footer={(filtered) => {
          const openRows = filtered.filter((i) => i.status === "open");
          return (
            <tr className="border-t bg-surface-muted text-[12px]">
              <td className="px-4 py-2.5 font-medium" colSpan={4}>
                {openRows.length} open of {filtered.length}
              </td>
              <td className="tabular px-4 py-2.5 text-right font-medium" colSpan={2}>
                {formatNaira(openRows.reduce((s, i) => s + i.amount_kobo, 0))} held
              </td>
            </tr>
          );
        }}
      />

      <ResolveDialog item={resolving} onClose={() => setResolving(null)} />
    </>
  );
}

function ResolveDialog({ item, onClose }: { item: SuspenseItem | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [resolution, setResolution] = useState<"reassign" | "refund_flagged">("reassign");
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");
  const customers = useQuery({ ...customersQuery, enabled: !!item });

  const resolve = useMutation({
    mutationFn: () =>
      vn().suspense.resolve(item!.id, {
        resolution,
        target_customer_id: resolution === "reassign" ? customerId : undefined,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      toast.success(resolution === "reassign" ? "Payment reassigned" : "Flagged for refund");
      qc.invalidateQueries({ queryKey: ["suspense"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      onClose();
      setNotes("");
      setCustomerId("");
    },
    onError: (e) =>
      toast.error("Resolution failed", { description: e instanceof Error ? e.message : undefined }),
  });

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Resolve suspense item</DialogTitle>
        </DialogHeader>
        {item && (
          <div className="space-y-4">
            <div className="border bg-surface-muted p-3 text-[12px]">
              <div className="tabular">{item.transaction_id}</div>
              <div className="tabular mt-1 text-lg font-medium">
                {formatNaira(item.amount_kobo)}
              </div>
              <div className="text-muted-foreground">{REASONS[item.reason]}</div>
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
                  <SelectItem value="reassign">Reassign to a customer wallet</SelectItem>
                  <SelectItem value="refund_flagged">Flag for refund to sender</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {resolution === "reassign" && (
              <div className="space-y-1.5">
                <Label>Credit to</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {(customers.data?.data ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <p className="text-[11px] text-muted-foreground">
                Recorded in the audit trail alongside the resolution.
              </p>
            </div>

            <Button
              className="w-full gap-1.5"
              disabled={resolve.isPending || (resolution === "reassign" && !customerId)}
              onClick={() => resolve.mutate()}
            >
              {resolve.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Confirm resolution
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
