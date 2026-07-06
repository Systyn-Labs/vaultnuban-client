import { Link } from "@tanstack/react-router";
import { Inbox, UserPlus, ScrollText } from "lucide-react";

const actions = [
  { label: "Request payment", icon: Inbox, to: "/collections", hint: "Create a collection" },
  {
    label: "Onboard customer",
    icon: UserPlus,
    to: "/customers",
    hint: "Provision a dedicated NUBAN",
  },
  { label: "Transactions", icon: ScrollText, to: "/transactions", hint: "Inspect every entry" },
];

export function QuickActions() {
  return (
    <div className="border bg-surface">
      <div className="flex items-baseline justify-between border-b px-4 py-3">
        <h2 className="text-[13px] font-medium">Quick actions</h2>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Contextual
        </span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-4">
        {actions.map((a) => {
          const inner = (
            <>
              <a.icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
              <div className="mt-3 text-[13px] font-medium">{a.label}</div>
              <div className="text-[11px] text-muted-foreground">{a.hint}</div>
            </>
          );
          return (
            <Link
              key={a.label}
              to={a.to}
              className="group flex flex-col items-start bg-surface px-4 py-4 text-left transition-colors hover:bg-muted/60"
            >
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
