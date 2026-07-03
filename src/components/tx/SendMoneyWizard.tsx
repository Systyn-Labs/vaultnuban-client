import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUi } from "@/state/uiStore";
import { vn } from "@/data/client";
import { balanceQuery, customersQuery } from "@/data/queries";
import { formatNaira } from "@/lib/format";
import type { PayeeResolution } from "@/domain/types";

// Bank codes surfaced in the picker; the API accepts any CBN bank code.
const BANKS = [
  { code: "044", name: "Access Bank" },
  { code: "058", name: "GTBank" },
  { code: "057", name: "Zenith Bank" },
  { code: "011", name: "First Bank" },
  { code: "033", name: "UBA" },
  { code: "232", name: "Sterling Bank" },
  { code: "070", name: "Fidelity Bank" },
  { code: "50515", name: "Moniepoint MFB" },
  { code: "999992", name: "OPay" },
  { code: "090645", name: "Nomba MFB" },
];

type Step = "source" | "destination" | "amount" | "review";

export function SendMoneyWizard() {
  const open = useUi((s) => s.sendMoneyOpen);
  const close = useUi((s) => s.closeSendMoney);
  const qc = useQueryClient();

  const [step, setStep] = useState<Step>("source");
  const [customerId, setCustomerId] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [resolved, setResolved] = useState<PayeeResolution | null>(null);
  const [amount, setAmount] = useState(""); // naira string
  const [narration, setNarration] = useState("");

  const customers = useQuery({ ...customersQuery, enabled: open });
  const balance = useQuery({ ...balanceQuery(customerId), enabled: open && !!customerId });

  const amountKobo = useMemo(() => {
    const f = parseFloat(amount);
    return Number.isFinite(f) ? Math.round(f * 100) : 0;
  }, [amount]);

  const resolve = useMutation({
    mutationFn: () => vn().withdrawals.resolvePayee(bankCode, accountNumber),
    onSuccess: (r) => {
      setResolved(r);
      setStep("amount");
    },
    onError: (e) =>
      toast.error("Account could not be verified", {
        description: e instanceof Error ? e.message : undefined,
      }),
  });

  const submit = useMutation({
    mutationFn: () =>
      vn().withdrawals.create(customerId, {
        amount_kobo: amountKobo,
        destination_bank_code: bankCode,
        destination_account_number: resolved?.account_number ?? accountNumber,
        destination_account_name: resolved?.account_name ?? "",
        narration: narration || undefined,
      }),
    onSuccess: (w) => {
      toast.success("Withdrawal initiated", {
        description: `Reference ${w.id} · ${formatNaira(w.amount_kobo)}`,
      });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["balance", customerId] });
      qc.invalidateQueries({ queryKey: ["withdrawals", customerId] });
      reset();
      close();
    },
    onError: (e) =>
      toast.error("Withdrawal failed", {
        description: e instanceof Error ? e.message : undefined,
      }),
  });

  function reset() {
    setStep("source");
    setCustomerId("");
    setBankCode("");
    setAccountNumber("");
    setResolved(null);
    setAmount("");
    setNarration("");
  }

  const balanceKobo = balance.data?.balance_kobo ?? 0;
  const insufficient = !!balance.data && amountKobo > balanceKobo;
  const steps: Step[] = ["source", "destination", "amount", "review"];

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          close();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Send money</DialogTitle>
          <div className="flex items-center gap-1 pt-1">
            {steps.map((s, i) => (
              <div
                key={s}
                className={`h-0.5 flex-1 ${steps.indexOf(step) >= i ? "bg-primary" : "bg-border"}`}
              />
            ))}
          </div>
        </DialogHeader>

        {step === "source" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Source customer wallet</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose customer" />
                </SelectTrigger>
                <SelectContent>
                  {(customers.data?.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Funds leave this customer's wallet balance.
              </p>
            </div>
            {customerId && (
              <div className="border bg-surface-muted px-3 py-2 text-[12px]">
                <span className="text-muted-foreground">Available balance </span>
                <span className="tabular font-medium">
                  {balance.isLoading ? "…" : formatNaira(balanceKobo)}
                </span>
              </div>
            )}
            <Button
              className="w-full gap-1"
              disabled={!customerId}
              onClick={() => setStep("destination")}
            >
              Continue <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {step === "destination" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Destination bank</Label>
              <Select value={bankCode} onValueChange={setBankCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose bank" />
                </SelectTrigger>
                <SelectContent>
                  {BANKS.map((b) => (
                    <SelectItem key={b.code} value={b.code}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acct">Account number</Label>
              <Input
                id="acct"
                inputMode="numeric"
                maxLength={10}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
              />
              <p className="text-[11px] text-muted-foreground">
                The account name is verified with the bank before you continue.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep("source")}>
                Back
              </Button>
              <Button
                className="flex-1 gap-1"
                disabled={!bankCode || accountNumber.length !== 10 || resolve.isPending}
                onClick={() => resolve.mutate()}
              >
                {resolve.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Verify account
              </Button>
            </div>
          </div>
        )}

        {step === "amount" && (
          <div className="space-y-4">
            <div className="border bg-credit-soft px-3 py-2 text-[12px]">
              <div className="flex items-center gap-1.5 font-medium text-credit">
                <Check className="h-3.5 w-3.5" /> {resolved?.account_name}
              </div>
              <div className="tabular text-muted-foreground">
                {accountNumber} · {BANKS.find((b) => b.code === bankCode)?.name}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amt">Amount (₦)</Label>
              <Input
                id="amt"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <p
                className={`text-[11px] ${insufficient ? "text-status-failed" : "text-muted-foreground"}`}
              >
                {insufficient
                  ? `Exceeds available balance of ${formatNaira(balanceKobo)}`
                  : `Available: ${formatNaira(balanceKobo)}`}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref">Narration (optional)</Label>
              <Input id="ref" value={narration} onChange={(e) => setNarration(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep("destination")}>
                Back
              </Button>
              <Button
                className="flex-1"
                disabled={amountKobo <= 0 || insufficient}
                onClick={() => setStep("review")}
              >
                Review
              </Button>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <dl className="space-y-2 border bg-surface-muted p-3 text-[12px]">
              <Row
                k="From"
                v={
                  (customers.data?.data ?? []).find((c) => c.id === customerId)?.display_name ??
                  customerId
                }
              />
              <Row k="To" v={`${resolved?.account_name} · ${accountNumber}`} />
              <Row k="Bank" v={BANKS.find((b) => b.code === bankCode)?.name ?? bankCode} />
              <Row k="Amount" v={formatNaira(amountKobo)} mono />
              {narration && <Row k="Narration" v={narration} />}
            </dl>
            <p className="text-[11px] text-muted-foreground">
              This transfer is executed immediately and cannot be recalled. The request carries an
              idempotency key — retrying is safe.
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep("amount")}>
                Back
              </Button>
              <Button
                className="flex-1 gap-1.5"
                disabled={submit.isPending}
                onClick={() => submit.mutate()}
              >
                {submit.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm transfer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className={mono ? "tabular font-medium" : "text-right font-medium"}>{v}</dd>
    </div>
  );
}
