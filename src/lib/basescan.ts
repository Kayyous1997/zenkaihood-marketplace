import { baseSepolia } from "wagmi/chains";
import { robinhoodTestnet } from "./chains";

export const BASESCAN_BASE = "https://sepolia.basescan.org";

export const EXPLORER_BASE_URLS: Record<number, string> = {
  [baseSepolia.id]: "https://sepolia.basescan.org",
  [robinhoodTestnet.id]: "https://explorer.testnet.chain.robinhood.com",
};

/** Get the base explorer URL for a given chainId (defaults to BaseScan). */
export function getExplorerBase(chainId?: number | null): string {
  if (chainId && EXPLORER_BASE_URLS[chainId]) {
    return EXPLORER_BASE_URLS[chainId];
  }
  return BASESCAN_BASE;
}

/** Full URL to a transaction on the appropriate block explorer. */
export function txUrl(hash: string, chainId?: number | null): string {
  const base = getExplorerBase(chainId);
  return `${base}/tx/${hash}`;
}

/** Full URL to a contract/address on the appropriate block explorer. */
export function addressUrl(addr: string, chainId?: number | null): string {
  const base = getExplorerBase(chainId);
  return `${base}/address/${addr}`;
}

/** Shortened display version of a tx hash. */
export function shortTx(hash: string): string {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

/** Sonner-compatible toast message with a clickable explorer link. */
export function txSuccessMessage(hash: string, label = "Transaction confirmed"): string {
  return `${label} — ${shortTx(hash)}`;
}
