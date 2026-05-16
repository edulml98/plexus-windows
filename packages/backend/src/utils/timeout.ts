/**
 * Upstream request timeout utilities.
 *
 * When AbortSignal.timeout() fires, AbortSignal.any() creates a combined signal
 * that aborts, but does NOT propagate the abort back to the original source signals.
 * The response-handler.ts stream-monitoring code listens on the route's
 * abortController.signal — so if the timeout fires and that signal never aborts,
 * onDisconnect() is never called, nodeStream.destroy() is never called, and the
 * upstream fetch keeps running, generating unhandled TimeoutError rejections.
 *
 * To fix this, when the timeout fires we must also abort the route's
 * AbortController so the listener in response-handler.ts detects it.
 */

import { getConfig } from '../config';
import { logger } from './logger';

/**
 * Wire a timeout signal into the route's AbortController.
 *
 * Creates `AbortSignal.timeout(effectiveTimeoutMs)`, combines it with the
 * existing signal via `AbortSignal.any()`, and adds a listener that calls
 * `abortController.abort()` when the timeout fires. This ensures that
 * both the upstream fetch AND the response-handler.ts stream-monitoring
 * code detect the timeout.
 *
 * @param abortController The route's AbortController (the one passed to
 *   handleResponse for stream disconnect detection).
 * @param defaultTimeoutMs Override for the effective timeout in milliseconds.
 *   When null/undefined, the global default is used.
 * @returns An object containing the combined signal and an `addTimeoutSource`
 *   method for adding per-provider timeout overrides after routing resolves.
 */
export function wireUpstreamTimeout(
  abortController: AbortController,
  defaultTimeoutMs?: number | null
): { signal: AbortSignal; addTimeoutSource: (timeoutMs: number) => void } {
  const config = getConfig();
  const globalTimeoutSeconds = config.timeout?.defaultSeconds ?? 300;
  const effectiveTimeoutMs = defaultTimeoutMs ?? globalTimeoutSeconds * 1000;

  const timeoutSignal = AbortSignal.timeout(effectiveTimeoutMs);

  // Create a combined signal that aborts when EITHER the client disconnects
  // OR the timeout fires.
  const combinedSignal = AbortSignal.any([abortController.signal, timeoutSignal]);

  // KEY: AbortSignal.any() does NOT propagate abort back to source signals.
  // When the timeout fires, combinedSignal aborts but abortController.signal
  // does NOT. The stream-monitoring code in response-handler.ts only listens
  // on abortController.signal, so it would never detect the timeout. We bridge
  // the gap by aborting the route's AbortController when the timeout fires.
  // This triggers onDisconnect() → nodeStream.destroy() → upstream cancellation.
  timeoutSignal.addEventListener(
    'abort',
    () => {
      if (!abortController.signal.aborted) {
        abortController.abort(timeoutSignal.reason);
      }
    },
    { once: true }
  );

  return {
    signal: combinedSignal,
    /**
     * Add a per-provider timeout source.
     *
     * After the dispatcher resolves the route and knows which provider
     * handles the request, it can add a per-provider timeout that may be
     * shorter than the global default. When this timeout fires:
     * 1. The upstream fetch is aborted (the signal passed to the fetch aborts).
     * 2. The route's abortController is aborted (so response-handler.ts detects it).
     *
     * @param providerTimeoutMs Per-provider timeout in milliseconds.
     */
    addTimeoutSource: (providerTimeoutMs: number) => {
      const providerTimeoutSignal = AbortSignal.timeout(providerTimeoutMs);

      // Re-wire: when the provider timeout fires, abort the route's
      // abortController so response-handler.ts stream monitoring detects it.
      providerTimeoutSignal.addEventListener(
        'abort',
        () => {
          if (!abortController.signal.aborted) {
            abortController.abort(providerTimeoutSignal.reason);
          }
        },
        { once: true }
      );
    },
  };
}

/**
 * Start early client-disconnect detection before dispatch.
 *
 * Bun's node:http layer does NOT reliably fire close/abort events when a
 * client disconnects during streaming POST responses. The only working
 * detection mechanism is polling `bunHandle.closed` on the Socket object.
 *
 * The response-handler's polling only starts after the dispatcher returns,
 * so there's a gap: if the client disconnects while fetch() is still
 * pending (upstream hasn't responded yet), nothing detects the disconnect.
 * The fetch keeps running, wasting upstream API quota.
 *
 * This function starts the bunHandle.closed polling BEFORE the dispatch,
 * and aborts the route's AbortController when the client disconnects.
 * This propagates through the combined signal to fetch(), causing it to
 * throw AbortError and the dispatcher to stop waiting.
 *
 * Callers must call cleanup() after the dispatch completes (whether success
 * or failure) to stop the polling interval.
 */
export function wireEarlyDisconnectDetection(
  request: any,
  abortController: AbortController
): { cleanup: () => void } {
  const rawSocket = request?.raw?.socket;
  const symHandle = rawSocket
    ? Object.getOwnPropertySymbols(rawSocket).find((s: Symbol) => s.toString() === 'Symbol(handle)')
    : undefined;
  const bunHandle = symHandle ? rawSocket[symHandle] : null;

  if (!bunHandle) {
    // Can't detect disconnect without bunHandle (non-Bun runtime or no socket)
    return { cleanup: () => {} };
  }

  let cleanedUp = false;
  let poll: ReturnType<typeof setInterval> | null = setInterval(() => {
    if (cleanedUp) return;
    if (bunHandle.closed) {
      if (!abortController.signal.aborted) {
        logger.debug(`Early disconnect detected (bunHandle.closed), aborting upstream fetch`);
        abortController.abort(new DOMException('Client disconnected', 'AbortError'));
      }
      cleanedUp = true;
      if (poll) {
        clearInterval(poll);
        poll = null;
      }
    }
  }, 250);

  return {
    cleanup: () => {
      cleanedUp = true;
      if (poll) {
        clearInterval(poll);
        poll = null;
      }
    },
  };
}
