import type { QueryClient } from "@tanstack/react-query";
import { API_BASE_URL, useSession } from "./session";

const RECONNECT_DELAY_MS = 2_000;

// Every query-key prefix that a posted or reversed transaction can affect.
// react-query's invalidateQueries matches by prefix, so invalidating
// ["balance"] also catches ["balance", customerId], etc.
const AFFECTED_QUERY_PREFIXES = [
  "transactions",
  "suspense",
  "virtual-accounts",
  "balance",
  "statement",
  "collections",
] as const;

/**
 * Subscribes to the server's realtime stream (GET /v1/events) and invalidates
 * every query a posted/reversed transaction can affect, so webhook- and
 * sweep-driven updates appear instantly instead of waiting on the next poll.
 *
 * Deliberately built on fetch + a hand-rolled SSE line parser rather than the
 * native EventSource API: EventSource cannot send an Authorization header,
 * and putting a long-lived tenant API key in a URL (query string) shows up
 * in browser history and server access logs — worth avoiding.
 *
 * Returns an unsubscribe function; safe to call multiple times.
 */
export function subscribeToTransactionEvents(queryClient: QueryClient): () => void {
  let stopped = false;
  let controller: AbortController | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function invalidateAffected() {
    for (const key of AFFECTED_QUERY_PREFIXES) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  }

  function scheduleReconnect() {
    if (stopped) return;
    reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
  }

  async function connect() {
    if (stopped) return;
    const apiKey = useSession.getState().session?.apiKey;
    if (!apiKey) return; // not a tenant session (e.g. platform admin) — nothing to stream

    controller = new AbortController();
    try {
      const resp = await fetch(`${API_BASE_URL}/v1/events`, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "text/event-stream" },
        signal: controller.signal,
      });
      if (!resp.ok || !resp.body) throw new Error(`SSE connect failed: ${resp.status}`);

      const reader = resp.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      while (!stopped) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;

        let sepIndex: number;
        while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
          const rawEvent = buffer.slice(0, sepIndex);
          buffer = buffer.slice(sepIndex + 2);
          const isTransactionEvent = rawEvent
            .split("\n")
            .some((line) => line.startsWith("event: transaction"));
          if (isTransactionEvent) invalidateAffected();
        }
      }
    } catch {
      // Network error, server restart, or aborted on unsubscribe — either
      // way, fall through to reconnect (unless we've been stopped).
    }

    scheduleReconnect();
  }

  connect();

  return () => {
    stopped = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    controller?.abort();
  };
}
