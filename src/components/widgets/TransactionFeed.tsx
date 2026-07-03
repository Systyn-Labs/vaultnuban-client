import { useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { transactionsQuery } from "@/data/queries";
import { formatNaira, formatRelative } from "@/lib/format";
import { StatusPill } from "@/components/tx/StatusPill";
import { useUi } from "@/state/uiStore";
import type { Transaction } from "@/domain/types";
import { Link } from "@tanstack/react-router";

export function TransactionFeed({ limit }: { limit?: number }) {
  const { data: page } = useSuspenseQuery(transactionsQuery);
  const openDetail = useUi((s) => s.openDetail);
  const rows = useMemo(
    () => (limit ? (page.data ?? []).slice(0, limit) : (page.data ?? [])),
    [page, limit],
  );

  if (rows.length === 0) {
    return (
      <div className="border bg-surface">
        <div className="border-b px-4 py-3">
          <h2 className="text-[13px] font-medium">Recent activity</h2>
        </div>
        <div className="px-4 py-10 text-center">
          <div className="text-[13px] font-medium">No transactions yet</div>
          <p className="mx-auto mt-1 max-w-xs text-[12px] text-muted-foreground">
            Provision a virtual account and fund it with a bank transfer — credits appear here the
            moment they post.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border bg-surface">
      <div className="flex items-baseline justify-between border-b px-4 py-3">
        <h2 className="text-[13px] font-medium">Recent activity</h2>
        <Link
          to="/transactions"
          className="text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          View all →
        </Link>
      </div>
      <ul>
        {rows.map((tx) => (
          <li key={tx.id}>
            <button
              onClick={() => openDetail(tx.id)}
              className="ledger-rule flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-muted/50"
            >
              <TxIcon tx={tx} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 truncate text-[13px] font-medium">
                  {tx.sender_name ?? tx.narration ?? "Transfer"}
                </div>
                <div className="tabular flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="truncate">{tx.id}</span>
                  <span>·</span>
                  <span className="shrink-0">{formatRelative(tx.occurred_at)}</span>
                </div>
              </div>
              <div className="hidden md:block">
                <StatusPill status={tx.status} />
              </div>
              <div
                className={`tabular w-32 text-right text-sm ${
                  tx.direction === "credit" ? "text-credit" : "text-foreground"
                }`}
              >
                {tx.direction === "credit" ? "+" : "−"}
                {formatNaira(tx.amount_kobo)}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TxIcon({ tx }: { tx: Transaction }) {
  const isIn = tx.direction === "credit";
  return (
    <div
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-sm ${
        isIn ? "bg-credit-soft text-credit" : "bg-debit-soft text-debit"
      }`}
    >
      {isIn ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
    </div>
  );
}
