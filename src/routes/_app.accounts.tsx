import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Copy, PauseCircle, PlayCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { virtualAccountsQuery } from "@/data/queries";
import { vn } from "@/data/client";
import { formatDateTime, maskNuban } from "@/lib/format";
import { StatusPill } from "@/components/tx/StatusPill";
import { useUi } from "@/state/uiStore";
import { useRequireStepUp } from "@/components/auth/StepUpProvider";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_app/accounts")({
  head: () => ({ meta: [{ title: "Virtual Accounts · VaultNUBAN" }] }),
  component: () => (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
      <Suspense fallback={<div className="h-96 animate-pulse border bg-surface" />}>
        <AccountsPage />
      </Suspense>
    </div>
  ),
});

function AccountsPage() {
  const { data: page } = useSuspenseQuery(virtualAccountsQuery);
  const openStatement = useUi((s) => s.openStatement);
  const qc = useQueryClient();
  const requireStepUp = useRequireStepUp();
  const vas = page.data ?? [];

  const update = useMutation({
    mutationFn: async ({ customerId, status }: { customerId: string; status: "ACTIVE" | "SUSPENDED" }) => {
      const stepUpToken = await requireStepUp();
      return vn().virtualAccounts.update(customerId, { status }, { stepUpToken });
    },
    onSuccess: (_, v) => {
      toast.success(v.status === "SUSPENDED" ? "Account suspended" : "Account reactivated");
      qc.invalidateQueries({ queryKey: ["virtual-accounts"] });
    },
    onError: (e) =>
      toast.error("Update failed", { description: e instanceof Error ? e.message : undefined }),
  });

  const close = useMutation({
    mutationFn: async (customerId: string) => {
      const stepUpToken = await requireStepUp();
      return vn().virtualAccounts.close(customerId, { stepUpToken });
    },
    onSuccess: () => {
      toast.success("Account closed", { description: "Incoming payments now route to suspense." });
      qc.invalidateQueries({ queryKey: ["virtual-accounts"] });
    },
    onError: (e) =>
      toast.error("Close failed", { description: e instanceof Error ? e.message : undefined }),
  });

  return (
    <>
      <header className="mb-6">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Accounts</div>
        <h1 className="mt-1 text-xl font-medium tracking-tight">Virtual accounts</h1>
      </header>

      {vas.length === 0 ? (
        <div className="border bg-surface px-4 py-16 text-center">
          <div className="text-[13px] font-medium">No virtual accounts</div>
          <p className="mx-auto mt-1 max-w-sm text-[12px] text-muted-foreground">
            Provision a NUBAN from the customer register — each customer gets one dedicated account.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {vas.map((va) => (
            <div key={va.id} className="flex flex-col border bg-surface">
              <div className="flex items-start justify-between px-4 pt-4">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium">
                    {va.customer_display_name ?? va.account_name}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{va.bank_name}</div>
                </div>
                <StatusPill status={va.status} />
              </div>
              <div className="px-4 py-3">
                <div className="tabular flex items-center gap-2 text-lg">
                  {maskNuban(va.nuban)}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(va.nuban);
                      toast.success("NUBAN copied", { description: va.nuban });
                    }}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Copy NUBAN"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="tabular mt-1 text-[11px] text-muted-foreground">
                  Ref {va.account_ref} · Created {formatDateTime(va.created_at)}
                </div>
              </div>
              <div className="mt-auto flex items-center gap-1 border-t px-2 py-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[11px] uppercase tracking-widest"
                  onClick={() => openStatement(va.customer_id)}
                >
                  Ledger
                </Button>
                {va.status === "ACTIVE" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-[11px] uppercase tracking-widest"
                    onClick={() =>
                      update.mutate({ customerId: va.customer_id, status: "SUSPENDED" })
                    }
                  >
                    <PauseCircle className="h-3 w-3" /> Suspend
                  </Button>
                )}
                {va.status === "SUSPENDED" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-[11px] uppercase tracking-widest"
                    onClick={() => update.mutate({ customerId: va.customer_id, status: "ACTIVE" })}
                  >
                    <PlayCircle className="h-3 w-3" /> Reactivate
                  </Button>
                )}
                {va.status !== "CLOSED" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto gap-1 text-[11px] uppercase tracking-widest text-status-failed hover:text-status-failed"
                      >
                        <XCircle className="h-3 w-3" /> Close
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Close this virtual account?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Closure is permanent. Payments sent to {va.nuban} after closure are routed
                          to suspense for manual resolution.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep account</AlertDialogCancel>
                        <AlertDialogAction onClick={() => close.mutate(va.customer_id)}>
                          Close account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
