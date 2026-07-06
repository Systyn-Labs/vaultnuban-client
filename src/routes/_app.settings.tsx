import { Suspense, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Download, Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { mfaStatusQuery } from "@/data/queries";
import { vn } from "@/data/client";
import { useSession } from "@/data/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MFASetupResponse } from "@systynlabs/vaultnuban";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Security settings · VaultNUBAN" }] }),
  component: () => (
    <div className="mx-auto max-w-[720px] px-4 py-6 md:px-8 md:py-8">
      <Suspense fallback={<div className="h-96 animate-pulse border bg-surface" />}>
        <SecuritySettingsPage />
      </Suspense>
    </div>
  ),
});

function SecuritySettingsPage() {
  const { data: status } = useSuspenseQuery(mfaStatusQuery);

  return (
    <>
      <header className="mb-6">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Settings</div>
        <h1 className="mt-1 text-xl font-medium tracking-tight">Security</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Two-factor authentication is required to provision, rename, suspend, or close a virtual
          account, and to initiate withdrawals. You can disable it, but you'll need to re-enroll
          before you can perform any of those actions again.
        </p>
      </header>

      {status.enabled ? (
        <EnrolledPanel recoveryCodesRemaining={status.recovery_codes_remaining} />
      ) : (
        <EnrollmentPanel />
      )}
    </>
  );
}

function EnrolledPanel({ recoveryCodesRemaining }: { recoveryCodesRemaining: number }) {
  const [regenerating, setRegenerating] = useState(false);
  const [code, setCode] = useState("");
  const [newCodes, setNewCodes] = useState<string[] | null>(null);
  const [disableOpen, setDisableOpen] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const qc = useQueryClient();
  const setMfaEnabled = useSession((s) => s.setMfaEnabled);

  const regenerate = useMutation({
    mutationFn: () => vn().mfa.regenerateRecoveryCodes({ code }),
    onSuccess: (r) => {
      setNewCodes(r.recovery_codes);
      setCode("");
      qc.invalidateQueries({ queryKey: mfaStatusQuery.queryKey });
    },
    onError: (e) =>
      toast.error("Could not regenerate recovery codes", {
        description: e instanceof Error ? e.message : undefined,
      }),
  });

  const disable = useMutation({
    mutationFn: () =>
      vn().http.post<{ enabled: boolean }>("/v1/mfa/disable", { code: disableCode }),
    onSuccess: () => {
      toast.success("Two-factor authentication disabled", {
        description: "Re-enroll before provisioning/managing accounts or withdrawing funds.",
      });
      setMfaEnabled(false);
      setDisableOpen(false);
      setDisableCode("");
      qc.invalidateQueries({ queryKey: mfaStatusQuery.queryKey });
    },
    onError: (e) =>
      toast.error("Invalid code", { description: e instanceof Error ? e.message : undefined }),
  });

  return (
    <div className="max-w-lg space-y-4 border bg-surface p-5">
      <div className="flex items-center gap-2 text-[13px] font-medium text-credit">
        <ShieldCheck className="h-4 w-4" /> Two-factor authentication is enabled
      </div>
      <p className="text-[12px] text-muted-foreground">
        This account requires a fresh authenticator code (or a recovery code) before any action
        that creates or changes a virtual account, or moves money.
      </p>
      <div className="border bg-surface-muted px-3 py-2 text-[12px]">
        <span className="text-muted-foreground">Unused recovery codes </span>
        <span className="tabular font-medium">{recoveryCodesRemaining}</span>
      </div>

      {newCodes ? (
        <RecoveryCodesDisplay codes={newCodes} onDone={() => setNewCodes(null)} />
      ) : regenerating ? (
        <div className="space-y-2">
          <Label htmlFor="regen-code">Enter a current authenticator code to confirm</Label>
          <Input
            id="regen-code"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setRegenerating(false)}>
              Cancel
            </Button>
            <Button
              className="gap-1.5"
              disabled={regenerate.isPending || code.length === 0}
              onClick={() => regenerate.mutate()}
            >
              {regenerate.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Confirm
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setRegenerating(true)}>
            Regenerate recovery codes
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-status-failed hover:text-status-failed"
            onClick={() => setDisableOpen(true)}
          >
            Disable two-factor authentication
          </Button>
        </div>
      )}

      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Disable two-factor authentication?</DialogTitle>
          </DialogHeader>
          <p className="text-[12px] text-muted-foreground">
            You won't be able to provision or manage virtual accounts, or initiate withdrawals,
            until you re-enroll.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="disable-code">Enter a current authenticator or recovery code</Label>
            <Input
              id="disable-code"
              placeholder="123456"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setDisableOpen(false);
                setDisableCode("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1 gap-1.5"
              disabled={disable.isPending || disableCode.length === 0}
              onClick={() => disable.mutate()}
            >
              {disable.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Disable
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EnrollmentPanel() {
  const qc = useQueryClient();
  const setMfaEnabled = useSession((s) => s.setMfaEnabled);
  const [setup, setSetup] = useState<MFASetupResponse | null>(null);
  const [code, setCode] = useState("");
  const [saved, setSaved] = useState(false);

  const beginSetup = useMutation({
    mutationFn: () => vn().mfa.setup(),
    onSuccess: (r) => setSetup(r),
    onError: (e) =>
      toast.error("Could not start enrollment", {
        description: e instanceof Error ? e.message : undefined,
      }),
  });

  const confirm = useMutation({
    mutationFn: () => vn().mfa.enable({ code }),
    onSuccess: () => {
      toast.success("Two-factor authentication is now required for this account");
      setMfaEnabled(true);
      qc.invalidateQueries({ queryKey: mfaStatusQuery.queryKey });
    },
    onError: (e) =>
      toast.error("Invalid code", { description: e instanceof Error ? e.message : undefined }),
  });

  if (!setup) {
    return (
      <div className="max-w-lg space-y-4 border bg-surface p-5">
        <div className="flex items-center gap-2 text-[13px] font-medium text-status-failed">
          <ShieldOff className="h-4 w-4" /> Two-factor authentication is not set up
        </div>
        <p className="text-[12px] text-muted-foreground">
          This is required before you can provision or manage virtual accounts, or initiate
          withdrawals. Set it up now with an authenticator app such as Google Authenticator, Authy,
          or 1Password.
        </p>
        <Button
          className="gap-1.5"
          disabled={beginSetup.isPending}
          onClick={() => beginSetup.mutate()}
        >
          {beginSetup.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Set up two-factor authentication
        </Button>
      </div>
    );
  }

  if (!saved) {
    return <RecoveryCodesDisplay codes={setup.recovery_codes} onDone={() => setSaved(true)} />;
  }

  return (
    <div className="max-w-lg space-y-4 border bg-surface p-5">
      <h2 className="text-[13px] font-medium">Scan with your authenticator app</h2>
      <div className="flex justify-center border bg-white p-4">
        <QRCodeSVG value={setup.otpauth_url} size={176} />
      </div>
      <div className="space-y-1.5">
        <Label>Can't scan? Enter this key manually</Label>
        <div className="flex items-center gap-2">
          <Input readOnly value={setup.secret} className="tabular text-[12px]" />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={() => {
              navigator.clipboard.writeText(setup.secret);
              toast.success("Secret copied");
            }}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm-code">Enter the 6-digit code to confirm</Label>
        <Input
          id="confirm-code"
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </div>
      <Button
        className="w-full gap-1.5"
        disabled={confirm.isPending || code.length === 0}
        onClick={() => confirm.mutate()}
      >
        {confirm.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Confirm and enable
      </Button>
    </div>
  );
}

function RecoveryCodesDisplay({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  function download() {
    const blob = new Blob([codes.join("\n") + "\n"], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vaultnuban-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-lg space-y-4 border bg-surface p-5">
      <div className="border border-status-failed/40 bg-status-failed-soft px-3 py-2 text-[12px] text-status-failed">
        Save these recovery codes now — they are shown only once. Each can be used a single time if
        you lose access to your authenticator app.
      </div>
      <div className="grid grid-cols-2 gap-2 border bg-surface-muted p-3 font-mono text-[13px]">
        {codes.map((c) => (
          <div key={c} className="tabular">
            {c}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1 gap-1.5" onClick={download}>
          <Download className="h-3.5 w-3.5" /> Download
        </Button>
        <Button
          variant="secondary"
          className="flex-1 gap-1.5"
          onClick={() => {
            navigator.clipboard.writeText(codes.join("\n"));
            toast.success("Recovery codes copied");
          }}
        >
          <Copy className="h-3.5 w-3.5" /> Copy
        </Button>
      </div>
      <Button className="w-full" onClick={onDone}>
        I've saved these codes
      </Button>
    </div>
  );
}
