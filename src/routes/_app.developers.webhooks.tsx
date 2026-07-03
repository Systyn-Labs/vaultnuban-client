import { Suspense, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Loader2, RotateCcw, Webhook } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import type { WebhookDelivery } from "@/domain/types";
import { toast } from "sonner";
import { webhookDeliveriesQuery, webhookEndpointsQuery } from "@/data/queries";
import { vn } from "@/data/client";
import { formatDateTime, formatRelative } from "@/lib/format";
import { StatusPill } from "@/components/tx/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/developers/webhooks")({
  head: () => ({ meta: [{ title: "Webhooks · VaultNUBAN" }] }),
  component: () => (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
      <Suspense fallback={<div className="h-96 animate-pulse border bg-surface" />}>
        <WebhooksPage />
      </Suspense>
    </div>
  ),
});

function WebhooksPage() {
  const { data: endpointsPage } = useSuspenseQuery(webhookEndpointsQuery);
  const { data: deliveriesPage } = useSuspenseQuery(webhookDeliveriesQuery);
  const qc = useQueryClient();
  const endpoints = endpointsPage.data ?? [];
  const deliveries = deliveriesPage.data ?? [];

  const replay = useMutation({
    mutationFn: (id: string) => vn().webhooks.replayDelivery(id),
    onSuccess: () => {
      toast.success("Replay dispatched");
      qc.invalidateQueries({ queryKey: ["webhook-deliveries"] });
    },
    onError: (e) =>
      toast.error("Replay failed", { description: e instanceof Error ? e.message : undefined }),
  });

  const deliveryColumns = useMemo<ColumnDef<WebhookDelivery>[]>(
    () => [
      {
        accessorKey: "event_type",
        header: ({ column }) => <SortableHeader column={column}>Event</SortableHeader>,
      },
      {
        accessorKey: "status",
        header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
        cell: ({ row }) => <StatusPill status={row.original.status} />,
      },
      {
        accessorKey: "attempt",
        header: ({ column }) => <SortableHeader column={column}>Attempt</SortableHeader>,
        cell: ({ row }) => <span className="tabular text-[12px]">{row.original.attempt}</span>,
      },
      {
        accessorKey: "status_code",
        header: ({ column }) => <SortableHeader column={column}>HTTP</SortableHeader>,
        cell: ({ row }) => (
          <span className="tabular text-[12px]">{row.original.status_code ?? "—"}</span>
        ),
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => <SortableHeader column={column}>When</SortableHeader>,
        cell: ({ row }) => (
          <span className="tabular text-[12px] text-muted-foreground">
            {formatRelative(row.original.created_at)}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => null,
        cell: ({ row }) =>
          row.original.status === "failed" || row.original.status === "dead_letter" ? (
            <div className="text-right">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 text-[11px] uppercase tracking-widest"
                disabled={replay.isPending}
                onClick={() => replay.mutate(row.original.id)}
              >
                <RotateCcw className="h-3 w-3" /> Replay
              </Button>
            </div>
          ) : null,
      },
    ],
    [replay],
  );

  return (
    <>
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Developers
          </div>
          <h1 className="mt-1 text-xl font-medium tracking-tight">Webhooks</h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Payment events are signed with HMAC-SHA256 and delivered to every active endpoint.
            Failed deliveries retry with backoff before dead-lettering.
          </p>
        </div>
        <RegisterEndpointDialog />
      </header>

      <section className="mb-6 border bg-surface">
        <div className="border-b px-4 py-3">
          <h2 className="text-[13px] font-medium">Endpoints</h2>
        </div>
        {endpoints.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <Webhook className="mx-auto h-5 w-5 text-muted-foreground" />
            <div className="mt-2 text-[13px] font-medium">No endpoints registered</div>
            <p className="mx-auto mt-1 max-w-sm text-[12px] text-muted-foreground">
              Register an HTTPS endpoint to receive payment_success events. Verify each delivery
              with the SDK's constructEvent helper and your signing secret.
            </p>
          </div>
        ) : (
          <ul>
            {endpoints.map((ep) => (
              <li key={ep.id} className="ledger-rule flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="tabular truncate text-[13px]">{ep.url}</div>
                  <div className="text-[11px] text-muted-foreground">
                    Registered {formatDateTime(ep.created_at)}
                  </div>
                </div>
                <StatusPill status={ep.active ? "active" : "cancelled"} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-[13px] font-medium">Deliveries</h2>
        <DataTable
          columns={deliveryColumns}
          data={deliveries}
          searchPlaceholder="Search event, status…"
          initialSorting={[{ id: "created_at", desc: true }]}
          emptyState={
            <div className="border bg-surface px-4 py-12 text-center text-[12px] text-muted-foreground">
              No deliveries yet — they appear as soon as a payment event fires.
            </div>
          }
        />
      </section>
    </>
  );
}

function RegisterEndpointDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");

  const create = useMutation({
    mutationFn: () => vn().webhooks.createEndpoint({ url, secret }),
    onSuccess: () => {
      toast.success("Endpoint registered", {
        description: "Store the signing secret — it is never shown again.",
      });
      qc.invalidateQueries({ queryKey: ["webhook-endpoints"] });
      setOpen(false);
      setUrl("");
      setSecret("");
    },
    onError: (e) =>
      toast.error("Registration failed", {
        description: e instanceof Error ? e.message : undefined,
      }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Register endpoint</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Register webhook endpoint</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="wurl">Endpoint URL</Label>
            <Input
              id="wurl"
              type="url"
              required
              placeholder="https://"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Must return 2xx within 30 seconds to acknowledge delivery.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wsecret">Signing secret</Label>
            <Input
              id="wsecret"
              required
              minLength={16}
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Used to verify X-VaultNUBAN-Signature. Only a hash is stored server-side.
            </p>
          </div>
          <Button type="submit" className="w-full gap-1.5" disabled={create.isPending}>
            {create.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Register
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
