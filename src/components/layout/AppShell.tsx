import { type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { SendMoneyWizard } from "@/components/tx/SendMoneyWizard";
import { TransactionDetailDrawer } from "@/components/tx/TransactionDetailDrawer";
import { LedgerViewDrawer } from "@/components/accounts/LedgerViewDrawer";
import { ClientOnly } from "@/components/ClientOnly";
import { Toaster } from "@/components/ui/sonner";

function TopBarFallback() {
  return <div className="h-14 border-b bg-surface" />;
}

function ContentFallback() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
      <div className="h-28 animate-pulse border bg-surface" />
      <div className="mt-6 h-32 animate-pulse border bg-surface" />
      <div className="mt-6 h-96 animate-pulse border bg-surface" />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <ClientOnly fallback={<TopBarFallback />}>
          <TopBar />
        </ClientOnly>
        <main className="flex-1 overflow-x-hidden">
          <ClientOnly fallback={<ContentFallback />}>{children}</ClientOnly>
        </main>
      </div>
      <ClientOnly>
        <SendMoneyWizard />
        <TransactionDetailDrawer />
        <LedgerViewDrawer />
        <Toaster position="bottom-right" richColors />
      </ClientOnly>
    </div>
  );
}
