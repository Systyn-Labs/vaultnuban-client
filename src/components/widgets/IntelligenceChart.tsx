import { useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { transactionsQuery } from "@/data/queries";
import { formatNaira } from "@/lib/format";

export function IntelligenceChart() {
  const { data: page } = useSuspenseQuery(transactionsQuery);
  const txs = page.data ?? [];

  const series = useMemo(() => {
    const anchor = new Date();
    const days: { key: string; label: string; inflow: number; outflow: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(anchor);
      d.setDate(anchor.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({
        key,
        label: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
        inflow: 0,
        outflow: 0,
      });
    }
    const byDay = new Map(days.map((d) => [d.key, d]));
    for (const t of txs) {
      if (t.status !== "posted") continue;
      const d = byDay.get(t.occurred_at.slice(0, 10));
      if (!d) continue;
      if (t.direction === "credit") d.inflow += t.amount_kobo / 100;
      else d.outflow += t.amount_kobo / 100;
    }
    return days;
  }, [txs]);

  return (
    <div className="border bg-surface">
      <div className="flex items-baseline justify-between border-b px-4 py-3">
        <h2 className="text-[13px] font-medium">Flow · 14 day</h2>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Posted transactions
        </span>
      </div>
      <div className="h-64 px-2 pb-2 pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 5, right: 12, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="credit" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--credit)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--credit)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="debit" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--debit)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--debit)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="var(--muted-foreground)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--muted-foreground)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
              width={48}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                fontSize: 12,
                borderRadius: 4,
              }}
              formatter={(v: number) => formatNaira(Math.round(v * 100))}
            />
            <Area
              type="monotone"
              dataKey="inflow"
              stroke="var(--credit)"
              strokeWidth={1.5}
              fill="url(#credit)"
            />
            <Area
              type="monotone"
              dataKey="outflow"
              stroke="var(--debit)"
              strokeWidth={1.5}
              fill="url(#debit)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
