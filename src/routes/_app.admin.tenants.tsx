import { Suspense, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Building2, Loader2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import { toast } from "sonner";
import { tenantsQuery, rows, type TenantSummary } from "@/data/queries";
import { adminHttp } from "@/data/client";
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

export const Route = createFileRoute("/_app/admin/tenants")({
  head: () => ({ meta: [{ title: "Tenants · VaultNUBAN" }] }),
  component: () => (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
      <Suspense fallback={<div className="h-96 animate-pulse border bg-surface" />}>
        <TenantsPage />
      </Suspense>
    </div>
  ),
});

function TenantsPage() {
  const { data: payload } = useSuspenseQuery(tenantsQuery);
  const tenants = rows<TenantSummary>(payload);

  return (
    <>
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Platform
          </div>
          <h1 className="mt-1 text-xl font-medium tracking-tight">Tenants</h1>
        </div>
        <OnboardTenantDialog />
      </header>

      <DataTable
        columns={tenantColumns}
        data={tenants}
        searchPlaceholder="Search tenants…"
        initialSorting={[{ id: "name", desc: false }]}
        emptyState={
          <div className="border bg-surface px-4 py-16 text-center">
            <Building2 className="mx-auto h-5 w-5 text-muted-foreground" />
            <div className="mt-2 text-[13px] font-medium">No tenants onboarded</div>
            <p className="mx-auto mt-1 max-w-sm text-[12px] text-muted-foreground">
              Onboard the first fintech to issue their API key and dashboard credentials.
            </p>
          </div>
        }
      />
    </>
  );
}

const tenantColumns: ColumnDef<TenantSummary>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column}>Tenant</SortableHeader>,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "id",
    header: ({ column }) => <SortableHeader column={column}>ID</SortableHeader>,
    cell: ({ row }) => (
      <span className="tabular text-[12px] text-muted-foreground">{row.original.id}</span>
    ),
  },
];

function OnboardTenantDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tenantName, setTenantName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("ops");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const onboard = useMutation({
    mutationFn: () =>
      adminHttp().post<Record<string, unknown>>("/internal/tenants", {
        tenant_name: tenantName,
        users: [{ name, email, password, role }],
      }),
    onSuccess: (r) => {
      setResult(r);
      toast.success("Tenant onboarded");
      qc.invalidateQueries({ queryKey: ["internal", "tenants"] });
    },
    onError: (e) =>
      toast.error("Onboarding failed", { description: e instanceof Error ? e.message : undefined }),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setResult(null);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">Onboard tenant</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Onboard tenant</DialogTitle>
        </DialogHeader>
        {result ? (
          <div className="space-y-3">
            <p className="text-[12px] text-muted-foreground">
              Credentials issued — share them securely. The API key is shown once.
            </p>
            <pre className="tabular overflow-x-auto border bg-surface-muted p-3 text-[11px]">
              {JSON.stringify(result, null, 2)}
            </pre>
            <Button className="w-full" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onboard.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="tname">Tenant (business) name</Label>
              <Input
                id="tname"
                required
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uname">Contact name</Label>
              <Input id="uname" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uemail">Login email</Label>
              <Input
                id="uemail"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="upass">Temporary password</Label>
              <Input
                id="upass"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Dashboard role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ops">Operations</SelectItem>
                  <SelectItem value="dev">Developer</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Determines which workspace the user lands in — both share the tenant API key.
              </p>
            </div>
            <Button type="submit" className="w-full gap-1.5" disabled={onboard.isPending}>
              {onboard.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Onboard
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
