import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";

const supplyAbi = [
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalMinted",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "maxSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

/**
 * Reads the total token supply / minted count from an NFT contract on-chain.
 * @param contractAddress - The NFT contract address.
 * @param targetChainId   - Optional chain to read from. Defaults to the connected wallet's chain.
 * Returns string | null for JSON serialization and SSR safety.
 */
export function useCollectionSupply(contractAddress?: string | null, targetChainId?: number) {
  // Pass chainId so wagmi uses the matching RPC even if wallet is on a different chain.
  const client = usePublicClient({ chainId: targetChainId });
  const address = contractAddress?.trim().toLowerCase() as `0x${string}` | undefined;
  const isValid = !!address && /^0x[0-9a-fA-F]{40}$/.test(address);

  return useQuery({
    queryKey: ["collection-supply", address, targetChainId],
    enabled: isValid && !!client,
    staleTime: 60_000,
    queryFn: async (): Promise<string | null> => {
      if (!client || !address) return null;

      // 1. Try totalSupply()
      try {
        const supply = await client.readContract({
          address,
          abi: supplyAbi,
          functionName: "totalSupply",
        });
        if (typeof supply === "bigint") return String(supply);
      } catch {
        // Fallback to next method
      }

      // 2. Try totalMinted()
      try {
        const supply = await client.readContract({
          address,
          abi: supplyAbi,
          functionName: "totalMinted",
        });
        if (typeof supply === "bigint") return String(supply);
      } catch {
        // Fallback to next method
      }

      // 3. Try maxSupply()
      try {
        const supply = await client.readContract({
          address,
          abi: supplyAbi,
          functionName: "maxSupply",
        });
        if (typeof supply === "bigint") return String(supply);
      } catch {
        // No supported supply method
      }

      return null;
    },
  });
}
