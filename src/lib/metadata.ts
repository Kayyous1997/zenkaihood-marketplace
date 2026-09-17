/** Structured NFT / collection metadata (ERC-721 Metadata JSON standard). */
export interface NftMetadata {
  name?: string;
  description?: string;
  image?: string;
  external_url?: string;
  background_color?: string;
  animation_url?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
    max_value?: number;
  }>;
}

/** IPFS public gateways to try in order. */
const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
];

/**
 * Resolve an IPFS or HTTP URI to a fetchable HTTPS URL.
 * - ipfs://CID/... → gateway URL
 * - Relative CIDs (no scheme) → gateway URL
 * - http/https URIs pass through unchanged
 */
export function resolveUri(uri: string, gatewayIndex = 0): string {
  const gateway = IPFS_GATEWAYS[gatewayIndex] ?? IPFS_GATEWAYS[0]!;

  if (uri.startsWith("ipfs://")) {
    return uri.replace("ipfs://", gateway);
  }
  // Bare CID (starts with "Qm" or "bafy")
  if (uri.startsWith("Qm") || uri.startsWith("bafy")) {
    return `${gateway}${uri}`;
  }
  return uri;
}

/**
 * Resolve an IPFS image URI for use in an <img> src attribute.
 * Falls back to the first gateway; callers may retry with a different index.
 */
export function resolveImageUri(uri: string | undefined): string | undefined {
  if (!uri) return undefined;
  return resolveUri(uri);
}

/**
 * Fetch and parse NFT / collection metadata from a URI.
 * Handles IPFS, HTTP, and data: URIs.
 * Returns null on any failure (network error, bad JSON, missing URI).
 */
export async function fetchMetadata(
  uri: string | undefined | null,
): Promise<NftMetadata | null> {
  if (!uri) return null;

  // data: URI (base64-encoded JSON — common in on-chain NFTs)
  if (uri.startsWith("data:application/json")) {
    try {
      const base64 = uri.split(",")[1];
      if (!base64) return null;
      return JSON.parse(atob(base64)) as NftMetadata;
    } catch {
      return null;
    }
  }

  // Try each IPFS gateway in order on failure
  const urls =
    uri.startsWith("ipfs://") || uri.startsWith("Qm") || uri.startsWith("bafy")
      ? IPFS_GATEWAYS.map((_, i) => resolveUri(uri, i))
      : [resolveUri(uri)];

  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
      if (!res.ok) continue;
      return (await res.json()) as NftMetadata;
    } catch {
      // Try next gateway
    }
  }

  return null;
}
