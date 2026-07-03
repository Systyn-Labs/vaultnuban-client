import { Suspense, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { tierLimitsQuery } from "@/data/queries";
import { adminHttp } from "@/data/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_app/admin/settings")({
  head: () => ({ meta: [{ title: "Tier Limits · VaultNUBAN" }] }),
  component: () => (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
      <Suspense fallback={<div className="h-96 animate-pulse border bg-surface" />}>
        <SettingsPage />
      </Suspense>
    </div>
  ),
});

type Limits = Record<string, { daily_credit_kobo: number; max_balance_kobo: number }>;

function SettingsPage() {
  const { data } = useSuspenseQuery(tierLimitsQuery);
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Limits>({});

  useEffect(() => {
    setDraft(structuredClone(data ?? {}));
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      adminHttp().request<unknown>("PUT", "/internal/settings/tier-limits", { body: draft }),
    onSuccess: () => {
      toast.success("Tier limits saved");
      qc.invalidateQueries({ queryKey: ["internal", "tier-limits"] });
    },
    onError: (e) =>
      toast.error("Save failed", { description: e instanceof Error ? e.message : undefined }),
  });

  const tiers = Object.keys(draft).sort();

  return (
    <>
      <header className="mb-6">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Settings</div>
        <h1 className="mt-1 text-xl font-medium tracking-tight">KYC tier limits</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">
          CBN-aligned caps per tier, in kobo. A credit that would breach a cap routes to suspense
          instead of the customer wallet. Zero means uncapped.
        </p>
      </header>

      <div className="max-w-2xl border bg-surface">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Tier</th>
              <th className="px-4 py-2.5 font-medium">Daily credit cap (kobo)</th>
              <th className="px-4 py-2.5 font-medium">Max balance (kobo)</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((tier) => (
              <tr key={tier} className="ledger-rule">
                <td className="px-4 py-3 font-medium">Tier {tier}</td>
                <td className="px-4 py-3">
                  <Input
                    inputMode="numeric"
                    className="tabular h-8"
                    value={draft[tier]?.daily_credit_kobo ?? 0}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        [tier]: { ...d[tier], daily_credit_kobo: Number(e.target.value) || 0 },
                      }))
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <Input
                    inputMode="numeric"
                    className="tabular h-8"
                    value={draft[tier]?.max_balance_kobo ?? 0}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        [tier]: { ...d[tier], max_balance_kobo: Number(e.target.value) || 0 },
                      }))
                    }
                  />
                </td>
              </tr>
            ))}
            {tiers.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-12 text-center text-[12px] text-muted-foreground"
                >
                  No tier limits configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="border-t px-4 py-3">
          <Button
            size="sm"
            className="gap-1.5"
            disabled={save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save limits
          </Button>
        </div>
      </div>
    </>
  );
}
