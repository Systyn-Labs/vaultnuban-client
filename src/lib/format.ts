// Money is stored in minor units (kobo). Display in naira with 2dp always.
export function formatNaira(kobo: number, opts: { sign?: boolean } = {}): string {
  const negative = kobo < 0;
  const abs = Math.abs(kobo) / 100;
  const s = abs.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const prefix = opts.sign ? (negative ? "−" : "+") : negative ? "−" : "";
  return `${prefix}₦${s}`;
}

export function maskNuban(n: string): string {
  if (n.length !== 10) return n;
  return `${n.slice(0, 3)} •••• ${n.slice(-3)}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}
