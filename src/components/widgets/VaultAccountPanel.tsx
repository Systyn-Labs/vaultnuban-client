import { useSuspenseQuery } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { virtualAccountsQuery } from "@/data/queries";
import { maskNuban } from "@/lib/format";
import { StatusPill } from "@/components/tx/StatusPill";
import { useUi } from "@/state/uiStore";
import { Link } from "@tanstack/react-router";

export function VaultAccountPanel() {
  const { data: page } = useSuspenseQuery(virtualAccountsQuery);
  const openStatement = useUi((s) => s.openStatement);
  const vas = (page.data ?? []).slice(0, 6);

  return (
    <div className="border bg-surface">
      <div className="flex items-baseline justify-between border-b px-4 py-3">
        <h2 className="text-[13px] font-medium">Virtual accounts</h2>
        <Link
          to="/accounts"
          className="text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          All →
        </Link>
      </div>
      {vas.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <div className="text-[13px] font-medium">No virtual accounts</div>
          <p className="mx-auto mt-1 max-w-xs text-[12px] text-muted-foreground">
            Onboard a customer to provision their dedicated NUBAN.
          </p>
          <Link
            to="/customers"
            className="mt-3 inline-block text-[12px] font-medium text-primary hover:underline"
          >
            Onboard customer →
          </Link>
        </div>
      ) : (
        <ul>
          {vas.map((va) => (
            <li key={va.id} className="ledger-rule flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <button
                  onClick={() => openStatement(va.customer_id)}
                  className="block truncate text-left text-[13px] font-medium hover:underline"
                >
                  {va.customer_display_name ?? va.account_name}
                </button>
                <div className="tabular flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  {maskNuban(va.nuban)}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(va.nuban);
                      toast.success("NUBAN copied", { description: va.nuban });
                    }}
                    className="hover:text-foreground"
                    aria-label="Copy NUBAN"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <span>·</span>
                  <span className="truncate">{va.bank_name}</span>
                </div>
              </div>
              <StatusPill status={va.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
