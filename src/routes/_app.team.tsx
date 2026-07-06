import { Suspense, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Loader2, UserPlus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import { toast } from "sonner";
import { teamQuery, type TeamMember } from "@/data/queries";
import { vn } from "@/data/client";
import { formatDateTime } from "@/lib/format";
import { useRequireStepUp } from "@/components/auth/StepUpProvider";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_app/team")({
  head: () => ({ meta: [{ title: "Team · VaultNUBAN" }] }),
  component: () => (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
      <Suspense fallback={<div className="h-96 animate-pulse border bg-surface" />}>
        <TeamPage />
      </Suspense>
    </div>
  ),
});

function TeamPage() {
  const { data } = useSuspenseQuery(teamQuery);
  const members = data.data ?? [];

  const columns = useMemo<ColumnDef<TeamMember>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: "email",
        header: ({ column }) => <SortableHeader column={column}>Email</SortableHeader>,
        cell: ({ row }) => (
          <span className="text-[12px] text-muted-foreground">{row.original.email}</span>
        ),
      },
      {
        accessorKey: "role",
        header: ({ column }) => <SortableHeader column={column}>Role</SortableHeader>,
        cell: ({ row }) => <span className="text-[12px] uppercase">{row.original.role}</span>,
      },
      {
        id: "mfa",
        accessorFn: (m) => (m.mfa_enabled ? "Enrolled" : "Not enrolled"),
        header: ({ column }) => <SortableHeader column={column}>MFA</SortableHeader>,
        cell: ({ row }) => (
          <span className="text-[12px] text-muted-foreground">
            {row.original.mfa_enabled ? "Enrolled" : "Not enrolled"}
          </span>
        ),
      },
      {
        id: "state",
        accessorFn: (m) => (m.active ? "Active" : "Deactivated"),
        header: ({ column }) => <SortableHeader column={column}>State</SortableHeader>,
        cell: ({ row }) => (
          <span className="text-[12px]">{row.original.active ? "Active" : "Deactivated"}</span>
        ),
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => <SortableHeader column={column}>Joined</SortableHeader>,
        cell: ({ row }) => (
          <span className="tabular text-[12px] text-muted-foreground">
            {formatDateTime(row.original.created_at)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Team</div>
          <h1 className="mt-1 text-xl font-medium tracking-tight">Team members</h1>
        </div>
        <InviteMemberDialog />
      </header>

      <DataTable
        columns={columns}
        data={members}
        searchPlaceholder="Search name, email…"
        initialSorting={[{ id: "created_at", desc: true }]}
        emptyState={
          <div className="border bg-surface px-4 py-16 text-center">
            <div className="text-[13px] font-medium">No team members yet</div>
            <p className="mx-auto mt-1 max-w-sm text-[12px] text-muted-foreground">
              Invite a teammate to give them dashboard access.
            </p>
          </div>
        }
      />
    </>
  );
}

function InviteMemberDialog() {
  const qc = useQueryClient();
  const requireStepUp = useRequireStepUp();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"dev" | "ops">("dev");

  const invite = useMutation({
    mutationFn: async () => {
      const stepUpToken = await requireStepUp();
      return vn().http.post<{ email: string; role: string }>(
        "/v1/team",
        { name, email, password, role },
        { stepUpToken },
      );
    },
    onSuccess: (m) => {
      toast.success("Team member invited", { description: `${m.email} · ${m.role}` });
      qc.invalidateQueries({ queryKey: ["team"] });
      setOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      setRole("dev");
    },
    onError: (e) =>
      toast.error("Invite failed", { description: e instanceof Error ? e.message : undefined }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <UserPlus className="h-3.5 w-3.5" /> Add team member
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Add team member</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            invite.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Temporary password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "dev" | "ops")}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dev">Developer</SelectItem>
                <SelectItem value="ops">Operations</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Developers can't view the audit log, virtual accounts list, or invite teammates.
            </p>
          </div>
          <Button type="submit" className="w-full gap-1.5" disabled={invite.isPending}>
            {invite.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Send invite
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
