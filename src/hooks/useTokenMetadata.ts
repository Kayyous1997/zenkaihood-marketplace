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

function safeParseBigInt(val: string | number | undefined): bigint | undefined {
  if (val === undefined || val === null || val === "") return undefined;
  try {
    const s = String(val).trim();
    if (!/^\d+$/.test(s)) return undefined;
    return BigInt(s);
  } catch {
    return undefined;
  }
}

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
  tokenStandard: "ERC-721" | "ERC-1155" = "ERC-721",
  targetChainId?: number,
) {
  const isClient = typeof window !== "undefined";
  const tokenIdBig = safeParseBigInt(tokenId);

  // Step 1: read tokenURI from chain (client-only to prevent SSR RPC flooding / hydration mismatches)
  const { data: tokenUri } = useReadContract({
    address: contractAddress,
    abi: erc721WithTokenUri,
    functionName: "tokenURI",
    args: tokenIdBig !== undefined ? [tokenIdBig] : undefined,
    chainId: targetChainId,
    query: { enabled: isClient && !!contractAddress && tokenIdBig !== undefined },
  });

  const { data: erc1155Uri } = useReadContract({
    address: tokenStandard === "ERC-1155" ? contractAddress : undefined,
    abi: [{ type: "function", name: "uri", inputs: [{ name: "id", type: "uint256" }], outputs: [{ name: "", type: "string" }], stateMutability: "view" }] as const,
    functionName: "uri",
    args: tokenIdBig !== undefined ? [tokenIdBig] : undefined,
    chainId: targetChainId,
    query: { enabled: isClient && tokenStandard === "ERC-1155" && !!contractAddress && tokenIdBig !== undefined },
  });
  const resolvedTokenUri = tokenStandard === "ERC-1155" ? erc1155Uri : tokenUri;

  // Step 2: fetch metadata JSON from the URI
  const { data: metadata, isLoading } = useQuery<NftMetadata | null>({
    queryKey: ["token-meta", contractAddress, String(tokenId), resolvedTokenUri],
    queryFn: () => (resolvedTokenUri ? fetchMetadata(resolvedTokenUri) : Promise.resolve(null)),
    enabled: !!resolvedTokenUri,
    staleTime: 1000 * 60 * 60, // 1 hour — metadata rarely changes
  });

  return {
    tokenUri: resolvedTokenUri,
    metadata,
    isLoading,
    name: metadata?.name ?? `#${tokenId}`,
    description: metadata?.description,
    imageUri: metadata?.image,
    attributes: metadata?.attributes ?? [],
  };
}
