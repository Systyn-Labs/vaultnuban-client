import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Sun, Moon, MonitorSmartphone, Check, ShieldCheck } from "lucide-react";
import { useSession } from "@/data/session";
import { useTheme, type Theme } from "@/state/theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const THEMES: { value: Theme; label: string; icon: React.ComponentType<{ className?: string }> }[] =
  [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: MonitorSmartphone },
  ];

export function TopBar() {
  const session = useSession((s) => s.session);
  const logout = useSession((s) => s.logout);
  const queryClient = useQueryClient();
  const theme = useTheme((s) => s.theme);
  const setTheme = useTheme((s) => s.setTheme);
  const navigate = useNavigate();
  const isTenant = session?.role === "ops" || session?.role === "dev";

  const initials = (session?.name ?? "VN")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-surface px-4 md:px-6">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {session?.role === "admin" ? "Operating as" : "Tenant"}
        </div>
        <div className="text-sm font-medium">
          {session?.role === "admin" ? "Platform Operator" : (session?.tenantName ?? "—")}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 grid h-8 w-8 place-items-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground">
              {initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="text-sm font-medium">{session?.name}</div>
              <div className="text-[11px] font-normal text-muted-foreground">{session?.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Appearance
            </DropdownMenuLabel>
            {THEMES.map((t) => (
              <DropdownMenuItem key={t.value} onClick={() => setTheme(t.value)} className="gap-2">
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
                {theme === t.value && <Check className="ml-auto h-3.5 w-3.5" />}
              </DropdownMenuItem>
            ))}
            {isTenant && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/settings" })} className="gap-2">
                  <ShieldCheck className="h-3.5 w-3.5" /> Security settings
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                const wasAdmin = session?.role === "admin";
                logout();
                // Cached tenant/admin data (balances, customer lists, audit
                // entries, etc.) must not survive into whatever identity
                // logs in next in this tab.
                queryClient.clear();
                navigate({ to: wasAdmin ? "/admin/login" : "/login" });
              }}
              className="gap-2"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
