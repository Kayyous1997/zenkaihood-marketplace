import { createFileRoute } from "@tanstack/react-router";

import { fetchIpfsFromGateways, isCidPath } from "@/lib/ipfs";

function pathFromRequest(request: Request, splat: string | undefined): string {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("path");
  if (fromQuery) return decodeURIComponent(fromQuery);
  const fromPath = decodeURIComponent(url.pathname.replace(/^\/api\/ipfs\//, ""));
  const raw = splat && splat.length >= fromPath.length ? splat : fromPath;
  return raw.replace(/^\/+/, "");
}

export const Route = createFileRoute("/api/ipfs/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const path = pathFromRequest(request, params._splat);
        if (!isCidPath(path)) {
          return new Response("Invalid IPFS path", { status: 400 });
        }

        const upstream = await fetchIpfsFromGateways(path);
        if (!upstream) {
          return new Response("IPFS content not found", { status: 404 });
        }
        return upstream;
      },
    },
  },
});
