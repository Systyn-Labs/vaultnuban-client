import { cn } from "@/lib/utils";

// Structured-language status (PDL: status communicates operational meaning).
// Maps every status string the API emits across transactions, withdrawals,
// collections, suspense, VAs, and webhook deliveries.
const tones: Record<string, string> = {
  // success family
  posted: "bg-status-posted-soft text-status-posted",
  completed: "bg-status-posted-soft text-status-posted",
  delivered: "bg-status-posted-soft text-status-posted",
  fulfilled: "bg-status-posted-soft text-status-posted",
  active: "bg-status-posted-soft text-status-posted",
  ACTIVE: "bg-status-posted-soft text-status-posted",
  // pending family
  pending: "bg-status-pending-soft text-status-pending",
  processing: "bg-status-pending-soft text-status-pending",
  open: "bg-status-pending-soft text-status-pending",
  PENDING: "bg-status-pending-soft text-status-pending",
  // failure family
  failed: "bg-status-failed-soft text-status-failed",
  dead_letter: "bg-status-failed-soft text-status-failed",
  refund_flagged: "bg-status-failed-soft text-status-failed",
  // reversal / closure family
  reversed: "bg-status-reversed-soft text-status-reversed",
  reassigned: "bg-status-reversed-soft text-status-reversed",
  cancelled: "bg-status-reversed-soft text-status-reversed",
  expired: "bg-status-reversed-soft text-status-reversed",
  CLOSED: "bg-status-reversed-soft text-status-reversed",
  // attention family
  SUSPENDED: "bg-status-locked-soft text-status-locked",
};

const labels: Record<string, string> = {
  posted: "Posted",
  completed: "Completed",
  delivered: "Delivered",
  fulfilled: "Fulfilled",
  active: "Active",
  ACTIVE: "Active",
  pending: "Pending",
  processing: "Processing",
  open: "Open",
  PENDING: "Provisioning",
  failed: "Failed",
  dead_letter: "Dead Letter",
  refund_flagged: "Refund Flagged",
  reversed: "Reversed",
  reassigned: "Reassigned",
  cancelled: "Cancelled",
  expired: "Expired",
  CLOSED: "Closed",
  SUSPENDED: "Suspended",
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        tones[status] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {labels[status] ?? status}
    </span>
  );
}
