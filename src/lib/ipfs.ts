/** Public gateways used only on the server (browser CORS/CORP does not apply). */
const IPFS_GATEWAYS = [
  "https://ipfs.filebase.io/ipfs/",
  "https://w3s.link/ipfs/",
  "https://dweb.link/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://ipfs.io/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://nftstorage.link/ipfs/",
];

export const IPFS_PROXY_PREFIX = "/api/ipfs/";

const CID_PATH =
  /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|baf[a-z0-9]+)(\/[-A-Za-z0-9._]+)*$/i;

const CACHE_TTL_MS = 10 * 60 * 1000;
const ipfsCache = new Map<string, { body: Uint8Array; type: string; expires: number }>();

export function isCidPath(path: string): boolean {
  return CID_PATH.test(path);
}

export function ipfsPath(uri: string): string | null {
  if (uri.startsWith("ipfs://")) {
    let path = uri.slice("ipfs://".length).replace(/^\/+/, "");
    if (path.startsWith("ipfs/")) path = path.slice("ipfs/".length);
    return path;
  }
  if (uri.startsWith(IPFS_PROXY_PREFIX)) {
    const rest = uri.slice(IPFS_PROXY_PREFIX.length);
    if (rest.startsWith("?")) {
      const params = new URLSearchParams(rest.slice(1).split("#")[0]);
      return params.get("path");
    }
    return rest;
  }
  if (isCidPath(uri)) return uri;
  try {
    const url = new URL(uri);
    const pathMatch = url.pathname.match(/^\/ipfs\/(.+)$/);
    if (pathMatch?.[1]) return pathMatch[1];
    const hostMatch = url.hostname.match(/^(.+)\.ipfs\./i);
    if (hostMatch?.[1]) {
      const rest = url.pathname.replace(/^\//, "");
      return rest ? `${hostMatch[1]}/${rest}` : hostMatch[1];
    }
    return null;
  } catch {
    return null;
  }
}

export function pathVariants(path: string): string[] {
  const variants = [path];
  if (path.toLowerCase().endsWith(".json")) variants.push(path.slice(0, -5));
  else if (!/\.[a-z0-9]{2,8}$/i.test(path)) variants.push(`${path}.json`);
  return [...new Set(variants)];
}

/** Same-origin URL for IPFS content so the browser never talks to public gateways. */
export function toIpfsProxyUrl(uri: string): string {
  const path = ipfsPath(uri);
  if (!path) return uri;
  return `${IPFS_PROXY_PREFIX}${path}`;
}

function looksLikeHtml(contentType: string, sample: Uint8Array): boolean {
  if (contentType.includes("text/html")) return true;
  const prefix = new TextDecoder().decode(sample.slice(0, 32)).trimStart().toLowerCase();
  return prefix.startsWith("<!doctype") || prefix.startsWith("<html");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cachedResponse(body: Uint8Array, type: string): Response {
  return new Response(body as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": type,
      "cache-control": "public, max-age=86400",
      "cross-origin-resource-policy": "cross-origin",
    },
  });
}

async function fetchGatewayUrl(url: string, timeoutMs: number): Promise<{ body: Uint8Array; type: string } | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        redirect: "follow",
        headers: { Accept: "application/json, image/*, */*" },
      });

      if (res.status === 429 || res.status === 503) {
        const retryAfter = Number(res.headers.get("retry-after"));
        const waitMs = Number.isFinite(retryAfter) ? Math.min(retryAfter, 2) * 1000 : 500 * (attempt + 1);
        await sleep(waitMs);
        continue;
      }

      if (!res.ok || !res.body) return null;

      const contentType = res.headers.get("content-type") ?? "application/octet-stream";
      const buffer = new Uint8Array(await res.arrayBuffer());
      if (!buffer.byteLength || looksLikeHtml(contentType, buffer)) return null;

      const type =
        contentType.includes("text/html") || contentType === "application/octet-stream"
          ? guessContentType(url, buffer)
          : contentType;

      return { body: buffer, type };
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Fetch IPFS bytes via fast parallel gateway resolution.
 */
export async function fetchIpfsFromGateways(path: string): Promise<Response | null> {
  if (!isCidPath(path)) return null;

  const cached = ipfsCache.get(path);
  if (cached && cached.expires > Date.now()) {
    return cachedResponse(cached.body, cached.type);
  }

  for (const candidate of pathVariants(path)) {
    const fetchPromises = IPFS_GATEWAYS.map(async (gateway) => {
      const found = await fetchGatewayUrl(`${gateway}${candidate}`, 6_000);
      if (found) return found;
      throw new Error("not found");
    });

    try {
      const found = await Promise.any(fetchPromises);
      if (found) {
        ipfsCache.set(path, { ...found, expires: Date.now() + CACHE_TTL_MS });
        ipfsCache.set(candidate, { ...found, expires: Date.now() + CACHE_TTL_MS });
        return cachedResponse(found.body, found.type);
      }
    } catch {
      // Continue to next candidate variant
    }
  }

  return null;
}

function guessContentType(path: string, sample: Uint8Array): string {
  if (/\.png(?:\?|$)/i.test(path) || (sample[0] === 0x89 && sample[1] === 0x50)) return "image/png";
  if (/\.jpe?g(?:\?|$)/i.test(path) || sample[0] === 0xff) return "image/jpeg";
  if (/\.gif(?:\?|$)/i.test(path)) return "image/gif";
  if (/\.webp(?:\?|$)/i.test(path)) return "image/webp";
  if (/\.svg(?:\?|$)/i.test(path)) return "image/svg+xml";
  if (/\.json(?:\?|$)/i.test(path) || sample[0] === 0x7b || sample[0] === 0x5b) return "application/json";
  return "application/octet-stream";
}
