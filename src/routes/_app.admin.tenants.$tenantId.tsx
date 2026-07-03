import { Suspense, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  Loader2,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserX,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { tenantDetailQuery, tenantTierLimitsQuery, tenantUsersQuery } from "@/data/queries";
import { adminHttp } from "@/data/client";
import { useRequireStepUp } from "@/components/auth/StepUpProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/tenants/$tenantId")({
  head: () => ({ meta: [{ title: "Tenant · VaultNUBAN" }] }),
  component: () => (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
      <Suspense fallback={<div className="h-96 animate-pulse border bg-surface" />}>
        <TenantDetailPage />
      </Suspense>
    </div>
  ),
});

function TenantDetailPage() {
  const { tenantId } = useParams({ from: "/_app/admin/tenants/$tenantId" });
  const { data } = useSuspenseQuery(tenantDetailQuery(tenantId));
  const { data: tierData } = useSuspenseQuery(tenantTierLimitsQuery(tenantId));
  const qc = useQueryClient();
  const requireStepUp = useRequireStepUp();
  const [reason, setReason] = useState("");

  const setStatus = useMutation({
    mutationFn: async (status: "active" | "suspended" | "deleted") => {
      const stepUpToken = await requireStepUp();
      return adminHttp().patch(
        `/internal/tenants/${tenantId}/status`,
        { status, reason },
        { stepUpToken },
      );
    },
    onSuccess: (_r, status) => {
      toast.success(`Tenant ${status}`);
      qc.invalidateQueries({ queryKey: ["internal", "tenants"] });
    },
    onError: (e) =>
      toast.error("Status change failed", {
        description: e instanceof Error ? e.message : undefined,
      }),
  });

  const rotateKey = useMutation({
    mutationFn: async () => {
      const stepUpToken = await requireStepUp();
      return adminHttp().post<{ api_key: string; key_prefix: string }>(
        `/internal/tenants/${tenantId}/api-keys/rotate`,
        undefined,
        { stepUpToken },
      );
    },
    onSuccess: (r) => {
      toast.success("New API key issued", {
        description: `${r.key_prefix}… — shown once, share securely`,
      });
    },
    onError: (e) =>
      toast.error("Rotate failed", { description: e instanceof Error ? e.message : undefined }),
  });

  const status = data.tenant.status ?? "active";

  return (
    <>
      <header className="mb-6">
        <Link to="/admin/tenants" className="text-[11px] text-muted-foreground hover:underline">
          ← Tenants
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-xl font-medium tracking-tight">{data.tenant.name}</h1>
          <span
            className={`px-2 py-0.5 text-[10px] uppercase tracking-widest ${
              status === "active"
                ? "bg-credit-soft text-credit"
                : "bg-status-failed-soft text-status-failed"
            }`}
          >
            {status}
          </span>
        </div>
        <div className="tabular mt-1 text-[11px] text-muted-foreground">{data.tenant.id}</div>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-2 border bg-surface p-4">
        <Input
          placeholder="Reason (optional, recorded in audit log)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="max-w-xs"
        />
        {status !== "active" && (
          <Button
            size="sm"
            variant="secondary"
            className="gap-1.5"
            disabled={setStatus.isPending}
            onClick={() => setStatus.mutate("active")}
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Reactivate
          </Button>
        )}
        {status === "active" && (
          <Button
            size="sm"
            variant="secondary"
            className="gap-1.5"
            disabled={setStatus.isPending}
            onClick={() => setStatus.mutate("suspended")}
          >
            <ShieldAlert className="h-3.5 w-3.5" /> Suspend
          </Button>
        )}
        {status !== "deleted" && (
          <Button
            size="sm"
            variant="secondary"
            className="gap-1.5 text-status-failed"
            disabled={setStatus.isPending}
            onClick={() => setStatus.mutate("deleted")}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        )}
        <Button
          size="sm"
          variant="secondary"
          className="ml-auto gap-1.5"
          disabled={rotateKey.isPending}
          onClick={() => rotateKey.mutate()}
        >
          {rotateKey.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <KeyRound className="h-3.5 w-3.5" />
          )}
          Rotate API key
        </Button>
      </div>

      <TierOverridesForm tenantId={tenantId} initial={tierData.overrides} />

      <div className="mt-6">
        <UsersPanel tenantId={tenantId} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Section title={`Customers (${data.customers.length})`} items={data.customers} />
        <Section title={`Transactions (${data.transactions.length})`} items={data.transactions} />
        <Section title={`Suspense (${data.suspense.length})`} items={data.suspense} />
        <Section
          title={`Virtual accounts (${data.virtual_accounts.length})`}
          items={data.virtual_accounts}
        />
      </div>

      <section className="mt-6">
        <h2 className="mb-2 text-[13px] font-medium">Audit trail</h2>
        <div className="border bg-surface">
          {data.audit.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
              No audit entries yet.
            </div>
          ) : (
            <ul className="divide-y">
              {data.audit.map((e) => (
                <li key={e.id} className="px-4 py-2.5 text-[12px]">
                  <span className="font-medium">{e.actor}</span>{" "}
                  <span className="text-muted-foreground">{e.action}</span>{" "}
                  <span className="tabular text-muted-foreground">· {formatDateTime(e.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

function Section({ title, items }: { title: string; items: unknown[] }) {
  return (
    <div className="border bg-surface p-4">
      <h2 className="mb-2 text-[13px] font-medium">{title}</h2>
      {items.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">Nothing here yet.</p>
      ) : (
        <pre className="tabular max-h-60 overflow-auto text-[11px] text-muted-foreground">
          {JSON.stringify(items, null, 2)}
        </pre>
      )}
    </div>
  );
}

function UsersPanel({ tenantId }: { tenantId: string }) {
  const { data } = useSuspenseQuery(tenantUsersQuery(tenantId));
  const qc = useQueryClient();
  const requireStepUp = useRequireStepUp();

  const setActive = useMutation({
    mutationFn: async ({ userId, active }: { userId: string; active: boolean }) => {
      const stepUpToken = await requireStepUp();
      return adminHttp().patch(
        `/internal/tenants/${tenantId}/users/${userId}/status`,
        { active },
        { stepUpToken },
      );
    },
    onSuccess: (_r, { active }) => {
      toast.success(active ? "User reactivated" : "User deactivated");
      qc.invalidateQueries({ queryKey: ["internal", "tenants", tenantId, "users"] });
    },
    onError: (e) =>
      toast.error("Update failed", { description: e instanceof Error ? e.message : undefined }),
  });

  const resetMfa = useMutation({
    mutationFn: async (email: string) => {
      const stepUpToken = await requireStepUp();
      return adminHttp().post(`/internal/mfa/reset`, { email }, { stepUpToken });
    },
    onSuccess: () => toast.success("MFA reset — user must re-enroll on next sign-in"),
    onError: (e) =>
      toast.error("Reset failed", { description: e instanceof Error ? e.message : undefined }),
  });

  return (
    <div className="border bg-surface">
      <h2 className="border-b px-4 py-2.5 text-[13px] font-medium">Users ({data.data.length})</h2>
      {data.data.length === 0 ? (
        <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
          No users found for this tenant.
        </div>
      ) : (
        <ul className="divide-y">
          {data.data.map((u) => (
            <li key={u.id} className="flex items-center gap-3 px-4 py-2.5 text-[12px]">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{u.name}</div>
                <div className="text-muted-foreground">
                  {u.email} · {u.role} · {u.mfa_enabled ? "MFA enrolled" : "MFA not enrolled"}
                </div>
              </div>
              <span
                className={`px-1.5 py-0.5 text-[10px] uppercase tracking-widest ${
                  u.active
                    ? "bg-credit-soft text-credit"
                    : "bg-status-failed-soft text-status-failed"
                }`}
              >
                {u.active ? "active" : "deactivated"}
              </span>
              {u.mfa_enabled && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1"
                  disabled={resetMfa.isPending}
                  onClick={() => resetMfa.mutate(u.email)}
                >
                  <RotateCcw className="h-3 w-3" /> Reset MFA
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="gap-1"
                disabled={setActive.isPending}
                onClick={() => setActive.mutate({ userId: u.id, active: !u.active })}
              >
                <UserX className="h-3 w-3" /> {u.active ? "Deactivate" : "Reactivate"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TierOverridesForm({
  tenantId,
  initial,
}: {
  tenantId: string;
  initial: Record<string, { daily_credit_kobo: number; max_balance_kobo: number }> | null;
}) {
  const requireStepUp = useRequireStepUp();
  const qc = useQueryClient();
  const [draft, setDraft] = useState(
    initial ?? {
      "1": { daily_credit_kobo: 0, max_balance_kobo: 0 },
      "2": { daily_credit_kobo: 0, max_balance_kobo: 0 },
      "3": { daily_credit_kobo: 0, max_balance_kobo: 0 },
    },
  );

  const save = useMutation({
    mutationFn: async () => {
      const stepUpToken = await requireStepUp();
      return adminHttp().put(
        `/internal/tenants/${tenantId}/tier-limits`,
        { overrides: draft },
        { stepUpToken },
      );
    },
    onSuccess: () => {
      toast.success("Tier-limit overrides saved");
      qc.invalidateQueries({ queryKey: ["internal", "tenants", tenantId, "tier-limits"] });
    },
    onError: (e) =>
      toast.error("Save failed", { description: e instanceof Error ? e.message : undefined }),
  });

  return (
    <div className="border bg-surface p-4">
      <h2 className="mb-1 text-[13px] font-medium">Per-tenant tier-limit overrides</h2>
      <p className="mb-3 text-[11px] text-muted-foreground">
        Overrides the global tier limits for this tenant only. Leave unset to inherit the platform
        default.
      </p>
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(draft).map(([tier, limits]) => (
          <div key={tier} className="space-y-1.5">
            <Label>Tier {tier}</Label>
            <Input
              inputMode="numeric"
              placeholder="Daily credit (kobo)"
              value={limits.daily_credit_kobo}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  [tier]: { ...d[tier], daily_credit_kobo: Number(e.target.value) || 0 },
                }))
              }
            />
            <Input
              inputMode="numeric"
              placeholder="Max balance (kobo)"
              value={limits.max_balance_kobo}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  [tier]: { ...d[tier], max_balance_kobo: Number(e.target.value) || 0 },
                }))
              }
            />
          </div>
        ))}
      </div>
      <Button
        size="sm"
        className="mt-3 gap-1.5"
        disabled={save.isPending}
        onClick={() => save.mutate()}
      >
        {save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Save overrides
      </Button>
    </div>
  );
}
