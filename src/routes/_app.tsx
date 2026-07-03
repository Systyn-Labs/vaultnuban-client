import { useEffect, useState } from "react";
import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { useSession } from "@/data/session";
import { subscribeToTransactionEvents } from "@/data/realtime";

// Layout route for the entire authenticated dashboard experience.
// The underscore prefix makes this a pathless layout — child routes' URLs
// are unaffected but they render inside AppShell.
//
// The session lives in sessionStorage, which does not exist during SSR, and
// even in the browser zustand's `persist` middleware reads it asynchronously
// — so on the very first render after a hard load, `session` is briefly null
// for a genuinely logged-in user. The guard must therefore never fire before
// hydration finishes, or it bounces every hard load back to /login. beforeLoad
// skips entirely until hydration is confirmed; the effect below re-checks
// once it completes (and on every subsequent client-side navigation).
export const Route = createFileRoute("/_app")({
  beforeLoad: ({ location }) => {
    if (typeof document === "undefined") return; // SSR: no session store
    if (!useSession.persist.hasHydrated()) return; // rehydration still in flight
    const session = useSession.getState().session;
    if (!session) {
      throw redirect({ to: "/login" });
    }
    // Persona boundaries: /admin/* requires the operator role; tenant routes
    // require a tenant API key.
    const isAdminRoute = location.pathname.startsWith("/admin");
    if (isAdminRoute && session.role !== "admin") throw redirect({ to: "/" });
    if (!isAdminRoute && session.role === "admin") throw redirect({ to: "/admin" });
  },
  component: LayoutComponent,
});

function LayoutComponent() {
  const session = useSession((s) => s.session);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const queryClient = useQueryClient();
  // `useSession.persist` must never be touched during the useState initializer:
  // that function also runs on the server (Node has no `document`, but React's
  // SSR pass still executes it), where the persist API is unavailable and
  // throws. All access happens inside this effect instead, which is
  // client-only by construction.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (useSession.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useSession.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  // Post-hydration guard: enforces the same rules as beforeLoad once the
  // client store has rehydrated (or immediately, on later SPA navigations).
  useEffect(() => {
    if (!hydrated) return;
    if (!session) {
      navigate({ to: "/login" });
      return;
    }
    const isAdminRoute = pathname.startsWith("/admin");
    if (isAdminRoute && session.role !== "admin") navigate({ to: "/" });
    if (!isAdminRoute && session.role === "admin") navigate({ to: "/admin" });
  }, [hydrated, session, pathname, navigate]);

  // Instant refresh: subscribe once per tenant session to the SSE stream so
  // webhook/sweep-posted transactions refetch immediately instead of waiting
  // on the next poll. Only tenant sessions (ops/dev) hold an apiKey — admin
  // has nothing to subscribe to.
  useEffect(() => {
    if (!hydrated || !session?.apiKey) return;
    return subscribeToTransactionEvents(queryClient);
  }, [hydrated, session?.apiKey, queryClient]);

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
