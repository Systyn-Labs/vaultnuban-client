import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BalanceSnapshot } from "@/components/widgets/BalanceSnapshot";
import { QuickActions } from "@/components/widgets/QuickActions";
import { TransactionFeed } from "@/components/widgets/TransactionFeed";
import { VaultAccountPanel } from "@/components/widgets/VaultAccountPanel";
import { IntelligenceChart } from "@/components/widgets/IntelligenceChart";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Dashboard · VaultNUBAN" },
      {
        name: "description",
        content: "Ledger-first financial control surface for VaultNUBAN operators.",
      },
    ],
  }),
  component: DashboardHome,
});

function Skeleton({ h = "h-32" }: { h?: string }) {
  return <div className={`animate-pulse border bg-surface ${h}`} />;
}

function DashboardHome() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Overview
          </div>
          <h1 className="mt-1 text-xl font-medium tracking-tight">Financial state</h1>
        </div>
        <div className="text-[11px] text-muted-foreground">
          Reconciled · <span className="tabular">09:32 UTC</span>
        </div>
      </header>

      <Suspense fallback={<Skeleton h="h-28" />}>
        <BalanceSnapshot />
      </Suspense>

      <div className="mt-6">
        <QuickActions />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Suspense fallback={<Skeleton h="h-72" />}>
            <IntelligenceChart />
          </Suspense>
          <Suspense fallback={<Skeleton h="h-96" />}>
            <TransactionFeed limit={8} />
          </Suspense>
        </div>
        <div>
          <Suspense fallback={<Skeleton h="h-64" />}>
            <VaultAccountPanel />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
