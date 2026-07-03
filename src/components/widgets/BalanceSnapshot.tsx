import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, ShieldAlert, Wallet } from "lucide-react";
import { suspenseQuery, transactionsQuery, virtualAccountsQuery } from "@/data/queries";
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

export function BalanceSnapshot() {
  const { data: txPage } = useSuspenseQuery(transactionsQuery);
  const { data: vaPage } = useSuspenseQuery(virtualAccountsQuery);
  const { data: suspensePage } = useSuspenseQuery(suspenseQuery);

  const txs = txPage.data ?? [];
  const vas = vaPage.data ?? [];
  const openSuspense = (suspensePage.data ?? []).filter((s) => s.status === "open");

  const dayAgo = Date.now() - 24 * 3600_000;
  const recent = txs.filter(
    (t) => new Date(t.occurred_at).getTime() > dayAgo && t.status === "posted",
  );
  const inflow = recent
    .filter((t) => t.direction === "credit")
    .reduce((s, t) => s + t.amount_kobo, 0);
  const outflow = recent
    .filter((t) => t.direction === "debit")
    .reduce((s, t) => s + t.amount_kobo, 0);
  const activeVAs = vas.filter((v) => v.status === "ACTIVE").length;

  const stats: Stat[] = [
    {
      label: "Active virtual accounts",
      value: activeVAs.toString().padStart(2, "0"),
      context: `${vas.length} provisioned in total`,
      icon: Wallet,
    },
    {
      label: "Inflows · 24h",
      value: formatNaira(inflow),
      context: `${recent.filter((t) => t.direction === "credit").length} credits posted`,
      icon: ArrowDownRight,
      tone: "credit",
    },
    {
      label: "Outflows · 24h",
      value: formatNaira(outflow),
      context: `${recent.filter((t) => t.direction === "debit").length} debits posted`,
      icon: ArrowUpRight,
      tone: "debit",
    },
    {
      label: "Suspense",
      value: openSuspense.length.toString().padStart(2, "0"),
      context: openSuspense.length
        ? `${formatNaira(openSuspense.reduce((s, i) => s + i.amount_kobo, 0))} awaiting resolution`
        : "Nothing requires attention",
      icon: ShieldAlert,
      tone: openSuspense.length ? "pending" : "neutral",
    },
  ];

  return (
    <div className="grid grid-cols-1 overflow-hidden border sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <StatCard key={s.label} s={s} />
      ))}
    </div>
  );
}
