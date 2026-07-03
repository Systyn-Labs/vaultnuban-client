import { useEffect, useState, type ReactNode } from "react";

// Guards a subtree from SSR rendering. Server emits `fallback`, client
// mounts and renders `children`. Used to keep client-only state (mock db,
// zustand-derived UI) out of the hydration diff.
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return <>{mounted ? children : fallback}</>;
}
