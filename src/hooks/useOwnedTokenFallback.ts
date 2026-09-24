import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { parseAbiItem } from "viem";
import { erc721Abi } from "@/contracts/erc721Abi";
import { erc1155Abi } from "@/contracts/erc1155Abi";
import { collectionTokenViewsAbi } from "@/contracts/collectionTokenViewsAbi";
import { getAddresses } from "@/contracts/addresses";
import { GET_COLLECTIONS, GET_ERC1155_BALANCES, type CollectionFragment, type Erc1155BalanceFragment } from "@/indexer/queries";
import { gqlClient } from "@/indexer/client";

export type FallbackToken = {
  id: string;
  tokenId: string;
  collection: { id: string };
  balance?: string;
};

type CollectionsResult = { collections: CollectionFragment[] };
type BalancesResult = { erc1155Balances: Erc1155BalanceFragment[] };

const erc721EnumerableAbi = [
  ...erc721Abi,
  {
    type: "function",
    name: "tokenOfOwnerByIndex",
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "tokenByIndex",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [{ name: "tokenId", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ name: "supply", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

/**
 * Recovers NFTs owned by the user that the subgraph indexer missed
 * (e.g. NFTs minted BEFORE the collection was registered on CollectionRegistry).
 *
 * Scans on-chain via:
 *  1. Direct `balanceOf` check on registered collections
 *  2. `tokenOfOwnerByIndex` for ERC721Enumerable contracts
 *  3. On-chain `Transfer` log discovery (mints from 0x0 and transfers to user)
 *  4. Sequential token ID probing
 *  5. Current `ownerOf` / `balanceOf` verification
 */
export function useOwnedTokenFallback(address?: `0x${string}`) {
  const client = usePublicClient();
  const addresses = getAddresses(client?.chain?.id ?? 0);

  return useQuery({
    queryKey: ["owned-token-fallback", address, addresses?.tokenViews],
    enabled: !!address && !!client,
    staleTime: 20_000,
    queryFn: async (): Promise<{ erc721: FallbackToken[]; erc1155: FallbackToken[] }> => {
      if (!client || !address) return { erc721: [], erc1155: [] };

      // Fetch all collections and indexed balances in parallel with fallback to empty on network failure
      const collectionsData = await gqlClient
        .request<CollectionsResult>(GET_COLLECTIONS, { first: 100, skip: 0 })
        .catch(() => ({ collections: [] as CollectionFragment[] }));

      const indexedBalances = await gqlClient
        .request<BalancesResult>(GET_ERC1155_BALANCES, { account: address, first: 100, skip: 0 })
        .catch(() => ({ erc1155Balances: [] as Erc1155BalanceFragment[] }));

      const collections = collectionsData.collections ?? [];
      const erc721: FallbackToken[] = [];
      const erc1155: FallbackToken[] = [];

      await Promise.all(
        collections.map(async (collection) => {
          const contract = collection.id as `0x${string}`;
          const is721 = collection.tokenStandard === "ERC721" || collection.tokenStandard === "ERC-721";

          if (is721) {
            try {
              // 1. Check user's balance on this ERC-721 contract
              const userBalance = await client
                .readContract({
                  address: contract,
                  abi: erc721Abi,
                  functionName: "balanceOf",
                  args: [address],
                })
                .catch(() => 0n);

              if (userBalance === 0n) return;

              const candidateTokenIds = new Set<bigint>();

              // 2. Strategy A: Try tokenOfOwnerByIndex if the contract implements enumeration
              try {
                const count = Number(userBalance);
                const ownerIds = await Promise.all(
                  Array.from({ length: Math.min(count, 100) }, (_, i) =>
                    client.readContract({
                      address: contract,
                      abi: erc721EnumerableAbi,
                      functionName: "tokenOfOwnerByIndex",
                      args: [address, BigInt(i)],
                    })
                  )
                );
                ownerIds.forEach((id) => {
                  if (typeof id === "bigint") candidateTokenIds.add(id);
                });
              } catch {
                // Not ERC721Enumerable with tokenOfOwnerByIndex, continue to log scan
              }

              // 3. Strategy B: Scan on-chain Transfer logs for tokens minted or transferred to this wallet
              if (candidateTokenIds.size < Number(userBalance)) {
                try {
                  const logs = await client.getLogs({
                    address: contract,
                    event: parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"),
                    args: { to: address },
                    fromBlock: 0n,
                  });
                  logs.forEach((l) => {
                    if (l.args?.tokenId != null) candidateTokenIds.add(l.args.tokenId);
                  });
                } catch {
                  // RPC getLogs blocked or rate-limited; fallback to candidate probing
                }
              }

              // 4. Strategy C: Token ID probe if still missing candidates
              if (candidateTokenIds.size === 0 && userBalance > 0n) {
                // Try reading token IDs 0 through 30 and 1 through 30
                const probeIds = Array.from({ length: 30 }, (_, i) => BigInt(i + 1));
                probeIds.push(0n);
                probeIds.forEach((id) => candidateTokenIds.add(id));
              }

              // 5. Verify current ownership on-chain with ownerOf for all candidate token IDs
              const candidateList = Array.from(candidateTokenIds);
              const ownerChecks = await Promise.all(
                candidateList.map((id) =>
                  client
                    .readContract({
                      address: contract,
                      abi: erc721Abi,
                      functionName: "ownerOf",
                      args: [id],
                    })
                    .catch(() => null)
                )
              );

              candidateList.forEach((id, idx) => {
                if (ownerChecks[idx]?.toLowerCase() === address.toLowerCase()) {
                  const idStr = id.toString();
                  erc721.push({
                    id: `${contract}-${idStr}`,
                    tokenId: idStr,
                    collection: { id: contract },
                  });
                }
              });
            } catch {
              /* Incomplete or unsupported contract; continue */
            }
          } else {
            // ERC-1155 discovery
            try {
              const candidate1155Ids = new Set<bigint>();

              // Add token IDs discovered by indexer
              (indexedBalances.erc1155Balances ?? []).forEach((b) => {
                if (b.collection.id.toLowerCase() === contract.toLowerCase()) {
                  candidate1155Ids.add(BigInt(b.tokenId));
                }
              });

              // Strategy A: Scan TransferSingle and TransferBatch logs for this user
              try {
                const [singleLogs, batchLogs] = await Promise.all([
                  client.getLogs({
                    address: contract,
                    event: parseAbiItem("event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)"),
                    args: { to: address },
                    fromBlock: 0n,
                  }).catch(() => []),
                  client.getLogs({
                    address: contract,
                    event: parseAbiItem("event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)"),
                    args: { to: address },
                    fromBlock: 0n,
                  }).catch(() => []),
                ]);

                singleLogs.forEach((l) => {
                  if (l.args?.id != null) candidate1155Ids.add(l.args.id);
                });
                batchLogs.forEach((l) => {
                  l.args?.ids?.forEach((id) => candidate1155Ids.add(id));
                });
              } catch {
                // getLogs not available on RPC
              }

              // Also probe common base IDs 0..20
              Array.from({ length: 20 }, (_, i) => BigInt(i)).forEach((id) => candidate1155Ids.add(id));
              Array.from({ length: 20 }, (_, i) => BigInt(i + 1)).forEach((id) => candidate1155Ids.add(id));

              // Verify current balance on each candidate ID
              const idList = Array.from(candidate1155Ids);
              const balances = await Promise.all(
                idList.map((id) =>
                  client
                    .readContract({
                      address: contract,
                      abi: erc1155Abi,
                      functionName: "balanceOf",
                      args: [address, id],
                    })
                    .catch(() => 0n)
                )
              );

              idList.forEach((id, idx) => {
                const bal = balances[idx];
                if (typeof bal === "bigint" && bal > 0n) {
                  const idStr = id.toString();
                  erc1155.push({
                    id: `${contract}-${idStr}`,
                    tokenId: idStr,
                    collection: { id: contract },
                    balance: bal.toString(),
                  });
                }
              });
            } catch {
              /* Incomplete or unsupported contract */
            }
          }
        })
      );

      return { erc721, erc1155 };
    },
  });
}
