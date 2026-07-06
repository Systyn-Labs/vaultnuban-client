import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutGrid,
  ArrowLeftRight,
  Wallet,
  Users,
  UserPlus,
  ScrollText,
  ShieldAlert,
  Circle,
  KeyRound,
  Webhook,
  Inbox,
  HeartPulse,
  Building2,
  RefreshCw,
  SlidersHorizontal,
  ShieldCheck,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession, type Role } from "@/data/session";

interface Item {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}
interface Group {
  label: string;
  items: Item[];
}

// Navigation trees per persona (PDL: grouped by operational workflow).
const opsGroups: Group[] = [
  {
    label: "Overview",
    items: [{ to: "/", label: "Dashboard", icon: LayoutGrid }],
  },
  {
    label: "Money",
    items: [
      { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
      { to: "/collections", label: "Collections", icon: Inbox },
    ],
  },
  {
    label: "Accounts",
    items: [
      { to: "/customers", label: "Customers", icon: Users },
      { to: "/accounts", label: "Virtual Accounts", icon: Wallet },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/suspense", label: "Suspense", icon: ShieldAlert },
      { to: "/developers/audit", label: "Audit Trail", icon: ScrollText },
    ],
  },
  {
    label: "Team",
    items: [{ to: "/team", label: "Team members", icon: UserPlus }],
  },
  {
    label: "Developers",
    items: [{ to: "/developers/usage", label: "API Usage", icon: BarChart3 }],
  },
];

// dev deliberately has no Audit Trail or Virtual Accounts (ops-only), and no
// Team link (only ops can invite members) — see internal/api/server.go's
// RequireTenantRole("ops") on the matching backend routes.
const devGroups: Group[] = [
  {
    label: "Developers",
    items: [
      { to: "/developers/api-keys", label: "API Keys", icon: KeyRound },
      { to: "/developers/usage", label: "API Usage", icon: BarChart3 },
      { to: "/developers/webhooks", label: "Webhooks", icon: Webhook },
    ],
  },
  {
    label: "Reference",
    items: [{ to: "/transactions", label: "Transactions", icon: ArrowLeftRight }],
  },
];

const adminGroups: Group[] = [
  {
    label: "Platform",
    items: [
      { to: "/admin", label: "Health", icon: HeartPulse },
      { to: "/admin/tenants", label: "Tenants", icon: Building2 },
      { to: "/admin/audit", label: "Audit Log", icon: ScrollText },
    ],
  },
  {
    label: "Reconciliation",
    items: [
      { to: "/admin/sweeps", label: "Sweep Runs", icon: RefreshCw },
      { to: "/admin/suspense", label: "Suspense", icon: ShieldAlert },
    ],
  },
  {
    label: "Settings",
    items: [
      { to: "/admin/settings", label: "Tier Limits", icon: SlidersHorizontal },
      { to: "/admin/security", label: "Security", icon: ShieldCheck },
    ],
  },
];

function groupsFor(role: Role | undefined): Group[] {
  switch (role) {
    case "admin":
      return adminGroups;
    case "dev":
      return devGroups;
    default:
      return opsGroups;
  }
}

export function Sidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const session = useSession((s) => s.session);
  const groups = groupsFor(session?.role);
  const isAdmin = session?.role === "admin";

  // The sidebar always shares the app background; the admin persona is
  // distinguished by its label and navigation tree, not by surface color.
  return (
    <aside className="hidden w-60 shrink-0 border-r bg-background text-foreground md:flex md:flex-col">
      <div className="flex h-14 items-center gap-2 border-b px-5">
        <div className="grid h-7 w-7 place-items-center rounded-sm bg-primary text-primary-foreground">
          <Circle className="h-3.5 w-3.5" strokeWidth={2.5} />
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold tracking-tight">VaultNUBAN</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {isAdmin ? "Platform Operations" : "Ledger OS"}
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map((g) => (
          <div key={g.label} className="mb-5">
            <div className="mb-1 px-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              {g.label}
            </div>
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const active =
                  pathname === it.to ||
                  (it.to !== "/" && it.to !== "/admin" && pathname.startsWith(it.to)) ||
                  (it.to === "/admin" && pathname === "/admin");
                return (
                  <li key={it.label}>
                    <Link
                      to={it.to}
                      className={cn(
                        "flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-[13px] transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "hover:bg-sidebar-accent/70",
                      )}
                    >
                      <it.icon className="h-3.5 w-3.5" />
                      <span>{it.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t px-4 py-3 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-credit" />
          {session?.tenantName ?? "Platform"} · {session?.role ?? "guest"}
        </div>
      </div>
    </aside>
  );
}
