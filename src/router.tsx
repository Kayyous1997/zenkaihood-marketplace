import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        // Subgraph failures otherwise look identical to valid empty results.
        if (query.meta?.["silent"]) return;
        toast.error(`Unable to load marketplace data: ${error instanceof Error ? error.message : "Subgraph request failed."}`, {
          id: `query-error-${String(query.queryKey[0])}`,
        });
      },
    }),
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
