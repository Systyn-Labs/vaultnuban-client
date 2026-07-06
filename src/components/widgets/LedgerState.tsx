import { useSuspenseQuery } from "@tanstack/react-query";
import { CheckCircle2, Scale, XCircle } from "lucide-react";
import { ledgerHealthQuery } from "@/data/queries";
import { formatNaira } from "@/lib/format";

interface Stat {
  label: string;
  value: string;
  context: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "credit" | "debit" | "neutral" | "pending";
}

function StatCard({ s }: { s: Stat }) {
  const toneCls =
    s.tone === "credit"
      ? "text-credit"
      : s.tone === "debit"
        ? "text-debit"
        : s.tone === "pending"
          ? "text-status-pending"
          : "text-foreground";
  return (
    <div className="flex flex-col gap-3 border-r bg-surface px-6 py-5 last:border-r-0">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>{s.label}</span>
        <s.icon className="h-3.5 w-3.5" />
      </div>
      <div className={`tabular text-2xl font-medium leading-none ${toneCls}`}>{s.value}</div>
      <div className="text-[11px] text-muted-foreground">{s.context}</div>
    </div>
  );
}

// Demonstrates the core ledger invariant (Σ debits = Σ credits) for this
// tenant's own slice of the books — ops-only, mirrors the platform-wide
// admin health check but scoped to a single tenant.
export function LedgerState() {
  const { data } = useSuspenseQuery(ledgerHealthQuery);

  const stats: Stat[] = [
    {
      label: "Σ Debits",
      value: formatNaira(data.debits_kobo),
      context: "All debit-direction ledger entries",
      icon: Scale,
    },
    {
      label: "Σ Credits",
      value: formatNaira(data.credits_kobo),
      context: "All credit-direction ledger entries",
      icon: Scale,
    },
    {
      label: "Ledger state",
      value: data.balanced ? "Balanced" : "Out of balance",
      context: data.balanced
        ? "Σ debits = Σ credits, as expected"
        : "Discrepancy detected — contact support",
      icon: data.balanced ? CheckCircle2 : XCircle,
      tone: data.balanced ? "credit" : "debit",
    },
  ];

  return (
    <div className="grid grid-cols-1 overflow-hidden border sm:grid-cols-3">
      {stats.map((s) => (
        <StatCard key={s.label} s={s} />
      ))}
    </div>
  );
}
