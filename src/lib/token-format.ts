import { formatEther, formatUnits, parseEther } from "viem";

/** Parse an ETH decimal string to wei. Returns 0n when the input is empty or invalid. */
export function parseEthInput(text: string): bigint {
  const trimmed = text.trim();
  if (!trimmed) return 0n;
  try {
    return parseEther(trimmed);
  } catch {
    return 0n;
  }
}

/**
 * Format a raw bigint token amount to a human-readable string.
 * @param wei    Raw amount in the token's base unit.
 * @param decimals Token decimals (default 18 for ETH/WETH).
 * @param maxDecimals Maximum decimal places to show in output.
 */
export function formatPrice(
  wei: bigint,
  decimals = 18,
  maxDecimals = 4,
): string {
  return Number(formatUnits(wei, decimals)).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}

/**
 * Format a wei amount as an ETH string, e.g. "1.2300 ETH".
 */
export function formatEth(wei: bigint): string {
  return `${Number(formatEther(wei)).toFixed(4)} ETH`;
}

/**
 * Format a wei amount as a compact ETH label for cards/badges,
 * e.g. "1.23 ETH" (drops trailing zeros).
 */
export function formatEthCompact(wei: bigint): string {
  const n = Number(formatEther(wei));
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 4 })} ETH`;
}

/**
 * Convert a USD rate and a wei amount into a USD display string.
 * @param wei      Amount in wei.
 * @param ethUsd   Current ETH/USD rate.
 */
export function formatUsd(wei: bigint, ethUsd: number): string {
  const eth = Number(formatEther(wei));
  return (eth * ethUsd).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

/**
 * Format basis points (e.g. 250 or 250n) as a percentage string (e.g. "2.5%").
 */
export function formatBps(bps: number | bigint): string {
  const n = typeof bps === "bigint" ? Number(bps) : bps;
  return `${(n / 100).toFixed(n % 100 === 0 ? 0 : 1)}%`;
}
