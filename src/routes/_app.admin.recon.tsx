import { Suspense, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { internalVAsQuery, nombaVAsQuery, rows } from "@/data/queries";
import { StatusPill } from "@/components/tx/StatusPill";

interface LocalVA {
  id?: string;
  nuban: string;
  account_name?: string;
  status?: string;
  tenant_name?: string;
  [k: string]: unknown;
}
interface NombaVA {
  nuban?: string;
  account_ref?: string;
  account_name?: string;
  status?: string;
  [k: string]: unknown;
}

export const Route = createFileRoute("/_app/admin/recon")({
  head: () => ({ meta: [{ title: "VA Reconciliation · VaultNUBAN" }] }),
  component: () => (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
      <Suspense fallback={<div className="h-96 animate-pulse border bg-surface" />}>
        <ReconPage />
      </Suspense>
    </div>
  ),
});

// The Balanced Ledger made literal: our register on the left, the provider's
// on the right, and every unbalanced row surfaced.
function ReconPage() {
  const { data: localPayload } = useSuspenseQuery(internalVAsQuery);
  const { data: nombaPayload } = useSuspenseQuery(nombaVAsQuery);
  const local = rows<LocalVA>(localPayload as never);
  const nomba = rows<NombaVA>(nombaPayload as never);

  const { matched, localOnly, nombaOnly } = useMemo(() => {
    const nombaByNuban = new Map(nomba.filter((n) => n.nuban).map((n) => [n.nuban!, n]));
    const localNubans = new Set(local.map((l) => l.nuban));
    const matched = local.filter((l) => nombaByNuban.has(l.nuban));
    const localOnly = local.filter((l) => !nombaByNuban.has(l.nuban));
    const nombaOnly = nomba.filter((n) => n.nuban && !localNubans.has(n.nuban));
    return { matched, localOnly, nombaOnly };
  }, [local, nomba]);

  const balanced = localOnly.length === 0 && nombaOnly.length === 0;

  return (
    <>
      <header className="mb-6">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Reconciliation
        </div>
        <h1 className="mt-1 text-xl font-medium tracking-tight">Virtual account reconciliation</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">
          The local register compared against Nomba's. A balanced book shows zero exceptions.
        </p>
      </header>

      <div className="mb-6 grid grid-cols-3 gap-px border bg-border">
        <div className="bg-surface px-4 py-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Matched</div>
          <div className="tabular mt-1 text-2xl font-medium">{matched.length}</div>
          <div className="text-[11px] text-muted-foreground">Present on both sides</div>
        </div>
        <div className="bg-surface px-4 py-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Local only
          </div>
          <div
            className={`tabular mt-1 text-2xl font-medium ${localOnly.length ? "text-status-pending" : ""}`}
          >
            {localOnly.length}
          </div>
          <div className="text-[11px] text-muted-foreground">In our ledger, unknown to Nomba</div>
        </div>
        <div className="bg-surface px-4 py-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Provider only
          </div>
          <div
            className={`tabular mt-1 text-2xl font-medium ${nombaOnly.length ? "text-status-pending" : ""}`}
          >
            {nombaOnly.length}
          </div>
          <div className="text-[11px] text-muted-foreground">At Nomba, missing locally</div>
        </div>
      </div>

      {balanced ? (
        <div className="border bg-surface px-4 py-12 text-center">
          <div className="text-[13px] font-medium">The register is balanced</div>
          <p className="mx-auto mt-1 max-w-sm text-[12px] text-muted-foreground">
            Every virtual account in the local ledger exists at the provider, and vice versa.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <ExceptionTable
            title="Local only"
            items={localOnly.map((l) => ({
              nuban: l.nuban,
              name: l.account_name,
              status: l.status,
            }))}
          />
          <ExceptionTable
            title="Provider only"
            items={nombaOnly.map((n) => ({
              nuban: n.nuban!,
              name: n.account_name,
              status: n.status,
            }))}
          />
        </div>
      )}
    </>
  );
}

function ExceptionTable({
  title,
  items,
}: {
  title: string;
  items: { nuban: string; name?: string; status?: string }[];
}) {
  return (
    <div className="border bg-surface">
      <div className="border-b px-4 py-3">
        <h2 className="text-[13px] font-medium">{title}</h2>
      </div>
      {items.length === 0 ? (
        <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
          No exceptions.
        </div>
      ) : (
        <ul>
          {items.map((it) => (
            <li key={it.nuban} className="ledger-rule flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="tabular text-[13px]">{it.nuban}</div>
                <div className="truncate text-[11px] text-muted-foreground">{it.name ?? "—"}</div>
              </div>
              {it.status && <StatusPill status={it.status} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
