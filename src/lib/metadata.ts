import { fetchIpfsFromGateways, ipfsPath, toIpfsProxyUrl } from "@/lib/ipfs";

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

/**
 * Resolve an IPFS or HTTP URI to a fetchable URL.
 * IPFS content is loaded through `/api/ipfs/…` so the browser never hits
 * public gateways (CORS / Cross-Origin-Resource-Policy 403s).
 */
export function resolveUri(uri: string): string {
  return ipfsPath(uri) ? toIpfsProxyUrl(uri) : uri;
}

/** Resolve an IPFS image URI for use in an <img> src attribute. */
export function resolveImageUri(uri: string | undefined): string | undefined {
  if (!uri) return undefined;
  return resolveUri(uri);
}

/** Resolve a collection metadata base URI for a specific token. */
export function resolveTokenMetadataUri(baseUri: string, tokenId: string | number): string {
  const uri = baseUri.trim();
  const id = String(tokenId);
  if (uri.includes("{id}")) return uri.replaceAll("{id}", id);
  if (/\.json(?:\?.*)?$/i.test(uri)) return uri;
  // Many collections store token files as `/<id>` (no extension). The IPFS
  // proxy also tries `/<id>.json` when needed.
  return `${uri.replace(/\/$/, "")}/${id}`;
}

/** Extracts an image URL from an inline JSON metadata data URI. */
export function resolveMetadataImage(uri: string | undefined): string | undefined {
  if (!uri) return undefined;
  if (!uri.startsWith("data:application/json")) return resolveImageUri(uri);
  try {
    const payload = uri.split(",")[1];
    if (!payload) return undefined;
    const json = uri.includes(";base64,") ? atob(payload) : decodeURIComponent(payload);
    const metadata = JSON.parse(json) as NftMetadata;
    return resolveImageUri(metadata.image);
  } catch {
    return undefined;
  }
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

  if (uri.startsWith("data:application/json")) {
    try {
      const base64 = uri.split(",")[1];
      if (!base64) return null;
      return JSON.parse(atob(base64)) as NftMetadata;
    } catch {
      return null;
    }
  }

  const path = ipfsPath(uri);
  try {
    // During SSR, fetch relative `/api/ipfs` URLs against public gateways directly.
    const res =
      path && typeof window === "undefined"
        ? await fetchIpfsFromGateways(path)
        : await fetch(resolveUri(uri), { signal: AbortSignal.timeout(60_000) });
    if (!res?.ok) return null;
    return (await res.json()) as NftMetadata;
  } catch {
    return null;
  }
}
