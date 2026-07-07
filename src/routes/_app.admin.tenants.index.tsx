import { Suspense, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Building2, Check, Copy, Loader2 } from "lucide-react";
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

export const Route = createFileRoute("/_app/admin/tenants/")({
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
  const navigate = useNavigate();

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
        onRowClick={(row) =>
          navigate({ to: "/admin/tenants/$tenantId", params: { tenantId: row.id } })
        }
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
    accessorKey: "status",
    header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
    cell: ({ row }) => {
      const status = row.original.status ?? "active";
      return (
        <span
          className={`px-1.5 py-0.5 text-[10px] uppercase tracking-widest ${
            status === "active"
              ? "bg-credit-soft text-credit"
              : "bg-status-failed-soft text-status-failed"
          }`}
        >
          {status}
        </span>
      );
    },
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
  const [role, setRole] = useState("ops");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [copied, setCopied] = useState(false);

  const onboard = useMutation({
    mutationFn: () =>
      adminHttp().post<Record<string, unknown>>("/internal/tenants", {
        company_name: tenantName,
        name,
        email,
        role,
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
        if (!o) {
          setResult(null);
          setCopied(false);
        }
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
            {result.email_sent === false ? (
              <div className="border border-status-failed/40 bg-status-failed-soft p-3 text-[12px] text-status-failed">
                Tenant created, but the welcome email could not be sent. Share these credentials
                with <span className="font-medium">{String(result.email ?? "")}</span> manually —
                they won't be shown again.
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground">
                Tenant onboarded. A welcome email with login details, a temporary password, and the
                API key was sent to{" "}
                <span className="text-foreground">{String(result.email ?? "")}</span>. They'll be
                required to change the password on first sign-in.
              </p>
            )}

            {result.email_sent === false && (
              <div className="space-y-1.5 border bg-surface-muted p-3 text-[11px]">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Temporary password</span>
                  <code className="tabular">{String(result.temp_password ?? "")}</code>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <span className="text-[11px] text-muted-foreground">
                API key {result.email_sent === false ? "" : "(for your reference)"}
              </span>
              <div className="flex items-center gap-2 border bg-surface-muted p-3">
                <code className="tabular flex-1 overflow-x-auto whitespace-nowrap text-[11px]">
                  {String(result.api_key ?? "")}
                </code>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0 gap-1.5"
                  onClick={async () => {
                    await navigator.clipboard.writeText(String(result.api_key ?? ""));
                    setCopied(true);
                  }}
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
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
              <p className="text-[11px] text-muted-foreground">
                We'll email them a temporary password and their API key. They must change the
                password on first sign-in.
              </p>
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
