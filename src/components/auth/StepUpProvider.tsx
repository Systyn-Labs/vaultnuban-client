import { useCallback, useState } from "react";
import { create } from "zustand";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { vn } from "@/data/client";
import { mfaStatusQuery } from "@/data/queries";

interface StepUpState {
  open: boolean;
  resolve: ((token: string) => void) | null;
  reject: ((err: Error) => void) | null;
  request: (resolve: (token: string) => void, reject: (err: Error) => void) => void;
  settle: () => void;
}

// A single shared dialog instance backs every gated mutation in the app —
// requireStepUp() opens it and awaits the promise it wires up here.
const useStepUpStore = create<StepUpState>((set) => ({
  open: false,
  resolve: null,
  reject: null,
  request: (resolve, reject) => set({ open: true, resolve, reject }),
  settle: () => set({ open: false, resolve: null, reject: null }),
}));

/**
 * Returns `requireStepUp()`, an async function that resolves to a single-use
 * step-up token once the user completes a fresh MFA challenge. If the user
 * hasn't enrolled in MFA yet, it redirects to Settings and rejects instead of
 * prompting for a code — enrollment is mandatory, there is no bypass.
 */
export function useRequireStepUp() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const request = useStepUpStore((s) => s.request);

  return useCallback(async (): Promise<string> => {
    const status = qc.getQueryData(mfaStatusQuery.queryKey) ?? (await qc.fetchQuery(mfaStatusQuery));
    if (!status.enabled) {
      navigate({ to: "/settings" });
      throw new Error("Two-factor authentication is required for this action. Please finish setting it up.");
    }
    return new Promise<string>((resolve, reject) => request(resolve, reject));
  }, [qc, navigate, request]);
}

/** Rendered once at the app root; renders the code-entry dialog on demand. */
export function StepUpDialog() {
  const open = useStepUpStore((s) => s.open);
  const resolve = useStepUpStore((s) => s.resolve);
  const reject = useStepUpStore((s) => s.reject);
  const settle = useStepUpStore((s) => s.settle);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setCode("");
    setError(null);
    setBusy(false);
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const { step_up_token } = await vn().mfa.verify({ code });
      resolve?.(step_up_token);
      settle();
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setBusy(false);
    }
  }

  function cancel() {
    reject?.(new Error("Step-up verification was cancelled"));
    settle();
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && cancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" /> Confirm it's you
          </DialogTitle>
          <DialogDescription>
            This action affects a real account record. Enter a code from your authenticator app, or
            a recovery code.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 py-2">
          <Label htmlFor="step-up-code">Authentication code</Label>
          <Input
            id="step-up-code"
            autoComplete="one-time-code"
            autoFocus
            placeholder="123456 or XXXX-XXXX"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === "Enter" && code.length > 0 && !busy) submit();
            }}
          />
        </div>

        {error && (
          <div className="border border-status-failed/40 bg-status-failed-soft px-3 py-2 text-[12px] text-status-failed">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={cancel} disabled={busy}>
            Cancel
          </Button>
          <Button className="flex-1 gap-1.5" onClick={submit} disabled={busy || code.length === 0}>
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Verify
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
