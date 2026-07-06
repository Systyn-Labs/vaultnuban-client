import { Suspense, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Loader2, UserPlus, Wallet } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import type { Customer } from "@/domain/types";
import { toast } from "sonner";
import { customersQuery, virtualAccountsQuery } from "@/data/queries";
import { vn } from "@/data/client";
import { formatDateTime } from "@/lib/format";
import { useUi } from "@/state/uiStore";
import { useRequireStepUp } from "@/components/auth/StepUpProvider";
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

export const Route = createFileRoute("/_app/customers")({
  head: () => ({ meta: [{ title: "Customers · VaultNUBAN" }] }),
  component: () => (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
      <Suspense fallback={<div className="h-96 animate-pulse border bg-surface" />}>
        <CustomersPage />
      </Suspense>
    </div>
  ),
});

function CustomersPage() {
  const { data: customerPage } = useSuspenseQuery(customersQuery);
  const { data: vaPage } = useSuspenseQuery(virtualAccountsQuery);
  const openStatement = useUi((s) => s.openStatement);
  const openWithdrawals = useUi((s) => s.openWithdrawals);
  const qc = useQueryClient();
  const requireStepUp = useRequireStepUp();
  const customers = customerPage.data ?? [];
  const vaByCustomer = new Map((vaPage.data ?? []).map((v) => [v.customer_id, v]));

  const provision = useMutation({
    mutationFn: async (customerId: string) => {
      const stepUpToken = await requireStepUp();
      return vn().virtualAccounts.provision(customerId, undefined, { stepUpToken });
    },
    onSuccess: (va) => {
      toast.success("Virtual account provisioned", {
        description: `${va.nuban} · ${va.bank_name}`,
      });
      qc.invalidateQueries({ queryKey: ["virtual-accounts"] });
    },
    onError: (e) =>
      toast.error("Provisioning failed", {
        description: e instanceof Error ? e.message : undefined,
      }),
  });

  const setTier = useMutation({
    mutationFn: ({ id, tier }: { id: string; tier: 1 | 2 | 3 }) =>
      vn().customers.updateKycTier(id, tier),
    onSuccess: () => {
      toast.success("KYC tier updated");
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e) =>
      toast.error("Tier update failed", {
        description: e instanceof Error ? e.message : undefined,
      }),
  });

  const columns = useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        accessorKey: "display_name",
        header: ({ column }) => <SortableHeader column={column}>Customer</SortableHeader>,
        cell: ({ row }) => <span className="font-medium">{row.original.display_name}</span>,
      },
      {
        accessorKey: "external_ref",
        header: ({ column }) => <SortableHeader column={column}>External Ref</SortableHeader>,
        cell: ({ row }) => (
          <span className="tabular text-[12px] text-muted-foreground">
            {row.original.external_ref}
          </span>
        ),
      },
      {
        id: "kyc_tier",
        accessorFn: (c) => c.identity?.kyc_tier ?? 1,
        header: ({ column }) => <SortableHeader column={column}>KYC Tier</SortableHeader>,
        cell: ({ row }) => (
          <Select
            value={String(row.original.identity?.kyc_tier ?? 1)}
            onValueChange={(v) =>
              setTier.mutate({ id: row.original.id, tier: Number(v) as 1 | 2 | 3 })
            }
          >
            <SelectTrigger className="h-7 w-24 text-[12px]" onClick={(e) => e.stopPropagation()}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Tier 1</SelectItem>
              <SelectItem value="2">Tier 2</SelectItem>
              <SelectItem value="3">Tier 3</SelectItem>
            </SelectContent>
          </Select>
        ),
      },
      {
        id: "nuban",
        accessorFn: (c) => vaByCustomer.get(c.id)?.nuban ?? "",
        header: ({ column }) => <SortableHeader column={column}>Virtual Account</SortableHeader>,
        cell: ({ row }) => {
          const va = vaByCustomer.get(row.original.id);
          return va ? (
            <button
              onClick={() => openStatement(row.original.id)}
              className="tabular text-[12px] hover:underline"
            >
              {va.nuban}
            </button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              className="h-7 gap-1.5 text-[12px]"
              disabled={provision.isPending}
              onClick={() => provision.mutate(row.original.id)}
            >
              {provision.isPending && provision.variables === row.original.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Wallet className="h-3 w-3" />
              )}
              Provision NUBAN
            </Button>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => <SortableHeader column={column}>Onboarded</SortableHeader>,
        cell: ({ row }) => (
          <span className="tabular text-[12px] text-muted-foreground">
            {formatDateTime(row.original.created_at)}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => null,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-3 text-right">
            <button
              onClick={() => openWithdrawals(row.original.id)}
              className="text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              Withdrawals →
            </button>
            <button
              onClick={() => openStatement(row.original.id)}
              className="text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              Statement →
            </button>
          </div>
        ),
      },
    ],
    [vaByCustomer, provision, setTier, openStatement, openWithdrawals],
  );

  return (
    <>
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Accounts
          </div>
          <h1 className="mt-1 text-xl font-medium tracking-tight">Customers</h1>
        </div>
        <CreateCustomerDialog />
      </header>

      <DataTable
        columns={columns}
        data={customers}
        searchPlaceholder="Search name, external ref…"
        initialSorting={[{ id: "created_at", desc: true }]}
        emptyState={
          <div className="border bg-surface px-4 py-16 text-center">
            <div className="text-[13px] font-medium">No customers yet</div>
            <p className="mx-auto mt-1 max-w-sm text-[12px] text-muted-foreground">
              Onboard your first customer to provision their dedicated virtual account and start
              receiving payments.
            </p>
          </div>
        }
      />
    </>
  );
}

function CreateCustomerDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bvn, setBvn] = useState("");

  const create = useMutation({
    // The API requires a caller-supplied external_ref (it does not generate one),
    // so the dashboard generates a stable, unique reference on the customer's
    // behalf instead of asking the operator to invent one.
    mutationFn: () =>
      vn().customers.create({
        display_name: displayName,
        external_ref: `cus_${globalThis.crypto.randomUUID()}`,
        bvn: bvn || undefined,
      }),
    onSuccess: (c) => {
      toast.success("Customer onboarded", { description: c.display_name });
      qc.invalidateQueries({ queryKey: ["customers"] });
      setOpen(false);
      setDisplayName("");
      setBvn("");
    },
    onError: (e) =>
      toast.error("Onboarding failed", { description: e instanceof Error ? e.message : undefined }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <UserPlus className="h-3.5 w-3.5" /> Onboard customer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Onboard customer</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="name">Display name</Label>
            <Input
              id="name"
              required
              minLength={8}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Appears as the virtual account name (8–64 characters).
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bvn">BVN (optional)</Label>
            <Input
              id="bvn"
              inputMode="numeric"
              maxLength={11}
              value={bvn}
              onChange={(e) => setBvn(e.target.value.replace(/\D/g, ""))}
            />
            <p className="text-[11px] text-muted-foreground">Raises the customer's KYC ceiling.</p>
          </div>
          <Button type="submit" className="w-full gap-1.5" disabled={create.isPending}>
            {create.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Onboard
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
