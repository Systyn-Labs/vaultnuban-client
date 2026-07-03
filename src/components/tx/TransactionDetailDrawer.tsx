import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useUi } from "@/state/uiStore";
import { transactionQuery } from "@/data/queries";
import { StatusPill } from "./StatusPill";
import { formatDateTime, formatNaira } from "@/lib/format";

export function TransactionDetailDrawer() {
  const txId = useUi((s) => s.detailTxId);
  const close = useUi((s) => s.closeDetail);
  const { data: tx, isLoading } = useQuery({ ...transactionQuery(txId ?? ""), enabled: !!txId });

  return (
    <Sheet open={!!txId} onOpenChange={(o) => !o && close()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-base">Transaction</SheetTitle>
        </SheetHeader>

        {isLoading && <div className="mt-6 h-40 animate-pulse border bg-surface-muted" />}

        {tx && (
          <div className="mt-4 space-y-6">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {tx.direction === "credit" ? "Amount received" : "Amount debited"}
              </div>
              <div
                className={`tabular mt-1 text-3xl font-medium ${tx.direction === "credit" ? "text-credit" : ""}`}
              >
                {tx.direction === "credit" ? "+" : "−"}
                {formatNaira(tx.amount_kobo)}
              </div>
              <div className="mt-2">
                <StatusPill status={tx.status} />
              </div>
            </div>

            <section>
              <h3 className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                Evidence
              </h3>
              <dl className="space-y-2 border p-3 text-[12px]">
                <Row k="Transaction ID" v={tx.id} mono />
                {tx.session_id && <Row k="Session ID" v={tx.session_id} mono />}
                {tx.nuban && <Row k="NUBAN" v={tx.nuban} mono />}
                <Row k="Direction" v={tx.direction} />
                <Row
                  k="Source"
                  v={tx.source === "webhook" ? "Webhook (real-time)" : "Sweep (reconciliation)"}
                />
                <Row k="Occurred" v={formatDateTime(tx.occurred_at)} />
              </dl>
            </section>

            {(tx.sender_name || tx.sender_bank || tx.narration) && (
              <section>
                <h3 className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                  Counterparty
                </h3>
                <dl className="space-y-2 border p-3 text-[12px]">
                  {tx.sender_name && <Row k="Sender" v={tx.sender_name} />}
                  {tx.sender_bank && <Row k="Bank" v={tx.sender_bank} />}
                  {tx.narration && <Row k="Narration" v={tx.narration} />}
                </dl>
              </section>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{k}</dt>
      <dd className={`min-w-0 truncate text-right ${mono ? "tabular" : ""}`}>{v}</dd>
    </div>
  );
}
