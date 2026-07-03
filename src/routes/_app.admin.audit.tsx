import { Suspense, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { platformAuditQuery, type PlatformAuditFilters } from "@/data/queries";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/audit")({
  head: () => ({ meta: [{ title: "Platform Audit Log · VaultNUBAN" }] }),
  component: () => (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
      <Suspense fallback={<div className="h-96 animate-pulse border bg-surface" />}>
        <PlatformAuditPage />
      </Suspense>
    </div>
  ),
});

function PlatformAuditPage() {
  const [filters, setFilters] = useState<PlatformAuditFilters>({});
  const { data, isLoading } = useQuery(platformAuditQuery(filters));
  const entries = data?.data ?? [];

  return (
    <>
      <header className="mb-6">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Platform</div>
        <h1 className="mt-1 text-xl font-medium tracking-tight">Audit log</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Every recorded action across all tenants, including platform-admin mutations.
        </p>
      </header>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Tenant ID</Label>
          <Input
            placeholder="Filter by tenant ID"
            value={filters.tenantId ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, tenantId: e.target.value || undefined }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Actor</Label>
          <Input
            placeholder="e.g. admin:ops@systyn.io"
            value={filters.actor ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, actor: e.target.value || undefined }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Action</Label>
          <Input
            placeholder="e.g. tenant.status.suspended"
            value={filters.action ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value || undefined }))}
          />
        </div>
      </div>

      <div className="border bg-surface">
        {isLoading ? (
          <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <ScrollText className="mx-auto h-5 w-5 text-muted-foreground" />
            <div className="mt-2 text-[13px] font-medium">No audit entries match</div>
          </div>
        ) : (
          <ul className="divide-y">
            {entries.map((e) => (
              <li key={e.id} className="px-4 py-2.5 text-[12px]">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <span className="font-medium">{e.actor}</span>{" "}
                    <span className="text-muted-foreground">{e.action}</span>
                  </div>
                  <span className="tabular shrink-0 text-muted-foreground">
                    {formatDateTime(e.at)}
                  </span>
                </div>
                <div className="tabular mt-0.5 text-[11px] text-muted-foreground">
                  {e.entity_type}:{e.entity_id}
                  {e.tenant_id ? ` · tenant:${e.tenant_id}` : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
