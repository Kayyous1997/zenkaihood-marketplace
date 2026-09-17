/**
 * Polling / real-time helpers for the subgraph.
 *
 * The Graph does not expose WebSocket subscriptions on Studio endpoints,
 * so we use React Query's refetchInterval to simulate live updates.
 *
 * Base Sepolia produces a new block roughly every 2 seconds, but the
 * subgraph typically lags 1–2 blocks behind. 12 seconds is a safe
 * polling window that keeps data fresh without hammering the endpoint.
 */

/** Default refetch interval in milliseconds (~1 Base block). */
export const DEFAULT_REFETCH_MS = 12_000;

/**
 * Faster interval for time-sensitive views (auction countdown, bid feed).
 * 6 seconds keeps bid lists feeling live without excessive requests.
 */
export const FAST_REFETCH_MS = 6_000;

/**
 * Slow interval for data that rarely changes (collections list, config).
 * 60 seconds is sufficient — no user action depends on this being instant.
 */
export const SLOW_REFETCH_MS = 60_000;
