import { useReadContract } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { erc721Abi } from "@/contracts/erc721Abi";
import { fetchMetadata, type NftMetadata } from "@/lib/metadata";

const erc721WithTokenUri = [
  ...erc721Abi,
  {
    type: "function" as const,
    name: "tokenURI",
    inputs: [{ name: "tokenId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "string", internalType: "string" }],
    stateMutability: "view" as const,
  },
] as const;

/**
 * Reads `tokenURI(tokenId)` from an ERC-721 contract on-chain,
 * then fetches and returns the IPFS/HTTP metadata JSON.
 *
 * Usage:
 *   const { metadata, imageUri, isLoading } = useTokenMetadata(contractAddress, tokenId)
 */
export function useTokenMetadata(
  contractAddress: `0x${string}` | undefined,
  tokenId: string | number | undefined,
) {
  const tokenIdBig = tokenId !== undefined ? BigInt(String(tokenId)) : undefined;

  // Step 1: read tokenURI from chain
  const { data: tokenUri } = useReadContract({
    address: contractAddress,
    abi: erc721WithTokenUri,
    functionName: "tokenURI",
    args: tokenIdBig !== undefined ? [tokenIdBig] : undefined,
    query: { enabled: !!contractAddress && tokenIdBig !== undefined },
  });

  // Step 2: fetch metadata JSON from the URI
  const { data: metadata, isLoading } = useQuery<NftMetadata | null>({
    queryKey: ["token-meta", contractAddress, String(tokenId), tokenUri],
    queryFn: () => (tokenUri ? fetchMetadata(tokenUri) : Promise.resolve(null)),
    enabled: !!tokenUri,
    staleTime: 1000 * 60 * 60, // 1 hour — metadata rarely changes
  });

  return {
    tokenUri,
    metadata,
    isLoading,
    name: metadata?.name ?? `#${tokenId}`,
    description: metadata?.description,
    imageUri: metadata?.image,
    attributes: metadata?.attributes ?? [],
  };
}
