import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useUi } from "@/state/uiStore";

// /send exists as a sidebar entry but the flow itself is modal (DXS §5.1).
// Landing here simply opens the wizard over the dashboard.
export const Route = createFileRoute("/_app/send")({
  head: () => ({ meta: [{ title: "Send Money · VaultNUBAN" }] }),
  component: SendPage,
});

function SendPage() {
  const openSend = useUi((s) => s.openSendMoney);
  useEffect(() => {
    openSend();
  }, [openSend]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
      <div className="border bg-surface px-4 py-12 text-center">
        <div className="text-[13px] font-medium">Send money</div>
        <p className="mx-auto mt-1 max-w-sm text-[12px] text-muted-foreground">
          Transfers run in the wizard so your context is preserved. Reopen it any time with the New
          Transaction button in the top bar.
        </p>
        <button
          onClick={openSend}
          className="mt-3 text-[12px] font-medium text-primary hover:underline"
        >
          Open transfer wizard →
        </button>
      </div>
    </div>
  );
}
