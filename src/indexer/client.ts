import { GraphQLClient } from "graphql-request";

/**
 * The Graph subgraph endpoint for the Zenkaihood marketplace (Base Sepolia).
 * Set VITE_SUBGRAPH_URL in .env to override.
 *
 * To get your URL:
 *  1. Go to https://thegraph.com/studio/
 *  2. Deploy the subgraph from Contracts/Marketplace-Contract/subgraph/
 *  3. Copy the "Query URL" and paste it into .env as VITE_SUBGRAPH_URL
 */
const SUBGRAPH_URL =
  (import.meta.env["VITE_SUBGRAPH_URL"] as string | undefined) ||
  "https://api.studio.thegraph.com/query/1760437/zenkaihood-1/0.0.1";

/**
 * Shared GraphQL client for all subgraph queries.
 * Used by React Query hooks via `gqlClient.request(query, variables)`.
 */
export const gqlClient = new GraphQLClient(SUBGRAPH_URL, {
  // 10-second timeout per request
  requestMiddleware: async (req) => ({
    ...req,
    signal: AbortSignal.timeout(10_000),
  }),
});
