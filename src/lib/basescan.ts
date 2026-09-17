/** Base Sepolia block explorer link helpers. */

export const BASESCAN_BASE = "https://sepolia.basescan.org";

/** Full URL to a transaction on BaseScan (Base Sepolia). */
export function txUrl(hash: string): string {
  return `${BASESCAN_BASE}/tx/${hash}`;
}

/** Full URL to a contract/address on BaseScan. */
export function addressUrl(addr: string): string {
  return `${BASESCAN_BASE}/address/${addr}`;
}

/** Shortened display version of a tx hash. */
export function shortTx(hash: string): string {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

/** Sonner-compatible toast message with a clickable BaseScan link. */
export function txSuccessMessage(hash: string, label = "Transaction confirmed"): string {
  return `${label} — ${shortTx(hash)}`;
}
