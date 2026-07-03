import { Suspense, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Inbox, Loader2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import type { Collection } from "@/domain/types";
import { toast } from "sonner";
import { collectionsQuery, customersQuery } from "@/data/queries";
import { vn } from "@/data/client";
import { formatDateTime, formatNaira } from "@/lib/format";
import { StatusPill } from "@/components/tx/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_app/collections")({
  head: () => ({ meta: [{ title: "Collections · VaultNUBAN" }] }),
  component: () => (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
      <Suspense fallback={<div className="h-96 animate-pulse border bg-surface" />}>
        <CollectionsPage />
      </Suspense>
    </div>
  ),
});

function CollectionsPage() {
  const { data: customerPage } = useSuspenseQuery(customersQuery);
  const customers = customerPage.data ?? [];
  const [customerId, setCustomerId] = useState<string>(customers[0]?.id ?? "");
  const collections = useQuery({ ...collectionsQuery(customerId), enabled: !!customerId });
  const qc = useQueryClient();

  const cancel = useMutation({
    mutationFn: (collectionId: string) => vn().collections.cancel(customerId, collectionId),
    onSuccess: () => {
      toast.success("Collection cancelled");
      qc.invalidateQueries({ queryKey: ["collections", customerId] });
    },
    onError: (e) =>
      toast.error("Cancel failed", { description: e instanceof Error ? e.message : undefined }),
  });

  const rows = collections.data?.data ?? [];

  const columns = useMemo<ColumnDef<Collection>[]>(
    () => [
      {
        accessorKey: "reference",
        header: ({ column }) => <SortableHeader column={column}>Reference</SortableHeader>,
        cell: ({ row }) => <span className="tabular text-[12px]">{row.original.reference}</span>,
      },
      {
        accessorKey: "description",
        header: ({ column }) => <SortableHeader column={column}>Description</SortableHeader>,
        cell: ({ row }) => (
          <span className="block max-w-[240px] truncate">{row.original.description}</span>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
        cell: ({ row }) => <StatusPill status={row.original.status} />,
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => <SortableHeader column={column}>Created</SortableHeader>,
        cell: ({ row }) => (
          <span className="tabular text-[12px] text-muted-foreground">
            {formatDateTime(row.original.created_at)}
          </span>
        ),
      },
      {
        accessorKey: "expected_amount_kobo",
        header: ({ column }) => (
          <SortableHeader column={column} align="right">
            Expected
          </SortableHeader>
        ),
        cell: ({ row }) => (
          <div className="tabular text-right">
            {row.original.expected_amount_kobo
              ? formatNaira(row.original.expected_amount_kobo)
              : "Any amount"}
          </div>
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
                variant="ghost"
                className="h-7 text-[11px] uppercase tracking-widest"
                onClick={() => cancel.mutate(row.original.id)}
              >
                Cancel
              </Button>
            </div>
          ) : null,
      },
    ],
    [cancel],
  );

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Money</div>
          <h1 className="mt-1 text-xl font-medium tracking-tight">Collections</h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Payment requests tied to a customer's virtual account — fulfilled automatically when the
            matching credit arrives.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Choose customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {customerId && <CreateCollectionDialog customerId={customerId} />}
        </div>
      </header>

      {!customerId ? (
        <div className="border bg-surface px-4 py-16 text-center text-[12px] text-muted-foreground">
          Onboard a customer first — collections attach to a customer's virtual account.
        </div>
      ) : collections.isLoading ? (
        <div className="h-64 animate-pulse border bg-surface" />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          searchPlaceholder="Search reference, description…"
          initialSorting={[{ id: "created_at", desc: true }]}
          emptyState={
            <div className="border bg-surface px-4 py-16 text-center">
              <Inbox className="mx-auto h-5 w-5 text-muted-foreground" />
              <div className="mt-2 text-[13px] font-medium">No collections for this customer</div>
              <p className="mx-auto mt-1 max-w-sm text-[12px] text-muted-foreground">
                Create a payment request to track an expected transfer against an invoice or order.
              </p>
            </div>
          }
        />
      )}
    </>
  );
}

function CreateCollectionDialog({ customerId }: { customerId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const create = useMutation({
    mutationFn: () =>
      vn().collections.create(customerId, {
        reference,
        description,
        expected_amount_kobo: amount ? Math.round(parseFloat(amount) * 100) : undefined,
      }),
    onSuccess: (c) => {
      toast.success("Collection created", {
        description: `Share NUBAN ${c.nuban} with the payer.`,
      });
      qc.invalidateQueries({ queryKey: ["collections", customerId] });
      setOpen(false);
      setReference("");
      setDescription("");
      setAmount("");
    },
    onError: (e) =>
      toast.error("Creation failed", { description: e instanceof Error ? e.message : undefined }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Request payment</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Request payment</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="cref">Reference</Label>
            <Input
              id="cref"
              required
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">Your invoice or order identifier.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cdesc">Description</Label>
            <Input
              id="cdesc"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="camt">Expected amount (₦, optional)</Label>
            <Input
              id="camt"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              When set, a mismatched amount routes to suspense instead of fulfilling the request.
            </p>
          </div>
          <Button type="submit" className="w-full gap-1.5" disabled={create.isPending}>
            {create.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create request
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
