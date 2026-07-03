import { Suspense, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Copy, KeyRound, Loader2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import type { APIKey } from "@/domain/types";
import { toast } from "sonner";
import { apiKeysQuery } from "@/data/queries";
import { vn } from "@/data/client";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/developers/api-keys")({
  head: () => ({ meta: [{ title: "API Keys · VaultNUBAN" }] }),
  component: () => (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
      <Suspense fallback={<div className="h-96 animate-pulse border bg-surface" />}>
        <APIKeysPage />
      </Suspense>
    </div>
  ),
});

function APIKeysPage() {
  const { data: page } = useSuspenseQuery(apiKeysQuery);
  const qc = useQueryClient();
  const [revealed, setRevealed] = useState<string | null>(null);
  const keys = page.data ?? [];

  const create = useMutation({
    mutationFn: () => vn().apiKeys.create(),
    onSuccess: (k) => {
      if (k.key) setRevealed(k.key);
      qc.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (e) =>
      toast.error("Key creation failed", {
        description: e instanceof Error ? e.message : undefined,
      }),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => vn().apiKeys.revoke(id),
    onSuccess: () => {
      toast.success("Key revoked", { description: "Requests using it now return 401." });
      qc.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (e) =>
      toast.error("Revocation failed", { description: e instanceof Error ? e.message : undefined }),
  });

  const columns = useMemo<ColumnDef<APIKey>[]>(
    () => [
      {
        accessorKey: "prefix",
        header: ({ column }) => <SortableHeader column={column}>Prefix</SortableHeader>,
        cell: ({ row }) => <span className="tabular">{row.original.prefix}…</span>,
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => <SortableHeader column={column}>Created</SortableHeader>,
        cell: ({ row }) => (
          <span className="tabular text-[12px] text-muted-foreground">
            {formatDateTime(row.original.created_at)}
          </span>
        ),
      },
      {
        id: "state",
        accessorFn: (k) => (k.revoked_at ? "Revoked" : "Active"),
        header: ({ column }) => <SortableHeader column={column}>State</SortableHeader>,
        cell: ({ getValue }) => <span className="text-[12px]">{getValue() as string}</span>,
      },
      {
        id: "actions",
        header: () => null,
        cell: ({ row }) =>
          !row.original.revoked_at ? (
            <div className="text-right">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-[11px] uppercase tracking-widest text-status-failed hover:text-status-failed"
                onClick={() => revoke.mutate(row.original.id)}
              >
                Revoke
              </Button>
            </div>
          ) : null,
      },
    ],
    [revoke],
  );

  return (
    <>
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Developers
          </div>
          <h1 className="mt-1 text-xl font-medium tracking-tight">API keys</h1>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          disabled={create.isPending}
          onClick={() => create.mutate()}
        >
          {create.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <KeyRound className="h-3.5 w-3.5" />
          )}
          Create key
        </Button>
      </header>

      {revealed && (
        <div className="mb-4 border border-primary/40 bg-primary/5 p-4">
          <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            New key — shown once, store it now
          </div>
          <div className="tabular mt-2 flex items-center gap-2 break-all text-[13px]">
            {revealed}
            <button
              onClick={() => {
                navigator.clipboard.writeText(revealed);
                toast.success("Key copied");
              }}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Copy key"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            onClick={() => setRevealed(null)}
            className="mt-2 text-[11px] text-muted-foreground hover:text-foreground"
          >
            I have stored it — dismiss
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={keys}
        searchPlaceholder="Search prefix…"
        initialSorting={[{ id: "created_at", desc: true }]}
        emptyState={
          <div className="border bg-surface px-4 py-12 text-center text-[12px] text-muted-foreground">
            No API keys yet. Create one to integrate with the VaultNUBAN API.
          </div>
        }
      />
    </>
  );
}
